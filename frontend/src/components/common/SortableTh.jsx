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
  activeClassName = 'bg-blue-100/90 text-blue-950',
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
      className={`cursor-pointer select-none transition-colors hover:bg-slate-200/70 ${className} ${active ? activeClassName : ''}`}
    >
      <span className="inline-flex items-center justify-center gap-1">
        <span>{children}</span>
        {active ? (
          sort.direction === 'asc' ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />
        ) : (
          <ArrowUpDown className="h-2.5 w-2.5 shrink-0 opacity-30" />
        )}
      </span>
    </th>
  );
}
