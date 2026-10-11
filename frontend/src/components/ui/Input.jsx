import React from 'react';

/**
 * Modern Glass Input Component (UI-GLASS-THEME-01)
 */
export default function Input({
  label,
  error,
  helperText,
  icon: Icon = null,
  rightElement = null,
  className = '',
  id,
  fullWidth = true,
  disabled = false,
  ...props
}) {
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className={`${fullWidth ? 'w-full' : ''} flex flex-col gap-1.5`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-700 select-none">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}

        <input
          id={inputId}
          disabled={disabled}
          className={`input-glass ${Icon ? 'pl-10' : 'pl-3.5'} ${rightElement ? 'pr-10' : 'pr-3.5'} ${
            error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''
          } ${fullWidth ? 'w-full' : ''} ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs font-medium text-red-600 mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
}
