const formatCount = (value) => Number(value || 0).toLocaleString('vi-VN');
const formatRate = (value) => `${Number(value || 0).toFixed(2)}%`;
const hasValue = (source, key) => Object.prototype.hasOwnProperty.call(source, key) && source[key] !== null && source[key] !== undefined;
const getApiCount = (source, key) => (hasValue(source, key) ? Number(source[key]) : null);

function buildSummaryModel(kpiData = {}, context = {}) {
  const total = Number(kpiData.total_bg || 0);
  const passedRate = Number(kpiData.passed_rate || 0);
  const failedRate = kpiData.failed_rate === null || kpiData.failed_rate === undefined
    ? null
    : Number(kpiData.failed_rate);
  const failedCount = getApiCount(kpiData, 'total_failed');
  const unknown = Number(kpiData.total_unknown || 0);
  const rank = kpiData.national_rank;
  const scope = context.bcvhLabel && !/^(Toàn|Tất cả)/i.test(context.bcvhLabel)
    ? context.bcvhLabel
    : 'Toàn phạm vi';
  const range = context.fromDate && context.toDate
    ? (context.fromDate === context.toDate ? context.toDate : `${context.fromDate} đến ${context.toDate}`)
    : 'kỳ đã chọn';

  return {
    total,
    passedRate,
    failedRate,
    failedCount,
    unknown,
    rank,
    scope,
    range,
  };
}

export function buildExecutiveInsight(kpiData = {}, context = {}) {
  const model = buildSummaryModel(kpiData, context);

  if (!model.total) {
    return `Chưa có dữ liệu điều hành cho ${model.scope} trong ${model.range}.`;
  }

  const rankText = model.rank?.available
    ? ` Xếp hạng toàn quốc ${model.rank.rank}/${model.rank.total}; kỳ đang chọn ${model.range}, dữ liệu toàn quốc gần nhất ${model.rank.period}.`
    : ' Chưa có dữ liệu xếp hạng toàn quốc.';
  const unknownText = model.unknown > 0 ? ` Có ${formatCount(model.unknown)} bưu gửi thiếu dữ liệu phân loại.` : '';
  const failedText = model.failedCount === null ? 'chưa xác định số bưu gửi cần xử lý' : `có ${formatCount(model.failedCount)} bưu gửi cần xử lý`;

  return `${model.scope} đang chọn đạt tỷ lệ ${formatRate(model.passedRate)} trên ${formatCount(model.total)} bưu gửi; ${failedText}.${rankText}${unknownText}`;
}

export function buildUnifiedCommandCards(kpiData = {}, context = {}) {
  const model = buildSummaryModel(kpiData, context);

  return [
    {
      key: 'pass-rate',
      question: 'Chất lượng',
      label: 'Tỷ lệ đạt',
      value: model.passedRate === null ? '--' : formatRate(model.passedRate),
      support: model.total ? `Trên ${formatCount(model.total)} bưu gửi` : 'Không có dữ liệu',
      tone: 'success',
    },
    {
      key: 'national-rank',
      question: 'Vị thế toàn quốc',
      label: 'Xếp hạng toàn quốc',
      value: model.rank?.available ? `${model.rank.rank}/${model.rank.total}` : '--',
      support: model.rank?.available
        ? `Kỳ đang chọn: ${model.range}; dữ liệu toàn quốc gần nhất: ${model.rank.period}`
        : 'Chưa có dữ liệu xếp hạng toàn quốc',
      tone: 'comparison',
    },
    {
      key: 'volume',
      question: 'Quy mô',
      label: 'Sản lượng',
      value: model.total ? formatCount(model.total) : '--',
      support: model.unknown > 0 ? `${formatCount(model.unknown)} bưu gửi thiếu dữ liệu phân loại` : 'Tổng bưu gửi trong kỳ',
      tone: 'volume',
    },
    {
      key: 'action-volume',
      question: 'Cần xử lý',
      label: 'Bưu gửi cần xử lý',
      value: model.total && model.failedCount !== null ? formatCount(model.failedCount) : '--',
      support: model.failedRate === null ? 'Tỷ lệ không đạt: chưa xác định' : `Tỷ lệ không đạt: ${formatRate(model.failedRate)}`,
      tone: 'danger',
    },
  ];
}

export function mapDashboardKpiToCards(kpiData = {}) {
  return buildUnifiedCommandCards(kpiData);
}
