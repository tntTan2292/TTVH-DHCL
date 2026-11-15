'use strict';
/**
 * INC-PHAT-02 - HSCL (hệ số KPI chất lượng phát) per postman, a pure function. Port of PMTL app/hscl.py tinh_hscl, FROZEN_RULES section 6.
 * The input is the per-postman F4.2 aggregate PMTL uses (rows of ma_buu_ta x ten_bc with sl_mau and sl_dung). Deriving that aggregate from
 * fact_f42 is INC-PHAT-03; nothing here reads a database.
 *
 *   hs = clamp(sl_dung / sl_mau / KH x (100 - penalty) / 100, MIN, MAX)
 *   exempt postman -> 1 ; not at a BCVH (TOAN_BO = 0 only) -> 1 ; F4.2 row but sl_mau = 0 -> MIN when TOAN_BO = 1, else 1
 */

/** => { kh, min, max, toanBo } from a parameter reader (khoa, default) => value. */
function hsclLimits(param) {
    return { kh: param('HSCL_PHAT_KH', 0.9), min: param('HSCL_PHAT_MIN', 0.7), max: param('HSCL_PHAT_MAX', 1.1), toanBo: Boolean(param('HSCL_PHAT_TOAN_BO', 0)) };
}

/**
 * @param {Array<{ma_buu_ta, ho_ten, ten_bc, sl_mau, sl_dung}>} f42Rows
 * @param {Map<string,string>} mien   postman -> reason (HSCL = 1)
 * @param {Map<string,number>} penalties postman -> penalty points (capped at 30)
 * @param {{kh:number,min:number,max:number,toanBo:boolean}} limits
 * @returns {Map<string,{hs,ty_le,sl_mau,sl_dung,diem,ly_do,ten,bc}>} empty when there is no F4.2 row
 */
function calculateHscl({ f42Rows, mien = new Map(), penalties = new Map(), limits }) {
    const out = new Map();
    if (!f42Rows || !f42Rows.length) return out;
    const { kh, min: mn, max: mx, toanBo } = limits;
    const gom = new Map();
    for (const r of f42Rows) {
        if (!gom.has(r.ma_buu_ta)) gom.set(r.ma_buu_ta, { ten: r.ho_ten, bc: [], sl_mau: 0, sl_dung: 0, vh: false });
        const x = gom.get(r.ma_buu_ta);
        x.bc.push(r.ten_bc);
        if (toanBo || String(r.ten_bc || '').toUpperCase().startsWith('BCVH')) {
            x.vh = true;
            x.sl_mau += r.sl_mau || 0;
            x.sl_dung += r.sl_dung || 0;
        }
    }
    for (const [ma, x] of gom) {
        const d = Math.min(30, penalties.get(ma) || 0);
        const tyLe = x.sl_mau ? x.sl_dung / x.sl_mau : null;
        let hs; let ly;
        if (mien.has(ma)) { hs = 1.0; ly = `miễn: ${mien.get(ma) || 'miễn'}`; }
        else if (!x.vh) { hs = 1.0; ly = 'không thuộc Bưu cục Vận hành'; }
        else if (!x.sl_mau && toanBo) { hs = mn; ly = 'có dòng F4.2 nhưng sản lượng GBT = 0 → mức tối thiểu (như bảng lương Excel)'; }
        else if (!x.sl_mau) { hs = 1.0; ly = 'không có sản lượng F4.2'; }
        else {
            const tho = tyLe / kh * (100 - d) / 100;
            hs = Math.max(mn, Math.min(mx, tho));
            ly = `${(tyLe * 100).toFixed(2)}% / ${Math.round(kh * 100)}%`;
        }
        out.set(ma, { hs, ty_le: tyLe, sl_mau: x.sl_mau, sl_dung: x.sl_dung, diem: d, ly_do: ly, ten: x.ten, bc: [...new Set(x.bc.filter(Boolean))].sort().join(', ') });
    }
    return out;
}

module.exports = { calculateHscl, hsclLimits };
