/**
 * parseDanhBaBuuTaExcel — F13-ROUTE-POSTMAN-IDENTITY-01 Phase 1.
 *
 * Reads the postman directory export ("DB Buu ta" family, observed as
 * `2026.09.17 - DB Buu ta.xls`). The workbook carries a report banner
 * (title/unit/role/contract-type/status/printed-by/printed-at) before the
 * real header row, and a column-number row ("1","2","3",...) directly under
 * the header — neither is data. Per the locked Design of Record (§7), the
 * data sheet and header row are found by CONTENT (the exact header-name
 * set), never by a fixed row/sheet index or the ".xls" extension, because
 * the export tool may change row counts or emit a differently-shaped file
 * despite the same extension.
 *
 * Data minimization (locked, §6.1): only `ma_buu_ta`, `ten_buu_ta`,
 * `ma_bcvh`, `ten_bcvh`, `trang_thai_hoat_dong` are ever extracted. Phone
 * number, Mã HRM, contract type, Chức danh, and Mã/Tên BĐT / Mã/Tên BĐH are
 * read only to walk past columns — their VALUES are never copied into any
 * returned record, log line, or error message.
 */

'use strict';

const xlsx = require('xlsx');

const REQUIRED_HEADERS = ['Tên tài khoản', 'Họ tên người dùng', 'Mã bưu cục'];
const OPTIONAL_HEADERS = ['Tên bưu cục', 'Tình trạng hoạt động'];

// Live BF-observed postman-code shapes: 53 + one letter (A/B/F/H/N/T/K/...) + 3 digits.
const CODE_PATTERN = /^53[A-Z]\d{3}$/;

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
        if (byName.has(name)) indexes[name] = byName.get(name);
        else missing.push(name);
    }
    for (const name of OPTIONAL_HEADERS) {
        if (byName.has(name)) indexes[name] = byName.get(name);
    }
    return { indexes, missing };
}

/**
 * Scans every sheet for a header row matching REQUIRED_HEADERS (order-
 * independent, content-based). Returns { sheetName, rows, indexes, headerRowIndex }.
 * Throws a single error listing every sheet/row combination checked if none
 * qualifies — never a silent "0 rows".
 */
function findHeaderRow(workbook) {
    const attempts = [];
    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
        for (let rowIndex = 0; rowIndex < Math.min(rows.length, 30); rowIndex += 1) {
            const { indexes, missing } = tryResolveHeaderIndexes(rows[rowIndex]);
            if (missing.length === 0) {
                return {
                    sheetName, rows, indexes, headerRowIndex: rowIndex,
                };
            }
            if (missing.length < REQUIRED_HEADERS.length) {
                attempts.push({ sheetName, rowIndex, missing });
            }
        }
    }

    const detail = attempts
        .map((a) => `"${a.sheetName}" dòng ${a.rowIndex + 1} (thiếu: ${a.missing.join(', ')})`)
        .join('; ') || 'không có dòng nào gần khớp';
    throw new Error(
        `File không đúng cấu trúc Danh bạ bưu tá — không tìm thấy dòng tiêu đề chứa đủ các cột `
        + `bắt buộc (${REQUIRED_HEADERS.join(', ')}). Đã kiểm tra ${workbook.SheetNames.length} sheet: ${detail}. `
        + 'Vui lòng import nguyên file xuất từ hệ thống, không chỉnh sửa header.',
    );
}

/**
 * Row directly under the header is a column-number row ("1","2","3",...) if
 * every non-null cell parses as a small positive integer — detected by
 * content, never assumed to always be exactly one row.
 */
function isColumnNumberRow(row) {
    const cells = (row || []).filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (cells.length === 0) return false;
    return cells.every((c) => /^\d{1,3}$/.test(String(c).trim()));
}

function isBlankRow(row) {
    return !row || row.every((c) => c === null || c === undefined || String(c).trim() === '');
}

function parseDanhBaBuuTaWorkbook(workbook) {
    const {
        rows, indexes: idx, headerRowIndex,
    } = findHeaderRow(workbook);

    let dataStartIndex = headerRowIndex + 1;
    if (isColumnNumberRow(rows[dataStartIndex])) {
        dataStartIndex += 1;
    }

    const records = [];
    const rejected = [];
    const seenCodesInFile = new Set();
    let blankRowsSkipped = 0;

    for (let i = dataStartIndex; i < rows.length; i += 1) {
        const row = rows[i];
        if (isBlankRow(row)) {
            blankRowsSkipped += 1;
            continue; // eslint-disable-line no-continue
        }

        const rowNumber = i + 1;
        const rawCode = row[idx['Tên tài khoản']];
        const rawName = row[idx['Họ tên người dùng']];
        const code = rawCode !== null && rawCode !== undefined ? String(rawCode).trim().toUpperCase() : '';
        const name = rawName !== null && rawName !== undefined ? String(rawName).trim() : '';
        const maBcvh = idx['Mã bưu cục'] !== undefined && row[idx['Mã bưu cục']] !== null && row[idx['Mã bưu cục']] !== undefined
            ? String(row[idx['Mã bưu cục']]).trim()
            : null;
        const tenBcvh = idx['Tên bưu cục'] !== undefined && row[idx['Tên bưu cục']] !== null && row[idx['Tên bưu cục']] !== undefined
            ? String(row[idx['Tên bưu cục']]).trim()
            : null;
        const trangThai = idx['Tình trạng hoạt động'] !== undefined && row[idx['Tình trạng hoạt động']] !== null && row[idx['Tình trạng hoạt động']] !== undefined
            ? String(row[idx['Tình trạng hoạt động']]).trim()
            : null;

        if (!CODE_PATTERN.test(code)) {
            rejected.push({ rowNumber, reason: `Mã bưu tá "${code || '(rỗng)'}" không đúng định dạng (kỳ vọng 53X999)` });
            continue; // eslint-disable-line no-continue
        }
        if (!name) {
            rejected.push({ rowNumber, reason: `Mã bưu tá "${code}": thiếu Họ tên người dùng` });
            continue; // eslint-disable-line no-continue
        }
        if (seenCodesInFile.has(code)) {
            rejected.push({ rowNumber, reason: `Mã bưu tá "${code}" trùng lặp trong file` });
            continue; // eslint-disable-line no-continue
        }
        seenCodesInFile.add(code);

        records.push({
            rowNumber,
            ma_buu_ta: code,
            ten_buu_ta: name,
            ma_bcvh: maBcvh,
            ten_bcvh: tenBcvh,
            trang_thai_hoat_dong: trangThai,
        });
    }

    return {
        records,
        rejected,
        stats: {
            total_data_rows: rows.length - dataStartIndex,
            blank_rows_skipped: blankRowsSkipped,
            valid_rows: records.length,
            rejected_rows: rejected.length,
        },
    };
}

function parseDanhBaBuuTaExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    return parseDanhBaBuuTaWorkbook(workbook);
}

function parseDanhBaBuuTaBuffer(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    return parseDanhBaBuuTaWorkbook(workbook);
}

module.exports = {
    parseDanhBaBuuTaWorkbook,
    parseDanhBaBuuTaExcel,
    parseDanhBaBuuTaBuffer,
    findHeaderRow,
    isColumnNumberRow,
    CODE_PATTERN,
    REQUIRED_HEADERS,
};
