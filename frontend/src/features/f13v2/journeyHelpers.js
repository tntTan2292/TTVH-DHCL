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

// J3: The 4 stages of a route: Không đạt beside Đạt, with slowest_leg marked
export const JOURNEY_ROUTE_STAGES = Object.freeze([
  { key: 'tms_arrive', label: 'TMS → Đến BCVH' },
  { key: 'arrive_gbt', label: 'Đến BCVH → Giao bưu tá' },
  { key: 'gbt_ptc', label: 'Giao bưu tá → Phát' },
  { key: 'tms_ptc', label: 'Tổng TMS → Phát' },
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

/** Postmen with volume for each person (J3). */
export function formatPostmenWithVolume(postmen = []) {
  if (!postmen || !postmen.length) return '—';
  return postmen.map((item) => {
    const name = item.ten_buu_ta || item.ma_buu_ta || '—';
    return item.volume !== undefined && item.volume !== null
      ? `${name} (${Number(item.volume).toLocaleString('vi-VN')})`
      : name;
  }).join(', ');
}

export function coveragePercent(count, total) {
  if (!total) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

/** Group routes by BCVH preserving the API order (J2, J4). */
export function groupJourneyRoutesByBcvh(routes = []) {
  const map = new Map();
  routes.forEach((r) => {
    const ma_bcvh = r.ma_bcvh || 'UNKNOWN';
    if (!map.has(ma_bcvh)) {
      map.set(ma_bcvh, {
        ma_bcvh,
        ten_bcvh: r.ten_bcvh || (ma_bcvh.startsWith('BCVH') ? ma_bcvh : `BCVH ${ma_bcvh}`),
        postmanRoutes: [],
        nonPostmanRoutes: [],
        otherRoutes: [],
      });
    }
    const group = map.get(ma_bcvh);
    if (r.route_scope === 'POSTMAN') {
      group.postmanRoutes.push(r);
    } else if (r.route_scope === 'NON_POSTMAN') {
      group.nonPostmanRoutes.push(r);
    } else {
      group.otherRoutes.push(r);
    }
  });
  return Array.from(map.values());
}

/** Sort key of a route row: a leg column reads its median, the postman column its name. */
export function journeyRouteValue(row, field) {
  if (field.startsWith('legs_failed.')) return row.legs_failed?.[field.slice(12)] ?? null;
  if (field.startsWith('legs_passed.')) return row.legs_passed?.[field.slice(12)] ?? null;
  if (field.startsWith('legs.')) return row.legs?.[field.slice(5)] ?? null;
  if (field === 'postmen' || field === 'ten_buu_ta' || field === 'postman' || field === 'ma_buu_ta') {
    return row.ten_buu_ta || row.ma_buu_ta || (row.postmen?.[0]?.ten_buu_ta) || 'Chưa có bưu tá';
  }
  if (field === 'route_rate') return row.route_rate ?? null;
  if (field === 'route_volume') return row.route_volume ?? null;
  if (field === 'main_cause') return row.main_cause?.label ?? null;
  return row[field] ?? null;
}

/** Formats postman display label for a journey route row (J7: null postman displays "Chưa có bưu tá"). */
export function formatJourneyPostman(row) {
  if (!row) return 'Chưa có bưu tá';
  if (row.ten_buu_ta) {
    return row.ma_buu_ta ? `${row.ten_buu_ta} (${row.ma_buu_ta})` : row.ten_buu_ta;
  }
  if (row.ma_buu_ta) {
    return row.ma_buu_ta;
  }
  if (row.postmen && row.postmen.length > 0) {
    return formatPostmenWithVolume(row.postmen);
  }
  return 'Chưa có bưu tá';
}

/** Main cause of a route (object from the /why layer) as text: label and its share of the failed parcels. */
export function formatJourneyMainCause(row) {
  if (!row) return '—';
  if (row.failed === 0) {
    if (row.volume > 0 && row.passed === row.volume) {
      return '100% đạt';
    }
    return 'Chưa có đánh giá';
  }
  const cause = row.main_cause;
  if (!cause || !cause.label) return '—';
  const share = Number.isFinite(cause.share) ? ` (${Math.round(cause.share * 100)}%)` : '';
  return `${cause.label}${share}`;
}

/** Formats user-facing label for the active period. */
export function formatPeriodDisplay({ periodMode, fromDate, toDate, weekId, availableWeeks = [], monthId, availableMonths = [], latestDate }) {
  if (periodMode === 'week') {
    const w = availableWeeks.find((item) => item.week_id === (weekId || availableWeeks[0]?.week_id));
    return w?.label || weekId || 'Tuần';
  }
  if (periodMode === 'month') {
    const m = availableMonths.find((item) => item.month_id === (monthId || availableMonths[0]?.month_id));
    return m?.label || monthId || 'Tháng';
  }
  const from = fromDate || latestDate || '';
  const to = toDate || latestDate || '';
  if (!from && !to) return '';
  if (from === to) return `Ngày ${formatJourneyDate(from)}`;
  return `${formatJourneyDate(from)} đến ${formatJourneyDate(to)}`;
}
