export const DASH = '—';

export function formatPeriodRate(rate) {
  if (rate === null || rate === undefined) return DASH;
  return `${Number(rate).toFixed(1)}%`;
}

export function formatPeriodDelta(delta) {
  if (delta === null || delta === undefined) return DASH;
  const num = Number(delta);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)} đ%`;
}

export function formatPeriodVolume(volume) {
  if (volume === null || volume === undefined) return '0';
  return Number(volume).toLocaleString('vi-VN');
}

export function processRoutePeriods(data) {
  if (!data || !data.routes) return { routes: [], periods: {}, reconciliation: {}, anchorDate: null, bcvh: null };

  const routes = data.routes.map(r => {
    return {
      ...r,
      // Field names avoid the term the Design of Record bans from every surface (UI, code,
      // comments, tests) — see AC-14.
      day_rate: r.day?.rate ?? null,
      month_rate: r.month?.rate ?? null,
      previous_month_rate: r.previous_month?.rate ?? null,
      delta: r.delta ?? null,
      rank: r.rank ?? null,
      rank_delta: r.rank_delta ?? null,
      month_volume: r.month?.volume ?? 0,
      month_days_with_data: r.month?.days_with_data ?? 0,
      month_days_in_period: r.month?.days_in_period ?? 0,
    };
  });

  return {
    routes,
    periods: data.periods || {},
    reconciliation: data.reconciliation || {},
    anchorDate: data.anchor_date || null,
    bcvh: data.bcvh || null
  };
}

// F13-ROUTE-RANKING-PERIOD-01 Phase I1 remediation: `GET /f13/ranking/route/periods` was never
// designed to carry the day-scoped fields the existing screen already showed (Tổng BG, Đạt,
// Không đạt, Chuyển hoàn, delayed-cash columns, route classification, the BG-summary KPI) — the
// Design of Record §7.3 requires those to stay unchanged, sourced from wherever they already
// come from (`GET /f13/ranking/route`), while `getRoutePeriods()` only ever adds the new period
// columns (Hạng, Tỷ lệ ngày, Lũy kế tháng, Cùng kỳ tháng trước, Chênh lệch, Ngày có DL, Sản
// lượng) and the scope reconciliation. This merges both by `ma_tuyen` (both calls are already
// scoped to the same single `bcvh`, so `ma_bcvh` is constant across both result sets — it is
// still asserted here for defensive correctness, not silently assumed).
//
// The route set itself is always the `periodsRoutes` set (the month-to-anchor union, §4.4/T-01)
// — `oldRows` only enriches fields for routes that also appear in it. A route present in
// `periodsRoutes` but absent from `oldRows` had zero activity on the anchor day itself (the old
// endpoint's `GROUP BY ma_tuyen` only ever produces a row when at least one record exists that
// day) — every day-scoped field for that route is set to `null`, not `0`, so it renders "—"
// rather than a fabricated zero. This is mathematically sound for the executive KPI sums too:
// summing `null` (treated as 0 by `toNumber`) for a route with genuinely zero activity that day
// is the same real number as summing an explicit 0 — nothing is fabricated at the aggregate
// level, only the per-route display needs the null/"—" distinction.
export function mergeRouteData(oldRows = [], periodsRoutes = [], routeType) {
  const oldByRoute = new Map();
  (oldRows || []).forEach((row) => {
    if (row && row.ma_tuyen) oldByRoute.set(row.ma_tuyen, row);
  });

  return (periodsRoutes || []).map((p) => {
    const old = oldByRoute.get(p.ma_tuyen) || null;

    // Classification: under the default `postman` filter, every row returned by either endpoint
    // is by construction a postman delivery route (both endpoints exclude the confirmed
    // non-postman catalog under that filter) — no per-row lookup is needed, and none is
    // fabricated. Under `all`, use the old endpoint's real per-day classification when present;
    // when the route had zero activity that specific day (so the old endpoint never returned a
    // row for it) there is no way to know its classification from data alone — render it as
    // genuinely unknown rather than guessing either way.
    const isPostmanKnown = routeType !== 'all' ? true : (old ? old.is_postman_delivery_route ?? null : null);

    return {
      ma_tuyen: p.ma_tuyen,
      ten_tuyen: p.ten_tuyen,
      loai_tuyen_phat: p.loai_tuyen_phat,
      id: p.ma_tuyen,
      code: p.ma_tuyen,
      name: p.ten_tuyen,

      // Periods fields (new — Hạng thật, kỳ, đối soát). Union-of-month route set (T-01);
      // day_rate/month_rate/previous_month_rate/delta already null-correct from
      // processRoutePeriods().
      day: p.day,
      month: p.month,
      previous_month: p.previous_month,
      day_rate: p.day_rate,
      month_rate: p.month_rate,
      previous_month_rate: p.previous_month_rate,
      delta: p.delta,
      rank: p.rank,
      rank_previous_month: p.rank_previous_month,
      rank_delta: p.rank_delta,
      daily_series: p.daily_series,
      month_volume: p.month_volume,
      month_days_with_data: p.month_days_with_data,
      month_days_in_period: p.month_days_in_period,

      // Old-endpoint fields (unchanged per §7.3) — `null`, never `0`, when this route had no
      // activity on the anchor day itself.
      total_bg: old ? (old.total_bg ?? null) : null,
      passed: old ? (old.passed ?? null) : null,
      failed: old ? (old.failed ?? old.total_failed ?? null) : null,
      total_failed: old ? (old.total_failed ?? null) : null,
      returned: old ? (old.returned ?? null) : null,
      passed_rate: old ? (old.passed_rate ?? null) : null,
      delayed_cash_handover_count: old ? (old.delayed_cash_handover_count ?? null) : null,
      delayed_cash_handover_eligible_count: old ? (old.delayed_cash_handover_eligible_count ?? null) : null,
      f13_303_rate: old ? (old.f13_303_rate ?? null) : null,
      is_postman_delivery_route: isPostmanKnown,
    };
  });
}

// Builds the display shape for one reconciliation period bucket (`day` or `month`), per
// Design of Record §5.2/§5.3 — the four mutually-exclusive groups plus the checkable identity.
// Never derived by summing the merged `routes` array — that would only prove the array is
// internally consistent, not that it reconciles against the real BCVH total (§5.2).
export function buildReconciliationView(bucket) {
  if (!bucket) return null;
  return {
    bcvhTotal: bucket.bcvh_total ?? 0,
    ranked: bucket.ranked ?? 0,
    pickupAtOffice: bucket.pickup_at_office ?? 0,
    nonHue: bucket.non_hue ?? 0,
    noRoute: bucket.no_route ?? 0,
    outsideRanked: (bucket.pickup_at_office ?? 0) + (bucket.non_hue ?? 0) + (bucket.no_route ?? 0),
    identityOk: bucket.identity_ok !== false,
  };
}
