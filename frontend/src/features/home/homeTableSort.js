// HOME-BI-01 - Pure sorting and presentation helpers for the Executive BI Dashboard
import { compareSortValues, nextSortState } from '../../components/common/tableSort.js';

export { nextSortState };

export const RANKING_TEXT_FIELDS = Object.freeze(['ma_tinh', 'ten_tinh']);
export const LOWEST_UNITS_TEXT_FIELDS = Object.freeze(['ma_bcvh', 'ten_bcvh', 'ten_phat']);

export const INDICATOR_FULL_NAMES = Object.freeze({
  f11: 'Toàn trình nội tỉnh',
  f12: 'Thu gom liên tỉnh',
  f13: 'Phát liên tỉnh',
  f41: 'Phát thành công bưu cục',
  f42: 'Phát giao bưu tá',
});

/**
 * Format rank movement for display.
 * - Positive movement (> 0): improved rank, e.g. "+3"
 * - Negative movement (< 0): dropped rank, e.g. "-2"
 * - Zero movement (=== 0): no change, "0"
 * - Null / undefined: missing data, "—"
 */
export function formatRankMovement(movement) {
  if (movement === null || movement === undefined || Number.isNaN(Number(movement))) {
    return '—';
  }
  const val = Number(movement);
  if (val > 0) return `+${val}`;
  if (val < 0) return `${val}`;
  return '0';
}

/**
 * Format rate DoD change.
 * - Positive (> 0): "+1.2%"
 * - Negative (< 0): "-1.2%"
 * - Zero (=== 0): "0.0%"
 * - Null / undefined: "—" (never fake 0.0%)
 */
export function formatRateChange(rateChange) {
  if (rateChange === null || rateChange === undefined || Number.isNaN(Number(rateChange))) {
    return '—';
  }
  const val = Number(rateChange);
  const formatted = val.toFixed(1);
  if (val > 0) return `+${formatted}%`;
  return `${formatted}%`;
}

/**
 * Format percentage gap to target or gap to national rate.
 */
export function formatGap(gap) {
  if (gap === null || gap === undefined || Number.isNaN(Number(gap))) {
    return '—';
  }
  const val = Number(gap);
  const formatted = val.toFixed(1);
  if (val > 0) return `+${formatted}%`;
  return `${formatted}%`;
}

/**
 * Compute sensible Y domain for trend chart.
 * Follows the data points dynamically while always including targetRate and 100% ceiling.
 * Never clips low points (e.g. 22.2%, 38.1%).
 * Returns [floor, 100].
 */
export function computeTrendYDomain(points = [], targetRate = 90) {
  const rates = (points || [])
    .map((p) => p?.rate)
    .filter((r) => r !== null && r !== undefined && Number.isFinite(Number(r)))
    .map((r) => Number(r));

  const validTarget = Number.isFinite(Number(targetRate)) ? Number(targetRate) : 90;
  if (!rates.length) {
    return [Math.max(0, validTarget - 30), 100];
  }

  const minRate = Math.min(...rates, validTarget);
  // Sensible floor: round down minRate - 5 to nearest multiple of 10, clamped at 0
  const floor = minRate <= 10 ? 0 : Math.max(0, Math.floor((minRate - 5) / 10) * 10);
  return [floor, 100];
}

/**
 * Sort 34 provinces for the National Ranking table.
 * Preserves stable order when values are equal.
 */
export function sortNationalRanking(items, sort = { field: 'rank', direction: 'asc' }) {
  if (!Array.isArray(items) || !items.length) return [];
  const { field, direction } = sort;
  if (!field) return items;

  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const cmp = compareSortValues(a.item[field], b.item[field], direction);
      return cmp !== 0 ? cmp : a.index - b.index;
    })
    .map((entry) => entry.item);
}

/**
 * Filter 34 provinces based on view mode:
 * - 'all': all 34 provinces
 * - 'hue_focus': Top 3 + [Huế-2, Huế-1, Huế, Huế+1, Huế+2] + Bottom 3 (deduplicated by ma_tinh, ordered by rank)
 */
export function filterProvincesByMode(items, mode = 'all') {
  if (!Array.isArray(items)) return [];
  if (mode === 'all') return items;

  const hueIndex = items.findIndex((i) => i.is_hue);
  if (hueIndex === -1) return items;

  const selectedIndices = new Set();

  // Top 3 (indices 0, 1, 2)
  for (let i = 0; i < Math.min(3, items.length); i++) {
    selectedIndices.add(i);
  }

  // Around Huế (hueIndex - 2 to hueIndex + 2)
  for (let i = Math.max(0, hueIndex - 2); i <= Math.min(items.length - 1, hueIndex + 2); i++) {
    selectedIndices.add(i);
  }

  // Bottom 3
  for (let i = Math.max(0, items.length - 3); i < items.length; i++) {
    selectedIndices.add(i);
  }

  return items
    .filter((_, idx) => selectedIndices.has(idx))
    .sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));
}

/**
 * Sort lowest units table (BCVH or accepting units).
 */
export function sortLowestUnits(units, sort = { field: 'rate', direction: 'asc' }) {
  if (!Array.isArray(units) || !units.length) return [];
  const { field, direction } = sort;
  if (!field) return units;

  return [...units]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const cmp = compareSortValues(a.item[field], b.item[field], direction);
      return cmp !== 0 ? cmp : a.index - b.index;
    })
    .map((entry) => entry.item);
}
