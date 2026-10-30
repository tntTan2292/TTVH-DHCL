// Real HTTP adapter for OPS-JOURNAL-01 (PL06)
// Adheres strictly to OPS-JOURNAL-01_MANIFEST.md Section 6 contract.
// Uses existing authenticated axios client (api from ../../../api/client.js).

import api from '../../../api/client.js';

const BASE_URL = '/ops-journal';

function handleApiError(err, fallbackMessage = 'Có lỗi xảy ra khi kết nối máy chủ') {
  const errorData = err?.response?.data?.error;
  return {
    success: false,
    error: {
      code: errorData?.code || 'SERVER_ERROR',
      message: errorData?.message || err?.message || fallbackMessage,
    },
  };
}

export const opsJournalRealAdapter = {
  /**
   * GET /candidates?date=YYYY-MM-DD
   */
  async getCandidates(date) {
    try {
      const res = await api.get(`${BASE_URL}/candidates`, { params: { date } });
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể tải danh sách ứng viên điểm đen');
    }
  },

  /**
   * GET /days/:date
   */
  async getDay(date) {
    try {
      const res = await api.get(`${BASE_URL}/days/${encodeURIComponent(date)}`);
      return res.data;
    } catch (err) {
      return handleApiError(err, `Không thể tải thông tin nhật ký ngày ${date}`);
    }
  },

  /**
   * PUT /days/:date/spots
   * Body: { candidateIds: [], manual: [{ indicator, officeCode, title, headline }] }
   */
  async saveSpots(date, { candidateIds = [], manual = [] } = {}) {
    try {
      const res = await api.put(`${BASE_URL}/days/${encodeURIComponent(date)}/spots`, {
        candidateIds,
        manual,
      });
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể lưu danh sách điểm đen');
    }
  },

  /**
   * PUT /spots/:id/actions
   * Body: { actions: [{ whoText, what, where, due, how, expectedResult, assigneeUserIds: [] }] }
   */
  async saveActions(spotId, { actions = [] } = {}) {
    try {
      const res = await api.put(`${BASE_URL}/spots/${encodeURIComponent(spotId)}/actions`, {
        actions,
      });
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể cập nhật danh sách hành động 6-rõ');
    }
  },

  /**
   * POST /days/:date/assign
   */
  async assignWork(date, { spotIds = [] } = {}) {
    try {
      const res = await api.post(`${BASE_URL}/days/${encodeURIComponent(date)}/assign`, {
        spotIds,
      });
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể giao việc các điểm đen');
    }
  },

  /**
   * POST /actions/:id/attachments  (multipart, field "file"): evidence file of a report
   */
  async uploadAttachment(actionId, file) {
    try {
      const body = new FormData();
      body.append('file', file, file.name);
      const res = await api.post(`${BASE_URL}/actions/${encodeURIComponent(actionId)}/attachments`, body);
      return res.data;
    } catch (err) {
      return handleApiError(err, `Không thể tải lên tệp "${file?.name || ''}"`);
    }
  },

  /**
   * GET /attachments/:id -> { success, data: Blob, filename }
   */
  async downloadAttachment(attachmentId) {
    try {
      const res = await api.get(`${BASE_URL}/attachments/${encodeURIComponent(attachmentId)}`, { responseType: 'blob' });
      const disposition = res.headers?.['content-disposition'] || '';
      const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      return { success: true, data: res.data, filename: utf8 ? decodeURIComponent(utf8[1]) : '' };
    } catch (err) {
      return handleApiError(err, 'Không thể tải tệp đính kèm');
    }
  },

  /**
   * DELETE /attachments/:id  (the uploader, until the manager accepts the row)
   */
  async removeAttachment(attachmentId) {
    try {
      const res = await api.delete(`${BASE_URL}/attachments/${encodeURIComponent(attachmentId)}`);
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể gỡ tệp đính kèm');
    }
  },

  /**
   * GET /notifications -> { items, unread, hasAny }
   */
  async getNotifications() {
    try {
      const res = await api.get(`${BASE_URL}/notifications`);
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể tải thông báo');
    }
  },

  /**
   * POST /notifications/read  { ids } or { all: true }
   */
  async markNotificationsRead({ ids = [], all = false } = {}) {
    try {
      const res = await api.post(`${BASE_URL}/notifications/read`, all ? { all: true } : { ids });
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể đánh dấu đã đọc');
    }
  },

  /**
   * DELETE /spots/:id  (a DRAFT spot that was never finalized and holds no report)
   */
  async removeSpot(spotId) {
    try {
      const res = await api.delete(`${BASE_URL}/spots/${encodeURIComponent(spotId)}`);
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể xóa điểm đen khỏi danh sách');
    }
  },

  /**
   * POST /spots/:id/reopen
   */
  async reopenSpot(spotId, { reason = '' } = {}) {
    try {
      const res = await api.post(`${BASE_URL}/spots/${encodeURIComponent(spotId)}/reopen`, {
        reason,
      });
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể mở lại điểm đen');
    }
  },

  /**
   * PUT /spots/:id/closing
   */
  async saveClosing(spotId, closingData = {}) {
    try {
      const res = await api.put(`${BASE_URL}/spots/${encodeURIComponent(spotId)}/closing`, closingData);
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể cập nhật kết quả kết ngày');
    }
  },

  /**
   * POST /actions/:id/done
   */
  async markActionDone(actionId) {
    try {
      const res = await api.post(`${BASE_URL}/actions/${encodeURIComponent(actionId)}/done`);
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể xác nhận hoàn thành công việc');
    }
  },

  /**
   * POST /days/:date/close
   */
  async closeDay(date) {
    try {
      const res = await api.post(`${BASE_URL}/days/${encodeURIComponent(date)}/close`);
      return res.data;
    } catch (err) {
      return handleApiError(err, `Không thể đóng nhật ký ngày ${date}`);
    }
  },

  /**
   * GET /assignable-users?officeCode=&indicator=&all=1
   */
  async getAssignableUsers(params = { all: 1 }) {
    try {
      const res = await api.get(`${BASE_URL}/assignable-users`, { params });
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể tải danh sách người thực hiện');
    }
  },

  /**
   * GET /my-tasks
   */
  async getMyTasks() {
    try {
      const res = await api.get(`${BASE_URL}/my-tasks`);
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể tải danh sách nhiệm vụ của bạn');
    }
  },

  /**
   * GET /assigned?from=&to= (manager): one light line per finalized spot, no rows
   */
  async getAssigned(from, to) {
    try {
      const res = await api.get(`${BASE_URL}/assigned`, { params: { from, to } });
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể tải danh sách giao việc');
    }
  },

  /**
   * GET /spots/:id (assignee view)
   */
  async getSpotForAssignee(spotId) {
    try {
      const res = await api.get(`${BASE_URL}/spots/${encodeURIComponent(spotId)}`);
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể tải thông tin phiếu nhiệm vụ');
    }
  },

  /**
   * POST /spots/:id/report -- ONE report for the whole spot (applies to every row of the spot that names the user)
   */
  async reportSpot(spotId, { status = 'REPORTED', causeText = '', reportText = '' } = {}) {
    try {
      const res = await api.post(`${BASE_URL}/spots/${encodeURIComponent(spotId)}/report`, { status, causeText, reportText });
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể gửi báo cáo');
    }
  },

  /**
   * POST /spots/:id/done (manager) -- accepts every reported row of the spot
   */
  async markSpotDone(spotId) {
    try {
      const res = await api.post(`${BASE_URL}/spots/${encodeURIComponent(spotId)}/done`);
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể xác nhận hoàn thành');
    }
  },

  /**
   * POST /actions/:id/report
   */
  async reportAction(actionId, { status = 'REPORTED', causeText = '', reportText = '' } = {}) {
    try {
      const res = await api.post(`${BASE_URL}/actions/${encodeURIComponent(actionId)}/report`, {
        status,
        causeText,
        reportText,
      });
      return res.data;
    } catch (err) {
      return handleApiError(err, 'Không thể gửi báo cáo kết quả');
    }
  },

  /**
   * GET /spots/:id/export?format=docx|pdf
   * Đọc JSON từ Blob khi server báo lỗi để lấy error.message; trích xuất tên file từ Content-Disposition
   */
  async exportSpot(spotId, format = 'docx') {
    try {
      const res = await api.get(`${BASE_URL}/spots/${encodeURIComponent(spotId)}/export`, {
        params: { format },
        responseType: 'blob',
      });

      // Extract filename from Content-Disposition header if provided
      let filename = '';
      const disposition = res.headers?.['content-disposition'] || res.headers?.['Content-Disposition'] || '';
      if (disposition) {
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match && utf8Match[1]) {
          filename = decodeURIComponent(utf8Match[1]);
        } else {
          const normalMatch = disposition.match(/filename=["']?([^"';]+)["']?/i);
          if (normalMatch && normalMatch[1]) {
            filename = normalMatch[1];
          }
        }
      }

      return { success: true, data: res.data, filename };
    } catch (err) {
      // Khi responseType: 'blob', Axios trả err.response.data dưới dạng Blob
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed?.error) {
            return {
              success: false,
              error: {
                code: parsed.error.code || 'EXPORT_FAILED',
                message: parsed.error.message || `Không thể xuất file ${format.toUpperCase()}`,
              },
            };
          }
        } catch {
          // parse failed, fallback to handleApiError
        }
      }
      return handleApiError(err, `Không thể xuất file ${format.toUpperCase()}`);
    }
  },
};
