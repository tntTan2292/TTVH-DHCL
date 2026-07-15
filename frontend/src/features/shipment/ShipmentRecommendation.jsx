import { ArrowRight, Users } from 'lucide-react';
import { ShipmentShellCard } from './ShipmentShellShared';

export default function ShipmentRecommendation({ recommendationItems = [], drilldownLabel = 'Mở Evidence Center' }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ShipmentShellCard
        title="Shipment Recommendation"
        description="Khuyến nghị điều hành cấp shipment."
        icon={<Users />}
        actionLabel="Action"
      >
        <div className="space-y-3">
          {recommendationItems.length > 0 ? recommendationItems.map((item) => (
            <div key={item.label} className="rounded-xl border border-[var(--color-surface-200)] bg-[var(--color-surface-50)] p-4">
              <p className="text-sm font-semibold text-[var(--color-text-main)]">{item.label}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.value}</p>
            </div>
          )) : <div className="rounded-xl bg-[var(--color-surface-50)] p-4 text-sm text-[var(--color-text-muted)]">Recommendation placeholder</div>}
        </div>
      </ShipmentShellCard>
      <ShipmentShellCard
        title="Evidence Drilldown"
        description="Điểm chuyển sang Evidence Center."
        icon={<ArrowRight />}
        actionLabel="Navigation"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-sm font-semibold text-white">
            {drilldownLabel}
          </button>
          <span className="text-xs text-[var(--color-text-muted)]">Trigger shell only</span>
        </div>
      </ShipmentShellCard>
    </div>
  );
}
