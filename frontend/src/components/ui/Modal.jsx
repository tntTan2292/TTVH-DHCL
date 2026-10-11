import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modern Glass Modal / Dialog Component (UI-GLASS-THEME-02)
 * Features frosted backdrop, tactile close button, and smooth entrance.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer = null,
  size = 'md',
  className = '',
  closeOnBackdrop = true,
  closeOnEsc = true,
}) {
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  }[size] || 'max-w-lg';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-desc' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/35 backdrop-blur-sm transition-opacity duration-200"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`relative w-full ${sizeClasses} rounded-2xl bg-white/95 border border-white/80 shadow-2xl backdrop-blur-xl transition-all duration-200 transform scale-100 ${className}`}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100/90 px-6 py-4.5">
          <div>
            {title && (
              <h3 id="modal-title" className="text-lg font-bold text-slate-900 leading-tight">
                {title}
              </h3>
            )}
            {description && (
              <p id="modal-desc" className="text-xs text-slate-500 mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-vnpost-blue)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>

        {/* Modal Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100/90 px-6 py-4 bg-slate-50/50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
