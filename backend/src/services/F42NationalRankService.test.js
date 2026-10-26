const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { F42NationalRankService } = require('./F42NationalRankService');
const { parseF42Tct } = require('./f42TctParser');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('./nationalExcelParser');
const { applyF42Schema } = require('../../migrate_f42_schema');

const COLUMNS = ['ngay_do_kiem', 'ma_tinh_phat', 'ten_tinh_phat', 'sl_gbt', 'sl_dung_qd'];

async function makeService(rows) {
    const dbPath = path.join(os.tmpdir(), `f42-rank-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    await applyF42Schema(dbPath);
    const db = await new Promise((resolve, reject) => { const d = new sqlite3.Database(dbPath, (e) => (e ? reject(e) : resolve(d))); });
    for (const r of rows) {
        await new Promise((resolve, reject) => db.run(
            `INSERT INTO fact_f42_national (${COLUMNS.join(',')}) VALUES (${COLUMNS.map(() => '?').join(',')})`,
            [r.date, r.code, r.name || `Unit ${r.code}`, r.den, r.ok],
            (e) => (e ? reject(e) : resolve()),
        ));
    }
    return { service: new F42NationalRankService(db), close: () => new Promise((resolve) => db.close(() => { fs.rmSync(dbPath, { force: true }); resolve(); })) };
}

function population(date, overrides = {}) {
    return NATIONAL_RANKED_PROVINCE_CODES.map((code) => ({ date, code, den: 1000, ok: 700, ...overrides[code] }));
}

test('PD-F42-6: ranked by delivering province over the 34 codes, rate = PTC dung quy dinh / GBT', async () => {
    const { service, close } = await makeService(population('2026-10-10', { 53: { ok: 800 }, 70: { ok: 900 } }));
    try {
        const rank = await service.getNationalRankSummary('2026-10-10', '2026-10-10');
        assert.equal(rank.available, true);
        assert.deepEqual([rank.rank, rank.total, rank.metric_value, rank.volume, rank.passed], [2, 34, 80, 1000, 800]);
        assert.equal(rank.metric, 'tl_dung_qd');
        const list = await service.getNationalRanking('2026-10-10', '2026-10-10');
        assert.equal(list.total, 34);
        assert.equal(list.items[0].ma_tinh, '70');
        assert.equal(list.items.find((item) => item.is_hue).rank, 2);
    } finally { await close(); }
});

test('a range adds the days of a province before the rate; a missing day is unavailable', async () => {
    const rows = [
        ...population('2026-10-09', { 53: { ok: 500 } }),
        ...population('2026-10-10', { 53: { den: 3000, ok: 2850 } }),
    ];
    const { service, close } = await makeService(rows);
    try {
        const day = await service.getNationalRankSummary('2026-10-10', '2026-10-10');
        assert.deepEqual([day.rank, day.previous_rank], [1, 34]);
        const range = await service.getNationalRankSummary('2026-10-09', '2026-10-10');
        assert.deepEqual([range.volume, range.passed, range.rank], [4000, 3350, 1]);
        assert.equal((await service.getNationalRanksForDates(['2026-10-11']))['2026-10-11'].available, false);
    } finally { await close(); }
});

const REAL_TCT = path.resolve(__dirname, '../../../Data DKCL/F4.2-TCT-2026.10.10.xlsx');

test('real national file 10/10/2026: Huế 26th of 34 at 69,2 %, Cao Bằng first, Tuyên Quang last', { skip: fs.existsSync(REAL_TCT) ? false : 'PO TCT file not present on this machine' }, async () => {
    const parsed = parseF42Tct(fs.readFileSync(REAL_TCT), 'F4.2-2026.10.10.xlsx').parsedData;
    const rows = parsed.map((r) => ({ date: r.ngay_do_kiem, code: r.ma_tinh_phat, name: r.ten_tinh_phat, den: r.sl_gbt, ok: r.sl_dung_qd }));
    const { service, close } = await makeService(rows);
    try {
        const rank = await service.getNationalRankSummary('2026-10-10', '2026-10-10');
        assert.deepEqual([rank.rank, rank.total, rank.volume, rank.passed, rank.metric_value], [26, 34, 6466, 4475, 69.2]);
        const list = await service.getNationalRanking('2026-10-10', '2026-10-10');
        assert.equal(list.items[0].ma_tinh, '27');
        assert.equal(list.items[33].ma_tinh, '30');
    } finally { await close(); }
});
