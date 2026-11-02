'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { layoutFor, BLOCKS, SCOPES } = require('./blockRegistry');
const { resolvePeriod } = require('./periodResolve');
const { DaySummaryService, comparisonWindows } = require('./DaySummaryService');

// ---- blockRegistry ---------------------------------------------------------------------------------------------

test('layout for a city-wide account lists every page and block', () => {
    const layout = layoutFor({ mode: 'all', bcvh: [] });
    assert.deepEqual(layout.pages.map((p) => p.id), ['ngay', 'tuan', 'thang', 'chuyen-de']);
    assert.equal(layout.pages.flatMap((p) => p.blocks).length, BLOCKS.length);
    assert.equal(layout.units.allow_all, true);
});

test('layout for a BCVH-mode account has no city block and no "all units" choice', () => {
    const layout = layoutFor({ mode: 'bcvh', bcvh: ['537015'] });
    const blocks = layout.pages.flatMap((p) => p.blocks);
    assert.ok(blocks.length > 0);
    assert.ok(blocks.every((b) => b.scope !== SCOPES.CITY), 'a city block reached a BCVH account');
    assert.equal(blocks.find((b) => b.id === 'day.actions'), undefined);
    assert.equal(layout.units.allow_all, false);
    assert.deepEqual(layout.units.bcvh, ['537015']);
    assert.ok(!layout.pages[0].subtitle.includes('Trung tâm hành động'));
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

const dashboardStub = {
    _calculateRate: (part, total) => (!total ? 0 : Number(((part / total) * 100).toFixed(1))),
    _calculateNullableRateDelta(cp, ct, pp, pt) {
        if (!ct || !pt) return null;
        return Number((this._calculateRate(cp, ct) - this._calculateRate(pp, pt)).toFixed(2));
    },
    _buildF13302SummaryMap: () => ({ rateMap: { 537015: 10 }, summaryMap: { 537015: { delayed_cash_handover_count: 2 } } }),
};

function metric(code, name, volume, passed) {
    return { ma_bcvh: code, ten_bcvh: name, sl_bg_ptc: volume, dat_kpi_2026: passed, khong_dat_kpi_2026: volume - passed, sl_ptc_nop_tien: 0 };
}

function serviceWith(byRange) {
    return new DaySummaryService({
        repository: {
            getBcvhOperationMetricsBetween: async (from, to) => byRange[`${from}|${to}`] || [],
            getFactBetween: async () => [],
        },
        dashboardService: dashboardStub,
    });
}

test('day summary: rows, ranks, compare blocks and the total are computed from the three windows', async () => {
    const service = serviceWith({
        '2026-10-20|2026-10-20': [metric('537015', 'BCVH Thuận An', 100, 90), metric('535790', 'BCVH A Lưới', 50, 25)],
        '2026-10-19|2026-10-19': [metric('537015', 'BCVH Thuận An', 80, 60)],
        '2026-10-13|2026-10-13': [metric('537015', 'BCVH Thuận An', 100, 95), metric('535790', 'BCVH A Lưới', 40, 20)],
    });
    const { rows, meta } = await service.getSummary('2026-10-20', '2026-10-20');
    assert.deepEqual(rows.map((r) => [r.ma_bcvh, r.rank, r.rate]), [['537015', 1, 90], ['535790', 2, 50]]);
    assert.equal(rows[0].compare.n1.rate, 75);
    assert.equal(rows[0].compare.n1.volume_delta, 20);
    assert.equal(rows[0].compare.n1.rate_delta, 15);
    assert.deepEqual(rows[1].compare.n1, { volume: null, rate: null, volume_delta: null, rate_delta: null });
    assert.equal(rows[0].compare.n7.rate_delta, -5);
    assert.equal(rows[0].late_cash.count, 2);
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
