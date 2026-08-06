/**
 * NetworkMapController — NETWORK-MANAGEMENT-001.
 *
 * Provides the authenticated read-API for the three independent Quản lý
 * mạng lưới screens (Mạng điểm phục vụ, Mạng đường thư cấp 2, Sơ đồ tuyến
 * phát). Import/Export/History/Rollback live in NetworkImportController.js
 * (Phase 3).
 */

const { all } = require('../config/db');

function sendSuccess(res, data, meta) {
    const payload = { success: true, data };
    if (meta !== undefined) {
        payload.meta = meta;
    }
    return res.json(payload);
}

function sendError(res, status, code, message) {
    return res.status(status).json({
        success: false,
        error: { code, message },
    });
}

// GET /api/network-map/service-points
async function listServicePoints(req, res) {
    try {
        const rows = await all('SELECT * FROM network_service_point ORDER BY ma_diem ASC');
        return sendSuccess(res, rows);
    } catch (error) {
        return sendError(res, 500, 'INTERNAL_ERROR', error.message);
    }
}

// GET /api/network-map/level2-routes
async function listLevel2Routes(req, res) {
    try {
        const routes = await all('SELECT * FROM network_level2_route ORDER BY id ASC');
        const stops = await all('SELECT * FROM network_level2_route_stop ORDER BY route_id ASC, seq ASC');

        const stopsByRoute = new Map();
        for (const stop of stops) {
            if (!stopsByRoute.has(stop.route_id)) {
                stopsByRoute.set(stop.route_id, []);
            }
            stopsByRoute.get(stop.route_id).push(stop);
        }

        const data = routes.map((route) => ({
            ...route,
            stops: stopsByRoute.get(route.id) || [],
        }));

        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, 500, 'INTERNAL_ERROR', error.message);
    }
}

// GET /api/network-map/delivery-routes/meta[?ngay=][&ma_bcvh=]
//
// PO Gate 3 remediation §4 (locked semantics): `ngay_phat` is the business
// date used for calendar availability, min/max, the date list, and every
// delivery-route filter. `ngay_nhap_phat`/`thoi_gian_nhap_phat` are used
// ONLY to order records within an already-selected `ngay_phat`, never to
// decide which dates/months are selectable. A record whose `ngay_phat` is
// June but whose actual `ngay_nhap_phat` scan time drifted into July must
// still be classified as belonging to June, and must never make a July
// calendar day/month appear available.
async function getDeliveryRoutesMeta(req, res) {
    const { ngay, ma_bcvh } = req.query;

    try {
        const dates = await all(
            `SELECT DISTINCT ngay_phat AS ngay_display
             FROM network_delivery_point
             WHERE ngay_phat IS NOT NULL
             ORDER BY ngay_display DESC`,
        );
        const meta = { dates: dates.map((row) => row.ngay_display) };

        if (ngay) {
            const bcvhList = await all(
                `SELECT DISTINCT ma_bcvh
                 FROM network_delivery_point
                 WHERE ngay_phat = ?
                   AND ma_bcvh IS NOT NULL
                 ORDER BY ma_bcvh ASC`,
                [ngay],
            );
            meta.bcvh = bcvhList.map((row) => row.ma_bcvh);
        } else {
            const bcvhList = await all(
                'SELECT DISTINCT ma_bcvh FROM network_delivery_point WHERE ma_bcvh IS NOT NULL ORDER BY ma_bcvh ASC',
            );
            meta.bcvh = bcvhList.map((row) => row.ma_bcvh);
        }

        if (ngay && ma_bcvh) {
            const postmanList = await all(
                `SELECT DISTINCT postman_code
                 FROM network_delivery_point
                 WHERE ngay_phat = ?
                   AND ma_bcvh = ?
                   AND postman_code IS NOT NULL
                 ORDER BY postman_code ASC`,
                [ngay, ma_bcvh],
            );
            meta.postman_codes = postmanList.map((row) => row.postman_code);
        }

        return sendSuccess(res, meta);
    } catch (error) {
        return sendError(res, 500, 'INTERNAL_ERROR', error.message);
    }
}

// GET /api/network-map/delivery-routes/points?ngay=&ma_bcvh=&postman_code=[&ca=]
//
// Filters strictly by `ngay_phat` (PO Gate 3 remediation §4). The result
// set is still ordered by `thoi_gian_nhap_phat`/`status_time` — the actual
// delivery-entry sequence within the selected business date — which is the
// only role those two fields play here.
async function listDeliveryPoints(req, res) {
    const { ngay, ma_bcvh, postman_code, ca } = req.query;

    if (!ngay || !ma_bcvh || !postman_code) {
        return sendError(
            res,
            400,
            'MISSING_REQUIRED_FILTER',
            'Phải chọn đủ Ngày, BCVH và Bưu tá trước khi truy vấn Sơ đồ tuyến phát.',
        );
    }

    try {
        let sql = `SELECT * FROM network_delivery_point
                   WHERE ngay_phat = ?
                     AND ma_bcvh = ?
                     AND postman_code = ?`;
        const params = [ngay, ma_bcvh, postman_code];

        if (ca === 'sang') {
            sql += ` AND ca_phat = 'Ca sáng'`;
        } else if (ca === 'chieu') {
            sql += ` AND ca_phat = 'Ca chiều'`;
        }

        sql += ` ORDER BY CASE WHEN thoi_gian_nhap_phat IS NULL THEN 1 ELSE 0 END, thoi_gian_nhap_phat ASC, status_time ASC, id ASC`;

        const rows = await all(sql, params);
        return sendSuccess(res, rows);
    } catch (error) {
        return sendError(res, 500, 'INTERNAL_ERROR', error.message);
    }
}

module.exports = {
    listServicePoints,
    listLevel2Routes,
    getDeliveryRoutesMeta,
    listDeliveryPoints,
};
