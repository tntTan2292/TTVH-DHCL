'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { layoutFor, BLOCKS, SCOPES } = require('./blockRegistry');
const { resolvePeriod } = require('./periodResolve');
const { DaySummaryService, comparisonWindows, samePeriodWindow } = require('./DaySummaryService');

// ---- blockRegistry ---------------------------------------------------------------------------------------------

test('layout for a city-wide account lists every page and block', () => {
    const layout = layoutFor({ mode: 'all', bcvh: [] });
    assert.deepEqual(layout.pages.map((p) => p.id), ['ngay', 'tuan', 'thang', 'chuyen-de']);
    const ids = layout.pages.flatMap((p) => p.blocks).map((b) => b.id);
    assert.deepEqual(ids, BLOCKS.filter((b) => b.scope !== SCOPES.OWN).map((b) => b.id));
    assert.ok(ids.includes('day.operation'));
    assert.ok(!ids.includes('day.table'), 'the own-row table reached a city-wide account');
    assert.ok(!layout.pages[0].subtitle.includes('Trung tâm hành động'));
    assert.equal(layout.units.allow_all, true);
});

test('layout for a BCVH-mode account has no city block and no "all units" choice', () => {
    const layout = layoutFor({ mode: 'bcvh', bcvh: ['537015'] });
    const blocks = layout.pages.flatMap((p) => p.blocks);
    assert.ok(blocks.length > 0);
    assert.ok(blocks.every((b) => b.scope !== SCOPES.CITY), 'a city block reached a BCVH account');
    assert.equal(blocks.find((b) => b.id === 'day.operation'), undefined);
    assert.ok(blocks.some((b) => b.id === 'day.table'), 'a BCVH account lost its own-row day table');
    assert.equal(layout.units.allow_all, false);
    assert.deepEqual(layout.units.bcvh, ['537015']);
    assert.ok(!layout.pages[0].subtitle.includes('Bảng tổng hợp'));
});

test('the indicator matrix and postman blocks are on all three time pages, only for their indicator', () => {
    const ids = (indicator) => layoutFor({ mode: 'all', bcvh: [] }, indicator).pages.flatMap((p) => p.blocks).map((b) => b.id);
    for (const id of ['day.pair', 'week.pair', 'month.pair']) assert.ok(ids('f11').includes(id), id);
    for (const id of ['day.postman', 'week.postman', 'month.postman']) assert.ok(ids('f42').includes(id), id);
    assert.ok(!ids('f41').some((id) => id.endsWith('.pair') || id.endsWith('.postman')));
    assert.ok(!ids('f13').some((id) => id.endsWith('.pair') || id.endsWith('.postman')));
});

test('layout for a mode with no access is empty', () => {
    assert.deepEqual(layoutFor({ mode: 'none', bcvh: [] }).pages, []);
    assert.deepEqual(layoutFor(undefined).pages, []);
});

test('every block has a known scope and a page that exists', () => {
    const pages = new Set(layoutFor({ mode: 'all' }).pages.map((p) => p.id));
    for (const block of BLOCKS) {
        assert.ok(Object.values(SCOPES).includes(block.scope), block.id);
        assert.ok(pages.has(block.page), block.id);
    }
});

// ---- periodResolve ---------------------------------------------------------------------------------------------

const LATEST = '2026-10-30';

test('day -> the week that contains it and the month of that day', () => {
    const r = resolvePeriod({ kind: 'day', value: '2026-10-28', latestDate: LATEST });
    assert.equal(r.day, '2026-10-28');
    assert.equal(r.week.week_start, '2026-10-22'); // Thursday on or before Wed 28/10
    assert.equal(r.week.week_end, '2026-10-28');
    assert.equal(r.month.month_id, '2026-10');
    assert.equal(r.clamped, false);
});

test('week -> month of the week Thursday (D3) and the last day with data', () => {
    // Week starting Thursday 2026-10-29 ends Wednesday 2026-11-04, its Thursday is in October.
    const r = resolvePeriod({ kind: 'week', value: resolvePeriod({ kind: 'day', value: '2026-10-29' }).week.week_id, latestDate: LATEST });
    assert.equal(r.month.month_id, '2026-10');
    assert.equal(r.day, LATEST); // week end 04/11 is after the latest day with data
    assert.equal(r.clamped, true);
});

test('week that straddles two months follows its Thursday, not its end', () => {
    // Thursday 2026-09-24 .. Wednesday 2026-09-30 is September; Thursday 2026-10-01 .. 2026-10-07 is October.
    const sep = resolvePeriod({ kind: 'day', value: '2026-09-30' }).week.week_id;
    const oct = resolvePeriod({ kind: 'day', value: '2026-10-01' }).week.week_id;
    assert.equal(resolvePeriod({ kind: 'week', value: sep }).month.month_id, '2026-09');
    assert.equal(resolvePeriod({ kind: 'week', value: oct }).month.month_id, '2026-10');
    // A week opening on Thursday 2026-10-29 has its Thursday in October though it ends in November.
    const mixed = resolvePeriod({ kind: 'day', value: '2026-11-02' }).week.week_id;
    assert.equal(resolvePeriod({ kind: 'week', value: mixed }).month.month_id, '2026-10');
});

test('month -> its last day with data and the week containing that day', () => {
    const r = resolvePeriod({ kind: 'month', value: '2026-09', latestDate: LATEST });
    assert.equal(r.day, '2026-09-30');
    assert.equal(r.week.week_start, '2026-09-24');
    const current = resolvePeriod({ kind: 'month', value: '2026-10', latestDate: LATEST });
    assert.equal(current.day, LATEST);
    assert.equal(current.clamped, true);
});

test('latest -> the latest data day, the week containing it and the calendar month containing it (PO 2026-11-02)', () => {
    const r = resolvePeriod({ kind: 'latest', latestDate: '2026-11-01' });
    assert.equal(r.day, '2026-11-01');
    assert.equal(r.week.week_id, '2026-W44'); // Thursday 29/10 .. Wednesday 04/11
    assert.equal(r.week.week_start, '2026-10-29');
    assert.equal(r.month.month_id, '2026-11'); // the calendar month of the day, not of the week Thursday
    assert.throws(() => resolvePeriod({ kind: 'latest', latestDate: null }), { code: 'NO_DATA' });
});

test('invalid input is rejected with a stable code', () => {
    assert.throws(() => resolvePeriod({ kind: 'year', value: '2026' }), { code: 'INVALID_KIND' });
    assert.throws(() => resolvePeriod({ kind: 'day', value: '2026-02-30' }), { code: 'INVALID_DATE' });
    assert.throws(() => resolvePeriod({ kind: 'week', value: 'W44' }), { code: 'INVALID_WEEK_ID' });
    assert.throws(() => resolvePeriod({ kind: 'month', value: '2026-13' }), { code: 'INVALID_MONTH_ID' });
});

// ---- DaySummaryService -----------------------------------------------------------------------------------------

test('comparison windows: one day is yesterday and last week, a range shifts by its own length', () => {
    assert.deepEqual(comparisonWindows('2026-10-20', '2026-10-20'), {
        n1: { from_date: '2026-10-19', to_date: '2026-10-19' },
        n7: { from_date: '2026-10-13', to_date: '2026-10-13' },
    });
    assert.deepEqual(comparisonWindows('2026-10-10', '2026-10-16'), {
        n1: { from_date: '2026-10-03', to_date: '2026-10-09' }, // the 7 days right before
        n7: { from_date: '2026-10-03', to_date: '2026-10-09' }, // the same range back 7 days
    });
    assert.deepEqual(comparisonWindows('2026-10-10', '2026-10-12'), {
        n1: { from_date: '2026-10-07', to_date: '2026-10-09' },
        n7: { from_date: '2026-10-03', to_date: '2026-10-05' },
    });
});

test('same period: back by as many months as the range touches (PO 2026-11-02)', () => {
    const window = (from_date, to_date) => ({ from_date, to_date });
    assert.deepEqual(samePeriodWindow('2026-11-01', '2026-11-15'), window('2026-10-01', '2026-10-15'));
    assert.deepEqual(samePeriodWindow('2026-09-01', '2026-10-15'), window('2026-07-01', '2026-08-15')); // 2 months, no overlap
    assert.deepEqual(samePeriodWindow('2026-08-20', '2026-10-05'), window('2026-05-20', '2026-07-05')); // 3 months
    assert.deepEqual(samePeriodWindow('2026-10-31', '2026-11-01'), window('2026-08-31', '2026-09-01')); // two days, two months
    assert.deepEqual(samePeriodWindow('2026-01-10', '2026-01-20'), window('2025-12-10', '2025-12-20')); // over a new year
    assert.deepEqual(samePeriodWindow('2026-03-01', '2026-03-31'), window('2026-02-01', '2026-02-28')); // no 31/02
    assert.deepEqual(samePeriodWindow('2024-03-29', '2024-03-31'), window('2024-02-29', '2024-02-29')); // leap year
});

test('day summary: the range table compares each unit and the total with the same-period window', async () => {
    const service = serviceWith({
        '2026-09-01|2026-10-15': [metric('537015', 'BCVH Thuận An', 100, 90), metric('535790', 'BCVH A Lưới', 100, 50)],
        '2026-07-01|2026-08-15': [metric('537015', 'BCVH Thuận An', 200, 100)],
    });
    const { rows, meta } = await service.getSummary('2026-09-01', '2026-10-15');
    assert.deepEqual(meta.compare.same_period, { from_date: '2026-07-01', to_date: '2026-08-15' });
    const thuanAn = rows.find((r) => r.ma_bcvh === '537015');
    assert.deepEqual(thuanAn.compare.same_period, { volume: 200, rate: 50, volume_delta: -100, rate_delta: 40 });
    assert.equal(rows.find((r) => r.ma_bcvh === '535790').compare.same_period.rate, null); // nothing in that window
    assert.equal(meta.total_row.compare.same_period.volume, 200);
    assert.equal(meta.total_row.compare.same_period.rate_delta, 20); // 140/200 against 100/200, summed then divided
});

const dashboardStub = {
    _calculateRate: (part, total) => (!total ? 0 : Number(((part / total) * 100).toFixed(1))),
    _calculateNullableRateDelta(cp, ct, pp, pt) {
        if (!ct || !pt) return null;
        return Number((this._calculateRate(cp, ct) - this._calculateRate(pp, pt)).toFixed(2));
    },
};

function failedFact(code, late) {
    return {
        ma_bcvh: code,
        danh_gia_2026: 'Không đạt',
        thoi_gian_ptc: '2026-10-20 10:00:00',
        thoi_gian_nop_tien: late ? '2026-10-20 15:00:00' : '2026-10-20 11:00:00',
    };
}

function metric(code, name, volume, passed) {
    return { ma_bcvh: code, ten_bcvh: name, sl_bg_ptc: volume, dat_kpi_2026: passed, khong_dat_kpi_2026: volume - passed, sl_ptc_nop_tien: 0 };
}

function serviceWith(byRange, lateFacts = []) {
    return new DaySummaryService({
        repository: {
            getBcvhOperationMetricsBetween: async (from, to) => byRange[`${from}|${to}`] || [],
            eachFailedFactBetween: async (from, to, onRow) => {
                for (const fact of lateFacts) onRow(fact);
            },
        },
        dashboardService: dashboardStub,
    });
}

test('day summary: rows, ranks, compare blocks and the total are computed from the three windows', async () => {
    const service = serviceWith({
        '2026-10-20|2026-10-20': [metric('537015', 'BCVH Thuận An', 100, 90), metric('535790', 'BCVH A Lưới', 50, 25)],
        '2026-10-19|2026-10-19': [metric('537015', 'BCVH Thuận An', 80, 60)],
        '2026-10-13|2026-10-13': [metric('537015', 'BCVH Thuận An', 100, 95), metric('535790', 'BCVH A Lưới', 40, 20)],
    }, [
        failedFact('537015', true), failedFact('537015', true), failedFact('537015', false), failedFact('537015', false),
        failedFact('535790', false),
    ]);
    const { rows, meta } = await service.getSummary('2026-10-20', '2026-10-20');
    assert.deepEqual(rows.map((r) => [r.ma_bcvh, r.rank, r.rate]), [['537015', 1, 90], ['535790', 2, 50]]);
    assert.equal(rows[0].compare.n1.rate, 75);
    assert.equal(rows[0].compare.n1.volume_delta, 20);
    assert.equal(rows[0].compare.n1.rate_delta, 15);
    assert.deepEqual(rows[1].compare.n1, { volume: null, rate: null, volume_delta: null, rate_delta: null });
    assert.equal(rows[0].compare.n7.rate_delta, -5);
    assert.deepEqual(rows[0].late_cash, { count: 2, rate: 50 });
    assert.deepEqual(rows[1].late_cash, { count: 0, rate: 0 });
    assert.deepEqual(meta.total_row.late_cash, { count: 2, rate: 40 }); // 2 late of 5 failed, summed then divided
    // the N-7 total uses the N-7 window (115 -> 95 + 20 passed of 140), not N-1
    assert.equal(meta.total_row.compare.n7.volume, 140);
    assert.equal(meta.total_row.compare.n7.rate, 82.1);
    assert.equal(meta.total_row.compare.n1.volume, 80);
    assert.equal(meta.total_row.compare.n1.rate, 75);
    assert.equal(meta.total_row.volume, 150);
    assert.equal(meta.total_row.rate, 76.7); // 115 / 150, summed then divided - not (90 + 50) / 2
    assert.equal(meta.has_data, true);
});

test('day summary: a single BCVH filter keeps its row and totals only that unit', async () => {
    const service = serviceWith({
        '2026-10-20|2026-10-20': [metric('537015', 'BCVH Thuận An', 100, 90), metric('535790', 'BCVH A Lưới', 50, 25)],
    });
    const { rows, meta } = await service.getSummary('2026-10-20', '2026-10-20', { bcvhId: '535790' });
    assert.deepEqual(rows.map((r) => r.ma_bcvh), ['535790']);
    assert.equal(meta.total_row.volume, 50);
});

test('day summary rejects a bad range and an unknown unit', async () => {
    const service = serviceWith({});
    await assert.rejects(service.getSummary('2026-10-21', '2026-10-20'), { code: 'INVALID_RANGE' });
    await assert.rejects(service.getSummary('2026-10-2', '2026-10-20'), { code: 'INVALID_DATE' });
    await assert.rejects(service.getSummary('2024-01-01', '2026-10-20'), { code: 'RANGE_TOO_LONG' });
    await assert.rejects(service.getSummary('2026-10-20', '2026-10-20', { bcvhId: '999999' }), { code: 'INVALID_BCVH' });
});

test('day summary: a range uses the window just before it (N-1) and the range shifted 7 days (N-7), with their own values', async () => {
    const service = serviceWith({
        '2026-10-10|2026-10-12': [metric('537015', 'BCVH Thuận An', 30, 30)],
        '2026-10-07|2026-10-09': [metric('537015', 'BCVH Thuận An', 20, 10)], // N-1
        '2026-10-03|2026-10-05': [metric('537015', 'BCVH Thuận An', 40, 36)], // N-7
    });
    const { rows } = await service.getSummary('2026-10-10', '2026-10-12');
    assert.equal(rows[0].compare.n1.volume, 20);
    assert.equal(rows[0].compare.n1.rate, 50);
    assert.equal(rows[0].compare.n1.rate_delta, 50);
    assert.equal(rows[0].compare.n7.volume, 40);
    assert.equal(rows[0].compare.n7.rate, 90);
    assert.equal(rows[0].compare.n7.rate_delta, 10);
});

test('day summary: equal rate and volume share a rank; equal rate with a bigger volume ranks higher', async () => {
    const service = serviceWith({
        '2026-10-20|2026-10-20': [
            metric('537015', 'BCVH Thuận An', 10, 9),
            metric('535790', 'BCVH A Lưới', 100, 90),
            metric('533140', 'BCVH Thuận Hóa', 100, 90),
            metric('536250', 'BCVH Hương Thủy', 50, 45),
        ],
    });
    const { rows } = await service.getSummary('2026-10-20', '2026-10-20');
    const rankOf = Object.fromEntries(rows.map((r) => [r.ma_bcvh, r.rank]));
    assert.equal(rankOf['535790'], 1);
    assert.equal(rankOf['533140'], 1); // same rate and same volume: shared first place
    assert.equal(rankOf['536250'], 3); // same rate, smaller volume than the two above
    assert.equal(rankOf['537015'], 4);
});

test('day summary: a code outside the six canonical BCVH is never ranked or totalled', async () => {
    const service = serviceWith({
        '2026-10-20|2026-10-20': [metric('531120', 'Mã lạ', 1, 1), metric('537015', 'BCVH Thuận An', 10, 9)],
    });
    const { rows, meta } = await service.getSummary('2026-10-20', '2026-10-20');
    assert.deepEqual(rows.map((r) => [r.ma_bcvh, r.rank]), [['537015', 1]]);
    assert.equal(meta.total_row.volume, 10);
});
