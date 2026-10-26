'use strict';

// F42-PHASE-4 - national rank of Hue among the 34 ranked provinces for F4.2 (chat luong phat giao buu ta).
//
// Rule (PO decision PD-F42-6, 2026-10-26): rank by the DELIVERING province (ma_tinh_phat). The 34 province rows
// are already aggregated from the postman rows at import (numerator sl_dung_qd = PTC dung quy dinh 11,5 h,
// denominator sl_gbt = every GBT row after the DKCL exclusions, the published rate "18 = 17/14"); the rate is
// then computed and ranked: rate desc, then volume desc, no shared ranks. Only the 34 frozen codes are stored.
// Same public methods and result shape as F11NationalRankService.

const defaultDb = require('../config/db').db;
const { F11NationalRankService } = require('./F11NationalRankService');

const F42_RANK_SOURCE = Object.freeze({
    table: 'fact_f42_national',
    unitColumn: 'ma_tinh_phat',
    nameColumn: 'ten_tinh_phat',
    volumeColumn: 'sl_gbt',
    passedColumn: 'sl_dung_qd',
    metric: 'tl_dung_qd',
    metricLabel: 'Tỷ lệ PTC đúng quy định (11,5 giờ) theo báo cáo toàn quốc',
});

class F42NationalRankService extends F11NationalRankService {
    constructor(db = defaultDb) {
        super(db, F42_RANK_SOURCE);
    }
}

module.exports = {
    F42NationalRankService,
    f42NationalRankService: new F42NationalRankService(),
    F42_RANK_SOURCE,
};
