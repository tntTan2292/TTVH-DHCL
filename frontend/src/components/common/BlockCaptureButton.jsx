import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Check, Copy, Download, Loader2, X } from 'lucide-react';
import { useIndicator } from '../../features/indicator/IndicatorContext.js';
import { indicatorTheme } from '../../features/indicator/indicatorConfig.js';
import {
  canUseAsyncImageClipboard,
  copyBlobToClipboard,
  downloadBlob,
  executeBlockCapture,
} from './blockCaptureHelper.js';

/**
 * Reusable camera capture button for dashboard/ranking report blocks.
 * One click copies the block as a 2x PNG to the clipboard. Where the browser does not let a page write an
 * image to the clipboard (plain-http addresses), the picture is shown in a small window so it can be copied
 * with the browser's own "Copy image" command (right click), which works from any address and gives a real
 * picture that Zalo/Viber accept. A second small button saves the PNG on purpose.
 */
export default function BlockCaptureButton({
  targetRef,
  blockTitle = '',
  dateOrPeriod = '',
  className = '',
}) {
  const indicator = useIndicator();
  const indicatorLabel = indicator?.moduleLabel || 'F1.3';
  const theme = indicatorTheme(indicator);
  const [busyState, setBusyState] = useState(null); // 'copy' | 'save' | null
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'info' | 'error', message: string }
  const [preview, setPreview] = useState(null); // { url, blob, filename }

  // Clear the notification after a few seconds
  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const closePreview = useCallback(() => {
    setPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!preview) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') closePreview();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [preview, closePreview]);

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

      if (result.action === 'preview') {
        setPreview({ url: URL.createObjectURL(result.blob), blob: result.blob, filename: result.filename });
      } else {
        setFeedback({ type: 'success', message: result.message });
      }
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

  const handleCopyFromPreview = async () => {
    if (!preview) return;
    const copied = await copyBlobToClipboard(preview.blob);
    setFeedback(copied
      ? { type: 'success', message: 'Đã sao chép ảnh. Bấm Ctrl+V để dán.' }
      : { type: 'info', message: 'Trình duyệt không cho sao chép tự động: bấm chuột phải vào ảnh, chọn "Sao chép hình ảnh".' });
  };

  return (
    <div
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
          <Loader2 size={14} className={`animate-spin ${theme.text}`} />
        ) : feedback?.type === 'success' ? (
          <Check size={14} className="text-emerald-600" />
        ) : (
          <Camera size={14} className={theme.text} />
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

      {/* Preview window for addresses where the page may not write an image to the clipboard */}
      {preview ? createPortal(
        <div
          data-no-capture="true"
          role="dialog"
          aria-modal="true"
          aria-label="Ảnh đã chụp"
          className="no-capture fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closePreview(); }}
        >
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ảnh đã chụp</h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  Bấm <strong>chuột phải vào ảnh</strong>, chọn <strong>Sao chép hình ảnh</strong>, rồi dán (Ctrl+V) vào Zalo/Viber/email.
                </p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                title="Đóng (Esc)"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-auto bg-slate-100 p-3">
              <img src={preview.url} alt={`Ảnh chụp: ${blockTitle}`} className="mx-auto block h-auto max-w-full bg-white shadow" />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              {canUseAsyncImageClipboard() ? (
                <button
                  type="button"
                  onClick={handleCopyFromPreview}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Copy size={14} />
                  Sao chép ảnh
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => downloadBlob(preview.blob, preview.filename)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Download size={14} />
                Lưu tệp PNG
              </button>
              <button
                type="button"
                onClick={closePreview}
                className={`inline-flex items-center rounded-lg ${theme.button} px-3 py-1.5 text-xs font-semibold hover:opacity-90 cursor-pointer`}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
