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

export {
  HEADER_VOLUME,
  HEADER_RATE_NO_TMS,
  HEADER_COMPARE_N1,
  HEADER_COMPARE_N7,
  NOTE_N_DAY,
  rateHeader,
  monthCompareHeader,
};

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
 * Extract target route and converted search query when switching time axis pages.
 */
export function resolveTargetPageParams({
  _currentPage,
  targetPage,
  currentParams,
  resolveData,
}) {
  const bcvh = currentParams.get('bcvh') || currentParams.get('ma_bcvh') || currentParams.get('bcvh_id') || 'all';
  const nextParams = new URLSearchParams();

  if (bcvh && bcvh !== 'all') {
    nextParams.set('bcvh', bcvh);
  }

  if (targetPage === 'ngay') {
    const day = resolveData?.day || currentParams.get('from') || currentParams.get('to') || '';
    if (day) {
      nextParams.set('from', day);
      nextParams.set('to', day);
    }
  } else if (targetPage === 'tuan') {
    const weekId = resolveData?.week?.week_id || currentParams.get('week') || '';
    if (weekId) {
      nextParams.set('week', weekId);
    }
  } else if (targetPage === 'thang') {
    const monthId = resolveData?.month?.month_id || currentParams.get('month') || '';
    if (monthId) {
      nextParams.set('month', monthId);
    }
  }

  const query = nextParams.toString();
  return {
    path: `/f13/v2/${targetPage}`,
    search: query ? `?${query}` : '',
    fullPath: `/f13/v2/${targetPage}${query ? `?${query}` : ''}`,
  };
}
