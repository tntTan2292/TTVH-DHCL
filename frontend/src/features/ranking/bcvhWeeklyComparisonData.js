import { formatDisplayDate } from '../dashboard/components/operatingPatternTabsData.js';

export function formatWeekRangeLabel(week) {
  if (!week) return '';
  const from = formatDisplayDate(week.display_start_date);
  const to = formatDisplayDate(week.display_end_date);
  return `${week.label}: ${from}–${to}`;
}

export function buildWeekOptions(weeks) {
  return (weeks || []).map((week) => ({
    value: week.week_id,
    label: formatWeekRangeLabel(week),
    week,
  }));
}

// PO decision 6 doesn't apply here (that governs Overview's Y-axis choice), but the delta
// convention is reused from BcvhMtdSummaryBlock / Operation Dashboard D-1/D-7: an absolute
// percentage-point difference, never a ratio.
export function formatSignedRateDelta(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} điểm %`;
}

export function formatSignedVolumeDelta(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toLocaleString('vi-VN')}`;
}
