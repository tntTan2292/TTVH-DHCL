/**
 * parseServicePointsExcel — NETWORK-MANAGEMENT-001 Phase 2/3.
 *
 * Reads the "Dữ liệu bản đồ" sheet of the Mạng điểm phục vụ workbook — both
 * the original Phase 2 seed source and, since Phase 3, any Export-produced
 * re-Import file (identical structure). Read as-is — no filtering/inference.
 *
 * A row with a missing/blank Mã điểm phục vụ is still returned (with
 * `ma_diem: null`) rather than silently dropped: Phase 3's classify step
 * must see it to flag it as a blocking error row, not have it silently
 * vanish before classification ever runs.
 */

'use strict';

const xlsx = require('xlsx');

const SHEET_NAME = 'Dữ liệu bản đồ';
const HEADER_ROW_INDEX = 3; // 0-indexed; row 4 in Excel
const EXPECTED_HEADERS = [
    'STT', 'Mã điểm phục vụ', 'Tên điểm phục vụ', 'Loại điểm',
    'Ký hiệu trên bản đồ', 'Địa chỉ chi tiết', 'Phường/Xã', 'Trạng thái',
    'Kinh độ', 'Vĩ độ', 'Đơn vị quản lý',
];

function parseServicePointsWorkbook(workbook) {
    if (!workbook.SheetNames.includes(SHEET_NAME)) {
        throw new Error(`Sheet "${SHEET_NAME}" not found. Sheets present: ${workbook.SheetNames.join(', ')}`);
    }

    const sheet = workbook.Sheets[SHEET_NAME];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const header = rows[HEADER_ROW_INDEX] || [];

    const warnings = [];
    EXPECTED_HEADERS.forEach((expected, index) => {
        if (header[index] !== expected) {
            warnings.push(`Column ${index} header mismatch: expected "${expected}", found "${header[index]}"`);
        }
    });

    const records = [];
    for (let i = HEADER_ROW_INDEX + 1; i < rows.length; i += 1) {
        const row = rows[i];
        if (!row || row.every((cell) => cell === null || cell === '')) continue;

        const maDiem = row[1];
        const maDiemMissing = maDiem === null || maDiem === undefined || String(maDiem).trim() === '';
        if (maDiemMissing) {
            warnings.push(`Row ${i + 1}: missing Mã điểm phục vụ`);
        }

        const lat = row[9];
        const lon = row[8];
        if (typeof lat !== 'number' || typeof lon !== 'number') {
            warnings.push(`Row ${i + 1} (${maDiemMissing ? '?' : maDiem}): missing/invalid coordinates — kept with null lat/lon`);
        }

        records.push({
            ma_diem: maDiemMissing ? null : String(maDiem).trim(),
            ten_diem: row[2] ?? null,
            loai_diem: row[3] ?? null,
            dia_chi: row[5] ?? null,
            phuong_xa: row[6] ?? null,
            trang_thai: row[7] ?? null,
            lon: typeof lon === 'number' ? lon : null,
            lat: typeof lat === 'number' ? lat : null,
            don_vi_quan_ly: row[10] ?? null,
        });
    }

    return { records, warnings };
}

function parseServicePointsFile(filePath) {
    const workbook = xlsx.readFile(filePath);
    return parseServicePointsWorkbook(workbook);
}

module.exports = { parseServicePointsWorkbook, parseServicePointsFile, SHEET_NAME, EXPECTED_HEADERS };
