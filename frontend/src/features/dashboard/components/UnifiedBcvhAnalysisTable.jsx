import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, RefreshCw, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/client';
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../../../components/shared/SharedComponents';
import {
  formatDelta,
  formatNumber,
  formatRate,
  formatRateDelta,
  formatVolumeDelta,
  mapBcvhRankingResponse,
  UNAVAILABLE_TEXT,
} from './unifiedBcvhAnalysisTableData';

const STORAGE_KEY = 'qis.unifiedBcvhAnalysisTable.columns.v3';
const MIDDLE_DOT = String.fromCharCode(0x00b7);

const TEXT = {
  source: 'Nguồn: xếp hạng BCVH',
  evidence: 'Dữ liệu ngày đánh giá và lũy kế tháng được tách riêng theo hợp đồng API hiện có.',
  loadErrorMessage: 'Không thể tải bảng phân tích BCVH.',
  loading: 'Đang tải bảng phân tích BCVH...',
  loadErrorTitle: 'Không thể tải bảng phân tích BCVH',
  retry: 'Thử lại',
  emptyTitle: 'Không có dữ liệu BCVH',
  emptyDescription: 'Chưa có bản ghi xếp hạng BCVH cho kỳ đang chọn.',
  title: 'Bảng phân tích BCVH thống nhất',
  subtitleSuffix: 'thứ tự mặc định theo xếp hạng hiện có',
  bcvhContext: 'BCVH',
  mtdFallback: 'LŨY KẾ THÁNG',
  evaluationFallback: 'NGÀY ĐÁNH GIÁ',
  volume: 'Sản lượng',
  pass: 'Đạt',
  passRate: 'Tỷ lệ đạt',
  volumeDelta: 'Δ SL',
  rateDelta: 'Δ Tỷ lệ',
  d1: 'D-1',
  d7: 'D-7',
  supplemental: 'Bổ sung',
  action: 'Chi tiết',
  returned: 'Chuyển hoàn',
  warning: 'Cảnh báo',
  detail: 'Chi tiết',
  columnOptions: 'Tùy chọn cột',
  compact: 'Gọn',
  standard: 'Mặc định',
  reset: 'Khôi phục mặc định',
  alwaysShown: 'Luôn hiển thị',
  showColumn: 'Hiển thị cột',
  volumeDeltaTooltip: 'Δ SL = (Sản lượng lũy kế hiện tại - sản lượng cùng kỳ tháng trước) / sản lượng cùng kỳ tháng trước.',
  rateDeltaTooltip: 'Δ Tỷ lệ = Tỷ lệ đạt lũy kế hiện tại - tỷ lệ đạt cùng kỳ tháng trước.',
  dayComparisonTooltip: 'So sánh của ngày đánh giá, không phải lũy kế tháng.',
};

const COLUMN_DEFS = {
  bcvh: { group: 'identity', mandatory: true, label: TEXT.bcvhContext },
  dayVolume: { group: 'day', mandatory: true, label: TEXT.volume },
  dayPass: { group: 'day', label: TEXT.pass },
  dayRate: { group: 'day', mandatory: true, label: TEXT.passRate },
  d1: { group: 'day', label: TEXT.d1, tooltip: TEXT.dayComparisonTooltip },
  d7: { group: 'day', label: TEXT.d7, tooltip: TEXT.dayComparisonTooltip },
  supplemental: { group: 'day', label: TEXT.supplemental },
  mtdVolume: { group: 'mtd', mandatory: true, label: TEXT.volume },
  mtdVolumeDelta: { group: 'mtd', label: TEXT.volumeDelta, tooltip: TEXT.volumeDeltaTooltip },
  mtdRate: { group: 'mtd', mandatory: true, label: TEXT.passRate },
  mtdRateDelta: { group: 'mtd', label: TEXT.rateDelta, tooltip: TEXT.rateDeltaTooltip },
  action: { group: 'action', mandatory: true, label: TEXT.action },
};

const PRESETS = {
  compact: ['bcvh', 'dayVolume', 'dayPass', 'dayRate', 'd1', 'd7', 'mtdVolume', 'mtdRate', 'action'],
  default: ['bcvh', 'dayVolume', 'dayPass', 'dayRate', 'd1', 'd7', 'supplemental', 'mtdVolume', 'mtdVolumeDelta', 'mtdRate', 'mtdRateDelta', 'action'],
};
const DEFAULT_COLUMNS = PRESETS.default;
function getDeltaTone(value) {
  if (value === null || value === undefined || Number(value) === 0) return 'neutral';
  return Number(value) > 0 ? 'info' : 'warning';
}

function buildDetailUrl(action) {
  const params = new URLSearchParams();
  Object.entries(action?.params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  });
  return `${action?.route || '/f13/ranking/route'}?${params.toString()}`;
}

function normalizeColumns(columns) {
  const selected = new Set(Array.isArray(columns) ? columns : DEFAULT_COLUMNS);
  Object.entries(COLUMN_DEFS).forEach(([key, column]) => {
    if (column.mandatory) selected.add(key);
  });
  return Object.keys(COLUMN_DEFS).filter((key) => selected.has(key));
}

function readStoredColumns() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { preset: 'default', columns: DEFAULT_COLUMNS };
    const parsed = JSON.parse(stored);
    if (!parsed || !Array.isArray(parsed.columns)) return { preset: 'default', columns: DEFAULT_COLUMNS };
    return {
      preset: parsed.preset || 'custom',
      columns: normalizeColumns(parsed.columns),
    };
  } catch {
    return { preset: 'default', columns: DEFAULT_COLUMNS };
  }
}

function EvidenceNote() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
      <StatusBadge label={TEXT.source} tone="info" />
      <span>{TEXT.evidence}</span>
    </div>
  );
}

function DeltaBadge({ value, type }) {
  const label = type === 'volume' ? formatVolumeDelta(value) : formatRateDelta(value);
  if (label === UNAVAILABLE_TEXT) {
    return <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{label}</span>;
  }
  return <div className="inline-block whitespace-nowrap"><StatusBadge label={label} tone={getDeltaTone(value)} /></div>;
}

function DayDeltaCell({ value }) {
  return <div className="inline-block whitespace-nowrap"><StatusBadge label={formatDelta(value)} tone={getDeltaTone(value)} /></div>;
}

function ColumnOptions({ visibleColumns, setVisibleColumns }) {
  const [open, setOpen] = useState(false);
  const visible = new Set(visibleColumns);

  const applyColumns = (columns, preset = 'custom') => {
    const normalized = normalizeColumns(columns);
    setVisibleColumns(normalized);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset, columns: normalized }));
    } catch {
      // Local storage is optional; the table falls back to the default layout.
    }
  };

  const toggleColumn = (columnKey) => {
    const next = new Set(visibleColumns);
    if (next.has(columnKey)) next.delete(columnKey);
    else next.add(columnKey);
    applyColumns([...next], 'custom');
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-surface-200)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-text-main)] shadow-sm hover:bg-[var(--color-surface-50)]"
      >
        <Settings2 size={14} />
        {TEXT.columnOptions}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={TEXT.columnOptions}
          className="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-[var(--color-surface-200)] bg-white p-3 text-xs shadow-lg"
        >
          <div className="mb-2 grid grid-cols-2 gap-1">
            <button type="button" onClick={() => applyColumns(PRESETS.compact, 'compact')} className="rounded border px-2 py-1 font-semibold hover:bg-[var(--color-surface-50)]">{TEXT.compact}</button>
            <button type="button" onClick={() => applyColumns(PRESETS.default, 'default')} className="rounded border px-2 py-1 font-semibold hover:bg-[var(--color-surface-50)]">{TEXT.standard}</button>
          </div>
          <button type="button" onClick={() => applyColumns(PRESETS.default, 'default')} className="mb-2 w-full rounded bg-[var(--color-surface-100)] px-2 py-1.5 font-semibold hover:bg-[var(--color-surface-200)]">
            {TEXT.reset}
          </button>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {Object.entries(COLUMN_DEFS).map(([key, column]) => (
              <label key={key} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-[var(--color-surface-50)]">
                <input
                  type="checkbox"
                  checked={visible.has(key)}
                  disabled={column.mandatory}
                  onChange={() => toggleColumn(key)}
                  aria-label={`${TEXT.showColumn} ${column.label}`}
                />
                <span className={column.mandatory ? 'font-semibold text-[var(--color-text-muted)]' : 'text-[var(--color-text-main)]'}>
                  {column.label}{column.mandatory ? ` ${MIDDLE_DOT} ${TEXT.alwaysShown}` : ''}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RowCells({ row, onOpenDetail, visibleColumns }) {
  const canOpenDetail = row.ma_bcvh !== 'total' && row.action?.params?.bcvh_id;
  const isTotalRow = row.ma_bcvh === 'total';
  const rowTone = isTotalRow ? 'bg-[var(--color-surface-50)] font-semibold' : 'hover:bg-[var(--color-surface-50)]';
  const bcvhWidth = visibleColumns.length <= PRESETS.compact.length ? 'w-[24%]' : 'w-[180px]';

  const renderers = {
    bcvh: (
      <td className={`${bcvhWidth} px-2 py-1 align-middle`}>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--color-surface-100)] px-1.5 text-[10px] font-bold text-[var(--color-text-main)]">
            {row.rank ?? '-'}
          </span>
          <div className="min-w-0">
            <div className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--color-text-main)]">
              {isTotalRow ? 'T\u1ed4NG C\u1ed8NG' : row.ten_bcvh}
            </div>
            {!isTotalRow ? <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--color-text-muted)]">{row.ma_bcvh}</div> : null}
          </div>
        </div>
      </td>
    ),
    dayVolume: <td className="border-l-2 border-[var(--color-surface-300)] bg-[var(--color-surface-50)]/70 px-1.5 py-1 text-right font-mono text-xs">{formatNumber(row.total_volume)}</td>,
    dayPass: <td className="bg-[var(--color-surface-50)]/70 px-1.5 py-1 text-right font-mono text-xs text-green-700">{formatNumber(row.pass_count)}</td>,
    dayRate: <td className="bg-[var(--color-surface-50)]/70 px-1.5 py-1 text-center text-xs font-bold text-[var(--color-text-main)]">{formatRate(row.current_kpi)}</td>,
    d1: <td className="bg-[var(--color-surface-50)]/70 px-1.5 py-1 text-center text-xs"><DayDeltaCell value={row.prior_periods.d1.delta} /></td>,
    d7: <td className="bg-[var(--color-surface-50)]/70 px-1.5 py-1 text-center text-xs"><DayDeltaCell value={row.prior_periods.d7.delta} /></td>,
    supplemental: (
      <td className="max-w-[120px] bg-[var(--color-surface-50)]/70 px-1.5 py-1 text-xs text-[var(--color-text-muted)]">
        <span title={`${TEXT.returned}: ${formatNumber(row.returned_count)} ${MIDDLE_DOT} ${TEXT.warning}: ${row.warning.label || UNAVAILABLE_TEXT}`} className="block truncate">
          {TEXT.returned}: {formatNumber(row.returned_count)}
        </span>
      </td>
    ),
    mtdVolume: <td className="border-l-2 border-[var(--color-primary-200)] bg-[var(--color-primary-50)]/40 px-1.5 py-1 text-right font-mono text-xs">{formatNumber(row.month_to_date.total_volume)}</td>,
    mtdVolumeDelta: <td className="bg-[var(--color-primary-50)]/40 px-1.5 py-1 text-center text-xs"><DeltaBadge value={row.month_to_date.volume_delta_percent} type="volume" /></td>,
    mtdRate: <td className="bg-[var(--color-primary-50)]/40 px-1.5 py-1 text-center text-xs font-bold text-[var(--color-text-main)]">{formatRate(row.month_to_date.pass_rate)}</td>,
    mtdRateDelta: <td className="bg-[var(--color-primary-50)]/40 px-1.5 py-1 text-center text-xs"><DeltaBadge value={row.month_to_date.pass_rate_delta_points} type="rate" /></td>,
    action: (
      <td className="px-1.5 py-1 text-right">
        {canOpenDetail ? (
          <button
            type="button"
            onClick={() => onOpenDetail(row)}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--color-surface-200)] bg-white px-2 py-1 text-[11px] font-semibold text-[var(--color-primary-700)] shadow-sm hover:bg-[var(--color-primary-50)]"
          >
            {TEXT.detail}
            <ArrowRight size={12} />
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">{UNAVAILABLE_TEXT}</span>
        )}
      </td>
    ),
  };

  return (
    <tr className={`border-b border-[var(--color-surface-100)] ${rowTone}`}>
      {visibleColumns.map((columnKey) => <FragmentCell key={columnKey}>{renderers[columnKey]}</FragmentCell>)}
    </tr>
  );
}

function FragmentCell({ children }) {
  return children;
}

function HeaderRows({ visibleColumns, monthToDateGroupLabel, evaluationDateLabel }) {
  const count = (group) => visibleColumns.filter((key) => COLUMN_DEFS[key]?.group === group).length;
  const has = (columnKey) => visibleColumns.includes(columnKey);
  const mtdCount = count('mtd');
  const dayCount = count('day');
  const bcvhWidth = visibleColumns.length <= PRESETS.compact.length ? 'w-[24%]' : 'w-[180px]';

  return (
    <thead className="bg-white text-[11px] uppercase text-[var(--color-text-muted)]">
      <tr className="border-b border-[var(--color-surface-200)]">
        {has('bcvh') ? <th rowSpan={2} className={`${bcvhWidth} px-2 py-1.5 text-left font-semibold`}>{TEXT.bcvhContext}</th> : null}
        {dayCount ? (
          <th colSpan={dayCount} className="border-l-2 border-[var(--color-surface-300)] bg-[var(--color-surface-100)] px-2 py-1.5 text-center font-bold text-[var(--color-text-main)]">
            {evaluationDateLabel}
          </th>
        ) : null}
        {mtdCount ? (
          <th colSpan={mtdCount} className="border-l-2 border-[var(--color-primary-300)] bg-[var(--color-primary-50)] px-2 py-1.5 text-center font-semibold text-[var(--color-primary-800)]">
            {monthToDateGroupLabel}
          </th>
        ) : null}
        {has('action') ? <th rowSpan={2} className="w-[76px] px-1.5 py-2 text-right font-semibold">{TEXT.action}</th> : null}
      </tr>
      <tr className="border-b border-[var(--color-surface-200)]">
        {visibleColumns.filter((key) => ['day', 'mtd'].includes(COLUMN_DEFS[key]?.group)).map((key) => {
          const column = COLUMN_DEFS[key];
          const align = ['mtdVolume', 'dayVolume', 'dayPass'].includes(key) ? 'text-right' : 'text-center';
          const bg = column.group === 'mtd' ? 'bg-[var(--color-primary-50)]' : column.group === 'day' ? 'bg-[var(--color-surface-100)]' : 'bg-white';
          const border = key === 'dayVolume' ? 'border-l-2 border-[var(--color-surface-300)]' : key === 'mtdVolume' ? 'border-l-2 border-[var(--color-primary-300)]' : '';
          return (
            <th key={key} title={column.tooltip || ''} className={`${border} ${bg} px-1 py-1.5 ${align} font-semibold`}>
              {column.label}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

export default function UnifiedBcvhAnalysisTable({ fromDate, toDate, interval = 'daily', maBcvh = 'all' }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const requestSeqRef = useRef(0);
  const requestContext = useMemo(() => ({ fromDate, toDate, interval, maBcvh }), [fromDate, interval, maBcvh, toDate]);

  useEffect(() => {
    setVisibleColumns(readStoredColumns().columns);
  }, []);

  const loadRows = useCallback(async () => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    const activeContext = requestContext;

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

      if (requestSeqRef.current !== requestSeq) return;

      setState({
        status: 'success',
        data: mapBcvhRankingResponse(response.data, activeContext),
        error: null,
      });
    } catch (error) {
      if (requestSeqRef.current !== requestSeq) return;

      setState({
        status: 'error',
        data: null,
        error: error?.response?.data?.error?.message || error?.message || TEXT.loadErrorMessage,
      });
    }
  }, [fromDate, requestContext, toDate]);

  useEffect(() => {
    if (fromDate && toDate) loadRows();
  }, [fromDate, loadRows, toDate]);

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

  const rows = state.data?.rows || [];
  const monthToDateGroupLabel = state.data?.meta?.month_to_date?.group_label || TEXT.mtdFallback;
  const evaluationDateLabel = state.data?.meta?.evaluation_date?.label || TEXT.evaluationFallback;

  if (!rows.length) {
    return (
      <EmptyState
        title={TEXT.emptyTitle}
        description={TEXT.emptyDescription}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-surface-200)] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--color-surface-200)] bg-[var(--color-surface-50)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--color-text-main)]">{TEXT.title}</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {fromDate} đến {toDate} · {TEXT.subtitleSuffix}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <EvidenceNote />
          <ColumnOptions visibleColumns={visibleColumns} setVisibleColumns={setVisibleColumns} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto text-xs">
          <HeaderRows
            visibleColumns={visibleColumns}
            monthToDateGroupLabel={monthToDateGroupLabel}
            evaluationDateLabel={evaluationDateLabel}
          />
          <tbody>
            {state.data?.total_row ? (
              <RowCells
                row={state.data.total_row}
                onOpenDetail={handleOpenDetail}
                visibleColumns={visibleColumns}
              />
            ) : null}
            {rows.map((row) => (
              <RowCells
                key={row.id}
                row={row}
                onOpenDetail={handleOpenDetail}
                visibleColumns={visibleColumns}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
