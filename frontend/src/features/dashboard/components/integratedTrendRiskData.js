import { buildSamePeriodComparisonRows } from './samePeriodComparisonData.js';
import { QUALITY_TARGET_RATE } from './comboTrendlineData.js';

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
    abnormal_day: Boolean(point.data_available && failedRate !== null && failedRate >= 25),
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

export function buildIntegratedTrendRows({ mode, items = [], toDate } = {}) {
  if (mode === '7-days') return buildSevenDayComparisonRows(items, toDate);
  if (mode === 'by-bcvh') return buildBcvhModeRows(items);
  return buildThirtyDayTrendRows(items);
}

export function summarizeRiskEvidence(items = [], kpiData = null, pulse = null) {
  const rows = buildThirtyDayTrendRows(items);
  const availableRows = rows.filter((item) => item.data_available);
  const belowTargetRows = availableRows.filter((item) => item.below_target);
  const abnormalRows = availableRows.filter((item) => item.abnormal_day);
  const latest = [...availableRows].reverse()[0] || null;
  const failedTotal = kpiData?.total_failed;
  const failedRate = kpiData?.failed_rate;

  const risks = [];

  if (failedTotal !== null && failedTotal !== undefined && Number(failedTotal) > 0) {
    risks.push({
      id: 'current-failed-volume',
      severity: Number(failedRate || 0) >= 25 ? 'Rủi ro cao' : 'Cần chú ý',
      tone: Number(failedRate || 0) >= 25 ? 'danger' : 'warning',
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

  if (abnormalRows.length > 0) {
    risks.push({
      id: 'abnormal-failed-rate',
      severity: 'Rủi ro cao',
      tone: 'danger',
      title: 'Ngày có tỷ lệ không đạt cao',
      unit: 'Chuỗi xu hướng 30 ngày',
      evidence: `${abnormalRows.length} ngày có tỷ lệ không đạt từ 25%; gần nhất ${abnormalRows.at(-1)?.date}.`,
      note: 'Dữ liệu chỉ xác nhận hiện tượng, chưa xác nhận nguyên nhân.',
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
