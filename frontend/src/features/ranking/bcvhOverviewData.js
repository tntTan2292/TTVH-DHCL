import { CANONICAL_BCVH_CODES } from '../dashboard/components/dashboardFilterOptions.js';

export const DASH = '\u2014';

export const BCVH_COLORS = Object.freeze({
  '533140': '#2563eb', // Thuận Hóa - Blue
  '535470': '#7c3aed', // Hương Trà - Purple
  '535790': '#059669', // A Lưới - Emerald
  '536250': '#d97706', // Hương Thủy - Amber
  '537015': '#db2777', // Thuận An - Pink
  '537220': '#0284c7', // Phú Lộc - Sky
});

export const CANONICAL_NAMES = Object.freeze({
  '533140': 'Thuận Hóa',
  '535470': 'Hương Trà',
  '535790': 'A Lưới',
  '536250': 'Hương Thủy',
  '537015': 'Thuận An',
  '537220': 'Phú Lộc',
});

export function formatOverviewRate(value) {
  if (value === null || value === undefined || value === '') return DASH;
  const num = Number(value);
  if (!Number.isFinite(num)) return DASH;
  return `${num.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function formatOverviewNumber(value) {
  if (value === null || value === undefined || value === '') return DASH;
  const num = Number(value);
  if (!Number.isFinite(num)) return DASH;
  return num.toLocaleString('vi-VN');
}

export function processOverviewData(data = {}, meta = {}) {
  const monthly = Array.isArray(data.monthly) ? data.monthly : [];
  const daily = Array.isArray(data.daily) ? data.daily : [];
  const mtd = Array.isArray(data.mtd) ? data.mtd : [];
  const routes = Array.isArray(data.routes) ? data.routes : [];

  const nameMap = {};
  CANONICAL_BCVH_CODES.forEach((code) => {
    nameMap[code] = CANONICAL_NAMES[code] ? `BCVH ${CANONICAL_NAMES[code]}` : `BCVH ${code}`;
  });
  mtd.forEach((item) => {
    if (item.ma_bcvh && item.ten_bcvh) {
      nameMap[item.ma_bcvh] = item.ten_bcvh;
    }
  });

  // 1. Monthly processing
  const monthSet = new Set();
  monthly.forEach((item) => {
    if (item.month) monthSet.add(item.month);
  });
  const months = Array.from(monthSet).sort();
  const latestMonth = months.length > 0 ? months[months.length - 1] : null;

  const monthlyChartData = months.map((month) => {
    const label = month.endsWith('-01') ? 'T1' : `T${parseInt(month.slice(5), 10)}`;
    const row = {
      month,
      label,
      isCurrentMonth: month === latestMonth,
    };
    CANONICAL_BCVH_CODES.forEach((code) => {
      const match = monthly.find((m) => m.month === month && String(m.ma_bcvh) === code);
      row[code] = match && match.rate !== null && match.rate !== undefined ? Number(match.rate) : null;
    });
    return row;
  });

  const monthlyTableRows = CANONICAL_BCVH_CODES.map((code) => {
    const bcvhMonths = months.map((month) => {
      const match = monthly.find((m) => m.month === month && String(m.ma_bcvh) === code);
      return {
        month,
        label: month.endsWith('-01') ? 'T1' : `T${parseInt(month.slice(5), 10)}`,
        isCurrentMonth: month === latestMonth,
        rate: match && match.rate !== null && match.rate !== undefined ? Number(match.rate) : null,
        volume: match && match.volume !== undefined ? Number(match.volume) : 0,
        days_with_data: match?.days_with_data ?? 0,
        days_in_period: match?.days_in_period ?? 0,
      };
    });
    return {
      ma_bcvh: code,
      ten_bcvh: nameMap[code] || `BCVH ${code}`,
      months: bcvhMonths,
    };
  });

  // 2. Daily processing
  const dateSet = new Set();
  daily.forEach((item) => {
    if (item.date) dateSet.add(item.date);
  });
  const dates = Array.from(dateSet).sort();

  const dailyChartData = dates.map((date) => {
    const parts = date.split('-');
    const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : date;
    const row = {
      date,
      label,
    };
    CANONICAL_BCVH_CODES.forEach((code) => {
      const match = daily.find((dItem) => dItem.date === date && String(dItem.ma_bcvh) === code);
      row[code] = match && match.rate !== null && match.rate !== undefined ? Number(match.rate) : null;
    });
    return row;
  });

  // 3. MTD processing
  const mtdRows = CANONICAL_BCVH_CODES.map((code) => {
    const match = mtd.find((item) => String(item.ma_bcvh) === code);
    return {
      ma_bcvh: code,
      ten_bcvh: match?.ten_bcvh || nameMap[code] || `BCVH ${code}`,
      volume: match?.volume ?? 0,
      passed: match?.passed ?? 0,
      failed: match?.failed ?? 0,
      rate: match?.rate !== null && match?.rate !== undefined ? Number(match.rate) : null,
      rank: match?.rank ?? null,
      prev_volume: match?.previous_month_to_date?.volume ?? null,
      prev_passed: match?.previous_month_to_date?.passed ?? null,
      prev_rate: match?.previous_month_to_date?.rate !== null && match?.previous_month_to_date?.rate !== undefined ? Number(match.previous_month_to_date.rate) : null,
    };
  }).sort((a, b) => {
    if (a.rank !== null && b.rank !== null && a.rank !== b.rank) return a.rank - b.rank;
    if (a.rate !== null && b.rate !== null && a.rate !== b.rate) return b.rate - a.rate;
    return b.volume - a.volume;
  });

  let mtdTotalVolume = 0;
  let mtdTotalPassed = 0;
  let mtdTotalFailed = 0;
  let mtdPrevTotalVolume = 0;
  let mtdPrevTotalPassed = 0;

  mtdRows.forEach((r) => {
    mtdTotalVolume += r.volume;
    mtdTotalPassed += r.passed;
    mtdTotalFailed += r.failed;
    if (r.prev_volume !== null) mtdPrevTotalVolume += r.prev_volume;
    if (r.prev_passed !== null) mtdPrevTotalPassed += r.prev_passed;
  });

  const mtdTotalRate = mtdTotalVolume > 0 ? (mtdTotalPassed / mtdTotalVolume) * 100 : null;
  const mtdPrevTotalRate = mtdPrevTotalVolume > 0 ? (mtdPrevTotalPassed / mtdPrevTotalVolume) * 100 : null;

  const mtdTotalRow = {
    ma_bcvh: 'total',
    ten_bcvh: 'Tổng cộng',
    volume: mtdTotalVolume,
    passed: mtdTotalPassed,
    failed: mtdTotalFailed,
    rate: mtdTotalRate,
    rank: null,
    prev_volume: mtdPrevTotalVolume,
    prev_passed: mtdPrevTotalPassed,
    prev_rate: mtdPrevTotalRate,
  };

  // 4. Routes processing
  const routeRows = CANONICAL_BCVH_CODES.map((code) => {
    const match = routes.find((item) => String(item.ma_bcvh) === code);
    return {
      ma_bcvh: code,
      ten_bcvh: match?.ten_bcvh || nameMap[code] || `BCVH ${code}`,
      participating_route_count: match?.participating_route_count ?? 0,
      green: match?.green ?? 0,
      pink: match?.pink ?? 0,
      yellow: match?.yellow ?? 0,
      red: match?.red ?? 0,
    };
  });

  let totalRoutesCount = 0;
  let totalGreen = 0;
  let totalPink = 0;
  let totalYellow = 0;
  let totalRed = 0;

  routeRows.forEach((r) => {
    totalRoutesCount += r.participating_route_count;
    totalGreen += r.green;
    totalPink += r.pink;
    totalYellow += r.yellow;
    totalRed += r.red;
  });

  const routeTotalRow = {
    ma_bcvh: 'total',
    ten_bcvh: 'Tổng cộng',
    participating_route_count: totalRoutesCount,
    green: totalGreen,
    pink: totalPink,
    yellow: totalYellow,
    red: totalRed,
  };

  return {
    nameMap,
    months,
    latestMonth,
    monthlyChartData,
    monthlyTableRows,
    dates,
    dailyChartData,
    mtdRows,
    mtdTotalRow,
    routeRows,
    routeTotalRow,
    meta,
  };
}
