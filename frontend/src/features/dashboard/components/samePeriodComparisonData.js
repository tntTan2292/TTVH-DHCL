import { buildDailyTrendLookup } from './comboTrendlineData.js';

export function shiftIsoDate(dateStr, deltaDays) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

export function getDayLabel(dateStr) {
  const dayIndex = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dayIndex];
}

export function buildSamePeriodComparisonRows(items = [], toDate) {
  if (!toDate) return [];

  const lookup = buildDailyTrendLookup(items);
  const currentDates = Array.from({ length: 7 }, (_, index) => shiftIsoDate(toDate, index - 6));
  const previousDates = currentDates.map((date) => shiftIsoDate(date, -7));

  return currentDates.map((currentDate, index) => {
    const previousDate = previousDates[index];
    const currentPoint = lookup[currentDate] || null;
    const previousPoint = lookup[previousDate] || null;

    return {
      position: index + 1,
      dayLabel: getDayLabel(currentDate),
      current_date: currentDate,
      previous_date: previousDate,
      current_volume: currentPoint?.data_available ? currentPoint.total_volume : null,
      previous_volume: previousPoint?.data_available ? previousPoint.total_volume : null,
      current_quality: currentPoint?.data_available ? currentPoint.quality_rate : null,
      previous_quality: previousPoint?.data_available ? previousPoint.quality_rate : null,
      current_data_available: Boolean(currentPoint?.data_available),
      previous_data_available: Boolean(previousPoint?.data_available),
      current_point: currentPoint,
      previous_point: previousPoint,
      current_volume_delta:
        currentPoint?.data_available && previousPoint?.data_available
          ? currentPoint.total_volume - previousPoint.total_volume
          : null,
      current_quality_delta:
        currentPoint?.data_available && previousPoint?.data_available
          ? Number((currentPoint.quality_rate - previousPoint.quality_rate).toFixed(2))
          : null,
    };
  });
}

export function formatComparisonValue(value) {
  return value === null || value === undefined ? 'Không có dữ liệu' : Number(value).toLocaleString('vi-VN');
}

export function formatComparisonRate(value) {
  return value === null || value === undefined ? 'Không có dữ liệu' : `${Number(value).toFixed(2)}%`;
}

export function formatComparisonDelta(value, unit = '') {
  if (value === null || value === undefined) return 'Không có dữ liệu';
  const sign = Number(value) > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(2)}${unit}`;
}
