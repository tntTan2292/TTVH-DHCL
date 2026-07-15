import { Search, ShieldAlert, TrendingUp } from 'lucide-react';
import { StatusBadge } from '../../components/shared/SharedComponents';
import { RouteShellCard } from './RouteShellShared';

export default function RoutePriorityAnalysis({ priorityItems = [], severityItems = [] }) {
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
          {priorityItems.length > 0 ? priorityItems.map((item, index) => (
            <p key={item.label}>{index + 1}. {item.label} - {item.value}</p>
          )) : (
            <>
              <p>1. Tuyến Phường Phú Hội</p>
              <p>2. Tuyến Phường Vĩnh Ninh</p>
              <p>3. Tuyến Phường Thuận Hòa</p>
            </>
          )}
        </div>
      </RouteShellCard>
      <RouteShellCard
        title="Route Severity Snapshot"
        description="Snapshot mức độ nghiêm trọng ở cấp tuyến."
        icon={<ShieldAlert />}
        actionLabel="Decision"
      >
        <div className="grid grid-cols-2 gap-2">
          {(severityItems.length > 0 ? severityItems : [
            { label: 'High', tone: 'red' },
            { label: 'Medium', tone: 'amber' },
            { label: 'Low', tone: 'green' },
            { label: 'N/A', tone: 'neutral' },
          ]).map((item) => (
            <div
              key={item.label}
              className={`rounded-lg p-3 text-center text-sm font-semibold ${
                item.tone === 'red'
                  ? 'bg-red-50 text-red-700'
                  : item.tone === 'amber'
                    ? 'bg-amber-50 text-amber-700'
                    : item.tone === 'green'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-[var(--color-surface-50)] text-[var(--color-text-muted)]'
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>
      </RouteShellCard>
    </div>
  );
}
