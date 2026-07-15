import { Users } from 'lucide-react';
import { ShipmentShellCard } from './ShipmentShellShared';

export default function ShipmentRecommendation({ recommendationItems = [] }) {
  return (
    <ShipmentShellCard
      title="Shipment Recommendation"
      description="Khuyen nghi dieu hanh cap shipment."
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
  );
}
