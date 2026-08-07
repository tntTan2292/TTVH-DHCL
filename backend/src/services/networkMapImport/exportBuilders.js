/**
 * exportBuilders — NETWORK-MANAGEMENT-001 Phase 3, updated Phase 4.
 *
 * Mạng điểm phục vụ and Đường thư cấp 2 Export keep the flat, Import-ready
 * round-trip contract from Phase 3 (their own Import parsers still read
 * Export's exact structure back). Sơ đồ tuyến phát Export is Phase 4
 * onward a one-way reporting snapshot only — Import for that module now
 * reads the original raw BatchFile directly
 * (`parseDeliveryRoutesBatchFileExcel.js`), not Export's output, so this
 * builder defines its own header list rather than sharing one with an
 * Import parser. "Biển số" is intentionally absent — the PO Gate 4 audit
 * confirmed it never had a real source column anywhere and was always
 * NULL; removed from this Export and from Import per that decision (the
 * `bien_so` DB column itself is untouched, still nullable, per the locked
 * no-breaking-migration decision).
 */

'use strict';

const xlsx = require('xlsx');
const { all } = require('../../config/db');
const { EXPECTED_HEADERS: SERVICE_POINT_HEADERS, SHEET_NAME: SERVICE_POINT_SHEET } = require('../networkMapSeed/parseServicePointsExcel');
const { EXPECTED_HEADERS: LEVEL2_ROUTE_HEADERS, SHEET_NAME: LEVEL2_ROUTE_SHEET } = require('./parseLevel2RoutesImportExcel');

const DELIVERY_SHEET = 'Tuyến phát Export';
const DELIVERY_HEADERS = [
    'Mã bưu gửi', 'Ngày phát', 'Mã BCVH', 'Bưu tá (POSTMAN_CODE)', 'Mã tuyến (ROUTE_PO_CODE)',
    'Vĩ độ', 'Kinh độ', 'Giờ trạng thái', 'Loại dịch vụ', 'Tiền thu hộ', 'Thời gian nhập phát',
];

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
            r.lat, r.lon, r.status_time, r.loai_dich_vu, r.tien_thu_ho, r.raw_thoi_gian_nhap_phat,
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
