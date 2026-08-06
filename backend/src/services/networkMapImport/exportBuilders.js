/**
 * exportBuilders — NETWORK-MANAGEMENT-001 Phase 3.
 *
 * Generates the flat, Import-ready Excel for each module directly from
 * live DB state — the round-trip contract is always this Export's own
 * structure, never the original merged-layout / raw-batch-file source
 * Excel (those remain untouched, read-only historical references).
 */

'use strict';

const xlsx = require('xlsx');
const { all } = require('../../config/db');
const { EXPECTED_HEADERS: SERVICE_POINT_HEADERS, SHEET_NAME: SERVICE_POINT_SHEET } = require('../networkMapSeed/parseServicePointsExcel');
const { EXPECTED_HEADERS: LEVEL2_ROUTE_HEADERS, SHEET_NAME: LEVEL2_ROUTE_SHEET } = require('./parseLevel2RoutesImportExcel');
const { EXPECTED_HEADERS: DELIVERY_HEADERS, SHEET_NAME: DELIVERY_SHEET } = require('./parseDeliveryRoutesImportExcel');

function workbookToBuffer(workbook) {
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/** Mạng điểm phục vụ — reproduces the exact sheet structure parseServicePointsExcel.js reads. */
async function buildServicePointsExport() {
    const rows = await all('SELECT * FROM network_service_point ORDER BY ma_diem ASC');

    const sheetRows = [
        ['DỮ LIỆU BẢN ĐỒ MẠNG ĐIỂM PHỤC VỤ — EXPORT'],
        [`Xuất lúc: ${new Date().toISOString()}. Import lại: giữ nguyên cấu trúc cột, trạng thái được giữ nguyên như xuất ra, không tự đổi.`],
        [],
        SERVICE_POINT_HEADERS,
        ...rows.map((r, i) => [
            i + 1, r.ma_diem, r.ten_diem, r.loai_diem, null, r.dia_chi, r.phuong_xa, r.trang_thai, r.lon, r.lat, r.don_vi_quan_ly,
        ]),
    ];

    const sheet = xlsx.utils.aoa_to_sheet(sheetRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, SERVICE_POINT_SHEET);
    return { buffer: workbookToBuffer(workbook), rowCount: rows.length };
}

/** Đường thư cấp 2 — one row per stop, Route ID = network_level2_route.id verbatim. */
async function buildLevel2RoutesExport() {
    const routes = await all('SELECT * FROM network_level2_route ORDER BY id ASC');
    const stops = await all('SELECT * FROM network_level2_route_stop ORDER BY route_id ASC, seq ASC');
    const stopsByRoute = new Map();
    stops.forEach((s) => {
        if (!stopsByRoute.has(s.route_id)) stopsByRoute.set(s.route_id, []);
        stopsByRoute.get(s.route_id).push(s);
    });

    const sheetRows = [LEVEL2_ROUTE_HEADERS];
    let rowCount = 0;
    for (const route of routes) {
        const routeStops = stopsByRoute.get(route.id) || [];
        for (const stop of routeStops) {
            sheetRows.push([
                route.id, route.route_name, route.declared_km, route.trips_per_week, route.operator,
                stop.seq, stop.ma_diem, stop.stop_name, stop.arrival, stop.handling, stop.departure, stop.leg_km, stop.note,
            ]);
            rowCount += 1;
        }
    }

    const sheet = xlsx.utils.aoa_to_sheet(sheetRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, LEVEL2_ROUTE_SHEET);
    return { buffer: workbookToBuffer(workbook), rowCount };
}

/**
 * Sơ đồ tuyến phát — default scoped by month/date-range, "toàn bộ" opt-in.
 * `{ from, to }` (YYYY-MM-DD, inclusive) or `{ all: true }`.
 */
async function buildDeliveryRoutesExportPreviewCount({ from, to, all: exportAll } = {}) {
    if (exportAll) {
        const [{ n }] = await all('SELECT COUNT(*) AS n FROM network_delivery_point');
        return n;
    }
    const [{ n }] = await all(
        'SELECT COUNT(*) AS n FROM network_delivery_point WHERE ngay_phat BETWEEN ? AND ?',
        [from, to],
    );
    return n;
}

async function buildDeliveryRoutesExport({ from, to, all: exportAll } = {}) {
    const rows = exportAll
        ? await all('SELECT * FROM network_delivery_point ORDER BY ngay_phat ASC, ma_bcvh ASC')
        : await all(
            'SELECT * FROM network_delivery_point WHERE ngay_phat BETWEEN ? AND ? ORDER BY ngay_phat ASC, ma_bcvh ASC',
            [from, to],
        );

    const sheetRows = [
        DELIVERY_HEADERS,
        ...rows.map((r) => [
            r.ma_buu_gui, r.ngay_phat, r.ma_bcvh, r.postman_code, r.route_po_code,
            r.bien_so, r.lat, r.lon, r.status_time, r.loai_dich_vu, r.tien_thu_ho, r.raw_thoi_gian_nhap_phat,
        ]),
    ];

    const sheet = xlsx.utils.aoa_to_sheet(sheetRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, DELIVERY_SHEET);
    return { buffer: workbookToBuffer(workbook), rowCount: rows.length };
}

module.exports = {
    buildServicePointsExport,
    buildLevel2RoutesExport,
    buildDeliveryRoutesExport,
    buildDeliveryRoutesExportPreviewCount,
};
