export const F13_CROSS_MODULE_PATHS = [
  '/f13/dashboard',
  '/f13/ranking/bcvh',
  '/f13/ranking/route',
];

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
