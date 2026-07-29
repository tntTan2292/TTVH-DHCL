import { CANONICAL_BCVH_CODES } from './dashboardFilterOptions.js';

export const UNAVAILABLE_TEXT = 'Chưa có dữ liệu';

const DASH = '\u2014';
const MIDDLE_DOT = '\u00b7';

const ROUTE_BAND_META = Object.freeze({
  green: { label: 'Tốt', color: '#22c55e', tone: 'success' },
  pink: { label: 'Khá', color: '#ec4899', tone: 'info' },
  yellow: { label: 'Trung bình', color: '#eab308', tone: 'warning' },
  red: { label: 'Kém', color: '#ef4444', tone: 'danger' },
});

const KPI_STATUS_META = Object.freeze([
  { min: 70, id: 'green', label: 'Tốt', tone: 'success' },
  { min: 60, id: 'pink', label: 'Cần chú ý', tone: 'info' },
  { min: 50, id: 'yellow', label: 'Cảnh báo', tone: 'warning' },
  { min: -Infinity, id: 'red', label: 'Rủi ro cao', tone: 'danger' },
]);

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toNumber(value, fallback = 0) {
  const numeric = toNumberOrNull(value);
  return numeric === null ? fallback : numeric;
}

function buildContextDateLabel(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return UNAVAILABLE_TEXT;
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

function buildSignal(value) {
  const numeric = toNumberOrNull(value);
  if (numeric === null) return { id: 'unavailable', label: DASH, tone: 'neutral' };
  return KPI_STATUS_META.find((item) => numeric >= item.min) || KPI_STATUS_META.at(-1);
}

function buildMovementSignal(movement = {}) {
  const direction = movement?.direction || 'unavailable';
  if (direction === 'improved') {
    return {
      label: `Cải thiện ${Math.abs(toNumber(movement.delta))} hạng`,
      tone: 'success',
      shortLabel: `↑ ${Math.abs(toNumber(movement.delta))}`,
    };
  }
  if (direction === 'declined') {
    return {
      label: `Suy giảm ${Math.abs(toNumber(movement.delta))} hạng`,
      tone: 'danger',
      shortLabel: `↓ ${Math.abs(toNumber(movement.delta))}`,
    };
  }
  if (direction === 'unchanged') {
    return {
      label: 'Không đổi',
      tone: 'neutral',
      shortLabel: 'Không đổi',
    };
  }
  return {
    label: DASH,
    tone: 'neutral',
    shortLabel: DASH,
  };
}

function buildComparisonPeriod(source = {}) {
  const movement = source.rank_movement || {};
  return {
    volume: toNumberOrNull(source.volume),
    rate: toNumberOrNull(source.f1_3_rate),
    volume_delta: toNumberOrNull(source.volume_delta),
    rate_delta: null,
    comparison_rank: toNumberOrNull(source.comparison_rank),
    rank_movement: {
      ...movement,
      delta: toNumberOrNull(movement.delta),
      signal: buildMovementSignal(movement),
    },
  };
}

function buildRouteDistribution(routeDistribution = {}) {
  const participating = toNumber(routeDistribution.participating_postman_route_count);
  const counts = {
    green: toNumber(routeDistribution.green_route_count),
    pink: toNumber(routeDistribution.pink_route_count),
    yellow: toNumber(routeDistribution.yellow_route_count),
    red: toNumber(routeDistribution.red_route_count),
  };

  return {
    participating_postman_route_count: participating,
    counts,
    segments: Object.entries(counts).map(([id, value]) => ({
      id,
      value,
      label: ROUTE_BAND_META[id].label,
      color: ROUTE_BAND_META[id].color,
      tone: ROUTE_BAND_META[id].tone,
    })),
  };
}

function buildAnalysisText(row) {
  const parts = [
    `KPI ngày ${formatRate(row.current_day.rate, row.is_total)}`,
    `D-1 ${formatSignedDelta(row.comparisons.d1.rate_delta ?? row.current_day.d1_rate_delta, 'điểm %', row.is_total)}`,
    `D-7 ${formatSignedDelta(row.comparisons.d7.rate_delta ?? row.current_day.d7_rate_delta, 'điểm %', row.is_total)}`,
    `Chậm nộp tiền ${formatNumber(row.late_cash.count, row.is_total)} BG (${formatRate(row.late_cash.rate, row.is_total)})`,
    `Tuyến tham gia ${formatNumber(row.route_distribution.participating_postman_route_count, row.is_total)}: tốt ${formatNumber(row.route_distribution.counts.green, row.is_total)}, khá ${formatNumber(row.route_distribution.counts.pink, row.is_total)}, trung bình ${formatNumber(row.route_distribution.counts.yellow, row.is_total)}, kém ${formatNumber(row.route_distribution.counts.red, row.is_total)}`,
  ];

  const d1Movement = row.comparisons.d1.rank_movement.signal.label;
  const d7Movement = row.comparisons.d7.rank_movement.signal.label;
  if (d1Movement !== DASH) parts.push(`Hạng D-1 ${d1Movement.toLowerCase()}`);
  if (d7Movement !== DASH) parts.push(`Hạng D-7 ${d7Movement.toLowerCase()}`);
  return parts.join(` ${MIDDLE_DOT} `);
}

function buildAction(row, context = {}) {
  if (row.is_total) return null;
  return {
    route: '/f13/ranking/route',
    params: {
      from_date: context.fromDate || '',
      to_date: context.toDate || '',
      interval: context.interval || (context.fromDate === context.toDate ? 'daily' : 'range'),
      bcvh_id: row.ma_bcvh || '',
      bcvh_name: row.ten_bcvh || '',
    },
  };
}

export function mapBcvhRankingRow(row = {}, context = {}) {
  const currentRate = toNumberOrNull(row.kpi_2026);
  const d1 = buildComparisonPeriod(row.comparisons?.d1 || {});
  const d7 = buildComparisonPeriod(row.comparisons?.d7 || {});
  d1.rate_delta = toNumberOrNull(row.kpi_2026_dod);
  d7.rate_delta = toNumberOrNull(row.kpi_2026_swc);

  const isTotal = row.is_total === true || row.ma_bcvh === 'total';
  const mapped = {
    id: isTotal ? 'total-row' : (row.ma_bcvh || row.ten_bcvh || `bcvh-${row.rank ?? 'unknown'}`),
    ma_bcvh: isTotal ? '' : (row.ma_bcvh || ''),
    ten_bcvh: isTotal ? 'Tổng cộng' : (row.ten_bcvh || UNAVAILABLE_TEXT),
    rank: isTotal ? null : toNumberOrNull(row.rank),
    is_total: isTotal,
    current_day: {
      volume: toNumberOrNull(row.sl_bg_ptc ?? row.total_bg),
      pass_count: toNumberOrNull(row.dat_kpi_2026),
      fail_count: toNumberOrNull(row.khong_dat_kpi_2026 ?? row.total_failed),
      rate: currentRate,
      signal: buildSignal(currentRate),
      d1_rate_delta: toNumberOrNull(row.kpi_2026_dod),
      d7_rate_delta: toNumberOrNull(row.kpi_2026_swc),
    },
    comparisons: { d1, d7 },
    late_cash: {
      count: toNumberOrNull(row.delayed_cash_handover_count),
      rate: toNumberOrNull(row.f13_303_rate),
      signal: {
        label: row.delayed_cash_handover_count === undefined && row.f13_303_rate === undefined
          ? DASH
          : `${formatNumber(row.delayed_cash_handover_count, isTotal)} BG ${MIDDLE_DOT} ${formatRate(row.f13_303_rate, isTotal)}`,
        tone: 'neutral',
      },
    },
    route_distribution: buildRouteDistribution(row.route_distribution),
  };

  mapped.action = buildAction(mapped, context);
  mapped.analysis = isTotal ? null : buildAnalysisText(mapped);
  return mapped;
}

export function mapBcvhRankingResponse(responseData = {}, context = {}) {
  const canonicalSet = new Set(CANONICAL_BCVH_CODES);
  const rawRows = Array.isArray(responseData?.data) ? responseData.data : [];
  const rows = rawRows
    .filter((row) => canonicalSet.has(String(row.ma_bcvh)))
    .map((row) => mapBcvhRankingRow(row, context))
    .sort((a, b) => {
      if (a.rank !== null && b.rank !== null && a.rank !== b.rank) return a.rank - b.rank;
      return toNumber(b.current_day.volume) - toNumber(a.current_day.volume);
    });

  const totalRow = responseData?.meta?.total_row
    ? mapBcvhRankingRow({ ...responseData.meta.total_row, is_total: true, ma_bcvh: '', ten_bcvh: 'Tổng cộng', rank: null }, context)
    : null;

  return {
    rows,
    total_row: totalRow,
    meta: {
      from_date: context.fromDate || null,
      to_date: context.toDate || null,
      interval: context.interval || null,
      ma_bcvh: context.maBcvh || 'all',
      search: context.search || '',
      evaluation_label: context.toDate ? `${buildContextDateLabel(context.toDate)}` : UNAVAILABLE_TEXT,
      pagination: responseData?.meta?.pagination || null,
    },
  };
}

export function formatNumber(value, nonApplicable = false) {
  const numeric = toNumberOrNull(value);
  if (numeric === null) return nonApplicable ? DASH : UNAVAILABLE_TEXT;
  return numeric.toLocaleString('vi-VN');
}

export function formatRate(value, nonApplicable = false) {
  const numeric = toNumberOrNull(value);
  if (numeric === null) return nonApplicable ? DASH : UNAVAILABLE_TEXT;
  return `${numeric.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function formatSignedDelta(value, unit = '', nonApplicable = false) {
  const numeric = toNumberOrNull(value);
  if (numeric === null) return nonApplicable ? DASH : UNAVAILABLE_TEXT;
  const sign = numeric > 0 ? '+' : '';
  return `${sign}${numeric.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;
}

export function formatVolumeDelta(value, nonApplicable = false) {
  const numeric = toNumberOrNull(value);
  if (numeric === null) return nonApplicable ? DASH : UNAVAILABLE_TEXT;
  const sign = numeric > 0 ? '+' : '';
  return `${sign}${numeric.toLocaleString('vi-VN')}`;
}

export function buildDoughnutAriaLabel(routeDistribution = {}) {
  const segments = routeDistribution.segments || [];
  if (!segments.length) return 'Phân bổ tuyến chưa có dữ liệu';
  return segments.map((segment) => `${segment.label} ${segment.value}`).join(` ${MIDDLE_DOT} `);
}

export { ROUTE_BAND_META, DASH, KPI_STATUS_META };
