/**
 * F13-EVIDENCE-01: Helper functions, constants and table utilities for
 * the F1.3 "Dữ liệu minh chứng" evidence view and Chuyên quản analysis log.
 */
import { fetchEvidenceCatalog, fetchLayout } from './api/f13v2Api.js';

let cachedCatalog = null;
let cachedCatalogPromise = null;
let cachedLayout = null;
let cachedLayoutPromise = null;

export function fetchEvidenceCatalogCached() {
  if (cachedCatalog) return Promise.resolve(cachedCatalog);
  if (!cachedCatalogPromise) {
    cachedCatalogPromise = fetchEvidenceCatalog()
      .then((res) => {
        cachedCatalog = res;
        return res;
      })
      .catch((err) => {
        cachedCatalogPromise = null;
        throw err;
      });
  }
  return cachedCatalogPromise;
}

export function fetchLayoutCached() {
  if (cachedLayout) return Promise.resolve(cachedLayout);
  if (!cachedLayoutPromise) {
    cachedLayoutPromise = fetchLayout()
      .then((res) => {
        cachedLayout = res;
        return res;
      })
      .catch((err) => {
        cachedLayoutPromise = null;
        throw err;
      });
  }
  return cachedLayoutPromise;
}

export function setCachedEvidenceCatalog(catalog) {
  if (catalog) cachedCatalog = catalog;
}

export function setCachedLayout(layout) {
  if (layout) cachedLayout = layout;
}

export function getCachedEvidenceAccess() {
  return { catalog: cachedCatalog, layout: cachedLayout };
}

export function clearEvidenceAccessCache() {
  cachedCatalog = null;
  cachedCatalogPromise = null;
  cachedLayout = null;
  cachedLayoutPromise = null;
}

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

/**
 * F13-PARCEL-CARD-01 U1: Permission check for displaying analysis write form in F13V2ParcelCard.
 * Requires:
 * 1. card.can_analyse === true (only failed parcels)
 * 2. catalog.can.write === true (f13.analysis.write capability)
 * 3. parcel unit in user's scoped units (or allow_all / mode === 'all')
 */
export function canWriteParcelAnalysis(card, catalog, layout) {
  if (!card?.can_analyse) return false;

  const effectiveCatalog = catalog || cachedCatalog;
  const effectiveLayout = layout || cachedLayout;

  if (!effectiveCatalog?.can?.write) return false;

  const allowAll = Boolean(effectiveLayout?.units?.allow_all || effectiveLayout?.scope?.mode === 'all');
  if (allowAll) return true;

  const userUnits = effectiveLayout?.units?.bcvh || effectiveLayout?.scope?.bcvh || [];
  if (!card?.ma_bcvh) return false;
  return userUnits.map(String).includes(String(card.ma_bcvh));
}

export const EVIDENCE_VIEW_CAUSE = 'cause';
export const EVIDENCE_VIEW_JOURNEY = 'journey';

export const EVIDENCE_JOURNEY_LEGS = Object.freeze([
  { key: 'tms_depart', label: 'TMS → Rời KTC1', title: 'Từ Quét TMS đến Đóng rời sàn KTC1' },
  { key: 'depart_arrive', label: 'Rời KTC1 → Đến BCVH', title: 'Từ Đóng rời sàn KTC1 đến Đến BCVH phát' },
  { key: 'tms_arrive', label: 'TMS → Đến BCVH', title: 'Từ Quét TMS đến Đến BCVH phát' },
  { key: 'arrive_gbt', label: 'Đến BCVH → Giao BT', title: 'Từ Đến BCVH phát đến Giao bưu tá phát' },
  { key: 'gbt_ptc', label: 'Giao BT → Phát TC', title: 'Từ Giao bưu tá phát đến Phát thành công' },
  { key: 'tms_ptc', label: 'TMS → Phát TC', title: 'Từ Quét TMS đến Phát thành công (toàn trình)' },
]);

export function formatJourneyLegHours(val) {
  if (val === null || val === undefined || val === '') return '—';
  const num = Number(val);
  if (Number.isNaN(num)) return '—';
  return `${num.toFixed(1).replace('.', ',')}h`;
}

/**
 * U1-R1: Safely reads the time string of a journey milestone,
 * supporting both the string shape ("YYYY-MM-DD HH:mm:ss") and the object shape ({ at, source }).
 * Prevents String.prototype.at from returning a function when evaluating v?.at.
 */
export function getMilestoneAt(v) {
  if (typeof v === 'string') return v;
  return v?.at ?? null;
}

export function formatMilestoneTitle(milestoneKey) {
  const titles = {
    tms: '1. Quét xuống TMS',
    depart: '2. Đóng đi khỏi sàn KTC1',
    arrive: '3. Đến BCVH phát',
    handover_first: '4. Giao bưu tá lần đầu',
    handover_shown: '4b. Giao bưu tá lần phát thành công',
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
      case 'tct_ms':
        valA = a.tct?.hours ?? a.tct?.tct_hours ?? a.journey?.tct_ms ?? -1;
        valB = b.tct?.hours ?? b.tct?.tct_hours ?? b.journey?.tct_ms ?? -1;
        return (valA - valB) * factor;
      case 'system_cause':
        valA = a.system?.label || a.system?.code || '';
        valB = b.system?.label || b.system?.code || '';
        break;
      case 'analyst_cause':
        valA = a.analysis?.label || '';
        valB = b.analysis?.label || '';
        break;
      case 'ma_lo':
        valA = a.journey?.ma_lo || a.ma_lo || '';
        valB = b.journey?.ma_lo || b.ma_lo || '';
        break;
      case 'tms':
        valA = getMilestoneAt(a.journey?.milestones?.tms) || a.ms_tms || '';
        valB = getMilestoneAt(b.journey?.milestones?.tms) || b.ms_tms || '';
        break;
      case 'depart':
        valA = getMilestoneAt(a.journey?.milestones?.depart) || a.ms_depart || '';
        valB = getMilestoneAt(b.journey?.milestones?.depart) || b.ms_depart || '';
        break;
      case 'arrive':
        valA = getMilestoneAt(a.journey?.milestones?.arrive) || a.ms_arrive || '';
        valB = getMilestoneAt(b.journey?.milestones?.arrive) || b.ms_arrive || '';
        break;
      case 'gbt':
        valA = getMilestoneAt(a.journey?.milestones?.gbt) || a.ms_gbt || '';
        valB = getMilestoneAt(b.journey?.milestones?.gbt) || b.ms_gbt || '';
        break;
      case 'ptc':
        valA = getMilestoneAt(a.journey?.milestones?.ptc) || a.ms_ptc || '';
        valB = getMilestoneAt(b.journey?.milestones?.ptc) || b.ms_ptc || '';
        break;
      case 'tms_depart':
      case 'depart_arrive':
      case 'tms_arrive':
      case 'arrive_gbt':
      case 'gbt_ptc':
      case 'tms_ptc':
        valA = a.journey?.legs?.[sortField] ?? a[`leg_${sortField}_hours`] ?? -1;
        valB = b.journey?.legs?.[sortField] ?? b[`leg_${sortField}_hours`] ?? -1;
        return (valA - valB) * factor;
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


