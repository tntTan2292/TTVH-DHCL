'use strict';

// F41-DASHBOARD-MINIMUM-01 - Phase B1 Backend
// Real-database, read-only validation. Connects to the live operational
// SQLite database (NODE_ENV != 'test', same pattern as test_daily_trend.js)
// and drives the actual F41DashboardController against the real fact_f41
// data already loaded by the F41-PHASE-2 controlled import, confirming the
// locked Product Owner figure 2.863 / 4.695 = 60,98% for 2026-08-01 survives
// this ticket's new Dashboard-minimum B1 backend stack end to end.
// No INSERT/UPDATE/DELETE is issued anywhere in this script.

const { get } = require('./src/config/db');
const controller = require('./src/controllers/F41DashboardController');

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
    if (condition) {
        console.log(`  ✅ PASS: ${label}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
        failed++;
    }
}

function mockReqRes(query = {}) {
    const req = { query };
    const res = {
        statusCode: 200,
        headers: {},
        body: null,
        set(key, value) { this.headers[key] = value; return this; },
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; }
    };
    return { req, res };
}

async function main() {
    console.log('=== F41-DASHBOARD-MINIMUM-01 real-data validation (read-only) ===');

    const fact13Before = await get('SELECT COUNT(*) AS n FROM fact_f13');
    const fact41Before = await get('SELECT COUNT(*) AS n FROM fact_f41');

    console.log(`\n1. GET /api/f41/dashboard/kpi?from_date=2026-08-01&to_date=2026-08-01`);
    {
        const { req, res } = mockReqRes({ from_date: '2026-08-01', to_date: '2026-08-01' });
        await controller.getKpi(req, res);
        assert('HTTP 200', res.statusCode === 200, `got ${res.statusCode}: ${JSON.stringify(res.body)}`);
        const data = res.body && res.body.data;
        assert('total_rows === 4695 (all rows are the denominator)', data && data.total_rows === 4695, `got ${data && data.total_rows}`);
        assert('total_passed === 2863', data && data.total_passed === 2863, `got ${data && data.total_passed}`);
        assert('total_failed === 1581', data && data.total_failed === 1581, `got ${data && data.total_failed}`);
        assert('total_blank === 251', data && data.total_blank === 251, `got ${data && data.total_blank}`);
        assert('rate_percent === 60.98', data && data.rate_percent === 60.98, `got ${data && data.rate_percent}`);
    }

    console.log(`\n2. GET /api/f41/dashboard/meta (multi-day support)`);
    {
        const { req, res } = mockReqRes({});
        await controller.getMeta(req, res);
        assert('HTTP 200', res.statusCode === 200, `got ${res.statusCode}`);
        const data = res.body && res.body.data;
        assert('min_date is populated', !!(data && data.min_date), `got ${data && data.min_date}`);
        assert('max_date is populated', !!(data && data.max_date), `got ${data && data.max_date}`);
        assert('bcvh_units carries the 6 canonical F1.3/F4.1 BCVH codes', data && Array.isArray(data.bcvh_units) && data.bcvh_units.length === 6, `got ${data && data.bcvh_units && data.bcvh_units.length}`);

        if (data && data.min_date && data.max_date && data.min_date !== data.max_date) {
            console.log(`\n2b. GET /api/f41/dashboard/kpi over the full multi-day range ${data.min_date}..${data.max_date}`);
            const { req: req2, res: res2 } = mockReqRes({ from_date: data.min_date, to_date: data.max_date });
            await controller.getKpi(req2, res2);
            assert('HTTP 200 for multi-day range', res2.statusCode === 200, `got ${res2.statusCode}`);
            assert('multi-day total_rows >= single-day total_rows', res2.body.data.total_rows >= 4695, `got ${res2.body.data.total_rows}`);
        } else {
            console.log('  (only one F4.1 date is loaded so far — multi-day range check skipped, single-day already proves date-range plumbing)');
        }
    }

    console.log(`\n3. Read-only confirmation`);
    {
        const fact13After = await get('SELECT COUNT(*) AS n FROM fact_f13');
        const fact41After = await get('SELECT COUNT(*) AS n FROM fact_f41');
        assert('fact_f13 row count unchanged (no F1.3 behavior touched)', fact13Before.n === fact13After.n, `${fact13Before.n} -> ${fact13After.n}`);
        assert('fact_f41 row count unchanged (read-only Dashboard API)', fact41Before.n === fact41After.n, `${fact41Before.n} -> ${fact41After.n}`);
    }

    console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
});
