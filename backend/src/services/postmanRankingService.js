/**
 * postmanRankingService — F13-ROUTE-POSTMAN-IDENTITY-01 Phase 2 (Design of
 * Record v2 §5, §8). Resolves `postmen[]` / `postman_status` for a set of
 * route codes anchored to ONE evaluation date (D2) — never aggregated
 * across a period, never borrowed from a neighbouring date.
 *
 * Join rules (§5.1), normalized (TRIM+UPPER) at write time on both sides
 * so no normalization is needed inside this query:
 *   fact_f13(ngay_do_kiem, ma_tuyen) -> network_delivery_point(ngay_phat, route_po_code)
 *   network_delivery_point.postman_code -> dm_buu_ta.ma_buu_ta (the ONLY key used for a name)
 *   dm_buu_ta.ma_bcvh vs network_delivery_point.ma_bcvh -> cross-check only (bcvh_mismatch flag)
 *
 * One grouped query per request for the anchor date (Design Review R2) —
 * never one query per route.
 */

'use strict';

const { all } = require('../config/db');

async function hasAnyDataForDate(anchorDate) {
    if (!anchorDate) return false;
    const row = await all('SELECT 1 AS x FROM network_delivery_point WHERE ngay_phat = ? LIMIT 1', [anchorDate]);
    return row.length > 0;
}

/**
 * @param {string} anchorDate ISO date (D2 anchor — the single evaluation date)
 * @param {string[]} routeCodes route_po_code / ma_tuyen values to resolve
 * @returns {Promise<{ postmanAnchorDate: string, byRoute: Map<string, { status: string, postmen: Array }> }>}
 */
async function resolvePostmenForRoutes(anchorDate, routeCodes) {
    const byRoute = new Map();
    const uniqueCodes = [...new Set((routeCodes || []).filter(Boolean).map((c) => String(c).trim().toUpperCase()))];

    if (!anchorDate || uniqueCodes.length === 0) {
        uniqueCodes.forEach((code) => byRoute.set(code, { status: 'NO_BF_FOR_DATE', postmen: [] }));
        return { postmanAnchorDate: anchorDate || null, byRoute };
    }

    const dateHasData = await hasAnyDataForDate(anchorDate);
    if (!dateHasData) {
        uniqueCodes.forEach((code) => byRoute.set(code, { status: 'NO_BF_FOR_DATE', postmen: [] }));
        return { postmanAnchorDate: anchorDate, byRoute };
    }

    const placeholders = uniqueCodes.map(() => '?').join(',');
    const rows = await all(
        `SELECT UPPER(TRIM(dp.route_po_code)) AS route_po_code,
                UPPER(TRIM(dp.postman_code)) AS ma_buu_ta,
                d.ten_buu_ta AS ten_buu_ta,
                COUNT(*) AS item_count,
                MAX(CASE WHEN d.ma_bcvh IS NOT NULL AND dp.ma_bcvh IS NOT NULL
                         AND UPPER(TRIM(dp.ma_bcvh)) != UPPER(TRIM(d.ma_bcvh)) THEN 1 ELSE 0 END) AS bcvh_mismatch
         FROM network_delivery_point dp
         LEFT JOIN dm_buu_ta d ON UPPER(TRIM(dp.postman_code)) = d.ma_buu_ta
         WHERE dp.ngay_phat = ? AND UPPER(TRIM(dp.route_po_code)) IN (${placeholders})
         GROUP BY route_po_code, ma_buu_ta
         ORDER BY item_count DESC, ma_buu_ta ASC`,
        [anchorDate, ...uniqueCodes],
    );

    rows.forEach((row) => {
        if (!byRoute.has(row.route_po_code)) {
            byRoute.set(row.route_po_code, { status: 'OK', postmen: [] });
        }
        byRoute.get(row.route_po_code).postmen.push({
            ma_buu_ta: row.ma_buu_ta,
            ten_buu_ta: row.ten_buu_ta || null,
            item_count: row.item_count,
            name_status: row.ten_buu_ta ? 'NAMED' : 'UNNAMED',
            bcvh_mismatch: Boolean(row.bcvh_mismatch),
        });
    });

    uniqueCodes.forEach((code) => {
        if (!byRoute.has(code)) byRoute.set(code, { status: 'ROUTE_NOT_IN_BF', postmen: [] });
    });

    return { postmanAnchorDate: anchorDate, byRoute };
}

module.exports = { resolvePostmenForRoutes, hasAnyDataForDate };
