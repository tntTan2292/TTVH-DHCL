'use strict';

// F13-V2-JOURNEY-01: the rows the F1.3 parcel journey needs. fact_f41 / f42 / f11 have no index on ma_bg, so each source is
// read by its date index over a small window and joined in memory by the service.

const { db } = require('../config/db');

function all(sql, params) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
    });
}

class F13JourneyRepository {
    getF13Parcels(date) {
        return all(
            `SELECT ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, danh_gia_2026,
                    thoi_gian_bd10_quet_tms, thoi_gian_ptc, thoi_gian_thuc_hien_thuc_te_gio, thoi_gian_chi_tieu
             FROM fact_f13 WHERE ngay_do_kiem = ?`,
            [date],
        );
    }

    // Every F1.3 parcel around the day: a lot's other parcels can be measured on other days.
    getF13LotScans(fromDate, toDate) {
        return all(
            `SELECT ma_bg, ma_bcvh, danh_gia_2026, thoi_gian_bd10_quet_tms
             FROM fact_f13 WHERE ngay_do_kiem BETWEEN ? AND ?`,
            [fromDate, toDate],
        );
    }

    // The lot number of a parcel is only in the delivery batch file (BF Phát).
    getBfLots(fromDate, toDate) {
        return all(
            `SELECT lading_code, ma_lo FROM fact_bf_phat
             WHERE ngay_bf BETWEEN ? AND ? AND ma_lo IS NOT NULL AND ma_lo <> ''`,
            [fromDate, toDate],
        );
    }

    getF41Arrivals(fromDate, toDate) {
        return all(
            `SELECT ma_bg, ngay_do_kiem, ma_bc_phat, so_hieu_bd10_xnd_bcp, thoi_gian_xnd_bd1
             FROM fact_f41 WHERE ngay_do_kiem BETWEEN ? AND ?`,
            [fromDate, toDate],
        );
    }

    getF42Handovers(fromDate, toDate) {
        return all(
            `SELECT ma_bg, ngay_do_kiem, ma_buu_ta, ten_buu_ta, thoi_gian_gbt, thoi_gian_ptc
             FROM fact_f42 WHERE ngay_do_kiem BETWEEN ? AND ?`,
            [fromDate, toDate],
        );
    }

    getF11Departures(fromDate, toDate) {
        return all(
            `SELECT so_bd10_dong_di_kttinh, MIN(thoi_gian_bd10_dong_di_kttinh) AS thoi_gian_bd10_dong_di_kttinh
             FROM fact_f11
             WHERE ngay_do_kiem BETWEEN ? AND ? AND so_bd10_dong_di_kttinh IS NOT NULL AND so_bd10_dong_di_kttinh <> ''
             GROUP BY so_bd10_dong_di_kttinh`,
            [fromDate, toDate],
        );
    }
}

module.exports = new F13JourneyRepository();
