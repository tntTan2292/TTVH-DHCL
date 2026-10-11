const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { F12NationalRankService } = require('./F12NationalRankService');
const { parseF12TctExcel } = require('./f12TctExcelParser');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('./nationalExcelParser');
const { applyF12Schema } = require('../../migrate_f12_schema');

const COLUMNS = ['ngay_do_kiem', 'ma_tinh_chap_nhan', 'ten_tinh_chap_nhan', 'sl_bd10_dong_di', 'sl_bd10_quet_tms', 'sl_dung_qd'];

async function makeService(rows) {
    const dbPath = path.join(os.tmpdir(), `f12-rank-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    await applyF12Schema(dbPath);
    const db = await new Promise((resolve, reject) => { const d = new sqlite3.Database(dbPath, (e) => (e ? reject(e) : resolve(d))); });
    for (const r of rows) {
        await new Promise((resolve, reject) => db.run(
            `INSERT INTO fact_f12_national (${COLUMNS.join(',')}) VALUES (${COLUMNS.map(() => '?').join(',')})`,
            [r.date, r.code, r.name || `Unit ${r.code}`, r.den, r.tms ?? r.den, r.ok],
            (e) => (e ? reject(e) : resolve()),
        ));
    }
    return { service: new F12NationalRankService(db), close: () => new Promise((resolve) => db.close(() => { fs.rmSync(dbPath, { force: true }); resolve(); })) };
}

function population(date, overrides = {}) {
    return NATIONAL_RANKED_PROVINCE_CODES.map((code) => ({ date, code, den: 1000, ok: 800, ...overrides[code] }));
}

test('PD-F12-7: ranked by accepting province over the 34 codes; EMS and the centres (rates above 100 %) are ignored', async () => {
    const rows = [
        ...population('2026-10-10', { 53: { ok: 900 }, 70: { ok: 950 } }),
        { date: '2026-10-10', code: '01', den: 5000, ok: 5000 },
        { date: '2026-10-10', code: '73', den: 988, tms: 2068, ok: 1518 }, // Cho Lon 153,64 %
        { date: '2026-10-10', code: '82', den: 800, ok: 790 },
    ];
    const { service, close } = await makeService(rows);
    try {
        const rank = await service.getNationalRankSummary('2026-10-10', '2026-10-10');
        assert.equal(rank.available, true);
        assert.deepEqual([rank.rank, rank.total, rank.metric_value, rank.volume, rank.passed], [2, 34, 90, 1000, 900]);
        assert.equal(rank.metric, 'tl_dung_qd');
        const list = await service.getNationalRanking('2026-10-10', '2026-10-10');
        assert.equal(list.total, 34);
        assert.equal(list.items[0].ma_tinh, '70');
        assert.ok(list.items.every((item) => NATIONAL_RANKED_PROVINCE_CODES.includes(item.ma_tinh)));
        assert.equal(list.items.find((item) => item.is_hue).rank, 2);
    } finally { await close(); }
});

test('a range adds the days of a province before the rate; movement compares with the previous day', async () => {
    const rows = [
        ...population('2026-10-09', { 53: { ok: 700 } }),               // Hue 70 % on 09/10: last
        ...population('2026-10-10', { 53: { den: 3000, ok: 2970 } }),  // Hue 99 % on 10/10: first
    ];
    const { service, close } = await makeService(rows);
    try {
        const day = await service.getNationalRankSummary('2026-10-10', '2026-10-10');
        assert.deepEqual([day.rank, day.previous_rank, day.movement], [1, 34, 33]);
        const range = await service.getNationalRankSummary('2026-10-09', '2026-10-10');
        assert.equal(range.volume, 4000);
        assert.equal(range.passed, 3670); // 91,75 % > 80 %: still first
        assert.equal(range.rank, 1);
        const byDate = await service.getNationalRanksForDates(['2026-10-09', '2026-10-10', '2026-10-11']);
        assert.equal(byDate['2026-10-09'].rank, 34);
        assert.equal(byDate['2026-10-11'].available, false);
    } finally { await close(); }
});

const REAL_TCT = process.env.F12_REAL_TCT_FILE || path.resolve(__dirname, '../../../Data DKCL/F1.2-TCT-2026.10.10.xlsx');

test('real national file 10/10/2026: Huế 8th of 34 at 92,2 % (92,15 %)', { skip: fs.existsSync(REAL_TCT) ? false : 'PO TCT file not present on this machine' }, async () => {
    const parsed = parseF12TctExcel(fs.readFileSync(REAL_TCT), 'F1.2-2026.10.10.xlsx').parsedData;
    const rows = parsed.map((r) => ({ date: r.ngay_do_kiem, code: r.ma_tinh_chap_nhan, name: r.ten_tinh_chap_nhan, den: r.sl_bd10_dong_di, tms: r.sl_bd10_quet_tms, ok: r.sl_dung_qd }));
    const { service, close } = await makeService(rows);
    try {
        const rank = await service.getNationalRankSummary('2026-10-10', '2026-10-10');
        assert.deepEqual([rank.rank, rank.total, rank.volume, rank.passed, rank.metric_value], [8, 34, 1758, 1620, 92.2]);
        const list = await service.getNationalRanking('2026-10-10', '2026-10-10');
        assert.deepEqual(list.items.slice(0, 4).map((item) => item.ma_tinh), ['70', '84', '24', '10']);
        assert.equal(list.items.find((item) => item.ma_tinh === '55').rank, 9);
        assert.equal(list.items.find((item) => item.ma_tinh === '52').rank, 12);
    } finally { await close(); }
});
