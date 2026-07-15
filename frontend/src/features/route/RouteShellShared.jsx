import { ChevronRight } from 'lucide-react';
import { CardContainer } from '../../components/shared/SharedComponents';

export function RouteShellCard({ title, description, icon, actionLabel, children }) {
  return (
    <CardContainer
      title={title}
      action={
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-100)] px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
          {actionLabel || 'Shell'}
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      }
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary-50)] text-[var(--color-primary-700)]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--color-text-main)]">{description}</p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Đây là shell theo Screen Architecture đã Freeze. Dữ liệu nghiệp vụ sẽ được bổ sung ở ticket sau.
          </p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </CardContainer>
  );
}
