// HANGTON-INVENTORY-01 Phase 3: Pure level helpers, color scale, rank and formatting.
// Decisions D1-D3, D10-D11:
// - Scope includes all 9 levels: '<1 ngày', '≥1 ngày', '≥1.5 ngày', '≥2 ngày', '≥3 ngày', '≥4 ngày', '≥5 ngày', '≥7 ngày', '≥14 ngày'.
// - D10: Alert threshold per level; from ≥5 ngày up it is a heavier alert, again heavier at ≥7 and ≥14.
// - D11: Colour RED, deeper with longer stock age (≥1 lightest … ≥14 darkest); no numerical alert thresholds invented (O2 open).
// - Target: D4 runs stock aged ≥5 ngày to 0.

export const TON_LEVELS = Object.freeze([
  '<1 ngày',
  '≥1 ngày',
  '≥1.5 ngày',
  '≥2 ngày',
  '≥3 ngày',
  '≥4 ngày',
  '≥5 ngày',
  '≥7 ngày',
  '≥14 ngày',
]);

export const TON_LEVEL_CONFIG = Object.freeze({
  '<1 ngày': Object.freeze({
    level: '<1 ngày',
    rank: 0,
    shortLabel: '<1 ngày',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-200',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    chartColor: '#94A3B8',
    isAlert: false,
    alertWeight: 'none',
  }),
  '≥1 ngày': Object.freeze({
    level: '≥1 ngày',
    rank: 1,
    shortLabel: '≥1 ngày',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    chartColor: '#FCA5A5',
    isAlert: false,
    alertWeight: 'light',
  }),
  '≥1.5 ngày': Object.freeze({
    level: '≥1.5 ngày',
    rank: 1.5,
    shortLabel: '≥1.5 ngày',
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    borderClass: 'border-red-200',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    chartColor: '#F87171',
    isAlert: false,
    alertWeight: 'light',
  }),
  '≥2 ngày': Object.freeze({
    level: '≥2 ngày',
    rank: 2,
    shortLabel: '≥2 ngày',
    bgClass: 'bg-red-200/70',
    textClass: 'text-red-900',
    borderClass: 'border-red-300',
    badgeClass: 'bg-red-200/70 text-red-900 border-red-300',
    chartColor: '#EF4444',
    isAlert: false,
    alertWeight: 'medium-low',
  }),
  '≥3 ngày': Object.freeze({
    level: '≥3 ngày',
    rank: 3,
    shortLabel: '≥3 ngày',
    bgClass: 'bg-red-300/70',
    textClass: 'text-red-950',
    borderClass: 'border-red-400',
    badgeClass: 'bg-red-300/70 text-red-950 border-red-400',
    chartColor: '#DC2626',
    isAlert: false,
    alertWeight: 'medium',
  }),
  '≥4 ngày': Object.freeze({
    level: '≥4 ngày',
    rank: 4,
    shortLabel: '≥4 ngày',
    bgClass: 'bg-red-400/80',
    textClass: 'text-white font-medium',
    borderClass: 'border-red-500',
    badgeClass: 'bg-red-400/80 text-white font-medium border-red-500',
    chartColor: '#B91C1C',
    isAlert: false,
    alertWeight: 'medium-high',
  }),
  '≥5 ngày': Object.freeze({
    level: '≥5 ngày',
    rank: 5,
    shortLabel: '≥5 ngày',
    bgClass: 'bg-red-600',
    textClass: 'text-white font-bold',
    borderClass: 'border-red-700 shadow-2xs',
    badgeClass: 'bg-red-600 text-white font-bold border-red-700 shadow-2xs',
    chartColor: '#991B1B',
    isAlert: true,
    alertWeight: 'heavy',
  }),
  '≥7 ngày': Object.freeze({
    level: '≥7 ngày',
    rank: 7,
    shortLabel: '≥7 ngày',
    bgClass: 'bg-red-700',
    textClass: 'text-white font-extrabold',
    borderClass: 'border-red-800 shadow-xs',
    badgeClass: 'bg-red-700 text-white font-extrabold border-red-800 shadow-xs',
    chartColor: '#7F1D1D',
    isAlert: true,
    alertWeight: 'heavier',
  }),
  '≥14 ngày': Object.freeze({
    level: '≥14 ngày',
    rank: 14,
    shortLabel: '≥14 ngày',
    bgClass: 'bg-red-900',
    textClass: 'text-red-100 font-black',
    borderClass: 'border-red-950 shadow-sm',
    badgeClass: 'bg-red-900 text-red-100 font-black border-red-950 shadow-sm',
    chartColor: '#450A0A',
    isAlert: true,
    alertWeight: 'heaviest',
  }),
});

export const SLOTS = Object.freeze(['0730', '1130', '2100']);

export const TARGET_GE5 = 0; // PO Decision D4: Target TCT runs stock aged >= 5 days to 0

/**
 * Extract numeric rank from level string.
 * '<1 ngày' -> 0, '≥1 ngày' -> 1, '≥1.5 ngày' -> 1.5, ..., '≥14 ngày' -> 14
 */
export function tonRank(level) {
  const text = String(level || '').trim();
  if (!text) return null;
  if (text.startsWith('<')) return 0;
  const m = text.match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1].replace(',', '.')) : null;
}

/**
 * Standardize level string to one of the canonical 9 TON_LEVELS.
 */
export function canonicalLevel(level) {
  const text = String(level || '').trim();
  if (TON_LEVEL_CONFIG[text]) return text;
  const rank = tonRank(text);
  if (rank === null) return '<1 ngày';
  if (rank >= 14) return '≥14 ngày';
  if (rank >= 7) return '≥7 ngày';
  if (rank >= 5) return '≥5 ngày';
  if (rank >= 4) return '≥4 ngày';
  if (rank >= 3) return '≥3 ngày';
  if (rank >= 2) return '≥2 ngày';
  if (rank >= 1.5) return '≥1.5 ngày';
  if (rank >= 1) return '≥1 ngày';
  return '<1 ngày';
}

export function getLevelConfig(level) {
  const canon = canonicalLevel(level);
  return TON_LEVEL_CONFIG[canon] || TON_LEVEL_CONFIG['<1 ngày'];
}

export function isGe5Level(level) {
  const rank = tonRank(level);
  return rank !== null && rank >= 5;
}

/**
 * Format slot to standard human-readable Vietnamese time.
 * '0730' -> '07:30', '1130' -> '11:30', '2100' -> '21:00'
 */
export function formatSlot(slot) {
  const s = String(slot || '').trim();
  if (s.length === 4) {
    return `${s.slice(0, 2)}:${s.slice(2)}`;
  }
  return s;
}

/**
 * Format snapshot label for picker / caption.
 */
export function formatSnapshotLabel(snapshot) {
  if (!snapshot) return 'Chưa chọn mốc';
  const date = snapshot.business_date || '';
  const slotStr = formatSlot(snapshot.slot);
  const stale = snapshot.is_stale ? ' (chưa cập nhật)' : '';
  return `${date} ${slotStr}${stale}`;
}

/**
 * Format integers with dot thousand separators.
 */
export function formatNumber(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(n));
}

/**
 * Format currency in VND.
 */
export function formatCurrency(val) {
  const n = Number(val);
  if (!Number.isFinite(n) || n === 0) return '0 ₫';
  // non-breaking space: the currency sign never wraps onto a line of its own
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;
}

/**
 * Format delta count with leading sign: +5, -3, 0.
 */
export function formatDelta(val) {
  const n = Number(val);
  if (!Number.isFinite(n) || n === 0) return '0';
  return n > 0 ? `+${formatNumber(n)}` : `${formatNumber(n)}`;
}

/**
 * Comparison figures exist only when a base snapshot was found (compare = { from, to, summary, ... }).
 * Without one, show a dash instead of a misleading 0.
 */
export function hasCompareBase(compare) {
  return Boolean(compare && compare.from && compare.summary);
}

export function compareValue(compare, key) {
  return hasCompareBase(compare) ? formatNumber(compare.summary[key]) : '—';
}

export const NO_BASE_NOTE = 'Chưa có mốc so sánh: cần một snapshot cùng khung giờ của ngày trước. Các số biến động sẽ hiện khi có mốc đó.';

// Column hiding for the "Theo bưu cục" table (hide the low-age levels to read the heavy ones at a glance).
export const COLUMN_PRESETS = Object.freeze([
  { id: 'all', label: 'Tất cả mức', minRank: -1 },
  { id: 'ge3', label: 'Từ ≥3 ngày', minRank: 3 },
  { id: 'ge5', label: 'Từ ≥5 ngày', minRank: 5 },
]);

export function presetHiddenLevels(presetId) {
  const preset = COLUMN_PRESETS.find((p) => p.id === presetId) || COLUMN_PRESETS[0];
  return TON_LEVELS.filter((lvl) => tonRank(lvl) < preset.minRank);
}

export function visibleLevels(hidden = []) {
  return TON_LEVELS.filter((lvl) => !hidden.includes(lvl));
}

export function toggleHiddenLevel(hidden = [], level) {
  const next = hidden.includes(level) ? hidden.filter((l) => l !== level) : [...hidden, level];
  return TON_LEVELS.filter((l) => next.includes(l));
}

export function activePresetId(hidden = []) {
  const sorted = [...hidden].sort().join('|');
  const hit = COLUMN_PRESETS.find((p) => [...presetHiddenLevels(p.id)].sort().join('|') === sorted);
  return hit ? hit.id : null;
}

// Stored hidden levels: only canonical levels survive (corrupt or old values are dropped).
export function sanitizeHiddenLevels(value) {
  return Array.isArray(value) ? TON_LEVELS.filter((lvl) => value.includes(lvl)) : [];
}

// The levels whose rank is at least `minRank` (e.g. 5 -> ≥5, ≥7, ≥14 ngày): used when a screen opens the parcel list of heavy stock.
export function levelsFromRank(minRank) {
  const min = Number(minRank);
  if (!Number.isFinite(min)) return [];
  return TON_LEVELS.filter((lvl) => tonRank(lvl) >= min);
}
