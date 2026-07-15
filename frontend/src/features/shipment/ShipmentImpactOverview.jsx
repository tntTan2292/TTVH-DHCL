import { BarChart3 } from 'lucide-react';
import { ShipmentShellCard } from './ShipmentShellShared';

export default function ShipmentImpactOverview({ impactItems = [] }) {
  return (
    <ShipmentShellCard
      title="Shipment Impact Overview"
      description="Tong quan tac dong cua shipment len route."
      icon={<BarChart3 />}
      actionLabel="Insight"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {impactItems.length > 0 ? impactItems.map((item) => (
          <div key={item.label} className="rounded-xl border border-[var(--color-surface-200)] bg-white p-4">
            <p className="text-sm font-medium text-[var(--color-text-main)]">{item.label}</p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{item.value}</p>
          </div>
        )) : (
          <div className="rounded-xl border border-[var(--color-surface-200)] bg-white p-4 text-sm text-[var(--color-text-muted)] sm:col-span-2">
            Impact overview placeholder
          </div>
        )}
      </div>
    </ShipmentShellCard>
  );
}
