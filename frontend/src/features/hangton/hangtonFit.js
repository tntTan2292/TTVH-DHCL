// HANGTON-INVENTORY-01: the screens scale to the width they are given (PO 2026-10-26: with the menu open the
// numbers wrapped; the layout must shrink when narrow and grow when wide, by itself).
//
// Same idea as the Home page (features/home/homeFit.js): the content is laid out for a fixed logical width and then
// reduced / enlarged as a whole with CSS zoom, so every window width sees the same proportions and nothing wraps
// differently. Pure functions + one hook; the page wraps its content in <div ref><div style={{ zoom }}>.
import { useEffect, useRef, useState } from 'react';

// Logical width the four screens are laid out for (the office table with nine levels fits in it without wrapping).
export const HANGTON_DESIGN_WIDTH = 1280;
export const HANGTON_MIN_ZOOM = 0.7;
export const HANGTON_MAX_ZOOM = 1.5;
// The parcel table with the stock-handling columns (cause, plan, result, note, save) needs more room to keep one parcel on
// one line (PO 2026-10-27): that screen is laid out for a wider logical width and may shrink further.
export const HANGTON_WIDE_DESIGN_WIDTH = 1400;
export const HANGTON_WIDE_MIN_ZOOM = 0.7;
const STEP = 0.02; // zoom moves in steps, so a scrollbar appearing or disappearing cannot make it flicker

/**
 * Zoom factor for a content area `width` CSS px wide.
 * @returns {number} between min and max, floored to a step; 1 when the width is unknown
 */
export function computeFitZoom({ width, design = HANGTON_DESIGN_WIDTH, min = HANGTON_MIN_ZOOM, max = HANGTON_MAX_ZOOM } = {}) {
  if (!(Number(width) > 0)) return 1;
  const raw = Math.min(max, Math.max(min, Number(width) / design));
  // floor to the step: the content is then never laid out narrower than the design width
  const stepped = Math.floor(raw / STEP + 1e-9) * STEP;
  return Math.round(Math.min(max, Math.max(min, stepped)) * 100) / 100;
}

/**
 * Keeps `zoom` in step with the width of the element that gets `fitRef` (a callback ref: the wrapper OUTSIDE the zoomed
 * content). A callback ref is needed because the page shows a loading / error / empty state first and mounts the
 * wrapper later: an effect keyed on a ref object would have run too early and never again.
 * Returns { fitRef, zoom }.
 */
export function useFitZoom(options = {}) {
  const [element, fitRef] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [extraSteps, setExtraSteps] = useState(0);
  const [tick, setTick] = useState(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!element) return undefined;
    const update = () => {
      const next = computeFitZoom({ width: element.clientWidth, ...optionsRef.current });
      setZoom((current) => (current === next ? current : next));
      setExtraSteps(0);
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, options.design, options.min]);

  // rows arrive after the wrapper mounted: look again whenever the content changes (once per frame at most)
  useEffect(() => {
    if (!element || typeof MutationObserver === 'undefined') return undefined;
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; setTick((n) => n + 1); });
    });
    observer.observe(element, { childList: true, subtree: true });
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [element]);

  // Safeguard: when the table inside still scrolls sideways at this zoom (the columns need more room than the design width
  // assumed), shrink one more step at a time until the whole table is in view or the minimum is reached.
  useEffect(() => {
    if (!element) return;
    const table = element.querySelector('[data-fit-table]');
    const min = optionsRef.current.min ?? HANGTON_MIN_ZOOM;
    if (table && table.scrollWidth > table.clientWidth + 1 && zoom - (extraSteps + 1) * STEP >= min - 1e-9) {
      setExtraSteps(extraSteps + 1);
    }
  }, [element, zoom, extraSteps, tick]);

  return { fitRef, zoom: Math.round((zoom - extraSteps * STEP) * 100) / 100 };
}
