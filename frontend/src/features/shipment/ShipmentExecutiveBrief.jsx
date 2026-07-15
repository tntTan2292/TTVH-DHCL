import { BarChart3, Target } from 'lucide-react';
import { ShipmentShellCard } from './ShipmentShellShared';

export default function ShipmentExecutiveBrief({ shipmentContext = [], routeContext = [] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ShipmentShellCard
        title="Shipment Executive Brief"
        description="Tóm tắt điều hành cấp bưu gửi."
        icon={<Target />}
        actionLabel="Evidence"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {shipmentContext.map((item) => (
            <div key={item.label} className="rounded-xl bg-[var(--color-surface-50)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{item.label}</p>
              <p className="mt-1 text-lg font-bold text-[var(--color-text-main)]">{item.value}</p>
            </div>
          ))}
        </div>
      </ShipmentShellCard>
      <ShipmentShellCard
        title="Shipment Impact Overview"
        description="Tổng quan tác động của shipment lên route."
        icon={<BarChart3 />}
        actionLabel="Insight"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {routeContext.map((item) => (
            <div key={item.label} className="rounded-xl border border-[var(--color-surface-200)] bg-white p-4">
              <p className="text-sm font-medium text-[var(--color-text-main)]">{item.label}</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{item.value}</p>
            </div>
          ))}
        </div>
      </ShipmentShellCard>
    </div>
  );
}
