import { ArrowRight, Users } from 'lucide-react';
import { RouteShellCard } from './RouteShellShared';

export default function RouteRecommendation({ recommendationItems = [], drilldownLabel = 'Mở Shipment Performance Center' }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <RouteShellCard
        title="Route Recommendation"
        description="Khuyến nghị điều hành cấp tuyến."
        icon={<Users />}
        actionLabel="Action"
      >
        <div className="space-y-3">
          {recommendationItems.length > 0 ? recommendationItems.map((item) => (
            <div key={item.label} className="rounded-xl border border-[var(--color-surface-200)] bg-[var(--color-surface-50)] p-4">
              <p className="text-sm font-semibold text-[var(--color-text-main)]">{item.label}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.value}</p>
            </div>
          )) : (
            <>
              <div className="rounded-xl border border-[var(--color-surface-200)] bg-[var(--color-surface-50)] p-4">
                <p className="text-sm font-semibold text-[var(--color-text-main)]">Ưu tiên xử lý</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">Shell-safe recommendation text</p>
              </div>
              <div className="rounded-xl border border-[var(--color-surface-200)] bg-[var(--color-surface-50)] p-4">
                <p className="text-sm font-semibold text-[var(--color-text-main)]">Lý do</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">Demo rationale only</p>
              </div>
            </>
          )}
        </div>
      </RouteShellCard>
      <RouteShellCard
        title="Shipment Drill-down Area"
        description="Điểm chuyển xuống Shipment Performance Center."
        icon={<ArrowRight />}
        actionLabel="Navigation"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-sm font-semibold text-white">
            {drilldownLabel}
          </button>
          <span className="text-xs text-[var(--color-text-muted)]">Trigger shell only</span>
        </div>
      </RouteShellCard>
    </div>
  );
}
