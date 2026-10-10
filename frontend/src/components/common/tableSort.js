// Click-to-order for report tables (PO 2026-10-10): every column title of a report table that shows numbers
// (volume, rate, increase/decrease...) can be clicked to order the rows by that column; a second click
// reverses the direction. Pure helpers, shared by all indicators (F1.1, F1.3, F4.1).

// Numbers compare numerically, text with the Vietnamese collation; a missing value (null, undefined, NaN,
// '', the dash placeholders) always goes last whatever the direction, so empty cells never lead a ranking.
function isMissing(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number') return Number.isNaN(value);
  const text = String(value).trim();
  return text === '' || text === '—' || text === '–' || text === '-';
}

export function compareSortValues(a, b, direction = 'desc') {
  const missingA = isMissing(a);
  const missingB = isMissing(b);
  if (missingA && missingB) return 0;
  if (missingA) return 1;
  if (missingB) return -1;
  const sign = direction === 'asc' ? 1 : -1;
  const numberA = typeof a === 'number' ? a : Number(a);
  const numberB = typeof b === 'number' ? b : Number(b);
  if (Number.isFinite(numberA) && Number.isFinite(numberB) && typeof a !== 'boolean') {
    return (numberA - numberB) * sign;
  }
  return String(a).localeCompare(String(b), 'vi') * sign;
}

// Stable: rows with equal values keep their original order.
export function sortRowsBy(rows, field, direction = 'desc', getValue = (row, key) => row?.[key]) {
  if (!Array.isArray(rows) || !field) return Array.isArray(rows) ? rows : [];
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => compareSortValues(getValue(left.row, field), getValue(right.row, field), direction) || left.index - right.index)
    .map((entry) => entry.row);
}

// Next sort state after clicking a title: same column flips the direction; a new column starts descending
// (biggest first) for numbers and ascending (A-Z) for text columns.
export function nextSortState(current, field, { textFields = [] } = {}) {
  if (current && current.field === field) {
    return { field, direction: current.direction === 'desc' ? 'asc' : 'desc' };
  }
  return { field, direction: textFields.includes(field) ? 'asc' : 'desc' };
}

// Accessor for values stored as { volume, passed, rate, ... } cells: 'name:volume' / 'name:rate' style keys.
export function cellFieldValue(cell, metric) {
  if (!cell) return null;
  if (metric === 'volume') return cell.volume > 0 ? Number(cell.volume) : null;
  if (metric === 'rate') return cell.volume > 0 && cell.rate !== null && cell.rate !== undefined ? Number(cell.rate) : null;
  return cell[metric] ?? null;
}
