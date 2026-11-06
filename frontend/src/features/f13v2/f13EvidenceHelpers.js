/**
 * F13-EVIDENCE-01: Helper functions, constants and table utilities for
 * the F1.3 "Dữ liệu minh chứng" evidence view and Chuyên quản analysis log.
 */

export const ANALYST_CAUSES = Object.freeze([
  { code: 'KHONG_TRON_LO', label: 'Không trọn lô', phat_detail: null },
  { code: 'KHAI_THAC', label: 'Khai thác', phat_detail: null },
  { code: 'VAN_CHUYEN', label: 'Vận chuyển', phat_detail: null },
  { code: 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', label: 'Khai thác - Vận chuyển chưa phân biệt', phat_detail: null },
  { code: 'GIAO_BUU_TA_QUA_GIO', label: 'Phát - Chậm giao bưu tá', phat_detail: 'CHAM_GIAO_BUU_TA' },
  { code: 'PHAT_MUON', label: 'Phát - Phát chậm sau khi giao', phat_detail: 'PHAT_CHAM_SAU_GIAO' },
  { code: 'KHAC', label: 'Khác', phat_detail: null },
]);

export const ANALYST_CAUSE_MAP = new Map(ANALYST_CAUSES.map((c) => [c.code, c.label]));

export function formatAnalystCause(code) {
  if (!code) return '—';
  return ANALYST_CAUSE_MAP.get(code) || code;
}

export function formatVersusSystem(versus) {
  if (versus === 'SAME') return 'Trùng khớp hệ thống';
  if (versus === 'DIFFERENT') return 'Khác kết luận hệ thống';
  if (versus === 'NO_SYSTEM_CAUSE') return 'Chưa có kết luận HT';
  return versus || '—';
}

export function isNoteMandatory(causeCode, systemLine) {
  if (causeCode === 'KHAC') return true;
  // Per PO Decision V3 & V4: an explained parcel needs a note even when confirming or changing
  if (systemLine !== null && systemLine !== undefined && systemLine !== '') return true;
  return false;
}

export function formatMilestoneTitle(milestoneKey) {
  const titles = {
    tms: '1. Chấp nhận TMS',
    depart: '2. Rời bưu cục đóng',
    arrive: '3. Đến BCVH phát',
    handover_first: '4. Bàn giao bưu tá (đầu tiên)',
    handover_shown: '4b. Bàn giao bưu tá (hiển thị)',
    ptc: '5. Phát thành công (PTC)',
  };
  return titles[milestoneKey] || milestoneKey;
}

export function formatMilestoneState(state) {
  if (state === 'OK') return 'Đầy đủ';
  if (state === 'SKIPPED_TOO_MANY_DAYS') return 'Bỏ qua (quá số ngày cho phép trên trang)';
  if (state === 'NOT_IN_SOURCE') return 'Không tìm thấy dữ liệu gốc';
  if (state === 'UNAVAILABLE') return 'Tạm thời không khả dụng';
  return state || 'Chưa xác định';
}

/**
 * Sorts 50 items within the current page.
 * Explicitly scoped in-page sort, does not misrepresent full dataset sorting.
 */
export function sortEvidenceInPage(items, sortField, sortDirection = 'asc') {
  if (!Array.isArray(items) || items.length === 0 || !sortField) return items || [];

  const factor = sortDirection === 'desc' ? -1 : 1;

  return [...items].sort((a, b) => {
    let valA;
    let valB;

    switch (sortField) {
      case 'ngay_do_kiem':
        valA = a.ngay_do_kiem || '';
        valB = b.ngay_do_kiem || '';
        break;
      case 'ma_bg':
        valA = a.ma_bg || '';
        valB = b.ma_bg || '';
        break;
      case 'ma_bcvh':
        valA = String(a.ma_bcvh || '');
        valB = String(b.ma_bcvh || '');
        break;
      case 'ma_tuyen':
        valA = String(a.ma_tuyen || '');
        valB = String(b.ma_tuyen || '');
        break;
      case 'postman':
        valA = a.ten_buu_ta_first || a.ma_buu_ta_first || '';
        valB = b.ten_buu_ta_first || b.ma_buu_ta_first || '';
        break;
      case 'danh_gia':
        valA = a.danh_gia || '';
        valB = b.danh_gia || '';
        break;
      case 'tct_hours':
        valA = a.tct?.tct_hours ?? -1;
        valB = b.tct?.tct_hours ?? -1;
        return (valA - valB) * factor;
      case 'system_cause':
        valA = a.system?.label || a.system?.code || '';
        valB = b.system?.label || b.system?.code || '';
        break;
      case 'analyst_cause':
        valA = a.analysis?.label || '';
        valB = b.analysis?.label || '';
        break;
      default:
        valA = a[sortField] || '';
        valB = b[sortField] || '';
    }

    if (valA === valB) return 0;
    return String(valA).localeCompare(String(valB), 'vi') * factor;
  });
}

export function buildEvidenceExportFilename(from, to) {
  const fromStr = from ? String(from).replace(/[^0-9-]/g, '') : 'all';
  const toStr = to ? String(to).replace(/[^0-9-]/g, '') : fromStr;
  return `minh-chung-f13_${fromStr}_${toStr}.xlsx`;
}

/**
 * Extracts normalized summary metrics from /api/f13/v2/why/summary payload.
 * Schema matches CauseAggQueryService.summary (totals object).
 */
export function extractEvidenceSummary(summary) {
  const totals = summary?.totals || summary || {};
  const volume = Number(totals.volume) || 0;
  const passed = Number(totals.passed) || 0;
  const failed = Number(totals.failed) || 0;
  const unrated = Number(totals.unrated) || 0;
  const rate = totals.rate !== undefined && totals.rate !== null ? Number(totals.rate) : (volume > 0 ? (passed / volume) * 100 : 0);
  const shortfall = Number(totals.shortfall) || 0;

  const analysed = Number(totals.analysed) || 0;
  const analysedMix = totals.analysed_mix || {};
  const sameAsSystem = Number(analysedMix.same_as_system) || 0;
  const diffFromSystem = Number(analysedMix.different_from_system) || 0;
  const noSystemCause = Number(analysedMix.no_system_cause) || 0;
  const byCause = analysedMix.by_cause || {};

  const causeMix = totals.cause_mix || {};
  const lines = Array.isArray(causeMix.lines) ? causeMix.lines : [];
  const getLine = (code) => lines.find((l) => l.code === code) || { count: 0, share: 0 };

  const khongTronLo = getLine('KHONG_TRON_LO');
  const khaiThac = getLine('KHAI_THAC');
  const vanChuyen = getLine('VAN_CHUYEN');
  const ktVcChuaPhanBiet = getLine('KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET');

  const phat = causeMix.phat || { count: 0, share: 0, by_detail: {} };
  const chamGiao = Number(phat.by_detail?.CHAM_GIAO_BUU_TA) || 0;
  const phatCham = Number(phat.by_detail?.PHAT_CHAM_SAU_GIAO) || 0;
  const phatChuaRo = Number(phat.by_detail?.KHONG_CHI_TIET) || 0;

  const choChuyenQuan = causeMix.cho_chuyen_quan || { count: 0, share: 0, by_reason: {} };

  return {
    volume,
    passed,
    failed,
    unrated,
    rate,
    shortfall,
    analysed,
    same_as_system: sameAsSystem,
    different_from_system: diffFromSystem,
    no_system_cause: noSystemCause,
    sameAsSystem,
    diffFromSystem,
    noSystemCause,
    byCause,
    khongTronLo: Number(khongTronLo.count) || 0,
    khaiThac: Number(khaiThac.count) || 0,
    vanChuyen: Number(vanChuyen.count) || 0,
    ktVcChuaPhanBiet: Number(ktVcChuaPhanBiet.count) || 0,
    chamGiao,
    phatCham,
    phatChuaRo,
    choChuyenQuan: Number(choChuyenQuan.count) || 0,
  };
}


