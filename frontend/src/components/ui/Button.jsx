import React from 'react';
import { LoaderCircle } from 'lucide-react';

/**
 * Modern Glass Button Component (UI-GLASS-THEME-01)
 * Features tactile hover, press, focus-visible, loading and disabled states.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon = null,
  iconPosition = 'left',
  type = 'button',
  onClick,
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-200 select-none cursor-pointer outline-none active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--color-vnpost-blue)]/30 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100';

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs rounded-md gap-1',
    sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5',
  }[size] || 'px-4 py-2 text-sm rounded-xl gap-2';

  const variantClasses = {
    primary: 'btn-glass-primary',
    secondary: 'btn-glass-secondary',
    ghost: 'btn-glass-ghost',
    danger: 'btn-glass-danger',
    outline: 'bg-white/60 hover:bg-white/90 text-slate-700 hover:text-[var(--color-vnpost-blue)] border border-slate-300/80 hover:border-[var(--color-vnpost-blue)]/50 shadow-xs backdrop-blur-md',
    glass: 'bg-white/70 hover:bg-white/90 text-slate-800 hover:text-[var(--color-vnpost-blue)] border border-white/80 hover:border-white shadow-sm hover:shadow-md backdrop-blur-xl',
  }[variant] || 'btn-glass-primary';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin text-current shrink-0" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="h-4 w-4 shrink-0" />
      ) : null}
      
      <span>{children}</span>

      {!loading && Icon && iconPosition === 'right' ? (
        <Icon className="h-4 w-4 shrink-0" />
      ) : null}
    </button>
  );
}
