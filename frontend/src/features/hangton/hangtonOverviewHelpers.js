// Pure helpers for HangTonOverviewTab (executive triage, hot-spot ranking, customer breakdown).
// The triage only states figures: no advice and no assumed cause or commitment (those are business rules for the PO).
import { tonRank, formatCurrency, formatNumber } from './hangtonLevels.js';
import { sortCustomerGroups } from './hangtonCustomers.js';

const finiteOrNull = (value) => (Number.isFinite(Number(value)) && value !== null && value !== undefined ? Number(value) : null);
const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

/**
 * Top offices by aged stock (>= 5 days).
 * pctOfOffice  = share of the office's own stock that is 5 days and more (n_ge5 / n)
 * pctOfTotal   = share of ALL the 5-days-and-more stock that sits in this office (n_ge5 / totalGe5)
 * codGe5       = COD of the 5-days-and-more parcels only (null when the API did not send it)
 * cod          = COD of the whole office stock
 * (pctGe5 is kept as the old name of pctOfTotal)
 * @param {Array} byOffice - overview API: [{ office, n, cod, n_ge5, cod_ge5 }]
 * @param {number} totalGe5 - all 5-days-and-more parcels in the scope
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
      return {
        office: o.office,
        n,
        n_ge5: nGe5,
        cod: Number(o.cod) || 0,
        codGe5: finiteOrNull(o.cod_ge5),
        pctOfOffice: pct(nGe5, n).toFixed(1),
        pctOfTotal: pct(nGe5, totalGe5).toFixed(1),
        pctGe5: pct(nGe5, totalGe5).toFixed(1),
      };
    });
}

/**
 * Customer groups with their 5-days-and-more stock and COD, in the handling order.
 * @param {Array} byCustomer - unfiltered groups from the overview: [{ customer_class, n, cod, n_ge5, cod_ge5 }]
 * @param {Array} selectedCustomers - selected groups ([] = all)
 */
export function buildCustomerBreakdown(byCustomer = [], selectedCustomers = []) {
  if (!Array.isArray(byCustomer)) return [];
  const sorted = sortCustomerGroups(byCustomer);
  const totalParcels = sorted.reduce((sum, c) => sum + (Number(c.n) || 0), 0);
  return sorted.map((c) => {
    const n = Number(c.n) || 0;
    return {
      customer_class: c.customer_class,
      n,
      n_ge5: Number(c.n_ge5) || 0,
      cod: Number(c.cod) || 0,
      codGe5: finiteOrNull(c.cod_ge5),
      pct: pct(n, totalParcels).toFixed(1),
      isSelected: selectedCustomers.length > 0 && selectedCustomers.includes(c.customer_class),
    };
  });
}

/**
 * The nine Loại Tồn levels (always all nine, whatever the chart shows) with count, share of the stock and COD.
 * @param {Array} byLevel - overview API: [{ ton_level, ton_rank, n, cod }]
 * @param {Array} levels - the levels in ascending order
 */
export function buildLevelRows(byLevel = [], levels = []) {
  const total = (Array.isArray(byLevel) ? byLevel : []).reduce((sum, r) => sum + (Number(r.n) || 0), 0);
  return levels.map((level) => {
    const item = (byLevel || []).find((b) => b.ton_level === level);
    const count = item ? Number(item.n) || 0 : 0;
    return {
      level,
      rank: tonRank(level),
      count,
      pct: pct(count, total).toFixed(1),
      cod: item ? Number(item.cod) || 0 : 0,
    };
  });
}

/**
 * Figures an executive reads first. Every line is a statement of numbers; the customer line follows the selected
 * groups (or all groups when none is selected).
 */
export function computeExecutiveTriage({ overview, compare, selectedCustomers = [] }) {
  const total = Number(overview?.total) || 0;
  const ge5 = Number(overview?.ge5) || 0;
  const byOffice = overview?.by_office || [];
  const byCustomer = overview?.by_customer || [];
  const byLevel = overview?.by_level || [];

  let ge7Count = 0;
  let ge14Count = 0;
  let codGe5 = 0;
  for (const row of byLevel) {
    const rank = tonRank(row.ton_level);
    const n = Number(row.n) || 0;
    if (rank >= 5) codGe5 += Number(row.cod) || 0;
    if (rank >= 7) ge7Count += n;
    if (rank >= 14) ge14Count += n;
  }

  const topOffices = buildTopOfficesOverview(byOffice, ge5, 3);
  const worstOffice = topOffices[0] || null;

  const inScope = buildCustomerBreakdown(byCustomer, selectedCustomers)
    .filter((c) => selectedCustomers.length === 0 || c.isSelected);
  const worstCustomer = [...inScope].filter((c) => c.n_ge5 > 0).sort((a, b) => b.n_ge5 - a.n_ge5)[0] || null;

  const codText = (value) => (value === null ? '' : `, COD ${formatCurrency(value)}`);
  const actionPoints = [];

  if (ge7Count > 0) {
    actionPoints.push({
      level: ge14Count > 0 ? 'critical' : 'warning',
      badge: ge14Count > 0 ? 'Tồn ≥14 ngày' : 'Tồn ≥7 ngày',
      text: ge14Count > 0
        ? `${formatNumber(ge7Count)} bưu gửi tồn ≥7 ngày, trong đó ${formatNumber(ge14Count)} bưu gửi tồn ≥14 ngày.`
        : `${formatNumber(ge7Count)} bưu gửi tồn ≥7 ngày.`,
    });
  }

  if (worstOffice && worstOffice.n_ge5 > 0) {
    actionPoints.push({
      level: 'action',
      badge: 'Bưu cục nhiều tồn nặng nhất',
      text: `${worstOffice.office}: ${formatNumber(worstOffice.n_ge5)} bưu gửi tồn ≥5 ngày${codText(worstOffice.codGe5)}; chiếm ${worstOffice.pctOfTotal}% tồn ≥5 ngày.`,
    });
  }

  if (worstCustomer) {
    actionPoints.push({
      level: 'customer',
      badge: 'Nhóm KH nhiều tồn nặng nhất',
      text: `${worstCustomer.customer_class}: ${formatNumber(worstCustomer.n_ge5)} bưu gửi tồn ≥5 ngày${codText(worstCustomer.codGe5)}.`,
    });
  }

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
