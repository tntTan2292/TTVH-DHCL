/**
 * Pure helpers for F1.3 Cause Analysis (F13-WHY-UI-01)
 *
 * Rules:
 * - Never recompute business rules, shortfalls or rates from scratch; read pre-calculated figures from API.
 * - Format cleanly according to Vietnamese locale.
 * - Provide natural language diagnostic summary for Chuyên quản and Giám đốc BCVH.
 */

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
 * Returns a 1-sentence plain-language summary of the leading cause of a route.
 */
export function summarizeRouteMainCause(route) {
  if (!route) return '—';
  if (route.failed === 0) return '100% đạt chỉ tiêu';

  const mix = route.cause_mix;
  if (!mix) return `${route.failed} bưu gửi không đạt`;

  const lines = mix.lines || [];
  // Sort lines by count descending
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
    const parts = [];
    if (chamGiao > 0) parts.push(`${chamGiao} chậm giao`);
    if (phatCham > 0) parts.push(`${phatCham} phát chậm`);
    const detailStr = parts.length > 0 ? ` (${parts.join(', ')})` : ` (${phatCount} BG)`;
    return `Khâu phát chiếm ${formatSharePercent(phat.share)}${detailStr}`;
  }

  // Check other primary causes (Khai thác, Vận chuyển, etc.)
  if (topLine && topLine.count > 0) {
    return `${topLine.label} chiếm ${formatSharePercent(topLine.share)} (${topLine.count} BG)`;
  }

  if (choChuyenQuan > 0) {
    const reasons = Object.keys(mix.cho_chuyen_quan?.by_reason || {});
    const reasonText = reasons.length > 0 ? `: ${reasons.join(', ')}` : '';
    return `Chờ Chuyên quản phân tích (${choChuyenQuan} BG${reasonText})`;
  }

  return `${route.failed} bưu gửi chưa rõ chi tiết`;
}

/**
 * Builds the natural language diagnostic story for a BCVH.
 */
export function generateBcvhDiagnosticStory({ bcvhRow, postmanRoutes = [], periodLabel = '' }) {
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

  const bcvhName = ten_bcvh.startsWith('BCVH ') ? ten_bcvh : `BCVH ${ten_bcvh}`;
  const periodText = periodLabel ? `Trong ${periodLabel}, ` : '';

  // 1. Headline
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
    upstreamSummary = `Nguyên nhân khách quan trước bưu cục chiếm ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(upstreamShare)}% số không đạt (${upstreamTotal} / ${failed} BG; gồm ${details.join(', ')}).`;
  }

  // 4. Internal delivery causes
  const phatCount = cause_mix?.phat?.count || 0;
  let internalSummary = '';
  if (phatCount > 0 && failed > 0) {
    const phatShare = (phatCount / failed) * 100;
    const chamGiao = cause_mix?.phat?.by_detail?.CHAM_GIAO_BUU_TA || 0;
    const phatCham = cause_mix?.phat?.by_detail?.PHAT_CHAM_SAU_GIAO || 0;
    internalSummary = `Nguyên nhân tại khâu phát chiếm ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(phatShare)}% (${phatCount} BG; gồm ${chamGiao} bưu gửi chậm giao bưu tá và ${phatCham} bưu gửi phát chậm sau khi giao).`;
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
