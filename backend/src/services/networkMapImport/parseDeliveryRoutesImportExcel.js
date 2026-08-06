/**
 * parseDeliveryRoutesImportExcel — NETWORK-MANAGEMENT-001 Phase 3.
 *
 * Reads the flat, named-header Import-ready Sơ đồ tuyến phát template (the
 * same structure Export produces). This is distinct from Phase 2's
 * `parseDeliveryPointsExcel.js`, which reads the original raw 29-column
 * `.xlsb` batch file (a superset of columns, most not persisted in
 * network_delivery_point) — that parser remains the one-time-seed-only
 * reader for the original source format. Export/Import never touches the
 * original .xlsb again; this is the only ongoing round-trip contract.
 *
 * Locked row key: (ma_buu_gui, ngay_phat, route_po_code) — unchanged.
 */

'use strict';

const xlsx = require('xlsx');
const { parseImportTime } = require('../networkMapSeed/parseDeliveryPointsExcel');

const SHEET_NAME = 'Tuyến phát Import';
const HEADER_ROW_INDEX = 0;
const EXPECTED_HEADERS = [
    'Mã bưu gửi', 'Ngày phát', 'Mã BCVH', 'Bưu tá (POSTMAN_CODE)', 'Mã tuyến (ROUTE_PO_CODE)',
    'Biển số', 'Vĩ độ', 'Kinh độ', 'Giờ trạng thái', 'Loại dịch vụ', 'Tiền thu hộ', 'Thời gian nhập phát',
];

function parseDeliveryRoutesImportWorkbook(workbook) {
    const sheetName = workbook.SheetNames.includes(SHEET_NAME) ? SHEET_NAME : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const header = rows[HEADER_ROW_INDEX] || [];

    const warnings = [];
    EXPECTED_HEADERS.forEach((expected, index) => {
        if (header[index] !== expected) {
            warnings.push(`Column ${index} header mismatch: expected "${expected}", found "${header[index]}"`);
        }
    });

    const seenKeys = new Set();
    const records = [];

    for (let i = HEADER_ROW_INDEX + 1; i < rows.length; i += 1) {
        const row = rows[i];
        if (!row || row.every((cell) => cell === null || cell === '')) continue; // eslint-disable-line no-continue

        const maBuuGui = row[0] !== null && row[0] !== '' ? String(row[0]).trim() : null;
        const ngayPhat = row[1] !== null && row[1] !== '' ? String(row[1]).trim() : null;
        const routePoCode = row[4] !== null && row[4] !== '' ? String(row[4]).trim() : null;

        const key = `${maBuuGui}|${ngayPhat}|${routePoCode}`;
        const isDuplicateInFile = seenKeys.has(key);
        seenKeys.add(key);

        const { thoiGianNhapPhat, rawThoiGianNhapPhat, caPhat, ngayNhapPhat } = parseImportTime(row[11]);

        records.push({
            rowNumber: i + 1,
            ma_buu_gui: maBuuGui,
            ngay_phat: ngayPhat,
            ma_bcvh: row[2] !== null && row[2] !== '' ? String(row[2]).trim() : null,
            postman_code: row[3] !== null && row[3] !== '' ? String(row[3]).trim() : null,
            route_po_code: routePoCode,
            bien_so: row[5] ?? null,
            lat: typeof row[6] === 'number' ? row[6] : null,
            lon: typeof row[7] === 'number' ? row[7] : null,
            status_time: row[8] ?? null,
            loai_dich_vu: row[9] ?? null,
            tien_thu_ho: typeof row[10] === 'number' ? row[10] : null,
            thoi_gian_nhap_phat: thoiGianNhapPhat,
            raw_thoi_gian_nhap_phat: rawThoiGianNhapPhat,
            ca_phat: caPhat,
            ngay_nhap_phat: ngayNhapPhat,
            is_duplicate_in_file: isDuplicateInFile,
        });
    }

    return { records, warnings };
}

function parseDeliveryRoutesImportFile(filePath) {
    const workbook = xlsx.readFile(filePath);
    return parseDeliveryRoutesImportWorkbook(workbook);
}

module.exports = { parseDeliveryRoutesImportWorkbook, parseDeliveryRoutesImportFile, EXPECTED_HEADERS, SHEET_NAME };
