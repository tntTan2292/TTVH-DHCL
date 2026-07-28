export const ROUTE_TYPE_FILTERS = [
  { value: 'postman', label: 'Tuyến bưu tá' },
  { value: 'all', label: 'Tất cả' },
];

export const DEFAULT_ROUTE_TYPE_FILTER = 'postman';

export function normalizeRouteTypeFilter(value) {
  return ROUTE_TYPE_FILTERS.some((item) => item.value === value) ? value : DEFAULT_ROUTE_TYPE_FILTER;
}
