'use strict';

const { run, get } = require('./src/config/db');
const dashboardController = require('./src/controllers/DashboardController');
const factRepo = require('./src/repositories/FactBuuGuiRepository');

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
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; }
    };
    return { req, res };
}

const DATES = ['2099-07-01', '2099-07-02', '2099-07-03'];

async function setup() {
    await run("DELETE FROM fact_f13 WHERE ngay_do_kiem LIKE '2099-07-%'");
    await run("DELETE FROM import_log WHERE ngay_do_kiem LIKE '2099-07-%'");

    const rows = [
        { ma_bg: 'BG-1', ma_bcvh: 'BC01', ten_bcvh: 'BC 01', ma_tuyen: 'T01', ten_tuyen: 'Tuyen 01', ket_qua_f13: 'Đạt', ngay_do_kiem: '2099-07-01' },
        { ma_bg: 'BG-2', ma_bcvh: 'BC01', ten_bcvh: 'BC 01', ma_tuyen: 'T01', ten_tuyen: 'Tuyen 01', ket_qua_f13: 'Không đạt', ngay_do_kiem: '2099-07-01' },
        { ma_bg: 'BG-3', ma_bcvh: 'BC02', ten_bcvh: 'BC 02', ma_tuyen: 'T02', ten_tuyen: 'Tuyen 02', ket_qua_f13: 'Đạt', ngay_do_kiem: '2099-07-03' },
        { ma_bg: 'BG-4', ma_bcvh: 'BC02', ten_bcvh: 'BC 02', ma_tuyen: 'T02', ten_tuyen: 'Tuyen 02', ket_qua_f13: 'Đạt', ngay_do_kiem: '2099-07-03' },
        { ma_bg: 'BG-5', ma_bcvh: 'BC02', ten_bcvh: 'BC 02', ma_tuyen: 'T02', ten_tuyen: 'Tuyen 02', ket_qua_f13: 'Không đạt', ngay_do_kiem: '2099-07-03' }
    ];

    for (const row of rows) {
        await run(
            `INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, ket_qua_f13)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [row.ngay_do_kiem, row.ma_bg, row.ma_bcvh, row.ten_bcvh, row.ma_tuyen, row.ten_tuyen, row.ket_qua_f13]
        );
    }

    await run(
        `INSERT INTO import_log (file_name, ngay_do_kiem, status, total_records, error_records, skipped_records, created_at)
         VALUES (?, ?, 'SUCCESS', ?, 0, 0, ?)`,
        ['F1.3-2099.07.03.xlsx', '2099-07-03', 3, '2099-07-03 10:00:00']
    );
}

async function cleanup() {
    await run("DELETE FROM fact_f13 WHERE ngay_do_kiem LIKE '2099-07-%'");
    await run("DELETE FROM import_log WHERE ngay_do_kiem LIKE '2099-07-%'");
}

async function runTests() {
    await setup();

    const { req, res } = mockReqRes({ from_date: '2099-07-01', to_date: '2099-07-03' });
    await dashboardController.getDailyTrend(req, res);

    assert('Daily trend returns 200', res.statusCode === 200);
    assert('Success is true', res.body.success === true);
    assert('Interval is daily', res.body.data.meta.interval === 'daily');
    assert('Record count includes missing day', res.body.data.meta.record_count === 3);

    const items = res.body.data.items;
    assert('Ascending order preserved', items.map((r) => r.date).join(',') === '2099-07-01,2099-07-02,2099-07-03');

    const day1 = items[0];
    assert('Day 1 total_volume = 2', day1.total_volume === 2);
    assert('Day 1 passed = 1', day1.passed === 1);
    assert('Day 1 failed = 1', day1.failed === 1);
    assert('Day 1 quality_rate = 50.0000', day1.quality_rate === 50);
    assert('Day 1 data_available = true', day1.data_available === true);

    const day2 = items[1];
    assert('Missing day total_volume = 0', day2.total_volume === 0);
    assert('Missing day passed = 0', day2.passed === 0);
    assert('Missing day failed = 0', day2.failed === 0);
    assert('Missing day quality_rate = null', day2.quality_rate === null);
    assert('Missing day data_available = false', day2.data_available === false);

    const day3 = items[2];
    assert('Day 3 total_volume = 3', day3.total_volume === 3);
    assert('Day 3 passed = 2', day3.passed === 2);
    assert('Day 3 failed = 1', day3.failed === 1);
    assert('Day 3 quality_rate = 66.6667', day3.quality_rate === 66.6667);

    const filtered = await factRepo.getDailyTrendData('2099-07-01', '2099-07-03', { bcvhId: 'BC01' });
    assert('BCVH filter returns only BC01 data', filtered[0].total_volume === 2 && filtered[2].total_volume === 0);

    const invalidReq = mockReqRes({ from_date: '2099-07-03', to_date: '2099-07-01' });
    await dashboardController.getDailyTrend(invalidReq.req, invalidReq.res);
    assert('Invalid range returns 400', invalidReq.res.statusCode === 400);

    const missingReq = mockReqRes({ from_date: '2099-07-01' });
    await dashboardController.getDailyTrend(missingReq.req, missingReq.res);
    assert('Missing parameter returns 400', missingReq.res.statusCode === 400);

    const meta = await get("SELECT ngay_do_kiem, created_at FROM import_log WHERE status = 'SUCCESS' ORDER BY datetime(created_at) DESC LIMIT 1");
    assert('Latest import metadata is available', meta && meta.ngay_do_kiem === '2099-07-03');

    await cleanup();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`RESULT: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch((error) => {
    console.error('FATAL TEST ERROR:', error);
    process.exit(1);
});
