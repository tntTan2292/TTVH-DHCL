'use strict';

/**
 * aggSqlSource.js - PERF-LOAD-01 Phase 2: the ONE place that translates the counting expressions of the
 * detail table into the equivalent expressions over the pre-aggregated day table
 * (design section 5.2 conversion table). A repository builds its SQL once from a "source"; the same
 * text then runs against either relation and returns the same rows.
 *
 *   count(cond)   detail: COUNT(*)  | SUM(CASE WHEN cond THEN 1 ELSE 0 END)
 *                 agg:    COALESCE(SUM(n_rows), 0) | SUM(CASE WHEN cond THEN n_rows ELSE 0 END)
 *   passed(cond)  rows evaluated 'Đạt' (optionally also matching cond)
 *   failed()      NOT passed (blank evaluation counts as not passed - dashboard rule)
 *   strictFailed  evaluated 'Không đạt'
 *   blank         evaluation NULL or empty
 *   name()        MAX(name column)
 *
 * NB: an ungrouped SUM over zero rows is NULL on both sides, COUNT(*) is 0 on both sides (hence the COALESCE).
 */

function makeSources({ factTable, aggTable, evaluationColumn, nameColumn }) {
    const passedCond = `${evaluationColumn} = 'Đạt'`;

    const fact = {
        kind: 'fact',
        table: factTable,
        count: (cond) => (cond ? `SUM(CASE WHEN ${cond} THEN 1 ELSE 0 END)` : 'COUNT(*)'),
        passed: (cond) => `SUM(CASE WHEN ${cond ? `${cond} AND ` : ''}${passedCond} THEN 1 ELSE 0 END)`,
        failed: () => `SUM(CASE WHEN ${passedCond} THEN 0 ELSE 1 END)`,
        strictFailed: () => `SUM(CASE WHEN ${evaluationColumn} = 'Không đạt' THEN 1 ELSE 0 END)`,
        blank: () => `SUM(CASE WHEN ${evaluationColumn} IS NULL OR TRIM(${evaluationColumn}) = '' THEN 1 ELSE 0 END)`,
        name: () => `MAX(${nameColumn})`,
    };

    const agg = {
        kind: 'agg',
        table: aggTable,
        count: (cond) => (cond ? `SUM(CASE WHEN ${cond} THEN n_rows ELSE 0 END)` : 'COALESCE(SUM(n_rows), 0)'),
        passed: (cond) => (cond ? `SUM(CASE WHEN ${cond} THEN n_dat ELSE 0 END)` : 'SUM(n_dat)'),
        failed: () => 'SUM(n_rows) - SUM(n_dat)',
        strictFailed: () => 'SUM(n_khong_dat)',
        blank: () => 'SUM(n_blank)',
        name: () => `MAX(${nameColumn})`,
    };

    return { fact, agg };
}

module.exports = { makeSources };
