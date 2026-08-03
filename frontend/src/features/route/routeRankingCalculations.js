export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatRate(value) {
  return `${toNumber(value).toFixed(1)}%`;
}

export function sortableValue(row, key) {
  if (key === 'failed') return toNumber(row.failed ?? row.total_failed);
  return toNumber(row[key]);
}

export function applyRouteFilters(rows, { search = '', onlyFailed = false } = {}) {
  let list = [...rows];
  const query = search.trim().toLowerCase();
  if (query) {
    list = list.filter((item) => (item.name || item.ten_tuyen || item.code || '').toLowerCase().includes(query));
  }
  if (onlyFailed) {
    list = list.filter((item) => toNumber(item.failed ?? item.total_failed) > 0);
  }
  return list;
}

export function sortRouteRows(rows, sortState) {
  const factor = sortState?.dir === 'asc' ? 1 : -1;
  const key = sortState?.key || 'passed_rate';
  return [...rows].sort((a, b) => (sortableValue(a, key) - sortableValue(b, key)) * factor);
}

export function computeRouteKpiStats(rows) {
  const totalBg = rows.reduce((sum, item) => sum + toNumber(item.total_bg), 0);
  const totalPassed = rows.reduce((sum, item) => sum + toNumber(item.passed), 0);
  const totalFailed = rows.reduce((sum, item) => sum + toNumber(item.failed ?? item.total_failed), 0);
  const failedRouteCount = rows.filter((item) => toNumber(item.failed ?? item.total_failed) > 0).length;
  return {
    failedRouteCount,
    bcvhPassedRate: totalBg > 0 ? (totalPassed / totalBg) * 100 : 0,
    totalFailed,
    totalRoutes: rows.length,
  };
}

export function resolveDefaultRouteDate({ param, metaMaxDate }) {
  return param || metaMaxDate || '';
}
