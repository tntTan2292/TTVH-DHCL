// OPS-JOURNAL-01 (A2): candidate detection and ranking on fake indicator adapters + a real (temp) stock snapshot.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-ops-candidates-'));
const dbFile = path.join(tmpDir, 'candidates.sqlite');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = dbFile;

const { db, run } = require('../../config/db');
const { applyHangtonInventory01Schema } = require('../../../migrate_hangton_inventory_01_schema');
const candidates = require('./candidateService');

const THUY = ['536250', 'BCVH Hương Thủy'];
const THUA = ['533140', 'BCVH Thuận Hóa'];
const TRA = ['535470', 'BCVH Hương Trà'];
const JOURNAL_DAY = '2026-10-30'; // data day N-1 = 2026-10-29, compare day = 2026-10-22, month start = 2026-10-01

test.before(async () => {
    await applyHangtonInventory01Schema(dbFile);
    for (const table of ['fact_f11', 'fact_f12', 'fact_f13', 'fact_f41']) {
        await run(`CREATE TABLE ${table} (ngay_do_kiem TEXT)`);
        await run(`INSERT INTO ${table} VALUES ('2026-10-28'), ('2026-10-29'), ('2026-10-30')`); // 30th is the journal day: never used
    }
    await run(`INSERT INTO hangton_snapshot (id, business_date, slot, captured_at, source_row_count, kept_row_count, is_stale, trigger) VALUES (1, '2026-10-30', '0730', 'x', 0, 0, 0, 'SCHEDULE')`);
    const item = (code, rank, office, officeCode, cod) => run(
        `INSERT INTO hangton_snapshot_item (snapshot_id, item_code, status_name, ton_level, ton_rank, office, office_code, district, cod, customer_class, postman_code, postman_name)
         VALUES (1, ?, 's', 'l', ?, ?, ?, 'Huế', ?, 'KH Thường', 'P', 'B')`, [code, rank, office, officeCode, cod]);
    for (let i = 0; i < 4; i += 1) await item(`A${i}`, 5, THUY[1], THUY[0], 100000);
    await item('A9', 14, THUY[1], THUY[0], 500000);
    await item('B0', 7, THUA[1], THUA[0], 20000);
    await item('C0', 3, TRA[1], TRA[0], 99999); // under 5 days: not a candidate
    await item('D0', 0, 'no code', '', 1);
});

test.after(async () => {
    await new Promise((resolve) => db.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

const row = (code, name, total, failed, rate) => ({ ma_bcvh: code, ten_bcvh: name, total_bg: total, total_failed: failed, passed_rate: rate });
// ranking(from, to) keyed by the range, so the same fake answers "day", "compare day" and "month to date"
const byRange = (map) => async (from, to) => ({ data: map[`${from}..${to}`] || [] });
const dbModule = () => require('../../config/db');

function fakeAdapters(overrides = {}) {
    return {
        f11: { localTable: 'fact_f11', ranking: byRange({}), pairs: async () => ({ rows: [], columns: [] }) },
        f12: { localTable: 'fact_f12', offices: byRange({}) },
        f13: { localTable: 'fact_f13', ranking: byRange({}) },
        f41: { localTable: 'fact_f41', ranking: byRange({}) },
        ...overrides,
    };
}

test('rate indicators: below target, enough volume, canonical BCVH only; score = failed x week-on-week drop; headline carries the figures', async () => {
    const adapters = fakeAdapters({
        f13: {
            localTable: 'fact_f13',
            ranking: byRange({
                '2026-10-29..2026-10-29': [row(THUY[0], THUY[1], 120, 21, 82.5), row(THUA[0], THUA[1], 200, 10, 95), row(TRA[0], TRA[1], 8, 4, 50), row('999999', 'Mã lạ', 100, 50, 50)],
                '2026-10-22..2026-10-22': [row(THUY[0], THUY[1], 110, 12, 88.8), row(THUA[0], THUA[1], 190, 8, 96)],
                '2026-10-01..2026-10-29': [row(THUY[0], THUY[1], 2000, 280, 86.1)],
            }),
        },
    });
    const result = await candidates.buildCandidates({ db: dbModule(), date: JOURNAL_DAY, adapters });
    const f13 = result.items.filter((i) => i.indicator === 'F1.3');
    assert.deepEqual(f13.map((i) => i.scopeKey), [THUY[0]], 'above target, 8 parcels and a stray code are not candidates');
    const [one] = f13;
    assert.equal(one.candidateId, `F1.3:BCVH:${THUY[0]}`);
    assert.equal(one.title, 'F1.3 - BCVH Hương Thủy');
    assert.equal(result.asOfDate, '2026-10-29');
    assert.equal(result.compareDate, '2026-10-22');
    assert.deepEqual(one.metrics, {
        rate: 82.5, total: 120, fail: 21, notEvaluated: null, compareRate: 88.8, compareTotal: 110, delta: -6.3, mtdRate: 86.1,
        stockGe5: null, stockGe7: null, stockGe14: null, cod: null,
    });
    assert.equal(one.score, Math.round(21 * (88.8 - 82.5) * 100) / 100);
    assert.equal(one.headline, 'Chỉ tiêu F1.3 của BCVH Hương Thủy ngày 29/10 đạt 82,5% (120 BG, 21 BG không đạt), giảm 6,3% so với cùng kỳ tuần trước (22/10: 88,8%, 110 BG). Lũy kế tháng 10 đến 29/10 đạt 86,1%.');
    assert.deepEqual(result.unavailable, []);
});

test('a unit that did not fall (or has no last-week data) ranks below every unit that fell', async () => {
    const adapters = fakeAdapters({
        f41: {
            localTable: 'fact_f41',
            ranking: byRange({
                '2026-10-29..2026-10-29': [row(THUY[0], THUY[1], 100, 40, 60), row(THUA[0], THUA[1], 100, 15, 85), row(TRA[0], TRA[1], 100, 20, 80)],
                '2026-10-22..2026-10-22': [row(THUY[0], THUY[1], 100, 30, 70), row(THUA[0], THUA[1], 100, 12, 88)],
            }),
        },
    });
    const f41 = (await candidates.buildCandidates({ db: dbModule(), date: JOURNAL_DAY, adapters })).items.filter((i) => i.indicator === 'F4.1');
    // Hương Thủy fell 10 (40 x 10 = 400), Thuận Hóa fell 3 (15 x 3 = 45); Hương Trà has no last week: 20 x (90-80) x 0.1 = 20
    assert.deepEqual(f41.map((i) => i.scopeKey), [THUY[0], THUA[0], TRA[0]]);
    assert.deepEqual(f41.map((i) => i.score), [400, 45, 20]);
    assert.equal(f41[2].metrics.compareRate, null);
    assert.ok(!f41[2].headline.includes('so với cùng kỳ'));
});

test('F1.1 gives delivering BCVH and accepting x delivering pairs; F1.2 gives accepting offices; "Khác" is not a pair', async () => {
    const adapters = fakeAdapters({
        f11: {
            localTable: 'fact_f11',
            ranking: byRange({ '2026-10-29..2026-10-29': [row(THUY[0], THUY[1], 300, 60, 80)] }),
            pairs: async (from) => (from === '2026-10-29' ? {
                columns: [{ ma_bcvh: THUY[0], ten_bcvh: THUY[1] }, { ma_bcvh: 'OTHER', ten_bcvh: 'Khác' }],
                rows: [{ ma_chap_nhan: '531120', ten_chap_nhan: 'Khách hàng lớn', cells: { [THUY[0]]: { volume: 40, failed: 12, rate: 70 }, OTHER: { volume: 99, failed: 99, rate: 0 } } }],
            } : { rows: [], columns: [] }),
        },
        f12: { localTable: 'fact_f12', offices: byRange({ '2026-10-29..2026-10-29': [row('531120', 'Khách hàng lớn', 50, 20, 60)] }) },
    });
    const items = (await candidates.buildCandidates({ db: dbModule(), date: JOURNAL_DAY, adapters })).items;
    const f11 = items.filter((i) => i.indicator === 'F1.1');
    assert.deepEqual(f11.map((i) => i.candidateId).sort(), [`F1.1:BCVH:${THUY[0]}`, `F1.1:PAIR:531120|${THUY[0]}`].sort());
    const pair = f11.find((i) => i.scopeType === 'PAIR');
    assert.equal(pair.title, 'F1.1 - Khách hàng lớn → BCVH Hương Thủy');
    assert.equal(pair.officeCode, THUY[0], 'a pair belongs to the delivering office');
    assert.deepEqual(items.filter((i) => i.indicator === 'F1.2').map((i) => i.scopeKey), ['531120']);
});

test('hàng tồn: offices with parcels >= 5 days, counts by age and COD; rows without an office code are ignored', async () => {
    const result = await candidates.buildCandidates({ db: dbModule(), date: JOURNAL_DAY, adapters: fakeAdapters() });
    const stock = result.items.filter((i) => i.indicator === 'HANGTON');
    assert.deepEqual(stock.map((i) => i.scopeKey), [THUY[0], THUA[0]], 'Hương Trà has only a 3-day parcel');
    assert.deepEqual([stock[0].metrics.stockGe5, stock[0].metrics.stockGe7, stock[0].metrics.stockGe14, stock[0].metrics.cod], [5, 1, 1, 900000]);
    assert.equal(stock[0].score, 5);
    assert.equal(stock[0].headline, 'Hàng tồn của BCVH Hương Thủy lúc 07:30 ngày 30/10: 5 bưu gửi tồn từ 5 ngày trở lên (từ 7 ngày: 1, từ 14 ngày: 1), COD 900.000 đồng.');
    assert.equal(result.asOfByIndicator.HANGTON, '2026-10-30');
});

test('ordering across indicators is by score / best score of the same indicator; caps and pre-selection hold', () => {
    const make = (indicator, n, score) => ({ candidateId: `${indicator}:${n}`, indicator, score });
    const all = [];
    for (let i = 1; i <= 8; i += 1) all.push(make('F1.3', i, 1000 - i * 10));
    for (let i = 1; i <= 8; i += 1) all.push(make('F4.1', i, 10 - i)); // tiny raw scores, same relative standing
    for (let i = 1; i <= 8; i += 1) all.push(make('HANGTON', i, 500 - i));
    const out = candidates.rankAndSelect(all);
    assert.equal(out.length, 18, 'at most 6 per indicator');
    for (const kind of ['F1.3', 'F4.1', 'HANGTON']) assert.equal(out.filter((i) => i.indicator === kind).length, 6);
    assert.deepEqual(out.slice(0, 3).map((i) => i.rankScore), [1, 1, 1], 'the best of each indicator comes first, whatever its raw score');
    assert.equal(out.filter((i) => i.preselected).length, 8);
    for (const kind of ['F1.3', 'F4.1', 'HANGTON']) assert.ok(out.filter((i) => i.preselected && i.indicator === kind).length <= 3);
    const many = Array.from({ length: 40 }, (_, i) => make(['F1.1', 'F1.2', 'F1.3', 'F4.1', 'HANGTON'][i % 5], i, 100 - i));
    assert.equal(candidates.rankAndSelect(many).length, 20, 'never more than 20 candidates');
});

test('one failing source is reported and the rest of the day still answers', async () => {
    const adapters = fakeAdapters({
        f12: { localTable: 'fact_f12', offices: async () => { throw new Error('boom'); } },
    });
    const result = await candidates.buildCandidates({ db: dbModule(), date: JOURNAL_DAY, adapters });
    assert.deepEqual(result.unavailable, [{ indicator: 'F1.2', message: 'Không đọc được số liệu chỉ tiêu này' }]);
    assert.ok(result.items.some((i) => i.indicator === 'HANGTON'));
    assert.ok(!JSON.stringify(result).includes('boom'), 'the error text stays in the log');
});

test('no loaded data before the journal day: that indicator is empty, not an error', async () => {
    const result = await candidates.buildCandidates({ db: dbModule(), date: '2026-10-01', adapters: fakeAdapters() });
    assert.equal(result.asOfDate, null);
    assert.deepEqual(result.items.filter((i) => i.indicator !== 'HANGTON'), []);
});
