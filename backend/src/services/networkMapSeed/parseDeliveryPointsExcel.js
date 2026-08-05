/**
 * parseDeliveryPointsExcel — NETWORK-MANAGEMENT-001 Phase 2.
 *
 * Reads sheet Data_Ghep_1782916740832 of the tuyến phát source workbook
 * (`Data QLML/2026.07.01 - BatchFile Phat thang 06.2026.xlsb`), 28 columns,
 * 160,554 data rows. Filtering mirrors the three exclusion rules already
 * named in the reference HTML's own precomputed META stats
 * (quantity_minus_1, invalid_coordinates, duplicate_lading_date_route) —
 * not invented here:
 *   1. QUANTITY === -1 rows excluded.
 *   2. Rows with missing/non-numeric/zero LAT or LON excluded.
 *   3. Duplicate (LADING_CODE, STATUS_DATE, ROUTE_PO_CODE) — first kept,
 *      later duplicates excluded.
 *
 * Column mapping (Excel header -> DB field) is literal, not inferred:
 * MABC_PHAT -> ma_bcvh (matches the reference HTML's own dropdown label
 * "Bưu cục vận hành / MABC_PHAT"); POSTMAN_CODE -> postman_code (the
 * Excel's own literal column name is used as the source of truth for the
 * "Bưu tá" filter, even though it holds license-plate-style values —
 * documented residual, see checkpoint Section 13); ROUTE_PO_CODE is kept
 * separately as route_po_code, not conflated with postman_code.
 */

'use strict';

const xlsx = require('xlsx');

const SHEET_NAME = 'Data_Ghep_1782916740832';

const COLUMNS = {
    LADING_CODE: 0,
    MA_TINH: 1,
    MA_HUYEN: 2,
    MA_BUU_CUC: 3,
    POSTMAN_CODE: 4,
    ROUTE_PO_CODE: 5,
    STATUS_CODE: 6,
    TYPE_CODE_PAYROLL: 7,
    TYPE_NAME_PAYROLL: 8,
    SERVICE_NAME_PAYROLL: 9,
    REGION_CODE: 10,
    KG: 11,
    AREA_CODE: 12,
    SERVICE_CODE: 13,
    ITEM_TYPE_CODE: 14,
    STATUS_DATE: 15,
    QUANTITY: 16,
    SERVICE_PRO: 17,
    MABC_CN: 18,
    MABC_PHAT: 19,
    SO_TIEN_THU_HO: 20,
    CUSTOMER_CODE: 21,
    LAT: 22,
    LON: 23,
    STATUS_TIME: 24,
};

function formatStatusDate(value) {
    const str = String(value);
    if (!/^\d{8}$/.test(str)) return null;
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
}

function formatStatusTime(value) {
    if (value === null || value === undefined || value === '') return null;
    const str = String(value).padStart(6, '0');
    if (!/^\d{6}$/.test(str)) return null;
    return `${str.slice(0, 2)}:${str.slice(2, 4)}:${str.slice(4, 6)}`;
}

function isValidCoordinate(value) {
    return typeof value === 'number' && Number.isFinite(value) && value !== 0;
}

function parseDeliveryPointsWorkbook(workbook) {
    if (!workbook.SheetNames.includes(SHEET_NAME)) {
        throw new Error(`Sheet "${SHEET_NAME}" not found. Sheets present: ${workbook.SheetNames.join(', ')}`);
    }

    const sheet = workbook.Sheets[SHEET_NAME];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
    const header = rows[0] || [];

    const stats = {
        total_rows: 0,
        excluded_quantity_minus_1: 0,
        excluded_invalid_coordinates: 0,
        excluded_duplicate_lading_date_route: 0,
        kept_points: 0,
    };
    const warnings = [];
    const seenKeys = new Set();
    const records = [];

    for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i];
        if (!row) continue;
        stats.total_rows += 1;

        if (row[COLUMNS.QUANTITY] === -1) {
            stats.excluded_quantity_minus_1 += 1;
            continue;
        }

        const lat = row[COLUMNS.LAT];
        const lon = row[COLUMNS.LON];
        if (!isValidCoordinate(lat) || !isValidCoordinate(lon)) {
            stats.excluded_invalid_coordinates += 1;
            continue;
        }

        const ladingCode = row[COLUMNS.LADING_CODE];
        const statusDate = row[COLUMNS.STATUS_DATE];
        const routePoCode = row[COLUMNS.ROUTE_PO_CODE];
        const dedupeKey = `${ladingCode}|${statusDate}|${routePoCode}`;
        if (seenKeys.has(dedupeKey)) {
            stats.excluded_duplicate_lading_date_route += 1;
            continue;
        }
        seenKeys.add(dedupeKey);

        const ngayPhat = formatStatusDate(statusDate);
        if (!ngayPhat) {
            warnings.push(`Row ${i + 1}: unparseable STATUS_DATE "${statusDate}" — skipped`);
            continue;
        }

        records.push({
            ngay_phat: ngayPhat,
            ma_bcvh: row[COLUMNS.MABC_PHAT] !== null ? String(row[COLUMNS.MABC_PHAT]) : null,
            postman_code: row[COLUMNS.POSTMAN_CODE] !== null ? String(row[COLUMNS.POSTMAN_CODE]) : null,
            route_po_code: row[COLUMNS.ROUTE_PO_CODE] !== null ? String(row[COLUMNS.ROUTE_PO_CODE]) : null,
            bien_so: null,
            ma_buu_gui: ladingCode !== null ? String(ladingCode) : null,
            lat,
            lon,
            status_time: formatStatusTime(row[COLUMNS.STATUS_TIME]),
            loai_dich_vu: row[COLUMNS.SERVICE_NAME_PAYROLL] ?? null,
            tien_thu_ho: typeof row[COLUMNS.SO_TIEN_THU_HO] === 'number' ? row[COLUMNS.SO_TIEN_THU_HO] : null,
        });
        stats.kept_points += 1;
    }

    return { records, warnings, stats, header };
}

function parseDeliveryPointsFile(filePath) {
    const workbook = xlsx.readFile(filePath, { sheets: [SHEET_NAME] });
    return parseDeliveryPointsWorkbook(workbook);
}

module.exports = { parseDeliveryPointsWorkbook, parseDeliveryPointsFile, SHEET_NAME, COLUMNS };
