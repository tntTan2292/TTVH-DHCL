import React from 'react';

export const PageContainer = ({ title, children, action }) => {
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{title}</h1>
        {action && <div>{action}</div>}
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
};

export const CardContainer = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg border border-[var(--color-surface-200)] shadow-sm overflow-hidden flex flex-col ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-[var(--color-surface-200)] bg-[var(--color-surface-50)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">{title}</h2>
        </div>
      )}
      <div className="p-6 flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};
