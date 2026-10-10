// F41-DASHBOARD-RANKING-01 (T3) - indicator configuration for the shared Operation
// Dashboard / BCVH Ranking blocks. The default is F1.3, so F1.3 behaves exactly as before;
// F4.1 swaps the API prefix, KPI endpoint, colour thresholds, labels and hides the blocks
// that need data F4.1 does not have (routes, late-cash, rules, operating pattern).
//
// Pure module: no state. A page learns its indicator from `IndicatorProvider` (React context,
// default F1.3) and hands it explicitly to whatever needs it (API wrapper, band lookups,
// labels). There is deliberately no module-level "current indicator" (review T8-F41-B1).
//
// PO decisions (2026-10-08): F4.1 colour bands are the F1.3 colours with every threshold
// +10 points (green >= 80, pink 70-80, yellow 60-70, red < 60); the chart target line stays
// 90% for both indicators. PO decision 2026-10-10: F1.1 targets 95%, so the target is now a setting of the
// indicator (targetRate): F1.3 and F4.1 stay at 90, F1.1 uses 95.

import { buildHeatmapBands } from '../../components/f13/f13HeatmapBandCatalog.js';

const COMMON_ENDPOINTS = Object.freeze({
  meta: '/dashboard/meta',
  kpi: '/dashboard/kpi',
  dailyTrend: '/dashboard/daily-trend',
  ranking: '/ranking/bcvh',
  overview: '/ranking/bcvh/overview',
  weeks: '/ranking/bcvh/weeks',
  weeklyComparison: '/ranking/bcvh/weekly-comparison',
  weeklyTrend: '/ranking/bcvh/weekly-trend',
  months: '/ranking/bcvh/months',
  monthlyComparison: '/ranking/bcvh/monthly-comparison',
});

// KPI status labels of the BCVH table, keyed by the same floors as the heatmap.
function buildKpiStatusBands(floors) {
  return Object.freeze([
    Object.freeze({ min: floors[0], id: 'green', label: 'Tốt', tone: 'success' }),
    Object.freeze({ min: floors[1], id: 'pink', label: 'Cần chú ý', tone: 'info' }),
    Object.freeze({ min: floors[2], id: 'yellow', label: 'Cảnh báo', tone: 'warning' }),
    Object.freeze({ min: -Infinity, id: 'red', label: 'Rủi ro cao', tone: 'danger' }),
  ]);
}

export const DEFAULT_TARGET_RATE = 90;

export const F13_INDICATOR = Object.freeze({
  id: 'f13',
  moduleLabel: 'F1.3',
  apiBase: '/f13',
  routes: Object.freeze({ dashboard: '/f13/dashboard', ranking: '/f13/ranking/bcvh' }),
  endpoints: COMMON_ENDPOINTS,
  targetRate: 90,
  heatmapFloors: Object.freeze([70, 60, 50]),
  heatmapBands: buildHeatmapBands([70, 60, 50]),
  kpiStatusBands: buildKpiStatusBands([70, 60, 50]),
  features: Object.freeze({ routes: true, lateCash: true, operatingPattern: true, actionCenter: true }),
});

export const F41_INDICATOR = Object.freeze({
  id: 'f41',
  moduleLabel: 'F4.1',
  apiBase: '/f41',
  routes: Object.freeze({ dashboard: '/f41/dashboard', ranking: '/f41/ranking/bcvh' }),
  endpoints: Object.freeze({ ...COMMON_ENDPOINTS, kpi: '/dashboard/summary' }),
  targetRate: 90,
  heatmapFloors: Object.freeze([80, 70, 60]),
  heatmapBands: buildHeatmapBands([80, 70, 60]),
  kpiStatusBands: buildKpiStatusBands([80, 70, 60]),
  // F4.1 has no route dimension (PO-4, D-13) and the PO scoped this release to tables and
  // day/week/month charts: no route blocks, no late-cash (PO-5: Evidence phase), no rule-based
  // Action Center, no operating pattern.
  features: Object.freeze({ routes: false, lateCash: false, operatingPattern: false, actionCenter: false }),
});

export const F11_INDICATOR = Object.freeze({
  id: 'f11',
  moduleLabel: 'F1.1',
  apiBase: '/f11',
  routes: Object.freeze({ dashboard: '/f11/dashboard', ranking: '/f11/ranking/bcvh' }),
  endpoints: Object.freeze({
    ...COMMON_ENDPOINTS,
    kpi: '/dashboard/summary',
    nationalRanking: '/dashboard/national-ranking',
    pairTable: '/dashboard/pair-table',
  }),
  targetRate: 95,
  heatmapFloors: Object.freeze([70, 60, 50]),
  heatmapBands: buildHeatmapBands([70, 60, 50]),
  kpiStatusBands: buildKpiStatusBands([70, 60, 50]),
  features: Object.freeze({
    routes: false,
    lateCash: false,
    operatingPattern: false,
    actionCenter: false,
    pairTable: true,
  }),
});

export const INDICATORS = Object.freeze({ f11: F11_INDICATOR, f13: F13_INDICATOR, f41: F41_INDICATOR });

// Target line of the quality charts, in percent (F1.3 / F4.1: 90, F1.1: 95).
export function indicatorTargetRate(indicator = F13_INDICATOR) {
  return Number.isFinite(indicator?.targetRate) ? indicator.targetRate : DEFAULT_TARGET_RATE;
}

// Full API path for a named endpoint of an indicator.
export function indicatorEndpoint(key, indicator = F13_INDICATOR) {
  const path = indicator.endpoints[key];
  if (!path) throw new Error(`Unknown indicator endpoint: ${key}`);
  return `${indicator.apiBase}${path}`;
}

// Replaces the F1.3 module name inside a UI string with the indicator's; the source strings
// stay F1.3 wording, so F1.3 output (and its contract tests) is unchanged.
export function indicatorLabel(text, indicator = F13_INDICATOR) {
  return String(text).replaceAll('F1.3', indicator.moduleLabel);
}

// Rewrites a shared report URL written for F1.3 ('/f13/ranking/bcvh/overview?...') to the
// given indicator. Used by the indicator-scoped API wrapper so the report blocks keep their
// F1.3 call sites. URLs outside the shared report set pass through unchanged.
export function rewriteIndicatorUrl(url, indicator = F13_INDICATOR) {
  if (!indicator || indicator.id === F13_INDICATOR.id || typeof url !== 'string') return url;
  const queryAt = url.indexOf('?');
  const path = queryAt === -1 ? url : url.slice(0, queryAt);
  const query = queryAt === -1 ? '' : url.slice(queryAt);
  const key = Object.keys(F13_INDICATOR.endpoints)
    .find((name) => `${F13_INDICATOR.apiBase}${F13_INDICATOR.endpoints[name]}` === path);
  return key ? `${indicatorEndpoint(key, indicator)}${query}` : url;
}

// Percent-threshold legend lines for the monthly heatmap ("Tỷ lệ từ 70% trở lên", ...).
export function buildMonthlyHeatmapLegend(indicator = F13_INDICATOR) {
  const [green, pink, yellow] = indicator.heatmapFloors;
  return [
    { tone: 'band-green', label: 'Xanh', description: `Tỷ lệ từ ${green}% trở lên` },
    { tone: 'band-pink', label: 'Hồng', description: `Từ ${pink}% đến dưới ${green}%` },
    { tone: 'band-yellow', label: 'Vàng', description: `Từ ${yellow}% đến dưới ${pink}%` },
    { tone: 'band-red', label: 'Đỏ', description: `Dưới ${yellow}%` },
    { tone: 'unavailable', label: 'Xám', description: 'Chưa có dữ liệu' },
  ];
}
