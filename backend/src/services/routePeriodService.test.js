const test = require('node:test');
const assert = require('node:assert/strict');
const { RoutePeriodService } = require('./routePeriodService');

// Builds a fake repository + queryAnchor pair so the service's roll-up/ranking/reconciliation
// logic is exercised without touching any real database, and DB-call counts can be asserted
// precisely (T13). `daily` rows feed getRoutePeriodDailyFacts, `previous` feeds
// getRoutePeriodPreviousMonth, `reconciliation` feeds getRouteScopeReconciliation.
function buildFixture({ anchorDate, tenBcvh = 'BCVH Thuận Hóa', daily = [], previous = { previousStart: null, previousEnd: null, routes: [] }, reconciliation = null }) {
    const calls = { queryAnchor: 0, daily: 0, previousMonth: 0, reconciliation: 0 };
    const queryAnchor = async () => {
        calls.queryAnchor += 1;
        return anchorDate ? [{ anchor_date: anchorDate, ten_bcvh: tenBcvh }] : [{ anchor_date: null, ten_bcvh: null }];
    };
    const repository = {
        async getRoutePeriodDailyFacts() {
            calls.daily += 1;
            return daily;
        },
        async getRoutePeriodPreviousMonth() {
            calls.previousMonth += 1;
            return previous;
        },
        async getRouteScopeReconciliation() {
            calls.reconciliation += 1;
            return reconciliation;
        },
    };
    return { service: new RoutePeriodService({ repository, queryAnchor }), calls };
}

test('T1/T2/§4.1: BCVH with no data at or before the ceiling returns the explicit empty payload, no fallback', async () => {
    const { service, calls } = buildFixture({ anchorDate: null });
    const result = await service.getRoutePeriods('999999', undefined, {});
    assert.equal(result.anchor_date, null);
    assert.deepEqual(result.bcvh, { ma_bcvh: '999999', ten_bcvh: null });
    assert.deepEqual(result.routes, []);
    assert.equal(result.reconciliation.day.identity_ok, true);
    // Empty-state path issues only Q1 -- Q2/Q3/Q4 must not run when there is nothing to fetch.
    assert.equal(calls.queryAnchor, 1);
    assert.equal(calls.daily, 0);
    assert.equal(calls.previousMonth, 0);
    assert.equal(calls.reconciliation, 0);
});

test('anchor_date param must be a valid ISO date or the call throws INVALID_DATE', async () => {
    const { service } = buildFixture({ anchorDate: '2026-08-27' });
    await assert.rejects(
        () => service.getRoutePeriods('533140', '27/08/2026', {}),
        (error) => error.code === 'INVALID_DATE'
    );
});

test('T13: exactly 4 fixed DB touches (1 anchor + 3 repo calls) regardless of route count', async () => {
    const daily = [];
    for (let i = 0; i < 40; i += 1) {
        daily.push({ date: '2026-08-27', ma_tuyen: `R${i}`, ten_tuyen: `Tuyến ${i}`, loai_tuyen_phat: 'x', volume: 10, passed: 5, failed: 5 });
    }
    const { service, calls } = buildFixture({
        anchorDate: '2026-08-27',
        daily,
        previous: { previousStart: '2026-07-01', previousEnd: '2026-07-27', routes: [] },
        reconciliation: { day_bcvh_total: 10, day_ranked: 10, day_pickup_at_office: 0, day_non_hue: 0, day_no_route: 0, month_bcvh_total: 400, month_ranked: 400, month_pickup_at_office: 0, month_non_hue: 0, month_no_route: 0 },
    });
    const result = await service.getRoutePeriods('533140', '2026-08-27', {});
    assert.equal(result.routes.length, 40);
    assert.equal(calls.queryAnchor, 1);
    assert.equal(calls.daily, 1);
    assert.equal(calls.previousMonth, 1);
    assert.equal(calls.reconciliation, 1);
});

test('T3/T-01/AC-07: a route present earlier in the month but absent on anchor day gets day.rate = null, never 0', async () => {
    const { service } = buildFixture({
        anchorDate: '2026-08-27',
        daily: [
            { date: '2026-08-01', ma_tuyen: 'ABSENT-ON-ANCHOR', ten_tuyen: 'T', loai_tuyen_phat: 'x', volume: 5, passed: 5, failed: 0 },
        ],
        previous: { previousStart: '2026-07-01', previousEnd: '2026-07-27', routes: [] },
        reconciliation: { day_bcvh_total: 0, day_ranked: 0, day_pickup_at_office: 0, day_non_hue: 0, day_no_route: 0, month_bcvh_total: 5, month_ranked: 5, month_pickup_at_office: 0, month_non_hue: 0, month_no_route: 0 },
    });
    const result = await service.getRoutePeriods('533140', '2026-08-27', {});
    assert.equal(result.routes.length, 1);
    const route = result.routes[0];
    assert.equal(route.day.volume, 0);
    assert.equal(route.day.rate, null, 'must be null, not 0, for a day with no facts');
    assert.equal(route.month.volume, 5);
    assert.equal(route.month.rate, 100);
});

test('T4a/T4b/C-04: rate is null iff volume is 0, for day, month, and previous_month alike', async () => {
    const { service } = buildFixture({
        anchorDate: '2026-08-27',
        daily: [
            { date: '2026-08-27', ma_tuyen: 'ZERO', ten_tuyen: 'T', loai_tuyen_phat: 'x', volume: 0, passed: 0, failed: 0 },
        ],
        previous: { previousStart: '2026-07-01', previousEnd: '2026-07-27', routes: [{ ma_tuyen: 'ZERO', volume: 0, passed: 0, failed: 0, days_with_data: 0 }] },
        reconciliation: { day_bcvh_total: 0, day_ranked: 0, day_pickup_at_office: 0, day_non_hue: 0, day_no_route: 0, month_bcvh_total: 0, month_ranked: 0, month_pickup_at_office: 0, month_non_hue: 0, month_no_route: 0 },
    });
    const result = await service.getRoutePeriods('533140', '2026-08-27', {});
    const route = result.routes[0];
    // A GROUP BY row with volume 0 shouldn't occur in real SQL (COUNT>=1 whenever a row groups),
    // but the mapping logic must still hold the invariant defensively.
    assert.equal(route.day.rate, null);
    assert.equal(route.previous_month.rate, null);
});

test('T5/C-02: month is an exact Node-side sum of the daily facts, never a separate total', async () => {
    const { service } = buildFixture({
        anchorDate: '2026-08-03',
        daily: [
            { date: '2026-08-01', ma_tuyen: 'R1', ten_tuyen: 'T', loai_tuyen_phat: 'x', volume: 10, passed: 4, failed: 6 },
            { date: '2026-08-02', ma_tuyen: 'R1', ten_tuyen: 'T', loai_tuyen_phat: 'x', volume: 8, passed: 8, failed: 0 },
            { date: '2026-08-03', ma_tuyen: 'R1', ten_tuyen: 'T', loai_tuyen_phat: 'x', volume: 2, passed: 0, failed: 2 },
        ],
        previous: { previousStart: '2026-07-01', previousEnd: '2026-07-03', routes: [] },
        reconciliation: { day_bcvh_total: 2, day_ranked: 2, day_pickup_at_office: 0, day_non_hue: 0, day_no_route: 0, month_bcvh_total: 20, month_ranked: 20, month_pickup_at_office: 0, month_non_hue: 0, month_no_route: 0 },
    });
    const result = await service.getRoutePeriods('533140', '2026-08-03', {});
    const route = result.routes[0];
    assert.equal(route.month.volume, 20);
    assert.equal(route.month.passed, 12);
    assert.equal(route.month.failed, 8);
    assert.equal(route.month.rate, 60);
    assert.equal(route.month.days_with_data, 3);
    assert.equal(route.month.days_in_period, 3);
    // C-03: day matches the anchor-day element of the same daily array.
    assert.equal(route.day.volume, 2);
    assert.equal(route.day.passed, 0);
});

test('T9/AC-08: every route is ranked, including rate = null ones (tied last, not omitted)', async () => {
    const { service } = buildFixture({
        anchorDate: '2026-08-27',
        daily: [
            { date: '2026-08-27', ma_tuyen: 'HIGH', ten_tuyen: 'T', loai_tuyen_phat: 'x', volume: 10, passed: 9, failed: 1 },
            { date: '2026-08-27', ma_tuyen: 'LOW', ten_tuyen: 'T', loai_tuyen_phat: 'x', volume: 10, passed: 1, failed: 9 },
            { date: '2026-08-01', ma_tuyen: 'ONLY-ABSENT-DAY', ten_tuyen: 'T', loai_tuyen_phat: 'x', volume: 0, passed: 0, failed: 0 },
        ],
        previous: { previousStart: '2026-07-01', previousEnd: '2026-07-27', routes: [] },
        reconciliation: { day_bcvh_total: 20, day_ranked: 20, day_pickup_at_office: 0, day_non_hue: 0, day_no_route: 0, month_bcvh_total: 20, month_ranked: 20, month_pickup_at_office: 0, month_non_hue: 0, month_no_route: 0 },
    });
    const result = await service.getRoutePeriods('533140', '2026-08-27', {});
    assert.equal(result.routes.length, 3);
    assert.ok(result.routes.every((r) => r.rank !== null && r.rank !== undefined), 'every route must have a rank');
    const byId = Object.fromEntries(result.routes.map((r) => [r.ma_tuyen, r]));
    assert.equal(byId.HIGH.rank, 1);
    assert.equal(byId.LOW.rank, 2);
    assert.equal(byId['ONLY-ABSENT-DAY'].rank, 3, 'null-rate route is ranked last, not omitted');
});

test('T10/§3.3: delta and rank_delta are null when a route has no previous-window data, never 0', async () => {
    const { service } = buildFixture({
        anchorDate: '2026-08-27',
        daily: [
            { date: '2026-08-27', ma_tuyen: 'NEW-ROUTE', ten_tuyen: 'T', loai_tuyen_phat: 'x', volume: 10, passed: 8, failed: 2 },
        ],
        previous: { previousStart: '2026-07-01', previousEnd: '2026-07-27', routes: [] },
        reconciliation: { day_bcvh_total: 10, day_ranked: 10, day_pickup_at_office: 0, day_non_hue: 0, day_no_route: 0, month_bcvh_total: 10, month_ranked: 10, month_pickup_at_office: 0, month_non_hue: 0, month_no_route: 0 },
    });
    const result = await service.getRoutePeriods('533140', '2026-08-27', {});
    const route = result.routes[0];
    assert.equal(route.delta, null);
    assert.equal(route.rank_delta, null);
    assert.equal(route.rank_previous_month, 1, 'rank_previous_month is still a real (tied-last) number');
});

test('previous_month rate/delta computed correctly when the route did participate previously', async () => {
    const { service } = buildFixture({
        anchorDate: '2026-08-27',
        daily: [
            { date: '2026-08-27', ma_tuyen: 'R1', ten_tuyen: 'T', loai_tuyen_phat: 'x', volume: 100, passed: 60, failed: 40 },
        ],
        previous: { previousStart: '2026-07-01', previousEnd: '2026-07-27', routes: [{ ma_tuyen: 'R1', volume: 100, passed: 70, failed: 30, days_with_data: 27 }] },
        reconciliation: { day_bcvh_total: 100, day_ranked: 100, day_pickup_at_office: 0, day_non_hue: 0, day_no_route: 0, month_bcvh_total: 100, month_ranked: 100, month_pickup_at_office: 0, month_non_hue: 0, month_no_route: 0 },
    });
    const result = await service.getRoutePeriods('533140', '2026-08-27', {});
    const route = result.routes[0];
    assert.equal(route.month.rate, 60);
    assert.equal(route.previous_month.rate, 70);
    assert.equal(route.delta, -10);
    assert.equal(route.previous_month.days_in_period, 27);
});

test('T11/M-01: volume passes through as-is (a measurement-instance count, not de-duplicated)', async () => {
    const { service } = buildFixture({
        anchorDate: '2026-08-27',
        daily: [
            { date: '2026-08-27', ma_tuyen: 'R1', ten_tuyen: 'T', loai_tuyen_phat: 'x', volume: 3, passed: 3, failed: 0 },
        ],
        previous: { previousStart: '2026-07-01', previousEnd: '2026-07-27', routes: [] },
        reconciliation: { day_bcvh_total: 3, day_ranked: 3, day_pickup_at_office: 0, day_non_hue: 0, day_no_route: 0, month_bcvh_total: 3, month_ranked: 3, month_pickup_at_office: 0, month_non_hue: 0, month_no_route: 0 },
    });
    const result = await service.getRoutePeriods('533140', '2026-08-27', {});
    assert.equal(result.routes[0].day.volume, 3);
});

test('T12/§4.3: anchor day 01 makes month collapse to a single day, and previous_month also collapses to day 01 of the prior month', async () => {
    const { service } = buildFixture({
        anchorDate: '2026-08-01',
        daily: [
            { date: '2026-08-01', ma_tuyen: 'R1', ten_tuyen: 'T', loai_tuyen_phat: 'x', volume: 5, passed: 5, failed: 0 },
        ],
        previous: { previousStart: '2026-07-01', previousEnd: '2026-07-01', routes: [{ ma_tuyen: 'R1', volume: 4, passed: 2, failed: 2, days_with_data: 1 }] },
        reconciliation: { day_bcvh_total: 5, day_ranked: 5, day_pickup_at_office: 0, day_non_hue: 0, day_no_route: 0, month_bcvh_total: 5, month_ranked: 5, month_pickup_at_office: 0, month_non_hue: 0, month_no_route: 0 },
    });
    const result = await service.getRoutePeriods('533140', '2026-08-01', {});
    assert.equal(result.periods.previous_month.start, '2026-07-01');
    assert.equal(result.periods.previous_month.end, '2026-07-01');
    assert.equal(result.periods.previous_month.days_in_period, 1);
    const route = result.routes[0];
    assert.equal(route.month.rate, route.day.rate);
    assert.equal(route.previous_month.rate, 50);
});

test('AC-05/§5.2: reconciliation identity computed and surfaced per period, including a broken-identity case', async () => {
    const { service } = buildFixture({
        anchorDate: '2026-08-27',
        daily: [],
        previous: { previousStart: '2026-07-01', previousEnd: '2026-07-27', routes: [] },
        reconciliation: {
            day_bcvh_total: 1980, day_ranked: 1911, day_pickup_at_office: 69, day_non_hue: 0, day_no_route: 0,
            month_bcvh_total: 49264, month_ranked: 46818, month_pickup_at_office: 2446, month_non_hue: 0, month_no_route: 0,
        },
    });
    const result = await service.getRoutePeriods('533140', '2026-08-27', {});
    assert.equal(result.reconciliation.day.bcvh_total, 1980);
    assert.equal(result.reconciliation.day.identity_ok, true);
    assert.equal(result.reconciliation.month.bcvh_total, 49264);
    assert.equal(result.reconciliation.month.identity_ok, true);

    const { service: brokenService } = buildFixture({
        anchorDate: '2026-08-27',
        daily: [],
        previous: { previousStart: '2026-07-01', previousEnd: '2026-07-27', routes: [] },
        reconciliation: {
            day_bcvh_total: 100, day_ranked: 1, day_pickup_at_office: 1, day_non_hue: 1, day_no_route: 1,
            month_bcvh_total: 0, month_ranked: 0, month_pickup_at_office: 0, month_non_hue: 0, month_no_route: 0,
        },
    });
    const broken = await brokenService.getRoutePeriods('533140', '2026-08-27', {});
    assert.equal(broken.reconciliation.day.identity_ok, false, 'a genuine mismatch must surface as identity_ok: false, not be silently swallowed');
});
