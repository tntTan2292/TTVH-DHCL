import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Download, Loader2 } from 'lucide-react';
import { useIndicator } from '../../features/indicator/IndicatorContext.js';
import { executeBlockCapture } from './blockCaptureHelper.js';

/**
 * Reusable camera capture button for dashboard/ranking report blocks.
 * Captures the target block as 2x PNG, supporting clipboard copy and file download.
 */
export default function BlockCaptureButton({
  targetRef,
  blockTitle = '',
  dateOrPeriod = '',
  className = '',
}) {
  const indicator = useIndicator();
  const indicatorLabel = indicator?.moduleLabel || 'F1.3';
  const [busyState, setBusyState] = useState(null); // 'copy' | 'save' | null
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error' | 'info', message: string }
  const menuRef = useRef(null);

  // Clear the notification after a few seconds
  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleCapture = async (action) => {
    if (!targetRef?.current) return;
    setBusyState(action);
    setFeedback(null);

    try {
      const result = await executeBlockCapture({
        element: targetRef.current,
        blockTitle,
        indicator: indicatorLabel,
        dateOrPeriod,
        action,
      });

      setFeedback({
        type: result.action === 'save_fallback' ? 'info' : 'success',
        message: result.message,
      });
    } catch (err) {
      console.error('[BlockCaptureButton] capture failed:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Không thể chụp ảnh khối này.',
      });
    } finally {
      setBusyState(null);
    }
  };

  return (
    <div
      ref={menuRef}
      data-no-capture="true"
      className={`relative inline-flex items-center gap-1 no-capture ${className}`}
    >
      {/* One click = copy the image (like a screenshot, ready to paste with Ctrl+V). */}
      <button
        type="button"
        title="Chụp ảnh khối này: sao chép vào bộ nhớ tạm, bấm Ctrl+V để dán"
        onClick={() => handleCapture('copy')}
        disabled={Boolean(busyState)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 focus:outline-none transition-all duration-150 cursor-pointer disabled:opacity-60"
      >
        {busyState ? (
          <Loader2 size={14} className="animate-spin text-[#003E7E]" />
        ) : feedback?.type === 'success' ? (
          <Check size={14} className="text-emerald-600" />
        ) : (
          <Camera size={14} className="text-slate-600 hover:text-[#003E7E]" />
        )}
        <span className="hidden sm:inline text-[11px]">Chụp ảnh</span>
      </button>

      {/* Secondary: save the picture as a PNG file instead of copying it. */}
      <button
        type="button"
        title="Lưu ảnh khối này thành tệp PNG"
        onClick={() => handleCapture('save')}
        disabled={Boolean(busyState)}
        className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1 text-slate-500 shadow-2xs hover:bg-slate-50 hover:text-slate-900 focus:outline-none transition-all duration-150 cursor-pointer disabled:opacity-60"
      >
        <Download size={14} />
      </button>

      {/* Floating notification */}
      {feedback ? (
        <div
          role="status"
          className={`absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold shadow-md transition-all duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-700 text-white'
              : feedback.type === 'info'
                ? 'bg-blue-700 text-white'
                : 'bg-red-700 text-white'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}
