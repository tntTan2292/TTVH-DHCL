import React from 'react';

/**
 * Modern Glass Badge / Chip Component (UI-GLASS-THEME-01)
 */
export default function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
  icon: Icon = null,
  ...props
}) {
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }[size] || 'px-2.5 py-0.5 text-xs';

  const variantClasses = {
    primary: 'badge-glass-primary',
    success: 'badge-glass-success',
    warning: 'badge-glass-warning',
    danger: 'badge-glass-danger',
    neutral: 'bg-slate-100/80 text-slate-700 border-slate-200/80 backdrop-blur-xs',
    // Standard Indicator Families
    f11: 'bg-emerald-50/90 text-emerald-800 border-emerald-200 backdrop-blur-xs',
    f13: 'bg-blue-50/90 text-blue-800 border-blue-200 backdrop-blur-xs',
    f41: 'bg-orange-50/90 text-orange-800 border-orange-200 backdrop-blur-xs',
  }[variant] || 'bg-slate-100/80 text-slate-700 border-slate-200/80';

  return (
    <span
      className={`badge-glass ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}
