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
    const isCurrent = month === latestMonth;
    const row = {
      month,
      label,
      isCurrentMonth: isCurrent,
      national_rank: meta?.national_rank?.monthly?.[month] || null,
    };

    let monthTotalVolume = 0;
    let monthTotalPassed = 0;
    let monthTotalFailed = 0;
    let hasMonthData = false;
    const units = {};

    CANONICAL_BCVH_CODES.forEach((code) => {
      const match = monthly.find((m) => m.month === month && String(m.ma_bcvh) === code);
      const rateVal = match && match.rate !== null && match.rate !== undefined ? Number(match.rate) : null;
      row[code] = rateVal;

      const hasUnitData = Boolean(match && (match.volume > 0 || (match.rate !== null && match.rate !== undefined)));
      if (hasUnitData) {
        hasMonthData = true;
        const vol = Number(match.volume || 0);
        const passed = Number(match.passed || 0);
        const failed = match.failed !== undefined ? Number(match.failed) : Math.max(0, vol - passed);
        monthTotalVolume += vol;
        monthTotalPassed += passed;
        monthTotalFailed += failed;

        const calculatedRate = rateVal !== null ? rateVal : (vol > 0 ? Number(((passed / vol) * 100).toFixed(2)) : null);

        units[code] = {
          total_volume: vol,
          passed,
          failed,
          quality_rate: calculatedRate,
          target_rate: 90,
          target_variance: calculatedRate !== null ? Number((calculatedRate - 90).toFixed(2)) : null,
          days_with_data: match?.days_with_data ?? 0,
          days_in_period: match?.days_in_period ?? 0,
        };
      } else {
        units[code] = {
          total_volume: null,
          passed: null,
          failed: null,
          quality_rate: null,
          target_rate: 90,
          target_variance: null,
          days_with_data: 0,
          days_in_period: 0,
        };
      }
    });

    const totalRate = monthTotalVolume > 0 ? Number(((monthTotalPassed / monthTotalVolume) * 100).toFixed(2)) : null;

    row.total = hasMonthData ? {
      total_volume: monthTotalVolume,
      passed: monthTotalPassed,
      failed: monthTotalFailed,
      quality_rate: totalRate,
      target_rate: 90,
      target_variance: totalRate !== null ? Number((totalRate - 90).toFixed(2)) : null,
    } : {
      total_volume: null,
      passed: null,
      failed: null,
      quality_rate: null,
      target_rate: 90,
      target_variance: null,
    };

    row.units = units;
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
    routeRows,
    routeTotalRow,
    meta,
  };
}

/**
 * Extracts a flattened series data array for a given unit from monthlyChartData.
 * Format is completely aligned with getWeeklyTrendSeriesData.
 */
export function getMonthlyTrendSeriesData(chartData = [], unitKey = 'total', targetRate = 90) {
  return chartData.map((row) => {
    const entry = unitKey === 'total' || unitKey === 'WEEKLY_TREND_TOTAL_KEY'
      ? row.total
      : row.units?.[unitKey];

    return {
      period_id: row.month,
      month: row.month,
      label: row.label,
      isCurrentMonth: row.isCurrentMonth,
      // National rank only describes Huế as a whole -> TOTAL series only.
      national_rank: (unitKey === 'total' || unitKey === 'WEEKLY_TREND_TOTAL_KEY') ? (row.national_rank || null) : null,
      total_volume: entry?.total_volume ?? null,
      passed: entry?.passed ?? null,
      failed: entry?.failed ?? null,
      quality_rate: entry?.quality_rate ?? null,
      // the monthly rows carry the default 90 line; the series is re-targeted to the indicator's target
      target_rate: targetRate,
      target_variance: entry?.quality_rate === null || entry?.quality_rate === undefined
        ? null
        : Number((Number(entry.quality_rate) - targetRate).toFixed(2)),
      days_with_data: entry?.days_with_data ?? 0,
      days_in_period: entry?.days_in_period ?? 0,
    };
  });
}

