const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { F11NationalRankService } = require('./F11NationalRankService');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('./nationalExcelParser');
const { applyF11Phase4Schema } = require('../../migrate_f11_phase4_schema');

const COLUMNS = ['ngay_do_kiem', 'ma_tinh_chap_nhan', 'ten_tinh_chap_nhan', 'ma_tinh_phat', 'ten_tinh_phat', 'sl_theo_chi_tieu', 'sl_dung_chi_tieu'];

async function makeService(rows) {
    const dbPath = path.join(os.tmpdir(), `f11-rank-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    await applyF11Phase4Schema(dbPath);
    const db = await new Promise((resolve, reject) => { const d = new sqlite3.Database(dbPath, (e) => (e ? reject(e) : resolve(d))); });
    for (const r of rows) {
        await new Promise((resolve, reject) => db.run(
            `INSERT INTO fact_f11_national (${COLUMNS.join(',')}) VALUES (${COLUMNS.map(() => '?').join(',')})`,
            [r.date, r.acc, `Unit ${r.acc}`, r.del, `Unit ${r.del}`, r.den, r.ok],
            (e) => (e ? reject(e) : resolve()),
        ));
    }
    return { service: new F11NationalRankService(db), close: () => new Promise((resolve) => db.close(() => { fs.rmSync(dbPath, { force: true }); resolve(); })) };
}

// every ranked province 60 % unless overridden; extra rows can be appended
function population(date, overrides = {}) {
    return NATIONAL_RANKED_PROVINCE_CODES.map((code) => ({ date, acc: code, del: code, den: 1000, ok: 600, ...overrides[code] }));
}

test('PD-17: rows of the same delivering province are ADDED before the rate (not same-province rows only)', async () => {
    const rows = [
        ...population('2026-10-07', { 53: { ok: 850 }, 70: { ok: 830 }, 10: { ok: 900 } }), // Ha Noi own row: 90 %
        { date: '2026-10-07', acc: '01', del: '10', den: 1000, ok: 700 },                      // + a cross-province row: 70 %
    ];
    const { service, close } = await makeService(rows);
    try {
        const rank = await service.getNationalRankSummary('2026-10-07', '2026-10-07');
        assert.equal(rank.available, true);
        assert.equal(rank.rank, 1); // Hue 85 % first
        assert.equal(rank.total, 34);
        assert.equal(rank.metric_value, 85);
        assert.equal(rank.volume, 1000);
        assert.equal(rank.passed, 850);
        // Ha Noi = (900 + 700) / 2000 = 80 % -> third, behind Hue 85 % and Ho Chi Minh 83 %
        const ranked = await service._rankedRange('2026-10-07', '2026-10-07');
        assert.deepEqual(ranked.slice(0, 3).map((r) => r.ma_don_vi), ['53', '70', '10']);
        const hanoi = ranked.find((r) => r.ma_don_vi === '10');
        assert.deepEqual({ volume: hanoi.volume, passed: hanoi.passed }, { volume: 2000, passed: 1600 });
        // same-province-only would have put Ha Noi first (90 %): the rule is NOT that
    } finally { await close(); }
});

test('only the 34 ranked provinces are ranked; other delivery codes are ignored', async () => {
    const rows = [...population('2026-10-07'), { date: '2026-10-07', acc: '82', del: '82', den: 5000, ok: 5000 }, { date: '2026-10-07', acc: '71', del: '71', den: 100, ok: 100 }];
    const { service, close } = await makeService(rows);
    try {
        const ranked = await service._rankedRange('2026-10-07', '2026-10-07');
        assert.equal(ranked.length, 34);
        assert.equal(ranked.some((r) => r.ma_don_vi === '82' || r.ma_don_vi === '71'), false);
    } finally { await close(); }
});

test('ties are ordered by volume then code and never merged', async () => {
    const rows = population('2026-10-07', { 53: { den: 2000, ok: 1200 }, 70: { den: 500, ok: 300 } }); // all exactly 60 %
    const { service, close } = await makeService(rows);
    try {
        const ranked = await service._rankedRange('2026-10-07', '2026-10-07');
        assert.deepEqual(ranked.slice(0, 2).map((r) => r.ma_don_vi), ['53', '10']); // biggest volume first, then code asc
        assert.equal(ranked[ranked.length - 1].ma_don_vi, '70'); // smallest volume of the tied group last
        const rank = await service.getNationalRankSummary('2026-10-07', '2026-10-07');
        assert.equal(rank.rank, 1);
    } finally { await close(); }
});

test('a range sums numerators and denominators over the days before the rate', async () => {
    const rows = [
        ...population('2026-10-06', { 53: { den: 100, ok: 100 } }),
        ...population('2026-10-07', { 53: { den: 900, ok: 450 } }),
    ];
    const { service, close } = await makeService(rows);
    try {
        const rank = await service.getNationalRankSummary('2026-10-06', '2026-10-07');
        assert.equal(rank.period_type, 'selected_range');
        assert.equal(rank.volume, 1000);
        assert.equal(rank.passed, 550);
        assert.equal(rank.metric_value, 55); // not the mean of 100 % and 50 %
    } finally { await close(); }
});

test('previous day rank and movement', async () => {
    const rows = [
        ...population('2026-10-06', { 53: { ok: 500 } }),
        ...population('2026-10-07', { 53: { ok: 900 } }),
    ];
    const { service, close } = await makeService(rows);
    try {
        const rank = await service.getNationalRankSummary('2026-10-07', '2026-10-07');
        assert.equal(rank.rank, 1);
        assert.equal(rank.previous_period, '2026-10-06');
        assert.equal(rank.previous_rank > 1, true);
        assert.equal(rank.movement, rank.previous_rank - 1);
    } finally { await close(); }
});

test('many single dates in one call; missing dates and invalid input are unavailable, never an error', async () => {
    const { service, close } = await makeService(population('2026-10-07', { 53: { ok: 990 } }));
    try {
        const result = await service.getNationalRanksForDates(['2026-10-07', '2026-10-08', 'bad']);
        assert.equal(result['2026-10-07'].available, true);
        assert.equal(result['2026-10-07'].rank, 1);
        assert.equal(result['2026-10-08'].available, false);
        assert.equal('bad' in result, false);
        assert.deepEqual(await service.getNationalRanksForDates([]), {});
        assert.equal((await service.getNationalRankSummary('2026-10-09', '2026-10-09')).available, false);
        assert.equal((await service.getNationalRankSummary('x', 'y')).available, false);
        assert.equal((await service.getNationalRankSummary('2026-10-08', '2026-10-07')).available, false);
    } finally { await close(); }
});

test('Hue missing from a day makes that day unavailable for Hue, not an error', async () => {
    const rows = population('2026-10-07').filter((r) => r.del !== '53');
    const { service, close } = await makeService(rows);
    try {
        const result = await service.getNationalRanksForDates(['2026-10-07']);
        assert.equal(result['2026-10-07'].available, false);
        assert.match(result['2026-10-07'].message, /Huế/);
    } finally { await close(); }
});
