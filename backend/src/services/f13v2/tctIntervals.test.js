'use strict';

// F13-WHY-DATA-01 Phase 1. Cases N1-N20, B1-B7, L1-L5 come from the design prototype (session scratchpad protoTests.js, not in the
// repository; its 43 cases = these 32 + the 11 tree cases C1-C11 of CauseClassifier.test.js). The expected values were derived by hand
// from Manifest v4 section 3/4, not copied from the code's output; N10 was corrected (86 h raw, not 62 h). Cases marked "added" are new.
// Run: node --experimental-sqlite --test backend/src/services/f13v2/tctIntervals.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    HOUR_MS, TOLERANCE_MS, VERDICT, nightIntervals, stageNetMs, parseTctMs, journeyModel, legBounds, verdictOf, stageOf,
} = require('./tctIntervals');

const at = (text) => Date.parse(`${text.replace(' ', 'T')}:00Z`);
const hours = (h, m = 0) => (h * 60 + m) * 60000;
const excluded = (intervals) => intervals.reduce((sum, [a, b]) => sum + (b - a), 0);

function night(id, from, to, expectedExcluded, expectedNet) {
    test(`${id} ${from} -> ${to}: excluded ${expectedExcluded / HOUR_MS} h, net ${expectedNet / HOUR_MS} h`, () => {
        const a = at(from);
        const b = at(to);
        const intervals = nightIntervals(a, b);
        assert.equal(excluded(intervals), expectedExcluded);
        assert.equal(stageNetMs(intervals, a, b), expectedNet);
        for (const [start, end] of intervals) assert.ok(start >= a && end <= b && end > start, 'inside T->E');
        for (let i = 1; i < intervals.length; i += 1) assert.ok(intervals[i][0] >= intervals[i - 1][1], 'no overlap, no double count');
    });
}

// id, T, E, excluded, net
night('N1 day scan, no night', '2026-10-20 10:00', '2026-10-20 18:00', 0, hours(8));
night('N2 day scan, one night', '2026-10-20 10:00', '2026-10-21 09:00', hours(10), hours(13));
night('N3 day scan, two nights: only the first', '2026-10-20 10:00', '2026-10-22 12:00', hours(10), hours(40));
night('N4 day scan, four nights: only the first', '2026-10-20 10:00', '2026-10-24 12:00', hours(10), hours(88));
night('N5 day scan ends inside the night', '2026-10-20 10:00', '2026-10-20 23:00', hours(2), hours(11));
night('N6 night scan ends before the night ends', '2026-10-20 22:00', '2026-10-21 06:00', hours(8), 0);
night('N7 night scan, no second night', '2026-10-20 22:00', '2026-10-21 12:00', hours(9), hours(5));
night('N8 night scan, E exactly 07:00 of the next night: covers it', '2026-10-20 22:00', '2026-10-22 07:00', hours(19), hours(14));
night('N9 night scan, E one minute before: second night partial, not left out', '2026-10-20 22:00', '2026-10-22 06:59', hours(9), hours(23, 59));
night('N10 night scan, four nights: never more than two', '2026-10-20 22:00', '2026-10-24 12:00', hours(19), hours(67));
night('N11 00:00 scan, no second night', '2026-10-20 00:00', '2026-10-20 18:00', hours(7), hours(11));
night('N12 00:00 scan, rest of morning + following night', '2026-10-20 00:00', '2026-10-21 08:00', hours(17), hours(15));
night('N13 06:00 scan', '2026-10-20 06:00', '2026-10-21 12:00', hours(11), hours(19));
night('N14 07:00 exactly is a day scan', '2026-10-20 07:00', '2026-10-20 23:00', hours(2), hours(14));
night('N15 07:00 exactly, two nights: only the first', '2026-10-20 07:00', '2026-10-22 12:00', hours(10), hours(43));
night('N16 21:00 exactly is a night scan, E exactly 07:00', '2026-10-20 21:00', '2026-10-21 07:00', hours(10), 0);
night('N17 21:00 exactly, E 07:00 two days on: second night covered', '2026-10-20 21:00', '2026-10-22 07:00', hours(20), hours(14));
night('N18 20:00 day scan', '2026-10-20 20:00', '2026-10-21 08:00', hours(10), hours(2));
night('N19 T = E', '2026-10-20 22:00', '2026-10-20 22:00', 0, 0);
night('N20 06:59 -> 07:00 (added precision case)', '2026-10-20 06:59', '2026-10-20 07:00', 60000, 0);
night('N21 added: 23:30 night scan, second night only partly covered', '2026-10-20 23:30', '2026-10-22 06:00', hours(7, 30), hours(23));
night('N22 added: 06:00 scan, E exactly 07:00 of the next day', '2026-10-20 06:00', '2026-10-21 07:00', hours(11), hours(14));

test('no interval for a missing or reversed journey', () => {
    assert.deepEqual(nightIntervals(null, at('2026-10-20 10:00')), []);
    assert.deepEqual(nightIntervals(at('2026-10-21 10:00'), at('2026-10-20 10:00')), []);
    assert.deepEqual(nightIntervals(Number.NaN, 5), []);
});

test('night is built once for the journey: the stages share it and add up to the journey (a night is never left out twice)', () => {
    const T = at('2026-10-20 10:00');
    const D = at('2026-10-20 23:00');
    const A = at('2026-10-21 12:00');
    const E = at('2026-10-21 20:00');
    const intervals = nightIntervals(T, E);
    const total = stageNetMs(intervals, T, E);
    assert.equal(stageNetMs(intervals, T, D) + stageNetMs(intervals, D, A) + stageNetMs(intervals, A, E), total);
    assert.equal(stageNetMs(intervals, T, D), hours(11)); // 13 h raw, 21:00-23:00 inside the night
    assert.equal(stageNetMs(intervals, D, A), hours(5)); // 13 h raw, 23:00-07:00 inside the night
    assert.equal(total, hours(24));
});

test('stageNetMs: a stage out of order or with a missing milestone is null', () => {
    assert.equal(stageNetMs([], at('2026-10-20 10:00'), at('2026-10-20 09:00')), null);
    assert.equal(stageNetMs([], null, at('2026-10-20 09:00')), null);
});

test('parseTctMs: whole minutes, empty and negative values are not usable', () => {
    assert.equal(parseTctMs('24:00'), hours(24));
    assert.equal(parseTctMs('5:16'), hours(5, 16));
    assert.equal(parseTctMs('0:0'), 0);
    assert.equal(parseTctMs('-28:-18'), null);
    assert.equal(parseTctMs(''), null);
    assert.equal(parseTctMs(null), null);
    assert.equal(parseTctMs('abc'), null);
});

// ---- journey T 10:00 -> D 16:00 -> A next day 12:00 -> E next day 20:00 : raw 34 h, one night 10 h, L = 24 h, T->A net 16 h.
const T0 = at('2026-10-20 10:00');
const A0 = at('2026-10-21 12:00');
const E0 = at('2026-10-21 20:00');

function interval(id, tctMs, limitHours, expectedBounds, expectedVerdict) {
    test(`${id} TCT ${tctMs / HOUR_MS} h, limit ${limitHours} h -> T->A ${expectedBounds.map((x) => x / HOUR_MS).join('..')} ${expectedVerdict}`, () => {
        const model = journeyModel(T0, E0, tctMs);
        assert.equal(model.valid, true);
        assert.equal(model.lMs, hours(24));
        const stage = stageOf(model, T0, A0);
        assert.equal(stage.netMs, hours(16));
        assert.deepEqual(stage.bounds, expectedBounds);
        assert.equal(verdictOf(stage.bounds, limitHours * HOUR_MS), expectedVerdict);
    });
}
interval('B1 R=0', hours(24), 12, [hours(16), hours(16)], VERDICT.OVER);
interval('B2 R=4 h cuts the limit', hours(20), 12, [hours(12), hours(16)], VERDICT.UNDECIDED);
interval('B3 R=4 h, interval above the limit', hours(20), 11, [hours(12), hours(16)], VERDICT.OVER);
interval('B4 R=4 h, upper = limit: equal is not over', hours(20), 16, [hours(12), hours(16)], VERDICT.WITHIN);
interval('B5 R=L', 0, 12, [0, 0], VERDICT.WITHIN);
for (const [id, limit, verdict] of [['L1', 12, VERDICT.OVER], ['L2', 14, VERDICT.OVER], ['L3', 15, VERDICT.OVER], ['L4', 16, VERDICT.WITHIN], ['L5', 17, VERDICT.WITHIN], ['L6 added', 16.5, VERDICT.WITHIN]]) {
    interval(`${id} limit ${limit}`, hours(24), limit, [hours(16), hours(16)], verdict);
}

test('B6 R below the tolerance and B7 R above L (negative TCT) are not valid', () => {
    const negativeR = journeyModel(T0, E0, hours(26)); // R = -2 h
    assert.deepEqual([negativeR.valid, negativeR.reason, negativeR.rawRMs], [false, 'R_KHONG_HOP_LE', -hours(2)]);
    const aboveL = journeyModel(T0, E0, -hours(2)); // R = L + 2 h
    assert.deepEqual([aboveL.valid, aboveL.reason, aboveL.rawRMs], [false, 'R_KHONG_HOP_LE', hours(26)]);
});

test('tolerance is 90 000 ms: R = -90 000 is valid (read as 0), R = -96 000 is not', () => {
    assert.equal(TOLERANCE_MS, 90000);
    const exact = journeyModel(T0, E0, hours(24) + 90000);
    assert.equal(exact.valid, true);
    assert.equal(exact.rawRMs, -90000);
    assert.equal(exact.rMs, 0);
    const over = journeyModel(T0, E0, hours(24) + 96000);
    assert.equal(over.valid, false);
    assert.equal(over.reason, 'R_KHONG_HOP_LE');
    assert.equal(over.rawRMs, -96000);
});

test('R = 0 and R = L are valid; R = L + 90 000 is valid, read as L; R = L + 96 000 is not', () => {
    const zero = journeyModel(T0, E0, hours(24));
    assert.deepEqual([zero.valid, zero.rMs], [true, 0]);
    const full = journeyModel(T0, E0, 0);
    assert.deepEqual([full.valid, full.rMs, full.lMs], [true, hours(24), hours(24)]);
    const edge = journeyModel(T0, E0, -90000);
    assert.deepEqual([edge.valid, edge.rawRMs, edge.rMs], [true, hours(24) + 90000, hours(24)]);
    const beyond = journeyModel(T0, E0, -96000);
    assert.deepEqual([beyond.valid, beyond.reason, beyond.rawRMs], [false, 'R_KHONG_HOP_LE', hours(24) + 96000]);
});

test('TCT is not rounded: a 120 s difference is kept in the interval bounds (no toFixed on hours)', () => {
    const tct = hours(24) - 120000; // TCT says 120 s less than the model: R = 120 s, outside the tolerance
    const model = journeyModel(T0, E0, tct);
    assert.equal(model.rMs, 120000);
    const stage = stageOf(model, T0, A0);
    assert.deepEqual(stage.bounds, [hours(16) - 120000, hours(16)]);
});

test('R inside +/- 90 000 ms is read as 0: R = +90 000 is valid and 0, R = +96 000 is kept as it is (added, review M1)', () => {
    const plus = journeyModel(T0, E0, hours(24) - 90000);
    assert.deepEqual([plus.valid, plus.rawRMs, plus.rMs], [true, 90000, 0]);
    assert.deepEqual(stageOf(plus, T0, A0).bounds, [hours(16), hours(16)]);
    const over = journeyModel(T0, E0, hours(24) - 96000);
    assert.deepEqual([over.valid, over.rawRMs, over.rMs], [true, 96000, 96000]);
    assert.deepEqual(stageOf(over, T0, A0).bounds, [hours(16) - 96000, hours(16)]);
    const minus = journeyModel(T0, E0, hours(24) + 90000);
    assert.deepEqual([minus.valid, minus.rawRMs, minus.rMs], [true, -90000, 0]);
});

test('missing E, E before T, missing TCT: the journey is not valid and no stage is produced', () => {
    for (const model of [journeyModel(T0, null, hours(24)), journeyModel(T0, T0, hours(24)), journeyModel(E0, T0, hours(24)), journeyModel(T0, E0, null)]) {
        assert.equal(model.valid, false);
        assert.equal(model.reason, 'THOI_GIAN_KHONG_HOP_LE');
        assert.equal(stageOf(model, T0, A0), null);
    }
});

test('a stage must lie inside T->E and be in order', () => {
    const model = journeyModel(T0, E0, hours(24));
    assert.equal(stageOf(model, T0, E0 + HOUR_MS), null);
    assert.equal(stageOf(model, A0, T0), null);
    assert.equal(stageOf(model, null, A0), null);
    assert.equal(stageOf({ valid: false }, T0, A0), null);
});

test('stage bounds: where the unlocated exclusion can sit (T->D 6 h of a journey with R = 4 h, L = 24 h)', () => {
    const [lower, upper] = legBounds(hours(6), hours(24), hours(4));
    assert.equal(lower, hours(2));
    assert.equal(upper, hours(6));
    // R = 10 h: at most 10 h can sit in a 20 h stage, but 4 h of the journey lie outside it, so at least 6 h of R are inside
    assert.deepEqual(legBounds(hours(20), hours(24), hours(10)), [hours(10), hours(14)]);
    assert.deepEqual(legBounds(hours(20), hours(24), hours(2)), [hours(18), hours(20)]);
});
