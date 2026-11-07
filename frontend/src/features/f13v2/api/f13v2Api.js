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

export async function fetchJourneyRoutes(params = {}, apiBase = '/f13') {
  const query = {};
  if (params.date) query.date = params.date;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.week) query.week = params.week;
  if (params.month) query.month = params.month;
  const bcvh = params.maBcvh ?? params.ma_bcvh ?? params.bcvh;
  if (bcvh && bcvh !== 'all') query.ma_bcvh = bcvh;
  const response = await api.get(`${apiBase}/v2/journey/routes`, { params: query });
  return response?.data?.data || null;
}

export async function fetchJourneyParcels(params = {}, apiBase = '/f13') {
  const query = {};
  if (params.date) query.date = params.date;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.week) query.week = params.week;
  if (params.month) query.month = params.month;
  const bcvh = params.maBcvh ?? params.ma_bcvh ?? params.bcvh;
  if (bcvh && bcvh !== 'all') query.ma_bcvh = bcvh;
  if (params.route) query.route = params.route;
  if (params.onlyKhongTronLo || params.khong_tron_lo === '1' || params.khong_tron_lo === true) query.khong_tron_lo = '1';
  if (params.search) query.search = params.search;
  if (params.sort) query.sort = params.sort;
  if (params.order) query.order = params.order;
  if (params.page) query.page = params.page;
  const response = await api.get(`${apiBase}/v2/journey/parcels`, { params: query });
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

// F13-RULE-PROPOSAL-01: Rule proposal list, detail, and PO decisions
export async function fetchRuleProposals({ status } = {}, apiBase = '/f13') {
  const params = {};
  if (status && status !== 'all') params.status = status;
  const response = await api.get(`${apiBase}/v2/rule-proposals`, { params });
  return response?.data?.data || null;
}

export async function fetchRuleProposalDetail(key, apiBase = '/f13') {
  const encodedKey = globalThis.encodeURIComponent(key);
  const response = await api.get(`${apiBase}/v2/rule-proposals/${encodedKey}`);
  return response?.data?.data || null;
}

export async function postRuleProposalDecision(key, { decision, note, ticket_id }, apiBase = '/f13') {
  const encodedKey = globalThis.encodeURIComponent(key);
  const response = await api.post(`${apiBase}/v2/rule-proposals/${encodedKey}/decisions`, {
    decision,
    note: note || '',
    ticket_id: ticket_id || undefined,
  });
  return response?.data?.data || null;
}


