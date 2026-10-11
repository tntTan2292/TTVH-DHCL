import React from 'react';

/**
 * Modern Glass Toggle / Switch Component (UI-GLASS-THEME-02)
 * High-tactile toggle switch with glass track and smooth sliding knob.
 */
export default function Toggle({
  checked = false,
  onChange,
  label = '',
  description = '',
  disabled = false,
  size = 'md',
  className = '',
  id,
}) {
  const toggleId = id || (label ? `toggle-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  const isSmall = size === 'sm';
  const trackSize = isSmall ? 'w-8 h-4.5' : 'w-11 h-6';
  const knobSize = isSmall ? 'h-3.5 w-3.5' : 'h-5 w-5';
  const translate = isSmall
    ? checked ? 'translate-x-3.5' : 'translate-x-0.5'
    : checked ? 'translate-x-5.5' : 'translate-x-0.5';

  return (
    <label
      htmlFor={toggleId}
      className={`inline-flex items-center gap-3 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div className="relative inline-flex items-center">
        <input
          id={toggleId}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          disabled={disabled}
          onChange={(e) => !disabled && onChange?.(e.target.checked)}
          className="peer sr-only"
        />
        <div
          className={`${trackSize} rounded-full transition-colors duration-200 border peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-[var(--color-vnpost-blue)] ${
            checked
              ? 'bg-[var(--color-vnpost-blue)] border-[var(--color-vnpost-blue)] shadow-xs'
              : 'bg-slate-200/90 border-slate-300/80'
          } flex items-center`}
        >
          <div
            className={`${knobSize} rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out border border-slate-100 ${translate}`}
          />
        </div>
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-semibold text-slate-800 leading-tight">{label}</span>}
          {description && <span className="text-xs text-slate-500 mt-0.5">{description}</span>}
        </div>
      )}
    </label>
  );
}
