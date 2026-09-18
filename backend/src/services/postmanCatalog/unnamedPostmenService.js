/**
 * unnamedPostmenService — F13-ROUTE-POSTMAN-IDENTITY-01 Phase 1 (Design of
 * Record v2 §9). Computed live from network_delivery_point minus dm_buu_ta
 * — never a cached/stale table. Per PO request: Mã bưu tá, dominant Mã/Tên
 * BCVH, top routes by volume, first/last delivery date + months covered,
 * and total delivery-point count (sản lượng), sorted by volume descending.
 */

'use strict';

const { all } = require('../../config/db');
const { normalizeCode } = require('./postmanCatalogImport');

const TOP_ROUTES_LIMIT = 5;

function buildDateFilter(fromDate, toDate) {
    const clauses = [];
    const params = [];
    if (fromDate) { clauses.push('ngay_phat >= ?'); params.push(fromDate); }
    if (toDate) { clauses.push('ngay_phat <= ?'); params.push(toDate); }
    return { clause: clauses.length ? `AND ${clauses.join(' AND ')}` : '', params };
}

async function listUnnamedPostmen({ from_date: fromDate, to_date: toDate, ma_bcvh: maBcvh } = {}) {
    const { clause: dateClause, params: dateParams } = buildDateFilter(fromDate, toDate);
    const bcvhClause = maBcvh ? 'AND UPPER(TRIM(ma_bcvh)) = ?' : '';
    const bcvhParams = maBcvh ? [String(maBcvh).trim().toUpperCase()] : [];

    const baseWhere = `
        WHERE postman_code IS NOT NULL AND TRIM(postman_code) != ''
        AND UPPER(TRIM(postman_code)) NOT IN (SELECT ma_buu_ta FROM dm_buu_ta)
        ${dateClause} ${bcvhClause}
    `;

    const [volumeRows, bcvhRows, routeRows, monthRows] = await Promise.all([
        all(
            `SELECT UPPER(TRIM(postman_code)) AS code, COUNT(*) AS san_luong,
                    MIN(ngay_phat) AS first_date, MAX(ngay_phat) AS last_date
             FROM network_delivery_point ${baseWhere}
             GROUP BY code`,
            [...dateParams, ...bcvhParams],
        ),
        all(
            `SELECT UPPER(TRIM(postman_code)) AS code, ma_bcvh, COUNT(*) AS c
             FROM network_delivery_point ${baseWhere}
             GROUP BY code, ma_bcvh`,
            [...dateParams, ...bcvhParams],
        ),
        all(
            `SELECT UPPER(TRIM(postman_code)) AS code, route_po_code, COUNT(*) AS c
             FROM network_delivery_point ${baseWhere}
             GROUP BY code, route_po_code`,
            [...dateParams, ...bcvhParams],
        ),
        all(
            `SELECT UPPER(TRIM(postman_code)) AS code, substr(ngay_phat, 1, 7) AS thang
             FROM network_delivery_point ${baseWhere}
             GROUP BY code, thang`,
            [...dateParams, ...bcvhParams],
        ),
    ]);

    const bcvhByCode = new Map();
    bcvhRows.forEach((r) => {
        const list = bcvhByCode.get(r.code) || [];
        list.push(r);
        bcvhByCode.set(r.code, list);
    });

    const routesByCode = new Map();
    routeRows.forEach((r) => {
        const list = routesByCode.get(r.code) || [];
        list.push(r);
        routesByCode.set(r.code, list);
    });

    const monthsByCode = new Map();
    monthRows.forEach((r) => {
        const list = monthsByCode.get(r.code) || [];
        if (r.thang) list.push(r.thang);
        monthsByCode.set(r.code, list);
    });

    const result = volumeRows.map((row) => {
        const bcvhList = (bcvhByCode.get(row.code) || []).sort((a, b) => b.c - a.c);
        const routeList = (routesByCode.get(row.code) || []).sort((a, b) => b.c - a.c);
        const months = (monthsByCode.get(row.code) || []).sort();

        return {
            ma_buu_ta: row.code,
            san_luong: row.san_luong,
            ky_xuat_hien: {
                first_date: row.first_date,
                last_date: row.last_date,
                thang_covered: months,
            },
            ma_bcvh_chinh: bcvhList[0]?.ma_bcvh ?? null,
            co_nhieu_bcvh: bcvhList.length > 1,
            cac_tuyen_thuong_phat: routeList.slice(0, TOP_ROUTES_LIMIT).map((r) => ({ route_po_code: r.route_po_code, item_count: r.c })),
        };
    });

    result.sort((a, b) => b.san_luong - a.san_luong);
    return result;
}

module.exports = { listUnnamedPostmen, normalizeCode };
