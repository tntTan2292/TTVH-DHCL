import { QUALITY_TARGET_RATE } from './comboTrendlineData.js';

export const OPERATING_PATTERN_TABS = [
  { id: 'month', label: 'Theo tháng' },
  { id: 'weekday', label: 'Theo thứ' },
  { id: 'heatmap', label: 'Heatmap' },
];

export const DEFAULT_OPERATING_PATTERN_TAB = 'month';

export const APPROVED_WEEKDAY_BANDS = [
  { id: 'green', label: 'Xanh', description: 'KPI từ 70% trở lên', min: 70, max: 100, tone: 'band-green' },
  { id: 'pink', label: 'Hồng', description: 'KPI từ 60% đến dưới 70%', min: 60, max: 70, tone: 'band-pink' },
  { id: 'yellow', label: 'Vàng', description: 'KPI từ 50% đến dưới 60%', min: 50, max: 60, tone: 'band-yellow' },
  { id: 'red', label: 'Đỏ', description: 'KPI dưới 50%', min: 0, max: 50, tone: 'band-red' },
];

export const HEATMAP_RELATIVE_BANDS = [
  { id: 'significantly-above', label: 'Cao hơn trung bình tháng rõ rệt', minDelta: 5, tone: 'relative-high' },
  { id: 'above', label: 'Cao hơn trung bình tháng', minDelta: 1, tone: 'relative-above' },
  { id: 'near-average', label: 'Xấp xỉ trung bình tháng', minDelta: -1, tone: 'relative-average' },
  { id: 'below', label: 'Thấp hơn trung bình tháng', minDelta: -5, tone: 'relative-below' },
  { id: 'significantly-below', label: 'Thấp hơn trung bình tháng rõ rệt', minDelta: -Infinity, tone: 'relative-low' },
];

export function formatPatternRate(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'Chưa có dữ liệu';
  }
  return `${Number(value).toFixed(2)}%`;
}

function normalizeRate(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Number(value);
}

function getTargetTone(rate) {
  if (rate === null || rate === undefined) return 'unavailable';
  if (rate >= QUALITY_TARGET_RATE) return 'on-target';
  return 'below-target';
}

export function getApprovedWeekdayBand(rate, backendColor = null) {
  if (rate === null || rate === undefined) return {
    id: 'unavailable',
    label: 'Chưa có dữ liệu',
    tone: 'unavailable',
  };

  const colorBand = APPROVED_WEEKDAY_BANDS.find((band) => band.id === backendColor);
  if (colorBand) return colorBand;

  return APPROVED_WEEKDAY_BANDS.find((band) => rate >= band.min && rate < band.max)
    || APPROVED_WEEKDAY_BANDS[0];
}

function getMonthKey(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : null;
}

export function formatDisplayDate(isoDate) {
  if (typeof isoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return 'Chưa có dữ liệu';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function formatShortDate(isoDate) {
  if (typeof isoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '--';
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

export function getHeatmapRelativeBand(delta) {
  if (delta === null || delta === undefined) return {
    id: 'unavailable',
    label: 'Chưa có dữ liệu',
    tone: 'unavailable',
  };

  return HEATMAP_RELATIVE_BANDS.find((band) => delta >= band.minDelta) || HEATMAP_RELATIVE_BANDS.at(-1);
}

function getHeatmapCells(heatmap = []) {
  return heatmap
    .flatMap((week) => Array.isArray(week) ? week : [])
    .filter((day) => day && normalizeRate(day.kpi_rate) !== null);
}

export function buildHeatmapMonthStats(heatmap = [], preferredMonth = null) {
  const cells = getHeatmapCells(heatmap);
  if (!cells.length) return null;

  const monthGroups = cells.reduce((acc, day) => {
    const monthKey = getMonthKey(day.date);
    if (!monthKey) return acc;
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(day);
    return acc;
  }, {});

  const selectedMonth = preferredMonth && monthGroups[preferredMonth]
    ? preferredMonth
    : Object.keys(monthGroups).sort().at(-1);
  const monthCells = monthGroups[selectedMonth] || [];
  if (!monthCells.length) return null;

  const rates = monthCells.map((day) => normalizeRate(day.kpi_rate)).filter((rate) => rate !== null);
  const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  const enriched = monthCells.map((day) => {
    const rate = normalizeRate(day.kpi_rate);
    return {
      date: day.date,
      rate,
      deltaFromMonthAverage: Number((rate - average).toFixed(2)),
    };
  });

  const best = enriched.reduce((result, day) => day.rate > result.rate ? day : result, enriched[0]);
  const worst = enriched.reduce((result, day) => day.rate < result.rate ? day : result, enriched[0]);

  return {
    month: selectedMonth,
    average: Number(average.toFixed(2)),
    best,
    worst,
    aboveAverageCount: enriched.filter((day) => day.rate > average).length,
    belowAverageCount: enriched.filter((day) => day.rate < average).length,
    dayCount: enriched.length,
  };
}

export function mapWeeklyPattern(weekly = []) {
  return weekly.map((item) => {
    const rate = normalizeRate(item?.pass_rate ?? item?.avg_kpi);
    const totalVolume = Number(item?.total_volume || 0);
    const approvedBand = getApprovedWeekdayBand(rate, item?.color);
    return {
      id: item?.day || 'unknown-day',
      label: item?.day || 'Chưa xác định',
      rate,
      valueLabel: formatPatternRate(rate),
      totalVolume,
      volumeLabel: totalVolume.toLocaleString('vi-VN'),
      targetTone: approvedBand.tone,
      bandLabel: approvedBand.label,
      available: totalVolume > 0 && rate !== null,
      sourceLabel: 'KPI trung bình theo thứ',
    };
  });
}

export function mapMonthlyPattern(monthly = []) {
  return monthly.map((item, index) => {
    const rate = normalizeRate(item?.pass_rate);
    const totalVolume = Number(item?.total_volume || 0);
    return {
      id: item?.month || `month-${index + 1}`,
      month: item?.month || null,
      label: item?.label || `T${index + 1}`,
      rate,
      valueLabel: formatPatternRate(rate),
      totalVolume,
      volumeLabel: totalVolume.toLocaleString('vi-VN'),
      fromDate: item?.from_date || null,
      toDate: item?.to_date || null,
      isCurrentMonth: Boolean(item?.is_current_month),
      cumulativeLabel: item?.is_current_month && item?.to_date
        ? `Lũy kế đến ngày ${formatDisplayDate(item.to_date)}`
        : null,
      targetTone: getTargetTone(rate),
      available: totalVolume > 0 && rate !== null,
      sourceLabel: 'Sản lượng và tỷ lệ đạt theo tháng',
    };
  });
}

export function buildMonthlyManagementSummary(monthRows = []) {
  const availableRows = monthRows.filter((row) => row.available);
  if (!availableRows.length) return null;
  const highestVolumeMonth = availableRows.reduce((result, row) => row.totalVolume > result.totalVolume ? row : result, availableRows[0]);
  const lowestVolumeMonth = availableRows.reduce((result, row) => row.totalVolume < result.totalVolume ? row : result, availableRows[0]);
  const bestPassRateMonth = availableRows.reduce((result, row) => row.rate > result.rate ? row : result, availableRows[0]);
  const lowestPassRateMonth = availableRows.reduce((result, row) => row.rate < result.rate ? row : result, availableRows[0]);
  const currentMonth = [...availableRows].reverse().find((row) => row.isCurrentMonth) || availableRows.at(-1);

  return {
    highestVolumeMonth,
    lowestVolumeMonth,
    bestPassRateMonth,
    lowestPassRateMonth,
    currentMonth,
  };
}

export function mapHeatmapPattern(heatmap = [], preferredMonth = null) {
  const monthStats = buildHeatmapMonthStats(heatmap, preferredMonth);

  return heatmap.map((week, weekIndex) => ({
    id: `week-${weekIndex + 1}`,
    days: Array.isArray(week)
      ? week.map((day, dayIndex) => {
        if (!day) {
          return {
            id: `week-${weekIndex + 1}-empty-${dayIndex + 1}`,
            empty: true,
          };
        }

        const rate = normalizeRate(day.kpi_rate);
        const dod = normalizeRate(day.dod);
        const monthAverage = monthStats?.average ?? null;
        const deltaFromMonthAverage = rate !== null && monthAverage !== null
          ? Number((rate - monthAverage).toFixed(2))
          : null;
        const relativeBand = getHeatmapRelativeBand(deltaFromMonthAverage);
        return {
          id: day.date || `week-${weekIndex + 1}-day-${dayIndex + 1}`,
          date: day.date || null,
          dayLabel: formatShortDate(day.date),
          rate,
          valueLabel: formatPatternRate(rate),
          dod,
          monthAverage,
          deltaFromMonthAverage,
          targetTone: relativeBand.tone,
          bandLabel: relativeBand.label,
          available: rate !== null,
          sourceLabel: 'KPI ngày đo kiểm',
        };
      })
      : [],
  }));
}

export function groupHeatmapByMonth(heatmapWeeks = []) {
  const cells = heatmapWeeks
    .flatMap((week) => week.days || [])
    .filter((day) => !day.empty && day.date);
  const grouped = cells.reduce((acc, day) => {
    const monthKey = getMonthKey(day.date);
    if (!monthKey) return acc;
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(day);
    return acc;
  }, {});

  return Object.keys(grouped).sort().map((monthKey) => {
    const days = grouped[monthKey].sort((a, b) => a.date.localeCompare(b.date));
    const stats = buildHeatmapMonthStats(days.map((day) => [{ date: day.date, kpi_rate: day.rate }]), monthKey);
    return {
      month: monthKey,
      label: `Tháng ${monthKey.slice(5, 7)}/${monthKey.slice(0, 4)}`,
      rangeLabel: `Từ ${formatDisplayDate(days[0]?.date)} đến ${formatDisplayDate(days.at(-1)?.date)}`,
      days,
      stats,
    };
  });
}

export function mapOperatingPatternResponse(data = {}, context = {}) {
  const weekly = mapWeeklyPattern(data.weekly || []);
  const monthly = mapMonthlyPattern(data.monthly_ytd || []);
  const preferredMonth = getMonthKey(context.toDate);
  const heatmapMonthStats = buildHeatmapMonthStats(data.heatmap || [], preferredMonth);
  const heatmap = mapHeatmapPattern(data.heatmap || [], preferredMonth);
  const heatmapMonths = groupHeatmapByMonth(heatmap);
  const monthlySummary = buildMonthlyManagementSummary(monthly);
  const pulse = data.pulse || null;

  return {
    weekday: weekly,
    month: monthly,
    monthlySummary,
    heatmap,
    heatmapMonths,
    heatmapMonthStats,
    pulse,
    hasAnyData: hasUsableModeData('weekday', weekly)
      || hasUsableModeData('month', monthly)
      || hasUsableModeData('heatmap', heatmap),
  };
}

export function hasUsableModeData(mode, rows = []) {
  if (mode === 'heatmap') {
    return rows.some((week) => week.days?.some((day) => !day.empty && day.available));
  }
  return rows.some((row) => row.available);
}

export function buildGroundedOperatingPatternSummary({ activeTab, model, fromDate, toDate, maBcvh } = {}) {
  if (!model) return 'Chưa có dữ liệu để tổng hợp quy luật vận hành.';
  const context = maBcvh && maBcvh !== 'all' ? `BCVH ${maBcvh}` : 'toàn mạng';
  const range = fromDate && toDate ? `${fromDate} đến ${toDate}` : toDate || 'kỳ đang chọn';

  if (activeTab === 'heatmap') {
    const cells = model.heatmap.flatMap((week) => week.days || []).filter((day) => !day.empty && day.available);
    if (!cells.length) return `Heatmap chưa có dữ liệu khả dụng cho ${context}, bối cảnh ${range}.`;
    const stats = model.heatmapMonthStats;
    if (!stats) return `Heatmap có ${cells.length} ngày có dữ liệu cho ${context}, bối cảnh ${range}.`;
    return `KPI trung bình tháng ${stats.month} là ${formatPatternRate(stats.average)}; ${stats.aboveAverageCount} ngày cao hơn trung bình và ${stats.belowAverageCount} ngày thấp hơn trung bình cho ${context}.`;
  }

  const rows = activeTab === 'month' ? model.month : model.weekday;
  const availableRows = rows.filter((row) => row.available);
  const label = activeTab === 'month' ? 'tháng' : 'thứ trong tuần';
  if (!availableRows.length) return `Chưa có dữ liệu quy luật theo ${label} cho ${context}, bối cảnh ${range}.`;

  if (activeTab === 'month' && model.monthlySummary) {
    const current = model.monthlySummary.currentMonth;
    return `Tháng hiện tại ${current.label}: sản lượng ${current.volumeLabel}, tỷ lệ đạt ${current.valueLabel}${current.cumulativeLabel ? ` (${current.cumulativeLabel})` : ''}.`;
  }

  const belowTarget = availableRows.filter((row) => row.rate !== null && row.rate < QUALITY_TARGET_RATE);
  return `Có ${availableRows.length} ${label} có dữ liệu; ${belowTarget.length} mục dưới mục tiêu ${QUALITY_TARGET_RATE}% cho ${context}.`;
}
