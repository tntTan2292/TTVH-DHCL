'use strict';

// HOME-ATTENTION-01 (PO 2026-11-04) - which BCVH of the Home "quality of the BCVH" block deserve a second look.
// A BCVH is flagged when its rate is unusually low *for that BCVH*, not when it is simply the lowest:
//   day   - against the same weekday of its own previous weeks (a Monday is only compared with Mondays, because
//           every BCVH loses 10-30 points after the weekend);
//   week  - against its own previous Thursday-Wednesday weeks (the same number of days when the week is running);
//   month - against its own previous months (the same number of days when the month is running).
// The usual LEVEL is the average of the most recent periods only (4 weeks / 4 same weekdays / 3 months), so a unit
// that has been improving is judged against how it does now, not against a worse past (PO 2026-11-04). The usual
// SPREAD (standard deviation) is read over a longer stretch (8 weeks / 6 months) because 4 points are too few to
// tell how much a unit normally moves.
// "Unusually low" = lower than its usual level by more than 1.5 times its usual spread (at least 1 point so a
// perfectly steady unit is not flagged for a hair). A BCVH with fewer than 4 % of the volume of
// the six BCVH together is not judged (too little effect on the whole; its rate jumps for a handful of parcels).
// Nothing here changes a KPI figure: it only adds `attention` to the rows the block already lists.

const MIN_SHARE = 0.04;
const FACTOR = 1.5;
const SPREAD_FLOOR = 1;
// count = how many past periods are read; levelCount = the most recent of them that give the usual level;
// minLevel / minSpread = how many of them must have data before a verdict is given.
const WINDOWS = Object.freeze({
    day: { count: 8, levelCount: 4, minLevel: 3, minSpread: 6, basis: 'weekday' },
    week: { count: 8, levelCount: 4, minLevel: 3, minSpread: 6, basis: 'week' },
    month: { count: 6, levelCount: 3, minLevel: 2, minSpread: 4, basis: 'month' },
});

function shiftDate(dateStr, deltaDays) {
    const date = new Date(`${dateStr}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + deltaDays);
    return date.toISOString().slice(0, 10);
}

function daysBetween(from, to) {
    return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

function monthStartShift(dateStr, delta) {
    return new Date(Date.UTC(Number(dateStr.slice(0, 4)), Number(dateStr.slice(5, 7)) - 1 + delta, 1)).toISOString().slice(0, 10);
}

function monthEnd(monthStart) {
    return shiftDate(monthStartShift(monthStart, 1), -1);
}

function round1(value) {
    return Number(Number(value).toFixed(1));
}

/** The ranges the unit is compared with, newest first, cut to the same length as the range on screen. */
function historyRanges(period, from, to) {
    const window = WINDOWS[period];
    if (!window || !from || !to) return [];
    const length = daysBetween(from, to) + 1;
    const ranges = [];
    for (let k = 1; k <= window.count; k += 1) {
        if (period === 'month') {
            const start = monthStartShift(from, -k);
            const end = shiftDate(start, length - 1);
            const last = monthEnd(start);
            ranges.push({ from: start, to: end < last ? end : last });
        } else {
            const start = shiftDate(from, -7 * k);
            ranges.push({ from: start, to: shiftDate(start, length - 1) });
        }
    }
    return ranges;
}

/**
 * @param {{ period: string, rate: number, volume: number, totalVolume: number, history: Array<number|null> }} unit
 *   history = the unit's rate in each range of historyRanges, newest first (null when it had no parcels there)
 * @returns {null | { basis, rate, baseline, spread, shortfall, samples }} null = nothing to flag (or not judged)
 */
function judgeUnit({ period, rate, volume, totalVolume, history }) {
    const window = WINDOWS[period];
    if (!window) return null;
    if (!Number.isFinite(rate) || !(volume > 0) || !(totalVolume > 0)) return null;
    if (volume / totalVolume < MIN_SHARE) return null;
    const known = (list) => list.filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value))).map(Number);
    const past = known(history || []);
    const recent = known((history || []).slice(0, window.levelCount));
    if (recent.length < window.minLevel || past.length < window.minSpread) return null;
    const mean = recent.reduce((sum, value) => sum + value, 0) / recent.length;
    const pastMean = past.reduce((sum, value) => sum + value, 0) / past.length;
    const spread = Math.sqrt(past.reduce((sum, value) => sum + (value - pastMean) ** 2, 0) / past.length);
    const shortfall = mean - rate;
    if (!(shortfall >= FACTOR * Math.max(spread, SPREAD_FLOOR))) return null;
    return {
        basis: window.basis,
        rate: round1(rate),
        baseline: round1(mean),
        spread: round1(spread),
        shortfall: round1(shortfall),
        samples: recent.length,
    };
}

module.exports = { MIN_SHARE, FACTOR, SPREAD_FLOOR, WINDOWS, historyRanges, judgeUnit };
