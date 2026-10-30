// Adapter switch for OPS-JOURNAL-01
// Adheres strictly to OPS-JOURNAL-01_MANIFEST.md Section 6 & Phase B-FIX requirement:
// "Chuyển giữa hai adapter bằng MỘT hằng số (mặc định: giả)."
// "Mock chỉ được nạp khi import.meta.env.DEV (import động), không đưa dữ liệu mock vào bản build."

import { opsJournalRealAdapter } from './opsJournalRealAdapter.js';

/**
 * MỘT hằng số duy nhất để chuyển đổi giữa real adapter và mock adapter.
 * Phase C: false = API thật (mặc định). Đặt true chỉ để dựng giao diện với dữ liệu giả khi phát triển.
 */
export const USE_MOCK_OPS_JOURNAL = false;

let mockAdapterPromise = null;

async function getDelegate() {
  if (USE_MOCK_OPS_JOURNAL && import.meta.env?.DEV) {
    if (!mockAdapterPromise) {
      mockAdapterPromise = import('./opsJournalMockAdapter.js').then((m) => m.opsJournalMockAdapter);
    }
    return mockAdapterPromise;
  }
  if (USE_MOCK_OPS_JOURNAL && typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    if (!mockAdapterPromise) {
      mockAdapterPromise = import('./opsJournalMockAdapter.js').then((m) => m.opsJournalMockAdapter);
    }
    return mockAdapterPromise;
  }
  return opsJournalRealAdapter;
}

export const opsJournalAdapter = {
  async getCandidates(...args) {
    const adapter = await getDelegate();
    return adapter.getCandidates(...args);
  },
  async getDay(...args) {
    const adapter = await getDelegate();
    return adapter.getDay(...args);
  },
  async saveSpots(...args) {
    const adapter = await getDelegate();
    return adapter.saveSpots(...args);
  },
  async saveActions(...args) {
    const adapter = await getDelegate();
    return adapter.saveActions(...args);
  },
  async assignWork(...args) {
    const adapter = await getDelegate();
    return adapter.assignWork(...args);
  },
  async reopenSpot(...args) {
    const adapter = await getDelegate();
    return adapter.reopenSpot(...args);
  },
  async uploadAttachment(...args) {
    const adapter = await getDelegate();
    return adapter.uploadAttachment(...args);
  },
  async downloadAttachment(...args) {
    const adapter = await getDelegate();
    return adapter.downloadAttachment(...args);
  },
  async removeAttachment(...args) {
    const adapter = await getDelegate();
    return adapter.removeAttachment(...args);
  },
  async getNotifications(...args) {
    const adapter = await getDelegate();
    return adapter.getNotifications(...args);
  },
  async markNotificationsRead(...args) {
    const adapter = await getDelegate();
    return adapter.markNotificationsRead(...args);
  },
  async removeSpot(...args) {
    const adapter = await getDelegate();
    return adapter.removeSpot(...args);
  },
  async saveClosing(...args) {
    const adapter = await getDelegate();
    return adapter.saveClosing(...args);
  },
  async markActionDone(...args) {
    const adapter = await getDelegate();
    return adapter.markActionDone(...args);
  },
  async closeDay(...args) {
    const adapter = await getDelegate();
    return adapter.closeDay(...args);
  },
  async getAssignableUsers(...args) {
    const adapter = await getDelegate();
    return adapter.getAssignableUsers(...args);
  },
  async getMyTasks(...args) {
    const adapter = await getDelegate();
    return adapter.getMyTasks(...args);
  },
  async getSpotForAssignee(...args) {
    const adapter = await getDelegate();
    return adapter.getSpotForAssignee(...args);
  },
  async reportAction(...args) {
    const adapter = await getDelegate();
    return adapter.reportAction(...args);
  },
  async exportSpot(...args) {
    const adapter = await getDelegate();
    return adapter.exportSpot(...args);
  },
};

export default opsJournalAdapter;
