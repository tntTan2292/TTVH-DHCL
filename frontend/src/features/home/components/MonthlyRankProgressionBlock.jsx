import React, { useRef } from 'react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { INDICATORS, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { IndicatorProvider } from '../../indicator/IndicatorContext.js';
import { formatDayMonth } from '../homePeriod.js';

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
        className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={`h-4 w-1.5 shrink-0 rounded-full ${theme.accentBar}`} />
            <h3 className="text-sm font-black tracking-tight text-slate-900">DIỄN BIẾN HẠNG LŨY KẾ THÁNG</h3>
            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${theme.chip}`}>
              {indConfig.moduleLabel}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Hạng và tỷ lệ theo báo cáo toàn quốc TCT, lũy kế từng tháng; tháng cuối đến {formatDayMonth(indicatorData?.period_to || indicatorData?.data_date)}
            </span>
          </div>
          <div data-no-capture="true" className="shrink-0">
            <BlockCaptureButton
              targetRef={blockRef}
              blockTitle={`Diễn biến hạng lũy kế tháng - ${indConfig.moduleLabel}`}
              dateOrPeriod={`Từ T1 đến ${formatDayMonth(indicatorData?.period_to || indicatorData?.data_date)}`}
            />
          </div>
        </div>

        {!monthlyRank.length ? (
          <div className="py-4 text-center text-xs font-medium text-slate-400">
            Chưa có dữ liệu xếp hạng theo tháng.
          </div>
        ) : (
          <div className="mt-2.5 grid grid-cols-5 gap-2">
            {monthlyRank.map((m) => {
              const monthLabel = m.month ? `T${Number(m.month.slice(5))}` : '—';
              const hasRank = m.rank != null;
              const isTop5 = hasRank && m.rank <= 5;
              const isTop10 = hasRank && m.rank <= 10;
              return (
                <div
                  key={m.month}
                  className={`rounded-lg border px-1.5 py-1.5 text-center ${
                    hasRank ? 'border-slate-200/80 bg-slate-50/70' : 'border-slate-100 bg-slate-50/30 opacity-60'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{monthLabel}</div>
                  {hasRank ? (
                    <>
                      <div
                        className={`mx-auto mt-0.5 inline-flex rounded-full border px-2 py-0.5 text-xs font-black tabular-nums ${
                          isTop5
                            ? 'border-amber-300 bg-amber-100 text-amber-900'
                            : isTop10
                            ? 'border-blue-200 bg-blue-100 text-blue-900'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}
                      >
                        Hạng {m.rank}
                      </div>
                      {m.rate != null && (
                        <div className="mt-0.5 text-[11px] font-extrabold tabular-nums text-slate-800">
                          {Number(m.rate).toFixed(1)}%
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-1.5 text-xs font-semibold text-slate-400">—</div>
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
