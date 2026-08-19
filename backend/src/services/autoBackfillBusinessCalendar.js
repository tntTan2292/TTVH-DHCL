'use strict';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function createCalendarError(code, message, statusCode = 400) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
}

function normalizeBusinessDate(value, fieldName) {
    const text = String(value || '');
    if (!ISO_DATE.test(text)) throw createCalendarError('INVALID_DATE', `${fieldName} must use YYYY-MM-DD.`);
    const [year, month, day] = text.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw createCalendarError('INVALID_DATE', `${fieldName} is not a valid calendar date.`);
    }
    return text;
}

function formatDateInTimezone(value, timezone) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw createCalendarError('INVALID_DATE', 'as_of is not a valid date or timestamp.');
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function addUtcDays(businessDate, amount) {
    const date = new Date(`${normalizeBusinessDate(businessDate, 'businessDate')}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
}

function enumerateDatesDescending(fromDate, toDate) {
    if (fromDate > toDate) return [];
    const dates = [];
    for (let cursor = toDate; cursor >= fromDate; cursor = addUtcDays(cursor, -1)) dates.push(cursor);
    return dates;
}

module.exports = {
    ISO_DATE,
    createCalendarError,
    normalizeBusinessDate,
    formatDateInTimezone,
    addUtcDays,
    enumerateDatesDescending,
};
