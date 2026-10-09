'use strict';

// F11-PHASE-1 - blank-evaluation flag (PO decision PD-9).
//
// A row with a blank "Danh gia 2026" stays in the denominator as 0 Dat; this module only explains
// WHY it is blank, at read time, from stored columns. Nothing here is written back and the rate
// never depends on the reason. Order of the reasons is fixed (measurement.md section 5).

const BLANK_REASONS = Object.freeze({
    CHUA_PTC: 'CHUA_PTC',
    PTC_SAU_NGAY_DO_KIEM: 'PTC_SAU_NGAY_DO_KIEM',
    THIEU_CHI_TIEU_PHUONG: 'THIEU_CHI_TIEU_PHUONG',
    KHAC: 'KHAC',
});

const BLANK_REASON_LABELS = Object.freeze({
    CHUA_PTC: 'Chưa phát thành công / chưa nộp tiền',
    PTC_SAU_NGAY_DO_KIEM: 'Hoàn tất sau ngày đo kiểm',
    THIEU_CHI_TIEU_PHUONG: 'Thiếu chỉ tiêu phường xã',
    KHAC: 'Khác',
});

function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === '';
}

// 'dd/MM/yyyy HH:mm:ss' or ISO 'yyyy-MM-dd ...' -> 'yyyy-MM-dd' (null when unreadable)
function toIsoDay(value) {
    if (isBlank(value)) return null;
    const text = String(value).trim();
    let match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/**
 * @param {object} row  a fact_f11 row (snake_case columns)
 * @param {string} ngayDoKiem  ISO date of the measurement day (fallback: row.ngay_do_kiem)
 * @returns {string|null} one of BLANK_REASONS, or null when the evaluation is not blank
 */
function classifyBlankEvaluation(row, ngayDoKiem = row?.ngay_do_kiem) {
    if (!row || !isBlank(row.danh_gia_2026)) return null;
    const endValue = !isBlank(row.thoi_gian_ptc) ? row.thoi_gian_ptc : row.thoi_gian_nop_tien_cod;
    if (isBlank(endValue)) return BLANK_REASONS.CHUA_PTC;
    const endDay = toIsoDay(endValue);
    if (endDay && ngayDoKiem && endDay > String(ngayDoKiem).slice(0, 10)) return BLANK_REASONS.PTC_SAU_NGAY_DO_KIEM;
    if (row.thoi_gian_chi_tieu_2026 === null || row.thoi_gian_chi_tieu_2026 === undefined || row.thoi_gian_chi_tieu_2026 === '') {
        return BLANK_REASONS.THIEU_CHI_TIEU_PHUONG;
    }
    return BLANK_REASONS.KHAC;
}

module.exports = { BLANK_REASONS, BLANK_REASON_LABELS, classifyBlankEvaluation, toIsoDay };
