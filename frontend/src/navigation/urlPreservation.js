export const F13_CROSS_MODULE_PATHS = [
  '/f13/dashboard',
  '/f13/v2/tuan',
  '/f13/v2/why',
];

// A menu item is lit on its own path and on the tabs of its page (Kết quả chất lượng: Theo ngày / tuần / tháng).
export function isNavItemActive(item, pathname) {
  return pathname === item?.path || Boolean(item?.activePaths?.includes(pathname));
}

// The old F1.3 Bảng điều hành is retired (PO 2026-11-03): an old link or bookmark opens Theo ngày on the same day and unit.
export function translateLegacyF13DashboardSearch(search) {
  const params = new globalThis.URLSearchParams(search);
  const translated = new globalThis.URLSearchParams();
  const fromDate = params.get('from_date');
  const toDate = params.get('to_date');
  const bcvh = params.get('bcvh_id') || params.get('ma_bcvh');
  if (fromDate && toDate) {
    translated.set('from', fromDate);
    translated.set('to', toDate);
  }
  if (bcvh && bcvh !== 'all') translated.set('bcvh', bcvh);
  const query = translated.toString();
  return query ? `?${query}` : '';
}

/**
 * Resolves a calendar date (YYYY-MM-DD) to its ISO-8601 week identifier (YYYY-Www).
 */
export function isoWeekFromDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString.trim());
  if (!match) return '';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return '';
  }
  const dayNum = date.getUTCDay() || 7; // Mon=1 .. Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum); // Nearest Thursday (ISO 8601)
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}

// The old So sánh BCVH (/f13/ranking/bcvh) is retired (G6, F13-RETIRE-01 §7): an old link opens Theo tuần on the ISO week of from_date and the same unit.
export function translateLegacyF13BcvhSearch(search) {
  const params = new globalThis.URLSearchParams(search);
  const translated = new globalThis.URLSearchParams();
  const week = params.get('week') || isoWeekFromDate(params.get('from_date') || params.get('from'));
  const bcvh = params.get('bcvh_id') || params.get('ma_bcvh') || params.get('bcvh');
  if (week) translated.set('week', week);
  if (bcvh && bcvh !== 'all') translated.set('bcvh', bcvh);
  const query = translated.toString();
  return query ? `?${query}` : '';
}

// The old F1.3 Phân tích tuyến phát (/f13/ranking/route) is retired (G6): its link opens Phân tích nguyên nhân on the same period, unit and route.
export function translateLegacyF13RouteSearch(search) {
  const params = new globalThis.URLSearchParams(search);
  const translated = new globalThis.URLSearchParams(translateLegacyF13DashboardSearch(search));
  const route = params.get('route_id');
  if (route && route !== 'all') translated.set('route', route);
  const query = translated.toString();
  return query ? `?${query}` : '';
}

// The old /f13/evidence page (ShipmentPerformancePage) is replaced by /f13/v2/evidence (PO 2026-11-06): an old link keeps its period and unit.
// from_date/to_date -> from/to, bcvh_id -> bcvh, route_id -> route, status failed/passed -> verdict, shipment_id (or search) -> search.
// Names, sort, paging, reason, period and return_to have no equivalent in the new page and are dropped; status all/returned means no verdict.
export function translateLegacyEvidenceSearch(search) {
  const params = new globalThis.URLSearchParams(search);
  const translated = new globalThis.URLSearchParams();
  const fromDate = params.get('from_date') || params.get('date') || params.get('to_date');
  const toDate = params.get('to_date') || params.get('date') || params.get('from_date');
  if (fromDate) translated.set('from', fromDate);
  if (toDate) translated.set('to', toDate);
  const bcvh = params.get('bcvh_id') || params.get('ma_bcvh');
  if (bcvh && bcvh !== 'all') translated.set('bcvh', bcvh);
  const route = params.get('route_id');
  if (route && route !== 'all') translated.set('route', route);
  const verdict = { failed: 'Không đạt', passed: 'Đạt' }[params.get('status')];
  if (verdict) translated.set('verdict', verdict);
  const needle = params.get('shipment_id') || params.get('search');
  if (needle) translated.set('search', needle);
  const query = translated.toString();
  return query ? `?${query}` : '';
}

export function buildPreservedSearchString(searchParamsOrString) {
  const params = typeof searchParamsOrString === 'string'
    ? new globalThis.URLSearchParams(searchParamsOrString)
    : new globalThis.URLSearchParams(searchParamsOrString);

  const preserved = new globalThis.URLSearchParams();

  const fromDate = params.get('from_date');
  if (fromDate) preserved.set('from_date', fromDate);

  const toDate = params.get('to_date');
  if (toDate) preserved.set('to_date', toDate);

  const bcvhId = params.get('bcvh_id') || params.get('ma_bcvh');
  if (bcvhId && bcvhId !== 'all') {
    preserved.set('bcvh_id', bcvhId);
  }

  const searchStr = preserved.toString();
  return searchStr ? `?${searchStr}` : '';
}

export function buildPreservedPath(targetPath, currentSearchParams) {
  if (!F13_CROSS_MODULE_PATHS.includes(targetPath)) {
    return targetPath;
  }
  const query = buildPreservedSearchString(currentSearchParams);
  return `${targetPath}${query}`;
}
