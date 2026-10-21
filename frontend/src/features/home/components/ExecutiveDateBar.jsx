import React, { useRef } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { PERIOD_OPTIONS, periodShortTitle, periodTitle } from '../homePeriod.js';

/**
 * Executive control bar (TV friendly): title, each indicator's own loaded period, the Ngày / Tuần / Tháng
 * filter that drives the whole page, the back / forward buttons (HOME-BI-02, PO 2026-10-21), refresh, camera.
 * offset 0 = the latest period with data; -1 = one period back, and so on.
 */
export default function ExecutiveDateBar({
  period,
  onPeriodChange,
  offset,
  onOffsetChange,
  periodInfo,
  onRefresh,
  loading,
  indicators = [],
}) {
  const barRef = useRef(null);
  const canGoBack = Boolean(periodInfo?.has_previous);
  const canGoForward = offset < 0;
  const title = periodTitle(periodInfo);

  return (
    <div
      ref={barRef}
      className="rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-2.5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1.5 rounded-full bg-[var(--color-vnpost-blue)]" />
            <h2 className="text-lg font-black tracking-tight text-slate-900">TRANG CHỦ ĐIỀU HÀNH CHẤT LƯỢNG</h2>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {indicators.map((ind) => {
              const hasData = ind.available;
              return (
                <div
                  key={ind.id}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${
                    hasData
                      ? 'border-slate-200 bg-slate-50 text-slate-700'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                  title={hasData ? `${ind.label}: ${periodTitle(ind)}` : (ind.message || 'Chưa có dữ liệu')}
                >
                  {hasData ? (
                    <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle size={12} className="shrink-0 text-amber-600" />
                  )}
                  <span className="font-bold">{ind.label}</span>
                  <span>{hasData ? periodShortTitle(ind) : 'Chưa có'}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div data-no-capture="true" className="flex flex-wrap items-center gap-2">
          {/* The filter that drives every block of the page */}
          <div className="flex items-center rounded-xl bg-slate-200/70 p-1 text-sm font-bold" role="group" aria-label="Kỳ xem số liệu">
            {PERIOD_OPTIONS.map((option) => {
              const active = period === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onPeriodChange(option.id)}
                  aria-pressed={active}
                  className={`cursor-pointer rounded-lg px-3.5 py-1 transition-all ${
                    active ? 'bg-[var(--color-vnpost-blue)] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Back / forward through periods; "Mới nhất" returns to the latest */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50/70 px-1 py-0.5">
            <button
              type="button"
              onClick={() => onOffsetChange(offset - 1)}
              disabled={!canGoBack}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
              title="Xem kỳ trước"
              aria-label="Xem kỳ trước"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[10.5rem] px-1 text-center text-sm font-black text-slate-900" aria-live="polite">
              {title}
            </span>
            <button
              type="button"
              onClick={() => onOffsetChange(offset + 1)}
              disabled={!canGoForward}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
              title="Xem kỳ sau"
              aria-label="Xem kỳ sau"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {offset < 0 && (
            <button
              type="button"
              onClick={() => onOffsetChange(0)}
              className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
              title="Quay lại kỳ mới nhất có dữ liệu"
            >
              Mới nhất
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            title="Làm mới dữ liệu từ máy chủ"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-blue-600' : 'text-slate-500'} />
            <span>Làm mới</span>
          </button>

          <BlockCaptureButton
            targetRef={barRef}
            blockTitle="Trang chủ điều hành chất lượng"
            dateOrPeriod={title}
          />
        </div>
      </div>
    </div>
  );
}
