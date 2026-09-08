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

    // ITR-F41-NB-05 remediation: the ma_bcvh filter and bcvh-reconciliation
    // had no real-database evidence — only fake-repository unit tests.
    // Real per-BCVH figures independently reproduced against the live
    // database, cross-checked against the ITR's own reconciliation.
    const CANONICAL_BCVH_2026_08_01 = [
        { code: '535790', total_rows: 346, rate_percent: 77.46 },
        { code: '536250', total_rows: 509, rate_percent: 68.17 },
        { code: '535470', total_rows: 736, rate_percent: 52.99 },
        { code: '537220', total_rows: 580, rate_percent: 10.69 },
        { code: '537015', total_rows: 339, rate_percent: 88.79 },
        { code: '533140', total_rows: 2184, rate_percent: 68.41 }
    ];

    console.log(`\n4. GET /api/f41/dashboard/kpi?...&ma_bcvh=<code> for each of the 6 canonical BCVH codes`);
    {
        let sumRows = 0;
        for (const expected of CANONICAL_BCVH_2026_08_01) {
            const { req, res } = mockReqRes({ from_date: '2026-08-01', to_date: '2026-08-01', ma_bcvh: expected.code });
            await controller.getKpi(req, res);
            const data = res.body && res.body.data;
            assert(`ma_bcvh=${expected.code}: total_rows === ${expected.total_rows}`, data && data.total_rows === expected.total_rows, `got ${data && data.total_rows}`);
            assert(`ma_bcvh=${expected.code}: rate_percent === ${expected.rate_percent}`, data && data.rate_percent === expected.rate_percent, `got ${data && data.rate_percent}`);
            sumRows += (data && data.total_rows) || 0;
        }
        assert('sum of the 6 canonical BCVH filters (4,694) is one row short of the unfiltered aggregate (4,695) — ITR-F41-NB-04, expected under PO Option A', sumRows === 4694, `got ${sumRows}`);
    }

    console.log(`\n5. GET /api/f41/dashboard/bcvh-reconciliation?date=2026-08-01`);
    {
        const { req, res } = mockReqRes({ date: '2026-08-01' });
        await controller.getBcvhReconciliation(req, res);
        assert('HTTP 200', res.statusCode === 200, `got ${res.statusCode}`);
        const rows = (res.body && res.body.data) || [];
        const sum = rows.reduce((acc, row) => ({
            total_rows: acc.total_rows + row.total_rows,
            total_passed: acc.total_passed + row.total_passed,
            total_failed: acc.total_failed + row.total_failed,
            total_blank: acc.total_blank + row.total_blank
        }), { total_rows: 0, total_passed: 0, total_failed: 0, total_blank: 0 });
        assert('reconciliation groups sum to total_rows === 4695 (reconciles exactly to the KPI endpoint)', sum.total_rows === 4695, `got ${sum.total_rows}`);
        assert('reconciliation groups sum to total_passed === 2863', sum.total_passed === 2863, `got ${sum.total_passed}`);
        assert('reconciliation groups sum to total_failed === 1581', sum.total_failed === 1581, `got ${sum.total_failed}`);
        assert('reconciliation groups sum to total_blank === 251', sum.total_blank === 251, `got ${sum.total_blank}`);
        assert('reconciliation returns more groups (non-canonical BCVH codes included) than the 6-code filter', rows.length > 6, `got ${rows.length} groups`);
    }

    // ITR-F41-NB-04 remediation (PO decision, Phương án A): meta must expose
    // the fixed scope note and confirm real non-canonical rows exist.
    console.log(`\n6. GET /api/f41/dashboard/meta — KPI scope contract (ITR-F41-NB-04)`);
    {
        const { req, res } = mockReqRes({});
        await controller.getMeta(req, res);
        const data = res.body && res.body.data;
        assert('kpi_scope_note is present and non-empty', !!(data && data.kpi_scope_note && data.kpi_scope_note.length > 0), `got ${data && data.kpi_scope_note}`);
        assert('kpi_includes_non_canonical_bcvh === true (531120/531110/531600 are real rows in fact_f41)', data && data.kpi_includes_non_canonical_bcvh === true, `got ${data && data.kpi_includes_non_canonical_bcvh}`);
    }

    // ITR-F41-NB-03 remediation: date-value validation on all 3 endpoints.
    console.log(`\n7. Date-value validation (ITR-F41-NB-03)`);
    {
        const { req, res } = mockReqRes({ from_date: '2026-13-45', to_date: '2026-08-01' });
        await controller.getKpi(req, res);
        assert('malformed from_date -> HTTP 400 INVALID_DATE (was silently 200/total_rows:0)', res.statusCode === 400 && res.body.error.code === 'INVALID_DATE', `got ${res.statusCode} ${JSON.stringify(res.body)}`);
    }
    {
        const { req, res } = mockReqRes({ from_date: '2026-08-05', to_date: '2026-08-01' });
        await controller.getKpi(req, res);
        assert('reversed range -> HTTP 400 INVALID_RANGE', res.statusCode === 400 && res.body.error.code === 'INVALID_RANGE', `got ${res.statusCode} ${JSON.stringify(res.body)}`);
    }
    {
        const { req, res } = mockReqRes({ date: 'not-a-date' });
        await controller.getBcvhReconciliation(req, res);
        assert('bcvh-reconciliation malformed date -> HTTP 400 INVALID_DATE (was silently 200/[])', res.statusCode === 400 && res.body.error.code === 'INVALID_DATE', `got ${res.statusCode} ${JSON.stringify(res.body)}`);
    }
    {
        // valid values still work after adding validation
        const { req, res } = mockReqRes({ from_date: '2026-08-01', to_date: '2026-08-01' });
        await controller.getKpi(req, res);
        assert('a genuinely valid date range still returns HTTP 200', res.statusCode === 200, `got ${res.statusCode}`);
    }

    // ITR-F41-NB-06 remediation: no-store on all 3 endpoints, not just meta.
    console.log(`\n8. Consistent no-store caching on all 3 endpoints (ITR-F41-NB-06)`);
    {
        const { req, res } = mockReqRes({ from_date: '2026-08-01', to_date: '2026-08-01' });
        await controller.getKpi(req, res);
        assert('dashboard/kpi sets Cache-Control: no-store', /no-store/.test(res.headers['Cache-Control'] || ''), `got ${res.headers['Cache-Control']}`);
    }
    {
        const { req, res } = mockReqRes({ date: '2026-08-01' });
        await controller.getBcvhReconciliation(req, res);
        assert('bcvh-reconciliation sets Cache-Control: no-store', /no-store/.test(res.headers['Cache-Control'] || ''), `got ${res.headers['Cache-Control']}`);
    }
    {
        const { req, res } = mockReqRes({});
        await controller.getMeta(req, res);
        assert('dashboard/meta sets Cache-Control: no-store', /no-store/.test(res.headers['Cache-Control'] || ''), `got ${res.headers['Cache-Control']}`);
    }

    console.log(`\n9. Read-only confirmation`);
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
