import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, RefreshCw, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../../../api/client';
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../../../components/shared/SharedComponents';
import {
  buildDoughnutAriaLabel,
  DASH,
  formatNumber,
  formatRate,
  formatSignedDelta,
  formatVolumeDelta,
  mapBcvhRankingResponse,
  UNAVAILABLE_TEXT,
} from './unifiedBcvhAnalysisTableData';

const STORAGE_KEY = 'qis.bcvhRankingWave2.columns.v1';

const TEXT = {
  loading: 'Đang tải bảng xếp hạng BCVH...',
  loadErrorTitle: 'Không thể tải bảng xếp hạng BCVH',
  loadErrorMessage: 'Không thể tải bảng xếp hạng BCVH.',
  retry: 'Thử lại',
  emptyTitle: 'Không có dữ liệu BCVH',
  emptyDescription: 'Chưa có bản ghi BCVH cho kỳ đang chọn.',
  source: 'Ngày đánh giá',
  currentDay: 'Kết quả ngày đánh giá',
  comparisonD1: 'So sánh D-1',
  comparisonD7: 'So sánh D-7',
  lateCash: 'Chậm nộp tiền',
  routeDistribution: 'Phân bổ tuyến',
  action: 'Hành động',
  identity: 'Đơn vị',
  rank: 'Hạng',
  code: 'Mã BCVH',
  name: 'Tên BCVH',
  volume: 'Sản lượng',
  pass: 'Đạt',
  fail: 'Không đạt',
  rate: 'Tỷ lệ',
  volumeDelta: 'SS SL',
  rateDelta: 'SS Tỷ lệ',
  lateCashCount: 'BG chậm nộp tiền',
  lateCashRate: 'Tỷ lệ chậm nộp tiền',
  routeCount: 'Số tuyến tham gia',
  routeGreen: 'Tốt',
  routePink: 'Khá',
  routeYellow: 'Trung bình',
  routeRed: 'Kém',
  doughnut: 'Doughnut',
  detailManagement: 'Xem chi tiết tuyến',
  analysisAction: 'Phân tích',
  columnOptions: 'Ẩn / hiện cột',
  reset: 'Khôi phục',
  hideableColumns: 'Chỉ 4 cột raw D-1 / D-7 được phép ẩn',
  analysisTitle: 'Phân tích BCVH',
  currentSummary: 'Kết quả ngày đánh giá',
  comparisonSummary: 'So sánh kỳ trước',
  lateCashSummary: 'Chậm nộp tiền',
  routeSummary: 'Phân bổ chất lượng tuyến',
};

const DEFAULT_COLUMNS = {
  d1Volume: true,
  d1Rate: true,
  d7Volume: true,
  d7Rate: true,
};

const STICKY_RANK = 'sticky left-0 z-20';
const STICKY_CODE = 'sticky left-[68px] z-20';
const STICKY_NAME = 'sticky left-[176px] z-20';

const GROUP_STYLES = {
  identity: {
    header: 'bg-slate-100 text-slate-700',
    cell: 'bg-slate-50',
    divider: 'border-r border-slate-200',
  },
  currentDay: {
    header: 'bg-sky-100 text-sky-800',
    cell: 'bg-sky-50',
    divider: 'border-r border-sky-200',
  },
  d1: {
    header: 'bg-emerald-100 text-emerald-800',
    cell: 'bg-emerald-50',
    divider: 'border-r border-emerald-200',
  },
  d7: {
    header: 'bg-violet-100 text-violet-800',
    cell: 'bg-violet-50',
    divider: 'border-r border-violet-200',
  },
  lateCash: {
    header: 'bg-amber-100 text-amber-800',
    cell: 'bg-amber-50',
    divider: 'border-r border-amber-200',
  },
  route: {
    header: 'bg-rose-100 text-rose-800',
    cell: 'bg-rose-50',
    divider: 'border-r border-rose-200',
  },
  action: {
    header: 'bg-slate-100 text-slate-700',
    cell: 'bg-slate-50',
    divider: '',
  },
};

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
    // Optional persistence only.
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

function DoughnutCell({ routeDistribution, size = 'small' }) {
  const total = routeDistribution.segments.reduce((sum, segment) => sum + segment.value, 0);
  if (!total) {
    return <span className="text-[11px] text-[var(--color-text-muted)]">{UNAVAILABLE_TEXT}</span>;
  }

  const boxClass = size === 'large' ? 'h-28 w-28' : 'h-16 w-16';
  const innerRadius = size === 'large' ? 28 : 18;
  const outerRadius = size === 'large' ? 42 : 28;

  return (
    <div className={boxClass} aria-label={buildDoughnutAriaLabel(routeDistribution)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip formatter={(value, name) => [`${value}`, name]} />
          <Pie
            data={routeDistribution.segments}
            dataKey="value"
            nameKey="label"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
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
              ['d1Rate', 'D-1 / Tỷ lệ'],
              ['d7Volume', 'D-7 / Sản lượng'],
              ['d7Rate', 'D-7 / Tỷ lệ'],
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
  return <th colSpan={colSpan} className={`px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wide ${className}`}>{label}</th>;
}

function UnifiedHeader({ columns }) {
  const d1Span = 2 + (columns.d1Volume ? 1 : 0) + (columns.d1Rate ? 1 : 0);
  const d7Span = 2 + (columns.d7Volume ? 1 : 0) + (columns.d7Rate ? 1 : 0);

  return (
    <thead className="sticky top-0 z-10 bg-white text-[11px] uppercase text-[var(--color-text-muted)]">
      <tr className="border-b border-[var(--color-surface-200)]">
        <HeaderGroup label={TEXT.identity} colSpan={3} className={GROUP_STYLES.identity.header} />
        <HeaderGroup label={TEXT.currentDay} colSpan={4} className={GROUP_STYLES.currentDay.header} />
        <HeaderGroup label={TEXT.comparisonD1} colSpan={d1Span} className={GROUP_STYLES.d1.header} />
        <HeaderGroup label={TEXT.comparisonD7} colSpan={d7Span} className={GROUP_STYLES.d7.header} />
        <HeaderGroup label={TEXT.lateCash} colSpan={2} className={GROUP_STYLES.lateCash.header} />
        <HeaderGroup label={TEXT.routeDistribution} colSpan={6} className={GROUP_STYLES.route.header} />
        <HeaderGroup label={TEXT.action} colSpan={1} className={GROUP_STYLES.action.header} />
      </tr>
      <tr className="border-b border-[var(--color-surface-200)]">
        <th className={`${STICKY_RANK} ${GROUP_STYLES.identity.cell} ${GROUP_STYLES.identity.divider} px-3 py-3 text-right`}>{TEXT.rank}</th>
        <th className={`${STICKY_CODE} ${GROUP_STYLES.identity.cell} ${GROUP_STYLES.identity.divider} px-3 py-3 text-left`}>{TEXT.code}</th>
        <th className={`${STICKY_NAME} ${GROUP_STYLES.identity.cell} ${GROUP_STYLES.currentDay.divider} px-3 py-3 text-left`}>{TEXT.name}</th>

        <th className={`${GROUP_STYLES.currentDay.cell} px-3 py-3 text-right`}>{TEXT.volume}</th>
        <th className={`${GROUP_STYLES.currentDay.cell} px-3 py-3 text-right`}>{TEXT.pass}</th>
        <th className={`${GROUP_STYLES.currentDay.cell} px-3 py-3 text-right`}>{TEXT.fail}</th>
        <th className={`${GROUP_STYLES.currentDay.cell} ${GROUP_STYLES.currentDay.divider} px-3 py-3 text-center`}>{TEXT.rate}</th>

        {columns.d1Volume ? <th className={`${GROUP_STYLES.d1.cell} px-3 py-3 text-right`}>{TEXT.volume}</th> : null}
        {columns.d1Rate ? <th className={`${GROUP_STYLES.d1.cell} px-3 py-3 text-center`}>{TEXT.rate}</th> : null}
        <th className={`${GROUP_STYLES.d1.cell} px-3 py-3 text-right`}>{TEXT.volumeDelta}</th>
        <th className={`${GROUP_STYLES.d1.cell} ${GROUP_STYLES.d1.divider} px-3 py-3 text-center`}>{TEXT.rateDelta}</th>

        {columns.d7Volume ? <th className={`${GROUP_STYLES.d7.cell} px-3 py-3 text-right`}>{TEXT.volume}</th> : null}
        {columns.d7Rate ? <th className={`${GROUP_STYLES.d7.cell} px-3 py-3 text-center`}>{TEXT.rate}</th> : null}
        <th className={`${GROUP_STYLES.d7.cell} px-3 py-3 text-right`}>{TEXT.volumeDelta}</th>
        <th className={`${GROUP_STYLES.d7.cell} ${GROUP_STYLES.d7.divider} px-3 py-3 text-center`}>{TEXT.rateDelta}</th>

        <th className={`${GROUP_STYLES.lateCash.cell} px-3 py-3 text-right`}>{TEXT.lateCashCount}</th>
        <th className={`${GROUP_STYLES.lateCash.cell} ${GROUP_STYLES.lateCash.divider} px-3 py-3 text-center`}>{TEXT.lateCashRate}</th>

        <th className={`${GROUP_STYLES.route.cell} px-3 py-3 text-right`}>{TEXT.routeCount}</th>
        <th className={`${GROUP_STYLES.route.cell} px-3 py-3 text-right`}>{TEXT.routeGreen}</th>
        <th className={`${GROUP_STYLES.route.cell} px-3 py-3 text-right`}>{TEXT.routePink}</th>
        <th className={`${GROUP_STYLES.route.cell} px-3 py-3 text-right`}>{TEXT.routeYellow}</th>
        <th className={`${GROUP_STYLES.route.cell} px-3 py-3 text-right`}>{TEXT.routeRed}</th>
        <th className={`${GROUP_STYLES.route.cell} ${GROUP_STYLES.route.divider} px-3 py-3 text-center`}>{TEXT.doughnut}</th>

        <th className={`${GROUP_STYLES.action.cell} px-3 py-3 text-center`}>{TEXT.action}</th>
      </tr>
    </thead>
  );
}

function AnalysisPanel({ row, onOpenDetail }) {
  const segments = row.route_distribution.segments;
  return (
    <div className="rounded-2xl border border-[var(--color-surface-200)] bg-[var(--color-surface-50)] p-5">
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-bold text-[var(--color-text-main)]">{TEXT.analysisTitle}</h4>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{row.analysis || UNAVAILABLE_TEXT}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{TEXT.currentSummary}</div>
              <div className="mt-3 space-y-2 text-sm text-[var(--color-text-main)]">
                <div>Sản lượng: <span className="font-semibold">{formatNumber(row.current_day.volume)}</span></div>
                <div>Đạt: <span className="font-semibold">{formatNumber(row.current_day.pass_count)}</span></div>
                <div>Không đạt: <span className="font-semibold">{formatNumber(row.current_day.fail_count)}</span></div>
                <div className="flex items-center gap-2">Tỷ lệ F1.3: <span className="font-semibold">{formatRate(row.current_day.rate)}</span><StatusBadge label={row.current_day.signal.label} tone={signalToneToBadge(row.current_day.signal.tone)} /></div>
              </div>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{TEXT.lateCashSummary}</div>
              <div className="mt-3 space-y-2 text-sm text-[var(--color-text-main)]">
                <div>BG chậm nộp tiền: <span className="font-semibold">{formatNumber(row.late_cash.count)}</span></div>
                <div>Tỷ lệ chậm nộp tiền: <span className="font-semibold">{formatRate(row.late_cash.rate)}</span></div>
              </div>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{TEXT.comparisonSummary} D-1</div>
              <div className="mt-3 space-y-2 text-sm text-[var(--color-text-main)]">
                <div>Sản lượng: <span className="font-semibold">{formatNumber(row.comparisons.d1.volume)}</span></div>
                <div>Tỷ lệ: <span className="font-semibold">{formatRate(row.comparisons.d1.rate)}</span></div>
                <div>SS SL: <span className="font-semibold">{formatVolumeDelta(row.comparisons.d1.volume_delta)}</span></div>
                <div>SS Tỷ lệ: <span className="font-semibold">{formatSignedDelta(row.comparisons.d1.rate_delta, 'điểm %')}</span></div>
              </div>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{TEXT.comparisonSummary} D-7</div>
              <div className="mt-3 space-y-2 text-sm text-[var(--color-text-main)]">
                <div>Sản lượng: <span className="font-semibold">{formatNumber(row.comparisons.d7.volume)}</span></div>
                <div>Tỷ lệ: <span className="font-semibold">{formatRate(row.comparisons.d7.rate)}</span></div>
                <div>SS SL: <span className="font-semibold">{formatVolumeDelta(row.comparisons.d7.volume_delta)}</span></div>
                <div>SS Tỷ lệ: <span className="font-semibold">{formatSignedDelta(row.comparisons.d7.rate_delta, 'điểm %')}</span></div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{TEXT.routeSummary}</div>
            <div className="mt-3 flex items-center gap-4">
              <DoughnutCell routeDistribution={row.route_distribution} size="large" />
              <div className="grid flex-1 gap-2 text-sm">
                <div className="rounded-lg bg-[var(--color-surface-50)] px-3 py-2">Tuyến tham gia: <span className="font-semibold">{formatNumber(row.route_distribution.participating_postman_route_count)}</span></div>
                {segments.map((segment) => (
                  <div key={segment.id} className="rounded-lg bg-[var(--color-surface-50)] px-3 py-2">
                    {segment.label}: <span className="font-semibold">{formatNumber(segment.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenDetail(row)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-700)]"
          >
            {TEXT.detailManagement}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ row, columns, expandedRowId, onToggleAnalysis, onOpenDetail }) {
  const isTotal = row.is_total;
  const stickyBg = isTotal ? 'bg-[var(--color-primary-50)]' : GROUP_STYLES.identity.cell;
  const isExpanded = expandedRowId === row.id;
  const colSpan = 18 + (columns.d1Volume ? 1 : 0) + (columns.d1Rate ? 1 : 0) + (columns.d7Volume ? 1 : 0) + (columns.d7Rate ? 1 : 0);

  return (
    <>
      <tr
        className={`border-b ${isTotal ? 'border-[var(--color-primary-200)] bg-[var(--color-primary-50)] font-semibold' : 'border-[var(--color-surface-100)] cursor-pointer hover:bg-[var(--color-surface-50)]'}`}
        onClick={isTotal ? undefined : () => onToggleAnalysis(row.id)}
      >
        <td className={`${STICKY_RANK} ${stickyBg} border-r border-slate-200 px-3 py-3 text-right ${isTotal ? 'text-[12px] font-bold text-[var(--color-primary-800)] shadow-[1px_0_0_0_var(--color-primary-200)]' : 'shadow-[1px_0_0_0_var(--color-surface-200)]'}`}>{row.rank ?? DASH}</td>
        <td className={`${STICKY_CODE} ${stickyBg} border-r border-slate-200 px-3 py-3 font-mono text-[11px] ${isTotal ? 'text-[var(--color-text-muted)] shadow-[1px_0_0_0_var(--color-primary-200)]' : 'text-[var(--color-text-muted)] shadow-[1px_0_0_0_var(--color-surface-200)]'}`}>{row.ma_bcvh || DASH}</td>
        <td className={`${STICKY_NAME} ${stickyBg} border-r border-sky-200 px-3 py-3 ${isTotal ? 'text-[15px] font-black uppercase tracking-wide text-[var(--color-primary-900)] shadow-[8px_0_12px_-12px_rgba(59,130,246,0.25)]' : 'text-[14px] font-semibold text-[var(--color-text-main)] shadow-[8px_0_12px_-12px_rgba(15,23,42,0.35)]'}`}>{row.ten_bcvh}</td>

        <td className="px-3 py-3 text-right">{formatNumber(row.current_day.volume, isTotal)}</td>
        <td className="px-3 py-3 text-right">{formatNumber(row.current_day.pass_count, isTotal)}</td>
        <td className="px-3 py-3 text-right">{formatNumber(row.current_day.fail_count, isTotal)}</td>
        <td className="border-r border-sky-200 px-3 py-3 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className={`font-semibold ${isTotal ? 'text-[15px]' : ''}`}>{formatRate(row.current_day.rate, isTotal)}</span>
            <StatusBadge label={row.current_day.signal.label} tone={signalToneToBadge(row.current_day.signal.tone)} />
          </div>
        </td>

        {columns.d1Volume ? <td className="px-3 py-3 text-right">{formatNumber(row.comparisons.d1.volume, isTotal)}</td> : null}
        {columns.d1Rate ? <td className="px-3 py-3 text-center">{formatRate(row.comparisons.d1.rate, isTotal)}</td> : null}
        <td className="px-3 py-3 text-right">{formatVolumeDelta(row.comparisons.d1.volume_delta, isTotal)}</td>
        <td className="border-r border-emerald-200 px-3 py-3 text-center">{formatSignedDelta(row.comparisons.d1.rate_delta, 'điểm %', isTotal)}</td>

        {columns.d7Volume ? <td className="px-3 py-3 text-right">{formatNumber(row.comparisons.d7.volume, isTotal)}</td> : null}
        {columns.d7Rate ? <td className="px-3 py-3 text-center">{formatRate(row.comparisons.d7.rate, isTotal)}</td> : null}
        <td className="px-3 py-3 text-right">{formatVolumeDelta(row.comparisons.d7.volume_delta, isTotal)}</td>
        <td className="border-r border-violet-200 px-3 py-3 text-center">{formatSignedDelta(row.comparisons.d7.rate_delta, 'điểm %', isTotal)}</td>

        <td className="px-3 py-3 text-right">{formatNumber(row.late_cash.count, isTotal)}</td>
        <td className="border-r border-amber-200 px-3 py-3 text-center">{formatRate(row.late_cash.rate, isTotal)}</td>

        <td className="px-3 py-3 text-right">{formatNumber(row.route_distribution.participating_postman_route_count, isTotal)}</td>
        <td className="px-3 py-3 text-right">{formatNumber(row.route_distribution.counts.green, isTotal)}</td>
        <td className="px-3 py-3 text-right">{formatNumber(row.route_distribution.counts.pink, isTotal)}</td>
        <td className="px-3 py-3 text-right">{formatNumber(row.route_distribution.counts.yellow, isTotal)}</td>
        <td className="px-3 py-3 text-right">{formatNumber(row.route_distribution.counts.red, isTotal)}</td>
        <td className="border-r border-rose-200 px-3 py-3 text-center"><DoughnutCell routeDistribution={row.route_distribution} /></td>

        <td className="bg-slate-50 px-3 py-3 text-center">
          {!isTotal ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleAnalysis(row.id);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-surface-200)] bg-white px-2 py-1 text-[11px] font-semibold text-[var(--color-primary-700)] shadow-sm hover:bg-[var(--color-primary-50)]"
            >
              {TEXT.analysisAction}
              <ChevronDown size={12} className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">{DASH}</span>
          )}
        </td>
      </tr>
      {isExpanded ? (
        <tr className="border-b border-[var(--color-surface-100)] bg-white">
          <td colSpan={colSpan} className="px-4 py-4">
            <AnalysisPanel row={row} onOpenDetail={onOpenDetail} />
          </td>
        </tr>
      ) : null}
    </>
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
  const [expandedRowId, setExpandedRowId] = useState(null);
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

  useEffect(() => {
    setExpandedRowId(null);
  }, [fromDate, toDate, maBcvh, search]);

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

  const toggleAnalysis = (rowId) => {
    setExpandedRowId((current) => (current === rowId ? null : rowId));
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
          <p className="text-xs text-[var(--color-text-muted)]">
            {TEXT.source} · {state.data?.meta?.evaluation_label || UNAVAILABLE_TEXT}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="KPI 2026" tone="neutral" />
          <StatusBadge label="Tuyến chất lượng" tone="neutral" />
          <ColumnOptions columns={columns} setColumns={setColumns} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[2200px] table-auto text-xs">
          <UnifiedHeader columns={columns} />
          <tbody>
            {state.data?.total_row ? (
              <Row
                row={state.data.total_row}
                columns={columns}
                expandedRowId={expandedRowId}
                onToggleAnalysis={toggleAnalysis}
                onOpenDetail={handleOpenDetail}
              />
            ) : null}
            {filteredRows.map((row) => (
              <Row
                key={row.id}
                row={row}
                columns={columns}
                expandedRowId={expandedRowId}
                onToggleAnalysis={toggleAnalysis}
                onOpenDetail={handleOpenDetail}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
