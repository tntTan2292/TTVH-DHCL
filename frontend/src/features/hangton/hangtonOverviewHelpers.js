// Pure helpers for HangTonOverviewTab (executive triage, hot-spot ranking, customer breakdown)
import { tonRank, formatCurrency, formatNumber } from './hangtonLevels.js';
import { sortCustomerGroups } from './hangtonCustomers.js';

/**
 * Computes top offices by aged stock (>= 5 days).
 * @param {Array} byOffice - array from overview API: [{ office, n, cod, n_ge5 }]
 * @param {number} totalGe5 - total ge5 parcels in Hue
 * @param {number} limit - maximum offices to return
 */
export function buildTopOfficesOverview(byOffice = [], totalGe5 = 0, limit = 5) {
  if (!Array.isArray(byOffice)) return [];
  return [...byOffice]
    .filter((o) => (Number(o?.n) || 0) > 0)
    .sort((a, b) => {
      const dGe5 = (Number(b?.n_ge5) || 0) - (Number(a?.n_ge5) || 0);
      if (dGe5 !== 0) return dGe5;
      return (Number(b?.n) || 0) - (Number(a?.n) || 0);
    })
    .slice(0, limit)
    .map((o) => {
      const n = Number(o.n) || 0;
      const nGe5 = Number(o.n_ge5) || 0;
      const cod = Number(o.cod) || 0;
      const pctGe5 = totalGe5 > 0 ? ((nGe5 / totalGe5) * 100).toFixed(1) : '0.0';
      return {
        office: o.office,
        n,
        n_ge5: nGe5,
        cod,
        pctGe5,
      };
    });
}

/**
 * Builds customer groups breakdown with ge5 counts and COD.
 * @param {Array} byCustomer - unfiltered customer groups from overview: [{ customer_class, n, cod, n_ge5 }]
 * @param {Array} selectedCustomers - currently selected customer groups ([] = all)
 */
export function buildCustomerBreakdown(byCustomer = [], selectedCustomers = []) {
  if (!Array.isArray(byCustomer)) return [];
  const sorted = sortCustomerGroups(byCustomer);
  const totalParcels = sorted.reduce((sum, c) => sum + (Number(c.n) || 0), 0);

  return sorted.map((c) => {
    const n = Number(c.n) || 0;
    const nGe5 = Number(c.n_ge5) || 0;
    const cod = Number(c.cod) || 0;
    const pct = totalParcels > 0 ? ((n / totalParcels) * 100).toFixed(1) : '0.0';
    const isSelected = selectedCustomers.length > 0 && selectedCustomers.includes(c.customer_class);

    return {
      customer_class: c.customer_class,
      n,
      n_ge5: nGe5,
      cod,
      pct,
      isSelected,
    };
  });
}

/**
 * Computes actionable executive triage insights based on snapshot overview & compare data.
 * Answers the executive's core operational questions:
 * 1. Where is heavy stock concentrated?
 * 2. Which customer group is at risk?
 * 3. Which office to mobilize first?
 * 4. What are the dynamics vs base snapshot?
 */
export function computeExecutiveTriage({ overview, compare, selectedCustomers = [] }) {
  const total = Number(overview?.total) || 0;
  const ge5 = Number(overview?.ge5) || 0;
  const byOffice = overview?.by_office || [];
  const byCustomer = overview?.by_customer || [];
  const byLevel = overview?.by_level || [];

  // 1. Critical aged parcels (>= 7 days and >= 14 days)
  let ge7Count = 0;
  let ge14Count = 0;
  let codGe5 = 0;
  for (const row of byLevel) {
    const rank = tonRank(row.ton_level);
    const n = Number(row.n) || 0;
    const cod = Number(row.cod) || 0;
    if (rank >= 5) {
      codGe5 += cod;
    }
    if (rank >= 7) {
      ge7Count += n;
    }
    if (rank >= 14) {
      ge14Count += n;
    }
  }

  // 2. Top office by ge5
  const topOffices = buildTopOfficesOverview(byOffice, ge5, 3);
  const worstOffice = topOffices[0] || null;

  // 3. Top customer group by ge5
  const customerBreakdown = buildCustomerBreakdown(byCustomer, selectedCustomers);
  const worstCustomer = [...customerBreakdown]
    .filter((c) => c.n_ge5 > 0)
    .sort((a, b) => b.n_ge5 - a.n_ge5)[0] || null;

  // 4. Action priorities (Khuyến nghị hành động khẩn cấp)
  const actionPoints = [];

  if (ge14Count > 0) {
    actionPoints.push({
      level: 'critical',
      badge: 'Báo động đỏ',
      text: `Có ${formatNumber(ge14Count)} bưu gửi tồn ≥14 ngày cần rà soát khẩn cấp ngay trong ca để phát dứt điểm hoặc vu hồi.`,
    });
  } else if (ge7Count > 0) {
    actionPoints.push({
      level: 'warning',
      badge: 'Cảnh báo cao',
      text: `Có ${formatNumber(ge7Count)} bưu gửi tồn ≥7 ngày — yêu cầu bưu cục kiểm tra nguyên nhân phát không thành công.`,
    });
  }

  if (worstOffice && worstOffice.n_ge5 > 0) {
    actionPoints.push({
      level: 'action',
      badge: 'Bưu cục dồn tải',
      text: `${worstOffice.office} chiếm ${worstOffice.pctGe5}% tồn ≥5 ngày (${formatNumber(worstOffice.n_ge5)} bưu gửi, COD ${formatCurrency(worstOffice.cod)}). Cần ưu tiên điều phối nhân lực xử lý.`,
    });
  }

  if (worstCustomer && worstCustomer.n_ge5 > 0) {
    actionPoints.push({
      level: 'customer',
      badge: 'Khách hàng trọng điểm',
      text: `Nhóm ${worstCustomer.customer_class} đang có ${formatNumber(worstCustomer.n_ge5)} bưu gửi tồn ≥5 ngày (COD ${formatCurrency(worstCustomer.cod)}). Cần liên hệ bộ phận chăm sóc KH xử lý tránh vi phạm cam kết SLA.`,
    });
  }

  // Stock dynamics vs base
  const agedUp = compare?.summary?.aged_up;
  const newParcels = compare?.summary?.new;
  const resolved = compare?.summary?.resolved;

  return {
    total,
    ge5,
    ge7Count,
    ge14Count,
    codGe5,
    topOffices,
    worstOffice,
    worstCustomer,
    agedUp: Number.isFinite(agedUp) ? agedUp : null,
    newParcels: Number.isFinite(newParcels) ? newParcels : null,
    resolved: Number.isFinite(resolved) ? resolved : null,
    actionPoints,
  };
}
