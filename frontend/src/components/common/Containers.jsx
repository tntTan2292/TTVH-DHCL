import React from 'react';

export const PageContainer = ({ title, children, action }) => {
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">{title}</h1>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
};

export const CardContainer = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-slate-100/90 bg-slate-50">
          <h2 className="text-base font-bold tracking-tight text-[var(--color-text-main)]">{title}</h2>
        </div>
      )}
      <div className="p-6 flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};

export const PlaceholderPage = ({ title }) => (
  <div className="flex flex-col h-full">
    <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)] mb-6">{title}</h1>
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center border border-dashed border-slate-300/80 bg-white rounded-2xl p-16 max-w-md shadow-sm">
        <div className="text-5xl mb-4 select-none">🚧</div>
        <p className="text-xl font-bold text-[var(--color-text-main)] mb-2">{title}</p>
        <p className="text-sm text-[var(--color-text-muted)] font-medium">Coming in D7.3</p>
      </div>
    </div>
  </div>
);