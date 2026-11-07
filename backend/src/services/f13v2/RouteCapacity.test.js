'use strict';

// F13-ROUTE-CAPACITY-01 B1: the pure rules C2-C6 on seeded histories.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
    CAPACITY_CONFIG, STATES, percentile, isGoodDay, bandOf, capacityOn, routeDays, dayWithoutCapacity, summarizeDays,
} = require('./RouteCapacity');

const dayOf = (offset, base = '2026-09-01') => new Date(Date.parse(`${base}T00:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
// a day of `volume` parcels with `passed` on time
const make = (offset, volume, passed = volume, postmen = 1) => ({ date: dayOf(offset), volume, passed, postmen });

test('config holds the four thresholds in one place', () => {
    assert.equal(CAPACITY_CONFIG.CAPACITY_WINDOW_DAYS, 56);
    assert.equal(CAPACITY_CONFIG.CAPACITY_MIN_GOOD_DAYS, 5);
    assert.equal(CAPACITY_CONFIG.LOAD_HIGH, 1.0);
    assert.equal(CAPACITY_CONFIG.LOAD_LOW, 0.6);
});

test('percentile: upper quartile with linear interpolation', () => {
    assert.equal(percentile([]), null);
    assert.equal(percentile([7]), 7);
    assert.equal(percentile([10, 20, 30, 40, 50]), 40); // (5-1)*0.75 = 3 -> 40
    assert.equal(percentile([10, 20, 30, 40]), 32.5); // 2.25 -> 30 + 0.25 * 10
    assert.equal(percentile([50, 10, 40, 30, 20]), 40); // order does not matter
});

test('good day: >= 90 % exactly counts, 89.9 % does not, no volume does not', () => {
    assert.equal(isGoodDay({ volume: 10, passed: 9 }), true);
    assert.equal(isGoodDay({ volume: 1000, passed: 899 }), false);
    assert.equal(isGoodDay({ volume: 0, passed: 0 }), false);
});

test('C2 capacity: P75 of good days only, bad days ignored', () => {
    // 5 good days 10..50, plus bad days with a huge volume that must not count
    const history = [make(0, 10), make(1, 20), make(2, 30), make(3, 40), make(4, 50), make(5, 500, 100), make(6, 900, 0)];
    const { capacity, good_days: good } = capacityOn(history, dayOf(10));
    assert.equal(good, 5);
    assert.equal(capacity, 40);
});

test('C2 window: 56 days before D, D excluded, older and later days ignored', () => {
    const history = [make(0, 10), make(1, 10), make(2, 10), make(3, 10), make(4, 10)]; // days 0-4
    assert.equal(capacityOn(history, dayOf(56)).capacity, 10); // day 0 is exactly 56 days before: inside
    assert.equal(capacityOn(history, dayOf(57)).good_days, 4); // day 0 fell out of the window
    assert.equal(capacityOn(history, dayOf(57)).capacity, null);
    assert.equal(capacityOn(history, dayOf(4)).good_days, 4); // D itself (day 4) is excluded, later days too
});

test('fewer than 5 good days: capacity null and CHUA_DU_DU_LIEU', () => {
    const history = [make(0, 10), make(1, 10), make(2, 10), make(3, 10)];
    assert.deepEqual(capacityOn(history, dayOf(10)), { capacity: null, good_days: 4 });
    const days = routeDays([...history, make(10, 12)], dayOf(10), dayOf(10));
    assert.equal(days.length, 1);
    assert.equal(days[0].capacity, null);
    assert.equal(days[0].load, null);
    assert.equal(days[0].band, STATES.CHUA_DU_DU_LIEU);
});

test('gaps in the history: days with no volume do not count and do not break the rule', () => {
    const history = [make(0, 10), make(7, 20), make(14, 30), make(21, 40), make(28, 50)]; // one day a week
    assert.equal(capacityOn(history, dayOf(35)).capacity, 40);
});

test('C3 bands at exactly 60 % and 100 %', () => {
    assert.equal(bandOf(1.0001), STATES.QUA_TAI);
    assert.equal(bandOf(1.0), STATES.BINH_THUONG);
    assert.equal(bandOf(0.6), STATES.BINH_THUONG);
    assert.equal(bandOf(0.5999), STATES.CON_DU_SUC);
    assert.equal(bandOf(null), STATES.CHUA_DU_DU_LIEU);
    // through a real series: capacity 40 (P75 of 10..50)
    const history = [make(0, 10), make(1, 20), make(2, 30), make(3, 40), make(4, 50), make(10, 40), make(11, 24), make(12, 41), make(13, 23)];
    const days = routeDays(history, dayOf(10), dayOf(13));
    // the good days of the window grow with the days added; check the bands on the first one (capacity 40)
    assert.equal(days[0].capacity, 40);
    assert.equal(days[0].load, 1);
    assert.equal(days[0].band, STATES.BINH_THUONG);
});

test('routeDays: only days with volume inside the period, load uses the capacity of that day', () => {
    const history = [make(0, 10), make(1, 20), make(2, 30), make(3, 40), make(4, 50), make(8, 60), make(9, 20)];
    const days = routeDays(history, dayOf(8), dayOf(9));
    assert.deepEqual(days.map((d) => d.date), [dayOf(8), dayOf(9)]);
    assert.equal(days[0].capacity, 40);
    assert.equal(days[0].band, STATES.QUA_TAI); // 60 / 40 = 150 %
    assert.equal(days[1].capacity, 47.5); // day 8 (60 of 60 passed) joins the history of day 9: P75 of 10..60 = 47.5
    assert.equal(days[1].band, STATES.CON_DU_SUC); // 20 / 47.5 = 42 %
});

test('C4 per-postman volume: volume / postmen, null without postmen', () => {
    const history = [make(0, 10), make(1, 10), make(2, 10), make(3, 10), make(4, 10), make(9, 30, 30, 3), make(10, 12, 12, 0)];
    const days = routeDays(history, dayOf(9), dayOf(10));
    assert.equal(days[0].postmen, 3);
    assert.equal(days[0].volume_per_postman, 10);
    assert.equal(days[1].volume_per_postman, null);
    const summary = summarizeDays(days);
    assert.equal(summary.postmen_avg, 3); // days without a postman are left out of the average
    assert.equal(summary.volume_per_postman_avg, 10);
});

test('C6 NON_POSTMAN / OTHER: no capacity, no load, KHONG_AP_DUNG', () => {
    const day = dayWithoutCapacity({ date: dayOf(0), volume: 50, passed: 40, postmen: 2 });
    assert.equal(day.capacity, null);
    assert.equal(day.load, null);
    assert.equal(day.band, STATES.KHONG_AP_DUNG);
    assert.equal(day.rate, 80);
    const summary = summarizeDays([day]);
    assert.equal(summary.load_avg, null);
    assert.equal(summary.days_over + summary.days_normal + summary.days_under, 0);
});

test('summarizeDays counts the three bands and the no-data days', () => {
    const history = [make(0, 10), make(1, 20), make(2, 30), make(3, 40), make(4, 50), make(8, 80), make(9, 30), make(10, 10)];
    // capacity on day 8 = 40 (10..50): 80 -> over; day 9: P75(10..50,80)=50 -> 30 = 60 % normal; day 10: P75(10..50,80,30)=... under
    const summary = summarizeDays(routeDays(history, dayOf(8), dayOf(10)));
    assert.equal(summary.days, 3);
    assert.equal(summary.days_over, 1);
    assert.equal(summary.days_over + summary.days_normal + summary.days_under + summary.days_no_data, 3);
    assert.equal(summary.volume, 120);
});
