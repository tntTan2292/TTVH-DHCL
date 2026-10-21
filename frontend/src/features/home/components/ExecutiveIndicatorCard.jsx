import React, { useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { LineChart, Line, YAxis, ReferenceLine, ResponsiveContainer } from 'recharts';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { INDICATORS, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { IndicatorProvider } from '../../indicator/IndicatorContext.js';
import { computeTrendYDomain, formatGap, INDICATOR_FULL_NAMES } from '../homeTableSort.js';
import { periodShortTitle, periodTitle, previousBasisLabel, sparkCaption } from '../homePeriod.js';

const SPARK_DAYS = 30;

/**
 * Executive card of one indicator (F1.1, F1.2, F1.3, F4.1), built to be read at a glance on a laptop or a TV
 * at 100 % zoom: the two numbers leaders read first (rate and national rank) side by side and large, the gap
 * to the indicator's own target, the change against the previous period, and - when the card is wide enough -
 * its own small line with its own target line (never shared with another indicator).
 * A missing figure is "—", never a fake 0 / "Giữ hạng".
 */
export default function ExecutiveIndicatorCard({ data, isSelected, onSelect }) {
  const cardRef = useRef(null);
  const indConfig = INDICATORS[data?.id] || INDICATORS.f13;
  const theme = indicatorTheme(indConfig);
  const targetRate = data?.target_rate ?? indConfig.targetRate;
  const fullName = INDICATOR_FULL_NAMES[data?.id] || '';

  const frame = `@container group relative cursor-pointer rounded-xl border bg-white p-2 transition-all duration-200 ${
    isSelected
      ? `border-slate-900 shadow-lg ring-2 ${theme.ring}`
      : 'border-slate-300 shadow-sm hover:border-slate-400 hover:shadow-md'
  }`;

  if (!data?.available) {
    return (
      <IndicatorProvider indicator={indConfig}>
        <div ref={cardRef} onClick={onSelect} className={frame}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-2">
              <span className={`h-4 w-1.5 rounded-full ${theme.accentBar}`} />
              <h3 className="text-lg font-black tracking-tight text-slate-900">{data?.label || indConfig.moduleLabel}</h3>
              <span className="text-xs font-semibold text-slate-600">{fullName}</span>
            </div>
            <BlockCaptureButton
              targetRef={cardRef}
              blockTitle={`Chỉ tiêu ${data?.label || indConfig.moduleLabel}`}
              dateOrPeriod="Chưa có dữ liệu"
            />
          </div>
          <div className="space-y-1 py-4 text-center">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle size={17} />
            </div>
            <div className="text-sm font-bold text-slate-800">Chưa có dữ liệu</div>
            <p className="text-xs text-slate-600">
              {data?.message || 'Chưa có dữ liệu đo kiểm chi tiết cho kỳ này.'}
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
    ? <span className="font-bold text-slate-500">—</span>
    : rankMovement > 0
      ? <span className="inline-flex items-center gap-0.5 font-black text-emerald-700"><ArrowUp size={13} /> +{rankMovement}<span className="hidden @[330px]:inline"> bậc</span></span>
      : rankMovement < 0
        ? <span className="inline-flex items-center gap-0.5 font-black text-rose-600"><ArrowDown size={13} /> {rankMovement}<span className="hidden @[330px]:inline"> bậc</span></span>
        : <span className="inline-flex items-center gap-0.5 font-bold text-slate-600"><Minus size={13} /> Giữ hạng</span>;
  const rateChangeView = rateChange === null
    ? <span className="font-bold text-slate-500">—</span>
    : rateChange > 0
      ? <span className="inline-flex items-center gap-1 font-black text-emerald-700"><TrendingUp size={13} /> +{rateChange.toFixed(1)}%</span>
      : rateChange < 0
        ? <span className="inline-flex items-center gap-1 font-black text-rose-600"><TrendingDown size={13} /> {rateChange.toFixed(1)}%</span>
        : <span className="inline-flex items-center gap-1 font-bold text-slate-600"><Minus size={13} /> 0.0%</span>;

  return (
    <IndicatorProvider indicator={indConfig}>
      <div ref={cardRef} onClick={onSelect} className={frame}>
        {/* Header: indicator, target, name and period, camera */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-4 w-1.5 shrink-0 rounded-full ${theme.accentBar}`} />
            <h3 className="text-lg font-black leading-none tracking-tight text-slate-900">{data.label}</h3>
            <span className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-bold ${theme.chip}`}>
              Mục tiêu {targetRate}%
            </span>
          </div>
          <div data-no-capture="true" className="shrink-0">
            <BlockCaptureButton
              targetRef={cardRef}
              blockTitle={`Chỉ tiêu ${data.label}`}
              dateOrPeriod={periodTitle(data)}
            />
          </div>
        </div>
        <div className="mt-0.5 truncate text-xs font-semibold text-slate-700" title={`${fullName} · ${periodTitle(data)}`}>
          {fullName} · {dateLabel}
        </div>

        {/* The two numbers leaders read first: rate and national rank (+ a small line when there is room) */}
        <div className="mt-1.5 grid grid-cols-2 gap-1.5 @[400px]:grid-cols-[1fr_1fr_6.5rem]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
            <div className="flex items-center justify-between gap-1">
              <span className="whitespace-nowrap text-[11px] font-bold uppercase text-slate-700">Tỷ lệ đạt</span>
              {isTargetMet ? (
                <span className="inline-flex items-center gap-0.5 rounded border border-emerald-200 bg-emerald-100 px-1 text-[10px] font-bold text-emerald-700">
                  <Sparkles size={9} /> Đạt
                </span>
              ) : (
                <span className="rounded border border-rose-200 bg-rose-100 px-1 text-[10px] font-bold text-rose-700">
                  Chưa đạt
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-3xl font-black leading-none tracking-tight text-slate-900 tabular-nums">
                {rate != null ? rate.toFixed(1) : '—'}
              </span>
              <span className="text-base font-extrabold text-slate-600">%</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-x-1 text-[11px]">
              <span className="whitespace-nowrap font-medium text-slate-700">Chênh mục tiêu</span>
              <span className={`whitespace-nowrap font-black tabular-nums ${isTargetMet ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatGap(gapToTarget)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-x-1 text-[11px]">
              <span className="whitespace-nowrap font-medium text-slate-700">So {basis}</span>
              <span className="whitespace-nowrap">{rateChangeView}</span>
            </div>
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1">
            <div className="flex items-center justify-between">
              <span className="whitespace-nowrap text-[11px] font-bold uppercase text-rose-800">Vị thứ toàn quốc</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-3xl font-black leading-none tracking-tight text-rose-600 tabular-nums">
                {rank != null ? rank : '—'}
              </span>
              <span className="text-base font-bold text-rose-400">/{total}</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-x-1 text-[11px]">
              <span className="whitespace-nowrap font-medium text-slate-700">So {basis}</span>
              <span className="whitespace-nowrap">{movementView}</span>
            </div>
          </div>

          {/* Own small line with the indicator's own target line: only when the card is wide enough */}
          <div
            className="relative hidden min-h-[3.5rem] rounded-lg border border-slate-200 bg-white @[400px]:block"
            title={`${caption} · đường đỏ là mục tiêu ${targetRate}%`}
          >
            {spark.some((point) => point.rate != null) ? (
              <div className="absolute inset-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spark} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
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
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] font-medium text-slate-500">
                Chưa có xu hướng
              </div>
            )}
          </div>
        </div>
      </div>
    </IndicatorProvider>
  );
}
