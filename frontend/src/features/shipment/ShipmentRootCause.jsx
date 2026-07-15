import { ShieldAlert } from 'lucide-react';
import { ShipmentShellCard } from './ShipmentShellShared';

export default function ShipmentRootCause({ rootCauseItems = [] }) {
  return (
    <ShipmentShellCard
      title="Shipment Root Cause Summary"
      description="Tom tat nguyen nhan o muc buu gui."
      icon={<ShieldAlert />}
      actionLabel="Insight"
    >
      <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
        {rootCauseItems.length > 0 ? rootCauseItems.map((item) => <p key={item}>{item}</p>) : <p>Root cause placeholder</p>}
      </div>
    </ShipmentShellCard>
  );
}
