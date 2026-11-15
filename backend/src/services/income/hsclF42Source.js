'use strict';
/**
 * INC-PHAT-03 - the F4.2 input of HSCL taken from QIS fact_f42 instead of PMTL's hand-loaded biểu. READ ONLY: one SELECT, nothing written.
 *
 * Output: the f42Rows shape of hsclCalculator (rows of postman x BC name with sl_mau and sl_dung), as PMTL's hscl_f42 holds them:
 *   sl_mau  = "Sản lượng GBT có thông tin phát"      <- number of fact_f42 rows of the postman in the period (every danh_gia, including a blank one)
 *   sl_dung = "Sản lượng PTC đúng QĐ (11,5 giờ)"      <- number of those rows whose danh_gia is 'Đạt'
 * The period is the month of ngay_do_kiem. Rows without a postman code are not counted.
 *
 * This mapping is evidence-based, not a business rule: INC-PHAT-03 found it reproduces PMTL's biểu exactly for sl_dung and within a few rows for
 * sl_mau (see docs/10_TICKETS/INC-PHAT-03_MANIFEST.md, "Điểm phải suy đoán"). Every assumption stays listed there for the CTO/PO to confirm.
 */
const { open, all, close } = require('./incSqlite');

const DAT = 'Đạt';
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthRange(ky) {
    if (!PERIOD.test(ky || '')) throw new Error('ky must be YYYY-MM');
    const last = new Date(Number(ky.slice(0, 4)), Number(ky.slice(5, 7)), 0).getDate();
    return [`${ky}-01`, `${ky}-${String(last).padStart(2, '0')}`];
}

const F42_SQL = `SELECT TRIM(ma_buu_ta) AS ma_buu_ta, MIN(ten_buu_ta) AS ho_ten, ten_bc_phat AS ten_bc, COUNT(*) AS sl_mau,
                        SUM(CASE WHEN danh_gia = ? THEN 1 ELSE 0 END) AS sl_dung
                 FROM fact_f42
                 WHERE ngay_do_kiem BETWEEN ? AND ? AND ma_buu_ta IS NOT NULL AND TRIM(ma_buu_ta) <> ''
                 GROUP BY TRIM(ma_buu_ta), ten_bc_phat
                 ORDER BY TRIM(ma_buu_ta), ten_bc_phat`;

function toF42Rows(sqlRows) {
    return sqlRows.map((r) => ({
        ma_buu_ta: String(r.ma_buu_ta).normalize('NFC'), ho_ten: r.ho_ten == null ? '' : String(r.ho_ten).normalize('NFC'),
        ten_bc: r.ten_bc == null ? '' : String(r.ten_bc).normalize('NFC'), sl_mau: Number(r.sl_mau), sl_dung: Number(r.sl_dung),
    }));
}

/** @returns {Promise<Array<{ma_buu_ta, ho_ten, ten_bc, sl_mau, sl_dung}>>} empty when the period has no F4.2 row */
async function loadF42Rows(dbPath, ky) {
    const [from, to] = monthRange(ky);
    const db = await open(dbPath, { readOnly: true });
    try { return toF42Rows(await all(db, F42_SQL, [DAT, from, to])); } finally { await close(db); }
}

module.exports = { loadF42Rows, toF42Rows, monthRange, F42_SQL, DAT };
