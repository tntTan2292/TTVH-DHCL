'use strict';

// F13-V2-STRUCTURE-01: converts the time anchor between the day, week and month pages (design Section 3, PO D3).
// Pure: the week calendar is the existing Thursday-Wednesday one (bcvhWeeklyComparisonService), no second calendar.
//   day   -> the week that contains it, the month of that day
//   week  -> its last day with data, the month of the week's Thursday
//   month -> its last day with data, the week that contains that day

const { weekIdFromDate, weekBoundsForWeekId } = require('../bcvhWeeklyComparisonService');

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_ID_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function isRealDate(value) {
    if (!ISO_DATE_RE.test(String(value || ''))) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function monthBounds(monthId) {
    const match = MONTH_ID_RE.exec(String(monthId || ''));
    if (!match) throw fail('INVALID_MONTH_ID', 'month id must be in YYYY-MM format');
    const start = `${match[1]}-${match[2]}-01`;
    const next = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1));
    const end = new Date(next.getTime() - 86400000).toISOString().slice(0, 10);
    return { month_id: monthId, month_start: start, month_end: end };
}

function describeWeek(dateInWeek) {
    const { weekId } = weekIdFromDate(dateInWeek);
    const bounds = weekBoundsForWeekId(weekId);
    return { week_id: weekId, week_start: bounds.weekStart, week_end: bounds.weekEnd, iso_week: bounds.isoWeek };
}

function describeMonth(dateInMonth) {
    return monthBounds(dateInMonth.slice(0, 7));
}

function clampToLatest(date, latestDate) {
    return latestDate && date > latestDate ? latestDate : date;
}

/**
 * @param {{kind: 'day'|'week'|'month', value: string, latestDate?: string|null}} input
 * @returns {{kind, value, latest_date, clamped, day: string, week: object, month: object}}
 *   `day` is the anchor day (end of a range for the Theo ngày page), never later than the latest day with data.
 */
function resolvePeriod({ kind, value, latestDate = null } = {}) {
    if (!['day', 'week', 'month'].includes(kind)) throw fail('INVALID_KIND', 'kind must be day, week or month');
    if (latestDate !== null && !isRealDate(latestDate)) throw fail('INVALID_DATE', 'latest date must be YYYY-MM-DD');

    let anchorDay;
    let monthSource;
    let weekSource = null;
    if (kind === 'day') {
        if (!isRealDate(value)) throw fail('INVALID_DATE', 'value must be a valid date in YYYY-MM-DD format');
        anchorDay = value;
        monthSource = null;
    } else if (kind === 'week') {
        const bounds = weekBoundsForWeekId(value); // throws INVALID_WEEK_ID
        anchorDay = bounds.weekEnd;
        weekSource = bounds.weekStart;
        monthSource = bounds.weekStart; // D3: month of the week's Thursday
    } else {
        const bounds = monthBounds(value); // throws INVALID_MONTH_ID
        anchorDay = bounds.month_end;
        monthSource = bounds.month_start;
    }

    const day = clampToLatest(anchorDay, latestDate);
    const clamped = day !== anchorDay;
    const week = describeWeek(weekSource || day);
    const month = describeMonth(monthSource || day);

    return { kind, value, latest_date: latestDate, clamped, day, week, month };
}

module.exports = { resolvePeriod, monthBounds, isRealDate };
