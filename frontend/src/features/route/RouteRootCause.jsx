import { ShieldAlert, TrendingUp } from 'lucide-react';
import { RouteShellCard } from './RouteShellShared';

export default function RouteRootCause() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <RouteShellCard
        title="Route Root Cause"
        description="Khối truy vết nguyên nhân gốc ở cấp tuyến."
        icon={<ShieldAlert />}
        actionLabel="Evidence"
      >
        <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
          <p>• Route root cause placeholder</p>
          <p>• Evidence-linked card</p>
          <p>• No backend dependency</p>
        </div>
      </RouteShellCard>
      <RouteShellCard
        title="Route Trend & Pattern"
        description="Khối xu hướng và pattern ở cấp tuyến."
        icon={<TrendingUp />}
        actionLabel="Insight"
      >
        <div className="rounded-xl bg-[var(--color-surface-50)] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-[var(--color-text-main)]">7-day route pattern</span>
            <span className="text-[var(--color-text-muted)]">Shell</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[var(--color-surface-200)]">
            <div className="h-2 w-2/3 rounded-full bg-[var(--color-primary-500)]" />
          </div>
        </div>
      </RouteShellCard>
    </div>
  );
}
