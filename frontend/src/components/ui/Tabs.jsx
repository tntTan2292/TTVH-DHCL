import React, { useId } from 'react';

/**
 * Modern Glass Tabs Component (UI-GLASS-THEME-02)
 * Provides tactile pill or underline tabs with glass aesthetics.
 */
export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  variant = 'pill',
  size = 'md',
  className = '',
  ariaLabel = 'Danh sách tab',
  idPrefix,
}) {
  const generatedId = useId();
  const baseId = idPrefix || generatedId;

  // Arrow keys / Home / End move between enabled tabs (WAI-ARIA tabs pattern).
  const handleKeyDown = (e) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const enabled = tabs.filter((t) => !t.disabled);
    if (enabled.length === 0) return;
    const currentIndex = enabled.findIndex((t) => (t.id ?? t.value) === activeTab);
    let nextIndex = currentIndex < 0 ? 0 : currentIndex;
    if (e.key === 'ArrowRight') nextIndex = (nextIndex + 1) % enabled.length;
    if (e.key === 'ArrowLeft') nextIndex = (nextIndex - 1 + enabled.length) % enabled.length;
    if (e.key === 'Home') nextIndex = 0;
    if (e.key === 'End') nextIndex = enabled.length - 1;
    e.preventDefault();
    const nextId = enabled[nextIndex].id ?? enabled[nextIndex].value;
    onChange?.(nextId);
    const buttons = Array.from(e.currentTarget.querySelectorAll('[role="tab"]'));
    buttons.find((b) => b.dataset.tabId === String(nextId))?.focus();
  };
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  }[size] || 'text-sm px-4 py-2 gap-2';

  if (variant === 'underline') {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        className={`flex items-center gap-2 border-b border-slate-200/80 ${className}`}
      >
        {tabs.map((tab) => {
          const tabId = tab.id ?? tab.value;
          const isActive = activeTab === tabId;
          const Icon = tab.icon;

          return (
            <button
              key={tabId}
              role="tab"
              type="button"
              id={`${baseId}-tab-${tabId}`}
              data-tab-id={tabId}
              tabIndex={isActive ? 0 : -1}
              aria-selected={isActive}
              aria-controls={`${baseId}-tabpanel-${tabId}`}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange?.(tabId)}
              className={`relative inline-flex items-center font-semibold transition-colors duration-200 select-none cursor-pointer outline-none pb-3 pt-2 px-3 border-b-2 -mb-px disabled:opacity-40 disabled:cursor-not-allowed ${
                isActive
                  ? 'border-[var(--color-vnpost-blue)] text-[var(--color-vnpost-blue)] font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              } ${sizeClasses}`}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              <span>{tab.label ?? tab.title}</span>
              {tab.badge != null && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-xs rounded-full font-bold ${
                    isActive
                      ? 'bg-blue-100 text-[var(--color-vnpost-blue)]'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default 'pill' variant with frosted container
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100/70 border border-slate-200/60 shadow-2xs ${className}`}
    >
      {tabs.map((tab) => {
        const tabId = tab.id ?? tab.value;
        const isActive = activeTab === tabId;
        const Icon = tab.icon;

        return (
          <button
            key={tabId}
            role="tab"
            type="button"
            id={`${baseId}-tab-${tabId}`}
              data-tab-id={tabId}
              tabIndex={isActive ? 0 : -1}
            aria-selected={isActive}
            aria-controls={`${baseId}-tabpanel-${tabId}`}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange?.(tabId)}
            className={`relative inline-flex items-center rounded-lg font-semibold transition-colors duration-200 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-vnpost-blue)]/40 disabled:opacity-40 disabled:cursor-not-allowed ${
              isActive
                ? 'bg-white text-[var(--color-vnpost-blue)] shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            } ${sizeClasses}`}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <span>{tab.label ?? tab.title}</span>
            {tab.badge != null && (
              <span
                className={`ml-1 px-1.5 py-0.2 text-[11px] rounded-full font-bold ${
                  isActive
                    ? 'bg-blue-50 text-[var(--color-vnpost-blue)] border border-blue-200/60'
                    : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
