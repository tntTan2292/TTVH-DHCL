import { CalendarDays, TrendingUp } from 'lucide-react';
import { ShipmentShellCard } from './ShipmentShellShared';

export default function ShipmentTimeline({ timelineItems = [] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ShipmentShellCard
        title="Shipment Timeline"
        description="Dòng thời gian shipment theo kiến trúc freeze."
        icon={<CalendarDays />}
        actionLabel="Evidence"
      >
        <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
          {timelineItems.length > 0 ? timelineItems.map((item) => <p key={item}>{item}</p>) : <p>Timeline placeholder</p>}
        </div>
      </ShipmentShellCard>
      <ShipmentShellCard
        title="Shipment Pattern"
        description="Pattern shipment dùng cho nhận diện nhịp vận hành."
        icon={<TrendingUp />}
        actionLabel="Insight"
      >
        <div className="rounded-xl bg-[var(--color-surface-50)] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-[var(--color-text-main)]">Timeline window</span>
            <span className="text-[var(--color-text-muted)]">Shell</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[var(--color-surface-200)]">
            <div className="h-2 w-2/3 rounded-full bg-[var(--color-primary-500)]" />
          </div>
        </div>
      </ShipmentShellCard>
    </div>
  );
}
