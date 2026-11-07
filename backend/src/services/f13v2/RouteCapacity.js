'use strict';

// F13-ROUTE-CAPACITY-01 B1: the pure rules of route capacity and daily load (PO decisions C1-C7, 2026-11-07). No database here.
//   C2 capacity of a route on day D = upper quartile (P75, linear interpolation) of the daily volume of its days at >= 90 % on time in the
//      56 days before D (D excluded); days with no volume do not exist; fewer than 5 good days -> capacity null, CHUA_DU_DU_LIEU.
//   C3 load = volume of D / capacity: above 100 % QUA_TAI, 60 % to 100 % included BINH_THUONG, below 60 % CON_DU_SUC.
//   C4 several postmen on a day: also the volume per postman.   C6 NON_POSTMAN / OTHER have no capacity (KHONG_AP_DUNG).
// Show, do not judge (C7): the state is information, never a fault.

const CAPACITY_CONFIG = Object.freeze({
    CAPACITY_WINDOW_DAYS: 56,
    CAPACITY_MIN_GOOD_DAYS: 5,
    GOOD_DAY_RATE_X10: 9, // a good day: passed / volume >= 9 / 10, kept in integers (10 passed >= 9 volume)
    CAPACITY_PERCENTILE: 0.75,
    LOAD_HIGH: 1.0,
    LOAD_LOW: 0.6,
});

const STATES = Object.freeze({
    QUA_TAI: 'QUA_TAI',
    BINH_THUONG: 'BINH_THUONG',
    CON_DU_SUC: 'CON_DU_SUC',
    CHUA_DU_DU_LIEU: 'CHUA_DU_DU_LIEU',
    KHONG_AP_DUNG: 'KHONG_AP_DUNG',
});

const DAY_MS = 86400000;
const dayNumber = (isoDate) => Math.round(Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS);

/** Upper quartile of numbers, linear interpolation between ranks ((n - 1) * 0.75). Null for an empty list. */
function percentile(values, p = CAPACITY_CONFIG.CAPACITY_PERCENTILE) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const position = (sorted.length - 1) * p;
    const low = Math.floor(position);
    const high = Math.ceil(position);
    return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

/** A day at or above the target: passed / volume >= 90 %, integer arithmetic. */
function isGoodDay(day, config = CAPACITY_CONFIG) {
    return day.volume > 0 && day.passed * 10 >= config.GOOD_DAY_RATE_X10 * day.volume;
}

/** Band of a load; exactly 100 % and exactly 60 % are BINH_THUONG. */
function bandOf(load, config = CAPACITY_CONFIG) {
    if (load === null || load === undefined) return STATES.CHUA_DU_DU_LIEU;
    if (load > config.LOAD_HIGH) return STATES.QUA_TAI;
    if (load < config.LOAD_LOW) return STATES.CON_DU_SUC;
    return STATES.BINH_THUONG;
}

/**
 * Capacity of a route on `date` from its history (days with volume only, any order).
 * @param {{date: string, volume: number, passed: number}[]} history
 * @returns {{capacity: number|null, good_days: number}}
 */
function capacityOn(history, date, config = CAPACITY_CONFIG) {
    const end = dayNumber(date);
    const start = end - config.CAPACITY_WINDOW_DAYS;
    const good = [];
    for (const day of history) {
        const number = dayNumber(day.date);
        if (number >= start && number < end && isGoodDay(day, config)) good.push(day.volume);
    }
    if (good.length < config.CAPACITY_MIN_GOOD_DAYS) return { capacity: null, good_days: good.length };
    return { capacity: percentile(good, config.CAPACITY_PERCENTILE), good_days: good.length };
}

/**
 * The days of one POSTMAN route between from and to, each with the capacity of that day, load, band and postmen.
 * @param {{date, volume, passed, postmen}[]} history days with volume, covering the window before `from` too
 * @returns {object[]} one entry per day with volume inside [from, to], ordered by date
 */
function routeDays(history, from, to, config = CAPACITY_CONFIG) {
    const days = [...history].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const result = [];
    for (const day of days) {
        if (day.date < from || day.date > to || !(day.volume > 0)) continue;
        const { capacity, good_days: goodDays } = capacityOn(days, day.date, config);
        const load = capacity === null ? null : day.volume / capacity;
        const postmen = Number(day.postmen || 0);
        result.push({
            date: day.date,
            volume: day.volume,
            passed: day.passed,
            rate: Math.round((day.passed / day.volume) * 1000) / 10,
            capacity,
            good_days: goodDays,
            load,
            band: bandOf(load, config),
            postmen,
            volume_per_postman: postmen > 0 ? day.volume / postmen : null,
        });
    }
    return result;
}

/** A day of a route without capacity (NON_POSTMAN / OTHER): the volume only. */
function dayWithoutCapacity(day) {
    const postmen = Number(day.postmen || 0);
    return {
        date: day.date,
        volume: day.volume,
        passed: day.passed,
        rate: day.volume > 0 ? Math.round((day.passed / day.volume) * 1000) / 10 : null,
        capacity: null,
        good_days: 0,
        load: null,
        band: STATES.KHONG_AP_DUNG,
        postmen,
        volume_per_postman: postmen > 0 ? day.volume / postmen : null,
    };
}

const mean = (values) => (values.length ? values.reduce((total, value) => total + value, 0) / values.length : null);

/** Period summary of a route from its days (the output of routeDays or of dayWithoutCapacity). */
function summarizeDays(days) {
    const volume = days.reduce((total, day) => total + day.volume, 0);
    const passed = days.reduce((total, day) => total + day.passed, 0);
    const withLoad = days.filter((day) => day.load !== null);
    const withPostmen = days.filter((day) => day.postmen > 0);
    return {
        days: days.length,
        volume,
        passed,
        rate: volume > 0 ? Math.round((passed / volume) * 1000) / 10 : null,
        volume_avg: mean(days.map((day) => day.volume)),
        load_avg: mean(withLoad.map((day) => day.load)),
        days_with_load: withLoad.length,
        days_over: days.filter((day) => day.band === STATES.QUA_TAI).length,
        days_normal: days.filter((day) => day.band === STATES.BINH_THUONG).length,
        days_under: days.filter((day) => day.band === STATES.CON_DU_SUC).length,
        days_no_data: days.filter((day) => day.band === STATES.CHUA_DU_DU_LIEU).length,
        postmen_avg: mean(withPostmen.map((day) => day.postmen)),
        volume_per_postman_avg: mean(withPostmen.map((day) => day.volume_per_postman)),
    };
}

module.exports = { CAPACITY_CONFIG, STATES, percentile, isGoodDay, bandOf, capacityOn, routeDays, dayWithoutCapacity, summarizeDays, dayNumber };
