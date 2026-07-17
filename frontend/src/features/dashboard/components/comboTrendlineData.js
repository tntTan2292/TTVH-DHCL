export const QUALITY_TARGET_RATE = 90;

export function normalizeComboTrendlineItems(items = []) {
  return items
    .map((item) => {
      const dataAvailable = Boolean(item.data_available);
      const qualityRate = item.quality_rate === null || item.quality_rate === undefined
        ? null
        : Number(item.quality_rate);

      return {
        date: item.date,
        data_available: dataAvailable,
        total_volume: dataAvailable ? Number(item.total_volume || 0) : null,
        passed: dataAvailable ? Number(item.passed || 0) : null,
        failed: dataAvailable ? Number(item.failed || 0) : null,
        quality_rate: dataAvailable ? qualityRate : null,
        target_rate: QUALITY_TARGET_RATE,
        target_variance: dataAvailable && qualityRate !== null
          ? Number((qualityRate - QUALITY_TARGET_RATE).toFixed(4))
          : null,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function formatNumber(value) {
  return value === null || value === undefined ? 'N/A' : Number(value).toLocaleString('vi-VN');
}

export function formatRate(value) {
  return value === null || value === undefined ? 'N/A' : `${Number(value).toFixed(4)}%`;
}

export function formatVariance(value) {
  if (value === null || value === undefined) return 'N/A';
  const sign = Number(value) > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(4)} pp`;
}
