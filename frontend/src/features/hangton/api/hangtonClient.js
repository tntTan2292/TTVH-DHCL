// HANGTON-INVENTORY-01 Phase 3: Client for /api/hangton endpoints.
// Uses existing authenticated axios client (api from ../../../api/client.js).

import api from '../../../api/client.js';
import { saveBlob } from '../hangtonExport.js';

export async function fetchSnapshots(limit = 90) {
  const res = await api.get('/hangton/snapshots', { params: { limit } });
  return res.data?.data || [];
}

export async function fetchOverview(params = {}) {
  const res = await api.get('/hangton/overview', { params });
  return res.data?.data;
}

export async function fetchCompare(params = {}) {
  const query = { ...params };
  if (query.detail === undefined) query.detail = 1;
  const res = await api.get('/hangton/compare', { params: query });
  return res.data?.data;
}

export async function fetchItems(params = {}) {
  const res = await api.get('/hangton/items', { params });
  return res.data?.data;
}

// Every row of the filter as a file (server side, not one page): format 'xlsx' (default) or 'csv'.
export async function downloadItemsFile(params = {}, format = 'xlsx') {
  const res = await api.get('/hangton/items/export', { params: { ...params, format }, responseType: 'blob' });
  const disposition = res.headers?.['content-disposition'] || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  saveBlob(res.data, match ? match[1] : `Hang_ton.${format}`);
}
