/**
 * test_e2e_kpi.js — Integration & E2E Test for KPI Controller (Task 3.1)
 *
 * Covers SSOT logic:
 * - F13_001 (KPI F1.3)
 * - F13_101 (Tổng Bưu gửi), F13_102 (Đạt), F13_103 (Không đạt), F13_104 (Tỷ lệ Không đạt)
 * - F13_201, F13_202 (Impact)
 */
'use strict';

const { run, get, all } = require('./src/config/db');
const kpiController = require('./src/controllers/kpiController');

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

// ─────────────────────────────────────────────────────────────────────────────
// Mock Express objects
// ─────────────────────────────────────────────────────────────────────────────
function mockReqRes(query = {}) {
    const req = { query };
    const res = {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; }
    };
    return { req, res };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Data Setup
// ─────────────────────────────────────────────────────────────────────────────
async function setupTestData() {
    await run("DELETE FROM fact_f13 WHERE ngay_do_kiem LIKE '2099-%'");

    const rows = [
        // Today = 2099-10-10 (4 rows: 3 Đạt, 1 Không đạt. Total 4. KPI = 75%)
        { ma_bg: '1', ma_bcvh: 'BC01', ten_bcvh: 'T1', ket_qua_f13: 'Đạt', ngay_do_kiem: '2099-10-10' },
        { ma_bg: '2', ma_bcvh: 'BC01', ten_bcvh: 'T1', ket_qua_f13: 'Đạt', ngay_do_kiem: '2099-10-10' },
        { ma_bg: '3', ma_bcvh: 'BC02', ten_bcvh: 'T2', ket_qua_f13: 'Đạt', ngay_do_kiem: '2099-10-10' },
        { ma_bg: '4', ma_bcvh: 'BC02', ten_bcvh: 'T2', ket_qua_f13: 'Không đạt', ngay_do_kiem: '2099-10-10' },

        // Yesterday = 2099-10-09 (2 rows: 1 Đạt, 1 Không đạt. Total 2. KPI = 50%)
        { ma_bg: '5', ma_bcvh: 'BC01', ten_bcvh: 'T1', ket_qua_f13: 'Đạt', ngay_do_kiem: '2099-10-09' },
        { ma_bg: '6', ma_bcvh: 'BC01', ten_bcvh: 'T1', ket_qua_f13: 'Không đạt', ngay_do_kiem: '2099-10-09' },

        // SWC = 2099-10-03 (1 row: 1 Đạt. Total 1. KPI = 100%)
        { ma_bg: '7', ma_bcvh: 'BC01', ten_bcvh: 'T1', ket_qua_f13: 'Đạt', ngay_do_kiem: '2099-10-03' },
    ];

    for (const r of rows) {
        await run(
            `INSERT INTO fact_f13 (ma_bg, ma_bcvh, ten_bcvh, ket_qua_f13, ngay_do_kiem) VALUES (?, ?, ?, ?, ?)`,
            [r.ma_bg, r.ma_bcvh, r.ten_bcvh, r.ket_qua_f13, r.ngay_do_kiem]
        );
    }
}

async function cleanup() {
    await run("DELETE FROM fact_f13 WHERE ngay_do_kiem LIKE '2099-%'");
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────
async function runTests() {
    console.log('\n📋 Setting up test data...');
    await setupTestData();

    console.log('\n📋 TEST 1: Dashboard KPI (getDashboardKpi)');
    try {
        const { req, res } = mockReqRes({ fromDate: '2099-10-01', toDate: '2099-10-10' });
        await kpiController.getDashboardKpi(req, res);

        assert('Status is 200', res.statusCode === 200);
        assert('Success is true', res.body.success === true);

        const data = res.body.data;
        assert('Today KPI is 75.00', data.today === 75, `Got: ${data.today}`);
        assert('Yesterday KPI is 50.00', data.yesterday === 50, `Got: ${data.yesterday}`);
        assert('DoD is 25.00 (75 - 50)', data.dod === 25, `Got: ${data.dod}`);
        assert('SWC is -25.00 (75 - 100)', data.swc === -25, `Got: ${data.swc}`);

        // Aggregate for fromDate=2099-10-01 to 2099-10-10
        // Total rows: 4 (today) + 2 (yesterday) + 1 (SWC) = 7
        assert('F13_101: tong_buu_gui = 7', data.tong_buu_gui === 7, `Got: ${data.tong_buu_gui}`);
        assert('F13_102: buu_gui_dat = 5', data.buu_gui_dat === 5, `Got: ${data.buu_gui_dat}`);
        assert('F13_103: buu_gui_khong_dat = 2', data.buu_gui_khong_dat === 2, `Got: ${data.buu_gui_khong_dat}`);
        assert('F13_104: ty_le_khong_dat = 28.57', data.ty_le_khong_dat === 28.57, `Got: ${data.ty_le_khong_dat}`);
    } catch (e) {
        console.error(e);
        failed++;
    }

    console.log('\n📋 TEST 2: Dashboard Trend (getDashboardTrend)');
    try {
        const { req, res } = mockReqRes({ toDate: '2099-10-10' });
        await kpiController.getDashboardTrend(req, res);

        assert('Status is 200', res.statusCode === 200);
        assert('Data is array', Array.isArray(res.body.data));

        const data = res.body.data;
        // Should have 3 dates with data
        assert('Contains 3 trend points', data.length === 3);
        const todayTrend = data.find(d => d.date === '2099-10-10');
        assert('Trend point for 2099-10-10 KPI = 75', todayTrend.kpi_rate === 75);
    } catch (e) {
        console.error(e);
        failed++;
    }

    console.log('\n📋 TEST 3: Dashboard Top (getDashboardTop)');
    try {
        const { req, res } = mockReqRes({ fromDate: '2099-10-09', toDate: '2099-10-10' });
        await kpiController.getDashboardTop(req, res);

        assert('Status is 200', res.statusCode === 200);
        
        const data = res.body.data;
        assert('Has top3Lowest', Array.isArray(data.top3Lowest));
        assert('Has top3Impact', Array.isArray(data.top3Impact));

        // Lowest KPI ranking:
        // BC01: 2 Đạt (today) + 1 Đạt (yesterday) = 3 Đạt, 1 Không đạt (yesterday) -> Total 4 -> KPI = 75%
        // BC02: 1 Đạt (today) + 1 Không đạt (today) -> Total 2 -> KPI = 50%
        // So BC02 should be the lowest.
        assert('BC02 is lowest KPI (50%)', data.top3Lowest[0].ma_bcvh === 'BC02' && data.top3Lowest[0].kpi_rate === 50);

        // Impact ranking (F13_202):
        // Total fail = 2. BC01 fail = 1, BC02 fail = 1. Impact 50% each.
        assert('BC01 Impact = 50%', data.top3Impact.find(i => i.ma_bcvh === 'BC01').impact_rate === 50);
        assert('BC02 Impact = 50%', data.top3Impact.find(i => i.ma_bcvh === 'BC02').impact_rate === 50);
    } catch (e) {
        console.error(e);
        failed++;
    }

    console.log('\n📋 TEST 4: BCVH Ranking (getBcvhRanking)');
    try {
        const { req, res } = mockReqRes({ fromDate: '2099-10-09', toDate: '2099-10-10' });
        await kpiController.getBcvhRanking(req, res);

        assert('Status is 200', res.statusCode === 200);
        const data = res.body.data;
        
        // Ranking order: KPI DESC, Total BG DESC
        // BC01: KPI 75%, Total 4
        // BC02: KPI 50%, Total 2
        assert('Rank 1 is BC01', data[0].ma_bcvh === 'BC01' && data[0].rank === 1);
        assert('Rank 2 is BC02', data[1].ma_bcvh === 'BC02' && data[1].rank === 2);
    } catch (e) {
        console.error(e);
        failed++;
    }

    console.log('\n📋 Cleaning up test data...');
    await cleanup();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`RESULT: ${passed} passed, ${failed} failed`);
    if (failed === 0) {
        console.log('✅ ALL TESTS PASSED — KPI Controller (Task 3.1) verified.');
    } else {
        console.log('❌ SOME TESTS FAILED — review above.');
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('FATAL TEST ERROR:', err);
    process.exit(1);
});
