import { BarChart3, Target } from 'lucide-react';
import { RouteShellCard } from './RouteShellShared';

export default function RouteExecutiveBrief({
  fromDate,
  toDate,
  bcvhName,
  executiveContext = [],
  impactItems = [],
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <RouteShellCard
        title="Route Executive Brief"
        description="Tóm tắt điều hành cấp tuyến, giữ đúng vị trí đầu tiên của Route Performance Center."
        icon={<Target />}
        actionLabel="Evidence"
      >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-[var(--color-surface-50)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Ngày lọc</p>
              <p className="mt-1 text-lg font-bold text-[var(--color-text-main)]">{fromDate}</p>
            </div>
            <div className="rounded-xl bg-[var(--color-surface-50)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Đến ngày</p>
              <p className="mt-1 text-lg font-bold text-[var(--color-text-main)]">{toDate}</p>
            </div>
            <div className="rounded-xl bg-[var(--color-surface-50)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Context</p>
              <p className="mt-1 text-lg font-bold text-[var(--color-text-main)]">{bcvhName || 'BCVH context'}</p>
            </div>
          </div>
          {executiveContext.length > 0 ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {executiveContext.map((item) => (
                <div key={item.label} className="rounded-xl border border-[var(--color-surface-200)] bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{item.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </RouteShellCard>

      <RouteShellCard
        title="Route Impact Overview"
        description="Khối tổng quan tác động tuyến, chỉ giữ cấu trúc hiển thị."
        icon={<BarChart3 />}
        actionLabel="Insight"
      >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-surface-200)] bg-white p-4">
              <p className="text-sm font-medium text-[var(--color-text-main)]">Tác động tuyến</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">Shell-safe value</p>
            </div>
            <div className="rounded-xl border border-[var(--color-surface-200)] bg-white p-4">
              <p className="text-sm font-medium text-[var(--color-text-main)]">Chế độ</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{impactItems[0]?.value || 'Daily'}</p>
            </div>
          </div>
          {impactItems.length > 0 ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {impactItems.map((item) => (
                <div key={item.label} className="rounded-xl bg-[var(--color-surface-50)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{item.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </RouteShellCard>
      </div>
  );
}
