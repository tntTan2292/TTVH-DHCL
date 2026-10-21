// Helper functions for 7-day rolling window comparison cumulative panel
// (Ticket UI-TREND-7DAY-CUM-01)

export function formatCumulativeRate(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return `${Number(value).toFixed(2)}%`;
}

export function formatVolume(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return Number(value).toLocaleString('vi-VN');
}

export function formatNationalRank(rankObj) {
  if (
    !rankObj ||
    rankObj.rank === null ||
    rankObj.rank === undefined ||
    rankObj.total === null ||
    rankObj.total === undefined
  ) {
    return '—';
  }
  return `${rankObj.rank}/${rankObj.total}`;
}

export function formatRateDelta(delta) {
  if (delta === null || delta === undefined || Number.isNaN(Number(delta))) {
    return { text: '—', tone: 'neutral', value: null };
  }
  const num = Number(delta);
  const sign = num > 0 ? '+' : '';
  const text = `${sign}${num.toFixed(2)}%`;
  const tone = num > 0 ? 'success' : num < 0 ? 'danger' : 'neutral';
  return { text, tone, value: num };
}

export function formatVolumeDelta(delta) {
  if (delta === null || delta === undefined || Number.isNaN(Number(delta))) {
    return { text: '—', tone: 'neutral', value: null };
  }
  const num = Number(delta);
  const sign = num > 0 ? '+' : '';
  const text = `${sign}${num.toLocaleString('vi-VN')}`;
  const tone = num > 0 ? 'info' : 'neutral';
  return { text, tone, value: num };
}

export function formatRankDelta(currentRankObj, compareRankObj) {
  if (
    !currentRankObj ||
    currentRankObj.rank === null ||
    currentRankObj.rank === undefined ||
    !compareRankObj ||
    compareRankObj.rank === null ||
    compareRankObj.rank === undefined
  ) {
    return { text: '—', tone: 'neutral', movement: null };
  }

  // Lower number is a better rank.
  // Example: compare was 24, current is 19 -> movement is +5 ranks (improved).
  const movement = Number(compareRankObj.rank) - Number(currentRankObj.rank);
  if (movement > 0) {
    return { text: `↑ ${movement} hạng`, tone: 'success', movement };
  }
  if (movement < 0) {
    return { text: `↓ ${Math.abs(movement)} hạng`, tone: 'danger', movement };
  }
  return { text: 'Giữ hạng', tone: 'neutral', movement: 0 };
}

function toDayMonth(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

export function formatDateRange(range) {
  if (!range || !range.from || !range.to) return '';
  const fromFormatted = toDayMonth(range.from);
  const toFormatted = toDayMonth(range.to);
  if (!fromFormatted || !toFormatted) return '';
  return `${fromFormatted}–${toFormatted}`;
}

export function buildSevenDayWindowComparisonModel(data) {
  const currentRangeStr = formatDateRange(data?.current_range);
  const compareRangeStr = formatDateRange(data?.compare_range);

  const currentSummary = data?.summary?.current;
  const compareSummary = data?.summary?.compare;

  const currentRank = data?.national_rank?.current;
  const compareRank = data?.national_rank?.compare;

  return {
    available: Boolean(currentSummary),
    currentRange: currentRangeStr,
    compareRange: compareRangeStr,
    currentRangeLabel: currentRangeStr ? `Giai đoạn này (${currentRangeStr})` : 'Giai đoạn này',
    compareRangeLabel: compareRangeStr ? `Giai đoạn so sánh (${compareRangeStr})` : 'Giai đoạn so sánh',
    current: {
      rate: formatCumulativeRate(currentSummary?.rate),
      volume: formatVolume(currentSummary?.volume),
      rank: formatNationalRank(currentRank),
      rawRate: currentSummary?.rate ?? null,
    },
    compare: {
      rate: formatCumulativeRate(compareSummary?.rate),
      volume: formatVolume(compareSummary?.volume),
      rank: formatNationalRank(compareRank),
      rawRate: compareSummary?.rate ?? null,
    },
    delta: {
      rate: formatRateDelta(data?.summary?.rate_delta),
      volume: formatVolumeDelta(data?.summary?.volume_delta),
      rank: formatRankDelta(currentRank, compareRank),
    },
  };
}
