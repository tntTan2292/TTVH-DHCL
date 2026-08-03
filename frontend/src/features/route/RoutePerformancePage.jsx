import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer, KPICard, SectionHeader, StatusBadge, LoadingState, ErrorState, EmptyState } from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
import f13DashboardClient from '../../api/F13DashboardClient';
import { DEFAULT_ROUTE_TYPE_FILTER, ROUTE_TYPE_FILTERS, normalizeRouteTypeFilter } from './routeRankingFilters';
import { toNumber, formatRate, formatDelayedCashRate, applyRouteFilters, sortRouteRows, computeRouteKpiStats, computeDelayedCashWidget, resolveDefaultRouteDate } from './routeRankingCalculations';

const ROUTE_BCVH_OPTIONS = [
  { value: '533140', label: 'BCVH Thuận Hóa' },
  { value: '535470', label: 'BCVH Hương Trà' },
  { value: '535790', label: 'BCVH A Lưới' },
  { value: '536250', label: 'BCVH Hương Thủy' },
  { value: '537015', label: 'BCVH Thuận An' },
  { value: '537220', label: 'BCVH Phú Lộc' },
];

function classificationLabel(row) {
  return row.is_postman_delivery_route ? 'Tuyến bưu tá' : 'Nhận tại bưu cục';
}

function classificationBadgeClass(row) {
  return row.is_postman_delivery_route ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-700';
}

const SORTABLE_COLUMNS = [
  { key: 'total_bg', label: 'Tổng BG' },
  { key: 'passed', label: 'Đạt' },
  { key: 'failed', label: 'Không đạt' },
  { key: 'returned', label: 'Chuyển hoàn' },
  { key: 'passed_rate', label: 'Tỷ lệ đạt' },
];

const DELAYED_CASH_COLUMNS = [
  { key: 'delayed_cash_handover_count', label: 'Số BG chậm nộp tiền' },
  { key: 'f13_303_rate', label: 'Tỷ lệ chậm nộp tiền' },
];

function SortHeaderCell({ column, sortState, onSort }) {
  const isActive = sortState.key === column.key;
  const arrow = isActive ? (sortState.dir === 'asc' ? '▲' : '▼') : '';
  return (
    <th className="px-4 py-2 text-right">
      <button
        type="button"
        onClick={() => onSort(column.key)}
        aria-sort={isActive ? (sortState.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ${
          isActive ? 'text-[var(--color-primary-700)]' : 'text-[var(--color-text-muted)]'
        }`}
      >
        {column.label}
        {arrow ? <span aria-hidden="true">{arrow}</span> : null}
      </button>
    </th>
  );
}

function RouteRankingTable({ rows, selectedRouteId, onSelectRoute, sortState, onSort }) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-[var(--color-surface-200)] bg-white p-6 text-sm text-[var(--color-text-muted)]">
        Không có tuyến phù hợp với bộ lọc hiện tại.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-surface-200)] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm" data-testid="route-ranking-table">
          <thead className="bg-[var(--color-surface-50)] text-left text-xs font-semibold uppercase text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2" rowSpan={2}>XH</th>
              <th className="px-4 py-2" rowSpan={2}>Mã tuyến</th>
              <th className="px-4 py-2" rowSpan={2}>Tên tuyến</th>
              <th className="border-l border-[var(--color-surface-200)] px-4 py-2 text-center" colSpan={SORTABLE_COLUMNS.length}>
                Kết quả ngày đánh giá
              </th>
              <th className="border-l border-[var(--color-surface-200)] px-4 py-2 text-center" colSpan={DELAYED_CASH_COLUMNS.length}>
                Chậm nộp tiền
              </th>
              <th className="px-4 py-2" rowSpan={2}>Phân loại</th>
            </tr>
            <tr>
              {SORTABLE_COLUMNS.map((column) => (
                <SortHeaderCell key={column.key} column={column} sortState={sortState} onSort={onSort} />
              ))}
              {DELAYED_CASH_COLUMNS.map((column) => (
                <SortHeaderCell key={column.key} column={column} sortState={sortState} onSort={onSort} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-surface-100)]">
            {rows.map((row, index) => {
              const routeId = row.id || row.ma_tuyen;
              const selected = routeId === selectedRouteId;
              return (
                <tr key={routeId} className={selected ? 'bg-[var(--color-primary-50)]' : 'hover:bg-[var(--color-surface-50)]'}>
                  <td className="px-4 py-3 font-semibold text-[var(--color-text-muted)]">{index + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-main)]">{row.code || row.ma_tuyen}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onSelectRoute(routeId)}
                      className="text-left font-semibold text-[var(--color-primary-700)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
                    >
                      {row.name || row.ten_tuyen || row.ma_tuyen}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{toNumber(row.total_bg).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-700">{toNumber(row.passed).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-600">{toNumber(row.failed ?? row.total_failed).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right font-mono">{toNumber(row.returned).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatRate(row.passed_rate)}</td>
                  <td className="border-l border-[var(--color-surface-100)] px-4 py-3 text-right font-mono">
                    {toNumber(row.delayed_cash_handover_count).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatDelayedCashRate(row.f13_303_rate)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${classificationBadgeClass(row)}`}>
                      {classificationLabel(row)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RouteSelectedPanel({ route, bcvhName, fromDate }) {
  if (!route) {
    return (
      <EmptyState
        title="Chưa chọn tuyến"
        description="Chọn một tuyến trong bảng bên trái để xem chi tiết."
      />
    );
  }

  const totalBg = toNumber(route.total_bg);
  const passed = toNumber(route.passed);
  const failed = toNumber(route.failed ?? route.total_failed);
  const returned = toNumber(route.returned);
  const delayedCount = toNumber(route.delayed_cash_handover_count);
  const delayedEligible = toNumber(route.delayed_cash_handover_eligible_count);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-surface-200)] bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Tuyến đang chọn</p>
        <p className="mt-1 text-lg font-bold text-[var(--color-text-main)]">{route.name || route.ten_tuyen || route.ma_tuyen}</p>
        <p className="font-mono text-xs text-[var(--color-text-muted)]">{route.code || route.ma_tuyen}</p>
      </div>

      <span className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ${classificationBadgeClass(route)}`}>
        {classificationLabel(route)}
      </span>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-[var(--color-surface-50)] p-3">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Tổng BG</p>
          <p className="mt-1 text-xl font-bold text-[var(--color-text-main)]">{totalBg.toLocaleString('vi-VN')}</p>
        </div>
        <div className="rounded-lg bg-[var(--color-surface-50)] p-3">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Tỷ lệ đạt</p>
          <p className="mt-1 text-xl font-bold text-[var(--color-text-main)]">{formatRate(route.passed_rate)}</p>
        </div>
        <div className="rounded-lg bg-[var(--color-surface-50)] p-3">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Đạt</p>
          <p className="mt-1 text-lg font-semibold text-green-700">{passed.toLocaleString('vi-VN')}</p>
        </div>
        <div className="rounded-lg bg-[var(--color-surface-50)] p-3">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Không đạt</p>
          <p className="mt-1 text-lg font-semibold text-red-600">{failed.toLocaleString('vi-VN')}</p>
        </div>
      </div>

      <div className="rounded-lg bg-[var(--color-surface-50)] p-3">
        <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Chuyển hoàn</p>
        <p className="mt-1 text-lg font-semibold text-[var(--color-text-main)]">
          {returned.toLocaleString('vi-VN')} / {totalBg.toLocaleString('vi-VN')} BG
        </p>
        {returned > 0 ? (
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Bưu gửi chuyển hoàn, được ghi nhận BLACK trong Đánh giá KPI 2026.
          </p>
        ) : null}
      </div>

      <div className="rounded-lg bg-[var(--color-surface-50)] p-3">
        <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Chậm nộp tiền</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Số BG chậm nộp tiền</p>
            <p className="text-lg font-semibold text-[var(--color-text-main)]">{delayedCount.toLocaleString('vi-VN')}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Mẫu đánh giá</p>
            <p className="text-lg font-semibold text-[var(--color-text-main)]">{delayedEligible.toLocaleString('vi-VN')}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Tỷ lệ chậm nộp tiền</p>
            <p className="text-lg font-semibold text-[var(--color-text-main)]">{formatDelayedCashRate(route.f13_303_rate)}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Chậm khi thời gian nộp tiền sau thời gian PTC trên 3 giờ.
        </p>
      </div>

      <div className="border-t border-[var(--color-surface-200)] pt-3 text-xs text-[var(--color-text-muted)]">
        Ngày dữ liệu: {fromDate || 'N/A'} · BCVH: {bcvhName}
      </div>
    </div>
  );
}

export default function RoutePerformancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [sortState, setSortState] = useState({ key: 'passed_rate', dir: 'desc' });
  const [metaMaxDate, setMetaMaxDate] = useState(null);
  const [metaStatus, setMetaStatus] = useState('loading');

  const fromDateParam = searchParams.get('from_date') || '';
  const toDateParam = searchParams.get('to_date') || '';
  const interval = searchParams.get('interval') || 'daily';
  const bcvhId = searchParams.get('bcvh_id') || '533140';
  const bcvhName = searchParams.get('bcvh_name') || 'BCVH Thuận Hóa';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'passed_rate';
  const order = searchParams.get('order') || 'asc';
  const routeType = normalizeRouteTypeFilter(searchParams.get('route_type') || DEFAULT_ROUTE_TYPE_FILTER);
  const onlyFailed = searchParams.get('only_failed') === '1';

  const fromDate = resolveDefaultRouteDate({ param: fromDateParam, metaMaxDate });
  const toDate = resolveDefaultRouteDate({ param: toDateParam, metaMaxDate });

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value === undefined || value === null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params);
  };

  useEffect(() => {
    let mounted = true;
    const fetchMeta = async () => {
      try {
        const result = await f13DashboardClient.getDashboardMeta();
        if (!mounted) return;
        setMetaMaxDate(result?.data?.max_date || null);
        setMetaStatus('ready');
      } catch {
        if (!mounted) return;
        setMetaMaxDate(null);
        setMetaStatus('error');
      }
    };
    fetchMeta();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchRoute = async () => {
      try {
        setStatus('loading');
        setError(null);
        const result = await f13DashboardClient.getRouteRanking(fromDate, bcvhId, 1, 1000, sort, order, routeType);
        if (!mounted) return;
        setRows(Array.isArray(result.data) ? result.data : []);
        setMeta(result.meta || null);
        const firstSelectable = (Array.isArray(result.data) ? result.data : []).find((item) => item?.id || item?.ma_tuyen);
        setSelectedRouteId((prev) => prev || firstSelectable?.id || firstSelectable?.ma_tuyen || '');
        setStatus('success');
      } catch (e) {
        if (!mounted) return;
        setError({ message: e.message || 'Không thể tải dữ liệu tuyến' });
        setStatus('error');
      }
    };

    if (fromDate && bcvhId) {
      fetchRoute();
    } else if (!fromDateParam) {
      if (metaStatus === 'error') {
        setStatus('error');
        setError({ message: 'Không thể xác định ngày dữ liệu hợp lệ mới nhất.' });
      } else if (metaStatus === 'ready' && !metaMaxDate) {
        setStatus('error');
        setError({ message: 'Không có ngày dữ liệu hợp lệ trong hệ thống.' });
      }
    }
    return () => {
      mounted = false;
    };
  }, [bcvhId, fromDate, fromDateParam, order, routeType, sort, metaStatus, metaMaxDate]);

  const intervalLabel = interval === 'daily' ? 'Một ngày' : interval === 'weekly' ? 'Theo tuần' : 'Lũy kế';

  const handleSort = (key) => {
    setSortState((prev) => (prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }));
  };

  const filteredRows = useMemo(
    () => sortRouteRows(applyRouteFilters(rows, { search, onlyFailed }), sortState),
    [rows, search, onlyFailed, sortState]
  );

  const selectedRow = useMemo(() => {
    if (!filteredRows.length) return null;
    return filteredRows.find((item) => (item.id || item.ma_tuyen) === selectedRouteId) || filteredRows[0];
  }, [filteredRows, selectedRouteId]);

  const kpiStats = useMemo(() => computeRouteKpiStats(rows), [rows]);
  const delayedCashWidget = useMemo(() => computeDelayedCashWidget(meta?.delayed_cash_handover_summary), [meta]);

  const summaryStats = [
    {
      label: 'Tuyến phát sinh không đạt',
      value: kpiStats.failedRouteCount.toLocaleString('vi-VN'),
      delta: `/ ${kpiStats.totalRoutes.toLocaleString('vi-VN')} tuyến`,
      tone: 'danger',
    },
    {
      label: 'Tỷ lệ đạt toàn BCVH',
      value: `${kpiStats.bcvhPassedRate.toFixed(1)}%`,
      delta: bcvhName,
      tone: 'primary',
    },
    {
      label: 'Tổng BG không đạt',
      value: kpiStats.totalFailed.toLocaleString('vi-VN'),
      delta: intervalLabel,
      tone: 'warning',
    },
    {
      label: 'BG CHẬM NỘP TIỀN',
      value: delayedCashWidget.value,
      delta: delayedCashWidget.delta,
      tone: 'success',
    },
  ];

  if (status === 'loading') {
    return (
      <PageContainer title="Route Performance Center" subtitle="Đang tải dữ liệu Tuyến Ranking.">
        <LoadingState label="Đang tải dữ liệu Tuyến Ranking..." />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer title="Route Performance Center" subtitle="Không thể tải dữ liệu Tuyến Ranking.">
        <ErrorState description={error?.message} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Route Performance Center"
      subtitle="Xếp hạng tuyến theo tỷ lệ đạt, dùng để xác định tuyến phát sinh bưu gửi không đạt."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={intervalLabel} tone="success" />
          <StatusBadge label={`Ngày dữ liệu: ${fromDate}`} tone="info" />
        </div>
      }
    >
      <div className="space-y-5">
        <GlobalFilterBar
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={(value) => updateParam('from_date', value)}
          onToDateChange={(value) => updateParam('to_date', value)}
          bcvhValue={bcvhId}
          onBcvhChange={(value) => updateParam('bcvh_id', value)}
          bcvhOptions={ROUTE_BCVH_OPTIONS}
          searchValue={search}
          onSearchChange={(value) => updateParam('search', value)}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-md border border-[var(--color-surface-200)] bg-white">
                {ROUTE_TYPE_FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => updateParam('route_type', item.value === DEFAULT_ROUTE_TYPE_FILTER ? '' : item.value)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                      routeType === item.value
                        ? 'bg-[var(--color-primary-600)] text-white'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-50)]'
                    }`}
                    aria-pressed={routeType === item.value}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 rounded-md border border-[var(--color-surface-200)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={onlyFailed}
                  onChange={(e) => updateParam('only_failed', e.target.checked ? '1' : '')}
                  className="h-3.5 w-3.5"
                />
                Chỉ tuyến có bưu gửi không đạt
              </label>
              <StatusBadge label={ROUTE_BCVH_OPTIONS.find((item) => item.value === bcvhId)?.label || bcvhName} tone="info" />
            </div>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryStats.map((item) => (
            <KPICard key={item.label} label={item.label} value={item.value} delta={item.delta} tone={item.tone} />
          ))}
        </div>

        <SectionHeader
          title="Bảng Tuyến Ranking"
          subtitle="Danh sách tuyến runtime theo bộ lọc đang chọn, mặc định sắp xếp theo Tỷ lệ đạt giảm dần."
        />

        <div className="grid grid-cols-1 gap-5 min-[1200px]:grid-cols-12">
          <div className="min-[1200px]:col-span-8">
            <RouteRankingTable
              rows={filteredRows}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              sortState={sortState}
              onSort={handleSort}
            />
          </div>
          <div className="min-[1200px]:col-span-4">
            <RouteSelectedPanel route={selectedRow} bcvhName={bcvhName} fromDate={fromDate} />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
