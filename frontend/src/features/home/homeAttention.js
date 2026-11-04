// HOME-ATTENTION-01 (PO 2026-11-04) - words of the mark that flags a BCVH whose rate is unusually low for itself.
// The server decides who is flagged (`attention` on a row of the BCVH block); the page only names it.

const WEEKDAYS = ['Chủ nhật', 'thứ Hai', 'thứ Ba', 'thứ Tư', 'thứ Năm', 'thứ Sáu', 'thứ Bảy'];

export const ATTENTION_LEGEND = 'Thấp bất thường so với chính đơn vị';

export function weekdayName(iso) {
  const date = new Date(`${String(iso || '')}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? '' : WEEKDAYS[date.getUTCDay()];
}

function points(value) {
  return Number(value).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Tooltip of the mark, e.g. "thứ Hai: 24,1%. Thường các thứ Hai: 33,0%. Thấp hơn 8,9 điểm, vượt mức dao động
 * bình thường của đơn vị." `period` is the page's period, `dataDate` the day on screen (day view only).
 */
export function attentionTitle(attention, period, dataDate) {
  if (!attention) return '';
  const { rate, baseline, shortfall } = attention;
  let now;
  let usual;
  if (period === 'week') {
    now = 'Tuần này';
    usual = 'Thường các tuần trước';
  } else if (period === 'month') {
    now = 'Tháng này';
    usual = 'Thường các tháng trước';
  } else {
    const day = weekdayName(dataDate);
    now = day ? `${day.charAt(0).toUpperCase()}${day.slice(1)}` : 'Hôm nay';
    usual = day ? `Thường các ${day}` : 'Thường cùng thứ';
  }
  return `${now}: ${points(rate)}%. ${usual}: ${points(baseline)}%. Thấp hơn ${points(shortfall)} điểm, vượt mức dao động bình thường của đơn vị.`;
}
