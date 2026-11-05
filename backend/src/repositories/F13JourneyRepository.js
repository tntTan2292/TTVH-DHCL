'use strict';

// F13-V2-JOURNEY-01: the rows the F1.3 parcel journey needs. fact_f41 / f42 / f11 have no index on ma_bg, so each source is
// read by its date index over a small window and joined in memory by the service.

// F13-WHY-AGG-01: the connection can be given (the cause tool reads a copy of the database); by default it is the shared one,
// required only when first used so that loading this file never opens the operational database.
class F13JourneyRepository {
    constructor(database = null) {
        this.database = database;
    }

    _all(sql, params) {
        const database = this.database || require('../config/db').db;
        return new Promise((resolve, reject) => {
            database.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
        });
    }

    getF13Parcels(date) {
        return this._all(
            `SELECT ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, danh_gia_2026,
                    thoi_gian_bd10_quet_tms, thoi_gian_ptc, thoi_gian_thuc_hien_thuc_te_gio, thoi_gian_chi_tieu
             FROM fact_f13 WHERE ngay_do_kiem = ?`,
            [date],
        );
    }

    // Every F1.3 parcel around the day: a lot's other parcels can be measured on other days.
    getF13LotScans(fromDate, toDate) {
        return this._all(
            `SELECT ma_bg, ma_bcvh, danh_gia_2026, thoi_gian_bd10_quet_tms
             FROM fact_f13 WHERE ngay_do_kiem BETWEEN ? AND ?`,
            [fromDate, toDate],
        );
    }

    // The lot number of a parcel is only in the delivery batch file (BF Phát); the same file gives the arrival at the BCVH
    // (xac_nhan_den_bcp, F13-WHY-DATA-02 E2). One read, one window: rows with a lot number or with a confirmed arrival.
    getBfLots(fromDate, toDate) {
        return this._all(
            `SELECT lading_code, ma_lo, mabc_phat, xac_nhan_den_bcp FROM fact_bf_phat
             WHERE ngay_bf BETWEEN ? AND ?
               AND ((ma_lo IS NOT NULL AND ma_lo <> '') OR (xac_nhan_den_bcp IS NOT NULL AND xac_nhan_den_bcp <> ''))`,
            [fromDate, toDate],
        );
    }

    getF41Arrivals(fromDate, toDate) {
        return this._all(
            `SELECT ma_bg, ngay_do_kiem, ma_bc_phat, so_hieu_bd10_xnd_bcp, thoi_gian_xnd_bd1
             FROM fact_f41 WHERE ngay_do_kiem BETWEEN ? AND ?`,
            [fromDate, toDate],
        );
    }

    getF42Handovers(fromDate, toDate) {
        return this._all(
            `SELECT ma_bg, ngay_do_kiem, ma_buu_ta, ten_buu_ta, thoi_gian_gbt, thoi_gian_ptc
             FROM fact_f42 WHERE ngay_do_kiem BETWEEN ? AND ?`,
            [fromDate, toDate],
        );
    }

    getF11Departures(fromDate, toDate) {
        return this._all(
            `SELECT so_bd10_dong_di_kttinh, MIN(thoi_gian_bd10_dong_di_kttinh) AS thoi_gian_bd10_dong_di_kttinh
             FROM fact_f11
             WHERE ngay_do_kiem BETWEEN ? AND ? AND so_bd10_dong_di_kttinh IS NOT NULL AND so_bd10_dong_di_kttinh <> ''
             GROUP BY so_bd10_dong_di_kttinh`,
            [fromDate, toDate],
        );
    }
}

module.exports = new F13JourneyRepository();
module.exports.F13JourneyRepository = F13JourneyRepository;
