import React, { useRef } from 'react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { INDICATORS, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { IndicatorProvider } from '../../indicator/IndicatorContext.js';
import { formatDayMonth } from '../homePeriod.js';

/**
 * "Diễn biến hạng lũy kế tháng": Huế's national rank and rate for every month from January, on ONE row of
 * small tiles (PO 2026-10-21: compact). Rank and rate here are the national report's (the ranking basis).
 */
export default function MonthlyRankProgressionBlock({
  indicatorData,
  selectedIndicator = 'f11',
}) {
  const blockRef = useRef(null);
  const indConfig = INDICATORS[selectedIndicator] || INDICATORS.f11;
  const theme = indicatorTheme(indConfig);

  const monthlyRank = indicatorData?.monthly_rank || [];
  const until = formatDayMonth(indicatorData?.period_to || indicatorData?.data_date);

  return (
    <IndicatorProvider indicator={indConfig}>
      <section
        ref={blockRef}
        className="rounded-xl border border-slate-300 bg-white p-2.5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2">
            <span className={`h-4 w-1.5 shrink-0 rounded-full ${theme.accentBar}`} />
            <h3 className="whitespace-nowrap text-sm font-black tracking-tight text-slate-900">DIỄN BIẾN HẠNG LŨY KẾ THÁNG</h3>
            <span className={`rounded-md border px-1.5 py-0.5 text-[11px] font-bold ${theme.chip}`}>
              {indConfig.moduleLabel}
            </span>
          </div>
          <div data-no-capture="true" className="shrink-0">
            <BlockCaptureButton
              targetRef={blockRef}
              blockTitle={`Diễn biến hạng lũy kế tháng - ${indConfig.moduleLabel}`}
              dateOrPeriod={`Từ T1 đến ${until}`}
            />
          </div>
        </div>
        <div className="mt-0.5 text-[11px] font-medium text-slate-600">
          Hạng (số trong ô) và tỷ lệ theo BC toàn quốc TCT, lũy kế; tháng cuối đến {until}
        </div>

        {!monthlyRank.length ? (
          <div className="py-3 text-center text-xs font-medium text-slate-500">
            Chưa có dữ liệu xếp hạng theo tháng.
          </div>
        ) : (
          <div
            className="mt-1.5 grid gap-1"
            style={{ gridTemplateColumns: `repeat(${Math.max(monthlyRank.length, 1)}, minmax(0, 1fr))` }}
          >
            {monthlyRank.map((m) => {
              const monthLabel = m.month ? `T${Number(m.month.slice(5))}` : '—';
              const hasRank = m.rank != null;
              const isTop5 = hasRank && m.rank <= 5;
              const isTop10 = hasRank && m.rank <= 10;
              return (
                <div
                  key={m.month}
                  className={`rounded-md border px-0.5 py-1 text-center ${
                    hasRank ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-slate-50/40 opacity-60'
                  }`}
                  title={hasRank ? `${monthLabel}: hạng ${m.rank}/${m.total || 34}${m.rate != null ? ` · ${Number(m.rate).toFixed(1)}%` : ''}` : monthLabel}
                >
                  <div className="text-[10px] font-bold uppercase text-slate-600">{monthLabel}</div>
                  {hasRank ? (
                    <>
                      <div
                        className={`mx-auto mt-0.5 inline-flex min-w-[1.6rem] justify-center rounded-full border px-1 py-0 text-sm font-black tabular-nums ${
                          isTop5
                            ? 'border-amber-300 bg-amber-100 text-amber-900'
                            : isTop10
                            ? 'border-blue-200 bg-blue-100 text-blue-900'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}
                      >
                        {m.rank}
                      </div>
                      {m.rate != null && (
                        <div className="mt-0.5 text-[10px] font-extrabold tabular-nums text-slate-800">
                          {Number(m.rate).toFixed(1)}%
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-1.5 text-xs font-semibold text-slate-500">—</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </IndicatorProvider>
  );
}
