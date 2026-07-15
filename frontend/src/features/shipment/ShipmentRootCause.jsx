import { ShieldAlert, Search } from 'lucide-react';
import { ShipmentShellCard } from './ShipmentShellShared';

export default function ShipmentRootCause({ evidenceContext = [], rootCauseItems = [] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ShipmentShellCard
        title="Shipment Root Cause"
        description="Nguyên nhân shipment ở mức shell."
        icon={<ShieldAlert />}
        actionLabel="Evidence"
      >
        <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
          {rootCauseItems.length > 0 ? rootCauseItems.map((item) => <p key={item}>{item}</p>) : <p>Root cause placeholder</p>}
        </div>
      </ShipmentShellCard>
      <ShipmentShellCard
        title="Evidence Summary"
        description="Tóm tắt evidence để chuẩn bị chuyển sang Evidence Center."
        icon={<Search />}
        actionLabel="Decision"
      >
        <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
          {evidenceContext.length > 0 ? evidenceContext.map((item) => <p key={item}>{item}</p>) : <p>Evidence context placeholder</p>}
        </div>
      </ShipmentShellCard>
    </div>
  );
}
