import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Copy, Download, Loader2 } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [busyState, setBusyState] = useState(null); // 'copy' | 'save' | null
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error' | 'info', message: string }
  const menuRef = useRef(null);

  // Close popup menu on outside click
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Clear feedback message after 3 seconds
  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleCapture = async (action) => {
    if (!targetRef?.current) return;
    setIsOpen(false);
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
      className={`relative inline-flex items-center no-capture ${className}`}
    >
      <button
        type="button"
        title="Chụp ảnh khối này (sao chép hoặc lưu PNG)"
        onClick={() => setIsOpen((prev) => !prev)}
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

      {/* Dropdown Menu */}
      {isOpen ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Xuất ảnh báo cáo (2× PNG)
          </div>

          <button
            type="button"
            onClick={() => handleCapture('copy')}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Copy size={13} className="text-slate-500" />
            <div className="flex flex-col">
              <span>Sao chép vào Clipboard</span>
              <span className="text-[10px] font-normal text-slate-400">Dán trực tiếp vào Zalo/Viber</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleCapture('save')}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Download size={13} className="text-slate-500" />
            <div className="flex flex-col">
              <span>Lưu tệp ảnh PNG</span>
              <span className="text-[10px] font-normal text-slate-400">Tải tệp kèm tên chuẩn</span>
            </div>
          </button>
        </div>
      ) : null}

      {/* Floating toast notification */}
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
