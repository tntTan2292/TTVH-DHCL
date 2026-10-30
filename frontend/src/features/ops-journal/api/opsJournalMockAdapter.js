// Mock adapter for OPS-JOURNAL-01 (PL06)
// Follows exactly the envelope { success: true, data } or { success: false, error: { code, message } }
// defined in OPS-JOURNAL-01_MANIFEST.md Section 6.

import { MOCK_CANDIDATES, MOCK_UNAVAILABLE, MOCK_ASSIGNABLE_USERS, MOCK_MY_TASKS } from './opsJournalMockData.js';

const sleep = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));

// In-memory store per date for mock simulation
const mockDaysStore = new Map();
let myTasksStore = JSON.parse(JSON.stringify(MOCK_MY_TASKS));

let globalSpotIdCounter = 100;
let globalActionIdCounter = 1000;

function getOrCreateMockDay(date) {
  if (!mockDaysStore.has(date)) {
    // Generate initial spots from top 8 preselected candidates with unique integer IDs
    const initialSpots = MOCK_CANDIDATES.filter((c) => c.preselected).map((cand, idx) => {
      const spotId = ++globalSpotIdCounter;
      const isFirstFinalized = idx === 0;
      return {
        id: spotId,
        day: date,
        indicator: cand.indicator,
        scopeType: cand.scopeType,
        scopeKey: cand.scopeKey,
        officeCode: cand.officeCode,
        title: cand.title,
        headline: cand.headline,
        metrics: { ...cand.metrics },
        source: 'SYSTEM',
        status: isFirstFinalized ? 'FINALIZED' : 'DRAFT',
        detectedAt: `${date} 07:30:00`,
        channel: 'Dashboard',
        sort: idx + 1,
        finalizedAt: isFirstFinalized ? 1730277000000 : null,
        signedBy: isFirstFinalized ? 'Giám đốc TTVH' : null,
        actions: isFirstFinalized
          ? [
              {
                id: ++globalActionIdCounter,
                seq: 1,
                whoText: 'Giám đốc BCVH Hương Thủy',
                what: 'Rà soát và báo cáo nguyên nhân 21 bưu gửi không đạt',
                where: 'BCVH Hương Thủy',
                due: 'Trong ngày',
                how: 'Đối chiếu dữ liệu giờ xe đến và quét phát của bưu tá',
                expectedResult: 'Báo cáo chi tiết nguyên nhân bưu gửi chậm',
                status: 'REPORTED',
                reportCause: 'Trục xe liên tỉnh đến trễ 45 phút do thời tiết mưa lớn tại đèo Hải Vân',
                reportText: 'Đã họp kiểm điểm bộ phận giao nhận, bố trí xe tăng cường chuyến 14h',
                reportedAt: 1730268000000,
                assignedAt: 1730277000000,
                assigneeUserIds: [4],
              },
              {
                id: ++globalActionIdCounter,
                seq: 2,
                whoText: 'Chuyên quản TTVH + Giám đốc BCVH',
                what: 'Thống nhất phương án điều chỉnh tuyến phát từ N+1',
                where: 'TTVH / BCVH',
                due: 'Trong ngày',
                how: 'Tăng cường 01 bưu tá hỗ trợ tuyến trọng điểm',
                expectedResult: 'Phục hồi chỉ tiêu F1.1 đạt trên 95%',
                status: 'ASSIGNED',
                reportCause: null,
                reportText: null,
                reportedAt: null,
                assignedAt: 1730277000000,
                assigneeUserIds: [2, 4],
              },
            ]
          : [
              {
                id: ++globalActionIdCounter,
                seq: 1,
                whoText: 'Giám đốc BCVH',
                what: 'Rà soát nguyên nhân các bưu gửi không đạt chất lượng',
                where: cand.title,
                due: 'Trong ngày',
                how: 'Kiểm tra chi tiết trên hệ thống và phỏng vấn trực tiếp',
                expectedResult: 'Xác định nguyên nhân chính xác và lập biên bản',
                status: 'DRAFT',
                reportCause: null,
                reportText: null,
                reportedAt: null,
                assignedAt: null,
                assigneeUserIds: [3],
              },
            ],
        closing: null,
      };
    });

    mockDaysStore.set(date, {
      date,
      status: 'DRAFT',
      spots: initialSpots,
    });
  }
  return mockDaysStore.get(date);
}

export const opsJournalMockAdapter = {
  /**
   * GET /candidates?date=YYYY-MM-DD
   */
  async getCandidates(date) {
    // Simulate network delay
    await sleep(80);

    const asOfDate = date || '2026-10-29';
    return {
      success: true,
      data: {
        asOfDate,
        compareDate: '2026-10-22',
        asOfByIndicator: {
          'F1.1': asOfDate,
          'F1.2': asOfDate,
          'F1.3': asOfDate,
          'F4.1': asOfDate,
          'HANGTON': `${asOfDate} 07:30`,
        },
        unavailable: MOCK_UNAVAILABLE,
        items: MOCK_CANDIDATES.map((cand) => ({ ...cand })),
      },
    };
  },

  /**
   * GET /days/:date
   */
  async getDay(date) {
    await sleep(50);
    const day = getOrCreateMockDay(date);
    return {
      success: true,
      data: JSON.parse(JSON.stringify(day)),
    };
  },

  /**
   * PUT /days/:date/spots
   */
  async saveSpots(date, { candidateIds = [], manual = [] } = {}) {
    await sleep(100);

    const day = getOrCreateMockDay(date);

    // Keep existing locked spots (FINALIZED / CLOSED)
    const existingLockedSpots = (day.spots || []).filter(
      (s) => s.status === 'FINALIZED' || s.status === 'CLOSED'
    );

    // Locked spots that are not part of the incoming candidateIds
    const unselectedLockedSpots = existingLockedSpots.filter(
      (ls) => !candidateIds.some((cId) => {
        const cand = MOCK_CANDIDATES.find((c) => c.candidateId === cId);
        return cand && cand.scopeKey === ls.scopeKey && cand.indicator === ls.indicator;
      })
    );

    const totalSelected = candidateIds.length + manual.length + unselectedLockedSpots.length;

    // Rule: at least one spot
    if (totalSelected < 1 || totalSelected > 50) {
      return {
        success: false,
        error: {
          code: 'OUT_OF_RANGE',
          message: 'Cần chọn ít nhất 1 điểm đen.',
        },
      };
    }

    const spots = [...unselectedLockedSpots];
    let sort = spots.length + 1;

    // 1. Map candidates
    for (const candId of candidateIds) {
      const cand = MOCK_CANDIDATES.find((c) => c.candidateId === candId);
      if (cand) {
        // Retain existing actions if spot already existed in day
        const existingSpot = day.spots.find((s) => s.scopeKey === cand.scopeKey && s.indicator === cand.indicator);
        spots.push({
          id: existingSpot?.id || ++globalSpotIdCounter,
          day: date,
          indicator: cand.indicator,
          scopeType: cand.scopeType,
          scopeKey: cand.scopeKey,
          officeCode: cand.officeCode,
          title: cand.title,
          headline: cand.headline,
          metrics: { ...cand.metrics },
          source: 'SYSTEM',
          status: existingSpot?.status || 'DRAFT',
          detectedAt: `${date} 07:30:00`,
          channel: 'Dashboard',
          sort: sort++,
          finalizedAt: existingSpot?.finalizedAt || null,
          signedBy: existingSpot?.signedBy || null,
          actions: existingSpot?.actions || [],
          closing: existingSpot?.closing || null,
        });
      }
    }

    // 2. Map manual spots
    for (let i = 0; i < manual.length; i++) {
      const m = manual[i];
      spots.push({
        id: ++globalSpotIdCounter,
        day: date,
        indicator: m.indicator || 'F1.1',
        scopeType: 'BCVH',
        scopeKey: m.officeCode || 'MANUAL',
        officeCode: m.officeCode || '',
        title: m.title || `Điểm thủ công ${i + 1}`,
        headline: m.headline || '',
        metrics: {
          rate: null,
          total: null,
          fail: null,
          notEvaluated: null,
          compareRate: null,
          compareTotal: null,
          delta: null,
          mtdRate: null,
          stockGe5: null,
          stockGe7: null,
          stockGe14: null,
          cod: null,
          score: null,
          rankScore: null,
        },
        source: 'MANUAL',
        status: 'DRAFT',
        detectedAt: `${date} 08:00:00`,
        channel: 'Manual',
        sort: sort++,
        finalizedAt: null,
        signedBy: null,
        actions: [],
        closing: null,
      });
    }

    day.spots = spots;
    mockDaysStore.set(date, day);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(day)),
    };
  },

  /**
   * PUT /spots/:id/actions
   */
  async saveActions(spotId, { actions = [] } = {}) {
    await sleep(80);
    // Find spot across mock days
    for (const day of mockDaysStore.values()) {
      const spot = day.spots.find((s) => s.id === spotId);
      if (spot) {
        if (spot.status !== 'DRAFT') {
          return {
            success: false,
            error: {
              code: 'LOCKED',
              message: 'Điểm đen đã được chốt (finalized), không thể sửa trực tiếp danh sách 6-rõ.',
            },
          };
        }
        spot.actions = actions.map((act, idx) => ({
          id: act.id || ++globalActionIdCounter,
          seq: idx + 1,
          whoText: act.whoText || '',
          what: act.what || '',
          where: act.where || '',
          due: act.due || 'Trong ngày',
          how: act.how || '',
          expectedResult: act.expectedResult || '',
          status: act.status || 'DRAFT',
          reportCause: act.reportCause || null,
          reportText: act.reportText || null,
          reportedAt: act.reportedAt || null,
          assignedAt: act.assignedAt || null,
          assigneeUserIds: Array.isArray(act.assigneeUserIds) ? act.assigneeUserIds : [],
        }));
        return { success: true, data: JSON.parse(JSON.stringify(day)) };
      }
    }
    return { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy điểm đen yêu cầu' } };
  },

  /**
   * POST /days/:date/assign
   */
  async assignWork(date, { spotIds = [] } = {}) {
    await sleep(100);
    const day = getOrCreateMockDay(date);
    const now = Date.now();

    const targetSpots = day.spots.filter((s) => spotIds.length === 0 || spotIds.includes(s.id));

    // Validate completeness of all target spots
    for (const spot of targetSpots) {
      if (!spot.actions || spot.actions.length === 0) {
        return {
          success: false,
          error: {
            code: 'SPOT_INCOMPLETE',
            message: `Điểm đen "${spot.title}" chưa có danh sách 6-rõ. Vui lòng thêm hành động trước khi chốt.`,
          },
        };
      }

      for (let idx = 0; idx < spot.actions.length; idx++) {
        const act = spot.actions[idx];
        if (!act.what || !act.what.trim()) {
          return {
            success: false,
            error: {
              code: 'SPOT_INCOMPLETE',
              message: `Điểm đen "${spot.title}": dòng số ${act.seq || idx + 1} chưa có nội dung "Làm gì".`,
            },
          };
        }
      }
    }

    for (const spot of targetSpots) {
      spot.status = 'FINALIZED';
      spot.finalizedAt = now;
      spot.signedBy = 'Giám đốc TTVH';
      spot.actions.forEach((act) => {
        if (act.status === 'DRAFT') {
          act.status = 'ASSIGNED';
          act.assignedAt = now;
        }
      });
    }

    // Day is ASSIGNED if any spots are finalized
    if (day.spots.some((s) => s.status === 'FINALIZED')) {
      day.status = 'ASSIGNED';
    }

    return { success: true, data: JSON.parse(JSON.stringify(day)) };
  },

  async uploadAttachment(actionId, file) {
    await sleep(60);
    return { success: true, data: { id: Date.now(), name: file?.name || 'tep', size: file?.size || 0, uploadedAt: Date.now() } };
  },
  async downloadAttachment() {
    return { success: true, data: new Blob(['mock']), filename: 'mock.txt' };
  },
  async removeAttachment(attachmentId) {
    return { success: true, data: { id: attachmentId } };
  },
  async getNotifications() {
    return { success: true, data: { items: [], unread: 0, hasAny: false } };
  },
  async markNotificationsRead() {
    return { success: true, data: { updated: 0 } };
  },

  /**
   * DELETE /spots/:id
   */
  async removeSpot(spotId) {
    await sleep(80);
    for (const day of mockDaysStore.values()) {
      const spot = day.spots.find((s) => s.id === spotId);
      if (spot) {
        if (spot.status !== 'DRAFT' || spot.protected) {
          return { success: false, error: { code: 'PROTECTED', message: 'Điểm đen đã chốt hoặc đã có báo cáo nên không xóa được.' } };
        }
        day.spots = day.spots.filter((s) => s.id !== spotId);
        return { success: true, data: JSON.parse(JSON.stringify(day)) };
      }
    }
    return { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy điểm đen yêu cầu' } };
  },

  /**
   * POST /spots/:id/reopen
   */
  async reopenSpot(spotId, { reason = '' } = {}) {
    await sleep(80);
    if (!reason.trim()) {
      return { success: false, error: { code: 'REASON_REQUIRED', message: 'Cần nhập lý do mở lại điểm đen.' } };
    }
    for (const day of mockDaysStore.values()) {
      const spot = day.spots.find((s) => s.id === spotId);
      if (spot) {
        if (spot.status === 'CLOSED' || day.status === 'CLOSED') {
          return {
            success: false,
            error: {
              code: 'NOT_REOPENABLE',
              message: 'Điểm đen trong ngày đã đóng không thể mở lại.',
            },
          };
        }
        if (spot.status !== 'FINALIZED') {
          return {
            success: false,
            error: {
              code: 'NOT_FINALIZED',
              message: 'Chỉ có thể mở lại điểm đen ở trạng thái Đã chốt (FINALIZED).',
            },
          };
        }
        spot.status = 'DRAFT';
        spot.finalizedAt = null;
        spot.reopenReason = reason;
        return { success: true, data: JSON.parse(JSON.stringify(day)) };
      }
    }
    return { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy điểm đen' } };
  },

  /**
   * PUT /spots/:id/closing
   */
  async saveClosing(spotId, closingData = {}) {
    await sleep(80);
    for (const day of mockDaysStore.values()) {
      const spot = day.spots.find((s) => s.id === spotId);
      if (spot) {
        if (spot.status !== 'FINALIZED') {
          return {
            success: false,
            error: {
              code: 'NOT_FINALIZED',
              message: 'Chỉ có thể nhập kết quả kết ngày cho điểm đen ở trạng thái Đã chốt (FINALIZED).',
            },
          };
        }
        spot.closing = {
          resolved: closingData.resolved ?? null,
          recovered: closingData.recovered ?? null,
          handlingTimeText: closingData.handlingTimeText || '',
          lesson: closingData.lesson || '',
          processUpdate: closingData.processUpdate || '',
          doneTime: closingData.doneTime || '',
          signedBy: closingData.signedBy || spot.signedBy || 'Giám đốc TTVH',
        };
        return { success: true, data: JSON.parse(JSON.stringify(day)) };
      }
    }
    return { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy điểm đen' } };
  },

  /**
   * POST /actions/:id/done
   */
  async markActionDone(actionId) {
    await sleep(50);
    let targetAction = null;

    // Search in myTasksStore
    for (const task of myTasksStore) {
      const row = task.myRows?.find((r) => r.id === actionId);
      if (row) {
        targetAction = row;
        break;
      }
    }

    // Search in mockDaysStore
    if (!targetAction) {
      for (const day of mockDaysStore.values()) {
        for (const spot of day.spots) {
          const action = spot.actions?.find((a) => a.id === actionId);
          if (action) {
            targetAction = action;
            break;
          }
        }
        if (targetAction) break;
      }
    }

    if (!targetAction) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy dòng công việc.' } };
    }

    if (targetAction.status === 'DONE') {
      return {
        success: false,
        error: {
          code: 'ROW_DONE',
          message: 'Dòng công việc này đã được xác nhận hoàn thành trước đó.',
        },
      };
    }

    if (targetAction.status !== 'REPORTED') {
      return {
        success: false,
        error: {
          code: 'NOT_REPORTED',
          message: 'Chỉ có thể xác nhận hoàn thành cho dòng đã có báo cáo (REPORTED).',
        },
      };
    }

    targetAction.status = 'DONE';

    // Synchronize across both stores
    for (const task of myTasksStore) {
      const row = task.myRows?.find((r) => r.id === actionId);
      if (row) row.status = 'DONE';
    }
    for (const day of mockDaysStore.values()) {
      for (const spot of day.spots) {
        const action = spot.actions?.find((a) => a.id === actionId);
        if (action) action.status = 'DONE';
      }
    }

    return { success: true, data: { id: actionId, status: 'DONE' } };
  },

  /**
   * POST /days/:date/close
   */
  async closeDay(date) {
    await sleep(80);
    const day = getOrCreateMockDay(date);

    // Rule: All spots must be FINALIZED before closing day
    const hasUnfinalized = day.spots.some((s) => s.status === 'DRAFT');
    if (hasUnfinalized) {
      return {
        success: false,
        error: {
          code: 'DAY_NOT_READY',
          message: 'Còn điểm đen ở trạng thái "Nháp", chưa thể đóng ngày. Vui lòng chốt tất cả các điểm trước.',
        },
      };
    }

    day.status = 'CLOSED';
    day.closedAt = Date.now();
    day.spots.forEach((s) => {
      s.status = 'CLOSED';
    });

    return { success: true, data: JSON.parse(JSON.stringify(day)) };
  },

  /**
   * GET /assignable-users?officeCode=&indicator=&all=1
   */
  async getAssignableUsers(params = { all: 1 }) {
    await sleep(40);
    let users = [...MOCK_ASSIGNABLE_USERS];
    if (!params.all) {
      if (params.officeCode) {
        users = users.filter((u) => u.officeCode === params.officeCode || u.officeCode === 'ALL');
      }
      if (params.indicator) {
        users = users.filter((u) => !u.indicators || u.indicators.includes(params.indicator));
      }
    }
    return { success: true, data: users };
  },

  /**
   * GET /my-tasks
   */
  async getMyTasks() {
    await sleep(80);
    return {
      success: true,
      data: {
        tasks: JSON.parse(JSON.stringify(myTasksStore)),
      },
    };
  },

  /**
   * GET /spots/:id (assignee view)
   */
  async getSpotForAssignee(spotId) {
    await sleep(50);
    const task = myTasksStore.find((t) => t.spotId === spotId);
    if (!task) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy nhiệm vụ' } };
    }
    return {
      success: true,
      data: JSON.parse(JSON.stringify(task)),
    };
  },

  /**
   * POST /actions/:id/report
   */
  async reportAction(actionId, { status = 'REPORTED', causeText = '', reportText = '' } = {}) {
    await sleep(60);
    if (status === 'REPORTED' && (!reportText || !reportText.trim())) {
      return {
        success: false,
        error: {
          code: 'REPORT_REQUIRED',
          message: 'Bắt buộc nhập nội dung báo cáo khi gửi báo cáo kết quả.',
        },
      };
    }

    let foundRow = null;
    const reportedAt = Date.now();

    for (const task of myTasksStore) {
      const row = task.myRows?.find((r) => r.id === actionId);
      if (row) {
        row.status = status;
        row.reportCause = causeText;
        row.reportText = reportText;
        row.reportedAt = reportedAt;
        foundRow = row;
      }
    }

    for (const day of mockDaysStore.values()) {
      for (const spot of day.spots) {
        const action = spot.actions?.find((a) => a.id === actionId);
        if (action) {
          action.status = status;
          action.reportCause = causeText;
          action.reportText = reportText;
          action.reportedAt = reportedAt;
          foundRow = foundRow || action;
        }
      }
    }

    if (!foundRow) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy dòng công việc' } };
    }

    return {
      success: true,
      data: {
        id: actionId,
        status,
        reportCause: causeText,
        reportText,
        reportedAt,
      },
    };
  },

  /**
   * GET /spots/:id/export?format=docx|pdf
   */
  async exportSpot(spotId, format = 'docx') {
    await sleep(100);
    const normFormat = String(format || '').toLowerCase();
    if (normFormat !== 'docx' && normFormat !== 'pdf') {
      return {
        success: false,
        error: {
          code: 'BAD_FORMAT',
          message: 'Định dạng xuất file không hợp lệ (chỉ hỗ trợ docx hoặc pdf).',
        },
      };
    }

    // Verify spot exists and is finalized or closed
    let foundSpot = null;
    for (const day of mockDaysStore.values()) {
      const spot = day.spots.find((s) => s.id === spotId);
      if (spot) {
        foundSpot = spot;
        break;
      }
    }

    if (!foundSpot) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Không tìm thấy điểm đen yêu cầu xuất file.',
        },
      };
    }

    if (foundSpot.status === 'DRAFT') {
      return {
        success: false,
        error: {
          code: 'NOT_FINALIZED',
          message: 'Chỉ có thể xuất file khi điểm đen đã được chốt và giao việc.',
        },
      };
    }

    // Simulated small blob
    const content = `Mock exported journal spot ${spotId} in ${normFormat} format`;
    const mimeType =
      normFormat === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const blob = new globalThis.Blob([content], { type: mimeType });
    const filename = `PL06 - Nhat ky dieu hanh - ${foundSpot.indicator} ${foundSpot.scopeKey}.${normFormat}`;
    return { success: true, data: blob, filename };
  },
};
