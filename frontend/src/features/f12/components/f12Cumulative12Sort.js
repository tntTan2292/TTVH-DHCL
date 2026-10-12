import { nextSortState } from '../../../components/common/tableSort.js';

export { nextSortState };

/**
 * Format month key YYYY-MM to short Vietnamese label (e.g. '2026-10' -> 'T10/26').
 */
export function formatMonthShort(monthKey) {
  if (!monthKey || typeof monthKey !== 'string') return '';
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) return monthKey;
  const [, year, month] = match;
  return `T${parseInt(month, 10)}/${year.slice(2)}`;
}

/**
 * Sort unit rows in cumulative 12 table.
 * Supports sorting by standard unit properties or month-specific rates (field: 'month_YYYY-MM').
 */
export function sortCumulativeUnits(units = [], sortField = null, sortDirection = 'asc') {
  if (!sortField) return units;

  return [...units].sort((a, b) => {
    let valA, valB;

    if (sortField.startsWith('month_')) {
      const monthKey = sortField.slice(6);
      valA = a.months?.[monthKey]?.rate ?? null;
      valB = b.months?.[monthKey]?.rate ?? null;
    } else {
      valA = a[sortField] ?? null;
      valB = b[sortField] ?? null;
    }

    // Nulls always go last
    const hasA = valA !== null && valA !== undefined && valA !== '';
    const hasB = valB !== null && valB !== undefined && valB !== '';
    if (hasA && !hasB) return -1;
    if (!hasA && hasB) return 1;
    if (!hasA && !hasB) return 0;

    let diff = 0;
    if (typeof valA === 'number' && typeof valB === 'number') {
      diff = valA - valB;
    } else {
      diff = String(valA).localeCompare(String(valB), 'vi');
    }

    return sortDirection === 'desc' ? -diff : diff;
  });
}

/**
 * Filter units by search keyword (name or code).
 */
export function filterCumulativeUnits(units = [], search = '') {
  const q = String(search || '').trim().toLowerCase();
  if (!q) return units;

  return units.filter((unit) => {
    const code = String(unit.ma_bcvh || '').toLowerCase();
    const name = String(unit.ten_bcvh || '').toLowerCase();
    return code.includes(q) || name.includes(q);
  });
}
