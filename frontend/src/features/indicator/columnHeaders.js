// One short vocabulary for the column titles of every report table (PO 2026-11-02): the user already knows what
// the indicator measures, so the title only says what the column is. "N" is the measured day, explained by a note.

export const HEADER_VOLUME = 'Sản lượng';
export const HEADER_RATE_NO_TMS = 'Tỷ lệ (không đo TMS)';
export const HEADER_COMPARE_N1 = 'So sánh (N-1)';
export const HEADER_COMPARE_N7 = 'So sánh (N-7)';
export const NOTE_N_DAY = 'N: ngày đo kiểm.';

// F1.3 is measured against the 2026 KPI, so the year stays in its title; the other indicators have no year.
export function rateHeader(indicator) {
  return indicator && indicator.id === 'f13' ? 'Tỷ lệ (2026)' : 'Tỷ lệ';
}

export function monthCompareHeader(isFullPrevMonth) {
  return isFullPrevMonth ? 'So sánh tháng trước' : 'So sánh cùng kỳ tháng trước';
}
