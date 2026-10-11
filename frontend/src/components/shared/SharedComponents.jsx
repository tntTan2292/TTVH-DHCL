import React from 'react';

const baseCard = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-[box-shadow,transform,border-color] duration-200';

// `accentClassName` (a background class) draws a thin bar across the top and `badge` is shown next to the title:
// the report pages use them to show their family colour (F1.3 blue, F4.1 orange, F1.1 green) at a glance.
export function PageContainer({ title, subtitle, action, children, className = '', accentClassName = '', badge = null }) {
  return (
    <div className={`flex h-full flex-col gap-6 p-6 md:p-8 ${className}`}>
      {accentClassName ? <div aria-hidden="true" className={`-mb-3 h-1.5 w-full rounded-full shadow-2xs ${accentClassName}`} /> : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight text-[var(--color-text-main)]">
            <span>{title}</span>
            {badge}
          </h1>
          {subtitle ? <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p> : null}
        </div>
        {action ? <div className="flex items-center gap-2">{action}</div> : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div>
        <h2 className="text-lg font-bold tracking-tight text-[var(--color-text-main)]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardContainer({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`${baseCard} flex flex-col ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100/90 px-6 py-4">
          <div>
            {title ? <h3 className="text-base font-bold text-[var(--color-text-main)]">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}

export function KPICard({
  label,
  value,
  delta,
  trend,
  helpText,
  tone = 'primary',
  className = '',
}) {
  const toneClass = {
    primary: 'from-blue-50/80 via-white to-white border-blue-100/80 hover:border-blue-200',
    success: 'from-emerald-50/80 via-white to-white border-emerald-100/80 hover:border-emerald-200',
    warning: 'from-amber-50/80 via-white to-white border-amber-100/80 hover:border-amber-200',
    danger: 'from-rose-50/80 via-white to-white border-rose-100/80 hover:border-rose-200',
  }[tone] || 'from-blue-50/80 via-white to-white border-blue-100/80 hover:border-blue-200';

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${toneClass} p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-[box-shadow,transform,border-color] duration-200 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-main)]">{value}</p>
        </div>
        {trend ? (
          <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--color-text-main)] shadow-2xs border border-slate-100/80">
            {trend}
          </div>
        ) : null}
      </div>
      {delta ? <p className="mt-3 text-sm font-medium text-[var(--color-text-muted)]">{delta}</p> : null}
      {helpText ? <p className="mt-1 text-xs text-[var(--color-text-muted)]">{helpText}</p> : null}
    </div>
  );
}

export function ExecutiveSummaryCard({ title, headline, items = [], className = '' }) {
  return (
    <CardContainer title={title} className={className}>
      <div className="space-y-4">
        {headline ? <p className="text-sm font-semibold text-[var(--color-text-main)]">{headline}</p> : null}
        {items.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-50 border border-slate-100/80 p-4 transition-colors hover:bg-slate-100/70">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {item.label}
                </p>
                <p className="mt-2 text-lg font-bold text-[var(--color-text-main)]">{item.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </CardContainer>
  );
}

export function RecommendationCard({ title, recommendation, rationale, priority = 'Medium', className = '' }) {
  return (
    <CardContainer
      title={title}
      action={<span className="rounded-full bg-slate-100/80 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200/60">{priority}</span>}
      className={className}
    >
      <div className="space-y-3">
        <p className="text-sm font-medium text-[var(--color-text-main)]">{recommendation}</p>
        {rationale ? <p className="text-sm text-[var(--color-text-muted)]">{rationale}</p> : null}
      </div>
    </CardContainer>
  );
}

const badgeStyles = {
  neutral: 'bg-slate-100/80 text-[var(--color-text-main)] border-slate-200/80',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
  info: 'bg-blue-50 text-blue-700 border-blue-200/80',
};

export function StatusBadge({ label, tone = 'neutral', className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${badgeStyles[tone] || badgeStyles.neutral} ${className}`}>
      {label}
    </span>
  );
}

export function SeverityBadge({ label, severity = 'Medium', className = '' }) {
  const tone =
    severity === 'Critical' || severity === 'High'
      ? 'danger'
      : severity === 'Medium'
        ? 'warning'
        : 'info';
  return <StatusBadge label={label || severity} tone={tone} className={className} />;
}

export function StandardTable({ columns = [], rows = [], emptyMessage = 'Không có dữ liệu', className = '' }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}>
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key || column.label}
                className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] ${column.className || ''}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="hover:bg-blue-50/40 transition-colors">
                {columns.map((column) => (
                  <td key={column.key || column.label} className={`px-4 py-3 text-sm text-[var(--color-text-main)] ${column.cellClassName || ''}`}>
                    {column.render ? column.render(row, rowIndex) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length || 1} className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ title = 'Không có dữ liệu', description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-white px-6 py-12 text-center shadow-2xs ${className}`}>
      <div className="text-4xl select-none opacity-40">◻</div>
      <p className="mt-3 text-base font-bold text-[var(--color-text-main)]">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm text-[var(--color-text-muted)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = 'Đang tải dữ liệu...', className = '' }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-6 py-10 shadow-2xs ${className}`}>
      <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary-100)] border-t-[var(--color-primary-600)]" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </div>
  );
}

export function ErrorState({ title = 'Đã xảy ra lỗi', description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-red-200/80 bg-white px-6 py-10 text-center shadow-2xs ${className}`}>
      <p className="text-base font-bold text-red-600">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm text-[var(--color-text-muted)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
