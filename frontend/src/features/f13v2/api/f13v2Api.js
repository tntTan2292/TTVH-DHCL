import api from '../../../api/client.js';

export async function fetchLayout() {
  const response = await api.get('/f13/v2/layout');
  return response?.data?.data || null;
}

export async function resolvePeriod({ kind, value, latestDate }) {
  const params = { kind, value };
  if (latestDate) params.latest_date = latestDate;
  const response = await api.get('/f13/v2/period/resolve', { params });
  return response?.data?.data || null;
}

export async function fetchDaySummary({ from, to, maBcvh }) {
  const params = { from, to };
  if (maBcvh && maBcvh !== 'all') {
    params.ma_bcvh = maBcvh;
  }
  const response = await api.get('/f13/v2/day/summary', { params });
  return response?.data?.data || null;
}
