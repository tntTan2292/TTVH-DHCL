import React, { useRef } from 'react';
import { Calendar, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';

/**
 * Top executive control bar:
 * - Shows data anchor date and allows leadership to inspect historical days.
 * - Shows individual indicator data readiness badges (each indicator's loaded date).
 * - Exposes BlockCaptureButton for leadership exports.
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
    try {
      const [y, m, d] = isoStr.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      ref={barRef}
      className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-xs transition-[box-shadow,border-color] duration-150"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title and subtitle */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-3 w-1.5 rounded-full bg-[var(--color-vnpost-blue)]" />
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
              TRANG CHỦ ĐIỀU HÀNH CHẤT LƯỢNG
            </h2>
            <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-[var(--color-vnpost-blue)]">
              Executive BI
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Theo dõi tức thời 04 chỉ tiêu cốt lõi: F1.1 (Thu gom nội tỉnh), F1.2 (Thu gom liên tỉnh), F1.3 (Phát nội tỉnh), F4.1 (Phát liên tỉnh).
          </p>
        </div>

        {/* Controls */}
        <div data-no-capture="true" className="flex flex-wrap items-center gap-2.5">
          {/* Anchor date picker */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50/70 px-3 py-1.5 text-xs shadow-2xs hover:border-slate-400 transition-colors">
            <Calendar size={15} className="text-slate-500 shrink-0" />
            <label htmlFor="executiveAnchorDateInput" className="font-bold text-slate-700 whitespace-nowrap">
              Ngày chốt:
            </label>
            <input
              id="executiveAnchorDateInput"
              type="date"
              value={anchorDate || ''}
              onChange={(e) => onAnchorDateChange(e.target.value || null)}
              className="font-bold text-slate-900 outline-none cursor-pointer bg-transparent"
              title="Chọn ngày chốt dữ liệu (để trống = lấy ngày mới nhất có dữ liệu)"
            />
            {anchorDate && (
              <button
                type="button"
                onClick={() => onAnchorDateChange(null)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                title="Quay lại ngày mới nhất mặc định"
              >
                Mặc định
              </button>
            )}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer transition-colors"
            title="Làm mới dữ liệu từ máy chủ"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-blue-600' : 'text-slate-500'} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          {/* Camera button */}
          <BlockCaptureButton
            targetRef={barRef}
            blockTitle="Trang chủ điều hành chất lượng"
            dateOrPeriod={formatDateDisplay(anchorDate)}
          />
        </div>
      </div>

      {/* Freshness / Indicator Status strip */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">
            Dữ liệu từng chỉ tiêu:
          </span>
          {indicators.map((ind) => {
            const hasData = ind.available;
            return (
              <div
                key={ind.id}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${
                  hasData
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
                title={hasData ? `Số liệu ngày ${ind.data_date}` : (ind.message || 'Chưa có dữ liệu')}
              >
                {hasData ? (
                  <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={12} className="text-amber-600 shrink-0" />
                )}
                <span className="font-bold">{ind.label}:</span>
                <span>{hasData ? formatDateDisplay(ind.data_date) : 'Chưa có'}</span>
              </div>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          Dữ liệu đồng bộ tự động từ Báo cáo vận hành TCT & Hệ thống nghiệp vụ
        </div>
      </div>
    </div>
  );
}
