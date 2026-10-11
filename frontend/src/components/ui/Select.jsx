import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Modern Glass Select Component (UI-GLASS-THEME-01)
 */
export default function Select({
  label,
  error,
  options = [],
  className = '',
  id,
  fullWidth = true,
  disabled = false,
  children,
  ...props
}) {
  const selectId = id || (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className={`${fullWidth ? 'w-full' : ''} flex flex-col gap-1.5`}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-slate-700 select-none">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          id={selectId}
          disabled={disabled}
          className={`input-glass appearance-none pr-10 cursor-pointer ${
            error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''
          } ${fullWidth ? 'w-full' : ''} ${className}`}
          {...props}
        >
          {children ? (
            children
          ) : (
            options.map((opt) => (
              <option key={opt.value ?? opt} value={opt.value ?? opt}>
                {opt.label ?? opt}
              </option>
            ))
          )}
        </select>

        <div className="absolute right-3.5 pointer-events-none text-slate-400">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>

      {error && <p className="text-xs font-medium text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}
