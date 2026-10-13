// HOME-BI-01 - Pure sorting and presentation helpers for the Executive BI Dashboard
import { compareSortValues, nextSortState } from '../../components/common/tableSort.js';

export { nextSortState };

export const RANKING_TEXT_FIELDS = Object.freeze(['ma_tinh', 'ten_tinh']);
export const LOWEST_UNITS_TEXT_FIELDS = Object.freeze(['ma_bcvh', 'ten_bcvh']);

/**
 * Format rank movement for display.
 * Positive movement means rank improved (moved towards rank 1, e.g. from 15 to 12 is +3).
 */
export function formatRankMovement(movement) {
  if (movement === null || movement === undefined || Number.isNaN(Number(movement))) {
    return '—';
  }
  const val = Number(movement);
  if (val > 0) return `+${val}`;
  if (val < 0) return `${val}`;
  return '—';
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
