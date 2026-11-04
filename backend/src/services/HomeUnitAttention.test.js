'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { historyRanges, judgeUnit } = require('./HomeUnitAttention');

const steady = [60, 62, 58, 61, 59, 60, 63, 57]; // newest first: level of the last 4 = 60.25, spread over 8 about 1.9

test('day: the same weekday of the previous 8 weeks, one day each', () => {
    const ranges = historyRanges('day', '2026-11-02', '2026-11-02'); // a Monday
    assert.equal(ranges.length, 8);
    assert.deepEqual(ranges[0], { from: '2026-10-26', to: '2026-10-26' });
    assert.deepEqual(ranges[7], { from: '2026-09-07', to: '2026-09-07' });
});

test('week: the previous 8 weeks, as many days as the running week has', () => {
    const ranges = historyRanges('week', '2026-10-29', '2026-11-02'); // Thursday .. Monday = 5 days
    assert.equal(ranges.length, 8);
    assert.deepEqual(ranges[0], { from: '2026-10-22', to: '2026-10-26' });
    assert.deepEqual(historyRanges('week', '2026-10-22', '2026-10-28')[0], { from: '2026-10-15', to: '2026-10-21' });
});

test('month: the previous 6 months, cut to the same day of the month and never past the month end', () => {
    const ranges = historyRanges('month', '2026-03-01', '2026-03-30');
    assert.equal(ranges.length, 6);
    assert.deepEqual(ranges[0], { from: '2026-02-01', to: '2026-02-28' });
    assert.deepEqual(ranges[1], { from: '2026-01-01', to: '2026-01-30' });
    assert.deepEqual(historyRanges('month', '2026-11-01', '2026-11-03')[0], { from: '2026-10-01', to: '2026-10-03' });
    assert.deepEqual(historyRanges('year', '2026-11-01', '2026-11-03'), []);
});

test('a rate far below its own usual level is flagged, with the figures for the tooltip', () => {
    const out = judgeUnit({ period: 'day', rate: 50, volume: 400, totalVolume: 3000, history: steady });
    assert.equal(out.basis, 'weekday');
    assert.equal(out.baseline, 60.3);
    assert.equal(out.shortfall, 10.3);
    assert.equal(out.samples, 4); // the four most recent weeks give the level
});

test('a drop inside its usual spread is not flagged, and a rise never is', () => {
    assert.equal(judgeUnit({ period: 'day', rate: 58, volume: 400, totalVolume: 3000, history: steady }), null);
    assert.equal(judgeUnit({ period: 'day', rate: 75, volume: 400, totalVolume: 3000, history: steady }), null);
});

test('a unit that is always low is not flagged just for being low', () => {
    const lowAlways = [30, 31, 29, 30, 32, 28, 30, 31];
    assert.equal(judgeUnit({ period: 'day', rate: 30, volume: 400, totalVolume: 3000, history: lowAlways }), null);
});

test('a unit under 4 % of the volume of the six BCVH is not judged', () => {
    assert.equal(judgeUnit({ period: 'day', rate: 40, volume: 90, totalVolume: 3000, history: steady }), null);
    assert.notEqual(judgeUnit({ period: 'day', rate: 40, volume: 120, totalVolume: 3000, history: steady }), null); // exactly 4 %
});

test('too little history gives no verdict', () => {
    assert.equal(judgeUnit({ period: 'day', rate: 40, volume: 400, totalVolume: 3000, history: [60, 61, 59, null, null, null, null, 60] }), null); // 4 weeks known, spread needs 6
    assert.equal(judgeUnit({ period: 'day', rate: 40, volume: 400, totalVolume: 3000, history: [null, null, 60, 61, 59, 60, 61, 62] }), null); // the level needs 3 of the last 4
    assert.notEqual(judgeUnit({ period: 'month', rate: 40, volume: 400, totalVolume: 3000, history: [60, 61, 59, 60] }), null);
    assert.equal(judgeUnit({ period: 'month', rate: 40, volume: 400, totalVolume: 3000, history: [60, 61, 59] }), null);
});

test('a unit that has been improving is judged against how it does now, not against a worse past', () => {
    // the last 4 weeks about 69.5, the 4 before about 62: the 8-week average (65.8) would call 61 normal
    const improving = [70, 69, 71, 68, 64, 62, 63, 61];
    const out = judgeUnit({ period: 'day', rate: 61, volume: 400, totalVolume: 3000, history: improving });
    assert.notEqual(out, null);
    assert.equal(out.baseline, 69.5);
    // the same fall for a unit whose level did not rise is not flagged (spread is wide)
    const noisy = [60, 70, 50, 62, 58, 71, 49, 60];
    assert.equal(judgeUnit({ period: 'day', rate: 55, volume: 400, totalVolume: 3000, history: noisy }), null);
});

test('a perfectly steady unit needs more than a hair of a drop (spread floor 1 point)', () => {
    const flat = [60, 60, 60, 60, 60, 60, 60, 60];
    assert.equal(judgeUnit({ period: 'day', rate: 59, volume: 400, totalVolume: 3000, history: flat }), null);
    assert.notEqual(judgeUnit({ period: 'day', rate: 58, volume: 400, totalVolume: 3000, history: flat }), null);
    assert.equal(judgeUnit({ period: 'day', rate: 58.6, volume: 400, totalVolume: 3000, history: flat }), null);
});
