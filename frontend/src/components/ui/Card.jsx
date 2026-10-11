import React from 'react';

/**
 * Modern Glass Card Component (UI-GLASS-THEME-01)
 * Supports glass, glass-card, and solid opaque variants.
 */
export default function Card({
  children,
  variant = 'glass',
  hover = false,
  className = '',
  title,
  subtitle,
  icon: Icon = null,
  actions = null,
  headerClassName = '',
  bodyClassName = '',
  footer = null,
  footerClassName = '',
  ...props
}) {
  const variantClasses = {
    glass: 'glass-panel',
    card: `glass-card ${hover ? 'glass-card-hover' : ''}`,
    solid: 'glass-solid rounded-2xl',
    subtle: 'glass-subtle rounded-xl',
  }[variant] || 'glass-panel';

  const hasHeader = title || subtitle || Icon || actions;

  return (
    <div className={`${variantClasses} ${className}`} {...props}>
      {hasHeader && (
        <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100/80 px-6 py-4 ${headerClassName}`}>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="rounded-xl bg-blue-50/80 p-2 text-[var(--color-vnpost-blue)] border border-blue-100/60 backdrop-blur-xs">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              {title && <h3 className="text-base font-bold text-slate-900 leading-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className={`p-6 ${bodyClassName}`}>
        {children}
      </div>

      {footer && (
        <div className={`border-t border-slate-100/80 px-6 py-3.5 bg-slate-50/40 rounded-b-2xl ${footerClassName}`}>
          {footer}
        </div>
      )}
    </div>
  );
}
