import React, { useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus,
  Award,
  Calendar,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { LineChart, Line, YAxis, ReferenceLine, ResponsiveContainer } from 'recharts';
import { INDICATORS, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { IndicatorProvider } from '../../indicator/IndicatorContext.js';
import { computeTrendYDomain, formatGap, INDICATOR_FULL_NAMES } from '../homeTableSort.js';
import { periodShortTitle, periodTitle, previousBasisLabel, sparkCaption } from '../homePeriod.js';

const SPARK_DAYS = 30;

/**
 * Executive card of one indicator (F1.1, F1.2, F1.3, F4.1, F4.2), built for a TV screen:
 * the two numbers leaders read first (rate and national rank) side by side, the gap to the
 * indicator's own target, the change against the previous day, and its own 30-day line with
 * its own target line (never shared with another indicator).
 * A missing figure is "—", never a fake 0 / "Giữ hạng".
 */
export default function ExecutiveIndicatorCard({ data, isSelected, onSelect }) {
  const cardRef = useRef(null);
  const indConfig = INDICATORS[data?.id] || INDICATORS.f13;
  const theme = indicatorTheme(indConfig);
  const targetRate = data?.target_rate ?? indConfig.targetRate;
  const fullName = INDICATOR_FULL_NAMES[data?.id] || '';

  const frame = `@container group relative rounded-xl border p-2.5 sm:p-3 transition-all duration-200 cursor-pointer ${
    isSelected
      ? `border-slate-900 bg-white shadow-lg ring-2 ${theme.ring}`
      : 'border-slate-200/90 bg-white shadow-xs hover:shadow-md hover:border-slate-300'
  }`;

  if (!data?.available) {
    return (
      <IndicatorProvider indicator={indConfig}>
        <div ref={cardRef} onClick={onSelect} className={frame}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <span className={`h-4 w-1.5 rounded-full ${theme.accentBar}`} />
              <h3 className="text-lg font-black text-slate-900 tracking-tight">{data?.label || indConfig.moduleLabel}</h3>
              <span className="text-xs font-semibold text-slate-500">{fullName}</span>
            </div>
          </div>
          <div className="py-6 text-center space-y-1.5">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle size={18} />
            </div>
            <div className="text-sm font-bold text-slate-700">Chưa có dữ liệu</div>
            <p className="text-xs text-slate-500">
              {data?.message || 'Chưa có dữ liệu đo kiểm chi tiết cho ngày này.'}
            </p>
          </div>
        </div>
      </IndicatorProvider>
    );
  }

  const rate = data.rate != null ? Number(data.rate) : null;
  const isTargetMet = rate != null && rate >= targetRate;
  const gapToTarget = data.gap_to_target != null ? Number(data.gap_to_target) : null;
  const rateChange = data.rate_change != null ? Number(data.rate_change) : null;
  const rankMovement = data.rank_movement != null ? Number(data.rank_movement) : null;
  const rank = data.rank;
  const total = data.total || 34;
  const dateLabel = periodShortTitle(data);
  const basis = previousBasisLabel(data.period);
  const caption = sparkCaption(data.trend_kind);

  // day series: the last 30 days; week / month series arrive already limited by the server
  const series = data.trend_kind === 'week' || data.trend_kind === 'month' ? (data.trend || []) : (data.trend || []).slice(-SPARK_DAYS);
  const spark = series.map((point) => ({ date: point.date, rate: point.rate }));
  const sparkDomain = computeTrendYDomain(spark, targetRate);

  const movementView = rankMovement === null
    ? <span className="font-bold text-slate-400">—</span>
    : rankMovement > 0
      ? <span className="inline-flex items-center gap-0.5 font-black text-emerald-700"><ArrowUp size={13} /> +{rankMovement} bậc</span>
      : rankMovement < 0
        ? <span className="inline-flex items-center gap-0.5 font-black text-rose-600"><ArrowDown size={13} /> {rankMovement} bậc</span>
        : <span className="inline-flex items-center gap-0.5 font-bold text-slate-500"><Minus size={13} /> Giữ hạng</span>;
  const rateChangeView = rateChange === null
    ? <span className="font-bold text-slate-400">—</span>
    : rateChange > 0
      ? <span className="inline-flex items-center gap-1 font-black text-emerald-700"><TrendingUp size={13} /> +{rateChange.toFixed(1)}%</span>
      : rateChange < 0
        ? <span className="inline-flex items-center gap-1 font-black text-rose-600"><TrendingDown size={13} /> {rateChange.toFixed(1)}%</span>
        : <span className="inline-flex items-center gap-1 font-bold text-slate-500"><Minus size={13} /> 0.0%</span>;

  return (
    <IndicatorProvider indicator={indConfig}>
      <div ref={cardRef} onClick={onSelect} className={frame}>
        {/* Header: indicator, its name, target and camera */}
        <div className="flex items-center justify-between gap-2 pb-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`h-4 w-1.5 shrink-0 rounded-full ${theme.accentBar}`} />
            <h3 className="text-lg font-black leading-none text-slate-900 tracking-tight">{data.label}</h3>
            <span className={`whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-bold ${theme.chip}`}>
              Mục tiêu {targetRate}%
            </span>
          </div>
        </div>
        <div className="-mt-0.5 flex items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs font-semibold text-slate-600" title={`Kỳ số liệu của chỉ tiêu ${data.label}: ${periodTitle(data)}`}>
          <span className="truncate">{fullName}</span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">
            <Calendar size={11} className="text-slate-500" />
            {dateLabel}
          </span>
        </div>

        {/* The two numbers leaders read first: rate and national rank */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Tỷ lệ đạt</span>
                {isTargetMet ? (
                  <span className="inline-flex items-center gap-0.5 rounded border border-emerald-200 bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    <Sparkles size={10} /> Đạt
                  </span>
                ) : (
                  <span className="rounded border border-rose-200 bg-rose-100/80 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                    Chưa đạt
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl 2xl:text-3xl font-black leading-tight tracking-tight text-slate-900 tabular-nums">
                  {rate != null ? rate.toFixed(1) : '—'}
                </span>
                <span className="text-sm 2xl:text-base font-extrabold text-slate-500">%</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase leading-tight tracking-wide text-rose-800">Vị thứ toàn quốc</span>
                <Award size={15} className="hidden shrink-0 text-rose-500 @[17rem]:block" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl 2xl:text-3xl font-black leading-tight tracking-tight text-rose-600 tabular-nums">
                  {rank != null ? rank : '—'}
                </span>
                <span className="text-sm 2xl:text-base font-bold text-rose-400">/{total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gap and changes on full-width lines: five cards share one row, so nothing is squeezed into the number boxes */}
        <div className="mt-2 space-y-1 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="whitespace-nowrap font-medium text-slate-600">Chênh mục tiêu</span>
            <span className={`whitespace-nowrap font-black tabular-nums ${isTargetMet ? "text-emerald-700" : "text-rose-600"}`}>{formatGap(gapToTarget)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="whitespace-nowrap font-medium text-slate-600">Tỷ lệ so {basis}</span>
            <span className="whitespace-nowrap">{rateChangeView}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="whitespace-nowrap font-medium text-slate-600">Hạng so {basis}</span>
            <span className="whitespace-nowrap">{movementView}</span>
          </div>
        </div>

        {/* Own 30-day line with the indicator's own target line */}
        <div className="mt-2 h-8" title={`${caption} · đường đỏ là mục tiêu ${targetRate}%`}>
          {spark.some((point) => point.rate != null) ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark} margin={{ top: 2, right: 4, bottom: 1, left: 4 }}>
                <YAxis hide domain={sparkDomain} />
                <ReferenceLine y={targetRate} stroke="#EF4444" strokeDasharray="3 3" strokeWidth={1.2} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke={theme.primary}
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] font-medium text-slate-400">
              Chưa có dữ liệu xu hướng
            </div>
          )}
        </div>
      </div>
    </IndicatorProvider>
  );
}
