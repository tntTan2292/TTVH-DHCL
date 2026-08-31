export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatRate(value) {
  return `${toNumber(value).toFixed(1)}%`;
}

// Distinguishes a genuine 0% (backend returned a real number) from an unavailable
// rate (backend returned null/undefined) — 0% must render as valid data, not as "—".
export function formatDelayedCashRate(value) {
  if (value === null || value === undefined) return '—';
  return formatRate(value);
}

export function sortableValue(row, key) {
  if (key === 'failed') return toNumber(row.failed ?? row.total_failed);
  return toNumber(row[key]);
}

// ITR-BLOCK-02 (F13-ROUTE-RANKING-PERIOD-01 Independent Technical Review): `day_rate`/
// `passed_rate` are `null` exactly when a route had no activity on the anchor day at all
// (Design of Record §4.4/T-01) — a route that never ran is "khác hoàn toàn" from one that ran
// and scored a genuine 0%. `sortableValue()` coercing that `null` to `0` via `toNumber()` made
// no-data routes sort as if they were the worst-performing routes, ahead of routes that
// genuinely scored 0% or low-but-real rates. Restricted to the two fields this finding
// reproduced against ("Tỷ lệ ngày") — other nullable fields (`month_rate`, `previous_month_rate`,
// `delta`, day-scoped counts like `total_bg`/`passed`/`failed`) are unchanged, out of this
// remediation's scope.
const NULLABLE_RATE_SORT_KEYS = new Set(['day_rate', 'passed_rate']);

function isMissingRate(row, key) {
  return NULLABLE_RATE_SORT_KEYS.has(key) && (row[key] === null || row[key] === undefined);
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
  const dir = sortState?.dir || 'asc';
  const factor = dir === 'asc' ? 1 : -1;
  const key = sortState?.key || 'passed_rate';
  return [...rows].sort((a, b) => {
    // ITR-BLOCK-02: a route with no data on the anchor day is always last, in both sort
    // directions — never coerced into competing with real rates via toNumber(null) === 0.
    const missingA = isMissingRate(a, key);
    const missingB = isMissingRate(b, key);
    if (missingA !== missingB) return missingA ? 1 : -1;

    const valA = sortableValue(a, key);
    const valB = sortableValue(b, key);
    if (valA !== valB) {
      return (valA - valB) * factor;
    }
    // Tie-breaker: If key is passed_rate or equal values, prioritize higher failed count
    const failedA = sortableValue(a, 'failed');
    const failedB = sortableValue(b, 'failed');
    return failedB - failedA;
  });
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

// Binds the "BG CHẬM NỘP TIỀN" KPI widget strictly to the backend's
// meta.delayed_cash_handover_summary — never recomputed from page rows, never averaged,
// never delayed_count/total_bg. A missing/absent summary (contract unavailable) renders
// "—", not a fabricated 0; a real zero-denominator summary renders 0/0.0% as valid data.
export function computeDelayedCashWidget(summary) {
  const count = summary?.delayed_cash_handover_count;
  if (count === null || count === undefined) {
    return { value: '—', delta: '—' };
  }
  const eligible = toNumber(summary.delayed_cash_handover_eligible_count);
  const rate = formatDelayedCashRate(summary.f13_303_rate);
  return {
    value: toNumber(count).toLocaleString('vi-VN'),
    delta: `${rate} / ${eligible.toLocaleString('vi-VN')} BG thuộc mẫu`,
  };
}
