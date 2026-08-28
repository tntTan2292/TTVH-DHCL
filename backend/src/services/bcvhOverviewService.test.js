const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BcvhOverviewService } = require('./bcvhOverviewService');
const { CANONICAL_BCVH_UNITS } = require('../config/canonicalBcvhUnits');

const CODES = CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh);

function fixtureRows(anchorDate = '2026-08-27') {
    const monthly = CANONICAL_BCVH_UNITS.flatMap((unit, index) => ([
        {
            month: '2026-02', ma_bcvh: unit.ma_bcvh, ten_bcvh: unit.ten_bcvh,
            volume: index === 5 ? 0 : 100, passed: 60 + index, failed: 40 - index,
            days_with_data: 21 + (index % 4), days_in_period: 26, anchor_date: anchorDate,
        },
        {
            month: '2026-08', ma_bcvh: unit.ma_bcvh, ten_bcvh: unit.ten_bcvh,
            volume: 200 + index, passed: 120 + index, failed: 80, days_with_data: 27,
            days_in_period: 27, anchor_date: anchorDate,
        },
    ]));
    const daily = CANONICAL_BCVH_UNITS.map((unit, index) => ({
        date: '2026-08-27', ma_bcvh: unit.ma_bcvh, ten_bcvh: unit.ten_bcvh,
        volume: 10 + index, passed: 5 + index, failed: 5, anchor_date: anchorDate,
    }));
    const mtd = CANONICAL_BCVH_UNITS.map((unit, index) => ({
        ma_bcvh: unit.ma_bcvh, ten_bcvh: unit.ten_bcvh,
        volume: 100 + index, passed: 50 + index, failed: 50,
        previous_volume: 80, previous_passed: 40, anchor_date: anchorDate,
    }));
    const routes = [
        { ma_bcvh: CODES[0], ma_tuyen: '53579001', total_bg: 100, dat_kpi_2026: 70, anchor_date: anchorDate },
        { ma_bcvh: CODES[0], ma_tuyen: '53579002', total_bg: 100, dat_kpi_2026: 60, anchor_date: anchorDate },
        { ma_bcvh: CODES[0], ma_tuyen: '53579003', total_bg: 100, dat_kpi_2026: 50, anchor_date: anchorDate },
        { ma_bcvh: CODES[0], ma_tuyen: '53579004', total_bg: 100, dat_kpi_2026: 49, anchor_date: anchorDate },
        { ma_bcvh: CODES[0], ma_tuyen: '53579027', total_bg: 100, dat_kpi_2026: 100, anchor_date: anchorDate },
        { ma_bcvh: '531600', ma_tuyen: '53160001', total_bg: 100, dat_kpi_2026: 100, anchor_date: anchorDate },
    ];
    return { monthly, daily, mtd, routes };
}

function buildRepository(rows, calls = []) {
    return {
        getBcvhOverviewMonthly: async (anchor, codes) => { calls.push(['monthly', anchor, codes]); return rows.monthly; },
        getBcvhOverviewDaily: async (anchor, codes) => { calls.push(['daily', anchor, codes]); return rows.daily; },
        getBcvhOverviewMtd: async (anchor, codes) => { calls.push(['mtd', anchor, codes]); return rows.mtd; },
        getBcvhOverviewRoutes: async (anchor, codes) => { calls.push(['routes', anchor, codes]); return rows.routes; },
    };
}

function collectObjectKeys(value, keys = new Set()) {
    if (!value || typeof value !== 'object') return keys;
    if (Array.isArray(value)) {
        value.forEach((item) => collectObjectKeys(item, keys));
        return keys;
    }
    Object.entries(value).forEach(([key, child]) => {
        keys.add(key);
        collectObjectKeys(child, keys);
    });
    return keys;
}

test('T1/T4/T5/T10/T11: overview returns canonical grids, coverage-aware rates, route bands and safe schema', async () => {
    const calls = [];
    const rows = fixtureRows();
    const service = new BcvhOverviewService({
        repository: buildRepository(rows, calls),
        now: () => new Date('2026-08-28T08:00:00+07:00'),
    });
    const result = await service.getOverview();

    assert.equal(calls.length, 4, 'exactly four aggregate repository calls');
    calls.forEach(([, anchor, codes]) => {
        assert.equal(anchor, '2026-08-27');
        assert.deepEqual(codes, CODES);
    });
    for (const name of ['monthly', 'daily', 'mtd', 'routes']) {
        assert.deepEqual([...new Set(result[name].map((row) => row.ma_bcvh))].sort(), [...CODES].sort());
    }
    const partial = result.monthly.find((row) => row.month === '2026-02' && row.ma_bcvh === CODES[0]);
    assert.equal(partial.rate, 60);
    assert.equal(partial.days_with_data, 21);
    assert.equal(partial.days_in_period, 26);
    const zeroDenominator = result.monthly.find((row) => row.month === '2026-02' && row.ma_bcvh === CODES[5]);
    assert.equal(zeroDenominator.rate, null);
    assert.equal(result.meta.anchor_date, '2026-08-27');
    assert.equal(result.meta.year_period.to_date, '2026-08-27');

    const routeSummary = result.routes.find((row) => row.ma_bcvh === CODES[0]);
    assert.deepEqual(
        { participating: routeSummary.participating_route_count, green: routeSummary.green, pink: routeSummary.pink, yellow: routeSummary.yellow, red: routeSummary.red },
        { participating: 4, green: 1, pink: 1, yellow: 1, red: 1 },
    );
    const forbidden = ['alert', 'warning', 'risk'];
    const keys = collectObjectKeys(result);
    forbidden.forEach((key) => assert.equal(keys.has(key), false));
});

test('T6/T7: anchor ceiling is yesterday and delayed data wins', async () => {
    const delayedRows = fixtureRows('2026-08-25');
    const calls = [];
    const delayedService = new BcvhOverviewService({
        repository: buildRepository(delayedRows, calls),
        now: () => new Date('2026-08-28T08:00:00+07:00'),
    });
    const delayed = await delayedService.getOverview();
    assert.equal(calls[0][1], '2026-08-27');
    assert.equal(delayed.meta.anchor_date, '2026-08-25');
    assert.equal(delayed.meta.anchor_source, 'max_date');

    const yesterdayRows = fixtureRows('2026-08-27');
    const yesterdayService = new BcvhOverviewService({
        repository: buildRepository(yesterdayRows),
        now: () => new Date('2026-08-28T08:00:00+07:00'),
    });
    assert.equal((await yesterdayService.getOverview()).meta.anchor_source, 'yesterday');
});

test('T8/T9: first-day period and rank tie behavior match RANK semantics', async () => {
    const rows = fixtureRows('2026-08-01');
    rows.daily = rows.daily.map((row) => ({ ...row, date: '2026-08-01', anchor_date: '2026-08-01' }));
    rows.mtd = rows.mtd.map((row, index) => ({
        ...row, anchor_date: '2026-08-01', volume: index < 2 ? 100 : 100 - index,
        passed: index < 2 ? 80 : 70 - index,
    }));
    rows.monthly = rows.monthly.map((row) => ({ ...row, anchor_date: '2026-08-01' }));
    rows.routes = rows.routes.map((row) => ({ ...row, anchor_date: '2026-08-01' }));
    const service = new BcvhOverviewService({
        repository: buildRepository(rows),
        now: () => new Date('2026-08-20T08:00:00+07:00'),
    });
    const result = await service.getOverview('2026-08-01');
    assert.equal(result.meta.month_period.from_date, '2026-08-01');
    assert.equal(result.daily.length, 6);
    assert.equal(result.mtd[0].rank, 1);
    assert.equal(result.mtd[1].rank, 1);
    assert.ok(result.mtd.slice(2).every((row) => row.rank >= 3));
});

test('T4b: no database rows returns stable empty response with null rates', async () => {
    const repository = buildRepository({ monthly: [], daily: [], mtd: [], routes: [] });
    const service = new BcvhOverviewService({
        repository,
        now: () => new Date('2026-08-28T08:00:00+07:00'),
    });
    const result = await service.getOverview();
    assert.equal(result.meta.anchor_date, null);
    assert.equal(result.mtd.length, 6);
    assert.ok(result.mtd.every((row) => row.rate === null));
});

test('repository contract aggregates instead of returning fact rows and total-row fix filters canonical inputs', () => {
    const repositorySource = fs.readFileSync(path.join(__dirname, '../repositories/FactBuuGuiRepository.js'), 'utf8');
    const dashboardSource = fs.readFileSync(path.join(__dirname, 'F13DashboardService.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '../controllers/DashboardController.js'), 'utf8');
    const routesSource = fs.readFileSync(path.join(__dirname, '../routes/f13Routes.js'), 'utf8');
    assert.match(repositorySource, /day_bcvh AS MATERIALIZED/);
    assert.match(repositorySource, /GROUP BY ngay_do_kiem, ma_bcvh/);
    assert.match(repositorySource, /FROM day_bcvh/);
    assert.match(repositorySource, /GROUP BY ngay_do_kiem, ma_bcvh/);
    assert.match(repositorySource, /GROUP BY ma_bcvh, ma_tuyen/);
    assert.match(repositorySource, /ma_bcvh IN \(\$\{placeholders\}\)/);
    assert.match(dashboardSource, /const canonicalCurrentMetrics = currentMetrics\.filter/);
    assert.match(dashboardSource, /const totalCurrent = canonicalCurrentMetrics\.reduce/);
    assert.match(dashboardSource, /const totalRow = canonicalMappedData\.reduce/);
    assert.match(controllerSource, /async getBcvhOverview\(req, res\)/);
    assert.match(routesSource, /router\.get\('\/ranking\/bcvh\/overview', \.\.\.allowViewerRead, dashboardController\.getBcvhOverview\)/);
});

test('invalid anchor_date is rejected before repository access', async () => {
    const service = new BcvhOverviewService({ repository: buildRepository(fixtureRows()) });
    await assert.rejects(() => service.getOverview('28/08/2026'), { code: 'INVALID_DATE' });
});
