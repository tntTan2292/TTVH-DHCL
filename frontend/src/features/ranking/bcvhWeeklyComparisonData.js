import { formatDisplayDate } from '../dashboard/components/operatingPatternTabsData.js';

export const MS_PER_DAY = 86400000;
export const DEFAULT_WEEK_DAYS = 7;

/**
 * Shift an ISO date string (YYYY-MM-DD) by N days in UTC.
 */
export function shiftIsoDate(dateString, days) {
  if (!dateString || typeof dateString !== 'string') return '';
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

/**
 * Snap any calendar date to the Thursday that opens that custom week
 * (matching PO rule: custom week starts on Thursday and ends on Wednesday).
 * e.g. 2026-09-14 (Monday) -> 2026-09-10 (Thursday).
 */
export function snapToThursday(dateString) {
  if (!dateString || typeof dateString !== 'string') return '';
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const dow = new Date(`${dateString}T00:00:00Z`).getUTCDay(); // 0=Sun..6=Sat
  const offsetFromThursday = (dow - 4 + 7) % 7;
  return shiftIsoDate(dateString, -offsetFromThursday);
}

/**
 * Format ISO date (YYYY-MM-DD) to Vietnamese DD/MM/YYYY.
 */
export function formatDateVN(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return formatDisplayDate(isoDate);
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Format ISO date (YYYY-MM-DD) to DD/MM.
 */
export function formatShortDate(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const [, , month, day] = match;
  return `${day}/${month}`;
}

/**
 * Format date range according to PO specification:
 * e.g. "17/09–21/09/2026" (same year) or "25/12/2026–01/01/2027" (cross-year).
 */
export function formatWeekDateRange(startDate, endDate) {
  if (!startDate || !endDate) return '';
  const startYear = startDate.slice(0, 4);
  const endYear = endDate.slice(0, 4);
  if (startYear === endYear) {
    return `${formatShortDate(startDate)}–${formatDateVN(endDate)}`;
  }
  return `${formatDateVN(startDate)}–${formatDateVN(endDate)}`;
}

/**
 * Find Thursday inside a 7-day cycle starting at `startDate`.
 * In any 7 consecutive calendar days, there is always exactly one Thursday (day of week = 4).
 */
export function findThursdayInWeek(startDate) {
  for (let i = 0; i < DEFAULT_WEEK_DAYS; i++) {
    const d = shiftIsoDate(startDate, i);
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (dow === 4) return d;
  }
  return startDate;
}

/**
 * The Thursday that opens ISO 8601 week `isoWeek` of `isoYear`.
 */
export function thursdayForIsoWeek(isoYear, isoWeek) {
  const start = new Date(Date.UTC(isoYear, 0, 1));
  const startDayNum = (start.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  const firstThursday = new Date(start.getTime());
  firstThursday.setUTCDate(start.getUTCDate() - startDayNum + 3);
  if (firstThursday.getUTCFullYear() < isoYear) firstThursday.setUTCDate(firstThursday.getUTCDate() + 7);
  firstThursday.setUTCDate(firstThursday.getUTCDate() + (isoWeek - 1) * 7);
  return firstThursday.toISOString().slice(0, 10);
}

/**
 * Resolve ISO week and year from Thursday date string.
 */
export function isoWeekYearAndNumberForThursday(thursdayIso) {
  const probeYear = Number(thursdayIso.slice(0, 4));
  for (const isoYear of [probeYear, probeYear - 1, probeYear + 1]) {
    const firstThursday = thursdayForIsoWeek(isoYear, 1);
    const isoWeek = 1 + Math.round(
      (new Date(`${thursdayIso}T00:00:00Z`).getTime() - new Date(`${firstThursday}T00:00:00Z`).getTime()) /
        (7 * MS_PER_DAY)
    );
    if (isoWeek >= 1 && isoWeek <= 53 && thursdayForIsoWeek(isoYear, isoWeek) === thursdayIso) {
      return { isoYear, isoWeek };
    }
  }
  return { isoYear: probeYear, isoWeek: 1 };
}

/**
 * Format label for week select options complying with PO requirements B1 & B4:
 * - When week is in progress, displays real data range: e.g. "Tuần 38 (2026): 17/09–21/09/2026"
 * - When week is fully elapsed, displays full range: e.g. "Tuần 37 (2026): 10/09–16/09/2026"
 * - Does not use bare "Tuần 1"
 */
export function formatWeekRangeLabel(week) {
  if (!week) return '';
  // PO B4: Use real display dates (display_end_date reflects last_data_date when in progress)
  const start = week.display_start_date || week.week_start;
  const end = week.display_end_date || week.week_end;
  const year = week.iso_year || (end ? end.slice(0, 4) : '');
  const weekNum = week.iso_week || (week.label ? week.label.replace(/[^\d]/g, '') : '');
  const range = formatWeekDateRange(start, end);
  const weekTitle = weekNum ? `Tuần ${weekNum}` : (week.label || 'Tuần');
  if (year && range) {
    return `${weekTitle} (${year}): ${range}`;
  }
  if (range) {
    return `${weekTitle}: ${range}`;
  }
  return week.label || '';
}

/**
 * Builds week options for select dropdowns:
 * - Newest week first (sorted descending by week_start)
 * - Real data range in label
 */
export function buildWeekOptions(weeks) {
  if (!Array.isArray(weeks) || !weeks.length) return [];
  const sorted = [...weeks].sort((a, b) => {
    const startA = a.week_start || a.display_start_date || '';
    const startB = b.week_start || b.display_start_date || '';
    return startB.localeCompare(startA);
  });

  return sorted.map((week) => ({
    value: week.week_id,
    label: formatWeekRangeLabel(week),
    week,
  }));
}

/**
 * PO Blockers B1, B2, B3:
 * Resolves a date string to a valid backend week without inventing fake/future weeks.
 * - Snaps non-Thursday date (e.g. Monday 14/09) to Thursday (10/09/2026 = W37).
 * - Clamps future date (e.g. 01/10/2026) to the latest week with data (W38), with notice.
 * - Does not invent fake weeks or fake days_with_data.
 */
export function resolveWeekFromAnchorDate(rawDate, backendWeeks = []) {
  if (!Array.isArray(backendWeeks) || !backendWeeks.length) {
    return {
      resolvedWeek: null,
      snappedThursday: '',
      isFutureClamped: false,
      message: 'Chưa có dữ liệu tuần',
    };
  }

  const sorted = [...backendWeeks].sort((a, b) => (b.week_start || '').localeCompare(a.week_start || ''));
  const latestWeek = sorted[0];
  const oldestWeek = sorted[sorted.length - 1];

  if (!rawDate) {
    return {
      resolvedWeek: latestWeek,
      snappedThursday: latestWeek.week_start,
      isFutureClamped: false,
      message: null,
    };
  }

  const snapped = snapToThursday(rawDate);

  // Exact match with an existing week in backend
  const match = sorted.find((w) => w.week_start === snapped || w.week_id === rawDate);
  if (match) {
    return {
      resolvedWeek: match,
      snappedThursday: snapped,
      isFutureClamped: false,
      message: null,
    };
  }

  // Future date beyond latest fact data in database: clamp to latest week
  if (snapped > latestWeek.week_start) {
    return {
      resolvedWeek: latestWeek,
      snappedThursday: latestWeek.week_start,
      isFutureClamped: true,
      message: `Ngày ${formatDateVN(rawDate)} chưa có dữ liệu tuần. Hệ thống căn về tuần gần nhất: ${latestWeek.label} (${formatWeekDateRange(latestWeek.display_start_date, latestWeek.display_end_date)}).`,
    };
  }

  // Older date than oldest week in database: clamp to oldest week
  if (snapped < oldestWeek.week_start) {
    return {
      resolvedWeek: oldestWeek,
      snappedThursday: oldestWeek.week_start,
      isFutureClamped: false,
      message: `Ngày ${formatDateVN(rawDate)} trước phạm vi dữ liệu có sẵn. Hệ thống chọn ${oldestWeek.label}.`,
    };
  }

  // Nearest week fallback among real backend weeks
  return {
    resolvedWeek: latestWeek,
    snappedThursday: latestWeek.week_start,
    isFutureClamped: false,
    message: null,
  };
}

/**
 * PO Blocker B3:
 * Resolves the full weeks list and selected week ID without losing existing data weeks.
 * When user changes anchor (e.g. to 10/09/2026), W38 remains in the list!
 * Only returns real backend weeks (no fake future weeks, no fake 2025 weeks).
 */
export function resolveWeeksListWithAnchor(backendWeeks = [], anchorDate = '') {
  if (!Array.isArray(backendWeeks) || !backendWeeks.length) {
    return {
      weeks: [],
      selectedWeekId: '',
      resolvedWeek: null,
      message: 'Chưa có dữ liệu tuần',
    };
  }

  const sorted = [...backendWeeks].sort((a, b) => (b.week_start || '').localeCompare(a.week_start || ''));
  const resolution = resolveWeekFromAnchorDate(anchorDate, sorted);

  return {
    weeks: sorted, // ALL real backend weeks are preserved; none dropped!
    selectedWeekId: resolution.resolvedWeek?.week_id || sorted[0].week_id,
    resolvedWeek: resolution.resolvedWeek,
    message: resolution.message,
    isFutureClamped: resolution.isFutureClamped,
    snappedThursday: resolution.snappedThursday,
  };
}

/**
 * PO Requirement 4:
 * Clear note when week has incomplete data: e.g. "Dữ liệu đến ngày 21/09/2026".
 */
export function formatWeekDataNote(week) {
  if (!week) return null;
  const isTruncated = week.is_in_progress || (week.last_data_date && week.week_end && week.last_data_date < week.week_end);
  if (isTruncated) {
    const cutDate = week.data_through_note || week.last_data_date || week.display_end_date;
    return `Dữ liệu đến ngày ${formatDateVN(cutDate)}`;
  }
  if (week.days_with_data > 0 && week.days_in_period > 0 && week.days_with_data < week.days_in_period) {
    return `${week.days_with_data}/${week.days_in_period} ngày có dữ liệu`;
  }
  return null;
}

/**
 * PO Requirement 5:
 * When two weeks have different days with data, returns mismatch status & warning text:
 * "Lưu ý: Hai tuần có số ngày dữ liệu khác nhau"
 */
export function checkWeeksDaysMismatch(weekA, weekB) {
  if (!weekA || !weekB) return { isMismatch: false, message: '' };
  const daysA = weekA.days_with_data !== undefined ? Number(weekA.days_with_data) : null;
  const daysB = weekB.days_with_data !== undefined ? Number(weekB.days_with_data) : null;
  if (daysA !== null && daysB !== null && daysA !== daysB) {
    return {
      isMismatch: true,
      message: 'Lưu ý: Hai tuần có số ngày dữ liệu khác nhau',
      daysA,
      daysB,
    };
  }
  return { isMismatch: false, message: '' };
}

// Percentage-point difference, absolute points with sign
export function formatSignedRateDelta(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} điểm %`;
}

// Format integer volume delta with sign
export function formatSignedVolumeDelta(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toLocaleString('vi-VN')}`;
}
