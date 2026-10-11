import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

/**
 * Column title that orders the table when clicked (PO 2026-10-10). Shows an arrow for the active column
 * (down = biggest first) and a faint double arrow on the others, so the leader can see it is clickable.
 * `sort` is { field, direction } and `onSort(field)` flips/chooses it (see nextSortState).
 */
export default function SortableTh({
  field,
  sort,
  onSort,
  children,
  className = '',
  activeClassName = 'bg-blue-100/80 text-[var(--color-vnpost-blue)] font-bold',
  title,
  colSpan,
  rowSpan,
}) {
  const active = sort?.field === field;
  const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      aria-sort={ariaSort}
      onClick={() => onSort(field)}
      title={title || 'Bấm để sắp xếp theo cột này (bấm lại để đảo chiều)'}
      className={`cursor-pointer select-none transition-colors duration-150 hover:bg-blue-50/60 ${className} ${active ? activeClassName : ''}`}
    >
      <span className="inline-flex items-center justify-center gap-1.5">
        <span>{children}</span>
        {active ? (
          sort.direction === 'asc' ? <ArrowUp className="h-3 w-3 shrink-0 text-current" /> : <ArrowDown className="h-3 w-3 shrink-0 text-current" />
        ) : (
          <ArrowUpDown className="h-2.5 w-2.5 shrink-0 opacity-40 hover:opacity-75 transition-opacity" />
        )}
      </span>
    </th>
  );
}
