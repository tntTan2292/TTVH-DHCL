export const UNAVAILABLE_TEXT = 'Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u';

const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);
const MIDDLE_DOT = String.fromCharCode(0x00b7);

const TEXT = {
  latestAvailable: 'd\u1eef li\u1ec7u g\u1ea7n nh\u1ea5t',
  mtdUnavailable: `L\u0168Y K\u1ebe TH\u00c1NG ${EM_DASH} ch\u01b0a c\u00f3 d\u1eef li\u1ec7u`,
  evaluationUnavailable: `NG\u00c0Y \u0110\u00c1NH GI\u00c1 ${EM_DASH} ch\u01b0a c\u00f3 d\u1eef li\u1ec7u`,
  increased: 'T\u0103ng',
  decreased: 'Gi\u1ea3m',
  unchanged: 'Kh\u00f4ng \u0111\u1ed5i',
  better: 'T\u1ed1t h\u01a1n',
  percentPoint: '\u0111i\u1ec3m %',
};

const WARNING_FIELD_CANDIDATES = [
  'warning_level',
  'warningLevel',
  'quality_pulse_level',
  'qualityPulseLevel',
  'risk_level',
  'riskLevel',
];

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toNumber(value, fallback = 0) {
  const numeric = toNumberOrNull(value);
  return numeric === null ? fallback : numeric;
}

function formatDateRange(fromDate, toDate) {
  if (fromDate && toDate && fromDate !== toDate) return `${fromDate} \u0111\u1ebfn ${toDate}`;
  return toDate || fromDate || UNAVAILABLE_TEXT;
}

export function formatDisplayDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return dateStr || UNAVAILABLE_TEXT;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatCompactDateRange(fromDate, toDate) {
  if (!fromDate && !toDate) return UNAVAILABLE_TEXT;
  if (!fromDate || !toDate || fromDate === toDate) return formatDisplayDate(toDate || fromDate);

  const [fromYear, fromMonth, fromDay] = fromDate.split('-');
  const [toYear, toMonth, toDay] = toDate.split('-');
  if (fromYear === toYear && fromMonth === toMonth) {
    return `${fromDay}/${fromMonth}${EN_DASH}${toDay}/${toMonth}/${toYear}`;
  }
  return `${formatDisplayDate(fromDate)}${EN_DASH}${formatDisplayDate(toDate)}`;
}

function appendLatestAvailable(label, usedLatestAvailable) {
  return usedLatestAvailable ? `${label} ${MIDDLE_DOT} ${TEXT.latestAvailable}` : label;
}

function buildMonthToDateGroupLabel(monthToDate) {
  if (!monthToDate?.available) return TEXT.mtdUnavailable;
  const period = formatCompactDateRange(monthToDate.from_date, monthToDate.to_date);
  return appendLatestAvailable(`L\u0168Y K\u1ebe TH\u00c1NG ${EM_DASH} ${period}`, monthToDate.used_latest_available);
}

function buildEvaluationDateLabel(evaluationDate, monthToDate) {
  const source = evaluationDate || {};
  const date = source.date || monthToDate?.current_data_date || monthToDate?.to_date;
  if (!source.available && !monthToDate?.available) return TEXT.evaluationUnavailable;
  const usedLatestAvailable = Boolean(source.used_latest_available ?? monthToDate?.used_latest_available);
  return appendLatestAvailable(`NG\u00c0Y \u0110\u00c1NH GI\u00c1 ${EM_DASH} ${formatDisplayDate(date)}`, usedLatestAvailable);
}

function getWarning(row = {}) {
  const sourceField = WARNING_FIELD_CANDIDATES.find((field) => row[field] !== undefined && row[field] !== null && row[field] !== '');

  if (!sourceField) {
    return {
      level: 'unavailable',
      label: UNAVAILABLE_TEXT,
      source: 'unavailable',
    };
  }

  return {
    level: String(row[sourceField]),
    label: row.warning_label || row.warningLabel || String(row[sourceField]),
    source: sourceField,
  };
}

function buildAction(row, { fromDate, toDate, interval }) {
  const params = {
    from_date: fromDate || '',
    to_date: toDate || '',
    interval: interval || (fromDate && toDate && fromDate !== toDate ? 'range' : 'daily'),
    bcvh_id: row.ma_bcvh || '',
    bcvh_name: row.ten_bcvh || '',
  };

  return {
    type: 'navigate',
    route: '/f13/ranking/route',
    params,
  };
}

function calculateVolumeDelta(currentVolume, previousVolume) {
  if (currentVolume === null || previousVolume === null || previousVolume <= 0) return null;
  return ((currentVolume - previousVolume) / previousVolume) * 100;
}

function calculateRateDelta(currentRate, previousRate) {
  if (currentRate === null || previousRate === null) return null;
  return currentRate - previousRate;
}

export function mapBcvhRankingRow(row = {}, context = {}) {
  const totalVolume = toNumber(row.sl_bg_ptc ?? row.total_bg);
  const passCount = toNumber(row.dat_kpi_2026 ?? row.total_passed ?? row.passed_bg);
  const failCount = toNumber(row.khong_dat_kpi_2026 ?? row.total_failed ?? row.failed_bg);
  const returnedCount = Math.max(0, totalVolume - passCount - failCount);
  const currentKpi = toNumberOrNull(row.kpi_2026 ?? row.passed_rate ?? row.kpi_rate);
  const d1Delta = toNumberOrNull(row.kpi_2026_dod);
  const d7Delta = toNumberOrNull(row.kpi_2026_swc);
  const monthToDateVolume = toNumberOrNull(row.month_to_date_sl_bg_ptc);
  const monthToDatePass = toNumberOrNull(row.month_to_date_dat_kpi_2026);
  const monthToDateFail = toNumberOrNull(row.month_to_date_khong_dat_kpi_2026);
  const monthToDateKpi = toNumberOrNull(row.month_to_date_kpi_2026);
  const previousMonthToDateVolume = toNumberOrNull(row.previous_month_to_date_sl_bg_ptc);
  const previousMonthToDatePass = toNumberOrNull(row.previous_month_to_date_dat_kpi_2026);
  const previousMonthToDateKpi = toNumberOrNull(row.previous_month_to_date_kpi_2026);

  return {
    id: row.ma_bcvh || row.ten_bcvh || `bcvh-${row.rank ?? 'unknown'}`,
    ma_bcvh: row.ma_bcvh || UNAVAILABLE_TEXT,
    ten_bcvh: row.ten_bcvh || UNAVAILABLE_TEXT,
    rank: toNumberOrNull(row.rank),
    context_label: formatDateRange(context.fromDate, context.toDate),
    total_volume: totalVolume,
    pass_count: passCount,
    fail_count: failCount,
    returned_count: returnedCount,
    current_kpi: currentKpi,
    prior_periods: {
      d1: { delta: d1Delta, label: 'D-1' },
      d7: { delta: d7Delta, label: 'D-7' },
    },
    month_to_date: {
      total_volume: monthToDateVolume,
      pass_count: monthToDatePass,
      fail_count: monthToDateFail,
      pass_rate: monthToDateKpi,
      previous_total_volume: previousMonthToDateVolume,
      previous_pass_count: previousMonthToDatePass,
      previous_pass_rate: previousMonthToDateKpi,
      volume_delta_percent: calculateVolumeDelta(monthToDateVolume, previousMonthToDateVolume),
      pass_rate_delta_points: calculateRateDelta(monthToDateKpi, previousMonthToDateKpi),
    },
    compact_trend: {
      available: false,
      points: [],
    },
    warning: getWarning(row),
    action: buildAction(row, context),
    source: {
      endpoint: 'GET /api/f13/ranking/bcvh',
      total_volume: row.sl_bg_ptc !== undefined ? 'sl_bg_ptc' : 'total_bg',
      pass_count: row.dat_kpi_2026 !== undefined ? 'dat_kpi_2026' : row.total_passed !== undefined ? 'total_passed' : 'passed_bg',
      fail_count: row.khong_dat_kpi_2026 !== undefined ? 'khong_dat_kpi_2026' : row.total_failed !== undefined ? 'total_failed' : 'failed_bg',
      current_kpi: row.kpi_2026 !== undefined ? 'kpi_2026' : row.passed_rate !== undefined ? 'passed_rate' : 'kpi_rate',
      d1_delta: row.kpi_2026_dod !== undefined ? 'kpi_2026_dod' : null,
      d7_delta: row.kpi_2026_swc !== undefined ? 'kpi_2026_swc' : null,
      month_to_date_total_volume: row.month_to_date_sl_bg_ptc !== undefined ? 'month_to_date_sl_bg_ptc' : null,
      month_to_date_pass_count: row.month_to_date_dat_kpi_2026 !== undefined ? 'month_to_date_dat_kpi_2026' : null,
      month_to_date_fail_count: row.month_to_date_khong_dat_kpi_2026 !== undefined ? 'month_to_date_khong_dat_kpi_2026' : null,
      month_to_date_pass_rate: row.month_to_date_kpi_2026 !== undefined ? 'month_to_date_kpi_2026' : null,
      previous_month_to_date_total_volume: row.previous_month_to_date_sl_bg_ptc !== undefined ? 'previous_month_to_date_sl_bg_ptc' : null,
      previous_month_to_date_pass_count: row.previous_month_to_date_dat_kpi_2026 !== undefined ? 'previous_month_to_date_dat_kpi_2026' : null,
      previous_month_to_date_pass_rate: row.previous_month_to_date_kpi_2026 !== undefined ? 'previous_month_to_date_kpi_2026' : null,
    },
  };
}

export function mapBcvhRankingResponse(responseData = {}, context = {}) {
  const rawRows = Array.isArray(responseData?.data) ? responseData.data : [];
  const rows = rawRows
    .map((row) => mapBcvhRankingRow(row, context))
    .sort((a, b) => {
      if (a.rank !== null && b.rank !== null && a.rank !== b.rank) return a.rank - b.rank;
      return b.total_volume - a.total_volume;
    });

  const totalRow = responseData?.meta?.total_row
    ? mapBcvhRankingRow({ ...responseData.meta.total_row, ma_bcvh: 'total', rank: null }, context)
    : null;

  const monthToDate = responseData?.meta?.month_to_date || null;
  const previousMonthToDate = responseData?.meta?.previous_month_to_date || null;
  const evaluationDate = responseData?.meta?.evaluation_date || null;

  return {
    meta: {
      from_date: context.fromDate || null,
      to_date: context.toDate || null,
      ma_bcvh: context.maBcvh || 'all',
      default_order: 'rank_asc',
      optional_evidence: {
        returned_available: true,
        month_to_date_available: Boolean(monthToDate?.available),
        previous_month_to_date_available: Boolean(previousMonthToDate?.available),
        compact_trend_available: false,
        warning_available: rows.some((row) => row.warning.source !== 'unavailable'),
      },
      month_to_date: monthToDate
        ? {
            ...monthToDate,
            group_label: buildMonthToDateGroupLabel(monthToDate),
          }
        : null,
      previous_month_to_date: previousMonthToDate,
      evaluation_date: {
        ...(evaluationDate || {}),
        label: buildEvaluationDateLabel(evaluationDate, monthToDate),
      },
      pagination: responseData?.meta?.pagination || null,
    },
    rows,
    total_row: totalRow,
  };
}

export function formatNumber(value) {
  const numeric = toNumberOrNull(value);
  if (numeric === null) return UNAVAILABLE_TEXT;
  return numeric.toLocaleString('vi-VN');
}

export function formatRate(value) {
  const numeric = toNumberOrNull(value);
  if (numeric === null) return UNAVAILABLE_TEXT;
  return `${numeric.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function formatDelta(value) {
  const numeric = toNumberOrNull(value);
  if (numeric === null) return UNAVAILABLE_TEXT;
  const sign = numeric > 0 ? '+' : '';
  return `${sign}${numeric.toFixed(2)} ${TEXT.percentPoint}`;
}

export function formatVolumeDelta(value) {
  const numeric = toNumberOrNull(value);
  if (numeric === null) return UNAVAILABLE_TEXT;
  const label = numeric > 0 ? TEXT.increased : numeric < 0 ? TEXT.decreased : TEXT.unchanged;
  const sign = numeric > 0 ? '+' : '';
  return `${sign}${numeric.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% ${MIDDLE_DOT} ${label}`;
}

export function formatRateDelta(value) {
  const numeric = toNumberOrNull(value);
  if (numeric === null) return UNAVAILABLE_TEXT;
  const label = numeric > 0 ? TEXT.better : numeric < 0 ? TEXT.decreased : TEXT.unchanged;
  const sign = numeric > 0 ? '+' : '';
  return `${sign}${numeric.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${TEXT.percentPoint} ${MIDDLE_DOT} ${label}`;
}
