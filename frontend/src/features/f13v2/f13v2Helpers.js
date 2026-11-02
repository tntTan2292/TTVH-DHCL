/**
 * Pure helpers for the time-axis F1.3 module (F13-V2-STRUCTURE-01).
 * All functions are deterministic and unit-tested without browser dependencies.
 */

import {
  HEADER_VOLUME,
  HEADER_RATE_NO_TMS,
  HEADER_COMPARE_N1,
  HEADER_COMPARE_N7,
  NOTE_N_DAY,
  rateHeader,
  monthCompareHeader,
} from '../indicator/columnHeaders.js';
import { sortRowsBy } from '../../components/common/tableSort.js';

export {
  HEADER_VOLUME,
  HEADER_RATE_NO_TMS,
  HEADER_COMPARE_N1,
  HEADER_COMPARE_N7,
  NOTE_N_DAY,
  rateHeader,
  monthCompareHeader,
};

/** A range table is drawn only when the filter holds at least two days. */
export function isDateRange(fromDate, toDate) {
  return Boolean(fromDate && toDate && fromDate !== toDate);
}

function rangeCompareRow(row) {
  const samePeriod = row?.compare?.same_period || {};
  return {
    ma_bcvh: row?.ma_bcvh,
    ten_bcvh: row?.ten_bcvh,
    volume: row?.volume ?? null,
    rate: row?.rate ?? null,
    same_period_volume: samePeriod.volume ?? null,
    same_period_rate: samePeriod.rate ?? null,
    same_period_delta: samePeriod.rate_delta ?? null,
  };
}

/**
 * Rows of the range comparison table from GET /f13/v2/day/summary: best rate first, or the clicked column; missing
 * values last, the total apart so it never moves (a BCVH-mode account gets no total).
 */
export function buildRangeCompareModel(data, sort = null) {
  const rows = (data?.rows || []).map(rangeCompareRow);
  const ordered = sort
    ? sortRowsBy(rows, sort.field, sort.direction)
    : sortRowsBy(rows, 'rate', 'desc');
  return {
    rows: ordered.map((row, index) => ({ ...row, stt: index + 1 })),
    totalRow: data?.meta?.total_row ? rangeCompareRow(data.meta.total_row) : null,
    samePeriod: data?.meta?.compare?.same_period || null,
  };
}

/**
 * Check if a block ID is included in a page's layout configuration for the current caller.
 * Layout response from GET /api/f13/v2/layout: { pages: [ { id, blocks: [ { id } ] } ] }
 */
export function isBlockVisible(layout, pageId, blockId) {
  if (!layout || !Array.isArray(layout.pages)) return false;
  const page = layout.pages.find((p) => p.id === pageId);
  if (!page || !Array.isArray(page.blocks)) return false;
  return page.blocks.some((b) => b.id === blockId);
}

/**
 * Format volume number with vi-VN grouping.
 */
export function formatVolume(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
  return Number(val).toLocaleString('vi-VN');
}

/**
 * Format quality rate percentage (1 decimal place).
 */
export function formatRate(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
  return `${Number(val).toFixed(1)}%`;
}

/**
 * Format rate delta with explicit +/- sign.
 */
export function formatRateDelta(delta) {
  if (delta === null || delta === undefined || Number.isNaN(Number(delta))) return null;
  const num = Number(delta);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
}

/**
 * Format volume delta with explicit +/- sign.
 */
export function formatVolumeDelta(delta) {
  if (delta === null || delta === undefined || Number.isNaN(Number(delta))) return null;
  const num = Number(delta);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toLocaleString('vi-VN')}`;
}

/**
 * Resolve nested object property value safely.
 */
export function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => (acc === null || acc === undefined ? undefined : acc[part]), obj);
}

/**
 * Stable sort for Day Summary rows.
 * Null/undefined always go last regardless of direction.
 * Equal values retain original insertion order.
 */
export function sortDaySummaryRows(rows, sortField, sortDirection = 'asc') {
  if (!Array.isArray(rows)) return [];
  if (!sortField) return [...rows];

  const indexed = rows.map((row, index) => ({ row, index }));

  indexed.sort((a, b) => {
    const valA = getNestedValue(a.row, sortField);
    const valB = getNestedValue(b.row, sortField);

    const aMissing = valA === null || valA === undefined || valA === '';
    const bMissing = valB === null || valB === undefined || valB === '';

    if (aMissing && bMissing) return a.index - b.index;
    if (aMissing) return 1;
    if (bMissing) return -1;

    let diff = 0;
    if (typeof valA === 'string' && typeof valB === 'string') {
      diff = valA.localeCompare(valB, 'vi', { sensitivity: 'base' });
    } else {
      diff = Number(valA) - Number(valB);
    }

    if (diff !== 0) {
      return sortDirection === 'desc' ? -diff : diff;
    }
    return a.index - b.index;
  });

  return indexed.map((item) => item.row);
}

/**
 * Classify rate tone for badge/text display (F1.3 target 90%).
 */
export function classifyRateTone(rate, target = 90) {
  if (rate === null || rate === undefined || Number.isNaN(Number(rate))) return 'neutral';
  const num = Number(rate);
  if (num >= target) return 'success';
  if (num >= 85) return 'warning';
  return 'danger';
}

/**
 * Classify delta tone (positive is good/success, negative is warning/danger).
 */
export function classifyDeltaTone(delta) {
  if (delta === null || delta === undefined || Number.isNaN(Number(delta))) return 'neutral';
  const num = Number(delta);
  if (num > 0) return 'success';
  if (num < 0) return 'danger';
  return 'neutral';
}

/**
 * Extract target route and search query when switching time axis pages.
 * PO decision 2026-11-02 (Item 0): no date/week/month period conversion across page links.
 * Each page opens the latest period with data when it has no period param in URL.
 * Only `bcvh` is carried over between pages.
 */
export function resolveTargetPageParams({
  _currentPage,
  targetPage,
  currentParams,
}) {
  const bcvh = currentParams?.get?.('bcvh') || currentParams?.get?.('ma_bcvh') || currentParams?.get?.('bcvh_id') || 'all';
  const nextParams = new URLSearchParams();

  if (bcvh && bcvh !== 'all') {
    nextParams.set('bcvh', bcvh);
  }

  const query = nextParams.toString();
  return {
    path: `/f13/v2/${targetPage}`,
    search: query ? `?${query}` : '',
    fullPath: `/f13/v2/${targetPage}${query ? `?${query}` : ''}`,
  };
}

/**
 * Find the period immediately preceding the selected period (options sorted newest first).
 */
export function findPrecedingOption(options, currentValue) {
  if (!Array.isArray(options) || options.length === 0) return null;
  const index = options.findIndex((opt) => (opt?.value ?? opt) === currentValue);
  if (index === -1) {
    return options.length > 1 ? options[1] : options[0];
  }
  if (index + 1 < options.length) {
    return options[index + 1];
  }
  return options[index];
}

/**
 * Build scoped unit list based on layout contract and metadata.
 * If layout load fails or allow_all !== true, does NOT default to all units.
 */
export function buildScopedUnitOptions({ layout, metaUnits = [] }) {
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
    return metaUnits.map((u) => ({
      value: u.ma_bcvh,
      label: u.ten_bcvh ? `${u.ten_bcvh} (${u.ma_bcvh})` : `BCVH ${u.ma_bcvh}`,
      ma_bcvh: u.ma_bcvh,
      ten_bcvh: u.ten_bcvh || `BCVH ${u.ma_bcvh}`,
    }));
  }

  return [];
}
