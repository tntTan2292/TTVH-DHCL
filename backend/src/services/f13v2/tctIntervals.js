'use strict';

// F13-WHY-DATA-01 (Manifest v4, sections 3 and 4): the time arithmetic of the F1.3 cause classifier.
// Pure functions, no database. Every time is an integer in milliseconds, every duration too: nothing is rounded before a comparison
// (rounding is for display only).
//
// Night rule C (observed in TCT data 5/9-28/10/2026, NOT a confirmed official TCT regulation):
//   night = [21:00, 07:00 next day); 21:00 is inside the night, 07:00 is not.
//   - day scan (T in [07:00, 21:00)): only the first night that overlaps [T, E] is left out, clipped to [T, E].
//   - night scan (T in [21:00, 07:00)): the rest of the night that holds T (clipped to E), plus ONE following full night
//     [21:00, 07:00) only when E reaches its end (E >= 07:00); a following night covered only in part is not left out.
//   Nothing before T, nothing after E, nothing twice. The set of excluded intervals is built once for the whole journey T->E; every
//   stage then takes its own overlap with that set.
// The difference to the official TCT figure is R = L - TCT (UNLOCATED_TCT_EXCLUSION); a stage with net time S can hold between
//   Lower = S - min(S, R)   and   Upper = S - max(0, R - (L - S)).
// R is only trusted inside [-TOLERANCE, L + TOLERANCE]; TCT is stored in whole minutes, so |R| <= 90 000 ms is precision, not an error.

const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;
const NIGHT_START_MS = 21 * HOUR_MS;
const NIGHT_LENGTH_MS = 10 * HOUR_MS;
const MORNING_END_MS = 7 * HOUR_MS;
const TOLERANCE_MS = 90000;

const VERDICT = Object.freeze({ OVER: 'QUA_HAN', WITHIN: 'CON_HAN', UNDECIDED: 'CHUA_DU_CAN_CU' });

const isTime = (value) => Number.isFinite(value);

/** The nights (as [start, end) in ms) left out of the journey [from, to]. */
function nightIntervals(from, to) {
    if (!isTime(from) || !isTime(to) || !(to > from)) return [];
    const day0 = Math.floor(from / DAY_MS) * DAY_MS;
    const clock = from - day0;
    const nightOf = (day) => [day + NIGHT_START_MS, day + NIGHT_START_MS + NIGHT_LENGTH_MS];
    const intervals = [];
    const clip = (start, end) => {
        const a = Math.max(start, from);
        const b = Math.min(end, to);
        if (b > a) intervals.push([a, b]);
    };
    if (clock >= NIGHT_START_MS) {
        clip(...nightOf(day0));
        const next = nightOf(day0 + DAY_MS);
        if (next[1] <= to) intervals.push(next);
    } else if (clock < MORNING_END_MS) {
        clip(day0 - DAY_MS + NIGHT_START_MS, day0 + MORNING_END_MS);
        const next = nightOf(day0);
        if (next[1] <= to) intervals.push(next);
    } else {
        clip(...nightOf(day0));
    }
    return intervals;
}

/** Milliseconds of [from, to] covered by the (disjoint) intervals. */
function overlapMs(intervals, from, to) {
    let total = 0;
    for (const [start, end] of intervals) total += Math.max(0, Math.min(end, to) - Math.max(start, from));
    return total;
}

/** Net milliseconds of a stage [from, to] once the journey-wide excluded intervals are taken out; null when the stage is not valid. */
function stageNetMs(intervals, from, to) {
    if (!isTime(from) || !isTime(to) || to < from) return null;
    return (to - from) - overlapMs(intervals, from, to);
}

/** "h:mm" (TCT hours) to milliseconds; null for an empty, negative or malformed value. */
function parseTctMs(value) {
    if (value === null || value === undefined) return null;
    const match = String(value).trim().match(/^(\d+):(\d{1,2})$/);
    if (!match) return null;
    return (Number(match[1]) * 60 + Number(match[2])) * 60000;
}

/**
 * The journey T->E against the official TCT time.
 * Returns { valid, reason, intervals, lMs, rMs, rawRMs }: rMs is R read as 0 when |R| <= TOLERANCE_MS, else R kept inside [0, L].
 */
function journeyModel(from, to, tctMs) {
    const bad = (reason) => ({ valid: false, reason, intervals: [], lMs: null, rMs: null, rawRMs: null });
    if (!isTime(from) || !isTime(to) || !(to > from)) return bad('THOI_GIAN_KHONG_HOP_LE');
    if (!isTime(tctMs)) return bad('THOI_GIAN_KHONG_HOP_LE');
    const intervals = nightIntervals(from, to);
    const lMs = stageNetMs(intervals, from, to);
    const rawRMs = lMs - tctMs;
    if (rawRMs < -TOLERANCE_MS || rawRMs > lMs + TOLERANCE_MS) {
        return { valid: false, reason: 'R_KHONG_HOP_LE', from, to, intervals, lMs, rMs: null, rawRMs };
    }
    // |R| inside the tolerance is the minute rounding of TCT: R = 0. Otherwise R is kept (and cannot exceed L).
    const rMs = Math.abs(rawRMs) <= TOLERANCE_MS ? 0 : Math.min(Math.max(rawRMs, 0), lMs);
    return { valid: true, reason: null, from, to, intervals, lMs, rMs, rawRMs };
}

/** [lower, upper] in ms of a stage with net time sMs inside a journey (lMs, rMs). */
function legBounds(sMs, lMs, rMs) {
    return [sMs - Math.min(sMs, rMs), sMs - Math.max(0, rMs - (lMs - sMs))];
}

/** Over the limit only when the whole interval is above it; "equal to the limit" is not over. */
function verdictOf([lower, upper], limitMs) {
    if (lower > limitMs) return VERDICT.OVER;
    if (upper <= limitMs) return VERDICT.WITHIN;
    return VERDICT.UNDECIDED;
}

/** Stage between two milestones inside a valid journey model: { netMs, bounds } or null when the stage is not valid. */
function stageOf(model, from, to) {
    if (!model || !model.valid) return null;
    if (!isTime(from) || !isTime(to) || from < model.from || to > model.to) return null; // a stage must lie inside T->E
    const netMs = stageNetMs(model.intervals, from, to);
    if (netMs === null) return null;
    return { netMs, bounds: legBounds(netMs, model.lMs, model.rMs) };
}

module.exports = {
    HOUR_MS, DAY_MS, TOLERANCE_MS, VERDICT,
    nightIntervals, overlapMs, stageNetMs, parseTctMs, journeyModel, legBounds, verdictOf, stageOf,
};
