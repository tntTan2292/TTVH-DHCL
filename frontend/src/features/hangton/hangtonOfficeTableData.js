// HANGTON-INVENTORY-01 Phase 3: Pure data transformer and sorter for the "Theo bưu cục" table.
// Decisions:
// D5: Show only offices that have stock (API already filters for these).
// D10: Alert per level, heavier from >=5 ngày up.
// D12: Single snapshot data, compare columns from compare endpoint.

import { TON_LEVELS, tonRank, formatSlot } from './hangtonLevels.js';
import { compareSortValues } from '../../components/common/tableSort.js';

// Columns of the office table: office + visible levels + (Tổng, ≥5, COD) + 3 comparison columns.
export function officeTableColumnCount(shownLevelCount) {
  return 1 + shownLevelCount + 3 + 3;
}

// Hiding the level a table is ordered by would leave it ordered by a column nobody sees: fall back to the default.
export function sortAfterHide(sort, hiddenLevels = []) {
  if (sort && hiddenLevels.includes(sort.field)) return { field: 'total', direction: 'desc' };
  return sort;
}

/**
 * What a click on a number of the office table lists (PO 2026-10-19: the parcels behind the figure).
 * kind 'level': that one level; 'total': every shown level; 'ge5': the shown levels of 5 days and more.
 * office null = the TỔNG CỘNG row (every office).
 */
export function drillDownFilter({ office = null, kind = 'total', level = null, shownLevels = TON_LEVELS } = {}) {
  let levels;
  let what;
  if (kind === 'level') {
    levels = [level];
    what = level;
  } else if (kind === 'ge5') {
    levels = shownLevels.filter((lvl) => (tonRank(lvl) ?? 0) >= 5);
    what = 'Tồn ≥5 ngày';
  } else {
    levels = [...shownLevels];
    what = shownLevels.length === TON_LEVELS.length ? 'Tổng tồn' : 'Tổng tồn (các mức đang hiển thị)';
  }
  return { office: office || null, levels, title: `${office || 'Toàn BĐT TP Huế'} — ${what}` };
}

/**
 * Header of the three comparison columns: names the snapshot they are measured against and says what they count.
 * compare = { from: { business_date: 'YYYY-MM-DD', slot: '0730' }, summary, ... } or null (no base snapshot yet).
 */
export function compareColumnsHeader(compare) {
  const from = compare?.from;
  const note = 'tính trên mọi mức tồn, không theo cột đang hiện';
  if (!from || !from.business_date) return { title: 'Biến động: chưa có mốc so sánh', note };
  const [year, month, day] = String(from.business_date).split('-');
  const date = day && month ? `${day}/${month}${year ? `/${year}` : ''}` : from.business_date;
  const slot = from.slot ? ` ${formatSlot(from.slot)}` : '';
  return { title: `Biến động so với ${date}${slot}`, note };
}

export const OFFICE_TABLE_TEXT_FIELDS = Object.freeze(['office']);

/**
 * Builds table rows for the "Theo bưu cục" tab.
 * @param {Array} byOffice - from overview API [{ office, n, cod, n_ge5 }]
 * @param {Array} byOfficeLevel - from overview API [{ office, ton_level, ton_rank, n }]
 * @param {Array} compareByOffice - from compare API [{ office, change, n }]
 * @returns {Array} rows ready for display and sorting
 */
export function buildOfficeTableRows(byOffice = [], byOfficeLevel = [], compareByOffice = []) {
  if (!Array.isArray(byOffice) || byOffice.length === 0) return [];

  // Index level counts by office + ton_level
  const levelMap = new Map();
  const codMap = new Map();
  for (const entry of byOfficeLevel || []) {
    if (!entry?.office) continue;
    const key = `${entry.office}:::${entry.ton_level}`;
    levelMap.set(key, (levelMap.get(key) || 0) + (Number(entry.n) || 0));
    codMap.set(key, (codMap.get(key) || 0) + (Number(entry.cod) || 0));
  }

  // Index compare changes by office: resolved, aged_up, new
  const compareMap = new Map();
  for (const comp of compareByOffice || []) {
    if (!comp?.office) continue;
    if (!compareMap.has(comp.office)) {
      compareMap.set(comp.office, { resolved: 0, aged_up: 0, new: 0 });
    }
    const current = compareMap.get(comp.office);
    if (comp.change === 'resolved') current.resolved += Number(comp.n) || 0;
    else if (comp.change === 'aged_up') current.aged_up += Number(comp.n) || 0;
    else if (comp.change === 'new') current.new += Number(comp.n) || 0;
  }

  return byOffice.map((off) => {
    const officeName = off.office || 'Chưa xác định';
    const row = {
      office: officeName,
      total: Number(off.n) || 0,
      cod: Number(off.cod) || 0,
      ge5: Number(off.n_ge5) || 0,
    };

    // Fill each ton_level count (and its COD, so totals can follow the visible levels)
    row.codByLevel = {};
    for (const lvl of TON_LEVELS) {
      const count = levelMap.get(`${officeName}:::${lvl}`) || 0;
      row[lvl] = count;
      row.codByLevel[lvl] = codMap.get(`${officeName}:::${lvl}`) || 0;
    }

    // If ge5 wasn't calculated from backend, compute it directly
    if (row.ge5 === 0) {
      row.ge5 = TON_LEVELS
        .filter((lvl) => (tonRank(lvl) ?? 0) >= 5)
        .reduce((sum, lvl) => sum + (row[lvl] || 0), 0);
    }

    // Attach compare values
    const compData = compareMap.get(officeName) || { resolved: 0, aged_up: 0, new: 0 };
    row.resolved = compData.resolved;
    row.aged_up = compData.aged_up;
    row.new = compData.new;

    return row;
  });
}

/**
 * Re-computes Tổng tồn, Tồn ≥5 ngày and Tiền COD of every row from the levels that are shown, and drops the
 * offices that have no stock left in those levels (PO 2026-10-19: hiding columns must change the totals too).
 * The comparison columns (đã xử lý / tăng loại / mới vào) are not split by level and stay as they are.
 * With every level shown the rows are returned unchanged.
 */
export function applyVisibleLevels(rows = [], shownLevels = TON_LEVELS) {
  if (shownLevels.length === TON_LEVELS.length) return rows;
  return rows
    .map((row) => {
      let total = 0;
      let ge5 = 0;
      let cod = 0;
      for (const lvl of shownLevels) {
        const count = Number(row[lvl]) || 0;
        total += count;
        if ((tonRank(lvl) ?? 0) >= 5) ge5 += count;
        cod += Number(row.codByLevel?.[lvl]) || 0;
      }
      return { ...row, total, ge5, cod };
    })
    .filter((row) => row.total > 0);
}

/**
 * Calculates sum totals row across all offices.
 * The totals row never moves during sorting.
 */
export function calculateOfficeTotals(rows = []) {
  const totals = {
    office: 'TỔNG CỘNG',
    total: 0,
    ge5: 0,
    cod: 0,
    resolved: 0,
    aged_up: 0,
    new: 0,
  };

  for (const lvl of TON_LEVELS) {
    totals[lvl] = 0;
  }

  for (const r of rows) {
    totals.total += Number(r.total) || 0;
    totals.ge5 += Number(r.ge5) || 0;
    totals.cod += Number(r.cod) || 0;
    totals.resolved += Number(r.resolved) || 0;
    totals.aged_up += Number(r.aged_up) || 0;
    totals.new += Number(r.new) || 0;

    for (const lvl of TON_LEVELS) {
      totals[lvl] += Number(r[lvl]) || 0;
    }
  }

  return totals;
}

/**
 * Stable sorting of office rows by field and direction.
 */
export function sortOfficeRows(rows = [], sort = { field: 'total', direction: 'desc' }) {
  if (!Array.isArray(rows) || rows.length <= 1) return rows;
  const { field, direction = 'desc' } = sort;
  if (!field) return rows;

  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const valA = a.row[field];
      const valB = b.row[field];
      const diff = compareSortValues(valA, valB, direction);
      return diff !== 0 ? diff : a.index - b.index;
    })
    .map((entry) => entry.row);
}
