export const F13_CROSS_MODULE_PATHS = [
  '/f13/dashboard',
  '/f13/ranking/bcvh',
  '/f13/ranking/route',
];

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
