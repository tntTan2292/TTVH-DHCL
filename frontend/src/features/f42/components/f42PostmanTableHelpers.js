import { sortRowsBy } from '../../../components/common/tableSort.js';
import { CANONICAL_BCVH_UNITS } from '../../dashboard/components/bcvhOperationTableData.js';

export const POSTMAN_SORT_FIELD_LABELS = Object.freeze({
  rank: 'Hạng',
  ma_buu_ta: 'Mã bưu tá',
  ten_buu_ta: 'Tên bưu tá',
  volume: 'Sản lượng',
  passed: 'Đạt',
  failed: 'Không đạt',
  rate: 'Tỷ lệ',
});

/**
 * Format sort description in Vietnamese for table caption / banner.
 */
export function formatSortCaption(sort) {
  if (!sort || !sort.field) return '';
  const label = POSTMAN_SORT_FIELD_LABELS[sort.field] || sort.field;
  const dir = sort.direction === 'asc' ? 'tăng dần' : 'giảm dần';
  return `sắp xếp theo ${label}, ${dir}`;
}

/**
 * Compute next sort state on column click:
 * First click on 'rank' or text fields starts 'asc'; numeric fields start 'desc'.
 * Clicking the active column flips the direction.
 */
export function getNextPostmanSort(current, field) {
  if (current && current.field === field) {
    return { field, direction: current.direction === 'desc' ? 'asc' : 'desc' };
  }
  const startAsc = field === 'rank' || field === 'ma_buu_ta' || field === 'ten_buu_ta';
  return { field, direction: startAsc ? 'asc' : 'desc' };
}

/**
 * Slice units and postmen for capture so total postmen rows across the whole table <= captureLimit.
 * Units with 0 remaining quota have their postmen sliced to 0.
 */
export function sliceUnitsForCapture(units = [], captureLimit = 25) {
  if (!Array.isArray(units)) return [];
  if (captureLimit === 'all' || typeof captureLimit !== 'number' || captureLimit <= 0) {
    return units;
  }

  let remainingQuota = captureLimit;
  const result = [];

  for (const unit of units) {
    const postmen = Array.isArray(unit.filteredPostmen) ? unit.filteredPostmen : [];
    if (remainingQuota <= 0) {
      result.push({
        ...unit,
        filteredPostmen: [],
      });
      continue;
    }
    const takeCount = Math.min(postmen.length, remainingQuota);
    remainingQuota -= takeCount;
    result.push({
      ...unit,
      filteredPostmen: postmen.slice(0, takeCount),
    });
  }

  return result;
}

/**
 * Extract daily BCVH records from backend response without synthesizing missing canonical units.
 */
export function extractDailyBcvhUnits(dailyRows = []) {
  if (!Array.isArray(dailyRows)) return [];
  return dailyRows.map((row) => {
    const canonical = CANONICAL_BCVH_UNITS.find((c) => c.ma_bcvh === String(row.ma_bcvh));
    const ten_bcvh = row.ten_bcvh || canonical?.ten_bcvh || `BCVH ${row.ma_bcvh}`;
    const volume = Number(row.volume || 0);
    const passed = Number(row.passed || 0);
    const failed = Number(row.failed || 0);
    const rate = row.rate !== null && row.rate !== undefined
      ? Number(row.rate)
      : (volume > 0 ? Number(((passed / volume) * 100).toFixed(2)) : null);

    return {
      ma_bcvh: String(row.ma_bcvh),
      ten_bcvh,
      volume,
      passed,
      failed,
      rate,
    };
  });
}

/**
 * Remove Vietnamese accents/diacritics for flexible search.
 */
export function removeDiacritics(str = '') {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Check if a postman matches search query by name or code.
 */
export function matchesPostmanSearch(postman, query = '') {
  const q = removeDiacritics(query);
  if (!q) return true;
  const code = removeDiacritics(postman?.ma_buu_ta);
  const name = removeDiacritics(postman?.ten_buu_ta);
  return code.includes(q) || name.includes(q);
}

/**
 * Filter and sort postmen for a single BCVH block.
 */
export function processPostmanList(postmen = [], {
  search = '',
  belowTargetOnly = false,
  targetRate = 90,
  sort = null,
} = {}) {
  if (!Array.isArray(postmen)) return [];

  // Filter
  const filtered = postmen.filter((p) => {
    if (!matchesPostmanSearch(p, search)) return false;
    if (belowTargetOnly) {
      if (p.rate === null || p.rate === undefined || p.rate >= targetRate) {
        return false;
      }
    }
    return true;
  });

  // Sort
  if (!sort || !sort.field) return filtered;

  return sortRowsBy(filtered, sort.field, sort.direction);
}

/**
 * Derive "Bưu tá cần chú ý" from postman table payload.
 * Postmen under targetRate with most failed parcels, top N (default 10).
 * Unrated parcels count as failed (already calculated by backend in `failed = volume - passed`).
 */
export function deriveAttentionPostmen(units = [], {
  targetRate = 90,
  limit = 10,
  maBcvh = 'all',
} = {}) {
  if (!Array.isArray(units)) return [];

  const scopedUnits = maBcvh && maBcvh !== 'all'
    ? units.filter((u) => String(u.ma_bcvh) === String(maBcvh))
    : units;

  const candidates = [];
  for (const unit of scopedUnits) {
    if (!Array.isArray(unit?.postmen)) continue;
    for (const postman of unit.postmen) {
      if (!postman || Number(postman.volume || 0) <= 0) continue;
      const rate = postman.rate !== null && postman.rate !== undefined ? Number(postman.rate) : null;
      if (rate !== null && rate < targetRate) {
        candidates.push({
          ...postman,
          ma_bcvh: unit.ma_bcvh,
          ten_bcvh: unit.ten_bcvh,
          rank_in_bcvh: postman.rank,
        });
      }
    }
  }

  // Sort: failed desc (most failed first), then rate asc, then volume desc, then code asc
  candidates.sort((a, b) => {
    const diffFailed = Number(b.failed || 0) - Number(a.failed || 0);
    if (diffFailed !== 0) return diffFailed;

    const rateA = a.rate ?? 0;
    const rateB = b.rate ?? 0;
    if (rateA !== rateB) return rateA - rateB;

    const diffVol = Number(b.volume || 0) - Number(a.volume || 0);
    if (diffVol !== 0) return diffVol;

    return String(a.ma_buu_ta || '').localeCompare(String(b.ma_buu_ta || ''));
  });

  return candidates.slice(0, limit);
}

/**
 * Format human-readable period label for display.
 */
export function formatPeriodHeader(period = 'day', { anchorDate, fromDate, toDate } = {}) {
  if (period === 'day') {
    const d = anchorDate || toDate;
    if (!d) return 'Hôm nay';
    const [y, m, day] = d.split('-');
    return `Ngày ${day}/${m}/${y}`;
  }
  if (period === 'week') {
    if (fromDate && toDate) {
      const [, fm, fd] = fromDate.split('-');
      const [ty, tm, td] = toDate.split('-');
      return `Tuần (${fd}/${fm} – ${td}/${tm}/${ty})`;
    }
    return 'Tuần này';
  }
  if (period === 'month') {
    const d = anchorDate || toDate;
    if (!d) return 'Tháng này';
    const [y, m] = d.split('-');
    return `Tháng ${m}/${y}`;
  }
  return 'Kỳ báo cáo';
}
