import { useCallback, useEffect, useRef, useState } from 'react';
import { MIN_ZOOM_SPAN, fullWindow, isFullWindow, panWindow, zoomWindow } from './chartDataLabels';

/**
 * Keeps the chart frame the same size and lets the user zoom the X range with the mouse wheel,
 * drag to pan, double-click (or the button) to reset. Children receive the visible index
 * window and slice their own rows with sliceWindow(). Zoom resets when `total` changes.
 *
 * Page scroll is only captured while zooming in; scrolling down at full view still scrolls the page.
 */
export default function ChartZoomFrame({ total, enabled = true, className = '', children }) {
  const canZoom = enabled && total > MIN_ZOOM_SPAN;
  const [state, setState] = useState({ total, window: null });
  const frameRef = useRef(null);
  const liveRef = useRef({ total, window: null });
  const dragRef = useRef(null);

  const activeWindow = state.total === total ? state.window : null;
  const zoomed = canZoom && activeWindow !== null && !isFullWindow(activeWindow, total);

  useEffect(() => {
    liveRef.current = { total, window: activeWindow };
  });

  const setWindow = useCallback((next) => {
    setState({ total, window: next && !isFullWindow(next, total) ? next : null });
  }, [total]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || !canZoom) return undefined;

    const onWheel = (event) => {
      const zoomIn = event.deltaY < 0;
      const current = liveRef.current.window;
      if (!zoomIn && (!current || isFullWindow(current, total))) return; // let the page scroll
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const anchorRatio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0.5;
      setWindow(zoomWindow(current, total, { anchorRatio, zoomIn }));
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [canZoom, total, setWindow]);

  const onPointerDown = (event) => {
    if (!zoomed || event.button !== 0) return;
    dragRef.current = { x: event.clientX, window: activeWindow };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || !frameRef.current) return;
    const width = frameRef.current.getBoundingClientRect().width || 1;
    const span = drag.window.end - drag.window.start + 1;
    const deltaPoints = -((event.clientX - drag.x) / width) * span;
    setWindow(panWindow(drag.window, total, deltaPoints));
  };

  const endDrag = (event) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const visibleWindow = canZoom ? (activeWindow || fullWindow(total)) : fullWindow(total);

  return (
    <div
      ref={frameRef}
      className={`relative ${className}`}
      style={{ cursor: zoomed ? 'grab' : undefined, touchAction: canZoom ? 'pan-y' : undefined }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => canZoom && setWindow(null)}
    >
      {children({ window: visibleWindow, isZoomed: zoomed })}
      {canZoom ? (
        <div className="pointer-events-none absolute right-2 top-0.5 z-10 flex items-center gap-2 text-[10px] font-medium text-slate-400" data-chart-zoom-control>
          {zoomed ? (
            <button
              type="button"
              onClick={() => setWindow(null)}
              className="pointer-events-auto rounded-md border border-slate-200 bg-white/95 px-2 py-0.5 font-semibold text-slate-600 shadow-2xs backdrop-blur-xs hover:bg-slate-50"
            >
              Đặt lại zoom ({visibleWindow.end - visibleWindow.start + 1}/{total})
            </button>
          ) : (
            <span className="rounded bg-white/80 px-1.5 py-0.5 backdrop-blur-xs">Lăn chuột để phóng to</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
