import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PageContainer, KPICard, SectionHeader, StatusBadge, LoadingState, ErrorState, EmptyState } from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
import f13DashboardClient from '../../api/F13DashboardClient';
import { DEFAULT_ROUTE_TYPE_FILTER, ROUTE_TYPE_FILTERS, normalizeRouteTypeFilter } from './routeRankingFilters';
import { toNumber, formatRate, formatDelayedCashRate, applyRouteFilters, sortRouteRows, computeRouteKpiStats, computeDelayedCashWidget, resolveDefaultRouteDate } from './routeRankingCalculations';
import { buildViolationEvidenceLink } from './routeViolationEvidenceData';
import { processRoutePeriods, formatPeriodRate, formatPeriodDelta, formatPeriodVolume, DASH } from './routePeriodData';
import { classifyF13HeatmapRate, F13_HEATMAP_TONE_CLASS } from '../../components/f13/f13HeatmapBandCatalog';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronLeft, AlertTriangle, Flame, Search, Filter, CalendarDays, ShieldCheck } from 'lucide-react';

const ROUTE_BCVH_OPTIONS = [
  { value: '533140', label: 'BCVH Thuận Hóa' },
  { value: '535470', label: 'BCVH Hương Trà' },
  { value: '535790', label: 'BCVH A Lưới' },
  { value: '536250', label: 'BCVH Hương Thủy' },
  { value: '537015', label: 'BCVH Thuận An' },
  { value: '537220', label: 'BCVH Phú Lộc' },
];

const ITEMS_PER_PAGE = 10;

function classificationLabel(row) {
  return row.is_postman_delivery_route ? 'Tuyến bưu tá' : 'Nhận tại bưu cục';
}

function classificationBadgeClass(row) {
  return row.is_postman_delivery_route
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-slate-100 text-slate-700 border border-slate-200';
}

const SORTABLE_COLUMNS = [
  { key: 'rank', label: 'Hạng' },
  { key: 'day_rate', label: 'Tỷ lệ ngày' },
  { key: 'month_rate', label: 'Lũy kế tháng' },
  { key: 'previous_month_rate', label: 'Cùng kỳ T.trước' },
  { key: 'delta', label: 'Chênh lệch' },
  { key: 'month_days_with_data', label: 'Ngày có DL' },
  { key: 'month_volume', label: 'Sản lượng' },
];

const DELAYED_CASH_COLUMNS = [
  { key: 'delayed_cash_handover_count', label: 'BG Chậm nộp tiền' },
  { key: 'f13_303_rate', label: 'Tỷ lệ chậm nộp' },
];

function SortHeaderCell({ column, sortState, onSort, isSubHeader = false }) {
  const isActive = sortState.key === column.key;
  const ArrowIcon = isActive ? (sortState.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className={`px-3 py-2.5 text-right transition-colors ${isSubHeader ? 'bg-slate-50/80' : ''}`}>
      <button
        type="button"
        onClick={() => onSort(column.key)}
        aria-sort={isActive ? (sortState.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`inline-flex items-center justify-end gap-1.5 w-full text-xs font-semibold uppercase tracking-wider transition-colors hover:text-[var(--color-primary-700)] ${
          isActive ? 'text-[var(--color-primary-700)] font-bold' : 'text-slate-500'
        }`}
      >
        <span>{column.label}</span>
        <ArrowIcon size={13} className={isActive ? 'text-[var(--color-primary-600)]' : 'text-slate-400 opacity-60'} />
      </button>
    </th>
  );
}

function RouteRankingTable({
  rows,
  pageRows,
  totalRows,
  currentPage,
  totalPages,
  onPageChange,
  selectedRouteId,
  onSelectRoute,
  sortState,
  onSort
}) {
  if (!totalRows) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
          <Filter size={20} />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">Không có tuyến nào phù hợp</h3>
        <p className="mt-1 text-xs text-slate-500">Vui lòng thử điều chỉnh bộ lọc loại tuyến, ô tìm kiếm hoặc bộ lọc phát sinh lỗi.</p>
      </div>
    );
  }

  const startRank = (currentPage - 1) * ITEMS_PER_PAGE;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm" data-testid="route-ranking-table">
          <thead>
            <tr className="bg-slate-100/90 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <th className="px-3.5 py-3 w-12 text-center" rowSpan={2}>XH</th>
              <th className="px-3.5 py-3" rowSpan={2}>Mã tuyến</th>
              <th className="px-4 py-3" rowSpan={2}>Tên tuyến bưu tá</th>
              <th className="border-l border-slate-200 px-3 py-2 text-center bg-slate-50 text-slate-700" colSpan={SORTABLE_COLUMNS.length}>
                Kết quả ngày đánh giá & Xu hướng tháng
              </th>
              <th className="border-l border-slate-200 px-3 py-2 text-center bg-amber-50/70 text-amber-900 border-r border-slate-200" colSpan={DELAYED_CASH_COLUMNS.length}>
                Vi phạm chậm nộp tiền
              </th>
              <th className="px-3.5 py-3 text-center" rowSpan={2}>Phân loại</th>
            </tr>
            <tr className="border-b border-slate-200">
              {SORTABLE_COLUMNS.map((column) => (
                <SortHeaderCell key={column.key} column={column} sortState={sortState} onSort={onSort} isSubHeader />
              ))}
              {DELAYED_CASH_COLUMNS.map((column) => (
                <SortHeaderCell key={column.key} column={column} sortState={sortState} onSort={onSort} isSubHeader />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {pageRows.map((row, index) => {
              const routeId = row.id || row.ma_tuyen;
              const selected = routeId === selectedRouteId;
              const failedCount = toNumber(row.failed ?? row.total_failed);
              const delayedCount = toNumber(row.delayed_cash_handover_count);
              const passedRateVal = toNumber(row.passed_rate);

              const isHighRisk = failedCount > 0 || delayedCount > 0;
              const isWarningRate = passedRateVal < 90;

              return (
                <tr
                  key={routeId}
                  onClick={() => onSelectRoute(routeId)}
                  className={`cursor-pointer transition-colors ${
                    selected
                      ? 'bg-blue-50/90 ring-1 ring-inset ring-blue-300'
                      : isHighRisk
                        ? 'hover:bg-amber-50/40'
                        : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-3.5 py-3 text-center font-semibold text-slate-500 text-xs">{startRank + index + 1}</td>
                  <td className="px-3.5 py-3 font-mono text-xs font-medium text-slate-600">{row.code || row.ma_tuyen}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRoute(routeId);
                        }}
                        className={`text-left font-semibold transition-colors hover:underline focus-visible:outline-none ${
                          selected ? 'text-[var(--color-primary-700)]' : 'text-slate-800'
                        }`}
                      >
                        {row.name || row.ten_tuyen || row.ma_tuyen}
                      </button>
                      {failedCount > 5 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          <Flame size={10} className="mr-0.5" /> Yếu
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs font-bold text-slate-700">
                    {row.rank || DASH}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded ${row.day_rate !== null ? F13_HEATMAP_TONE_CLASS[classifyF13HeatmapRate(row.day_rate).tone] : F13_HEATMAP_TONE_CLASS.unavailable}`}>
                      {formatPeriodRate(row.day_rate)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded ${row.month_rate !== null ? F13_HEATMAP_TONE_CLASS[classifyF13HeatmapRate(row.month_rate).tone] : F13_HEATMAP_TONE_CLASS.unavailable}`}>
                      {formatPeriodRate(row.month_rate)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-slate-600">
                    {formatPeriodRate(row.previous_month_rate)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs">
                    {row.delta !== null ? (
                      <span className={Number(row.delta) > 0 ? 'text-emerald-600 font-bold' : Number(row.delta) < 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                        {formatPeriodDelta(row.delta)}
                      </span>
                    ) : (
                      <span className="text-slate-400">{DASH}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-slate-600">
                    {row.month_days_with_data}/{row.month_days_in_period}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-slate-600">
                    {formatPeriodVolume(row.month_volume)}
                  </td>
                  <td className="border-l border-slate-100 px-3 py-3 text-right font-mono text-xs">
                    {delayedCount > 0 ? (
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                        {delayedCount.toLocaleString('vi-VN')}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-amber-800">
                    {formatDelayedCashRate(row.f13_303_rate)}
                  </td>
                  <td className="px-3.5 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${classificationBadgeClass(row)}`}>
                      {classificationLabel(row)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs">
        <div className="text-slate-600 font-medium">
          Hiển thị <strong>{startRank + 1} - {Math.min(startRank + ITEMS_PER_PAGE, totalRows)}</strong> trong tổng số <strong>{totalRows}</strong> tuyến
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 mr-2 font-medium">
            Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Trang trước"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <ChevronLeft size={14} />
            <span>Trước</span>
          </button>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Trang sau"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <span>Sau</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function RouteSelectedPanel({ route, bcvhId, bcvhName, fromDate, currentSearch }) {
  if (!route) {
    return (
      <EmptyState
        title="Chưa chọn tuyến"
        description="Chọn một tuyến trong bảng bên trái để xem chi tiết đối soát vi phạm."
      />
    );
  }

  const violationLink = buildViolationEvidenceLink({
    analysisDate: fromDate,
    bcvhId,
    bcvhName,
    routeId: route.id || route.ma_tuyen,
    routeName: route.name || route.ten_tuyen || route.ma_tuyen,
    currentSearch,
  });

  const totalBg = toNumber(route.total_bg);
  const passed = toNumber(route.passed);
  // F-2 fix (F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md Section 2): `row` does not
  // exist in this scope — this threw a ReferenceError whenever `route.failed` was
  // null/undefined, masked only because the backend mapper always populated `failed`.
  const failed = toNumber(route.failed ?? route.total_failed);
  const returned = toNumber(route.returned);
  const delayedCount = toNumber(route.delayed_cash_handover_count);
  const delayedEligible = toNumber(route.delayed_cash_handover_eligible_count);
  const passedRateVal = toNumber(route.day_rate ?? route.passed_rate);
  const monthRateVal = toNumber(route.month_rate);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sticky top-4">
      <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tuyến được chọn</span>
          <h3 className="mt-0.5 text-base font-bold text-slate-800 leading-snug">{route.name || route.ten_tuyen || route.ma_tuyen}</h3>
          <p className="font-mono text-xs text-slate-500 mt-0.5">Mã tuyến: {route.code || route.ma_tuyen}</p>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${classificationBadgeClass(route)}`}>
          {classificationLabel(route)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className={`rounded-lg p-3 border ${route.day_rate !== null ? F13_HEATMAP_TONE_CLASS[classifyF13HeatmapRate(route.day_rate).tone] : F13_HEATMAP_TONE_CLASS.unavailable}`}>
          <p className="text-[11px] uppercase tracking-wider font-semibold opacity-70">Tỷ lệ ngày</p>
          <p className="mt-1 text-lg font-bold font-mono">
            {formatPeriodRate(route.day_rate)}
          </p>
        </div>
        <div className={`rounded-lg p-3 border ${route.month_rate !== null ? F13_HEATMAP_TONE_CLASS[classifyF13HeatmapRate(route.month_rate).tone] : F13_HEATMAP_TONE_CLASS.unavailable}`}>
          <p className="text-[11px] uppercase tracking-wider font-semibold opacity-70">Lũy kế tháng</p>
          <p className="mt-1 text-lg font-bold font-mono">
            {formatPeriodRate(route.month_rate)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Cùng kỳ tháng trước</p>
          <p className="mt-1 text-base font-bold text-slate-800 font-mono">{formatPeriodRate(route.previous_month_rate)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Chênh lệch</p>
          <p className="mt-1 text-base font-bold text-slate-800 font-mono">
             {route.delta !== null ? (
               <span className={Number(route.delta) > 0 ? 'text-emerald-600' : Number(route.delta) < 0 ? 'text-rose-600' : 'text-slate-600'}>
                 {formatPeriodDelta(route.delta)}
               </span>
             ) : DASH}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Sản lượng phát</p>
          <p className="mt-0.5 text-base font-bold text-slate-800 font-mono">{totalBg.toLocaleString('vi-VN')}</p>
        </div>
        <div className="rounded-lg bg-emerald-50/40 p-2.5 border border-emerald-100">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800">Đạt chỉ tiêu</p>
          <p className="mt-0.5 text-base font-bold text-emerald-700 font-mono">{passed.toLocaleString('vi-VN')}</p>
        </div>
        <div className="rounded-lg bg-rose-50/50 p-2.5 border border-rose-100">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-rose-800">Không đạt</p>
          <p className="mt-0.5 text-base font-bold text-rose-700 font-mono">{failed.toLocaleString('vi-VN')}</p>
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-amber-50/90 to-orange-50/40 p-3.5 border border-amber-200/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={15} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">Vi phạm Chậm nộp tiền</span>
          </div>
          <span className="text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
            {formatDelayedCashRate(route.f13_303_rate)}
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/80 p-2 rounded border border-amber-200/50">
            <span className="text-[10px] text-slate-500 block">Số BG vi phạm:</span>
            <span className="text-sm font-bold text-amber-900 font-mono">{delayedCount.toLocaleString('vi-VN')}</span>
          </div>
          <div className="bg-white/80 p-2 rounded border border-amber-200/50">
            <span className="text-[10px] text-slate-500 block">Mẫu kiểm tra:</span>
            <span className="text-sm font-semibold text-slate-700 font-mono">{delayedEligible.toLocaleString('vi-VN')}</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-amber-800/90 italic">
          *Đánh giá chậm khi tiền được nộp sau thời điểm PTC trên 3.0 giờ.
        </p>
      </div>

      {returned > 0 && (
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80 text-xs">
          <div className="flex items-center justify-between text-slate-700 font-medium">
            <span>Bưu gửi chuyển hoàn:</span>
            <span className="font-mono font-bold text-slate-800">{returned.toLocaleString('vi-VN')} BG</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Được ghi nhận phân loại BLACK theo quy chuẩn KPI 2026.
          </p>
        </div>
      )}

      <Link
        to={violationLink}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-[var(--color-primary-700)] hover:shadow-md active:scale-[0.99]"
      >
        <span>Xem bưu gửi vi phạm</span>
        <ChevronRight size={16} />
      </Link>

      <div className="border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 flex justify-between items-center">
        <span>Ngày dữ liệu: <strong className="text-slate-600">{fromDate || 'N/A'}</strong></span>
        <span>BCVH: <strong className="text-slate-600">{bcvhName}</strong></span>
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
  const [sortState, setSortState] = useState({ key: 'passed_rate', dir: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [metaMaxDate, setMetaMaxDate] = useState(null);
  const [metaStatus, setMetaStatus] = useState('loading');

  const fromDateParam = searchParams.get('from_date') || '';
  const toDateParam = searchParams.get('to_date') || '';
  const bcvhId = searchParams.get('bcvh_id') || searchParams.get('ma_bcvh') || '533140';
  const bcvhName = searchParams.get('bcvh_name') || 'BCVH Thuận Hóa';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'day_rate';
  const order = searchParams.get('order') || 'asc';
  const routeType = normalizeRouteTypeFilter(searchParams.get('route_type') || DEFAULT_ROUTE_TYPE_FILTER);
  const onlyFailed = searchParams.get('only_failed') === '1';

  const fromDate = resolveDefaultRouteDate({ param: fromDateParam, metaMaxDate });
  const toDate = resolveDefaultRouteDate({ param: toDateParam, metaMaxDate });
  const analysisDate = resolveDefaultRouteDate({ param: toDateParam || fromDateParam, metaMaxDate });

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value === undefined || value === null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    // Update both from_date and to_date when picking a new analysis date
    if (key === 'analysis_date') {
      params.set('from_date', value);
      params.set('to_date', value);
    }
    setSearchParams(params);
    setCurrentPage(1);
  };

  const updateBcvhParam = (value) => {
    const params = new URLSearchParams(searchParams);
    params.delete('ma_bcvh');
    if (value === undefined || value === null || value === '' || value === 'all') {
      params.delete('bcvh_id');
    } else {
      params.set('bcvh_id', value);
    }
    setSearchParams(params);
    setCurrentPage(1);
  };

  const [bcvhOptions, setBcvhOptions] = useState(ROUTE_BCVH_OPTIONS);

  useEffect(() => {
    let mounted = true;
    const fetchMeta = async () => {
      try {
        const result = await f13DashboardClient.getDashboardMeta();
        if (!mounted) return;
        setMetaMaxDate(result?.data?.max_date || null);
        if (Array.isArray(result?.data?.bcvh_units) && result.data.bcvh_units.length > 0) {
          const formattedOptions = result.data.bcvh_units.map((unit) => ({
            value: unit.ma_bcvh || unit.value,
            label: unit.ten_bcvh ? `BCVH ${unit.ten_bcvh.replace(/^BCVH\s+/i, '')}` : (unit.label || unit.ma_bcvh),
          }));
          setBcvhOptions(formattedOptions);
        }
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
        const result = await f13DashboardClient.getRoutePeriods(bcvhId, analysisDate, routeType);
        if (!mounted) return;
        const processedData = processRoutePeriods(result.data);
        const routeRows = processedData.routes || [];
        setRows(routeRows);
        setMeta(result.meta || { reconciliation: processedData.reconciliation });
        setCurrentPage(1);
        setSortState({ key: 'passed_rate', dir: 'asc' });

        if (routeRows.length > 0) {
          const sortedWorst = [...routeRows].sort((a, b) => {
            const rateA = toNumber(a.day_rate ?? a.passed_rate);
            const rateB = toNumber(b.day_rate ?? b.passed_rate);
            if (rateA !== rateB) return rateA - rateB;
            return toNumber(b.failed ?? b.total_failed) - toNumber(a.failed ?? a.total_failed);
          });
          setSelectedRouteId((prev) => prev || sortedWorst[0]?.id || sortedWorst[0]?.ma_tuyen || '');
        }
        setStatus('success');
      } catch (e) {
        if (!mounted) return;
        setError({ message: e.message || 'Không thể tải dữ liệu tuyến' });
        setStatus('error');
      }
    };

    if (analysisDate && bcvhId) {
      fetchRoute();
    } else if (!fromDateParam && !toDateParam) {
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
  }, [bcvhId, analysisDate, fromDateParam, toDateParam, order, routeType, sort, metaStatus, metaMaxDate]);

  const hasDateMismatch = fromDateParam && toDateParam && fromDateParam !== toDateParam;

  const handleSort = (key) => {
    setSortState((prev) => (prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'asc' }));
  };

  const filteredRows = useMemo(
    () => sortRouteRows(applyRouteFilters(rows, { search, onlyFailed }), sortState),
    [rows, search, onlyFailed, sortState]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRows.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRows, currentPage]);

  const selectedRow = useMemo(() => {
    if (!filteredRows.length) return null;
    return filteredRows.find((item) => (item.id || item.ma_tuyen) === selectedRouteId) || filteredRows[0];
  }, [filteredRows, selectedRouteId]);

  const kpiStats = useMemo(() => computeRouteKpiStats(rows), [rows]);
  const delayedCashWidget = useMemo(() => computeDelayedCashWidget(meta?.delayed_cash_handover_summary), [meta]);

  const executiveKpis = [
    {
      label: 'Tổng tuyến phân tích',
      value: kpiStats.totalRoutes.toLocaleString('vi-VN'),
      delta: `${kpiStats.failedRouteCount} tuyến phát sinh lỗi`,
      tone: kpiStats.failedRouteCount > 0 ? 'warning' : 'success',
    },
    {
      label: 'Tỷ lệ đạt toàn BCVH',
      value: `${kpiStats.bcvhPassedRate.toFixed(1)}%`,
      delta: bcvhName,
      tone: kpiStats.bcvhPassedRate >= 90 ? 'primary' : 'danger',
    },
    {
      label: 'Tổng BG không đạt',
      value: kpiStats.totalFailed.toLocaleString('vi-VN'),
      delta: `Ngày ${analysisDate}`,
      tone: 'danger',
    },
    {
      label: 'BG Chậm nộp tiền',
      value: delayedCashWidget.value,
      delta: delayedCashWidget.delta,
      tone: 'warning',
    },
  ];

  const reconciliation = meta?.reconciliation || {};

  if (status === 'loading') {
    return (
      <PageContainer title="Bảng xếp hạng Tuyến Bưu tá" subtitle="Đang tải dữ liệu xếp hạng tuyến và đối soát nghiệp vụ...">
        <LoadingState label="Đang tải dữ liệu Tuyến Ranking..." />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer title="Bảng xếp hạng Tuyến Bưu tá" subtitle="Không thể kết nối hoặc tải dữ liệu tuyến.">
        <ErrorState description={error?.message} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Bảng xếp hạng Tuyến Bưu tá"
      subtitle="Bảng điều hành chất lượng tuyến: Nhận diện tuyến yếu, đối soát bưu gửi không đạt và chậm nộp tiền."
      action={
        <div className="flex flex-wrap items-center gap-2">
          {hasDateMismatch && (
            <StatusBadge label={`Đang phân tích ngày ${analysisDate}`} tone="warning" icon={AlertTriangle} />
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-150 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs transition-all duration-150 hover:border-blue-400 hover:bg-slate-50/50 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600">
              <CalendarDays size={16} className="text-slate-400 shrink-0" />
              <input
                type="date"
                value={analysisDate}
                onChange={(e) => updateParam('analysis_date', e.target.value)}
                className="border-none bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0"
                aria-label="Ngày phân tích"
              />
            </div>
            
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs transition-all duration-150 hover:border-blue-400 hover:bg-slate-50/50 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600">
              <Filter size={16} className="text-slate-400 shrink-0" />
              <select
                value={bcvhId}
                onChange={(e) => updateBcvhParam(e.target.value)}
                className="border-none bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Bộ lọc BCVH"
              >
                {bcvhOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs transition-all duration-150 hover:border-blue-400 hover:bg-slate-50/50 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => updateParam('search', e.target.value)}
                className="w-full border-none bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              {ROUTE_TYPE_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => updateParam('route_type', item.value === DEFAULT_ROUTE_TYPE_FILTER ? '' : item.value)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    routeType === item.value
                      ? 'bg-white text-slate-800 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => updateParam('only_failed', onlyFailed ? '' : '1')}
              aria-pressed={onlyFailed}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                onlyFailed
                  ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Flame size={14} className={onlyFailed ? 'text-rose-600' : 'text-slate-400'} />
              <span>Chỉ hiện tuyến phát sinh lỗi</span>
            </button>
          </div>
        </div>

        {reconciliation?.total_routes !== undefined && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">Đối soát dữ liệu</h3>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Tổng BG Tuyến</span>
                <span className="font-mono font-bold text-slate-800">{toNumber(reconciliation.sum_bg_routes).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Không thuộc Tuyến</span>
                <span className="font-mono font-bold text-slate-800">{toNumber(reconciliation.sum_bg_unrouted).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex flex-col pl-6 border-l border-blue-200">
                <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Tổng BCVH</span>
                <span className="font-mono font-bold text-slate-800">{toNumber(reconciliation.total_bcvh_bg).toLocaleString('vi-VN')}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {executiveKpis.map((item) => (
            <KPICard key={item.label} label={item.label} value={item.value} delta={item.delta} tone={item.tone} />
          ))}
        </div>

        {kpiStats.failedRouteCount > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent p-4 border border-rose-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 text-white shrink-0 shadow-xs">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Phát hiện <span className="text-rose-700 font-extrabold">{kpiStats.failedRouteCount} tuyến</span> có bưu gửi không đạt trong ngày
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Ưu tiên rà soát các tuyến có tỷ lệ không đạt cao và vi phạm Chậm nộp tiền để chỉ đạo khắc phục kịp thời.
                </p>
              </div>
            </div>
            <button
              onClick={() => updateParam('only_failed', '1')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-xs shrink-0"
            >
              <Filter size={13} />
              Lọc danh sách tuyến lỗi
            </button>
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-3 items-start">
          <div className="xl:col-span-2 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Bảng xếp hạng hiệu năng tuyến</h3>
                <p className="text-xs text-slate-500">Hiển thị {filteredRows.length} tuyến trong phạm vi chọn (10 tuyến/trang)</p>
              </div>
              <span className="text-xs font-medium text-slate-500">Click vào dòng để xem chi tiết đối soát</span>
            </div>
            <RouteRankingTable
              rows={filteredRows}
              pageRows={pageRows}
              totalRows={filteredRows.length}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              sortState={sortState}
              onSort={handleSort}
            />
          </div>

          <div className="xl:col-span-1">
            <div className="flex items-center justify-between px-1 mb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Bảng đối soát tuyến</h3>
              <span className="text-xs font-semibold text-slate-500">Admin Control</span>
            </div>
            <RouteSelectedPanel
              route={selectedRow}
              bcvhId={bcvhId}
              bcvhName={bcvhName}
              fromDate={analysisDate}
              currentSearch={searchParams.toString()}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
