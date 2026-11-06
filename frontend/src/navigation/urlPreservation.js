export const F13_CROSS_MODULE_PATHS = [
  '/f13/dashboard',
  '/f13/ranking/bcvh',
  '/f13/ranking/route',
];

// A menu item is lit on its own path and on the tabs of its page (Kết quả chất lượng: Theo ngày / tuần / tháng).
export function isNavItemActive(item, pathname) {
  return pathname === item?.path || Boolean(item?.activePaths?.includes(pathname));
}

// The old F1.3 Bảng điều hành is retired (PO 2026-11-03): an old link or bookmark opens Theo ngày on the same day and unit.
export function translateLegacyF13DashboardSearch(search) {
  const params = new URLSearchParams(search);
  const translated = new URLSearchParams();
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

// The old /f13/evidence page (ShipmentPerformancePage) is replaced by /f13/v2/evidence (PO 2026-11-06): an old link keeps its period and unit.
// from_date/to_date -> from/to, bcvh_id -> bcvh, route_id -> route, status failed/passed -> verdict, shipment_id (or search) -> search.
// Names, sort, paging, reason, period and return_to have no equivalent in the new page and are dropped; status all/returned means no verdict.
export function translateLegacyEvidenceSearch(search) {
  const params = new URLSearchParams(search);
  const translated = new URLSearchParams();
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
    ? new URLSearchParams(searchParamsOrString)
    : new URLSearchParams(searchParamsOrString);

  const preserved = new URLSearchParams();

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
