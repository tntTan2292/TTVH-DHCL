const { CANONICAL_BCVH_UNITS } = require('../config/canonicalBcvhUnits');

const WEEK_ID_RE = /^(\d{4})-W(\d{2})$/;
const MS_PER_DAY = 86400000;

function shiftIsoDate(dateString, days) {
    const date = new Date(`${dateString}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function daysBetween(fromDate, toDate) {
    return Math.round((new Date(`${toDate}T00:00:00Z`).getTime() - new Date(`${fromDate}T00:00:00Z`).getTime()) / MS_PER_DAY);
}

// PO decision (F13-BCVH-WEEKLY-COMPARISON-01): tuần bắt đầu Thứ Năm, kết thúc Thứ Tư -- NOT the
// ISO 8601 Monday..Sunday week. Given any date, the Thursday on/before it is the custom week start.
function customWeekStart(dateString) {
    const dow = new Date(`${dateString}T00:00:00Z`).getUTCDay(); // Sun=0..Sat=6
    const offsetFromThursday = (dow - 4 + 7) % 7;
    return shiftIsoDate(dateString, -offsetFromThursday);
}

// The Thursday that opens ISO 8601 week `isoWeek` of `isoYear` (the same Thursday that anchors
// the standard Monday..Sunday ISO week of that number/year).
function thursdayForIsoWeek(isoYear, isoWeek) {
    const start = new Date(Date.UTC(isoYear, 0, 1));
    const startDayNum = (start.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    const firstThursday = new Date(start.getTime());
    firstThursday.setUTCDate(start.getUTCDate() - startDayNum + 3);
    // If shifting back crosses into the previous year, that year's first ISO week (and its
    // Thursday) actually starts one week later.
    if (firstThursday.getUTCFullYear() < isoYear) firstThursday.setUTCDate(firstThursday.getUTCDate() + 7);
    firstThursday.setUTCDate(firstThursday.getUTCDate() + (isoWeek - 1) * 7);
    return firstThursday.toISOString().slice(0, 10);
}

// The custom Thu-start week and the standard ISO Mon-Sun week containing the same Thursday share
// that Thursday, so the ISO week number of the custom week's own Thursday is exactly the number
// PO's examples use (Tuần 36 = 03/09-09/09/2026, whose Thursday 03/09 is ISO week 36 2026).
// Numbering therefore reuses the standard, year-boundary-safe ISO 8601 algorithm -- only the
// week's start/end day-of-week is custom, not the numbering scheme.
function isoWeekYearAndNumberForThursday(thursdayIso) {
    const probeYear = Number(thursdayIso.slice(0, 4));
    // A Thursday can only ever belong to `probeYear - 1`, `probeYear`, or `probeYear + 1`'s ISO
    // week numbering right at the turn of the year; try probeYear first, then its neighbours.
    for (const isoYear of [probeYear, probeYear - 1, probeYear + 1]) {
        const firstThursday = thursdayForIsoWeek(isoYear, 1);
        const isoWeek = 1 + Math.round((new Date(`${thursdayIso}T00:00:00Z`).getTime() - new Date(`${firstThursday}T00:00:00Z`).getTime()) / (7 * MS_PER_DAY));
        if (isoWeek >= 1 && isoWeek <= 53 && thursdayForIsoWeek(isoYear, isoWeek) === thursdayIso) {
            return { isoYear, isoWeek };
        }
    }
    throw new Error(`Unable to resolve ISO week for Thursday ${thursdayIso}`);
}

function weekIdFromDate(dateString) {
    const weekStart = customWeekStart(dateString);
    const { isoYear, isoWeek } = isoWeekYearAndNumberForThursday(weekStart);
    return { weekId: `${isoYear}-W${String(isoWeek).padStart(2, '0')}`, weekStart, isoYear, isoWeek };
}

function parseWeekId(weekId) {
    const match = WEEK_ID_RE.exec(String(weekId || ''));
    if (!match) {
        const error = new Error('week id must be in YYYY-Www format');
        error.code = 'INVALID_WEEK_ID';
        throw error;
    }
    return { isoYear: Number(match[1]), isoWeek: Number(match[2]) };
}

function weekBoundsForWeekId(weekId) {
    const { isoYear, isoWeek } = parseWeekId(weekId);
    const weekStart = thursdayForIsoWeek(isoYear, isoWeek);
    const weekEnd = shiftIsoDate(weekStart, 6);
    return { weekId, weekStart, weekEnd, isoYear, isoWeek };
}

function nullableRate(passed, volume) {
    const denominator = Number(volume || 0);
    if (denominator <= 0) return null;
    return Number(((Number(passed || 0) / denominator) * 100).toFixed(4));
}

class BcvhWeeklyComparisonService {
    constructor({ repository } = {}) {
        if (!repository) throw new Error('BcvhWeeklyComparisonService requires a repository');
        this.repository = repository;
        this.units = CANONICAL_BCVH_UNITS.map((unit) => ({ ...unit }));
        this.codes = this.units.map((unit) => unit.ma_bcvh);
    }

    // Resolves one weeks-list row into the fields the UI needs. Purely data-driven -- no "today"
    // concept: a week is "in progress" exactly when its last real fact date is short of its
    // planned Wednesday, whether that is because the week has not finished yet or because a
    // handful of trailing days were never imported. Either way the system must never claim data
    // it does not have (PO constraint), so the display range and note follow last_data_date only.
    _describeWeek(row) {
        const weekStart = row.week_start;
        const weekEnd = shiftIsoDate(weekStart, 6);
        const { weekId, isoYear, isoWeek } = weekIdFromDate(weekStart);
        const lastDataDate = row.last_date;
        const isInProgress = lastDataDate < weekEnd;
        const displayEndDate = isInProgress ? lastDataDate : weekEnd;
        const daysInPeriod = daysBetween(weekStart, displayEndDate) + 1;
        return {
            week_id: weekId,
            iso_year: isoYear,
            iso_week: isoWeek,
            label: `Tuần ${isoWeek}`,
            week_start: weekStart,
            week_end: weekEnd,
            display_start_date: weekStart,
            display_end_date: displayEndDate,
            first_data_date: row.first_date,
            last_data_date: lastDataDate,
            days_with_data: Number(row.days_with_data || 0),
            days_in_period: daysInPeriod,
            is_in_progress: isInProgress,
            data_through_note: isInProgress ? lastDataDate : null,
        };
    }

    async listWeeks() {
        const rows = await this.repository.getBcvhWeeksList(this.codes);
        return rows
            .map((row) => this._describeWeek(row))
            .sort((a, b) => (a.week_start < b.week_start ? -1 : a.week_start > b.week_start ? 1 : 0));
    }

    async compareWeeks(weekIdA, weekIdB) {
        if (!weekIdA || !weekIdB) {
            const error = new Error('week and compare_week are both required');
            error.code = 'MISSING_PARAM';
            throw error;
        }
        const weeks = await this.listWeeks();
        const weekMap = new Map(weeks.map((week) => [week.week_id, week]));

        const resolveOrThrow = (weekId) => {
            const { weekId: normalizedId } = weekBoundsForWeekId(weekId); // validates format, throws INVALID_WEEK_ID
            const described = weekMap.get(normalizedId);
            if (!described) {
                const error = new Error(`Tuần ${weekId} chưa có dữ liệu`);
                error.code = 'WEEK_NOT_FOUND';
                throw error;
            }
            return described;
        };

        const weekA = resolveOrThrow(weekIdA);
        const weekB = resolveOrThrow(weekIdB);

        const boundsA = { from: weekA.display_start_date, to: weekA.display_end_date };
        const boundsB = { from: weekB.display_start_date, to: weekB.display_end_date };
        const rows = await this.repository.getBcvhWeeklyComparisonAggregate(boundsA, boundsB, this.codes);
        const rowByBcvh = new Map(rows.map((row) => [row.ma_bcvh, row]));

        const units = this.units.map((unit) => {
            const row = rowByBcvh.get(unit.ma_bcvh) || {};
            const volumeA = Number(row.volume_a || 0);
            const passedA = Number(row.passed_a || 0);
            const volumeB = Number(row.volume_b || 0);
            const passedB = Number(row.passed_b || 0);
            const rateA = nullableRate(passedA, volumeA);
            const rateB = nullableRate(passedB, volumeB);
            return {
                ma_bcvh: unit.ma_bcvh,
                ten_bcvh: unit.ten_bcvh,
                current: { volume: volumeA, passed: passedA, failed: volumeA - passedA, rate: rateA },
                compare: { volume: volumeB, passed: passedB, failed: volumeB - passedB, rate: rateB },
                // Absolute percentage-point delta, matching every other comparison column in this
                // module (BcvhMtdSummaryBlock's "so cùng kỳ tháng trước", Operation Dashboard's D-1/D-7).
                rate_delta: (rateA !== null && rateB !== null) ? Number((rateA - rateB).toFixed(4)) : null,
                volume_delta: volumeA - volumeB,
            };
        });

        const totalVolumeA = units.reduce((sum, u) => sum + u.current.volume, 0);
        const totalPassedA = units.reduce((sum, u) => sum + u.current.passed, 0);
        const totalVolumeB = units.reduce((sum, u) => sum + u.compare.volume, 0);
        const totalPassedB = units.reduce((sum, u) => sum + u.compare.passed, 0);
        const totalRateA = nullableRate(totalPassedA, totalVolumeA);
        const totalRateB = nullableRate(totalPassedB, totalVolumeB);

        return {
            rows: units,
            total_row: {
                ten_bcvh: 'TỔNG CỘNG',
                current: { volume: totalVolumeA, passed: totalPassedA, failed: totalVolumeA - totalPassedA, rate: totalRateA },
                compare: { volume: totalVolumeB, passed: totalPassedB, failed: totalVolumeB - totalPassedB, rate: totalRateB },
                rate_delta: (totalRateA !== null && totalRateB !== null) ? Number((totalRateA - totalRateB).toFixed(4)) : null,
                volume_delta: totalVolumeA - totalVolumeB,
            },
            meta: {
                current_week: weekA,
                compare_week: weekB,
                canonical_bcvh_count: this.units.length,
            },
        };
    }
}

module.exports = {
    BcvhWeeklyComparisonService,
    weekIdFromDate,
    weekBoundsForWeekId,
    parseWeekId,
    customWeekStart,
    nullableRate,
};
