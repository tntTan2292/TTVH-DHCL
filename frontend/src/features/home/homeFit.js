// HOME-BI-02 - how the Home page scales to the screen (PO 2026-10-22: it must adapt by itself, laptop to a
// 51 / 62 inch TV; nobody should have to redo the layout per screen).
//
// The layout is designed for a fixed logical width and is then enlarged / reduced as a whole with CSS zoom, so
// every screen sees the same proportions and nothing wraps or clips differently:
//   normal mode - a laptop or desktop window: reduced a little when narrower than the design width (so the
//                 blocks never get squeezed), never enlarged (a 1080p desktop keeps today's look);
//   TV mode     - a TV or a wall display: enlarged so the whole dashboard fills the screen without scrolling.
//                 Switched on with the "Chế độ TV" button, and automatically on very wide screens
//                 (a 4K TV opened at 100 % is about 3840 CSS px wide; a 2560 px monitor stays in normal mode).

export const NORMAL_DESIGN_WIDTH = 1400;
export const NORMAL_MIN_ZOOM = 0.7;
export const NORMAL_MAX_ZOOM = 1;

// Logical size the whole dashboard needs to be seen at once (measured: about 1100 px tall at 1900-2000 px wide).
export const TV_DESIGN_WIDTH = 1500;
export const TV_DESIGN_HEIGHT = 1100;
export const TV_MIN_ZOOM = 0.8;
export const TV_MAX_ZOOM = 4;

// A page this wide is a TV or a wall display, not a laptop: scale it up on its own.
export const TV_AUTO_WIDTH = 3000;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Zoom factor of the page.
 * @param {{ width: number, height?: number, tv?: boolean }} screen width / height available to the page, in CSS px
 */
export function computeHomeZoom({ width, height = 0, tv = false } = {}) {
  if (!(width > 0)) return 1;
  let zoom;
  if (tv && height > 0) {
    zoom = clamp(Math.min(width / TV_DESIGN_WIDTH, height / TV_DESIGN_HEIGHT), TV_MIN_ZOOM, TV_MAX_ZOOM);
  } else if (tv) {
    zoom = clamp(width / TV_DESIGN_WIDTH, TV_MIN_ZOOM, TV_MAX_ZOOM);
  } else {
    zoom = clamp(width / NORMAL_DESIGN_WIDTH, NORMAL_MIN_ZOOM, NORMAL_MAX_ZOOM);
  }
  return Math.round(zoom * 100) / 100;
}

/** True when the page should run in TV mode on its own (very wide screen). */
export function isAutoTv(viewportWidth) {
  return Number(viewportWidth) >= TV_AUTO_WIDTH;
}
