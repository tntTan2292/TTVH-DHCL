import { CalendarDays } from 'lucide-react';
import { ShipmentShellCard } from './ShipmentShellShared';

export default function ShipmentTimeline({ timelineItems = [] }) {
  return (
    <ShipmentShellCard
      title="Shipment Timeline"
      description="Dong thoi gian shipment theo kien truc freeze."
      icon={<CalendarDays />}
      actionLabel="Evidence"
    >
      <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
        {timelineItems.length > 0 ? timelineItems.map((item) => <p key={item}>{item}</p>) : <p>Timeline placeholder</p>}
      </div>
    </ShipmentShellCard>
  );
}
