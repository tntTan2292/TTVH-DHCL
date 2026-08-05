/**
 * NetworkMapController — NETWORK-MANAGEMENT-001 Phase 1 (Nền tảng).
 *
 * Provides the authenticated read-API foundation for the three independent
 * Quản lý mạng lưới screens (Mạng điểm phục vụ, Mạng đường thư cấp 2,
 * Sơ đồ tuyến phát). Import endpoints are role-gated scaffolding only —
 * Excel parsing/preview/commit is out of scope until Phase 3.
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

function notImplementedImport(module, message) {
    return async function importStub(req, res) {
        return sendError(
            res,
            501,
            'NOT_IMPLEMENTED',
            message || `Import cho ${module} chưa được triển khai — thuộc phạm vi NETWORK-MANAGEMENT-001 Phase 3 (Import).`,
        );
    };
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
async function getDeliveryRoutesMeta(req, res) {
    const { ngay, ma_bcvh } = req.query;

    try {
        const dates = await all(
            `SELECT DISTINCT COALESCE(ngay_nhap_phat, ngay_phat) AS ngay_display
             FROM network_delivery_point
             WHERE COALESCE(ngay_nhap_phat, ngay_phat) IS NOT NULL
             ORDER BY ngay_display DESC`,
        );
        const meta = { dates: dates.map((row) => row.ngay_display) };

        if (ngay) {
            const bcvhList = await all(
                `SELECT DISTINCT ma_bcvh
                 FROM network_delivery_point
                 WHERE (ngay_nhap_phat = ? OR (ngay_nhap_phat IS NULL AND ngay_phat = ?))
                   AND ma_bcvh IS NOT NULL
                 ORDER BY ma_bcvh ASC`,
                [ngay, ngay],
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
                 WHERE (ngay_nhap_phat = ? OR (ngay_nhap_phat IS NULL AND ngay_phat = ?))
                   AND ma_bcvh = ?
                   AND postman_code IS NOT NULL
                 ORDER BY postman_code ASC`,
                [ngay, ngay, ma_bcvh],
            );
            meta.postman_codes = postmanList.map((row) => row.postman_code);
        }

        return sendSuccess(res, meta);
    } catch (error) {
        return sendError(res, 500, 'INTERNAL_ERROR', error.message);
    }
}

// GET /api/network-map/delivery-routes/points?ngay=&ma_bcvh=&postman_code=[&ca=]
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
                   WHERE (ngay_nhap_phat = ? OR (ngay_nhap_phat IS NULL AND ngay_phat = ?))
                     AND ma_bcvh = ?
                     AND postman_code = ?`;
        const params = [ngay, ngay, ma_bcvh, postman_code];

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
    importServicePoints: notImplementedImport('Mạng điểm phục vụ'),
    importLevel2Routes: notImplementedImport('Mạng đường thư cấp 2'),
    importDeliveryRoutes: notImplementedImport('Sơ đồ tuyến phát'),
};
