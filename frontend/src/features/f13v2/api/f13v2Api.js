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

// F13-WHY-AGG-01 / F13-WHY-UI-01: Cause aggregation API calls
export async function fetchWhySummary(params = {}, apiBase = '/f13') {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
  );
  const response = await api.get(`${apiBase}/v2/why/summary`, { params: cleanParams });
  return response?.data?.data || null;
}

export async function fetchWhyBcvh(params = {}, apiBase = '/f13') {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
  );
  const response = await api.get(`${apiBase}/v2/why/bcvh`, { params: cleanParams });
  return response?.data?.data || null;
}

export async function fetchWhyRoutes(params = {}, apiBase = '/f13') {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
  );
  const response = await api.get(`${apiBase}/v2/why/routes`, { params: cleanParams });
  return response?.data?.data || null;
}

export async function fetchWhyPostmen(params = {}, apiBase = '/f13') {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
  );
  const response = await api.get(`${apiBase}/v2/why/postmen`, { params: cleanParams });
  return response?.data?.data || null;
}

export async function fetchWhyParcels(params = {}, apiBase = '/f13') {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
  );
  const response = await api.get(`${apiBase}/v2/why/parcels`, { params: cleanParams });
  return response?.data?.data || null;
}

// F13-EVIDENCE-01: Evidence list, catalog, history, export and analysis APIs
export async function fetchDashboardMeta(apiBase = '/f13') {
  const response = await api.get(`${apiBase}/dashboard/meta`);
  return response?.data?.data || null;
}

export async function fetchEvidenceCatalog(apiBase = '/f13') {
  const response = await api.get(`${apiBase}/v2/evidence/catalog`);
  return response?.data?.data || null;
}

export async function fetchEvidenceList(params = {}, apiBase = '/f13') {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
  );
  const response = await api.get(`${apiBase}/v2/evidence/list`, { params: cleanParams });
  return response?.data?.data || null;
}

export async function fetchEvidenceHistory({ ngay_do_kiem, ma_bg }, apiBase = '/f13') {
  const response = await api.get(`${apiBase}/v2/evidence/history`, {
    params: { ngay_do_kiem, ma_bg },
  });
  return response?.data?.data || null;
}

export async function postEvidenceAnalysis({ ngay_do_kiem, ma_bg, cause, note }, apiBase = '/f13') {
  const response = await api.post(`${apiBase}/v2/evidence/analyses`, {
    ngay_do_kiem,
    ma_bg,
    cause,
    note: note || '',
  });
  return response?.data?.data || null;
}

export async function downloadEvidenceExport(params = {}, apiBase = '/f13') {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
  );
  const response = await api.get(`${apiBase}/v2/evidence/export`, {
    params: cleanParams,
    responseType: 'blob',
  });
  return response;
}

