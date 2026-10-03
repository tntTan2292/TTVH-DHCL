// Shared, framework-free logic for chart data labels and wheel-zoom windows.
// Rendering lives in ChartDataLabels.jsx / ChartZoomFrame.jsx; keeping the decisions here
// lets them be unit-tested without a DOM.

// Visual placement is owned by the UI executor (Antigravity). Change placement here, in one
// place, instead of editing every chart: 'insideBottom' keeps volume labels clear of the
// quality-rate line, 'top' puts them above the bar.
export const LABEL_STYLE = {
  volumePosition: 'insideBottom',
  volumeFontSize: 11,
  rateFontSize: 11,
  compareFontSize: 10,
  minBarWidthForHorizontal: 30,
  minBarHeightForInside: 22,
  haloColor: '#FFFFFF',
};

// At or below this many visible points every point is labelled; above it only the points
// picked by selectLabelIndexes() are, so a 30-day view stays readable until the user zooms.
export const LABEL_ALL_MAX_POINTS = 10;
export const MIN_ZOOM_SPAN = 5;

export function formatVolumeLabel(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  return Number(value).toLocaleString('vi-VN');
}

export function formatRateLabel(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  return `${Number(value).toFixed(digits)}%`;
}

function isNumber(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

/**
 * Which point indexes should carry a data label.
 * - <= LABEL_ALL_MAX_POINTS points: all points that have a value.
 * - otherwise: lowest, highest and last valued point, plus any `alwaysLabel(row)` points
 *   limited to `maxExtra` so a bad month cannot bury the chart.
 */
export function selectLabelIndexes(rows = [], key, { alwaysLabel = null, maxExtra = 0, allMaxPoints = LABEL_ALL_MAX_POINTS } = {}) {
  const picked = new Set();
  const valued = [];
  rows.forEach((row, index) => {
    if (isNumber(row?.[key])) valued.push(index);
  });
  if (valued.length === 0) return picked;

  if (rows.length <= allMaxPoints) {
    valued.forEach((index) => picked.add(index));
    return picked;
  }

  let minIndex = valued[0];
  let maxIndex = valued[0];
  valued.forEach((index) => {
    if (Number(rows[index][key]) < Number(rows[minIndex][key])) minIndex = index;
    if (Number(rows[index][key]) > Number(rows[maxIndex][key])) maxIndex = index;
  });
  picked.add(minIndex);
  picked.add(maxIndex);
  picked.add(valued[valued.length - 1]);

  if (alwaysLabel && maxExtra > 0) {
    valued
      .filter((index) => alwaysLabel(rows[index]))
      .sort((a, b) => Number(rows[a][key]) - Number(rows[b][key]))
      .slice(0, maxExtra)
      .forEach((index) => picked.add(index));
  }
  return picked;
}

/** Label only the last valued point of a series (multi-series end-of-line labels). */
export function selectLastIndex(rows = [], key) {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (isNumber(rows[index]?.[key])) return new Set([index]);
  }
  return new Set();
}

const END_LABEL_MIN_GAP = 3;
const END_LABEL_STEP = 12;

/**
 * When several series end at nearly the same value their end labels would sit on top of each
 * other. Returns { [seriesKey]: offsetY } stacking them downward from the highest value.
 */
export function stackEndLabelOffsets(rows = [], keys = [], { minGap = END_LABEL_MIN_GAP, step = END_LABEL_STEP } = {}) {
  const lastValues = keys
    .map((key) => {
      for (let index = rows.length - 1; index >= 0; index -= 1) {
        if (isNumber(rows[index]?.[key])) return { key, value: Number(rows[index][key]) };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => b.value - a.value);

  const offsets = {};
  let previous = null;
  lastValues.forEach((item) => {
    const stacked = previous !== null && previous.value - item.value < minGap;
    offsets[item.key] = stacked ? previous.offset + step : 0;
    previous = { value: item.value, offset: offsets[item.key] };
  });
  return offsets;
}

// ---- zoom window -----------------------------------------------------------------------

export function clampWindow(start, end, total, minSpan = MIN_ZOOM_SPAN) {
  const safeTotal = Math.max(0, Math.floor(total));
  if (safeTotal === 0) return { start: 0, end: 0 };
  const span = Math.min(safeTotal, Math.max(Math.min(minSpan, safeTotal), Math.round(end - start + 1)));
  const clampedStart = Math.min(Math.max(0, Math.round(start)), safeTotal - span);
  return { start: clampedStart, end: clampedStart + span - 1 };
}

export function fullWindow(total) {
  return { start: 0, end: Math.max(0, total - 1) };
}

export function isFullWindow(window, total) {
  return !window || (window.start <= 0 && window.end >= total - 1);
}

/**
 * Zoom around the cursor. anchorRatio is the cursor's 0..1 position across the plot;
 * zoomIn=true shrinks the visible span, false grows it. Always keeps the anchored point
 * under the cursor as closely as integer indexes allow.
 */
export function zoomWindow(window, total, { anchorRatio = 0.5, zoomIn = true, factor = 0.8, minSpan = MIN_ZOOM_SPAN } = {}) {
  const current = window || fullWindow(total);
  const span = current.end - current.start + 1;
  const ratio = Math.min(1, Math.max(0, anchorRatio));
  const floorSpan = Math.min(minSpan, total);
  let nextSpan = zoomIn ? Math.floor(span * factor) : Math.ceil(span / factor);
  // A step must never be swallowed by rounding.
  if (zoomIn && nextSpan >= span) nextSpan = span - 1;
  if (!zoomIn && nextSpan <= span) nextSpan = span + 1;
  nextSpan = Math.min(total, Math.max(floorSpan, nextSpan));
  const anchorIndex = current.start + ratio * (span - 1);
  const nextStart = anchorIndex - ratio * (nextSpan - 1);
  return clampWindow(nextStart, nextStart + nextSpan - 1, total, minSpan);
}

/** Pan by a (fractional) number of points; positive moves toward later points. */
export function panWindow(window, total, deltaPoints) {
  const current = window || fullWindow(total);
  const span = current.end - current.start + 1;
  return clampWindow(current.start + deltaPoints, current.start + deltaPoints + span - 1, total, span);
}

export function sliceWindow(rows = [], window) {
  if (!window || isFullWindow(window, rows.length)) return rows;
  return rows.slice(window.start, window.end + 1);
}
