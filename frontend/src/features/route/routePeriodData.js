export const DASH = '—';

export function formatPeriodRate(rate) {
  if (rate === null || rate === undefined) return DASH;
  return `${Number(rate).toFixed(1)}%`;
}

export function formatPeriodDelta(delta) {
  if (delta === null || delta === undefined) return DASH;
  const num = Number(delta);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)} đ%`;
}

export function formatPeriodVolume(volume) {
  if (volume === null || volume === undefined) return '0';
  return Number(volume).toLocaleString('vi-VN');
}

export function processRoutePeriods(data) {
  if (!data || !data.routes) return { routes: [], periods: {}, reconciliation: {}, anchorDate: null, bcvh: null };

  const routes = data.routes.map(r => {
    return {
      ...r,
      // mapping standard names to avoid using the banned word MTD
      day_rate: r.day?.rate ?? null,
      month_rate: r.month?.rate ?? null,
      previous_month_rate: r.previous_month?.rate ?? null,
      delta: r.delta ?? null,
      rank: r.rank ?? null,
      rank_delta: r.rank_delta ?? null,
      month_volume: r.month?.volume ?? 0,
      month_days_with_data: r.month?.days_with_data ?? 0,
      month_days_in_period: r.month?.days_in_period ?? 0,
    };
  });

  return {
    routes,
    periods: data.periods || {},
    reconciliation: data.reconciliation || {},
    anchorDate: data.anchor_date || null,
    bcvh: data.bcvh || null
  };
}
