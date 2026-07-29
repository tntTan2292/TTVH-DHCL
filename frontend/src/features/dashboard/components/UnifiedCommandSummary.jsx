import { AlertTriangle, Award, Package, Target } from 'lucide-react';
import { buildExecutiveInsight, buildUnifiedCommandCards } from './dashboardKpiCards';

const toneClass = {
  success: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/30 text-emerald-950 hover:border-emerald-300 shadow-xs hover:shadow-md',
  comparison: 'border-slate-200/90 bg-gradient-to-br from-slate-50/90 via-white to-slate-50/30 text-slate-950 hover:border-slate-300 shadow-xs hover:shadow-md',
  volume: 'border-blue-200/90 bg-gradient-to-br from-blue-50/90 via-white to-blue-50/30 text-blue-950 hover:border-blue-300 shadow-xs hover:shadow-md',
  danger: 'border-red-200/90 bg-gradient-to-br from-red-50/90 via-white to-red-50/30 text-red-950 hover:border-red-300 shadow-xs hover:shadow-md',
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
    <div className={`rounded-xl border p-3.5 transition-all duration-150 motion-reduce:transition-none ${toneClass[card.tone] || toneClass.volume}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="inline-block rounded-md bg-white/80 border border-current/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] shadow-2xs">
            {card.question}
          </span>
          <p className="mt-1.5 text-xs font-bold text-[var(--color-text-main)]">{card.label}</p>
        </div>
        <Icon size={18} className="shrink-0 opacity-80" />
      </div>
      <p className="mt-2 text-2xl xl:text-3xl font-black leading-none tracking-tight tabular-nums text-[var(--color-text-main)]">{card.value}</p>
      <p className="mt-2 text-[11px] font-medium leading-snug text-[var(--color-text-muted)]">{card.support}</p>
    </div>
  );
}

function CommandSummarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs animate-pulse opacity-70 motion-reduce:animate-none">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5">
                <div className="h-4 w-16 rounded-md bg-slate-200"></div>
                <div className="h-3.5 w-24 rounded bg-slate-200"></div>
              </div>
              <div className="h-5 w-5 rounded-full bg-slate-200"></div>
            </div>
            <div className="mt-3 h-8 w-20 rounded bg-slate-200"></div>
            <div className="mt-2 h-3 w-32 rounded bg-slate-200"></div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 animate-pulse opacity-70 motion-reduce:animate-none">
        <div className="h-4 w-40 rounded bg-slate-200 mb-2"></div>
        <div className="h-4 w-full rounded bg-slate-200"></div>
      </div>
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
  const nationalRankPeriod = nationalRank?.period_start && nationalRank?.period_end && nationalRank.period_start !== nationalRank.period_end
    ? `${nationalRank.period_start} đến ${nationalRank.period_end}`
    : nationalRank?.period_end || nationalRank?.period;
  const returnedCount = Number(kpiData?.total_returned ?? kpiData?.total_unknown ?? 0);

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all duration-150 motion-reduce:transition-none">
      <div className="flex flex-col gap-2 border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Tổng quan điều hành</h2>
          <p className="mt-0.5 text-xs text-slate-500 font-medium">
            {fromDate === toDate ? `Ngày ${toDate}` : `Từ ${fromDate} đến ${toDate}`} · {bcvhLabel}
          </p>
        </div>
        {nationalRank?.available ? (
          <span className="rounded-full bg-slate-100 border border-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
            Xếp hạng theo kỳ toàn quốc {nationalRankPeriod}
          </span>
        ) : null}
      </div>

      <div className="p-4">
        {loading ? (
          <CommandSummarySkeleton />
        ) : error ? (
          <div className="rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-4 text-sm font-medium text-red-800 shadow-2xs">
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
              <div className="rounded-xl border border-blue-200/90 bg-gradient-to-r from-blue-50/90 via-indigo-50/30 to-blue-50/50 p-4 shadow-2xs text-slate-900 transition-all duration-150 motion-reduce:transition-none">
                <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#003E7E]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#003E7E] text-white">
                    <Target size={12} />
                  </span>
                  Bản tin chỉ đạo điều hành
                </div>
                <p className="text-xs font-semibold leading-relaxed text-slate-900 md:text-sm">
                  {insight}
                </p>
              </div>
              {returnedCount > 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs leading-5 font-medium text-slate-700">
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
