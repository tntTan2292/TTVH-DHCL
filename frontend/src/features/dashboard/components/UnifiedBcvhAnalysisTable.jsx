import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, RefreshCw, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../../../api/client';
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../../../components/shared/SharedComponents';
import {
  buildDoughnutAriaLabel,
  formatNumber,
  formatRate,
  formatSignedDelta,
  formatVolumeDelta,
  mapBcvhRankingResponse,
  ROUTE_BAND_META,
  UNAVAILABLE_TEXT,
} from './unifiedBcvhAnalysisTableData';

const STORAGE_KEY = 'qis.bcvhRankingWave2.columns.v1';

const TEXT = {
  title: 'Bảng xếp hạng chất lượng BCVH',
  source: 'Ngày đánh giá',
  loading: 'Đang tải bảng xếp hạng BCVH...',
  loadErrorTitle: 'Không thể tải bảng xếp hạng BCVH',
  loadErrorMessage: 'Không thể tải bảng xếp hạng BCVH.',
  retry: 'Thử lại',
  emptyTitle: 'Không có dữ liệu BCVH',
  emptyDescription: 'Chưa có bản ghi BCVH cho kỳ đang chọn.',
  currentDay: 'Kết quả ngày đánh giá',
  comparisonD1: 'So sánh D-1',
  comparisonD7: 'So sánh D-7',
  lateCash: 'Chậm nộp tiền',
  routeDistribution: 'Phân bổ tuyến',
  analysis: 'Phân tích BCVH',
  action: 'Hành động',
  identity: 'Đơn vị',
  rank: 'Hạng',
  code: 'Mã BCVH',
  name: 'Tên BCVH',
  volume: 'Sản lượng',
  pass: 'Đạt',
  fail: 'Không đạt',
  rate: 'Tỷ lệ F1.3',
  volumeDelta: 'Delta SL',
  rateDelta: 'Delta F1.3',
  comparisonRank: 'Hạng kỳ so sánh',
  rankMovement: 'Dịch chuyển hạng',
  lateCashCount: 'BG chậm nộp tiền',
  lateCashRate: 'Tỷ lệ chậm nộp tiền',
  routeCount: 'Số tuyến tham gia',
  routeGreen: 'Tuyến xanh',
  routePink: 'Tuyến hồng',
  routeYellow: 'Tuyến vàng',
  routeRed: 'Tuyến đỏ',
  doughnut: 'Doughnut',
  detailManagement: 'Xem chi tiết tuyến',
  columnOptions: 'Ẩn / hiện cột',
  reset: 'Khôi phục',
  hideableColumns: 'Chỉ 4 cột raw D-1 / D-7 được phép ẩn',
};

const DEFAULT_COLUMNS = {
  d1Volume: true,
  d1Rate: true,
  d7Volume: true,
  d7Rate: true,
};

const STICKY_RANK = 'sticky left-0 z-20';
const STICKY_CODE = 'sticky left-[64px] z-20';
const STICKY_NAME = 'sticky left-[168px] z-20';

function readStoredColumns() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COLUMNS;
    const parsed = JSON.parse(raw);
    return {
      d1Volume: parsed?.d1Volume !== false,
      d1Rate: parsed?.d1Rate !== false,
      d7Volume: parsed?.d7Volume !== false,
      d7Rate: parsed?.d7Rate !== false,
    };
  } catch {
    return DEFAULT_COLUMNS;
  }
}

function writeStoredColumns(columns) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // Local storage is optional for this view.
  }
}

function buildDetailUrl(action) {
  const params = new URLSearchParams();
  Object.entries(action?.params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  });
  return `${action?.route || '/f13/ranking/route'}?${params.toString()}`;
}

function signalToneToBadge(tone) {
  if (tone === 'success') return 'success';
  if (tone === 'warning') return 'warning';
  if (tone === 'danger') return 'danger';
  if (tone === 'info') return 'info';
  return 'neutral';
}

function DoughnutCell({ routeDistribution }) {
  const total = routeDistribution.segments.reduce((sum, segment) => sum + segment.value, 0);
  if (!total) {
    return <span className="text-[11px] text-[var(--color-text-muted)]">{UNAVAILABLE_TEXT}</span>;
  }

  return (
    <div className="h-16 w-16" aria-label={buildDoughnutAriaLabel(routeDistribution)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip formatter={(value, name) => [`${value}`, name]} />
          <Pie
            data={routeDistribution.segments}
            dataKey="value"
            nameKey="label"
            innerRadius={18}
            outerRadius={28}
            stroke="none"
            paddingAngle={2}
          >
            {routeDistribution.segments.map((segment) => (
              <Cell key={segment.id} fill={segment.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ComparisonValue({ value, type = 'number' }) {
  if (type === 'rate') return <span>{formatRate(value)}</span>;
  if (type === 'signed') return <span>{formatSignedDelta(value, 'điểm %')}</span>;
  if (type === 'volumeDelta') return <span>{formatVolumeDelta(value)}</span>;
  if (type === 'rankMovement') {
    if (!value?.signal) return <span>{UNAVAILABLE_TEXT}</span>;
    return <StatusBadge label={value.signal.shortLabel} tone={signalToneToBadge(value.signal.tone)} />;
  }
  return <span>{formatNumber(value)}</span>;
}

function ColumnOptions({ columns, setColumns }) {
  const [open, setOpen] = useState(false);

  const toggle = (key) => {
    const next = { ...columns, [key]: !columns[key] };
    setColumns(next);
    writeStoredColumns(next);
  };

  const reset = () => {
    setColumns(DEFAULT_COLUMNS);
    writeStoredColumns(DEFAULT_COLUMNS);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-surface-200)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-text-main)] shadow-sm hover:bg-[var(--color-surface-50)]"
      >
        <Settings2 size={14} />
        {TEXT.columnOptions}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-[var(--color-surface-200)] bg-white p-3 text-xs shadow-lg">
          <div className="mb-2 text-[11px] text-[var(--color-text-muted)]">{TEXT.hideableColumns}</div>
          <div className="space-y-2">
            {[
              ['d1Volume', 'D-1 / Sản lượng'],
              ['d1Rate', 'D-1 / Tỷ lệ F1.3'],
              ['d7Volume', 'D-7 / Sản lượng'],
              ['d7Rate', 'D-7 / Tỷ lệ F1.3'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-[var(--color-surface-50)]">
                <input type="checkbox" checked={columns[key]} onChange={() => toggle(key)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <button type="button" onClick={reset} className="mt-3 w-full rounded-md bg-[var(--color-surface-100)] px-3 py-2 font-semibold hover:bg-[var(--color-surface-200)]">
            {TEXT.reset}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function HeaderGroup({ label, colSpan, className = '' }) {
  return <th colSpan={colSpan} className={`px-2 py-2 text-center text-[11px] font-bold uppercase ${className}`}>{label}</th>;
}

function UnifiedHeader({ columns }) {
  const d1Span = 4 + (columns.d1Volume ? 1 : 0) + (columns.d1Rate ? 1 : 0);
  const d7Span = 4 + (columns.d7Volume ? 1 : 0) + (columns.d7Rate ? 1 : 0);

  return (
    <thead className="sticky top-0 z-10 bg-white text-[11px] uppercase text-[var(--color-text-muted)]">
      <tr className="border-b border-[var(--color-surface-200)]">
        <HeaderGroup label={TEXT.identity} colSpan={3} className="bg-[var(--color-surface-50)] text-[var(--color-text-main)]" />
        <HeaderGroup label={TEXT.currentDay} colSpan={4} className="bg-[var(--color-primary-50)] text-[var(--color-primary-800)]" />
        <HeaderGroup label={TEXT.comparisonD1} colSpan={d1Span} className="bg-emerald-50 text-emerald-800" />
        <HeaderGroup label={TEXT.comparisonD7} colSpan={d7Span} className="bg-sky-50 text-sky-800" />
        <HeaderGroup label={TEXT.lateCash} colSpan={2} className="bg-amber-50 text-amber-800" />
        <HeaderGroup label={TEXT.routeDistribution} colSpan={6} className="bg-rose-50 text-rose-800" />
        <HeaderGroup label={TEXT.analysis} colSpan={1} className="bg-[var(--color-surface-50)] text-[var(--color-text-main)]" />
        <HeaderGroup label={TEXT.action} colSpan={1} className="bg-[var(--color-surface-50)] text-[var(--color-text-main)]" />
      </tr>
      <tr className="border-b border-[var(--color-surface-200)]">
        <th className={`${STICKY_RANK} bg-[var(--color-surface-50)] px-2 py-2 text-right`}>{TEXT.rank}</th>
        <th className={`${STICKY_CODE} bg-[var(--color-surface-50)] px-2 py-2 text-left`}>{TEXT.code}</th>
        <th className={`${STICKY_NAME} bg-[var(--color-surface-50)] px-2 py-2 text-left`}>{TEXT.name}</th>

        <th className="bg-[var(--color-primary-50)] px-2 py-2 text-right">{TEXT.volume}</th>
        <th className="bg-[var(--color-primary-50)] px-2 py-2 text-right">{TEXT.pass}</th>
        <th className="bg-[var(--color-primary-50)] px-2 py-2 text-right">{TEXT.fail}</th>
        <th className="bg-[var(--color-primary-50)] px-2 py-2 text-center">{TEXT.rate}</th>

        {columns.d1Volume ? <th className="bg-emerald-50 px-2 py-2 text-right">{TEXT.volume}</th> : null}
        {columns.d1Rate ? <th className="bg-emerald-50 px-2 py-2 text-center">{TEXT.rate}</th> : null}
        <th className="bg-emerald-50 px-2 py-2 text-right">{TEXT.volumeDelta}</th>
        <th className="bg-emerald-50 px-2 py-2 text-center">{TEXT.rateDelta}</th>
        <th className="bg-emerald-50 px-2 py-2 text-center">{TEXT.comparisonRank}</th>
        <th className="bg-emerald-50 px-2 py-2 text-center">{TEXT.rankMovement}</th>

        {columns.d7Volume ? <th className="bg-sky-50 px-2 py-2 text-right">{TEXT.volume}</th> : null}
        {columns.d7Rate ? <th className="bg-sky-50 px-2 py-2 text-center">{TEXT.rate}</th> : null}
        <th className="bg-sky-50 px-2 py-2 text-right">{TEXT.volumeDelta}</th>
        <th className="bg-sky-50 px-2 py-2 text-center">{TEXT.rateDelta}</th>
        <th className="bg-sky-50 px-2 py-2 text-center">{TEXT.comparisonRank}</th>
        <th className="bg-sky-50 px-2 py-2 text-center">{TEXT.rankMovement}</th>

        <th className="bg-amber-50 px-2 py-2 text-right">{TEXT.lateCashCount}</th>
        <th className="bg-amber-50 px-2 py-2 text-center">{TEXT.lateCashRate}</th>

        <th className="bg-rose-50 px-2 py-2 text-right">{TEXT.routeCount}</th>
        <th className="bg-rose-50 px-2 py-2 text-right">{TEXT.routeGreen}</th>
        <th className="bg-rose-50 px-2 py-2 text-right">{TEXT.routePink}</th>
        <th className="bg-rose-50 px-2 py-2 text-right">{TEXT.routeYellow}</th>
        <th className="bg-rose-50 px-2 py-2 text-right">{TEXT.routeRed}</th>
        <th className="bg-rose-50 px-2 py-2 text-center">{TEXT.doughnut}</th>

        <th className="bg-[var(--color-surface-50)] px-2 py-2 text-left">{TEXT.analysis}</th>
        <th className="bg-[var(--color-surface-50)] px-2 py-2 text-right">{TEXT.action}</th>
      </tr>
    </thead>
  );
}

function Row({ row, columns, onOpenDetail }) {
  const isTotal = row.ma_bcvh === 'total';
  const stickyBg = isTotal ? 'bg-[var(--color-surface-50)]' : 'bg-white';

  return (
    <tr className={`border-b border-[var(--color-surface-100)] ${isTotal ? 'bg-[var(--color-surface-50)] font-semibold' : 'hover:bg-[var(--color-surface-50)]'}`}>
      <td className={`${STICKY_RANK} ${stickyBg} px-2 py-2 text-right shadow-[1px_0_0_0_var(--color-surface-200)]`}>{row.rank ?? '—'}</td>
      <td className={`${STICKY_CODE} ${stickyBg} px-2 py-2 font-mono text-[11px] shadow-[1px_0_0_0_var(--color-surface-200)]`}>{row.ma_bcvh}</td>
      <td className={`${STICKY_NAME} ${stickyBg} px-2 py-2 text-[var(--color-text-main)] shadow-[8px_0_12px_-12px_rgba(15,23,42,0.35)]`}>{row.ten_bcvh}</td>

      <td className="px-2 py-2 text-right">{formatNumber(row.current_day.volume)}</td>
      <td className="px-2 py-2 text-right">{formatNumber(row.current_day.pass_count)}</td>
      <td className="px-2 py-2 text-right">{formatNumber(row.current_day.fail_count)}</td>
      <td className="px-2 py-2 text-center">
        <div className="flex flex-col items-center gap-1">
          <span className="font-semibold">{formatRate(row.current_day.rate)}</span>
          <StatusBadge label={row.current_day.signal.label} tone={signalToneToBadge(row.current_day.signal.tone)} />
        </div>
      </td>

      {columns.d1Volume ? <td className="px-2 py-2 text-right">{formatNumber(row.comparisons.d1.volume)}</td> : null}
      {columns.d1Rate ? <td className="px-2 py-2 text-center">{formatRate(row.comparisons.d1.rate)}</td> : null}
      <td className="px-2 py-2 text-right">{formatVolumeDelta(row.comparisons.d1.volume_delta)}</td>
      <td className="px-2 py-2 text-center">{formatSignedDelta(row.comparisons.d1.rate_delta, 'điểm %')}</td>
      <td className="px-2 py-2 text-center">{formatNumber(row.comparisons.d1.comparison_rank)}</td>
      <td className="px-2 py-2 text-center">
        <ComparisonValue value={row.comparisons.d1.rank_movement} type="rankMovement" />
      </td>

      {columns.d7Volume ? <td className="px-2 py-2 text-right">{formatNumber(row.comparisons.d7.volume)}</td> : null}
      {columns.d7Rate ? <td className="px-2 py-2 text-center">{formatRate(row.comparisons.d7.rate)}</td> : null}
      <td className="px-2 py-2 text-right">{formatVolumeDelta(row.comparisons.d7.volume_delta)}</td>
      <td className="px-2 py-2 text-center">{formatSignedDelta(row.comparisons.d7.rate_delta, 'điểm %')}</td>
      <td className="px-2 py-2 text-center">{formatNumber(row.comparisons.d7.comparison_rank)}</td>
      <td className="px-2 py-2 text-center">
        <ComparisonValue value={row.comparisons.d7.rank_movement} type="rankMovement" />
      </td>

      <td className="px-2 py-2 text-right">{formatNumber(row.late_cash.count)}</td>
      <td className="px-2 py-2 text-center">
        <StatusBadge label={row.late_cash.signal.label} tone="neutral" />
      </td>

      <td className="px-2 py-2 text-right">{formatNumber(row.route_distribution.participating_postman_route_count)}</td>
      <td className="px-2 py-2 text-right">{formatNumber(row.route_distribution.counts.green)}</td>
      <td className="px-2 py-2 text-right">{formatNumber(row.route_distribution.counts.pink)}</td>
      <td className="px-2 py-2 text-right">{formatNumber(row.route_distribution.counts.yellow)}</td>
      <td className="px-2 py-2 text-right">{formatNumber(row.route_distribution.counts.red)}</td>
      <td className="px-2 py-2 text-center"><DoughnutCell routeDistribution={row.route_distribution} /></td>

      <td className="max-w-[280px] px-2 py-2 text-[11px] leading-5 text-[var(--color-text-main)]">{row.analysis}</td>
      <td className="px-2 py-2 text-right">
        {!isTotal ? (
          <button
            type="button"
            onClick={() => onOpenDetail(row)}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--color-surface-200)] bg-white px-2 py-1 text-[11px] font-semibold text-[var(--color-primary-700)] shadow-sm hover:bg-[var(--color-primary-50)]"
          >
            {TEXT.detailManagement}
            <ArrowRight size={12} />
          </button>
        ) : (
          <span className="text-[11px] text-[var(--color-text-muted)]">{UNAVAILABLE_TEXT}</span>
        )}
      </td>
    </tr>
  );
}

export default function UnifiedBcvhAnalysisTable({
  fromDate,
  toDate,
  interval = 'daily',
  maBcvh = 'all',
  search = '',
  prefetchedData = null,
}) {
  const navigate = useNavigate();
  const requestSeqRef = useRef(0);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    setColumns(readStoredColumns());
  }, []);

  const requestContext = useMemo(() => ({ fromDate, toDate, interval, maBcvh, search }), [fromDate, toDate, interval, maBcvh, search]);

  const loadRows = useCallback(async () => {
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;

    try {
      setState({ status: 'loading', data: null, error: null });
      const response = await api.get('/f13/ranking/bcvh', {
        params: {
          from_date: fromDate,
          to_date: toDate,
          page: 1,
          page_size: 1000,
          sort: 'rank',
          order: 'asc',
        },
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.error?.message || TEXT.loadErrorMessage);
      }

      if (requestSeqRef.current !== seq) return;
      setState({
        status: 'success',
        data: mapBcvhRankingResponse(response.data, requestContext),
        error: null,
      });
    } catch (error) {
      if (requestSeqRef.current !== seq) return;
      setState({
        status: 'error',
        data: null,
        error: error?.response?.data?.error?.message || error?.message || TEXT.loadErrorMessage,
      });
    }
  }, [fromDate, requestContext, toDate]);

  useEffect(() => {
    if (prefetchedData) {
      setState({ status: 'success', data: prefetchedData, error: null });
      return;
    }
    if (fromDate && toDate) loadRows();
  }, [fromDate, toDate, loadRows, prefetchedData]);

  const filteredRows = useMemo(() => {
    const rows = state.data?.rows || [];
    return rows.filter((row) => {
      const matchesBcvh = maBcvh === 'all' || row.ma_bcvh === maBcvh;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || row.ten_bcvh.toLowerCase().includes(q) || row.ma_bcvh.toLowerCase().includes(q);
      return matchesBcvh && matchesSearch;
    });
  }, [maBcvh, search, state.data?.rows]);

  const handleOpenDetail = (row) => {
    navigate(buildDetailUrl(row.action));
  };

  if (state.status === 'loading') {
    return <LoadingState label={TEXT.loading} className="py-12" />;
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        title={TEXT.loadErrorTitle}
        description={state.error}
        action={(
          <button
            type="button"
            onClick={loadRows}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-700)]"
          >
            <RefreshCw size={15} />
            {TEXT.retry}
          </button>
        )}
      />
    );
  }

  if (!filteredRows.length) {
    return <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-surface-200)] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--color-surface-200)] bg-[var(--color-surface-50)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--color-text-main)]">{TEXT.title}</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {TEXT.source} · {state.data?.meta?.evaluation_label || UNAVAILABLE_TEXT}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(ROUTE_BAND_META).map(([id, meta]) => (
            <StatusBadge key={id} label={meta.label} tone={signalToneToBadge(meta.tone)} />
          ))}
          <ColumnOptions columns={columns} setColumns={setColumns} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[2200px] table-auto text-xs">
          <UnifiedHeader columns={columns} />
          <tbody>
            {state.data?.total_row ? <Row row={state.data.total_row} columns={columns} onOpenDetail={handleOpenDetail} /> : null}
            {filteredRows.map((row) => (
              <Row key={row.id} row={row} columns={columns} onOpenDetail={handleOpenDetail} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
