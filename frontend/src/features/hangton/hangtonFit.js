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
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!element) return undefined;
    const update = () => {
      const next = computeFitZoom({ width: element.clientWidth, ...optionsRef.current });
      setZoom((current) => (current === next ? current : next));
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { fitRef, zoom };
}
