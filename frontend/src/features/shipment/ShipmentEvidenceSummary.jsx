import { Search } from 'lucide-react';
import { ShipmentShellCard } from './ShipmentShellShared';

export default function ShipmentEvidenceSummary({ evidenceContext = [] }) {
  return (
    <ShipmentShellCard
      title="Evidence Summary"
      description="Tom tat evidence de chuan bi chuyen sang Evidence Center."
      icon={<Search />}
      actionLabel="Decision"
    >
      <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
        {evidenceContext.length > 0 ? evidenceContext.map((item) => <p key={item}>{item}</p>) : <p>Evidence context placeholder</p>}
      </div>
    </ShipmentShellCard>
  );
}
