const test = require('node:test');
const assert = require('node:assert/strict');
const {
    BcvhWeeklyComparisonService,
    weekIdFromDate,
    weekBoundsForWeekId,
    customWeekStart,
} = require('./bcvhWeeklyComparisonService');
const { CANONICAL_BCVH_UNITS } = require('../config/canonicalBcvhUnits');

const CODES = CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh);

test('week math: PO examples map to the exact labeled ranges (Tuần 36/37/38, 2026)', () => {
    assert.deepEqual(weekIdFromDate('2026-09-03'), { weekId: '2026-W36', weekStart: '2026-09-03', isoYear: 2026, isoWeek: 36 });
    assert.deepEqual(weekIdFromDate('2026-09-09'), { weekId: '2026-W36', weekStart: '2026-09-03', isoYear: 2026, isoWeek: 36 });
    assert.deepEqual(weekIdFromDate('2026-09-10'), { weekId: '2026-W37', weekStart: '2026-09-10', isoYear: 2026, isoWeek: 37 });
    assert.deepEqual(weekIdFromDate('2026-09-16'), { weekId: '2026-W37', weekStart: '2026-09-10', isoYear: 2026, isoWeek: 37 });
    assert.deepEqual(weekIdFromDate('2026-09-17'), { weekId: '2026-W38', weekStart: '2026-09-17', isoYear: 2026, isoWeek: 38 });
    assert.deepEqual(weekIdFromDate('2026-09-23'), { weekId: '2026-W38', weekStart: '2026-09-17', isoYear: 2026, isoWeek: 38 });

    const bounds36 = weekBoundsForWeekId('2026-W36');
    assert.equal(bounds36.weekStart, '2026-09-03');
    assert.equal(bounds36.weekEnd, '2026-09-09');
});

test('week math: every day of a custom week starts on Thursday and ends on Wednesday', () => {
    for (let day = 1; day <= 30; day += 1) {
        const iso = `2026-09-${String(day).padStart(2, '0')}`;
        const start = customWeekStart(iso);
        assert.equal(new Date(`${start}T00:00:00Z`).getUTCDay(), 4, `${iso} -> week start ${start} must be a Thursday`);
    }
});

test('week math: round-trips across a year boundary (no off-by-one at Dec/Jan)', () => {
    ['2025-12-29', '2025-12-31', '2026-01-01', '2026-01-04'].forEach((iso) => {
        const { weekId } = weekIdFromDate(iso);
        const bounds = weekBoundsForWeekId(weekId);
        assert.equal(bounds.weekStart, customWeekStart(iso));
    });
});

function buildRepository({ weeksRows, comparisonRows }) {
    return {
        getBcvhWeeksList: async () => weeksRows,
        getBcvhWeeklyComparisonAggregate: async () => comparisonRows,
    };
}

test('listWeeks: a fully-elapsed week shows the planned Thu-Wed range with no in-progress note', async () => {
    const service = new BcvhWeeklyComparisonService({
        repository: buildRepository({
            weeksRows: [{ week_start: '2026-09-03', first_date: '2026-09-03', last_date: '2026-09-09', days_with_data: 7 }],
            comparisonRows: [],
        }),
    });
    const weeks = await service.listWeeks();
    assert.equal(weeks.length, 1);
    assert.equal(weeks[0].week_id, '2026-W36');
    assert.equal(weeks[0].display_start_date, '2026-09-03');
    assert.equal(weeks[0].display_end_date, '2026-09-09');
    assert.equal(weeks[0].is_in_progress, false);
    assert.equal(weeks[0].data_through_note, null);
    assert.equal(weeks[0].days_with_data, 7);
    assert.equal(weeks[0].days_in_period, 7);
});

test('listWeeks: PO scenario -- week 38 only imported through 21/09 shows the truncated range and note', async () => {
    const service = new BcvhWeeklyComparisonService({
        repository: buildRepository({
            weeksRows: [{ week_start: '2026-09-17', first_date: '2026-09-17', last_date: '2026-09-21', days_with_data: 5 }],
            comparisonRows: [],
        }),
    });
    const [week38] = await service.listWeeks();
    assert.equal(week38.label, 'Tuần 38');
    assert.equal(week38.display_start_date, '2026-09-17');
    assert.equal(week38.display_end_date, '2026-09-21', 'range truncates to last real data date, not the planned Wednesday');
    assert.equal(week38.is_in_progress, true);
    assert.equal(week38.data_through_note, '2026-09-21');
    assert.equal(week38.days_in_period, 5);
    assert.equal(week38.days_with_data, 5);
});

test('listWeeks: mid-week gap on an otherwise-elapsed week shows a coverage badge, not an in-progress note', async () => {
    // Week fully elapsed (last_date == weekEnd) but only 5 of 7 days actually have data.
    const service = new BcvhWeeklyComparisonService({
        repository: buildRepository({
            weeksRows: [{ week_start: '2026-09-03', first_date: '2026-09-03', last_date: '2026-09-09', days_with_data: 5 }],
            comparisonRows: [],
        }),
    });
    const [week] = await service.listWeeks();
    assert.equal(week.is_in_progress, false);
    assert.equal(week.data_through_note, null);
    assert.equal(week.days_in_period, 7);
    assert.equal(week.days_with_data, 5, 'caller renders 5/7 ngày badge from these two fields');
});

test('compareWeeks: TOTAL row sums volume/passed across 6 BCVH, does not average rates', async () => {
    const weeksRows = [
        { week_start: '2026-09-03', first_date: '2026-09-03', last_date: '2026-09-09', days_with_data: 7 },
        { week_start: '2026-09-17', first_date: '2026-09-17', last_date: '2026-09-23', days_with_data: 7 },
    ];
    // Deliberately unequal volumes so a naive average-of-rates would diverge from sum-then-rate.
    const comparisonRows = CODES.map((code, index) => ({
        ma_bcvh: code,
        ten_bcvh: `BCVH ${code}`,
        volume_a: index === 0 ? 1000 : 10,
        passed_a: index === 0 ? 900 : 5,
        volume_b: index === 0 ? 1000 : 10,
        passed_b: index === 0 ? 500 : 5,
    }));
    const service = new BcvhWeeklyComparisonService({ repository: buildRepository({ weeksRows, comparisonRows }) });
    const result = await service.compareWeeks('2026-W36', '2026-W38');

    const totalVolumeA = 1000 + 10 * 5;
    const totalPassedA = 900 + 5 * 5;
    const expectedRateA = Number(((totalPassedA / totalVolumeA) * 100).toFixed(4));
    assert.equal(result.total_row.current.volume, totalVolumeA);
    assert.equal(result.total_row.current.passed, totalPassedA);
    assert.equal(result.total_row.current.rate, expectedRateA);

    // Average-of-6-rates would be very different from the sum-based rate -- assert they diverge,
    // proving the implementation is not silently averaging.
    const averageOfRates = comparisonRows.reduce((sum, r) => sum + (r.passed_a / r.volume_a) * 100, 0) / comparisonRows.length;
    assert.notEqual(Math.round(result.total_row.current.rate), Math.round(averageOfRates));

    assert.equal(result.total_row.ten_bcvh, 'TỔNG CỘNG');
    assert.equal(result.meta.current_week.week_id, '2026-W36');
    assert.equal(result.meta.compare_week.week_id, '2026-W38');
});

test('compareWeeks: rate_delta is an absolute percentage-point difference, not a ratio', async () => {
    const weeksRows = [
        { week_start: '2026-09-03', first_date: '2026-09-03', last_date: '2026-09-09', days_with_data: 7 },
        { week_start: '2026-09-17', first_date: '2026-09-17', last_date: '2026-09-23', days_with_data: 7 },
    ];
    const comparisonRows = CODES.map((code) => ({
        ma_bcvh: code, ten_bcvh: `BCVH ${code}`,
        volume_a: 100, passed_a: 80, // 80%
        volume_b: 100, passed_b: 65, // 65%
    }));
    const service = new BcvhWeeklyComparisonService({ repository: buildRepository({ weeksRows, comparisonRows }) });
    const result = await service.compareWeeks('2026-W36', '2026-W38');
    result.rows.forEach((row) => {
        assert.equal(row.current.rate, 80);
        assert.equal(row.compare.rate, 65);
        assert.equal(row.rate_delta, 15, 'delta is 80 - 65 = 15 points, not (80-65)/65 ratio');
    });
});

test('compareWeeks: any two non-adjacent weeks can be compared, in either order', async () => {
    const weeksRows = [
        { week_start: '2026-01-01', first_date: '2026-01-01', last_date: '2026-01-07', days_with_data: 7 },
        { week_start: '2026-09-17', first_date: '2026-09-17', last_date: '2026-09-23', days_with_data: 7 },
    ];
    const comparisonRows = CODES.map((code) => ({
        ma_bcvh: code, ten_bcvh: `BCVH ${code}`, volume_a: 50, passed_a: 40, volume_b: 50, passed_b: 30,
    }));
    const repository = buildRepository({ weeksRows, comparisonRows });
    const service = new BcvhWeeklyComparisonService({ repository });

    const forward = await service.compareWeeks(weekIdFromDate('2026-09-17').weekId, weekIdFromDate('2026-01-01').weekId);
    assert.ok(forward.meta.current_week.week_id !== forward.meta.compare_week.week_id);

    const backward = await service.compareWeeks(weekIdFromDate('2026-01-01').weekId, weekIdFromDate('2026-09-17').weekId);
    assert.equal(backward.meta.current_week.week_id, weekIdFromDate('2026-01-01').weekId);
});

test('compareWeeks: rejects a week id that has no data with WEEK_NOT_FOUND', async () => {
    const service = new BcvhWeeklyComparisonService({
        repository: buildRepository({
            weeksRows: [{ week_start: '2026-09-03', first_date: '2026-09-03', last_date: '2026-09-09', days_with_data: 7 }],
            comparisonRows: [],
        }),
    });
    await assert.rejects(() => service.compareWeeks('2026-W36', '2099-W01'), { code: 'WEEK_NOT_FOUND' });
});

test('compareWeeks: rejects a malformed week id with INVALID_WEEK_ID', async () => {
    const service = new BcvhWeeklyComparisonService({ repository: buildRepository({ weeksRows: [], comparisonRows: [] }) });
    await assert.rejects(() => service.compareWeeks('not-a-week', '2026-W36'), { code: 'INVALID_WEEK_ID' });
});

test('compareWeeks: rejects missing params with MISSING_PARAM', async () => {
    const service = new BcvhWeeklyComparisonService({ repository: buildRepository({ weeksRows: [], comparisonRows: [] }) });
    await assert.rejects(() => service.compareWeeks('2026-W36', undefined), { code: 'MISSING_PARAM' });
});

test('response schema never contains alert/warning/risk keys (PO decision 8, reused from overview design)', async () => {
    const weeksRows = [
        { week_start: '2026-09-03', first_date: '2026-09-03', last_date: '2026-09-09', days_with_data: 7 },
        { week_start: '2026-09-17', first_date: '2026-09-17', last_date: '2026-09-23', days_with_data: 7 },
    ];
    const comparisonRows = CODES.map((code) => ({ ma_bcvh: code, ten_bcvh: `BCVH ${code}`, volume_a: 10, passed_a: 5, volume_b: 10, passed_b: 5 }));
    const service = new BcvhWeeklyComparisonService({ repository: buildRepository({ weeksRows, comparisonRows }) });
    const result = await service.compareWeeks('2026-W36', '2026-W38');
    const json = JSON.stringify(result);
    ['alert', 'warning', 'risk'].forEach((forbidden) => {
        assert.equal(json.toLowerCase().includes(forbidden), false, `response must not contain "${forbidden}"`);
    });
});
