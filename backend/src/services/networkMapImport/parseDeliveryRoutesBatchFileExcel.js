/**
 * parseDeliveryRoutesBatchFileExcel — NETWORK-MANAGEMENT-001 Phase 4.
 *
 * Reads the ORIGINAL, unmodified monthly BatchFile the postal system already
 * produces (`YYYY.MM.DD - BatchFile Phat thang MM.YYYY.xlsb`, 29 columns).
 * The sheet name varies per export — observed as `Data_Ghep_1782916740832`
 * for one month and `Data_Tong_Hop` for another (PO Gate 4 runtime recheck
 * finding, 2026-08-06: a hardcoded `Data_Ghep`-prefix-or-first-sheet
 * heuristic silently picked the wrong/empty sheet for the latter and
 * produced a false "0 rows" Preview) — so the data sheet is now found by
 * scanning every sheet's header row for the full required-header set
 * (`findDataSheet`), never by name or position. Replaces the former
 * flat 12-column "Tuyến phát Import" template
 * (`parseDeliveryRoutesImportExcel.js`, removed) — per PO Gate 4 audit and
 * remediation decision, an admin must be able to upload the exact recurring
 * file with zero manual reformatting: no column deletion, addition, rename,
 * or reordering.
 *
 * Column resolution is by HEADER NAME, not fixed index — resilient to the
 * postal system reordering columns, and fails loudly (never silently
 * mis-maps) if any of the 12 columns this feature actually needs is
 * missing. The other 18 raw columns (Mã Tỉnh, Mã huyện, Mã bưu cục,
 * STATUS_CODE, TYPE_CODE_PAYROLL, TYPE_NAME_PAYROLL, REGION_CODE, KG,
 * AREA_CODE, SERVICE_CODE, ITEM_TYPE_CODE, SERVICE_PRO, MABC_CN,
 * CUSTOMER_CODE, GTGT, "Xác nhận đến BCP", "Mã lô") are accepted if present
 * but never read or persisted — confirmed unused by any current map/filter/
 * popup feature during the PO Gate 4 audit.
 *
 * "Biển số" is deliberately NOT part of this parser's output — the audit
 * confirmed it never had a real source column anywhere (not in this raw
 * file, not in the original reference HTML) and was always NULL end-to-end.
 * The `bien_so` DB column itself stays in the schema (nullable, untouched)
 * per the locked PO decision to avoid a breaking migration; this parser
 * simply never sets it.
 *
 * Business exclusion filters (QUANTITY === -1, invalid/zero LAT or LON) are
 * carried over unchanged from the original one-time Phase 2 seed parser
 * (`parseDeliveryPointsExcel.js`) — not reinvented. Within-file duplicate
 * (LADING_CODE, STATUS_DATE, ROUTE_PO_CODE) rows are flagged via
 * `is_duplicate_in_file` (visible to Preview, not silently dropped) so the
 * existing, unchanged `classifyDeliveryPoints`/`applyDeliveryRoutesImport`
 * logic in `deliveryRoutesImport.js` can classify them the same way it
 * already does — that classify/apply/upsert layer is intentionally left
 * untouched by this remediation (PO decision §6).
 */

'use strict';

const xlsx = require('xlsx');
const { parseImportTime } = require('../networkMapSeed/parseDeliveryPointsExcel');

// Header names this feature actually needs, resolved by exact text match
// against row 0 (order-independent). QUANTITY is read only to apply the
// exclusion filter — never persisted.
const REQUIRED_HEADERS = [
    'LADING_CODE',
    'STATUS_DATE',
    'ROUTE_PO_CODE',
    'MABC_PHAT',
    'POSTMAN_CODE',
    'LAT',
    'LON',
    'STATUS_TIME',
    'SERVICE_NAME_PAYROLL',
    'SO_TIEN_THU_HO',
    'QUANTITY',
    'Thời gian nhập phát',
];

// Matches "YYYY.MM.DD - BatchFile Phat thang MM.YYYY.xlsb" — the prefix is
// the file's export date (not the data period); "thang MM.YYYY" is the
// declared data period. Tolerant of minor spacing variance; case-insensitive.
const FILENAME_PERIOD_PATTERN = /th[aá]ng[\s_]*(\d{1,2})\.(\d{4})/i;

function parseFilenamePeriod(fileName) {
    if (!fileName) return null;
    const match = String(fileName).match(FILENAME_PERIOD_PATTERN);
    if (!match) return null;
    const month = Number(match[1]);
    const year = Number(match[2]);
    if (!(month >= 1 && month <= 12)) return null;
    return { month, year, period: `${year}-${String(month).padStart(2, '0')}` };
}

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

/**
 * Normalizes a cell that may arrive as a native number OR as numeric text —
 * the exact same logical value can be stored either way depending on how the
 * postal system's export tool formatted that column for a given month (PO
 * Gate 4 second recheck finding, 2026-08-07: the May BatchFile's `QUANTITY`/
 * `LAT`/`LON` cells were text-formatted, e.g. `"-1"` / `"16.497005"`, while
 * the June file's equivalent cells were native numbers — a strict `=== -1`
 * or `typeof value === 'number'` check silently excluded every single row).
 * Returns a finite `number`, or `null` for blank/non-numeric/NaN/Infinity.
 */
function toFiniteNumber(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return null;
        const num = Number(trimmed);
        return Number.isFinite(num) ? num : null;
    }
    return null;
}

function isQuantityExcluded(value) {
    return toFiniteNumber(value) === -1;
}

function isValidCoordinate(value, { min, max } = {}) {
    const num = toFiniteNumber(value);
    if (num === null || num === 0) return false;
    if (typeof min === 'number' && num < min) return false;
    if (typeof max === 'number' && num > max) return false;
    return true;
}

/**
 * Checks a header row against REQUIRED_HEADERS without throwing — used to
 * probe every sheet in the workbook when auto-detecting the data sheet.
 * Returns { indexes, missing }: `indexes` is only complete (safe to use)
 * when `missing` is empty.
 */
function tryResolveHeaderIndexes(headerRow) {
    const byName = new Map();
    (headerRow || []).forEach((cell, idx) => {
        if (cell === null || cell === undefined) return;
        const name = String(cell).trim();
        if (name && !byName.has(name)) byName.set(name, idx);
    });

    const indexes = {};
    const missing = [];
    for (const name of REQUIRED_HEADERS) {
        if (byName.has(name)) {
            indexes[name] = byName.get(name);
        } else {
            missing.push(name);
        }
    }
    return { indexes, missing };
}

/**
 * Auto-detects which sheet in the workbook holds the BatchFile data, by
 * header CONTENT — never by sheet name. The postal system's export naming
 * for this sheet has already been observed to vary between exports
 * (`Data_Ghep_<suffix>` for one month, `Data_Tong_Hop` for another; PO
 * Gate 4 recheck finding, 2026-08-06) — hardcoding or guessing a name is
 * exactly the defect being fixed here. Every sheet is checked in workbook
 * order; the first one whose header row contains all REQUIRED_HEADERS is
 * used. If none qualifies, throws a single error listing every sheet name
 * together with that sheet's specific missing headers — never a silent
 * "0 rows" result.
 */
function findDataSheet(workbook) {
    const attempts = [];
    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
        const header = rows[0] || [];
        const { indexes, missing } = tryResolveHeaderIndexes(header);
        if (missing.length === 0) {
            return { sheetName, rows, indexes };
        }
        attempts.push({ sheetName, missing });
    }

    const detail = attempts
        .map((a) => `"${a.sheetName}" (thiếu: ${a.missing.join(', ')})`)
        .join('; ');
    throw new Error(
        `File không đúng cấu trúc BatchFile gốc — không tìm thấy sheet nào chứa đủ ${REQUIRED_HEADERS.length} cột bắt buộc. `
        + `Đã kiểm tra ${workbook.SheetNames.length} sheet: ${detail}. `
        + `Vui lòng import nguyên file BatchFile định kỳ của hệ thống bưu chính, không chỉnh sửa header.`,
    );
}

function parseDeliveryRoutesBatchFileWorkbook(workbook, fileName) {
    const { rows, idx } = (() => {
        const found = findDataSheet(workbook);
        return { rows: found.rows, idx: found.indexes };
    })();

    const declaredPeriod = parseFilenamePeriod(fileName);

    const stats = {
        total_rows: 0,
        excluded_quantity_minus_1: 0,
        excluded_invalid_coordinates: 0,
        excluded_invalid_status_date: 0,
        kept_points: 0,
        missing_import_time_count: 0,
    };
    const warnings = [];
    const seenKeys = new Set();
    const records = [];
    const actualMonths = new Set();

    for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i];
        if (!row) continue; // eslint-disable-line no-continue
        stats.total_rows += 1;

        if (isQuantityExcluded(row[idx.QUANTITY])) {
            stats.excluded_quantity_minus_1 += 1;
            continue; // eslint-disable-line no-continue
        }

        // Accepts both native-number and numeric-text cells (see
        // `toFiniteNumber`) — geographic range keeps genuinely bad values
        // (blank, non-numeric, 0, NaN, Infinity, or out-of-range) invalid.
        const lat = toFiniteNumber(row[idx.LAT]);
        const lon = toFiniteNumber(row[idx.LON]);
        if (!isValidCoordinate(row[idx.LAT], { min: -90, max: 90 }) || !isValidCoordinate(row[idx.LON], { min: -180, max: 180 })) {
            stats.excluded_invalid_coordinates += 1;
            continue; // eslint-disable-line no-continue
        }

        const ladingCode = row[idx.LADING_CODE];
        const statusDate = row[idx.STATUS_DATE];
        const routePoCode = row[idx.ROUTE_PO_CODE];
        const ngayPhat = formatStatusDate(statusDate);
        if (!ngayPhat) {
            stats.excluded_invalid_status_date += 1;
            warnings.push(`Dòng ${i + 1}: STATUS_DATE "${statusDate}" không đọc được — bỏ qua dòng.`);
            continue; // eslint-disable-line no-continue
        }

        const key = `${ladingCode}|${ngayPhat}|${routePoCode}`;
        const isDuplicateInFile = seenKeys.has(key);
        seenKeys.add(key);

        const rawImportTimeVal = row[idx['Thời gian nhập phát']];
        const { thoiGianNhapPhat, rawThoiGianNhapPhat, caPhat, ngayNhapPhat } = parseImportTime(rawImportTimeVal);
        if (!thoiGianNhapPhat) {
            stats.missing_import_time_count += 1;
        }

        actualMonths.add(ngayPhat.slice(0, 7));

        records.push({
            rowNumber: i + 1,
            ma_buu_gui: ladingCode !== null ? String(ladingCode) : null,
            ngay_phat: ngayPhat,
            ma_bcvh: row[idx.MABC_PHAT] !== null ? String(row[idx.MABC_PHAT]) : null,
            postman_code: row[idx.POSTMAN_CODE] !== null ? String(row[idx.POSTMAN_CODE]) : null,
            route_po_code: routePoCode !== null ? String(routePoCode) : null,
            lat,
            lon,
            status_time: formatStatusTime(row[idx.STATUS_TIME]),
            loai_dich_vu: row[idx.SERVICE_NAME_PAYROLL] ?? null,
            tien_thu_ho: typeof row[idx.SO_TIEN_THU_HO] === 'number' ? row[idx.SO_TIEN_THU_HO] : null,
            thoi_gian_nhap_phat: thoiGianNhapPhat,
            raw_thoi_gian_nhap_phat: rawThoiGianNhapPhat,
            ca_phat: caPhat,
            ngay_nhap_phat: ngayNhapPhat,
            is_duplicate_in_file: isDuplicateInFile,
        });
        stats.kept_points += 1;
    }

    const actualPeriodMonths = Array.from(actualMonths).sort();

    let periodWarning = null;
    if (!declaredPeriod) {
        periodWarning = 'Không đọc được kỳ dữ liệu từ tên file (định dạng mong đợi: "... Phat thang MM.YYYY..."). Vui lòng kiểm tra thủ công.';
    } else if (actualPeriodMonths.length === 0) {
        // Never a bare "no valid rows" — if the sheet actually had rows,
        // name exactly why every one was excluded (PO Gate 4 second recheck
        // finding, 2026-08-07: a silent 0/0/0/0/0 with no diagnostic hid a
        // type-coercion bug for a full recheck cycle).
        periodWarning = stats.total_rows > 0
            ? `Đã đọc ${stats.total_rows} dòng dữ liệu nhưng không có dòng nào hợp lệ để lưu: `
                + `${stats.excluded_quantity_minus_1} dòng loại do QUANTITY=-1, `
                + `${stats.excluded_invalid_coordinates} dòng loại do LAT/LON không hợp lệ, `
                + `${stats.excluded_invalid_status_date} dòng loại do STATUS_DATE không đọc được. `
                + 'Vui lòng kiểm tra lại file.'
            : 'Không có dòng dữ liệu hợp lệ nào để đối chiếu kỳ.';
    } else if (actualPeriodMonths.length > 1) {
        periodWarning = `File chứa dữ liệu của nhiều kỳ (${actualPeriodMonths.join(', ')}), không chỉ kỳ khai báo trong tên file (${declaredPeriod.period}). Vui lòng kiểm tra kỹ trước khi Confirm.`;
    } else if (actualPeriodMonths[0] !== declaredPeriod.period) {
        periodWarning = `Kỳ khai báo trong tên file (${declaredPeriod.period}) không khớp với kỳ dữ liệu thực tế trong file (${actualPeriodMonths[0]}). Vui lòng kiểm tra lại file trước khi Confirm.`;
    }

    return {
        records,
        warnings,
        stats,
        declaredPeriod: declaredPeriod ? declaredPeriod.period : null,
        actualPeriodMonths,
        periodWarning,
    };
}

function parseDeliveryRoutesBatchFileExcel(filePath, fileName) {
    const workbook = xlsx.readFile(filePath);
    return parseDeliveryRoutesBatchFileWorkbook(workbook, fileName || filePath);
}

module.exports = {
    parseDeliveryRoutesBatchFileWorkbook,
    parseDeliveryRoutesBatchFileExcel,
    parseFilenamePeriod,
    findDataSheet,
    toFiniteNumber,
    isValidCoordinate,
    REQUIRED_HEADERS,
};
