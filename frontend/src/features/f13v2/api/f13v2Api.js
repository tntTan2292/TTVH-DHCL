import api from '../../../api/client.js';

export async function fetchLayout(apiBase = '/f13') {
  const response = await api.get(`${apiBase}/v2/layout`);
  return response?.data?.data || null;
}

export async function resolvePeriod({ kind, value, latestDate }, apiBase = '/f13') {
  const params = { kind, value };
  if (latestDate) params.latest_date = latestDate;
  const response = await api.get(`${apiBase}/v2/period/resolve`, { params });
  return response?.data?.data || null;
}

export async function fetchJourneyRoutes({ date, maBcvh }) {
  const params = { date };
  if (maBcvh && maBcvh !== 'all') params.ma_bcvh = maBcvh;
  const response = await api.get('/f13/v2/journey/routes', { params });
  return response?.data?.data || null;
}

export async function fetchJourneyParcels({ date, maBcvh, route, search, onlyKhongTronLo, sort, order, page }) {
  const params = { date, sort, order, page };
  if (maBcvh && maBcvh !== 'all') params.ma_bcvh = maBcvh;
  if (route) params.route = route;
  if (onlyKhongTronLo) params.khong_tron_lo = '1';
  if (search) params.search = search;
  const response = await api.get('/f13/v2/journey/parcels', { params });
  return response?.data?.data || null;
}

export async function fetchDaySummary({ from, to, maBcvh }, apiBase = '/f13') {
  const params = { from, to };
  if (maBcvh && maBcvh !== 'all') {
    params.ma_bcvh = maBcvh;
  }
  const response = await api.get(`${apiBase}/v2/day/summary`, { params });
  return response?.data?.data || null;
}
