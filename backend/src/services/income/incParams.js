'use strict';
/**
 * INC-PHAT-02 - helpers shared by the pure calculators: which parameter / price table is in force for a period, and Python-compatible rounding.
 * Rules of INCOME-PHAT-00_FROZEN_RULES.md section 1: the row with the greatest hieu_luc_tu that is <= the period (string comparison of YYYY-MM).
 */

/** Python's round(x) (half to even), the rounding PMTL uses for every amount. */
function pyRound(x) {
    if (Math.abs(x % 1) === 0.5) return 2 * Math.round(x / 2);
    return Math.round(x);
}

/** Python's round(x, 4) for the HSCL ratio (a tie at the 5th decimal is not representable in binary, so toFixed agrees). */
function round4(x) { return Number(x.toFixed(4)); }

function latestRows(paramRows, ky) {
    const byKey = new Map();
    for (const row of paramRows) {
        if (row.hieu_luc_tu > ky) continue;
        const old = byKey.get(row.khoa);
        if (!old || row.hieu_luc_tu > old.hieu_luc_tu) byKey.set(row.khoa, row);
    }
    return byKey;
}

/** => (khoa, default) => value in force for ky (PMTL tham_so). */
function makeParamReader(paramRows, ky) {
    const effective = latestRows(paramRows, ky);
    return (khoa, def) => (effective.has(khoa) ? Number(effective.get(khoa).gia_tri) : def);
}

/** Routes that are not paid by volume (TUYEN_KHONG_SL:<route> in force with a non-zero value). */
function khongSlRoutes(paramRows, ky) {
    const out = new Set();
    for (const [khoa, row] of latestRows(paramRows, ky)) {
        if (khoa.startsWith('TUYEN_KHONG_SL:') && Number(row.gia_tri)) out.add(khoa.split(':').slice(1).join(':'));
    }
    return out;
}

/** [[khoan, nhom, don_gia], ...] => Map('khoan|nhom' -> don_gia) (keys NFC-normalised). */
function priceMap(rows) {
    const map = new Map();
    for (const [khoan, nhom, donGia] of rows || []) map.set(`${String(khoan).normalize('NFC')}|${Number(nhom)}`, Number(donGia));
    return map;
}

module.exports = { pyRound, round4, makeParamReader, khongSlRoutes, priceMap };
