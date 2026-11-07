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

// F13-WHY-DATA-03: label of a data-quality flag (only the flags that need a sentence; others show their code).
export const FLAG_LABELS = Object.freeze({
  A_TRUOC_TMS_GIAO_TRUC_TIEP: 'Giao nhận trực tiếp ĐTC1: đến BCVH trước giờ quét TMS, chặng TMS -> đến tính 0',
});

export function formatFlagLabel(code) {
  if (!code) return '—';
  return FLAG_LABELS[code] || String(code);
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
  if (!story || !story.main) {
    const fallback = summarizeRouteLegacyCause(route);
    return {
      mainText: fallback,
      hintText: '',
      fullText: fallback,
      toString() { return this.fullText; },
    };
  }

  const parts = [];

  // 1. Main cause
  const main = story.main;
  const mainLabel = formatStoryCauseLabel(main.code, main.label);
  const mainShare = formatSharePercent(main.share);

  if (main.code === 'KHONG_TRON_LO' && Array.isArray(story.lot) && story.lot.length > 0) {
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
