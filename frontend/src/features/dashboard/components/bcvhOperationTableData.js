export const DASH = '\u2014';

export const CANONICAL_BCVH_UNITS = Object.freeze([
  Object.freeze({ ma_bcvh: '535790', ten_bcvh: 'BCVH A Lưới' }),
  Object.freeze({ ma_bcvh: '536250', ten_bcvh: 'BCVH Hương Thủy' }),
  Object.freeze({ ma_bcvh: '535470', ten_bcvh: 'BCVH Hương Trà' }),
  Object.freeze({ ma_bcvh: '537220', ten_bcvh: 'BCVH Phú Lộc' }),
  Object.freeze({ ma_bcvh: '537015', ten_bcvh: 'BCVH Thuận An' }),
  Object.freeze({ ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa' }),
]);

export const CANONICAL_BCVH_CODES = Object.freeze(
  CANONICAL_BCVH_UNITS.map((u) => u.ma_bcvh)
);

export const CANONICAL_NAMES = Object.freeze({
  '535790': 'BCVH A Lưới',
  '536250': 'BCVH Hương Thủy',
  '535470': 'BCVH Hương Trà',
  '537220': 'BCVH Phú Lộc',
  '537015': 'BCVH Thuận An',
  '533140': 'BCVH Thuận Hóa',
});

/**
 * Format ISO date 'YYYY-MM-DD' to Vietnamese 'DD/MM/YYYY'.
 * Falls back to DASH if invalid or missing.
 */
export function formatDateVN(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return DASH;
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return DASH;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Format integer volume with vi-VN dot thousand separators.
 * Null/undefined/NaN returns DASH ('—').
 */
export function formatVolume(value) {
  if (value === null || value === undefined || value === '') return DASH;
  const num = Number(value);
  if (!Number.isFinite(num)) return DASH;
  return num.toLocaleString('vi-VN');
}

/**
 * Format rate percentage with 1 decimal place (e.g. 65,8%).
 * Null/undefined returns DASH ('—').
 */
export function formatRate(value) {
  if (value === null || value === undefined || value === '') return DASH;
  const num = Number(value);
  if (!Number.isFinite(num)) return DASH;
  return `${num.toLocaleString('vi-VN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

/**
 * Format rate movement in percentage points ('điểm %').
 * Includes sign: '+1,2 điểm %', '-0,5 điểm %', '0,0 điểm %'.
 * Null/undefined returns DASH ('—').
 */
export function formatDeltaRate(value) {
  if (value === null || value === undefined || value === '') return DASH;
  const num = Number(value);
  if (!Number.isFinite(num)) return DASH;
  const sign = num > 0 ? '+' : '';
  const formatted = num.toLocaleString('vi-VN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${sign}${formatted} điểm %`;
}

/**
 * Calculate rate safely avoiding division by zero.
 */
function calculateRate(passed, volume) {
  const vol = Number(volume || 0);
  if (vol <= 0) return null;
  return (Number(passed || 0) / vol) * 100;
}

/**
 * Process raw API data from /f13/bcvh/overview into the exact 9-column
 * locked table contract for Operation Dashboard.
 *
 * @param {Object} data - Raw data payload from /f13/bcvh/overview
 * @returns {Object} Processed table model with title, header, totalRow, and canonical rows.
 */
export function processBcvhOperationTableData(data = {}) {
  const meta = data?.meta || {};
  const rawMtd = Array.isArray(data?.mtd) ? data.mtd : [];
  const rawDaily = Array.isArray(data?.daily) ? data.daily : [];

  const anchorDate = meta.anchor_date || null;
  const formattedAnchorDate = formatDateVN(anchorDate);

  // Find previous available fact date: max date in daily strictly before anchorDate having fact records
  const validDates = Array.from(
    new Set(
      rawDaily
        .filter((item) => Number(item?.volume || 0) > 0 || Number(item?.passed || 0) > 0 || Number(item?.failed || 0) > 0)
        .map((item) => item.date)
        .filter(Boolean)
    )
  ).sort();

  const prevFactDate = anchorDate ? validDates.filter((date) => date < anchorDate).pop() || null : null;
  const formattedPrevFactDate = formatDateVN(prevFactDate);

  // Build the 6 canonical rows strictly in CANONICAL_BCVH_UNITS order
  let totalMtdVolume = 0;
  let totalMtdPassed = 0;
  let totalPrevMtdVolume = 0;
  let totalPrevMtdPassed = 0;
  let hasValidPrevMtd = false;

  let totalDailyVolume = 0;
  let totalDailyPassed = 0;
  let totalPrevDailyVolume = 0;
  let totalPrevDailyPassed = 0;
  let hasValidDaily = false;
  let hasValidPrevDaily = false;

  const rows = CANONICAL_BCVH_UNITS.map((unit, index) => {
    const code = unit.ma_bcvh;
    const mtdItem = rawMtd.find((item) => String(item?.ma_bcvh) === code);
    const dailyItem = anchorDate ? rawDaily.find((d) => d.date === anchorDate && String(d.ma_bcvh) === code) : null;
    const prevDailyItem = prevFactDate ? rawDaily.find((d) => d.date === prevFactDate && String(d.ma_bcvh) === code) : null;

    // MTD Metrics
    const mtdVolume = mtdItem?.volume !== undefined && mtdItem?.volume !== null ? Number(mtdItem.volume) : 0;
    const mtdPassed = mtdItem?.passed !== undefined && mtdItem?.passed !== null ? Number(mtdItem.passed) : 0;
    const mtdRate = mtdItem?.rate !== undefined && mtdItem?.rate !== null ? Number(mtdItem.rate) : calculateRate(mtdPassed, mtdVolume);

    const prevMtd = mtdItem?.previous_month_to_date;
    const prevMtdVolume = prevMtd?.volume !== undefined && prevMtd?.volume !== null ? Number(prevMtd.volume) : null;
    const prevMtdPassed = prevMtd?.passed !== undefined && prevMtd?.passed !== null ? Number(prevMtd.passed) : null;
    const prevMtdRate = prevMtd?.rate !== undefined && prevMtd?.rate !== null ? Number(prevMtd.rate) : calculateRate(prevMtdPassed, prevMtdVolume);

    const mtdDeltaRate = (mtdRate !== null && prevMtdRate !== null) ? (mtdRate - prevMtdRate) : null;

    // Accumulate total MTD
    totalMtdVolume += mtdVolume;
    totalMtdPassed += mtdPassed;
    if (prevMtdVolume !== null) {
      totalPrevMtdVolume += prevMtdVolume;
      totalPrevMtdPassed += Number(prevMtdPassed || 0);
      hasValidPrevMtd = true;
    }

    // Daily Metrics at anchorDate
    const dailyVolume = dailyItem?.volume !== undefined && dailyItem?.volume !== null ? Number(dailyItem.volume) : 0;
    const dailyPassed = dailyItem?.passed !== undefined && dailyItem?.passed !== null ? Number(dailyItem.passed) : 0;
    const dailyRate = dailyItem?.rate !== undefined && dailyItem?.rate !== null ? Number(dailyItem.rate) : calculateRate(dailyPassed, dailyVolume);

    if (dailyItem) {
      totalDailyVolume += dailyVolume;
      totalDailyPassed += dailyPassed;
      hasValidDaily = true;
    }

    // Daily Metrics at prevFactDate
    const prevDailyVolume = prevDailyItem?.volume !== undefined && prevDailyItem?.volume !== null ? Number(prevDailyItem.volume) : null;
    const prevDailyPassed = prevDailyItem?.passed !== undefined && prevDailyItem?.passed !== null ? Number(prevDailyItem.passed) : null;
    const prevDailyRate = prevDailyItem?.rate !== undefined && prevDailyItem?.rate !== null ? Number(prevDailyItem.rate) : calculateRate(prevDailyPassed, prevDailyVolume);

    const dailyDeltaRate = (dailyRate !== null && prevDailyRate !== null) ? (dailyRate - prevDailyRate) : null;

    if (prevDailyItem) {
      totalPrevDailyVolume += Number(prevDailyVolume || 0);
      totalPrevDailyPassed += Number(prevDailyPassed || 0);
      hasValidPrevDaily = true;
    }

    return {
      stt: index + 1,
      ma_bcvh: code,
      ten_bcvh: unit.ten_bcvh,
      mtd_volume: mtdVolume,
      mtd_rate: mtdRate,
      mtd_delta_rate: mtdDeltaRate,
      daily_volume: dailyVolume,
      daily_rate: dailyRate,
      daily_delta_rate: dailyDeltaRate,
    };
  });

  // Calculate Total Row strictly across the 6 canonical rows
  const totalMtdRate = totalMtdVolume > 0 ? calculateRate(totalMtdPassed, totalMtdVolume) : null;
  const totalPrevMtdRate = (hasValidPrevMtd && totalPrevMtdVolume > 0) ? calculateRate(totalPrevMtdPassed, totalPrevMtdVolume) : null;
  const totalMtdDeltaRate = (totalMtdRate !== null && totalPrevMtdRate !== null) ? (totalMtdRate - totalPrevMtdRate) : null;

  const totalDailyRate = (hasValidDaily && totalDailyVolume > 0) ? calculateRate(totalDailyPassed, totalDailyVolume) : null;
  const totalPrevDailyRate = (hasValidPrevDaily && totalPrevDailyVolume > 0) ? calculateRate(totalPrevDailyPassed, totalPrevDailyVolume) : null;
  const totalDailyDeltaRate = (totalDailyRate !== null && totalPrevDailyRate !== null) ? (totalDailyRate - totalPrevDailyRate) : null;

  const totalRow = {
    stt: DASH,
    ma_bcvh: DASH,
    ten_bcvh: 'TỔNG CỘNG',
    mtd_volume: totalMtdVolume,
    mtd_rate: totalMtdRate,
    mtd_delta_rate: totalMtdDeltaRate,
    daily_volume: hasValidDaily ? totalDailyVolume : 0,
    daily_rate: totalDailyRate,
    daily_delta_rate: totalDailyDeltaRate,
    is_total: true,
  };

  return {
    anchorDate,
    formattedAnchorDate,
    prevFactDate,
    formattedPrevFactDate,
    titleLine1: 'BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.3 TẠI CÁC BCVH',
    titleLine2: `ĐẾN NGÀY ${formattedAnchorDate} (SỐ LIỆU GẦN NHẤT)`,
    totalRow,
    rows,
    allRows: [totalRow, ...rows],
  };
}
