import React, { useRef } from 'react';
import { Calendar, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';

/**
 * One-line executive control bar (TV friendly):
 * title, each indicator's own loaded day, the anchor date picker, refresh and camera.
 */
export default function ExecutiveDateBar({
  anchorDate,
  onAnchorDateChange,
  onRefresh,
  loading,
  indicators = [],
}) {
  const barRef = useRef(null);

  const formatDateDisplay = (isoStr) => {
    if (!isoStr) return 'Mới nhất (N-1)';
    const [y, m, d] = String(isoStr).split('-');
    return d && m && y ? `${d}/${m}/${y}` : isoStr;
  };

  const shortDate = (isoStr) => {
    const [, m, d] = String(isoStr || '').split('-');
    return d && m ? `${d}/${m}` : '—';
  };

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
                  title={hasData ? `Số liệu ${ind.label} ngày ${formatDateDisplay(ind.data_date)}` : (ind.message || 'Chưa có dữ liệu')}
                >
                  {hasData ? (
                    <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle size={12} className="shrink-0 text-amber-600" />
                  )}
                  <span className="font-bold">{ind.label}</span>
                  <span>{hasData ? shortDate(ind.data_date) : 'Chưa có'}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div data-no-capture="true" className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50/70 px-3 py-1 text-xs">
            <Calendar size={14} className="shrink-0 text-slate-500" />
            <label htmlFor="executiveAnchorDateInput" className="whitespace-nowrap font-bold text-slate-700">
              Ngày chốt:
            </label>
            <input
              id="executiveAnchorDateInput"
              type="date"
              value={anchorDate || ''}
              onChange={(e) => onAnchorDateChange(e.target.value || null)}
              className="cursor-pointer bg-transparent font-bold text-slate-900 outline-none"
              title="Chọn ngày chốt dữ liệu (để trống = ngày mới nhất có dữ liệu)"
            />
            {anchorDate && (
              <button
                type="button"
                onClick={() => onAnchorDateChange(null)}
                className="cursor-pointer text-[11px] font-semibold text-blue-600 underline hover:text-blue-800"
                title="Quay lại ngày mới nhất mặc định"
              >
                Mặc định
              </button>
            )}
          </div>

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
            dateOrPeriod={formatDateDisplay(anchorDate)}
          />
        </div>
      </div>
    </div>
  );
}
