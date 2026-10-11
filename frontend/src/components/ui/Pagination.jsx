import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Modern Glass Pagination Component (UI-GLASS-THEME-02)
 * High aesthetic pagination controls with smooth glass buttons.
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = '',
}) {
  if (totalPages <= 1 && !totalItems) return null;

  const getPageNumbers = () => {
    const pages = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 ${className}`}
    >
      {/* Items count & page size */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {totalItems != null && (
          <span>
            Tổng cộng: <strong className="text-slate-800 font-semibold">{totalItems}</strong> dòng
          </span>
        )}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="input-glass py-1 px-2 text-xs rounded-lg cursor-pointer bg-white/90"
              aria-label="Số dòng mỗi trang"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page controls */}
      <nav aria-label="Phân trang" className="inline-flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange?.(currentPage - 1)}
          aria-label="Trang trước"
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/90 border border-slate-200/80 bg-white/60 shadow-2xs backdrop-blur-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((page, idx) => {
          if (page === '...') {
            return (
              <span key={`dots-${idx}`} className="px-2 text-xs text-slate-400 select-none">
                ...
              </span>
            );
          }

          const isCurrent = page === currentPage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange?.(page)}
              aria-current={isCurrent ? 'page' : undefined}
              className={`inline-flex items-center justify-center h-8 min-w-[2rem] px-2 text-xs font-semibold rounded-lg transition-all duration-150 ${
                isCurrent
                  ? 'bg-[var(--color-vnpost-blue)] text-white shadow-sm font-bold border border-[var(--color-vnpost-blue)]'
                  : 'bg-white/60 text-slate-700 hover:text-slate-900 hover:bg-white/90 border border-slate-200/80 shadow-2xs'
              }`}
            >
              {page}
            </button>
          );
        })}

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange?.(currentPage + 1)}
          aria-label="Trang sau"
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/90 border border-slate-200/80 bg-white/60 shadow-2xs backdrop-blur-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
