'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { HomeExecutiveService, TARGETS } = require('./HomeExecutiveService');
const { CANONICAL_CODES } = require('./F11RankingService');

// Understands the four lookups of the service: latest day (<= anchor), k-th previous loaded day (every day
// from firstDay to the latest has data), last loaded day inside a range, earliest day.
function fakeDb(dateByTable, firstDay = '2026-01-01') {
    const shift = (date, delta) => {
        const d = new Date(`${date}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + delta);
        return d.toISOString().slice(0, 10);
    };
    return {
        get(sql, params, cb) {
            const table = Object.keys(dateByTable).find((name) => sql.includes(name));
            const date = table ? dateByTable[table] : null;
            if (!date) return cb(null, { d: null });
            if (sql.includes('MIN(')) return cb(null, { d: firstDay });
            if (sql.includes('DISTINCT')) {
                const day = shift(params[0] < date ? params[0] : date, -params[1]);
                return cb(null, { d: day >= firstDay ? day : null });
            }
            if (sql.includes('BETWEEN')) {
                const [from, upper] = params;
                const last = date < upper ? date : upper;
                return cb(null, { d: last >= from ? last : null });
            }
            const limit = params?.[0];
            return cb(null, { d: !limit || date <= limit ? date : limit });
        },
    };
}

function adapter({ rate = 92, volume = 100, rank = 5, trendRates = {}, withRank = true, rows = [] } = {}) {
    const rankService = {
        async getNationalRankSummary(from, to) { return { available: withRank, rank: 7, total: 34, metric_value: 91.5, from, to }; },
        async getNationalRanking() {
            return {
                available: true, previous_period: '2026-10-10', total: 3,
                items: [
                    { rank: 1, ma_tinh: 'A', ten_tinh: 'Alpha', volume: 100, passed: 99, failed: 1, rate: 99, previous_rank: 1, movement: 0, is_hue: false },
                    { rank: 2, ma_tinh: '53', ten_tinh: 'Huế', volume: 100, passed: 90, failed: 10, rate: 90, previous_rank: 3, movement: 1, is_hue: true },
                    { rank: 3, ma_tinh: 'C', ten_tinh: 'Gamma', volume: 100, passed: 80, failed: 20, rate: 80, previous_rank: 2, movement: -1, is_hue: false },
                ],
            };
        },
    };
    return {
        localTable: 'fact_x',
        summary: async () => ({
            total_bg: volume, total_passed: Math.round(volume * rate / 100), total_failed: volume - Math.round(volume * rate / 100),
            passed_rate: rate,
            national_rank: withRank ? { available: true, rank, total: 34, metric_value: 91.5, previous_rank: 7, movement: 2, previous_period: '2026-10-10' } : { available: false },
        }),
        trend: async () => ({ items: [
            { date: '2026-10-10', total_volume: 90, quality_rate: trendRates['2026-10-10'] ?? 90, data_available: true, national_rank: { available: true, rank: 7 } },
            { date: '2026-10-11', total_volume: 100, quality_rate: rate, data_available: true, national_rank: { available: true, rank } },
        ] }),
        ranking: async () => ({ data: rows }),
        rank: rankService,
    };
}

function service(adapters, dates = { fact_x: '2026-10-11' }) {
    return new HomeExecutiveService({ adapters, db: fakeDb(dates) });
}

const all4 = (a) => ({ f11: a, f12: a, f13: a, f41: a });

test('card: rate, gap to its own target, change against the previous day, rank and movement', async () => {
    const out = await service(all4(adapter({ rate: 92, rank: 5 }))).getExecutive();
    assert.equal(out.indicators.length, 4);
    assert.deepEqual(out.indicators.map((i) => i.id), ['f11', 'f12', 'f13', 'f41']);
    const f11 = out.indicators[0];
    const f13 = out.indicators[2];
    assert.equal(f11.rate, 92);
    assert.equal(f11.target_rate, 95);
    assert.equal(f11.gap_to_target, -3);
    assert.equal(f13.target_rate, 90);
    assert.equal(f13.gap_to_target, 2);
    assert.equal(f11.previous_date, '2026-10-10');
    assert.equal(f11.previous_rate, 90);
    assert.equal(f11.rate_change, 2);
    assert.equal(f11.rank, 5);
    assert.equal(f11.total, 34);
    assert.equal(f11.rank_movement, 2);
    assert.equal(f11.rank_basis_rate, 91.5);
    assert.deepEqual(f11.trend.map((t) => t.rank), [7, 5]);
    assert.equal(f11.monthly_rank[0].month, '2026-01');
    assert.equal(f11.monthly_rank.at(-1).month, '2026-10');
});

test('targets match the PO decision: F1.1 and F1.2 95, F1.3 and F4.1 90', () => {
    assert.deepEqual({ ...TARGETS }, { f11: 95, f12: 95, f13: 90, f41: 90 });
});

test('no national data for an indicator: explicit unavailable card, never 0 %', async () => {
    const out = await service(all4(adapter()), { fact_x: null }).getExecutive();
    for (const item of out.indicators) {
        assert.equal(item.available, false);
        assert.equal(item.rate, null);
        assert.equal(item.rank, null);
    }
});

test('national rank present but no detail volume: unavailable with the day named', async () => {
    const out = await service(all4(adapter({ volume: 0 }))).getExecutive();
    assert.equal(out.indicators[0].available, false);
    assert.match(out.indicators[0].message, /2026-10-11/);
});

test('previous day missing in the trend: change is null, not zero', async () => {
    const a = adapter();
    a.trend = async () => ({ items: [{ date: '2026-10-11', total_volume: 100, quality_rate: 92, data_available: true, national_rank: { available: true, rank: 5 } }] });
    const out = await service(all4(a)).getExecutive();
    assert.equal(out.indicators[0].previous_rate, null);
    assert.equal(out.indicators[0].rate_change, null);
});

test('F1.3 / F4.1 list every BCVH, lowest rate first, with gap to target and failed count', async () => {
    const rows = [99, 50, 80, 91, 70, 60].map((r, i) => ({ ma_bcvh: CANONICAL_CODES[i], ten_bcvh: `Unit ${i}`, total_bg: 10, passed_rate: r, total_failed: 10 - Math.round(r / 10) }));
    rows.push({ ma_bcvh: '531120', ten_bcvh: 'Khách hàng lớn', total_bg: 1, passed_rate: 0, total_failed: 1 }); // not a BCVH: left out
    const out = await service(all4(adapter({ rows }))).getExecutive();
    for (const index of [2, 3]) {
        const focus = out.indicators[index].focus_units;
        assert.equal(focus.kind, 'bcvh');
        assert.deepEqual(focus.items.map((u) => u.rate), [50, 60, 70, 80, 91, 99]);
        assert.equal(focus.items[0].gap_to_target, -40);
    }
});

test('F1.1 lists the 5 accepting-office x delivering-BCVH pairs with the largest volume below 85 %', async () => {
    const cell = (volume, rate) => ({ volume, passed: Math.round(volume * rate / 100), failed: volume - Math.round(volume * rate / 100), blank: 0, rate });
    const a = adapter();
    a.pairs = async () => ({
        columns: [{ ma_bcvh: 'B1', ten_bcvh: 'BCVH Một' }, { ma_bcvh: 'B2', ten_bcvh: 'BCVH Hai' }, { ma_bcvh: 'OTHER', ten_bcvh: 'Khác' }],
        rows: [
            { ma_chap_nhan: 'O1', ten_chap_nhan: 'Office 1', cells: { B1: cell(50, 40), B2: cell(30, 90), OTHER: cell(99, 10) } },
            { ma_chap_nhan: 'O2', ten_chap_nhan: 'Office 2', cells: { B1: cell(20, 84), B2: cell(10, 60) } },
            { ma_chap_nhan: 'O3', ten_chap_nhan: 'Office 3', cells: { B1: cell(40, 85), B2: cell(5, 20) } },
            { ma_chap_nhan: 'O4', ten_chap_nhan: 'Office 4', cells: { B1: cell(8, 50), B2: cell(7, 0) } },
            { ma_chap_nhan: 'O5', ten_chap_nhan: 'Office 5', cells: { B1: cell(6, 10), B2: null } },
        ],
    });
    const out = await service({ f11: a, f12: adapter(), f13: adapter(), f41: adapter() }).getExecutive();
    const focus = out.indicators[0].focus_units;
    assert.equal(focus.kind, 'pairs');
    assert.equal(focus.threshold, 85);
    // "Khác" column and pairs at/above 85 % are left out; the rest are ordered by volume
    assert.deepEqual(focus.items.map((u) => `${u.ma_bcvh}>${u.ten_phat}`), ['O1>BCVH Một', 'O2>BCVH Một', 'O2>BCVH Hai', 'O4>BCVH Một', 'O4>BCVH Hai']);
    assert.equal(focus.items[0].ten_bcvh, 'Office 1');
    assert.equal(focus.items[0].volume, 50);
    assert.equal(focus.items[0].failed, 30);
    assert.equal(focus.items[0].gap_to_target, -55);
});

test('F1.2 lists the 5 accepting offices with the largest volume below 90 %', async () => {
    const a = adapter();
    a.offices = async () => ({ data: [
        { ma_bcvh: 'A', ten_bcvh: 'A', total_bg: 10, passed_rate: 50, total_failed: 5 },
        { ma_bcvh: 'B', ten_bcvh: 'B', total_bg: 90, passed_rate: 95, total_failed: 4 },
        { ma_bcvh: 'C', ten_bcvh: 'C', total_bg: 30, passed_rate: 89.9, total_failed: 3 },
        { ma_bcvh: 'D', ten_bcvh: 'D', total_bg: 20, passed_rate: 90, total_failed: 2 },
        { ma_bcvh: 'E', ten_bcvh: 'E', total_bg: 25, passed_rate: 70, total_failed: 8 },
        { ma_bcvh: 'F', ten_bcvh: 'F', total_bg: 12, passed_rate: 10, total_failed: 11 },
        { ma_bcvh: 'G', ten_bcvh: 'G', total_bg: 11, passed_rate: 20, total_failed: 9 },
        { ma_bcvh: 'H', ten_bcvh: 'H', total_bg: 0, passed_rate: null, total_failed: 0 },
    ] });
    const out = await service({ f11: adapter(), f12: a, f13: adapter(), f41: adapter() }).getExecutive();
    const focus = out.indicators[1].focus_units;
    assert.equal(focus.kind, 'offices');
    assert.equal(focus.threshold, 90);
    assert.deepEqual(focus.items.map((u) => u.ma_bcvh), ['C', 'E', 'F', 'G', 'A']);
    assert.equal(focus.items[0].gap_to_target, -5.1);
});

test('a failing pair / office source leaves an empty list, not a broken card', async () => {
    const a = adapter();
    a.pairs = async () => { throw new Error('boom'); };
    const out = await service({ f11: a, f12: adapter(), f13: adapter(), f41: adapter() }).getExecutive();
    assert.equal(out.indicators[0].available, true);
    assert.deepEqual(out.indicators[0].focus_units.items, []);
});

test('an indicator that throws does not break the others', async () => {
    const broken = adapter();
    broken.summary = async () => { throw new Error('boom'); };
    const out = await service({ f11: broken, f12: adapter(), f13: adapter(), f41: adapter() }).getExecutive();
    assert.equal(out.indicators[0].available, false);
    assert.equal(out.indicators[1].available, true);
});

test('national ranking: Hue flagged, gap to the province just above and to the national rate', async () => {
    const out = await service(all4(adapter())).getNationalRanking({ indicator: 'f13', period: 'day', anchorDate: '2026-10-11' });
    assert.equal(out.available, true);
    assert.equal(out.items.length, 3);
    assert.equal(out.hue.rank, 2);
    assert.equal(out.hue.above.ten_tinh, 'Alpha');
    assert.equal(out.hue.above.gap, 9);
    assert.equal(out.national_rate, 89.7);
    assert.equal(out.hue.gap_to_target, 0);
    assert.equal(out.items[1].gap_to_target, 0);
});

test('national ranking, month view: movement is read against the whole previous month, same as the monthly rank block', async () => {
    const calls = [];
    const a = adapter();
    const base = a.rank.getNationalRanking;
    a.rank.getNationalRanking = async (from, to) => {
        calls.push([from, to]);
        const table = await base(from, to);
        if (from === '2026-09-01') {
            // previous month: Hue was 3rd (now 2nd -> +1), Gamma was 2nd (now 3rd -> -1)
            return { ...table, previous_period: '2026-08-31', items: [
                { ...table.items[0], rank: 1 }, { ...table.items[2], rank: 2 }, { ...table.items[1], rank: 3 },
            ] };
        }
        return table;
    };
    const out = await service(all4(a)).getNationalRanking({ indicator: 'f13', period: 'month', anchorDate: '2026-10-11' });
    assert.deepEqual(calls.map((c) => c.join('..')), ['2026-10-01..2026-10-11', '2026-09-01..2026-09-30']);
    assert.equal(out.movement_basis, 'month');
    assert.equal(out.previous_period, '2026-09-01..2026-09-30');
    const hue = out.items.find((i) => i.is_hue);
    assert.equal(hue.previous_rank, 3);
    assert.equal(hue.movement, 1);
    const gamma = out.items.find((i) => i.ma_tinh === 'C');
    assert.equal(gamma.movement, -1); // was 2nd, now 3rd
});

test('national ranking, day view keeps the previous-day movement', async () => {
    const out = await service(all4(adapter())).getNationalRanking({ indicator: 'f13', period: 'day', anchorDate: '2026-10-11' });
    assert.equal(out.movement_basis, 'day');
    assert.equal(out.items[1].movement, 1);
});

test('national ranking rejects an unknown indicator and a bad date', async () => {
    const s = service(all4(adapter()));
    await assert.rejects(() => s.getNationalRanking({ indicator: 'f99' }), { code: 'INVALID_INDICATOR' });
    await assert.rejects(() => s.getExecutive({ anchorDate: '2026-13-40' }), { code: 'INVALID_DATE' });
});

// ---- period filter (HOME-BI-02): week / month cards and the back button ---------------------------------------

// Daily series, 10 parcels a day, 9 passed; the period counts below are what the fake summary returns.
function periodAdapter(extra = {}) {
    const a = adapter();
    const calls = { summary: [], rank: [] };
    const counts = { '2026-10-15..2026-10-20': [60, 54], '2026-10-08..2026-10-14': [70, 63], '2026-10-01..2026-10-20': [200, 180], '2026-09-01..2026-09-30': [300, 240] };
    a.summary = async (from, to) => {
        calls.summary.push(`${from}..${to}`);
        const [total, passed] = counts[`${from}..${to}`] || [0, 0];
        return { total_bg: total, total_passed: passed, total_failed: total - passed, passed_rate: total ? Math.round((passed / total) * 10000) / 100 : 0 };
    };
    a.rank.getNationalRankSummary = async (from, to) => {
        calls.rank.push(`${from}..${to}`);
        const rank = { '2026-10-15..2026-10-20': 4, '2026-10-08..2026-10-14': 6, '2026-10-01..2026-10-20': 5, '2026-09-01..2026-09-30': 14 }[`${from}..${to}`];
        return rank ? { available: true, rank, total: 34, metric_value: 90 } : { available: false };
    };
    a.trend = async (from, to) => {
        const items = [];
        for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
            const date = d.toISOString().slice(0, 10);
            items.push({ date, total_volume: 10, passed: 9, failed: 1, quality_rate: 90, data_available: true });
        }
        return { items };
    };
    return Object.assign(a, extra, { calls });
}

test('week filter: whole-week figures, change against the previous full week, rank movement on the same basis', async () => {
    const a = periodAdapter();
    const out = await service(all4(a), { fact_x: '2026-10-20' }).getExecutive({ period: 'week' });
    const card = out.indicators[2];
    assert.equal(card.period, 'week');
    assert.equal(card.period_from, '2026-10-15');
    assert.equal(card.period_to, '2026-10-20'); // running week: read to date
    assert.equal(card.period_partial, true);
    assert.equal(card.period_week, 42);
    assert.equal(card.volume, 60);
    assert.equal(card.rate, 90); // 54 / 60, from summed counts
    assert.equal(card.previous_rate, 90);
    assert.equal(card.rate_change, 0);
    assert.equal(card.rank, 4);
    assert.equal(card.previous_rank, 6);
    assert.equal(card.rank_movement, 2); // 6 -> 4
    assert.equal(card.trend_kind, 'week');
    assert.ok(a.calls.summary.includes('2026-10-08..2026-10-14'));
    assert.equal(out.period_info.period_week, 42);
    assert.equal(out.period_info.has_next, false);
    assert.equal(out.period_info.has_previous, true);
});

test('week filter, one step back: the whole previous Thursday-Wednesday week, no longer partial', async () => {
    const out = await service(all4(periodAdapter()), { fact_x: '2026-10-20' }).getExecutive({ period: 'week', offset: -1 });
    const card = out.indicators[0];
    assert.equal(card.period_from, '2026-10-08');
    assert.equal(card.period_to, '2026-10-14');
    assert.equal(card.period_partial, false);
    assert.equal(card.period_week, 41);
    assert.equal(card.rank, 6);
    assert.equal(out.period_info.offset, -1);
    assert.equal(out.period_info.has_next, true);
});

test('month filter: month to date against the whole previous month; series is monthly', async () => {
    const out = await service(all4(periodAdapter()), { fact_x: '2026-10-20' }).getExecutive({ period: 'month' });
    const card = out.indicators[0];
    assert.equal(card.period_from, '2026-10-01');
    assert.equal(card.period_to, '2026-10-20');
    assert.equal(card.period_partial, true);
    assert.equal(card.rate, 90);
    assert.equal(card.previous_rate, 80); // September in full: 240 / 300
    assert.equal(card.rate_change, 10);
    assert.equal(card.rank_movement, 9); // 14 -> 5
    assert.equal(card.trend_kind, 'month');
    assert.equal(card.trend.at(-1).date, '2026-10-01');
    assert.equal(card.trend.at(-1).rate, card.rate); // the month on screen carries the card's own rate
});

test('day filter, one step back: the previous loaded day', async () => {
    const out = await service(all4(periodAdapter()), { fact_x: '2026-10-20' }).getExecutive({ period: 'day', offset: -1 });
    assert.equal(out.indicators[0].period_to, '2026-10-19');
    assert.equal(out.period_info.period_to, '2026-10-19');
});

test('a period with no counts is an explicit unavailable card, not zero', async () => {
    const out = await service(all4(periodAdapter()), { fact_x: '2026-10-20' }).getExecutive({ period: 'month', offset: -2 });
    assert.equal(out.indicators[0].available, false);
    assert.equal(out.indicators[0].rate, null);
});

test('invalid period / offset are rejected', async () => {
    const s = service(all4(adapter()));
    await assert.rejects(() => s.getExecutive({ period: 'year' }), { code: 'MISSING_PARAM' });
    await assert.rejects(() => s.getExecutive({ offset: 1 }), { code: 'INVALID_RANGE' });
    await assert.rejects(() => s.getExecutive({ offset: Number('x') }), { code: 'INVALID_RANGE' });
});

test('national ranking follows the same period and offset as the cards', async () => {
    const calls = [];
    const a = periodAdapter();
    const base = a.rank.getNationalRanking;
    a.rank.getNationalRanking = async (from, to) => { calls.push(`${from}..${to}`); return base(from, to); };
    await service(all4(a), { fact_x: '2026-10-20' }).getNationalRanking({ indicator: 'f13', period: 'week', offset: -1 });
    assert.equal(calls[0], '2026-10-08..2026-10-14');
});
