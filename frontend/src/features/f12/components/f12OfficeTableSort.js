import { sortRowsBy, nextSortState } from '../../../components/common/tableSort.js';

export { nextSortState };

/**
 * Filter office table rows by search term across unit and office names/codes.
 * Returns { filteredRows, filteredUnranked, autoExpandedKeys }.
 */
export function filterOfficeTableRows(rows = [], unranked = [], search = '') {
  const q = String(search || '').trim().toLowerCase();
  if (!q) {
    return {
      filteredRows: rows,
      filteredUnranked: unranked,
      autoExpandedKeys: new Set(),
    };
  }

  const autoExpandedKeys = new Set();

  const filterList = (list) => {
    return list.filter((unit) => {
      const unitCode = String(unit.ma_huyen || '').toLowerCase();
      const unitName = String(unit.ten_huyen || '').toLowerCase();
      const unitMatch = unitCode.includes(q) || unitName.includes(q);

      const matchingOffices = (unit.offices || []).filter((off) => {
        const offCode = String(off.ma_chap_nhan || '').toLowerCase();
        const offName = String(off.ten_chap_nhan || '').toLowerCase();
        return offCode.includes(q) || offName.includes(q);
      });

      if (matchingOffices.length > 0) {
        autoExpandedKeys.add(unit.ma_huyen);
        return true;
      }
      return unitMatch;
    });
  };

  return {
    filteredRows: filterList(rows),
    filteredUnranked: filterList(unranked),
    autoExpandedKeys,
  };
}

/**
 * Sort unit rows while keeping child offices attached.
 */
export function sortOfficeUnits(rows = [], sortField = null, sortDirection = 'asc') {
  if (!sortField) return rows;
  return sortRowsBy(rows, sortField, sortDirection);
}
