import React, { useRef } from 'react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { INDICATORS, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { IndicatorProvider } from '../../indicator/IndicatorContext.js';

export default function MonthlyRankProgressionBlock({
  indicatorData,
  selectedIndicator = 'f11',
}) {
  const blockRef = useRef(null);
  const indConfig = INDICATORS[selectedIndicator] || INDICATORS.f11;
  const theme = indicatorTheme(indConfig);

  const monthlyRank = indicatorData?.monthly_rank || [];

  return (
    <IndicatorProvider indicator={indConfig}>
      <section
        ref={blockRef}
        className="rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-150 p-5 space-y-4"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-1.5 rounded-full ${theme.accentBar}`} />
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                DIỄN BIẾN VỊ THỨ TOÀN QUỐC THEO THÁNG (TỪ T1 ĐẾN NAY)
              </h3>
              <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${theme.chip}`}>
                {indConfig.moduleLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Vị trí xếp hạng của BĐTP Huế theo từng tháng trong năm 2026.
            </p>
          </div>

          <div data-no-capture="true" className="flex items-center gap-2">
            <BlockCaptureButton
              targetRef={blockRef}
              blockTitle={`Diễn biến vị thứ theo tháng - ${indConfig.moduleLabel}`}
              dateOrPeriod="Từ T1 đến nay"
            />
          </div>
        </div>

        {/* Month by month grid */}
        {!monthlyRank.length ? (
          <div className="py-6 text-center text-xs text-slate-400 font-medium">
            Chưa có dữ liệu xếp hạng theo tháng.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2.5">
            {monthlyRank.map((m) => {
              const monthLabel = m.month ? `T${Number(m.month.slice(5))}` : '—';
              const hasRank = m.rank != null;
              const isTop10 = hasRank && m.rank <= 10;
              const isTop5 = hasRank && m.rank <= 5;

              return (
                <div
                  key={m.month}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    hasRank
                      ? 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:shadow-xs'
                      : 'bg-slate-50/30 border-slate-100 opacity-60'
                  }`}
                >
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {monthLabel}
                  </div>

                  <div className="mt-2 flex flex-col items-center justify-center">
                    {hasRank ? (
                      <>
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-sm font-black tabular-nums ${
                            isTop5
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isTop10
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          Hạng {m.rank}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">/{m.total || 34}</span>
                        {m.rate != null && (
                          <div className="mt-1 text-[11px] font-extrabold text-slate-800 tabular-nums">
                            {Number(m.rate).toFixed(1)}%
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 py-2">
                        —
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </IndicatorProvider>
  );
}
