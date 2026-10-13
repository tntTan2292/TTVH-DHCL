'use strict';

/**
 * aggSqlSource.js - PERF-LOAD-01 Phase 2: the ONE place that translates the counting expressions of the
 * detail table into the equivalent expressions over the pre-aggregated day table
 * (design section 5.2 conversion table). A repository builds its SQL once from a "source"; the same
 * text then runs against either relation and returns the same rows.
 *
 *   count(cond)   the indicator's volume (optionally restricted by cond)
 *   rows()        raw row count (COUNT(*)), for the few series that count rows rather than parcels
 *   passed(cond)  rows evaluated 'Đạt' (optionally also matching cond)
 *   failed()      dashboard "failed": NOT passed (blank evaluation counts as not passed)   [failedMode 'notPassed']
 *                 or strictly 'Không đạt'                                                  [failedMode 'strict']
 *   strictFailed  evaluated 'Không đạt'
 *   blank         evaluation NULL or empty
 *   nopTien       payment time present (F1.3 only; needs aggregate column n_nop_tien)
 *   name()        MAX(name column)
 *
 * options:
 *   countNotNullColumn  when the volume is COUNT(<col>) (F1.3: ma_bg) the aggregate keeps it in n_bg
 *   failedMode          'notPassed' (default; F4.1/F1.1/F1.2) | 'strict' (F1.3)
 *
 * NB: an ungrouped SUM over zero rows is NULL on both sides, a COUNT is 0 on both sides (hence COALESCE).
 */

function makeSources({ factTable, aggTable, evaluationColumn, nameColumn, countNotNullColumn = null, failedMode = 'notPassed' }) {
    const passedCond = `${evaluationColumn} = 'Đạt'`;
    const strictCond = `${evaluationColumn} = 'Không đạt'`;
    const notNull = countNotNullColumn ? `${countNotNullColumn} IS NOT NULL` : null;
    const volumeColumn = countNotNullColumn ? 'n_bg' : 'n_rows';

    const andAll = (...parts) => parts.filter(Boolean).join(' AND ');

    const fact = {
        kind: 'fact',
        table: factTable,
        count: (cond) => {
            if (!cond) return countNotNullColumn ? `COUNT(${countNotNullColumn})` : 'COUNT(*)';
            return `SUM(CASE WHEN ${andAll(cond, notNull)} THEN 1 ELSE 0 END)`;
        },
        rows: () => 'COUNT(*)',
        passed: (cond) => `SUM(CASE WHEN ${andAll(cond, notNull, passedCond)} THEN 1 ELSE 0 END)`,
        strictFailed: () => `SUM(CASE WHEN ${strictCond} THEN 1 ELSE 0 END)`,
        failed: () => (failedMode === 'strict'
            ? `SUM(CASE WHEN ${strictCond} THEN 1 ELSE 0 END)`
            : `SUM(CASE WHEN ${passedCond} THEN 0 ELSE 1 END)`),
        blank: () => `SUM(CASE WHEN ${evaluationColumn} IS NULL OR TRIM(${evaluationColumn}) = '' THEN 1 ELSE 0 END)`,
        nopTien: () => "SUM(CASE WHEN thoi_gian_nop_tien IS NOT NULL AND TRIM(thoi_gian_nop_tien) != '' THEN 1 ELSE 0 END)",
        name: () => `MAX(${nameColumn})`,
    };

    const agg = {
        kind: 'agg',
        table: aggTable,
        count: (cond) => (cond ? `SUM(CASE WHEN ${cond} THEN ${volumeColumn} ELSE 0 END)` : `COALESCE(SUM(${volumeColumn}), 0)`),
        rows: () => 'COALESCE(SUM(n_rows), 0)',
        // With a NOT NULL column (ma_bg) every detail row satisfies `col IS NOT NULL`, so n_dat is exact.
        passed: (cond) => (cond ? `SUM(CASE WHEN ${cond} THEN n_dat ELSE 0 END)` : 'SUM(n_dat)'),
        strictFailed: () => 'SUM(n_khong_dat)',
        failed: () => (failedMode === 'strict' ? 'SUM(n_khong_dat)' : 'SUM(n_rows) - SUM(n_dat)'),
        blank: () => 'SUM(n_blank)',
        nopTien: () => 'SUM(n_nop_tien)',
        name: () => `MAX(${nameColumn})`,
    };

    return { fact, agg };
}

module.exports = { makeSources };
