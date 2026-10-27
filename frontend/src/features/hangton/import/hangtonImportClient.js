// HANGTON-INVENTORY-01: Import Center side of the stock snapshots (admin only, /api/import/hangton).
import api from '../../../api/client.js';

export async function fetchHangtonImportStatus() {
  const res = await api.get('/import/hangton/status');
  return res.data?.data;
}

// "Lấy hàng tồn ngay": an extra point, never replacing a scheduled slot.
export async function runHangtonManualSnapshot() {
  const res = await api.post('/import/hangton/snapshots', { kind: 'MANUAL' });
  return res.data?.data;
}

// Make-up of a missed scheduled slot of today ('0730' | '1130' | '2100').
export async function runHangtonMakeupSnapshot(slot) {
  const res = await api.post('/import/hangton/snapshots', { kind: 'MAKEUP', slot });
  return res.data?.data;
}

// Delete an extra point or a make-up (the API refuses scheduled snapshots).
export async function deleteHangtonSnapshot(id) {
  const res = await api.delete(`/import/hangton/snapshots/${id}`);
  return res.data?.data;
}

// The readable message the API sends ({ error: { message } }), else the network error text.
export function hangtonImportErrorMessage(error) {
  return error?.response?.data?.error?.message || error?.message || 'Không thực hiện được, thử lại sau.';
}
