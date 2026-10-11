'use strict';

// F12-PHASE-4 - national rank of Hue among the 34 ranked provinces for F1.2 (thu gom lien tinh).
//
// Rule (PO decision PD-F12-7, 2026-10-11): rank by the ACCEPTING province (ma_tinh_chap_nhan), the only
// side F1.2 has. Rows of a province are added first (numerator sl_dung_qd, denominator sl_bd10_dong_di =
// the published rate "9 = 8/6"), then the rate is computed and ranked: rate desc, then volume desc, no
// shared ranks. Only the 34 frozen codes are ranked; EMS ('01'), the Ha Noi / HCM centres and Binh Duong
// are stored but ignored. Same public methods and result shape as F11NationalRankService.

const defaultDb = require('../config/db').db;
const { F11NationalRankService } = require('./F11NationalRankService');

const F12_RANK_SOURCE = Object.freeze({
    table: 'fact_f12_national',
    unitColumn: 'ma_tinh_chap_nhan',
    nameColumn: 'ten_tinh_chap_nhan',
    volumeColumn: 'sl_bd10_dong_di',
    passedColumn: 'sl_dung_qd',
    metric: 'tl_dung_qd',
    metricLabel: 'Tỷ lệ đúng quy định (≤ 10 giờ) theo báo cáo toàn quốc',
});

class F12NationalRankService extends F11NationalRankService {
    constructor(db = defaultDb) {
        super(db, F12_RANK_SOURCE);
    }
}

module.exports = {
    F12NationalRankService,
    f12NationalRankService: new F12NationalRankService(),
    F12_RANK_SOURCE,
};
