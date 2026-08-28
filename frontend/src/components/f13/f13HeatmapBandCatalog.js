// Single source of truth for F1.3 Heatmap absolute color classification.
//
// Product Owner decision (2026-08-28): every F1.3 Heatmap — BCVH Ranking's monthly
// heatmap and Operation Dashboard's Heatmap/"Theo thứ" tabs — must classify color from
// the rate itself, never from a delta against a monthly (or any other) average. Average
// comparisons may still be shown as numbers/arrows/tooltips; they must never select color.
//
// This module is pure (no React, no fetch, no localStorage) so both
// `features/dashboard/components/*` and `features/ranking/*` can import it without a
// circular dependency. The default band set is the PO-approved 70/60/50 thresholds, but
// `classifyF13HeatmapRate()` accepts a `bands` override so a future Admin screen can plug
// in a different set without this module or its callers changing — no admin UI, API, or
// persisted config is added by this ticket; the override parameter only prepares for one.

export const F13_HEATMAP_UNAVAILABLE_BAND = Object.freeze({
  id: 'unavailable',
  label: 'Xám',
  tone: 'unavailable',
});

// Ordered list, most-preferred (highest quality) band first. `max` is exclusive except for
// the top band, which is unbounded (`Infinity`) so a rate of exactly 100 — or any value at
// or above the 70 floor — always classifies as green.
export const F13_HEATMAP_BANDS = Object.freeze([
  Object.freeze({ id: 'green', label: 'Xanh', min: 70, max: Infinity, tone: 'band-green' }),
  Object.freeze({ id: 'pink', label: 'Hồng', min: 60, max: 70, tone: 'band-pink' }),
  Object.freeze({ id: 'yellow', label: 'Vàng', min: 50, max: 60, tone: 'band-yellow' }),
  Object.freeze({ id: 'red', label: 'Đỏ', min: -Infinity, max: 50, tone: 'band-red' }),
]);

/**
 * Classify a rate (0-100 percentage) into one of `bands` (defaults to F13_HEATMAP_BANDS),
 * or F13_HEATMAP_UNAVAILABLE_BAND when the rate is null/undefined/NaN/non-finite.
 *
 * @param {number|null|undefined} rate
 * @param {Array<{id:string,label:string,min:number,max:number,tone:string}>} [bands]
 * @returns {{id:string,label:string,tone:string,min?:number,max?:number}}
 */
export function classifyF13HeatmapRate(rate, bands = F13_HEATMAP_BANDS) {
  if (rate === null || rate === undefined) return F13_HEATMAP_UNAVAILABLE_BAND;
  const numeric = Number(rate);
  if (!Number.isFinite(numeric)) return F13_HEATMAP_UNAVAILABLE_BAND;
  return bands.find((band) => numeric >= band.min && numeric < band.max) || F13_HEATMAP_UNAVAILABLE_BAND;
}

// Cell border/background/text classes, keyed by `tone`. Used for BCVH Ranking's monthly
// heatmap cells and Operation Dashboard's weekday-tab chip cells.
export const F13_HEATMAP_TONE_CLASS = Object.freeze({
  'band-green': 'border-emerald-300 bg-emerald-100 text-emerald-950 font-bold shadow-2xs hover:bg-emerald-200',
  'band-pink': 'border-pink-300 bg-pink-100 text-pink-950 font-bold shadow-2xs hover:bg-pink-200',
  'band-yellow': 'border-amber-300 bg-amber-100 text-amber-950 font-bold shadow-2xs hover:bg-amber-200',
  'band-red': 'border-red-300 bg-red-100 text-red-950 font-bold shadow-2xs hover:bg-red-200',
  unavailable: 'border-slate-200 bg-slate-50 text-slate-400 font-medium',
});

// Small dot/legend-swatch background classes, keyed by `tone`.
export const F13_HEATMAP_DOT_CLASS = Object.freeze({
  'band-green': 'bg-emerald-600',
  'band-pink': 'bg-pink-500',
  'band-yellow': 'bg-amber-500',
  'band-red': 'bg-red-600',
  unavailable: 'bg-slate-300',
});

// Raw hex equivalents of F13_HEATMAP_DOT_CLASS, keyed by `tone`, for contexts that render
// raw SVG (e.g. a recharts <Line> per-point dot `fill`) where a Tailwind `bg-*` utility
// class has no effect — SVG `fill` is a different CSS property than `background-color`.
// Values match Tailwind's emerald-600/pink-500/amber-500/red-600/slate-300 exactly.
export const F13_HEATMAP_HEX_COLOR = Object.freeze({
  'band-green': '#059669',
  'band-pink': '#ec4899',
  'band-yellow': '#f59e0b',
  'band-red': '#dc2626',
  unavailable: '#cbd5e1',
});

// Vietnamese legend copy, in display order (band list + unavailable). Component call
// sites may render their own wording for a specific screen's legend heading, but the
// band/description pairing itself is centralized here so it isn't duplicated ad hoc.
export const F13_HEATMAP_LEGEND = Object.freeze([
  Object.freeze({ tone: 'band-green', label: 'Xanh', description: 'KPI từ 70% trở lên' }),
  Object.freeze({ tone: 'band-pink', label: 'Hồng', description: 'KPI từ 60% đến dưới 70%' }),
  Object.freeze({ tone: 'band-yellow', label: 'Vàng', description: 'KPI từ 50% đến dưới 60%' }),
  Object.freeze({ tone: 'band-red', label: 'Đỏ', description: 'KPI dưới 50%' }),
  Object.freeze({ tone: 'unavailable', label: 'Xám', description: 'Chưa có dữ liệu' }),
]);

// --- Deprecated aliases (kept for compatibility; do not add new callers) -----------------
//
// APPROVED_WEEKDAY_BANDS / getApprovedWeekdayBand() previously lived in
// operatingPatternTabsData.js as their own, slightly different-shaped catalog (a `backendColor`
// override, `min`/`max: 100` instead of `Infinity`). They now alias this module so there is
// exactly one real threshold/color source; operatingPatternTabsData.js re-exports these names
// for existing imports and should not gain new independent band logic.

/** @deprecated Use F13_HEATMAP_BANDS. Same 4 bands, re-shaped with a `description` field for
 * legacy callers; kept only so existing imports of APPROVED_WEEKDAY_BANDS keep working. */
export const APPROVED_WEEKDAY_BANDS = Object.freeze(
  F13_HEATMAP_LEGEND.filter((entry) => entry.tone !== 'unavailable').map((entry) => {
    const band = F13_HEATMAP_BANDS.find((b) => b.tone === entry.tone);
    return Object.freeze({
      id: band.id,
      label: band.label,
      description: entry.description,
      min: band.min,
      max: band.max === Infinity ? 100 : band.max,
      tone: band.tone,
    });
  }),
);

/**
 * @deprecated Use classifyF13HeatmapRate(rate). Kept for existing callers; the optional
 * `backendColor` override is legacy behavior (trusting a backend-supplied color id) — new
 * code must not pass it, since Section 5 of the SSOT ticket forbids trusting backend `color`
 * over the rate itself.
 */
export function getApprovedWeekdayBand(rate, backendColor = null) {
  if (rate === null || rate === undefined) {
    return { id: 'unavailable', label: 'Chưa có dữ liệu', tone: 'unavailable' };
  }
  if (backendColor) {
    const colorBand = APPROVED_WEEKDAY_BANDS.find((band) => band.id === backendColor);
    if (colorBand) return colorBand;
  }
  const classified = classifyF13HeatmapRate(rate);
  if (classified.tone === 'unavailable') {
    return { id: 'unavailable', label: 'Chưa có dữ liệu', tone: 'unavailable' };
  }
  return APPROVED_WEEKDAY_BANDS.find((band) => band.tone === classified.tone) || APPROVED_WEEKDAY_BANDS[0];
}
