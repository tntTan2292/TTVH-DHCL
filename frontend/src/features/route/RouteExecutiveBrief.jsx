import { BarChart3, Target } from 'lucide-react';
import { RouteShellCard } from './RouteShellShared';

export default function RouteExecutiveBrief({ fromDate, toDate, bcvhName, intervalLabel }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <RouteShellCard
        title="Route Executive Brief"
        description="Tóm tắt điều hành cấp tuyến, giữ đúng vị trí đầu tiên của Route Performance Center."
        icon={<Target />}
        actionLabel="Evidence"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-[var(--color-surface-50)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Ngày lọc</p>
            <p className="mt-1 text-lg font-bold text-[var(--color-text-main)]">{fromDate}</p>
          </div>
          <div className="rounded-xl bg-[var(--color-surface-50)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Đến ngày</p>
            <p className="mt-1 text-lg font-bold text-[var(--color-text-main)]">{toDate}</p>
          </div>
          <div className="rounded-xl bg-[var(--color-surface-50)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Context</p>
            <p className="mt-1 text-lg font-bold text-[var(--color-text-main)]">{bcvhName || 'BCVH context'}</p>
          </div>
        </div>
      </RouteShellCard>

      <RouteShellCard
        title="Route Impact Overview"
        description="Khối tổng quan tác động tuyến, chỉ giữ cấu trúc hiển thị."
        icon={<BarChart3 />}
        actionLabel="Insight"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--color-surface-200)] bg-white p-4">
            <p className="text-sm font-medium text-[var(--color-text-main)]">Tác động tuyến</p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">Shell-safe value</p>
          </div>
          <div className="rounded-xl border border-[var(--color-surface-200)] bg-white p-4">
            <p className="text-sm font-medium text-[var(--color-text-main)]">Chế độ</p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{intervalLabel}</p>
          </div>
        </div>
      </RouteShellCard>
    </div>
  );
}
