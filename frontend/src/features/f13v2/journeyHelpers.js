// Pure helpers of the F1.3 parcel journey (F13-V2-JOURNEY-01).

export const JOURNEY_MILESTONES = Object.freeze([
  { key: 'tms', label: 'Quét TMS xuống sàn' },
  { key: 'depart', label: 'KTC1 đóng đi' },
  { key: 'arrive', label: 'Xác nhận đến BCVH' },
  { key: 'gbt', label: 'Giao bưu tá' },
  { key: 'ptc', label: 'Phát thành công' },
]);

export const JOURNEY_LEGS = Object.freeze([
  { key: 'tms_depart', label: 'TMS → đóng đi' },
  { key: 'depart_arrive', label: 'Đóng đi → đến BCVH' },
  { key: 'tms_arrive', label: 'TMS → đến BCVH' },
  { key: 'arrive_gbt', label: 'Đến BCVH → giao bưu tá' },
  { key: 'gbt_ptc', label: 'Giao bưu tá → PTC' },
  { key: 'tms_ptc', label: 'Tổng TMS → PTC' },
]);

/** Hours with one decimal, Vietnamese comma; a leg the data does not have is a dash. */
export function formatLegHours(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** '2026-10-28 13:35:51' -> '28/10 13:35:51' */
export function formatMilestone(value) {
  const match = value && String(value).match(/^\d{4}-(\d{2})-(\d{2}) (\d{2}:\d{2}:\d{2})/);
  return match ? `${match[2]}/${match[1]} ${match[3]}` : '—';
}

export function formatJourneyDate(isoDate) {
  return isoDate ? isoDate.split('-').reverse().join('/') : '';
}

/** Every postman of a route on that day; the parcel count only when there are several. */
export function formatPostmen(postmen = []) {
  if (!postmen.length) return '—';
  if (postmen.length === 1) return postmen[0].ten_buu_ta || postmen[0].ma_buu_ta || '—';
  return postmen.map((item) => `${item.ten_buu_ta || item.ma_buu_ta} (${item.volume})`).join(', ');
}

export function coveragePercent(count, total) {
  if (!total) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

/** Sort key of a route row: a leg column reads its median, the postman column its first name. */
export function journeyRouteValue(row, field) {
  if (field.startsWith('legs.')) return row.legs?.[field.slice(5)] ?? null;
  if (field === 'postmen') return row.postmen?.[0]?.ten_buu_ta ?? null;
  return row[field] ?? null;
}
