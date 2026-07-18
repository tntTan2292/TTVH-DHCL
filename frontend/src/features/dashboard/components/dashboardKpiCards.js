const formatCount = (value) => Number(value || 0).toLocaleString('vi-VN');
const formatRate = (value) => `${Number(value || 0).toFixed(2)}%`;
const hasValue = (source, key) => Object.prototype.hasOwnProperty.call(source, key) && source[key] !== null && source[key] !== undefined;
const getApiCount = (source, key) => (hasValue(source, key) ? Number(source[key]) : null);

export function buildMeasurementComposition(kpiData = {}) {
  const total = getApiCount(kpiData, 'total_bg') ?? 0;
  const passed = getApiCount(kpiData, 'total_passed') ?? 0;
  const failed = getApiCount(kpiData, 'total_failed') ?? 0;
  const returned = getApiCount(kpiData, 'total_returned') ?? getApiCount(kpiData, 'total_unknown') ?? 0;
  const sampleTotal = getApiCount(kpiData, 'total_measurement_sample') ?? total;
  const calculatedTotal = passed + failed + returned;

  return {
    total_measurement_sample: sampleTotal,
    passed,
    failed,
    returned,
    matches: calculatedTotal === sampleTotal,
    calculated_total: calculatedTotal,
  };
}

function buildSummaryModel(kpiData = {}, context = {}) {
  const total = Number(kpiData.total_bg || 0);
  const passedRate = Number(kpiData.passed_rate || 0);
  const failedRate = kpiData.failed_rate === null || kpiData.failed_rate === undefined
    ? null
    : Number(kpiData.failed_rate);
  const failedCount = getApiCount(kpiData, 'total_failed');
  const composition = buildMeasurementComposition(kpiData);
  const returned = composition.returned;
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
    returned,
    composition,
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
  const returnedText = model.returned > 0 ? ` Có ${formatCount(model.returned)} bưu gửi chuyển hoàn.` : '';
  const mismatchText = model.composition.matches ? '' : ` Cần kiểm tra hợp đồng dữ liệu: Đạt + Không đạt + Chuyển hoàn = ${formatCount(model.composition.calculated_total)}, khác tổng mẫu đo kiểm ${formatCount(model.composition.total_measurement_sample)}.`;
  const failedText = model.failedCount === null ? 'chưa xác định số bưu gửi cần xử lý' : `có ${formatCount(model.failedCount)} bưu gửi cần xử lý`;

  return `${model.scope} đang chọn đạt tỷ lệ ${formatRate(model.passedRate)} trên ${formatCount(model.total)} bưu gửi; ${failedText}.${rankText}${returnedText}${mismatchText}`;
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
      support: model.returned > 0 ? `${formatCount(model.returned)} bưu gửi chuyển hoàn` : 'Tổng mẫu đo kiểm trong kỳ',
      tone: 'volume',
    },
    {
      key: 'action-volume',
      question: 'Cần xử lý',
      label: 'Bưu gửi cần xử lý',
      value: model.total && model.failedCount !== null ? formatCount(model.failedCount) : '--',
      support: model.returned > 0 ? `Kèm ${formatCount(model.returned)} chuyển hoàn` : 'Số bưu gửi không đạt cần xử lý',
      tone: 'danger',
    },
  ];
}

export function mapDashboardKpiToCards(kpiData = {}) {
  return buildUnifiedCommandCards(kpiData);
}
