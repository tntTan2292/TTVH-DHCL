import { isFullWindow, panWindow } from './chartDataLabels.js';

/**
 * Extract human-readable label for a data point (pure function, no JSX).
 */
export function defaultGetPointLabel(row, index, unitNoun = 'tuần') {
  if (row?.label) return row.label;
  if (row?.dayLabel && row?.current_date) return `${row.dayLabel} (${row.current_date})`;
  if (row?.current_date) return row.current_date;
  if (row?.dayLabel) return row.dayLabel;
  if (row?.date_label) return row.date_label;
  if (row?.date) return row.date;
  const capitalized = unitNoun ? unitNoun.charAt(0).toUpperCase() + unitNoun.slice(1) : 'Mốc';
  return `${capitalized} ${index + 1}`;
}

/**
 * Calculate preset window ending at the latest available point.
 */
export function calculatePresetWindow(count, total) {
  if (!total || total <= 0) return null;
  if (count >= total) return { start: 0, end: total - 1 };
  return { start: Math.max(0, total - count), end: total - 1 };
}

/**
 * Determine default presets according to unit noun.
 */
export function resolveNavigatorPresets(unitNoun = 'tuần') {
  if (unitNoun === 'ngày') {
    return [
      { count: 14, label: '14 ngày gần nhất' },
      { count: 7, label: '7 ngày gần nhất' },
    ];
  }
  return [
    { count: 12, label: '12 tuần gần nhất' },
    { count: 6, label: '6 tuần gần nhất' },
  ];
}

export { isFullWindow, panWindow };
