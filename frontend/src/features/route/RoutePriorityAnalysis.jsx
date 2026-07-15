import { Search, ShieldAlert, TrendingUp } from 'lucide-react';
import { StatusBadge } from '../../components/shared/SharedComponents';
import { RouteShellCard } from './RouteShellShared';

export default function RoutePriorityAnalysis() {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <RouteShellCard
        title="Route Priority Analysis"
        description="Sắp xếp ưu tiên tuyến cần xử lý trước."
        icon={<TrendingUp />}
        actionLabel="Decision"
      >
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="High Priority" tone="warning" />
          <StatusBadge label="Shell-safe" tone="neutral" />
          <StatusBadge label="No KPI calc" tone="info" />
        </div>
      </RouteShellCard>
      <RouteShellCard
        title="Route Priority List"
        description="Danh sách tuyến ưu tiên ở mức placeholder."
        icon={<Search />}
        actionLabel="Insight"
      >
        <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
          <p>1. Tuyến Phường Phú Hội</p>
          <p>2. Tuyến Phường Vĩnh Ninh</p>
          <p>3. Tuyến Phường Thuận Hòa</p>
        </div>
      </RouteShellCard>
      <RouteShellCard
        title="Route Severity Snapshot"
        description="Snapshot mức độ nghiêm trọng ở cấp tuyến."
        icon={<ShieldAlert />}
        actionLabel="Decision"
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-red-50 p-3 text-center text-sm font-semibold text-red-700">High</div>
          <div className="rounded-lg bg-amber-50 p-3 text-center text-sm font-semibold text-amber-700">Medium</div>
          <div className="rounded-lg bg-green-50 p-3 text-center text-sm font-semibold text-green-700">Low</div>
          <div className="rounded-lg bg-[var(--color-surface-50)] p-3 text-center text-sm font-semibold text-[var(--color-text-muted)]">N/A</div>
        </div>
      </RouteShellCard>
    </div>
  );
}
