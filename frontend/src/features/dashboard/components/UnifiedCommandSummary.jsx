import { AlertTriangle, Award, Package, Target } from 'lucide-react';
import { buildExecutiveInsight, buildUnifiedCommandCards } from './dashboardKpiCards';

const toneClass = {
  success: 'border-green-100 bg-green-50/70 text-green-800',
  comparison: 'border-slate-200 bg-slate-50 text-slate-800',
  volume: 'border-blue-100 bg-blue-50/70 text-blue-800',
  danger: 'border-red-100 bg-red-50/70 text-red-800',
};

const iconByKey = {
  'pass-rate': Target,
  'national-rank': Award,
  volume: Package,
  'action-volume': AlertTriangle,
};

function CommandCard({ card }) {
  const Icon = iconByKey[card.key] || Target;

  return (
    <div className={`rounded-xl border p-3 shadow-sm ${toneClass[card.tone] || toneClass.volume}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">{card.question}</p>
          <p className="mt-1 text-xs font-bold text-[var(--color-text-main)]">{card.label}</p>
        </div>
        <Icon size={16} className="shrink-0" />
      </div>
      <p className="mt-2 text-2xl font-black leading-none text-[var(--color-text-main)]">{card.value}</p>
      <p className="mt-1.5 text-[11px] leading-snug text-[var(--color-text-muted)]">{card.support}</p>
    </div>
  );
}

export default function UnifiedCommandSummary({
  kpiData,
  loading,
  error,
  fromDate,
  toDate,
  bcvhLabel,
}) {
  const summaryContext = { fromDate, toDate, bcvhLabel };
  const cards = buildUnifiedCommandCards(kpiData || {}, summaryContext);
  const insight = buildExecutiveInsight(kpiData || {}, summaryContext);
  const nationalRank = kpiData?.national_rank;
  const returnedCount = Number(kpiData?.total_returned ?? kpiData?.total_unknown ?? 0);

  return (
    <section className="rounded-2xl border border-[var(--color-surface-200)] bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[var(--color-surface-200)] bg-[var(--color-surface-50)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text-main)]">Tổng quan điều hành</h2>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {fromDate === toDate ? `Ngày ${toDate}` : `Từ ${fromDate} đến ${toDate}`} · {bcvhLabel}
          </p>
        </div>
        {nationalRank?.available ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Xếp hạng theo kỳ toàn quốc {nationalRank.period}
          </span>
        ) : null}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="rounded-xl border border-dashed border-[var(--color-surface-200)] px-4 py-8 text-center text-sm font-medium text-[var(--color-text-muted)]">
            Đang tải tổng quan điều hành...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-800">
            Không thể tải tổng quan điều hành: {error}
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <CommandCard key={card.key} card={card} />
              ))}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <p className="rounded-xl bg-[var(--color-surface-50)] px-4 py-3 text-sm font-medium leading-6 text-[var(--color-text-main)]">
                {insight}
              </p>
              {returnedCount > 0 ? (
                <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-700">
                  Chuyển hoàn được giữ riêng trong mẫu đo kiểm, không tính vào bưu gửi cần xử lý.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
