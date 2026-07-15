import { Target } from 'lucide-react';
import { ShipmentShellCard } from './ShipmentShellShared';

export default function ShipmentExecutiveBrief({ shipmentContext = [] }) {
  return (
    <ShipmentShellCard
      title="Shipment Executive Brief"
      description="Tom tat dieu hanh cap buu gui."
      icon={<Target />}
      actionLabel="Evidence"
    >
      <div className="grid gap-3 md:grid-cols-3">
        {shipmentContext.length > 0 ? shipmentContext.map((item) => (
          <div key={item.label} className="rounded-xl bg-[var(--color-surface-50)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{item.label}</p>
            <p className="mt-1 text-lg font-bold text-[var(--color-text-main)]">{item.value}</p>
          </div>
        )) : (
          <div className="rounded-xl bg-[var(--color-surface-50)] p-4 text-sm text-[var(--color-text-muted)] md:col-span-3">
            Shipment brief placeholder
          </div>
        )}
      </div>
    </ShipmentShellCard>
  );
}
