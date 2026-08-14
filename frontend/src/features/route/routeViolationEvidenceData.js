// fact_f13 event timestamps are stored as 'dd/MM/yyyy HH:mm:ss', which `new Date(string)`
// cannot parse (returns Invalid Date). Parse explicitly instead.
export function parseF13Timestamp(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  return Number.isNaN(date.getTime()) ? null : date;
}

// A missing/unavailable delay must render as an explicit "no data" label, never "0h".
export function formatDelayLabel(doTreGio) {
  if (doTreGio === null || doTreGio === undefined) return 'Chưa đủ dữ liệu';
  return `${Number(doTreGio).toFixed(1)}h`;
}

// Phase 3 (F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md Section 3.1): Tuyến Ranking's
// drill-down leads directly into the merged Evidence screen, not the old standalone
// violations page. Both `from_date` and `to_date` are sent with the identical
// `analysisDate` value — Evidence never reads a bare `date` param, so omitting either
// would silently fall back to the newest imported day instead of the exact row clicked.
// `reason` defaults to `delayed_cash` so the manager lands on the same default group the
// old screen opened on, per the locked contract.
export function buildViolationEvidenceLink({ analysisDate, bcvhId, bcvhName, routeId, routeName, currentSearch, reason = 'delayed_cash' }) {
  const params = new URLSearchParams();
  if (analysisDate) {
    params.set('from_date', analysisDate);
    params.set('to_date', analysisDate);
  }
  if (bcvhId) params.set('bcvh_id', bcvhId);
  if (bcvhName) params.set('bcvh_name', bcvhName);
  if (routeId) params.set('route_id', routeId);
  if (routeName) params.set('route_name', routeName);
  if (reason) params.set('reason', reason);
  if (currentSearch) params.set('return_to', currentSearch);
  return `/f13/evidence?${params.toString()}`;
}

// Phase 3, Task 4 point 2: translates an old `/f13/ranking/route/violations` bookmark's
// dialect into the new `/f13/evidence` dialect, for the translating redirect. `date`
// becomes both `from_date` and `to_date` (the identical value — the single-day contract
// is unchanged, only the parameter name changes); `bcvh_id`/`bcvh_name`/`route_id`/
// `route_name`/`reason`/`return_to` pass through unchanged. An old bookmark therefore
// lands on the exact day it was saved for, never silently on the newest imported day.
export function translateLegacyViolationsSearch(search) {
  const oldParams = new URLSearchParams(search);
  const newParams = new URLSearchParams();

  const date = oldParams.get('date');
  if (date) {
    newParams.set('from_date', date);
    newParams.set('to_date', date);
  }

  ['bcvh_id', 'bcvh_name', 'route_id', 'route_name', 'reason', 'return_to'].forEach((key) => {
    const value = oldParams.get(key);
    if (value) newParams.set(key, value);
  });

  return newParams.toString();
}

export function buildBackToRouteRankingLink(returnToParam) {
  if (!returnToParam) return '/f13/ranking/route';
  const decoded = returnToParam.startsWith('?') ? returnToParam : `?${returnToParam}`;
  return `/f13/ranking/route${decoded}`;
}

export function mapViolationRows(rows = []) {
  return rows.map((item) => ({
    id: item.ma_bg,
    ma_bg: item.ma_bg,
    status: item.danh_gia_2026 || null,
    pickupTime: item.thoi_gian_ptc || null,
    handoverTime: item.thoi_gian_nop_tien || null,
    delayHours: item.do_tre_gio ?? null,
    delayLabel: formatDelayLabel(item.do_tre_gio),
    violationReason: item.violation_reason || null,
  }));
}

// Chậm nộp tiền is listed first and marked as the highlighted default group, per PO
// requirement. Counts come straight from the backend's violation_summary — never
// recomputed client-side from the (possibly paginated) row list.
export function buildViolationGroupTabs(summary = {}) {
  const totalFailed = summary.total_failed ?? 0;
  const delayedCashCount = summary.delayed_cash_count ?? 0;
  const otherFailedCount = summary.other_failed_count ?? 0;
  const unknownCount = summary.unknown_count ?? 0;

  return [
    { slug: 'delayed_cash', label: 'Chậm nộp tiền', count: delayedCashCount, highlight: true },
    { slug: 'other', label: 'Không đạt khác', count: otherFailedCount, highlight: false },
    { slug: 'unknown', label: 'Chưa xác định nguyên nhân', count: unknownCount, highlight: false },
    { slug: 'all', label: 'Tất cả không đạt', count: totalFailed, highlight: false },
  ];
}
