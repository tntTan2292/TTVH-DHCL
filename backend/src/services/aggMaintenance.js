'use strict';

/**
 * aggMaintenance.js - PERF-LOAD-01 Phase 2 (design: docs/04_TECHNICAL_PLANNING/Feature/
 * PERF-LOAD-01_PHASE2_DESIGN_PROPOSAL.md sections 3-4).
 *
 * The agg_*_day tables are DERIVED data: one row per (day, unit[, route/pair]) holding raw counters
 * of the detail table. Nothing here changes a business number; the read side (later steps) turns the
 * counters back into the existing formulas.
 *
 * Maintenance rule: never add up, always "rebuild exactly this day from the detail rows". The
 * rebuild is idempotent and is called inside the import transaction, just before COMMIT.
 */

// Counter columns shared by F4.1 / F1.1 / F1.2 (the evaluation column name differs per indicator).
function evaluationCounters(column) {
    return `
        COUNT(*)                                                                    AS n_rows,
        SUM(CASE WHEN ${column} = 'Đạt' THEN 1 ELSE 0 END)                          AS n_dat,
        SUM(CASE WHEN ${column} = 'Không đạt' THEN 1 ELSE 0 END)                    AS n_khong_dat,
        SUM(CASE WHEN ${column} IS NULL OR TRIM(${column}) = '' THEN 1 ELSE 0 END)  AS n_blank`;
}

// keyColumns identify an agg row (inside a day); nameColumns are carried as MAX() like the readers do.
const AGG_DEFINITIONS = {
    'F1.3': {
        factTable: 'fact_f13',
        aggTable: 'agg_f13_day',
        keyColumns: ['ma_bcvh', 'ma_tuyen'],
        nameColumns: ['ten_bcvh', 'ten_tuyen', 'loai_tuyen_phat'],
        counterSql: `
        COUNT(*)                                                                          AS n_rows,
        COUNT(ma_bg)                                                                      AS n_bg,
        SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END)                            AS n_dat,
        SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END)                      AS n_khong_dat,
        SUM(CASE WHEN danh_gia_2026 IS NULL OR TRIM(danh_gia_2026) = '' THEN 1 ELSE 0 END) AS n_blank,
        SUM(CASE WHEN thoi_gian_nop_tien IS NOT NULL AND TRIM(thoi_gian_nop_tien) != '' THEN 1 ELSE 0 END) AS n_nop_tien`,
        counterColumns: ['n_rows', 'n_bg', 'n_dat', 'n_khong_dat', 'n_blank', 'n_nop_tien'],
    },
    'F4.1': {
        factTable: 'fact_f41',
        aggTable: 'agg_f41_day',
        keyColumns: ['ma_bc_phat'],
        nameColumns: ['ten_bc_phat'],
        counterSql: evaluationCounters('danh_gia_co_tms_ptc_8h'),
        counterColumns: ['n_rows', 'n_dat', 'n_khong_dat', 'n_blank'],
    },
    'F1.1': {
        factTable: 'fact_f11',
        aggTable: 'agg_f11_day',
        keyColumns: ['ma_bc_chap_nhan', 'ma_bc_phat'],
        nameColumns: ['ten_bc_chap_nhan', 'ten_bc_phat'],
        counterSql: evaluationCounters('danh_gia_2026'),
        counterColumns: ['n_rows', 'n_dat', 'n_khong_dat', 'n_blank'],
    },
    'F1.2': {
        factTable: 'fact_f12',
        aggTable: 'agg_f12_day',
        keyColumns: ['ma_huyen', 'ma_bc_chap_nhan'],
        nameColumns: ['ten_huyen', 'ten_bc_chap_nhan'],
        counterSql: evaluationCounters('danh_gia'),
        counterColumns: ['n_rows', 'n_dat', 'n_khong_dat', 'n_blank'],
    },
};

function getDefinition(indicator) {
    const def = AGG_DEFINITIONS[indicator];
    if (!def) throw new Error(`aggMaintenance: unknown indicator ${indicator}`);
    return def;
}

// SELECT producing the agg rows of ONE day. The same text feeds the rebuild and the verify tool, so
// "what is stored" and "what is checked" cannot drift apart.
function buildAggSelectSql(indicator, whereSql = 'ngay_do_kiem = ?') {
    const def = getDefinition(indicator);
    const keys = def.keyColumns.join(', ');
    const names = def.nameColumns.map((c) => `MAX(${c}) AS ${c}`).join(', ');
    return `SELECT ngay_do_kiem, ${keys}, ${names},${def.counterSql}
        FROM ${def.factTable}
        WHERE ${whereSql}
        GROUP BY ngay_do_kiem, ${keys}`;
}

function aggColumnList(indicator) {
    const def = getDefinition(indicator);
    return ['ngay_do_kiem', ...def.keyColumns, ...def.nameColumns, ...def.counterColumns];
}

const provisionedTables = new Set();

async function isAggProvisioned(getFn, indicator) {
    const { aggTable } = getDefinition(indicator);
    if (provisionedTables.has(aggTable)) return true;
    const row = await getFn(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, [aggTable]);
    if (row) provisionedTables.add(aggTable);
    return Boolean(row);
}

/**
 * Rebuild one day of one indicator inside the CALLER's transaction.
 * @param {(sql: string, params?: any[]) => Promise<any>} runFn  resolves with an object carrying `changes`
 * @param {(sql: string, params?: any[]) => Promise<any>} getFn
 * @returns {Promise<{skipped: boolean, rows?: number}>} skipped=true when the agg table does not exist yet
 *   (database not migrated): the read side then keeps using the detail table.
 */
async function rebuildAggForDate(runFn, getFn, indicator, ngayDoKiem) {
    const def = getDefinition(indicator);
    if (!(await isAggProvisioned(getFn, indicator))) return { skipped: true };

    await runFn(`DELETE FROM ${def.aggTable} WHERE ngay_do_kiem = ?`, [ngayDoKiem]);
    const columns = aggColumnList(indicator).join(', ');
    const result = await runFn(
        `INSERT INTO ${def.aggTable} (${columns}) ${buildAggSelectSql(indicator)}`,
        [ngayDoKiem]
    );
    return { skipped: false, rows: result && result.changes !== undefined ? result.changes : null };
}

module.exports = {
    AGG_DEFINITIONS,
    aggColumnList,
    buildAggSelectSql,
    getDefinition,
    isAggProvisioned,
    rebuildAggForDate,
};
