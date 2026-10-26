const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { F42RankingService } = require('./F42RankingService');
const { FactF42Repository } = require('../repositories/FactF42Repository');
const { F42NationalRankService } = require('./F42NationalRankService');
const { createController } = require('../controllers/F42RankingController');
const { parseF42Hue, F42_DB_COLUMNS } = require('./f42HueParser');
const { applyF42Schema } = require('../../migrate_f42_schema');

const REAL_HUE = path.resolve(__dirname, '../../../Data DKCL/F4.2-2026.10.10.csv');
const COLUMNS = ['ngay_do_kiem', 'ma_bg', 'ma_bc_phat', 'ten_bc_phat', 'ma_buu_ta', 'ten_buu_ta', 'thoi_gian_gbt', 'danh_gia'];

const BCVH = { 533140: 'BCVH Thuận Hóa', 535470: 'BCVH Hương Trà', 536250: 'BCVH Hương Thủy', 537220: 'BCVH Phú Lộc', 537015: 'BCVH Thuận An', 535790: 'BCVH A Lưới' };

async function makeService(rows, columns = COLUMNS) {
    const dbPath = path.join(os.tmpdir(), `f42-rank-svc-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    await applyF42Schema(dbPath);
    const db = await new Promise((resolve, reject) => { const d = new sqlite3.Database(dbPath, (e) => (e ? reject(e) : resolve(d))); });
    await new Promise((resolve, reject) => db.run('BEGIN', (e) => (e ? reject(e) : resolve())));
    for (const row of rows) {
        await new Promise((resolve, reject) => db.run(
            `INSERT INTO fact_f42 (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
            columns.map((c) => (row[c] === undefined ? null : row[c])),
            (e) => (e ? reject(e) : resolve()),
        ));
    }
    await new Promise((resolve, reject) => db.run('COMMIT', (e) => (e ? reject(e) : resolve())));
    const service = new F42RankingService({
        repository: new FactF42Repository(db),
        nationalRankService: new F42NationalRankService(db),
    });
    return { service, db, close: () => new Promise((resolve) => db.close(() => { fs.rmSync(dbPath, { force: true }); resolve(); })) };
}

let counter = 0;
function row(date, office, postman, verdict, extra = {}) {
    counter += 1;
    return {
        ngay_do_kiem: date,
        ma_bg: `BG${counter}`,
        ma_bc_phat: office,
        ten_bc_phat: BCVH[office] || `Office ${office}`,
        ma_buu_ta: postman,
        ten_buu_ta: `Postman ${postman}`,
        thoi_gian_gbt: `${date} 08:00:00`,
        danh_gia: verdict,
        ...extra,
    };
}

function many(date, office, postman, dat, kd, blank) {
    return [
        ...Array.from({ length: dat }, () => row(date, office, postman, 'Đạt')),
        ...Array.from({ length: kd }, () => row(date, office, postman, 'Không đạt')),
        ...Array.from({ length: blank }, () => row(date, office, postman, null)),
    ];
}

const DAY = '2026-10-10';
function fixture() {
    return [
        ...many(DAY, '533140', 'A1', 8, 1, 1), // 10 rows, 8 Đạt
        ...many(DAY, '533140', 'A2', 3, 0, 7), // 10 rows, 3 Đạt (mostly blank)
        ...many(DAY, '537015', 'B1', 9, 1, 0), // 10 rows, 9 Đạt
        ...many(DAY, '531110', 'X1', 5, 0, 0), // not a canonical BCVH: only in the module total
        ...many('2026-10-09', '533140', 'A1', 5, 5, 0),
    ];
}

test('summary: rate = Đạt / every row, blank ratings stay in the denominator and count as not passed', async () => {
    const { service, close } = await makeService(fixture());
    try {
        const day = await service.getSummary(DAY, DAY);
        assert.equal(day.total_bg, 35);
        assert.equal(day.total_passed, 25);
        assert.equal(day.total_failed, 10);
        assert.equal(day.total_blank, 8);
        assert.equal(day.passed_rate, 71.43);
        const unit = await service.getSummary(DAY, DAY, { bcvhId: '533140' });
        assert.deepEqual([unit.total_bg, unit.total_passed, unit.total_blank], [20, 11, 8]);
        assert.equal(unit.passed_rate, 55);
        await assert.rejects(service.getSummary(DAY, DAY, { bcvhId: '999999' }), (error) => error.code === 'INVALID_BCVH');
        assert.equal(day.comparisons.d1.previous_date, '2026-10-09');
    } finally { await close(); }
});

test('BCVH ranking covers the six canonical BCVH only; the module total keeps the other office', async () => {
    const { service, close } = await makeService(fixture());
    try {
        const ranking = await service.getBcvhRanking(DAY, DAY, 1, 20);
        const byCode = Object.fromEntries(ranking.data.map((item) => [item.ma_bcvh, item]));
        assert.equal(byCode['531110'], undefined, 'a non-canonical office is never a BCVH');
        assert.equal(ranking.data.length, 2, 'only BCVH with data are ranked');
        assert.deepEqual([byCode['537015'].rank, byCode['533140'].rank], [1, 2]);
    } finally { await close(); }
});

test('postman table: BCVH blocks, only postmen with volume, block totals and the grand total add up, rank inside the BCVH', async () => {
    const { service, close } = await makeService(fixture());
    try {
        const table = await service.getPostmanTable({ period: 'day', anchorDate: DAY });
        assert.deepEqual(table.units.map((unit) => unit.ma_bcvh), ['535790', '536250', '535470', '537220', '537015', '533140'].filter((code) => ['535790', '536250', '535470', '537220', '537015', '533140'].includes(code)));
        const hue = table.units.find((unit) => unit.ma_bcvh === '533140');
        assert.equal(hue.postman_count, 2);
        assert.deepEqual([hue.volume, hue.passed, hue.failed, hue.strict_failed, hue.blank, hue.rate], [20, 11, 9, 1, 8, 55]);
        assert.deepEqual(hue.postmen.map((p) => [p.ma_buu_ta, p.volume, p.passed, p.rate, p.rank]), [['A1', 10, 8, 80, 1], ['A2', 10, 3, 30, 2]]);
        assert.equal(hue.postmen[0].strict_failed, 1);
        assert.equal(hue.postmen[1].blank, 7);
        const empty = table.units.find((unit) => unit.ma_bcvh === '535790');
        assert.deepEqual([empty.postman_count, empty.volume, empty.rate], [0, 0, null]);
        // grand total = the six BCVH (the non-canonical office is outside)
        assert.deepEqual([table.total_row.volume, table.total_row.passed, table.total_row.rate], [30, 20, 66.67]);
        assert.equal(table.meta.postman_count, 3);
        assert.equal(table.meta.target_rate, 90);
        assert.equal(table.meta.has_data, true);
    } finally { await close(); }
});

test('postman table: week, month, range, one BCVH, empty period and invalid input', async () => {
    const { service, close } = await makeService(fixture());
    try {
        const month = await service.getPostmanTable({ period: 'month', anchorDate: DAY });
        const hue = month.units.find((unit) => unit.ma_bcvh === '533140');
        assert.deepEqual([hue.volume, hue.passed], [30, 16]); // 10/10 and 09/10 together
        assert.equal(hue.postmen.find((p) => p.ma_buu_ta === 'A1').volume, 20);
        const range = await service.getPostmanTable({ fromDate: '2026-10-09', toDate: '2026-10-09' });
        assert.deepEqual([range.meta.period, range.total_row.volume, range.meta.days_with_data], ['range', 10, 1]);
        const one = await service.getPostmanTable({ period: 'day', anchorDate: DAY, bcvhId: '537015' });
        assert.deepEqual(one.units.map((unit) => unit.ma_bcvh), ['537015']);
        assert.equal(one.total_row.volume, 10);
        const none = await service.getPostmanTable({ period: 'day', anchorDate: '2026-01-05' });
        assert.deepEqual([none.meta.has_data, none.meta.postman_count, none.total_row.volume, none.total_row.rate], [false, 0, 0, null]);
        await assert.rejects(service.getPostmanTable({ period: 'day', anchorDate: DAY, bcvhId: '1' }), (error) => error.code === 'INVALID_BCVH');
        await assert.rejects(service.getPostmanTable({ period: 'day', anchorDate: 'x' }), (error) => error.code === 'INVALID_DATE');
        await assert.rejects(service.getPostmanTable({}), (error) => error.code === 'MISSING_PARAM');
    } finally { await close(); }
});

test('meta carries the target, the six BCVH and the scope note; overview, weeks and months work over the F4.2 data', async () => {
    const { service, close } = await makeService(fixture());
    try {
        const meta = await service.getDashboardMeta();
        assert.deepEqual([meta.target_rate, meta.bcvh_units.length, meta.min_date, meta.max_date], [90, 6, '2026-10-09', DAY]);
        assert.match(meta.kpi_scope_note, /F4\.2/);
        assert.equal(meta.kpi_includes_non_canonical_bcvh, true);
        const overview = await service.getOverview(DAY);
        assert.ok(overview.mtd.some((item) => item.ma_bcvh === '533140'));
        assert.ok((await service.listWeeks()).length >= 1);
        assert.ok((await service.listMonths()).length >= 1);
        const trend = await service.getDailyTrend('2026-10-09', DAY);
        assert.deepEqual(trend.items.map((item) => [item.date, item.total_volume]).slice(0, 2), [['2026-10-09', 10], [DAY, 35]]);
    } finally { await close(); }
});

test('controller: postman table answers 200, a bad date 400, and pins the BCVH of a scoped request', async () => {
    const { service, close } = await makeService(fixture());
    try {
        const controller = createController(service);
        const call = (query, scope = null) => new Promise((resolve) => {
            const res = { headers: {}, set(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { resolve({ code: this.code, body }); } };
            controller.getPostmanTable({ query, scope }, res);
        });
        const ok = await call({ period: 'day', anchor_date: DAY });
        assert.equal(ok.code, 200);
        assert.equal(ok.body.data.units.length, 6);
        assert.equal((await call({ period: 'day', anchor_date: 'bad' })).code, 400);
        const scoped = await call({ period: 'day', anchor_date: DAY }, { module: 'f42', mode: 'bcvh', bcvh: ['537015'] });
        assert.deepEqual(scoped.body.data.units.map((unit) => unit.ma_bcvh), ['537015']);
        const foreign = await call({ period: 'day', anchor_date: DAY, ma_bcvh: '533140' }, { module: 'f42', mode: 'bcvh', bcvh: ['537015'] });
        assert.equal(foreign.code, 403);
    } finally { await close(); }
});

test('real 10/10/2026 file: 6 466 rows, 4 475 Đạt, the six BCVH of the DKCL audit, 128 postmen', { skip: fs.existsSync(REAL_HUE) ? false : 'PO file not present on this machine' }, async () => {
    const parsed = parseF42Hue(fs.readFileSync(REAL_HUE), 'F4.2-2026.10.10.csv').parsedData;
    const { service, close } = await makeService(parsed, ['ngay_do_kiem', ...F42_DB_COLUMNS]);
    try {
        const summary = await service.getSummary(DAY, DAY);
        assert.deepEqual([summary.total_bg, summary.total_passed, summary.total_blank, summary.passed_rate], [6466, 4475, 1234, 69.21]);
        const table = await service.getPostmanTable({ period: 'day', anchorDate: DAY });
        const rates = Object.fromEntries(table.units.map((unit) => [unit.ten_bcvh, [unit.volume, unit.passed, unit.rate]]));
        assert.deepEqual(rates, {
            'BCVH A Lưới': [202, 191, 94.55],
            'BCVH Hương Thủy': [820, 519, 63.29],
            'BCVH Hương Trà': [907, 645, 71.11],
            'BCVH Phú Lộc': [594, 391, 65.82],
            'BCVH Thuận An': [425, 362, 85.18],
            'BCVH Thuận Hóa': [3518, 2367, 67.28],
        });
        assert.equal(table.meta.postman_count, 128);
        assert.deepEqual([table.total_row.volume, table.total_row.passed], [6466, 4475]);
        const ranking = await service.getBcvhRanking(DAY, DAY, 1, 20);
        assert.equal(ranking.data.length, 6);
    } finally { await close(); }
});
