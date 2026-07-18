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
    <div className={`min-h-[132px] rounded-xl border p-4 ${toneClass[card.tone] || toneClass.volume}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-[var(--color-text-muted)]">{card.question}</p>
          <p className="mt-2 text-sm font-bold text-[var(--color-text-main)]">{card.label}</p>
        </div>
        <Icon size={18} className="shrink-0" />
      </div>
      <p className="mt-3 text-3xl font-black leading-none text-[var(--color-text-main)]">{card.value}</p>
      <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">{card.support}</p>
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
  const unknownCount = Number(kpiData?.total_unknown || 0);

  return (
    <section className="rounded-2xl border border-[var(--color-surface-200)] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--color-surface-200)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Tổng quan điều hành</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {fromDate === toDate ? `Ngày ${toDate}` : `Từ ${fromDate} đến ${toDate}`} · {bcvhLabel}
          </p>
        </div>
        {nationalRank?.available ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Xếp hạng theo kỳ toàn quốc {nationalRank.period}
          </span>
        ) : null}
      </div>

      <div className="p-5">
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
              {unknownCount > 0 ? (
                <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-700">
                  Dữ liệu thiếu/chưa xác định được giữ riêng, không tính vào bưu gửi cần xử lý.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
