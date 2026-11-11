/**
 * Pure helpers for F1.3 Cause Analysis (F13-WHY-UI-01)
 *
 * Rules:
 * - Never recompute business rules, shortfalls or rates from scratch; read pre-calculated figures from API.
 * - Format cleanly according to Vietnamese locale.
 * - Provide natural language diagnostic summary for Chuyên quản and Giám đốc BCVH.
 */

export const CHO_CHUYEN_QUAN_REASONS = Object.freeze({
  TCT_DAI_HON_MOC: 'Giờ TCT dài hơn mốc thực tế',
  CHAM_DEN_HAY_CHAM_GIAO: 'Không có xác nhận đến BCVH, chưa tách được đến muộn hay giao muộn',
  MOC_A_KHONG_HOP_LE: 'Mốc đến BCVH sai thứ tự',
  THIEU_MOC_G: 'Thiếu mốc giao bưu tá',
  MOC_G_KHONG_HOP_LE: 'Mốc giao bưu tá sai thứ tự',
  KHOANG_CAT_CHI_TIEU: 'Chưa đủ chắc chắn quá hạn hay còn hạn',
  KET_QUA_KHONG_KHOP_CHI_TIEU: 'Kết quả TCT không khớp chỉ tiêu',
  THIEU_PTC: 'Chưa có giờ phát',
});

export function formatChoChuyenQuanReason(code) {
  if (!code) return '—';
  return CHO_CHUYEN_QUAN_REASONS[code] || String(code);
}

// F13-WHY-NARRATIVE-02 U1: Story sentence configuration and cause labels
export const STORY_CONFIG = Object.freeze({
  HINT_MIN_COUNT: 3,
  HINT_MIN_RATIO: 2,
});

export const STORY_CAUSE_LABELS = Object.freeze({
  GIAO_BUU_TA_QUA_GIO: 'Chậm giao bưu tá',
  PHAT_MUON: 'Phát chậm sau khi giao',
  PHAT_KHONG_CHI_TIET: 'Phát (chưa rõ chi tiết)',
  KHONG_TRON_LO: 'Không trọn lô',
  KHAI_THAC: 'Khai thác',
  VAN_CHUYEN: 'Vận chuyển',
  KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET: 'Khai thác - Vận chuyển (chưa phân biệt)',
  PHAT: 'Khâu phát',
  KHAC: 'Khác',
});

export function formatStoryCauseLabel(code, defaultLabel = '') {
  if (!code) return defaultLabel || '—';
  return STORY_CAUSE_LABELS[code] || defaultLabel || formatCauseLabel(code);
}

// F13-WHY-DATA-03 & F13-PARCEL-CARD-01 U3: label of a data-quality flag (show words only, never raw code).
export const FLAG_LABELS = Object.freeze({
  A_TRUOC_TMS_GIAO_TRUC_TIEP: 'Giao nhận trực tiếp ĐTC1: đến BCVH trước giờ quét TMS, chặng TMS -> đến tính 0',
  THIEU_F41: 'Không có dữ liệu F4.1',
  KHONG_XAC_NHAN_DEN: 'Không có giờ xác nhận đến BCVH',
  SAI_TRINH_TU_NGHIEP_VU: 'Các mốc sai trình tự nghiệp vụ',
  G_TRUOC_T: 'Giao bưu tá trước giờ quét TMS',
  THIEU_MOC_D: 'Thiếu mốc rời KTC1',
  MOC_D_DAO_THU_TU: 'Mốc rời KTC1 sai thứ tự',
  THIEU_MOC_G: 'Thiếu mốc giao bưu tá',
  MOC_G_KHONG_HOP_LE: 'Mốc giao bưu tá sai thứ tự',
  MOC_A_KHONG_HOP_LE: 'Mốc đến BCVH sai thứ tự',
  THIEU_MOC_E: 'Thiếu giờ phát',
  THOI_GIAN_KHONG_HOP_LE: 'Thời gian không hợp lệ',
  R_KHONG_HOP_LE: 'Không tính lại được số giờ TCT',
  UNLOCATED_TCT_EXCLUSION: 'Có khoảng loại trừ TCT chưa xác định vị trí',
  KET_QUA_KHONG_KHOP_CHI_TIEU: 'Kết quả TCT không khớp chỉ tiêu',
  THIEU_CHI_TIEU: 'Thiếu chỉ tiêu',
  F41_KHONG_DUY_NHAT: 'F4.1 có nhiều dòng',
});

export function formatFlagLabel(code) {
  if (!code) return '—';
  return FLAG_LABELS[code] || 'Mã khác';
}

// F13-PARCEL-CARD-01 U3: human labels for system diagnosis status, basis, step, hints
export const CAUSE_STATUS_LABELS = Object.freeze({
  CAUSE: 'Đã xác định nguyên nhân',
  CHO_CHUYEN_QUAN: 'Chờ Chuyên quản phân tích',
  CHUA_DU_CAN_CU: 'Chưa đủ căn cứ',
  KHONG_PHAN_TICH: 'Không phân tích (bưu gửi Đạt hoặc chưa đánh giá)',
});

export function formatCauseStatusLabel(code) {
  if (!code) return '—';
  return CAUSE_STATUS_LABELS[code] || 'Mã khác';
}

export const CAUSE_BASIS_LABELS = Object.freeze({
  INTERVAL: 'Tính theo số giờ TCT (khoảng thời gian)',
  MILESTONES: 'Tính theo các mốc hành trình',
});

export function formatCauseBasisLabel(code) {
  if (!code) return '—';
  return CAUSE_BASIS_LABELS[code] || 'Mã khác';
}

export const CAUSE_STEP_LABELS = Object.freeze({
  'T-A': 'Chặng TMS → Đến BCVH',
  'T-G': 'Chặng TMS → Giao bưu tá',
  'T-E': 'Chặng TMS → Phát',
  THOI_GIAN: 'Theo thời gian',
});

export function formatCauseStepLabel(code) {
  if (!code) return '—';
  return CAUSE_STEP_LABELS[code] || 'Mã khác';
}

export const CAUSE_HINT_LABELS = Object.freeze({
  DEN_BCVH_CON_IT_GIO: 'Bưu gửi đến BCVH còn ít giờ',
  DAU_HIEU_CHAM_TAI_BCVH: 'Có dấu hiệu chậm tại BCVH',
});

export function formatCauseHintLabel(code) {
  if (!code) return '—';
  return CAUSE_HINT_LABELS[code] || 'Mã khác';
}

export const CAUSE_LABELS = Object.freeze({
  KHONG_TRON_LO: 'Không trọn lô',
  KHAI_THAC: 'Khai thác (đến BCVH quá hạn)',
  VAN_CHUYEN: 'Vận chuyển (đến BCVH quá hạn)',
  KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET: 'Khai thác - Vận chuyển (chưa phân biệt)',
  GIAO_BUU_TA_QUA_GIO: 'Chậm giao bưu tá',
  PHAT_MUON: 'Phát chậm sau khi giao',
  PHAT_KHONG_CHI_TIET: 'Phát (chưa rõ chi tiết)',
  CHO_CHUYEN_QUAN: 'Chờ Chuyên quản phân tích',
  CHUA_DU_CAN_CU: 'Chưa đủ căn cứ',
  KHONG_PHAN_TICH: 'Không phân tích',
  PHAT: 'Khâu phát',
});

export function formatCauseLabel(code) {
  if (!code) return '—';
  return CAUSE_LABELS[code] || String(code);
}

export const PHAT_DETAIL_LABELS = Object.freeze({
  CHAM_GIAO_BUU_TA: 'Chậm giao bưu tá',
  PHAT_CHAM_SAU_GIAO: 'Phát chậm sau khi giao',
  KHONG_CHI_TIET: 'Không có chi tiết',
});

export function formatPhatDetail(detail) {
  if (!detail) return '—';
  return PHAT_DETAIL_LABELS[detail] || String(detail);
}

export function formatRemainingAtArrival(msOrBucket) {
  if (msOrBucket === null || msOrBucket === undefined) return '—';
  if (typeof msOrBucket === 'string') {
    const map = {
      over_limit: 'Đến quá giờ',
      lt_3h: 'Còn < 3h',
      h3_6: 'Còn 3 - 6h',
      ge_6h: 'Còn ≥ 6h',
    };
    return map[msOrBucket] || msOrBucket;
  }
  const num = Number(msOrBucket);
  if (Number.isNaN(num)) return '—';
  if (num < 0) return 'Đến quá giờ';
  if (num < 3 * 3600 * 1000) return 'Còn < 3h';
  if (num < 6 * 3600 * 1000) return 'Còn 3 - 6h';
  return 'Còn ≥ 6h';
}

export function formatPostmanName(name, code) {
  if ((!name && !code) || code === 'NONE') return 'Chưa có bưu tá';
  if (name && code) return `${name} (${code})`;
  if (name) return name;
  return `Bưu tá ${code}`;
}

export function formatShortfall(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
  const num = Number(val);
  const rounded = Math.round(num * 10) / 10;
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(rounded);
}

export function formatSharePercent(ratio) {
  if (ratio === null || ratio === undefined || Number.isNaN(Number(ratio))) return '—';
  const percent = Number(ratio) * 100;
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(percent) + '%';
}

/**
 * Build unit options for the Why page filter bar.
 * For a city-wide account (allow_all === true), adds "Tất cả BCVH" at the top with value="all".
 * For a one-unit/scoped account, contains ONLY the allowed units (never "Tất cả BCVH").
 */
export function buildWhyUnitOptions({ layout, metaUnits = [] } = {}) {
  const allowAll = layout?.units?.allow_all === true;
  const allowedCodes = Array.isArray(layout?.units?.bcvh) ? layout.units.bcvh : [];

  const nameMap = {};
  metaUnits.forEach((u) => {
    if (u?.ma_bcvh) nameMap[u.ma_bcvh] = u.ten_bcvh || `BCVH ${u.ma_bcvh}`;
  });

  if (!allowAll && allowedCodes.length > 0) {
    return allowedCodes.map((code) => ({
      value: code,
      label: nameMap[code] ? `${nameMap[code]} (${code})` : `BCVH ${code}`,
      ma_bcvh: code,
      ten_bcvh: nameMap[code] || `BCVH ${code}`,
    }));
  }

  if (allowAll) {
    const list = [
      {
        value: 'all',
        label: 'Tất cả BCVH',
        ma_bcvh: 'all',
        ten_bcvh: 'Tất cả BCVH',
      },
    ];
    metaUnits.forEach((u) => {
      list.push({
        value: u.ma_bcvh,
        label: u.ten_bcvh ? `${u.ten_bcvh} (${u.ma_bcvh})` : `BCVH ${u.ma_bcvh}`,
        ma_bcvh: u.ma_bcvh,
        ten_bcvh: u.ten_bcvh || `BCVH ${u.ma_bcvh}`,
      });
    });
    return list;
  }

  return [];
}

/**
 * Resolves the effective BCVH value, guaranteeing that the returned value
 * is ALWAYS one of the options in unitOptions.
 */
export function resolveEffectiveBcvh({ currentParam, unitOptions = [], layout } = {}) {
  if (!unitOptions || unitOptions.length === 0) return 'all';

  const validValues = new Set(unitOptions.map((opt) => opt.value));

  // 1. If currentParam is in the options list, it is valid
  if (currentParam && validValues.has(currentParam)) {
    return currentParam;
  }

  // 2. City-wide account default is 'all'
  const allowAll = layout?.units?.allow_all === true;
  if (allowAll && validValues.has('all')) {
    return 'all';
  }

  // 3. Scoped / single-unit account: default to first allowed option
  return unitOptions[0]?.value || 'all';
}

export function separateRouteScopes(routes = []) {
  const postmanRoutes = [];
  const otherRoutes = [];

  for (const r of routes) {
    if (r.route_scope === 'POSTMAN') {
      postmanRoutes.push(r);
    } else {
      otherRoutes.push(r);
    }
  }

  return { postmanRoutes, otherRoutes };
}

/**
 * Groups routes by BCVH so routes are shown per BCVH and never mixed together in one table.
 * Preserves the ordering of bcvhRows (highest shortfall first).
 */
export function groupRoutesByBcvh(routes = [], bcvhRows = []) {
  const groupsMap = new Map();

  // 1. Seed with bcvhRows to preserve ordering
  if (Array.isArray(bcvhRows)) {
    bcvhRows.forEach((row) => {
      if (row?.ma_bcvh) {
        groupsMap.set(row.ma_bcvh, {
          ma_bcvh: row.ma_bcvh,
          ten_bcvh: row.ten_bcvh || `BCVH ${row.ma_bcvh}`,
          bcvhRow: row,
          routes: [],
        });
      }
    });
  }

  // 2. Put routes into their respective BCVH group
  routes.forEach((route) => {
    const code = route.ma_bcvh || 'UNKNOWN';
    if (!groupsMap.has(code)) {
      groupsMap.set(code, {
        ma_bcvh: code,
        ten_bcvh: route.ten_bcvh || `BCVH ${code}`,
        bcvhRow: null,
        routes: [],
      });
    }
    groupsMap.get(code).routes.push(route);
  });

  const result = [];
  groupsMap.forEach((group) => {
    const { postmanRoutes, otherRoutes } = separateRouteScopes(group.routes);
    result.push({
      ma_bcvh: group.ma_bcvh,
      ten_bcvh: group.ten_bcvh,
      bcvhRow: group.bcvhRow,
      routes: group.routes,
      postmanRoutes,
      otherRoutes,
    });
  });

  return result;
}

/**
 * Formats a TMS batch ISO timestamp or date text into "HH:mm ngày DD/MM".
 */
export function formatTmsBatchTime(timeStr) {
  if (!timeStr) return '';
  const str = String(timeStr).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{1,2})/);
  if (isoMatch) {
    const [, , mm, dd, hh, min] = isoMatch;
    return `${hh.padStart(2, '0')}:${min.padStart(2, '0')} ngày ${dd.padStart(2, '0')}/${mm.padStart(2, '0')}`;
  }
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${hh}:${min} ngày ${dd}/${mm}`;
  }
  return str;
}

/**
 * Formats one lot entry under Không trọn lô.
 * e.g. "lô C340006410203: 162 BG, 2 đợt TMS, đợt cuối 08:09 ngày 09/10"
 */
export function formatStoryLot(lot) {
  if (!lot) return '';
  const parts = [];
  if (lot.failed !== undefined && lot.failed !== null) {
    parts.push(`${lot.failed} BG`);
  }
  if (lot.tms_batches) {
    parts.push(`${lot.tms_batches} đợt TMS`);
  }
  if (lot.last_tms) {
    const timeFormatted = formatTmsBatchTime(lot.last_tms);
    if (timeFormatted) {
      parts.push(`đợt cuối ${timeFormatted}`);
    }
  }
  return `lô ${lot.ma_lo}: ${parts.join(', ')}`;
}

function formatHintPercent(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '0';
  const percent = Number(val) * 100;
  const rounded = Math.round(percent * 10) / 10;
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(rounded);
}

function formatHintRatio(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '0';
  const num = Number(val);
  const rounded = Math.round(num * 10) / 10;
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(rounded);
}

function summarizeRouteLegacyCause(route) {
  const mix = route?.cause_mix;
  if (!mix) return `${route?.failed || 0} bưu gửi không đạt`;

  const lines = mix.lines || [];
  const sortedLines = [...lines].sort((a, b) => (b.count || 0) - (a.count || 0));
  const topLine = sortedLines[0];

  const phat = mix.phat;
  const phatCount = phat?.count || 0;
  const choChuyenQuan = mix.cho_chuyen_quan?.count || 0;

  // Check if Không trọn lô is the dominant issue
  const khongTronLo = lines.find((l) => l.code === 'KHONG_TRON_LO');
  if (khongTronLo && khongTronLo.count > 0 && khongTronLo.count >= phatCount && khongTronLo.count >= (topLine?.count || 0)) {
    return `Không trọn lô chiếm ${formatSharePercent(khongTronLo.share)} (${khongTronLo.count} BG)`;
  }

  // Check if Khâu phát dominates
  if (phatCount > 0 && phatCount >= (topLine?.count || 0)) {
    const chamGiao = phat?.by_detail?.CHAM_GIAO_BUU_TA || 0;
    const phatCham = phat?.by_detail?.PHAT_CHAM_SAU_GIAO || 0;
    const phatChuaRo = phat?.by_detail?.KHONG_CHI_TIET || 0;
    const parts = [];
    if (chamGiao > 0) parts.push(`${chamGiao} chậm giao`);
    if (phatCham > 0) parts.push(`${phatCham} phát chậm`);
    if (phatChuaRo > 0) parts.push(`${phatChuaRo} không có chi tiết`);
    const detailStr = parts.length > 0 ? ` (${parts.join(', ')})` : ` (${phatCount} BG)`;
    return `Khâu phát chiếm ${formatSharePercent(phat.share)}${detailStr}`;
  }

  // Check other primary causes (Khai thác, Vận chuyển, etc.)
  if (topLine && topLine.count > 0) {
    return `${topLine.label} chiếm ${formatSharePercent(topLine.share)} (${topLine.count} BG)`;
  }

  if (choChuyenQuan > 0) {
    const reasons = Object.keys(mix.cho_chuyen_quan?.by_reason || {});
    const reasonText = reasons.length > 0 ? `: ${reasons.map(formatChoChuyenQuanReason).join(', ')}` : '';
    return `Chờ Chuyên quản phân tích (${choChuyenQuan} BG${reasonText})`;
  }

  return `${route.failed} bưu gửi chưa rõ chi tiết`;
}

/**
 * F13-WHY-NARRATIVE-02 U1: Builds the narrative sentence of a route from row.story:
 * - main cause with its share (Phát details worded "Chậm giao bưu tá" / "Phát chậm sau khi giao")
 * - the lots when Không trọn lô is main ("lô C340006410203: 162 BG, 2 đợt TMS, đợt cuối 08:09 ngày 09/10")
 * - the second cause when present
 * - the parcels arriving with little time left
 * - hints in a lighter style only when ratio >= 2 and count >= 3:
 *   "Tỷ lệ hoàn x %, gấp y lần bưu cục", "x BG chưa có kết quả phát trong kỳ".
 * Never call them a cause or a fault.
 *
 * Returns { mainText, hintText, fullText, toString() }
 */
export function buildRouteStorySentence(route) {
  if (!route) {
    return {
      mainText: '—',
      hintText: '',
      fullText: '—',
      toString() { return this.fullText; },
    };
  }

  if (route.failed === 0) {
    return {
      mainText: '100% đạt chỉ tiêu',
      hintText: '',
      fullText: '100% đạt chỉ tiêu',
      toString() { return this.fullText; },
    };
  }

  const story = route.story;
  if (!story) {
    const fallback = summarizeRouteLegacyCause(route);
    return {
      mainText: fallback,
      hintText: '',
      fullText: fallback,
      toString() { return this.fullText; },
    };
  }

  const parts = [];

  // 1. Main cause. Review (Opus): when no real cause leads (every failed parcel waits for the Chuyên quản), the mix sentence takes
  // its place and the little-time count and the hints below still follow.
  const main = story.main;
  const mainLabel = main ? formatStoryCauseLabel(main.code, main.label) : '';
  const mainShare = main ? formatSharePercent(main.share) : '';

  if (!main) {
    parts.push(summarizeRouteLegacyCause(route));
  } else if (main.code === 'KHONG_TRON_LO' && Array.isArray(story.lot) && story.lot.length > 0) {
    const lotsStr = story.lot.map(formatStoryLot).join('; ');
    parts.push(`${mainLabel} chiếm ${mainShare} (${lotsStr})`);
  } else if (main.count !== undefined && main.count !== null) {
    parts.push(`${mainLabel} chiếm ${mainShare} (${main.count} BG)`);
  } else {
    parts.push(`${mainLabel} chiếm ${mainShare}`);
  }

  // 2. Second cause when present
  if (story.second && story.second.code) {
    const secondLabel = formatStoryCauseLabel(story.second.code, story.second.label);
    const secondShare = formatSharePercent(story.second.share);
    parts.push(`${secondLabel}: ${secondShare}`);
  }

  // 3. Parcels arriving with little time left
  if (story.little_time && story.little_time.count > 0) {
    parts.push(`${story.little_time.count} BG đến BCVH còn ít giờ`);
  }

  const mainText = parts.join('; ');

  // 4. Hints in lighter style only when ratio >= 2 and count >= 3
  const hintItems = [];
  const returnHint = story.return_hint;
  if (
    returnHint &&
    returnHint.count >= STORY_CONFIG.HINT_MIN_COUNT &&
    returnHint.ratio !== null &&
    returnHint.ratio >= STORY_CONFIG.HINT_MIN_RATIO
  ) {
    const x = formatHintPercent(returnHint.share);
    const y = formatHintRatio(returnHint.ratio);
    hintItems.push(`Tỷ lệ hoàn ${x} %, gấp ${y} lần bưu cục`);
  }

  const stockHint = story.stock_hint;
  if (
    stockHint &&
    stockHint.count >= STORY_CONFIG.HINT_MIN_COUNT &&
    stockHint.ratio !== null &&
    stockHint.ratio >= STORY_CONFIG.HINT_MIN_RATIO
  ) {
    hintItems.push(`${stockHint.count} BG chưa có kết quả phát trong kỳ`);
  }

  const hintText = hintItems.join('. ');
  const fullText = hintText ? `${mainText}. ${hintText}` : mainText;

  return {
    mainText,
    hintText,
    fullText,
    toString() { return this.fullText; },
  };
}

/**
 * Returns a 1-sentence plain-language summary of the leading cause of a route.
 */
export function summarizeRouteMainCause(route) {
  if (!route) return '—';
  if (route.failed === 0) return '100% đạt chỉ tiêu';
  if (route.story?.main) {
    return buildRouteStorySentence(route).fullText;
  }
  return summarizeRouteLegacyCause(route);
}

/**
 * Builds the natural language diagnostic story for a BCVH or the whole BĐTP.
 */
export function generateBcvhDiagnosticStory({
  bcvhRow,
  postmanRoutes = [],
  allBcvhRows = [],
  periodLabel = '',
  isCityWide = false,
}) {
  if (!bcvhRow) {
    return {
      headline: 'Chưa có dữ liệu phân tích cho kỳ báo cáo này.',
      hotspotSummary: '',
      upstreamSummary: '',
      internalSummary: '',
    };
  }

  const {
    ten_bcvh = 'Bưu cục',
    rate = 0,
    volume = 0,
    passed = 0,
    failed = 0,
    own_shortfall = 0,
    cause_mix = {},
  } = bcvhRow;

  const periodText = periodLabel ? `Trong ${periodLabel}, ` : '';

  // 1. City-Wide Story (BĐTP view)
  if (isCityWide || bcvhRow.isCityWide || bcvhRow.ma_bcvh === 'all') {
    let headline = `${periodText}toàn BĐTP Huế đạt tỷ lệ ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(rate)}% (${new Intl.NumberFormat('vi-VN').format(passed)} / ${new Intl.NumberFormat('vi-VN').format(volume)} bưu gửi)`;
    if (own_shortfall > 0) {
      headline += `, thiếu hụt ${formatShortfall(own_shortfall)} bưu gửi so với chỉ tiêu 90%.`;
    } else {
      headline += `, hoàn thành vượt chỉ tiêu 90%.`;
    }

    let hotspotSummary = '';
    const laggingBcvhs = [...allBcvhRows]
      .filter((r) => (r.own_shortfall || 0) > 0)
      .sort((a, b) => (b.own_shortfall_x10 || 0) - (a.own_shortfall_x10 || 0));

    if (laggingBcvhs.length > 0) {
      const top3 = laggingBcvhs.slice(0, 3);
      const top3Str = top3
        .map((r) => `${r.ten_bcvh} (thiếu ${formatShortfall(r.own_shortfall)} BG, kéo tụt ${formatSharePercent(r.share_of_parent_shortfall)})`)
        .join(', ');
      hotspotSummary = `Các đơn vị kéo tụt chỉ tiêu BĐTP nhiều nhất gồm: ${top3Str}. Toàn thành phố có ${laggingBcvhs.length} / ${allBcvhRows.length} BCVH chưa đạt chỉ tiêu 90%.`;
    } else {
      hotspotSummary = 'Tất cả các BCVH trực thuộc BĐTP đều đạt hoặc vượt chỉ tiêu 90%.';
    }

    // Upstream objective vs Internal BCVH causes
    const lines = cause_mix?.lines || [];
    const khongTronLo = lines.find((l) => l.code === 'KHONG_TRON_LO')?.count || 0;
    const khaiThac = lines.find((l) => l.code === 'KHAI_THAC')?.count || 0;
    const vanChuyen = lines.find((l) => l.code === 'VAN_CHUYEN')?.count || 0;
    const ktVcChuaPhanBiet = lines.find((l) => l.code === 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET')?.count || 0;
    const upstreamTotal = khongTronLo + khaiThac + vanChuyen + ktVcChuaPhanBiet;

    let upstreamSummary = '';
    if (upstreamTotal > 0 && failed > 0) {
      const upstreamShare = (upstreamTotal / failed) * 100;
      const details = [];
      if (khongTronLo > 0) details.push(`Không trọn lô: ${khongTronLo} BG`);
      if (khaiThac > 0) details.push(`Khai thác: ${khaiThac} BG`);
      if (vanChuyen > 0) details.push(`Vận chuyển: ${vanChuyen} BG`);
      if (ktVcChuaPhanBiet > 0) details.push(`Khai thác - Vận chuyển (chưa phân biệt): ${ktVcChuaPhanBiet} BG`);
      upstreamSummary = `Nguyên nhân khách quan trước bưu cục chiếm ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(upstreamShare)}% số không đạt (${upstreamTotal} / ${failed} BG; gồm ${details.join(', ')}).`;
    }

    const phatCount = cause_mix?.phat?.count || 0;
    let internalSummary = '';
    if (phatCount > 0 && failed > 0) {
      const phatShare = (phatCount / failed) * 100;
      const chamGiao = cause_mix?.phat?.by_detail?.CHAM_GIAO_BUU_TA || 0;
      const phatCham = cause_mix?.phat?.by_detail?.PHAT_CHAM_SAU_GIAO || 0;
      const phatChuaRo = cause_mix?.phat?.by_detail?.KHONG_CHI_TIET || 0;
      const parts = [];
      if (chamGiao > 0) parts.push(`${chamGiao} bưu gửi chậm giao bưu tá`);
      if (phatCham > 0) parts.push(`${phatCham} bưu gửi phát chậm sau khi giao`);
      if (phatChuaRo > 0) parts.push(`${phatChuaRo} không có chi tiết`);
      internalSummary = `Nguyên nhân tại khâu phát chiếm ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(phatShare)}% (${phatCount} BG; gồm ${parts.join(', ')}).`;
    }

    return {
      headline,
      hotspotSummary,
      upstreamSummary,
      internalSummary,
    };
  }

  // 2. Single BCVH Story
  const bcvhName = ten_bcvh.startsWith('BCVH ') ? ten_bcvh : `BCVH ${ten_bcvh}`;

  let headline = `${periodText}${bcvhName} đạt tỷ lệ ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(rate)}% (${new Intl.NumberFormat('vi-VN').format(passed)} / ${new Intl.NumberFormat('vi-VN').format(volume)} bưu gửi)`;
  if (own_shortfall > 0) {
    headline += `, thiếu hụt ${formatShortfall(own_shortfall)} bưu gửi so với chỉ tiêu 90%.`;
  } else {
    headline += `, hoàn thành vượt chỉ tiêu 90%.`;
  }

  // 2. Hotspots among postman routes
  const routesNeedingAttention = postmanRoutes.filter((r) => (r.own_shortfall || 0) > 0);
  let hotspotSummary = '';

  if (routesNeedingAttention.length > 0) {
    const topN = Math.min(5, routesNeedingAttention.length);
    const topRoutes = routesNeedingAttention.slice(0, topN);

    const topVolume = topRoutes.reduce((sum, r) => sum + (r.volume || 0), 0);
    const topPassed = topRoutes.reduce((sum, r) => sum + (r.passed || 0), 0);
    const topDeficitX10 = topRoutes.reduce((sum, r) => sum + (r.own_shortfall_x10 || 0), 0);
    const totalDeficitsX10 = bcvhRow.own_shortfall_x10 || 0;

    const volShare = volume > 0 ? (topVolume / volume) * 100 : 0;
    const topRate = topVolume > 0 ? (topPassed / topVolume) * 100 : 0;
    const shortfallShare = totalDeficitsX10 > 0 ? (topDeficitX10 / totalDeficitsX10) * 100 : 0;

    const topRoute = topRoutes[0];
    const topRouteName = topRoute?.ten_tuyen || topRoute?.ma_tuyen || 'Tuyến nóng nhất';

    hotspotSummary = `${topN} tuyến phát cần chú ý nhiều nhất chiếm ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(volShare)}% sản lượng (${new Intl.NumberFormat('vi-VN').format(topVolume)} BG) nhưng chỉ đạt ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(topRate)}% đúng hạn, gây ra ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(shortfallShare)}% mức thiếu hụt của bưu cục. Trong đó, tuyến "${topRouteName}" thiếu hụt lớn nhất (${formatShortfall(topRoute.own_shortfall)} BG).`;
  } else {
    hotspotSummary = 'Tất cả các tuyến phát của bưu cục đều đạt hoặc vượt chỉ tiêu 90%.';
  }

  // 3. Upstream objective vs Internal BCVH causes
  const lines = cause_mix?.lines || [];
  const khongTronLo = lines.find((l) => l.code === 'KHONG_TRON_LO')?.count || 0;
  const khaiThac = lines.find((l) => l.code === 'KHAI_THAC')?.count || 0;
  const vanChuyen = lines.find((l) => l.code === 'VAN_CHUYEN')?.count || 0;
  const ktVcChuaPhanBiet = lines.find((l) => l.code === 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET')?.count || 0;
  const upstreamTotal = khongTronLo + khaiThac + vanChuyen + ktVcChuaPhanBiet;

  let upstreamSummary = '';
  if (upstreamTotal > 0 && failed > 0) {
    const upstreamShare = (upstreamTotal / failed) * 100;
    const details = [];
    if (khongTronLo > 0) details.push(`Không trọn lô: ${khongTronLo} BG`);
    if (khaiThac > 0) details.push(`Khai thác: ${khaiThac} BG`);
    if (vanChuyen > 0) details.push(`Vận chuyển: ${vanChuyen} BG`);
    if (ktVcChuaPhanBiet > 0) details.push(`Khai thác - Vận chuyển (chưa phân biệt): ${ktVcChuaPhanBiet} BG`);
    upstreamSummary = `Nguyên nhân khách quan trước bưu cục chiếm ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(upstreamShare)}% số không đạt (${upstreamTotal} / ${failed} BG; gồm ${details.join(', ')}).`;
  }

  // 4. Internal delivery causes
  const phatCount = cause_mix?.phat?.count || 0;
  let internalSummary = '';
  if (phatCount > 0 && failed > 0) {
    const phatShare = (phatCount / failed) * 100;
    const chamGiao = cause_mix?.phat?.by_detail?.CHAM_GIAO_BUU_TA || 0;
    const phatCham = cause_mix?.phat?.by_detail?.PHAT_CHAM_SAU_GIAO || 0;
    const phatChuaRo = cause_mix?.phat?.by_detail?.KHONG_CHI_TIET || 0;
    const parts = [];
    if (chamGiao > 0) parts.push(`${chamGiao} bưu gửi chậm giao bưu tá`);
    if (phatCham > 0) parts.push(`${phatCham} bưu gửi phát chậm sau khi giao`);
    if (phatChuaRo > 0) parts.push(`${phatChuaRo} không có chi tiết`);
    internalSummary = `Nguyên nhân tại khâu phát chiếm ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(phatShare)}% (${phatCount} BG; gồm ${parts.join(', ')}).`;
  }

  return {
    headline,
    hotspotSummary,
    upstreamSummary,
    internalSummary,
  };
}

/**
 * Pure sort helper for route table rows.
 */
export function sortWhyRoutes(routes = [], sortField = 'own_shortfall', sortDirection = 'desc') {
  if (!routes || routes.length === 0) return [];
  const dir = sortDirection === 'asc' ? 1 : -1;

  return [...routes].sort((a, b) => {
    let valA;
    let valB;

    switch (sortField) {
      case 'own_shortfall':
        valA = a.own_shortfall_x10 ?? -1;
        valB = b.own_shortfall_x10 ?? -1;
        break;
      case 'share_of_parent_shortfall':
        valA = a.share_of_parent_shortfall ?? -1;
        valB = b.share_of_parent_shortfall ?? -1;
        break;
      case 'volume':
        valA = a.volume ?? -1;
        valB = b.volume ?? -1;
        break;
      case 'passed':
        valA = a.passed ?? -1;
        valB = b.passed ?? -1;
        break;
      case 'failed':
        valA = a.failed ?? -1;
        valB = b.failed ?? -1;
        break;
      case 'rate':
        valA = a.rate ?? -1;
        valB = b.rate ?? -1;
        break;
      case 'ma_tuyen':
        valA = a.ma_tuyen || a.key || '';
        valB = b.ma_tuyen || b.key || '';
        break;
      case 'ten_tuyen':
        valA = a.ten_tuyen || '';
        valB = b.ten_tuyen || '';
        break;
      default:
        valA = a.own_shortfall_x10 ?? -1;
        valB = b.own_shortfall_x10 ?? -1;
        break;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      const cmp = valA.localeCompare(valB, 'vi');
      return cmp !== 0 ? cmp * dir : (b.volume || 0) - (a.volume || 0);
    }

    const diff = (valA - valB) * dir;
    return diff !== 0 ? diff : (b.volume || 0) - (a.volume || 0);
  });
}

/**
 * Pure sort helper for postman table rows.
 */
export function sortWhyPostmen(postmen = [], sortField = 'own_shortfall', sortDirection = 'desc') {
  if (!postmen || postmen.length === 0) return [];
  const dir = sortDirection === 'asc' ? 1 : -1;

  return [...postmen].sort((a, b) => {
    let valA;
    let valB;

    switch (sortField) {
      case 'own_shortfall':
        valA = a.own_shortfall_x10 ?? -1;
        valB = b.own_shortfall_x10 ?? -1;
        break;
      case 'share_of_parent_shortfall':
        valA = a.share_of_parent_shortfall ?? -1;
        valB = b.share_of_parent_shortfall ?? -1;
        break;
      case 'volume':
        valA = a.volume ?? -1;
        valB = b.volume ?? -1;
        break;
      case 'passed':
        valA = a.passed ?? -1;
        valB = b.passed ?? -1;
        break;
      case 'failed':
        valA = a.failed ?? -1;
        valB = b.failed ?? -1;
        break;
      case 'rate':
        valA = a.rate ?? -1;
        valB = b.rate ?? -1;
        break;
      case 'ma_buu_ta':
        valA = a.ma_buu_ta || '';
        valB = b.ma_buu_ta || '';
        break;
      case 'ten_buu_ta':
        valA = a.ten_buu_ta || '';
        valB = b.ten_buu_ta || '';
        break;
      default:
        valA = a.own_shortfall_x10 ?? -1;
        valB = b.own_shortfall_x10 ?? -1;
        break;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      const cmp = valA.localeCompare(valB, 'vi');
      return cmp !== 0 ? cmp * dir : (b.volume || 0) - (a.volume || 0);
    }

    const diff = (valA - valB) * dir;
    return diff !== 0 ? diff : (b.volume || 0) - (a.volume || 0);
  });
}

// ============================================================================
// F13-PARCEL-CARD-01 U4 (C6): "Vì sao kết luận" box & Lot batch helpers
// ============================================================================

export const SPLIT_WHY_LABELS = Object.freeze({
  T_D_LON_HON_D_A: 'Chặng khai thác dài hơn',
  D_A_LON_HON_T_D: 'Chặng vận chuyển dài hơn',
  HAI_CHANG_CHONG_LAN: 'Hai chặng chồng lấn nhau, chưa tách được',
  THIEU_MOC_D: 'Thiếu mốc rời KTC1, chưa tách được',
  MOC_D_DAO_THU_TU: 'Mốc rời KTC1 sai thứ tự, chưa tách được',
});

export const EVIDENCE_MILESTONE_LABELS = Object.freeze({
  tms: 'Quét TMS',
  depart: 'Rời KTC1',
  arrive: 'Đến BCVH',
  gbt: 'Giao bưu tá',
  ptc: 'Phát thành công',
});

export const MISSING_MILESTONE_WORDS = Object.freeze({
  tms: 'Thiếu mốc quét TMS',
  depart: 'Thiếu mốc rời KTC1',
  arrive: 'Không có giờ xác nhận đến BCVH',
  gbt: 'Thiếu mốc giao bưu tá',
  ptc: 'Thiếu giờ phát',
});

export const EVIDENCE_STAGE_LABELS = Object.freeze({
  t_a: 'Chặng TMS → Đến BCVH',
  t_g: 'Chặng TMS → Giao bưu tá',
  t_e: 'Chặng TMS → Phát',
  t_d: 'Khai thác (TMS → rời KTC1)',
  d_a: 'Vận chuyển (rời KTC1 → đến BCVH)',
});

/**
 * Formats a duration in ms as "14,6 giờ" (comma, one decimal).
 * Missing value reads "không có".
 */
export function formatEvidenceHours(ms) {
  if (ms === null || ms === undefined || ms === '') return 'không có';
  const num = Number(ms);
  if (!Number.isFinite(num)) return 'không có';
  return `${(num / 3600000).toFixed(1).replace('.', ',')} giờ`;
}

/**
 * Formats a timestamp (local-clock ms or 'YYYY-MM-DD HH:MM(:SS)') as "dd/MM HH:mm".
 * Missing value reads "không có".
 */
export function formatEvidenceTime(timeVal) {
  if (timeVal === null || timeVal === undefined || timeVal === '') return 'không có';
  if (typeof timeVal === 'number') {
    if (!Number.isFinite(timeVal)) return 'không có';
    const iso = new Date(timeVal).toISOString();
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m) {
      return `${m[3]}/${m[2]} ${m[4]}:${m[5]}`;
    }
    return 'không có';
  }
  const str = String(timeVal).trim();
  if (!str) return 'không có';
  const m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{1,2})/);
  if (m) {
    const [, , mm, dd, hh, min] = m;
    return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')} ${hh.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  return str;
}

/**
 * Formats remaining time at arrival (ms).
 * - Negative remaining reads "đã quá hạn x,y giờ".
 * - Non-negative remaining reads "x,y giờ".
 * - Missing value reads "không có".
 */
export function formatEvidenceRemaining(ms) {
  if (ms === null || ms === undefined || ms === '') return 'không có';
  const num = Number(ms);
  if (!Number.isFinite(num)) return 'không có';
  if (num < 0) {
    return `đã quá hạn ${(Math.abs(num) / 3600000).toFixed(1).replace('.', ',')} giờ`;
  }
  return `${(num / 3600000).toFixed(1).replace('.', ',')} giờ`;
}

function buildArrivalRemainingLine(prefix, ms) {
  const rem = formatEvidenceRemaining(ms);
  if (ms !== null && ms !== undefined && ms !== '' && Number(ms) < 0) {
    return `${prefix} ${rem}.`;
  }
  return `${prefix} còn ${rem}.`;
}

/**
 * Formats missing and out-of-order milestones in words, optionally with milestone times.
 */
export function formatMissingAndOutOfOrderWords(evidence, { withTimes = false } = {}) {
  if (!evidence) return 'không có';
  const missing = Array.isArray(evidence.missing) ? evidence.missing : [];
  const outOfOrder = Array.isArray(evidence.out_of_order) ? evidence.out_of_order : [];
  const milestones = evidence.milestones || {};

  if (!withTimes) {
    const parts = [
      ...missing.map((k) => MISSING_MILESTONE_WORDS[k] || `Thiếu ${EVIDENCE_MILESTONE_LABELS[k] || k}`),
      ...outOfOrder.map((flag) => formatFlagLabel(flag)),
    ];
    if (parts.length === 0) return 'Chưa đủ chắc chắn quá hạn hay còn hạn';
    return parts.join(', ');
  }

  const issueParts = [
    ...missing.map((k) => `${MISSING_MILESTONE_WORDS[k] || k} (${EVIDENCE_MILESTONE_LABELS[k] || k}: không có)`),
    ...outOfOrder.map((flag) => formatFlagLabel(flag)),
  ];

  const timeParts = ['tms', 'depart', 'arrive', 'gbt', 'ptc'].map((k) => {
    const rawVal = k === 'arrive' ? (milestones.arrive_raw ?? milestones.arrive) : milestones[k];
    return `${EVIDENCE_MILESTONE_LABELS[k]}: ${formatEvidenceTime(rawVal)}`;
  });

  if (issueParts.length > 0) {
    return `${issueParts.join('; ')}. Các mốc: ${timeParts.join(', ')}.`;
  }
  return `Các mốc: ${timeParts.join(', ')}.`;
}

function formatDecisiveStageLine(evidence) {
  if (!evidence) return null;
  const stageKey = evidence.decisive?.stage || evidence.decision?.stage || null;
  const stageObj = evidence.decisive || (stageKey ? evidence.stages?.[stageKey] : null);
  if (!stageKey || !stageObj) return null;

  const label = EVIDENCE_STAGE_LABELS[stageKey] || stageKey;
  const net = formatEvidenceHours(stageObj.net_ms);
  const clock = formatEvidenceHours(stageObj.clock_ms);
  const limit = formatEvidenceHours(stageObj.limit_ms ?? evidence.limit_ms);

  if (stageObj.over_ms !== null && stageObj.over_ms !== undefined && Number(stageObj.over_ms) > 0) {
    return `${label}: ${net} (đồng hồ ${clock}), quá hạn ${formatEvidenceHours(stageObj.over_ms)} (hạn ${limit}).`;
  }
  if (
    stageObj.lower_ms !== null &&
    stageObj.lower_ms !== undefined &&
    stageObj.upper_ms !== null &&
    stageObj.upper_ms !== undefined &&
    stageObj.lower_ms !== stageObj.upper_ms
  ) {
    return `${label}: ${net} (khoảng ${formatEvidenceHours(stageObj.lower_ms)} – ${formatEvidenceHours(stageObj.upper_ms)}, đồng hồ ${clock}, hạn ${limit}).`;
  }
  return `${label}: ${net} (đồng hồ ${clock}, hạn ${limit}).`;
}

export function resolveConclusionLabel(evidence, system = null) {
  if (system?.status === 'CHO_CHUYEN_QUAN' || evidence?.status === 'CHO_CHUYEN_QUAN') {
    return 'Chờ Chuyên quản phân tích';
  }
  if (system?.status === 'CHUA_DU_CAN_CU' || evidence?.status === 'CHUA_DU_CAN_CU') {
    return 'Chưa đủ căn cứ';
  }
  if (system?.label) return system.label;
  const code = evidence?.cause_code || system?.code;
  const detail = evidence?.detail || system?.detail;
  if (code === 'PHAT') {
    if (detail === 'CHAM_GIAO_BUU_TA') return 'Phát - Chậm giao bưu tá';
    if (detail === 'PHAT_CHAM_SAU_GIAO') return 'Phát - Phát chậm sau khi giao';
    return 'Phát (chưa rõ chi tiết)';
  }
  return formatCauseLabel(code);
}

/**
 * Builds the "Vì sao kết luận: <cause label>" box model for the Nguyên nhân tab (§30).
 * Pure function reading `evidence` and `lot` without recomputing any rule.
 */
export function buildWhyConclusion(evidence, lot = null, system = null) {
  if (!evidence || typeof evidence !== 'object') return null;

  const decision = evidence.decision || {};
  const rule = decision.rule || evidence.reason || evidence.cause_code || evidence.status || '';
  const stages = evidence.stages || {};
  const milestones = evidence.milestones || {};
  const clockMs = evidence.clock_ms || {};
  const causeLabel = resolveConclusionLabel(evidence, system);
  const lines = [];

  if (rule === 'DEN_BCVH_QUA_HAN') {
    const t_a = stages.t_a;
    const t_d = stages.t_d;
    const d_a = stages.d_a;
    const why = decision.split?.why;
    const tdLonger =
      why === 'T_D_LON_HON_D_A' ||
      (!why && t_d?.net_ms != null && d_a?.net_ms != null && Number(t_d.net_ms) > Number(d_a.net_ms));
    const daLonger =
      why === 'D_A_LON_HON_T_D' ||
      (!why && t_d?.net_ms != null && d_a?.net_ms != null && Number(d_a.net_ms) > Number(t_d.net_ms));

    lines.push({
      key: 'ta_over',
      stage: 't_a',
      highlight: !tdLonger && !daLonger,
      text: `Bưu gửi đến BCVH đã quá hạn ${formatEvidenceHours(t_a?.over_ms)} (hạn ${formatEvidenceHours(evidence.limit_ms)}).`,
    });
    lines.push({
      key: 'ta_clock_net',
      stage: 't_a',
      highlight: false,
      text: `Từ quét TMS đến BCVH: ${formatEvidenceHours(t_a?.clock_ms)} theo đồng hồ, ${formatEvidenceHours(t_a?.net_ms)} sau khi trừ giờ đêm theo cách tính TCT.`,
    });
    lines.push({
      key: 'leg_td',
      stage: 't_d',
      highlight: tdLonger,
      text: `Khai thác (TMS → rời KTC1): ${formatEvidenceHours(t_d?.net_ms)}`,
    });
    lines.push({
      key: 'leg_da',
      stage: 'd_a',
      highlight: daLonger,
      text: `Vận chuyển (rời KTC1 → đến BCVH): ${formatEvidenceHours(d_a?.net_ms)}`,
    });
    if (why && SPLIT_WHY_LABELS[why]) {
      lines.push({
        key: 'split_why',
        highlight: false,
        text: SPLIT_WHY_LABELS[why],
      });
    }
  } else if (rule === 'KHONG_TRON_LO') {
    const effectiveLot = lot || evidence.lot || null;
    const maLo = effectiveLot?.ma_lo ?? evidence.ma_lo ?? 'không có';
    const tmsBatches =
      effectiveLot?.tms_batches ??
      (Array.isArray(effectiveLot?.batches) ? effectiveLot.batches.length : null) ??
      evidence.tms_batches ??
      'không có';
    const completeAt = formatEvidenceTime(effectiveLot?.complete_at ?? evidence.complete_at);

    lines.push({
      key: 'lot_summary',
      highlight: true,
      text: `Lô ${maLo} về Huế trong ${tmsBatches} đợt quét TMS; lô trọn lúc ${completeAt}.`,
    });

    if (decision.stage === 't_a') {
      lines.push({
        key: 'lot_arrival_remaining',
        stage: 't_a',
        highlight: Number(evidence.remaining_at_arrival_ms) < 0,
        text: buildArrivalRemainingLine('Khi đến BCVH bưu gửi', evidence.remaining_at_arrival_ms),
      });
    }
  } else if (rule === 'PHAT_CHAM_GIAO_BUU_TA') {
    const t_g = stages.t_g;
    const via = decision.via;

    if (via === 'G_NGAY_SAU_NGAY_DEN') {
      lines.push({
        key: 'gbt_next_day',
        stage: 't_g',
        highlight: true,
        text: `Đến BCVH lúc ${formatEvidenceTime(milestones.arrive)} nhưng giao bưu tá lúc ${formatEvidenceTime(milestones.gbt)}, sang ngày hôm sau.`,
      });
    } else {
      lines.push({
        key: 'gbt_over',
        stage: 't_g',
        highlight: true,
        text: `Từ quét TMS đến lúc giao bưu tá: ${formatEvidenceHours(t_g?.net_ms)}, quá hạn ${formatEvidenceHours(t_g?.over_ms)} (hạn ${formatEvidenceHours(evidence.limit_ms)}).`,
      });
    }

    lines.push({
      key: 'gbt_arrival_remaining',
      stage: 't_a',
      highlight: false,
      text: buildArrivalRemainingLine('Khi đến BCVH', evidence.remaining_at_arrival_ms),
    });
  } else if (rule === 'PHAT_SAU_GIAO') {
    const t_g = stages.t_g;
    const t_e = stages.t_e;

    lines.push({
      key: 'gbt_in_time',
      stage: 't_g',
      highlight: false,
      text: `Giao bưu tá trong hạn lúc ${formatEvidenceTime(milestones.gbt)} (${formatEvidenceHours(t_g?.net_ms)}, hạn ${formatEvidenceHours(evidence.limit_ms)}).`,
    });
    lines.push({
      key: 'ptc_after_gbt',
      stage: 'gbt_ptc',
      highlight: true,
      text: `Phát thành công lúc ${formatEvidenceTime(milestones.ptc)}: từ giao đến phát ${formatEvidenceHours(clockMs.gbt_ptc)}.`,
    });
    if (t_e) {
      lines.push({
        key: 'te_total',
        stage: 't_e',
        highlight: true,
        text: `Tổng đến lúc phát ${formatEvidenceHours(t_e.net_ms)}, quá hạn ${formatEvidenceHours(t_e.over_ms)}.`,
      });
    }
  } else if (rule === 'PHAT_KHONG_CHI_TIET') {
    const words = formatMissingAndOutOfOrderWords(evidence, { withTimes: false });
    lines.push({
      key: 'phat_no_detail',
      stage: decision.stage || 't_g',
      highlight: true,
      text: `Chậm ở khâu phát, chưa xác định chi tiết vì: ${words}.`,
    });
  } else if (rule === 'CHI_TIEU') {
    lines.push({
      key: 'no_limit',
      highlight: true,
      text: 'Thiếu chỉ tiêu (hạn phát)',
    });
  } else if (rule === 'KHONG_CO_MOC') {
    lines.push({
      key: 'no_milestone',
      highlight: true,
      text: 'Không có mốc nào dùng được',
    });
  } else {
    // CHO_CHUYEN_QUAN reasons
    const reasonCode = rule || evidence.reason;
    const decisiveLine = formatDecisiveStageLine(evidence);

    lines.push({
      key: 'wait_reason',
      highlight: !decisiveLine,
      text: formatChoChuyenQuanReason(reasonCode),
    });
    lines.push({
      key: 'wait_milestones',
      highlight: false,
      text: formatMissingAndOutOfOrderWords(evidence, { withTimes: true }),
    });
    if (decisiveLine) {
      lines.push({
        key: 'wait_decisive',
        stage: evidence.decisive?.stage || decision.stage,
        highlight: true,
        text: decisiveLine,
      });
    }
  }

  if (evidence.matches_stored === false) {
    lines.push({
      key: 'mismatch_warning',
      isMismatch: true,
      highlight: false,
      text: 'Kết luận đã lưu khác kết quả tính lại, dữ liệu đang được cập nhật.',
    });
  }

  return {
    title: `Vì sao kết luận: ${causeLabel}`,
    causeLabel,
    rule,
    lines,
    fullText: lines.map((l) => l.text).join(' '),
  };
}

/**
 * Resolves lot or batch volume and failed count, falling back to *_in_scope when volume/failed is null (§29, §30).
 */
export function resolveLotCounts(lotOrBatch) {
  if (!lotOrBatch) return { volume: 0, failed: 0 };
  const rawVolume =
    lotOrBatch.volume !== null && lotOrBatch.volume !== undefined
      ? lotOrBatch.volume
      : lotOrBatch.volume_in_scope;
  const rawFailed =
    lotOrBatch.failed !== null && lotOrBatch.failed !== undefined
      ? lotOrBatch.failed
      : lotOrBatch.failed_in_scope;
  return {
    volume: Number(rawVolume) || 0,
    failed: Number(rawFailed) || 0,
  };
}

/**
 * Formats the arrival range (first – last) of a lot batch as "dd/MM HH:mm – dd/MM HH:mm".
 */
export function formatBatchArrivalRange(batch) {
  if (!batch || (!batch.arrive_first && !batch.arrive_last)) return 'không có';
  const first = formatEvidenceTime(batch.arrive_first);
  const last = formatEvidenceTime(batch.arrive_last);
  if (!batch.arrive_first) return last;
  if (!batch.arrive_last || first === last) return first;
  return `${first} – ${last}`;
}

/**
 * Builds the query parameters for `/evidence/list` when clicking a batch's parcel count (§30 C6.3).
 */
export function buildLotBatchQuery(lot, batch, extra = {}) {
  if (!lot || !batch) return { ...extra };
  const query = {
    view: 'journey',
    ma_lo: lot.ma_lo,
    tms_batch: batch.tms,
  };
  if (lot.period?.from) query.from = lot.period.from;
  if (lot.period?.to) query.to = lot.period.to;
  return { ...query, ...extra };
}
