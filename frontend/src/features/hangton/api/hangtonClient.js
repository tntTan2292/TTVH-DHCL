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

// ---- HANGTON-HANDLING-01: follow-up of stock handling (/api/hangton/handling/*) ----------------------------------------

const handlingUrl = (path) => `/hangton/handling${path}`;

export async function fetchHandlingCatalog() {
  const res = await api.get(handlingUrl('/catalog'));
  return res.data?.data;
}

export async function fetchHandlingStats(params = {}) {
  const res = await api.get(handlingUrl('/stats'), { params });
  return res.data?.data;
}

export async function fetchHandlingHistory(itemCode) {
  const res = await api.get(handlingUrl(`/history/${encodeURIComponent(itemCode)}`));
  return res.data?.data;
}

export async function fetchHandlingLog(params = {}) {
  const res = await api.get(handlingUrl('/log'), { params });
  return res.data?.data;
}

// mode 'REVIEW' (answers in `input`) or 'KEEP' (repeat the last entry). itemCodes: parcels of the newest mốc.
export async function saveHandlingEntries({ mode = 'REVIEW', itemCodes, input }) {
  const res = await api.post(handlingUrl('/entries'), { mode, item_codes: itemCodes, ...(input ? { input } : {}) });
  return res.data?.data;
}

// Answers per parcel (the table filled in on the web): entries = [{ item_code, input }].
export async function saveHandlingEntryList(entries, mode = 'REVIEW') {
  const res = await api.post(handlingUrl('/entries'), { mode, entries });
  return res.data?.data;
}

// The Excel to fill in, for the filter of the parcel list.
export async function downloadHandlingTemplate(params = {}) {
  const res = await api.get(handlingUrl('/template'), { params, responseType: 'blob' });
  const disposition = res.headers?.['content-disposition'] || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  saveBlob(res.data, match ? match[1] : 'Xu_ly_ton.xlsx');
  // the file holds a limited number of parcels: how many the filter has and how many went into the file
  return { total: Number(res.headers?.['x-rows-total']) || 0, included: Number(res.headers?.['x-rows-included']) || 0 };
}

export async function importHandlingFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post(handlingUrl('/import'), form);
  return res.data?.data;
}

export async function createHandlingEditRequest({ logId, input, reason }) {
  const res = await api.post(handlingUrl('/edit-requests'), { log_id: logId, input, reason });
  return res.data?.data;
}

export async function fetchHandlingEditRequests(params = {}) {
  const res = await api.get(handlingUrl('/edit-requests'), { params });
  return res.data?.data || [];
}

export async function decideHandlingEditRequest(id, { approve, note }) {
  const res = await api.post(handlingUrl(`/edit-requests/${id}/decision`), { approve, note });
  return res.data?.data;
}

export async function fetchUngroupedReasons(kind) {
  const res = await api.get(handlingUrl('/reasons/ungrouped'), { params: kind ? { kind } : {} });
  return res.data?.data || [];
}

export async function fetchReasonGroups(kind) {
  const res = await api.get(handlingUrl('/reasons/groups'), { params: { kind } });
  return res.data?.data || [];
}

export async function mapHandlingReason({ kind, text, groupCode, newGroupLabel }) {
  const res = await api.post(handlingUrl('/reasons/map'), { kind, text, group_code: groupCode, new_group_label: newGroupLabel });
  return res.data?.data;
}

// Message of a failed call, as the backend words it.
export function handlingErrorMessage(err, fallback = 'Có lỗi xảy ra, thử lại sau.') {
  return err?.response?.data?.error?.message || err?.message || fallback;
}
