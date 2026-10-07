import { ChevronLeft, ChevronRight, FastForward, RotateCcw } from 'lucide-react';
import {
  calculatePresetWindow,
  defaultGetPointLabel,
  isFullWindow,
  panWindow,
  resolveNavigatorPresets,
} from './chartRangeNav.js';

/**
 * Shared Interactive Horizontal Scroll & Range Navigator.
 * Used by both BCVH Weekly Trend Chart and Operation Dashboard Daily Trend Chart.
 *
 * Provides:
 * 1. Quick presets (e.g. 14 days, 7 days, all / 12 weeks, 6 weeks, all).
 * 2. Range indicator showing currently displayed slice.
 * 3. Fast-forward button to immediately jump to the latest anchor point (N-1).
 * 4. Smooth horizontal pan slider (<input type="range">) with step chevron buttons.
 * 5. Pointer down event isolation to prevent triggering parent chart drag-to-pan.
 */
export default function ChartRangeNavigator({
  window,
  total,
  rows = [],
  unitNoun = 'tuần',
  presets = null,
  jumpLatestLabel = null,
  getPointLabel = defaultGetPointLabel,
  onRangeChange,
  onReset,
}) {
  if (!window || total <= 0) return null;

  const span = window.end - window.start + 1;
  const isFull = isFullWindow(window, total);
  const maxStart = Math.max(0, total - span);
  const isAtLatest = window.end >= total - 1;

  const activePresets = presets ?? resolveNavigatorPresets(unitNoun);

  const resolvedJumpLatestLabel = jumpLatestLabel ?? (
    unitNoun === 'ngày' ? 'Về ngày mới nhất (N-1)' : 'Về tuần mới nhất'
  );

  const applyPreset = (count) => {
    if (count >= total) {
      onReset?.();
      return;
    }
    // Always pin to the latest point (ending at total - 1)
    onRangeChange?.(calculatePresetWindow(count, total));
  };

  const panStep = (delta) => {
    onRangeChange?.(panWindow(window, total, delta));
  };

  const jumpToLatest = () => {
    onRangeChange?.({ start: Math.max(0, total - span), end: total - 1 });
  };

  const startLabel = getPointLabel(rows[window.start], window.start, unitNoun);
  const endLabel = getPointLabel(rows[window.end], window.end, unitNoun);

  return (
    <div
      className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-xs shadow-2xs"
      onPointerDown={(e) => e.stopPropagation()}
      data-chart-range-nav
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-700">Khoảng xem nhanh:</span>
          <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => onReset?.()}
              className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                isFull ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tất cả ({total} {unitNoun})
            </button>
            {activePresets.map((preset) => (
              total > preset.count ? (
                <button
                  key={preset.count}
                  type="button"
                  onClick={() => applyPreset(preset.count)}
                  className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    !isFull && span === preset.count && isAtLatest
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ) : null
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-semibold text-slate-600">
            Đang hiển thị: <span className="font-bold text-blue-700">{startLabel}</span> → <span className="font-bold text-blue-700">{endLabel}</span> ({span}/{total} {unitNoun})
          </span>
          {!isAtLatest ? (
            <button
              type="button"
              onClick={jumpToLatest}
              className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-100/80 px-2 py-0.5 text-[11px] font-bold text-blue-800 shadow-2xs hover:bg-blue-200 transition-colors"
              title={`Nhảy ngay đến ${unitNoun} mốc mới nhất`}
            >
              <span>{resolvedJumpLatestLabel}</span>
              <FastForward size={12} />
            </button>
          ) : null}
          {!isFull ? (
            <button
              type="button"
              onClick={() => onReset?.()}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 shadow-2xs hover:bg-slate-100"
              title={`Đặt lại xem toàn bộ ${unitNoun}`}
            >
              <RotateCcw size={11} />
              <span>Đặt lại</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Horizontal Pan & Slider Scrollbar */}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => panStep(-Math.max(1, Math.floor(span / 2)))}
          disabled={window.start <= 0}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
          title={`Cuộn sang các ${unitNoun} cũ hơn`}
          aria-label={`Cuộn sang ${unitNoun} cũ hơn`}
        >
          <ChevronLeft size={14} />
        </button>

        <div className="relative flex-1 py-1">
          <input
            type="range"
            min={0}
            max={maxStart}
            value={window.start}
            disabled={isFull}
            onChange={(e) => {
              const nextStart = Number(e.target.value);
              onRangeChange?.({ start: nextStart, end: nextStart + span - 1 });
            }}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-40"
            title={`Kéo thanh cuộn để dịch chuyển khoảng ${unitNoun}`}
            aria-label={`Thanh cuộn ngang ${unitNoun}`}
          />
        </div>

        <button
          type="button"
          onClick={() => panStep(Math.max(1, Math.floor(span / 2)))}
          disabled={window.end >= total - 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
          title={`Cuộn sang các ${unitNoun} mới hơn`}
          aria-label={`Cuộn sang ${unitNoun} mới hơn`}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
