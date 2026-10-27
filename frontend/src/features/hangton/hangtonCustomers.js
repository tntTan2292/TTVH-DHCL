// HANGTON-INVENTORY-01: customer groups ("Phân Loại KH"). TCT runs the stock group by group, so the whole
// module can be limited to one or several groups. Pure helpers (no React).
import { TON_LEVELS } from './hangtonLevels.js';

// Groups in the order the leader handles them first (key accounts first, ordinary customers last).
export const CUSTOMER_ORDER = Object.freeze(['KH Trọng điểm', 'KHL2', 'KH Shopee', 'KH Tiktok', 'KH Mới', 'KH Thường']);

// Chart colours of the groups when several are compared (stacked): distinct hues, none of the red stock-age scale.
export const CUSTOMER_COLORS = Object.freeze({
  'KH Trọng điểm': '#BE185D',
  KHL2: '#CA8A04',
  'KH Shopee': '#EA580C',
  'KH Tiktok': '#0D9488',
  'KH Mới': '#2563EB',
  'KH Thường': '#64748B',
});
const FALLBACK_COLOR = '#475569';

export function customerColor(name) {
  return CUSTOMER_COLORS[name] || FALLBACK_COLOR;
}

function orderIndex(name) {
  const i = CUSTOMER_ORDER.indexOf(name);
  return i === -1 ? CUSTOMER_ORDER.length : i;
}

// Rows with a customer_class, in the handling order; unknown groups last, A-Z.
export function sortCustomerGroups(rows = []) {
  return [...rows].sort((a, b) => {
    const d = orderIndex(a.customer_class) - orderIndex(b.customer_class);
    return d !== 0 ? d : String(a.customer_class).localeCompare(String(b.customer_class), 'vi');
  });
}

export function toggleCustomer(selected = [], name) {
  return selected.includes(name) ? selected.filter((c) => c !== name) : [...selected, name];
}

// Stored selection: strings only, no duplicates, and (when the groups of the snapshot are known) only known ones.
export function sanitizeSelectedCustomers(value, known = null) {
  if (!Array.isArray(value)) return [];
  const list = [...new Set(value.filter((v) => typeof v === 'string' && v.trim() !== ''))];
  return Array.isArray(known) ? list.filter((v) => known.includes(v)) : list;
}

// "|"-joined parameter of the API (empty = every group).
export function customersParam(selected = []) {
  return selected.length > 0 ? selected.join('|') : undefined;
}

// Warning shown while the module is limited to some groups (every figure then covers those groups only); null = no filter.
export function customerFilterNotice(selected = []) {
  if (!Array.isArray(selected) || selected.length === 0) return null;
  return `Đang lọc theo nhóm KH: ${selected.join(', ')} — mọi số liệu trên các màn hình Hàng tồn chỉ tính riêng nhóm này, chưa phải toàn bộ.`;
}

// 0 or 1 group selected: the stock-age chart in red; 2 or more: one stacked series per selected group.
export function chartMode(selected = []) {
  return selected.length >= 2 ? 'groups' : 'levels';
}

// Rows of the stacked chart: one object per Loại Tồn level with a count per group, plus the series list.
export function buildCustomerChart(byLevelCustomer = [], selected = [], levels = TON_LEVELS) {
  const groups = sortCustomerGroups(selected.map((c) => ({ customer_class: c }))).map((g) => g.customer_class);
  const counts = new Map();
  for (const r of byLevelCustomer) counts.set(`${r.ton_level}:::${r.customer_class}`, Number(r.n) || 0);
  const data = TON_LEVELS.filter((level) => levels.includes(level)).map((level) => {
    const row = { level, total: 0 };
    for (const g of groups) {
      const n = counts.get(`${level}:::${g}`) || 0;
      row[g] = n;
      row.total += n;
    }
    return row;
  });
  return { data, series: groups.map((g) => ({ key: g, color: customerColor(g) })) };
}
