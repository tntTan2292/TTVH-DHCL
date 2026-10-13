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
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { INDICATORS, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { IndicatorProvider } from '../../indicator/IndicatorContext.js';
import { formatGap } from '../homeTableSort.js';

/**
 * Executive Card for an individual indicator (F1.1, F1.2, F1.3, F4.1):
 * Displays:
 * 1. Current quality rate (large, bold, color-toned)
 * 2. National rank x/34 (prominent rank badge)
 * 3. Gap to indicator target (points)
 * 4. Day-over-Day change (rate change & rank movement; null is "—", never fake 0 / Giữ hạng)
 * 5. Distinct data date badge
 * 6. Target line reference (95% for F1.1/F1.2, 90% for F1.3/F4.1)
 */
export default function ExecutiveIndicatorCard({
  data,
  isSelected,
  onSelect,
}) {
  const cardRef = useRef(null);
  const indConfig = INDICATORS[data?.id] || INDICATORS.f13;
  const theme = indicatorTheme(indConfig);
  const targetRate = data?.target_rate ?? indConfig.targetRate;

  const formatDateShort = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const parts = isoStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch {
      return isoStr;
    }
  };

  if (!data?.available) {
    return (
      <IndicatorProvider indicator={indConfig}>
        <div
          ref={cardRef}
          onClick={onSelect}
          className={`relative rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
            isSelected
              ? 'border-slate-400 bg-white shadow-md ring-2 ring-slate-400'
              : 'border-slate-200/80 bg-white/80 shadow-2xs hover:shadow-md hover:border-slate-300'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-1.5 rounded-full ${theme.accentBar}`} />
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {data?.label || indConfig.moduleLabel}
              </h3>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                Mục tiêu {targetRate}%
              </span>
            </div>
            <BlockCaptureButton
              targetRef={cardRef}
              blockTitle={`Chỉ tiêu ${data?.label || indConfig.moduleLabel}`}
              dateOrPeriod="Chưa có dữ liệu"
            />
          </div>

          {/* Unavailable state */}
          <div className="py-7 text-center space-y-1.5">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle size={18} />
            </div>
            <div className="text-xs font-bold text-slate-700">Chưa có dữ liệu</div>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
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

  const dateLabel = formatDateShort(data.data_date);

  return (
    <IndicatorProvider indicator={indConfig}>
      <div
        ref={cardRef}
        onClick={onSelect}
        className={`group relative rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
          isSelected
            ? `border-slate-900 bg-white shadow-lg ring-2 ${theme.ring}`
            : 'border-slate-200/90 bg-white shadow-xs hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-1.5">
            <span className={`h-3 w-1.5 rounded-full ${theme.accentBar}`} />
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              {data.label}
            </h3>
            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${theme.chip}`}>
              MT {targetRate}%
            </span>
          </div>

          <div data-no-capture="true" className="flex items-center gap-1">
            <BlockCaptureButton
              targetRef={cardRef}
              blockTitle={`Chỉ tiêu ${data.label}`}
              dateOrPeriod={`Ngày ${dateLabel}`}
            />
          </div>
        </div>

        {/* Core KPI Area: Rate & National Rank */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 items-stretch">
          {/* Quality Rate */}
          <div className="rounded-xl bg-slate-50/90 p-2.5 border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Tỷ lệ đạt
              </span>
              {isTargetMet ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded border border-emerald-200">
                  <Sparkles size={9} /> Đạt
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-100/70 px-1 py-0.2 rounded border border-rose-200">
                  Chưa đạt
                </span>
              )}
            </div>

            <div className="my-1 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                {rate != null ? `${rate.toFixed(1)}` : '—'}
              </span>
              <span className="text-xs font-extrabold text-slate-500">%</span>
            </div>

            {/* Gap to target */}
            <div className="text-[11px] flex items-center justify-between pt-1 border-t border-slate-200/60 font-medium text-slate-500">
              <span>Chênh MT:</span>
              <span
                className={`font-black tabular-nums ${
                  isTargetMet ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {formatGap(gapToTarget)}
              </span>
            </div>
          </div>

          {/* National Rank */}
          <div className="rounded-xl bg-rose-50/50 p-2.5 border border-rose-100/90 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                Vị thứ TQ
              </span>
              <Award size={13} className="text-rose-500 shrink-0" />
            </div>

            <div className="my-1 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-rose-600 tabular-nums">
                {rank != null ? rank : '—'}
              </span>
              <span className="text-xs font-bold text-rose-400">/{total}</span>
            </div>

            {/* Rank Movement: null must show "—", only 0 means "Giữ hạng" */}
            <div className="text-[11px] flex items-center justify-between pt-1 border-t border-rose-200/60 font-medium text-slate-500">
              <span>Biến động:</span>
              <div className="font-bold tabular-nums">
                {rankMovement === null || rankMovement === undefined ? (
                  <span className="text-slate-400 font-bold">—</span>
                ) : rankMovement > 0 ? (
                  <span className="text-emerald-700 inline-flex items-center gap-0.5">
                    <ArrowUp size={11} /> +{rankMovement} bậc
                  </span>
                ) : rankMovement < 0 ? (
                  <span className="text-rose-600 inline-flex items-center gap-0.5">
                    <ArrowDown size={11} /> {rankMovement} bậc
                  </span>
                ) : (
                  <span className="text-slate-500 inline-flex items-center gap-0.5">
                    <Minus size={11} /> Giữ hạng
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Context: DoD Rate Change & Data Date */}
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          {/* Rate DoD Change: null must show "—", only 0 means "0.0%" */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-500 font-medium">So hôm trước:</span>
            {rateChange === null || rateChange === undefined ? (
              <span className="text-slate-400 font-bold">—</span>
            ) : rateChange > 0 ? (
              <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700">
                <TrendingUp size={12} /> +{rateChange.toFixed(1)}%
              </span>
            ) : rateChange < 0 ? (
              <span className="inline-flex items-center gap-0.5 font-bold text-rose-600">
                <TrendingDown size={12} /> {rateChange.toFixed(1)}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 font-bold text-slate-500">
                <Minus size={12} /> 0.0%
              </span>
            )}
          </div>

          {/* Individual Data Date */}
          <div
            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded"
            title={`Ngày số liệu của chỉ tiêu ${data.label}: ${dateLabel}`}
          >
            <Calendar size={10} className="text-slate-400" />
            <span>{dateLabel}</span>
          </div>
        </div>

        {/* Selection indicator pill */}
        {isSelected && (
          <div className="mt-2.5 flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
              ● Đang xem chi tiết bên dưới
            </span>
          </div>
        )}
      </div>
    </IndicatorProvider>
  );
}
