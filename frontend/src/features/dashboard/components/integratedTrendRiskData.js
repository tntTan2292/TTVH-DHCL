import { buildSamePeriodComparisonRows } from './samePeriodComparisonData.js';
import { QUALITY_TARGET_RATE } from './comboTrendlineData.js';
import { shiftIsoDate } from './qualityTrendlineWindow.js';

export const TREND_MODES = [
  { id: '30-days', label: '30 ngày' },
  { id: '7-days', label: '7 ngày so sánh' },
  { id: 'by-bcvh', label: 'Theo BCVH' },
];

export function getFailedRate(point) {
  if (!point?.data_available || !Number(point.total_volume)) return null;
  return Number(((Number(point.failed || 0) / Number(point.total_volume)) * 100).toFixed(2));
}

export function withTrendSemantics(point = {}) {
  const failedRate = getFailedRate(point);
  const qualityRate = point.quality_rate === null || point.quality_rate === undefined
    ? null
    : Number(point.quality_rate);

  return {
    ...point,
    failed_rate: failedRate,
    target_rate: QUALITY_TARGET_RATE,
    below_target: Boolean(point.data_available && qualityRate !== null && qualityRate < QUALITY_TARGET_RATE),
    abnormal_day: false,
  };
}

export function buildThirtyDayTrendRows(items = []) {
  return items.map(withTrendSemantics);
}

export function buildSevenDayComparisonRows(items = [], toDate) {
  return buildSamePeriodComparisonRows(items, toDate).map((row) => {
    const current = row.current_point ? withTrendSemantics(row.current_point) : null;
    const previous = row.previous_point ? withTrendSemantics(row.previous_point) : null;

    return {
      ...row,
      total_volume: row.current_volume,
      quality_rate: row.current_quality,
      failed_rate: current?.failed_rate ?? null,
      target_rate: QUALITY_TARGET_RATE,
      previous_quality_rate: row.previous_quality,
      previous_total_volume: row.previous_volume,
      below_target: Boolean(current?.below_target),
      abnormal_day: Boolean(current?.abnormal_day),
      current_point: current,
      previous_point: previous,
    };
  });
}

export function buildBcvhModeRows(items = []) {
  return items
    .filter((item) => item?.data_available)
    .slice(-7)
    .map((item) => ({
      ...withTrendSemantics(item),
      date_label: item.date?.slice(5) || item.date,
    }));
}

function isWithinSelectedRange(item, fromDate, toDate) {
  if (!item?.date || !item.data_available) return false;
  if (fromDate && item.date < fromDate) return false;
  if (toDate && item.date > toDate) return false;
  return true;
}

function getDelta(currentValue, previousValue) {
  if (currentValue === null || currentValue === undefined || previousValue === null || previousValue === undefined) {
    return null;
  }

  return Number((Number(currentValue) - Number(previousValue)).toFixed(2));
}

export function buildDayOverDayComparison({ items = [], fromDate, toDate } = {}) {
  const availableRows = buildThirtyDayTrendRows(items)
    .filter((item) => isWithinSelectedRange(item, fromDate, toDate))
    .sort((a, b) => a.date.localeCompare(b.date));
  const current = availableRows.at(-1) || null;

  if (!current?.date) {
    return null;
  }

  const previousDate = shiftIsoDate(current.date, -1);
  const previous = buildThirtyDayTrendRows(items).find((item) => item?.date === previousDate && item.data_available) || null;

  if (!previous) {
    return {
      available: false,
      current_date: current.date,
      previous_date: previousDate,
    };
  }

  return {
    available: true,
    current_date: current.date,
    previous_date: previous.date,
    total_volume: {
      current: current.total_volume,
      previous: previous.total_volume,
      delta: getDelta(current.total_volume, previous.total_volume),
    },
    pass_rate: {
      current: current.quality_rate,
      previous: previous.quality_rate,
      delta: getDelta(current.quality_rate, previous.quality_rate),
    },
    failed_count: {
      current: current.failed,
      previous: previous.failed,
      delta: getDelta(current.failed, previous.failed),
    },
  };
}

export function buildIntegratedTrendRows({ mode, items = [], toDate } = {}) {
  if (mode === '7-days') return buildSevenDayComparisonRows(items, toDate);
  if (mode === 'by-bcvh') return buildBcvhModeRows(items);
  return buildThirtyDayTrendRows(items);
}

export function summarizeRiskEvidence(items = [], kpiData = null, pulse = null) {
  const rows = buildThirtyDayTrendRows(items);
  const availableRows = rows.filter((item) => item.data_available);
  const belowTargetRows = availableRows.filter((item) => item.below_target);
  const latest = [...availableRows].reverse()[0] || null;
  const failedTotal = kpiData?.total_failed;
  const failedRate = kpiData?.failed_rate;

  const risks = [];

  if (failedTotal !== null && failedTotal !== undefined && Number(failedTotal) > 0) {
    risks.push({
      id: 'current-failed-volume',
      severity: 'Cần xử lý',
      tone: 'warning',
      title: 'Bưu gửi cần xử lý trong kỳ đang chọn',
      unit: 'Phạm vi đang chọn',
      evidence: `${Number(failedTotal).toLocaleString('vi-VN')} bưu gửi không đạt${failedRate !== null && failedRate !== undefined ? `, tỷ lệ ${Number(failedRate).toFixed(2)}%` : ''}.`,
      note: 'Nguyên nhân chưa xác định từ dữ liệu hiện có.',
    });
  }

  if (belowTargetRows.length > 0) {
    risks.push({
      id: 'below-target-days',
      severity: 'Cần chú ý',
      tone: 'warning',
      title: 'Ngày dưới mức mục tiêu',
      unit: 'Chuỗi xu hướng 30 ngày',
      evidence: `${belowTargetRows.length} ngày dưới mục tiêu ${QUALITY_TARGET_RATE}%; gần nhất ${belowTargetRows.at(-1)?.date}.`,
      note: 'Chờ xác nhận nguyên nhân vận hành.',
    });
  }

  if (pulse?.text) {
    risks.push({
      id: 'quality-pulse',
      severity: pulse.color === 'red' ? 'Rủi ro cao' : pulse.color === 'yellow' ? 'Cảnh báo' : 'Thông tin',
      tone: pulse.color === 'red' ? 'danger' : pulse.color === 'yellow' ? 'warning' : 'info',
      title: 'Nhịp chất lượng',
      unit: 'Quan sát hệ thống',
      evidence: pulse.text,
      note: 'Không suy diễn nguyên nhân ngoài nội dung đã có.',
    });
  }

  if (!risks.length && latest) {
    risks.push({
      id: 'no-major-risk',
      severity: 'Thông tin',
      tone: 'info',
      title: 'Chưa ghi nhận ngoại lệ chính',
      unit: 'Phạm vi đang chọn',
      evidence: `Ngày gần nhất ${latest.date} đạt ${Number(latest.quality_rate).toFixed(2)}%.`,
      note: 'Tiếp tục theo dõi theo kỳ dữ liệu kế tiếp.',
    });
  }

  return risks.slice(0, 4);
}
