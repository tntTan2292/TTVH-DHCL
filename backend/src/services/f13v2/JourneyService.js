'use strict';

// F13-V2-JOURNEY-01: the legs of a F1.3 parcel. F1.3 is measured from the level-1 driver's TMS scan down to the KTC1 floor
// until delivery (PO 2026-11-03), so only these milestones are shown, whichever the data has:
//   1 TMS scan down to the floor  fact_f13.thoi_gian_bd10_quet_tms
//   2 KTC1 closes towards BCVH    fact_f11.thoi_gian_bd10_dong_di_kttinh, found through the F4.1 BD10 number
//   3 Arrival confirmed at BCVH   fact_f41.thoi_gian_xnd_bd1 (PO checked a real parcel against the source)
//   4 Handed to the postman       fact_f42.thoi_gian_gbt
//   5 Delivered                   fact_f13.thoi_gian_ptc
// Legs are clock hours, shown as they are: what counts as a fault also depends on the level-2 mail route of each BCVH.
//
// The one cause shown is objective, whatever the milestones say: "Không trọn lô" (the lot did not reach Huế in one piece, not
// Huế's fault). Same rule as the weekly report (Cách A): the failed parcels of a lot carry 2 TMS batches or more. The lot number
// comes from BF Phát; a lot with one batch gets no cause here, because the delivery leg cannot be judged yet.

const { CANONICAL_BCVH_UNITS } = require('../../config/canonicalBcvhUnits');
const { isRealDate } = require('./periodResolve');

// A parcel's F4.1 / F4.2 row can carry an earlier or a later date than its F1.3 row.
const DAYS_BEFORE = 10;
const DAYS_AFTER = 5;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const LEGS = ['tms_depart', 'depart_arrive', 'tms_arrive', 'arrive_gbt', 'gbt_ptc', 'tms_ptc'];
const TEXT_SORT_FIELDS = new Set(['ma_bg', 'ten_tuyen', 'ten_bcvh', 'ten_buu_ta', 'danh_gia', 'ma_lo']);
const FAILED = 'Không đạt';

function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function shiftIsoDate(dateString, days) {
    const date = new Date(`${dateString}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

/** Times come as dd/mm/yyyy HH:MM:SS (F1.3, F4.1) or yyyy-mm-dd HH:MM:SS[.mmm] (F1.1, F4.2). Local clock, no zone. */
function parseTime(value) {
    if (!value) return null;
    const text = String(value).trim();
    let match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (match) return Date.UTC(+match[3], +match[2] - 1, +match[1], +match[4], +match[5], +match[6]);
    match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (match) return Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6]);
    return null;
}

function formatTime(ms) {
    return ms === null ? null : new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}

/** BD10 numbers of F1.3 / F4.1 start with a backtick (Excel text mark), those of F1.1 do not. */
function cleanBagNumber(value) {
    return value ? String(value).replace(/^[`']/, '').trim() : '';
}

/** Hours between two milestones; null when one is missing or they are out of order. */
function legHours(from, to) {
    if (from === null || to === null || to < from) return null;
    return Number(((to - from) / 3600000).toFixed(2));
}

function median(values) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const value = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    return Number(value.toFixed(2));
}

/** Among several F4.2 rows (delivery tried again): the one with this delivery time, else the last handover before it. */
function pickHandover(rows, ptc) {
    if (!rows || !rows.length) return null;
    const exact = rows.find((row) => ptc !== null && parseTime(row.thoi_gian_ptc) === ptc);
    if (exact) return exact;
    const dated = rows
        .map((row) => ({ row, at: parseTime(row.thoi_gian_gbt) }))
        .filter((item) => item.at !== null)
        .sort((a, b) => a.at - b.at);
    const before = dated.filter((item) => ptc === null || item.at <= ptc);
    const chosen = before[before.length - 1] || dated[dated.length - 1];
    return chosen ? chosen.row : rows[rows.length - 1];
}

/**
 * Per lot: its parcels and TMS batches. The batches decide for every account (a lot is one lot), the parcel counts only cover
 * the units the account may see, so a BCVH account never learns another unit's volume.
 */
function buildLots(lotRows, scanRows, allowed) {
    const lotOf = new Map();
    for (const row of lotRows) if (!lotOf.has(row.lading_code)) lotOf.set(row.lading_code, row.ma_lo);
    const lots = new Map();
    const counted = new Set();
    for (const row of scanRows) {
        const code = lotOf.get(row.ma_bg);
        if (!code || counted.has(row.ma_bg)) continue;
        counted.add(row.ma_bg);
        const lot = lots.get(code) || { volume: 0, failed: 0, scans: new Set(), failedScans: new Set() };
        const scan = row.thoi_gian_bd10_quet_tms;
        const isFailed = row.danh_gia_2026 === FAILED;
        if (scan) lot.scans.add(scan);
        if (scan && isFailed) lot.failedScans.add(scan);
        if (!allowed || allowed.has(String(row.ma_bcvh))) {
            lot.volume += 1;
            if (isFailed) lot.failed += 1;
        }
        lots.set(code, lot);
    }
    return { lotOf, lots };
}

function lotOfParcel(code, lots) {
    const lot = code ? lots.get(code) : null;
    if (!lot) return null;
    const times = [...lot.scans].map(parseTime).filter((value) => value !== null);
    return {
        ma_lo: code,
        volume: lot.volume,
        failed: lot.failed,
        tms_batches: lot.scans.size,
        failed_tms_batches: lot.failedScans.size,
        first_tms: times.length ? formatTime(Math.min(...times)) : null,
        last_tms: times.length ? formatTime(Math.max(...times)) : null,
        incomplete: lot.failedScans.size > 1,
    };
}

function groupByParcel(rows, wanted) {
    const map = new Map();
    for (const row of rows) {
        if (!wanted.has(row.ma_bg)) continue;
        const list = map.get(row.ma_bg);
        if (list) list.push(row);
        else map.set(row.ma_bg, [row]);
    }
    return map;
}

class JourneyService {
    constructor({ repository } = {}) {
        if (!repository) throw new Error('JourneyService needs a repository');
        this.repository = repository;
        this.codes = new Set(CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh));
    }

    /** bcvhId: one unit asked for. allowedCodes: the units of a BCVH-mode account, null for a city-wide one. */
    async _parcels(date, { bcvhId = null, allowedCodes = null } = {}) {
        if (!isRealDate(date)) throw fail('INVALID_DATE', 'date must be a valid date in YYYY-MM-DD format');
        if (bcvhId && !this.codes.has(String(bcvhId))) throw fail('INVALID_BCVH', 'Mã BCVH không hợp lệ.');

        const allowed = allowedCodes ? new Set(allowedCodes.map(String)) : null;
        const seen = new Set();
        const f13 = (await this.repository.getF13Parcels(date)).filter((row) => {
            const code = String(row.ma_bcvh || '');
            if (!this.codes.has(code) || seen.has(row.ma_bg)) return false;
            if (bcvhId && code !== String(bcvhId)) return false;
            if (allowed && !allowed.has(code)) return false;
            seen.add(row.ma_bg);
            return true;
        });

        const fromDate = shiftIsoDate(date, -DAYS_BEFORE);
        const toDate = shiftIsoDate(date, DAYS_AFTER);
        const [f41Rows, f42Rows, f11Rows, lotRows, scanRows] = await Promise.all([
            this.repository.getF41Arrivals(fromDate, toDate),
            this.repository.getF42Handovers(fromDate, toDate),
            this.repository.getF11Departures(fromDate, toDate),
            this.repository.getBfLots(fromDate, shiftIsoDate(toDate, 1)), // BF Phát can be dated the day after delivery
            this.repository.getF13LotScans(fromDate, toDate),
        ]);
        const { lotOf, lots } = buildLots(lotRows, scanRows, allowed);
        const arrivals = groupByParcel(f41Rows, seen);
        const handovers = groupByParcel(f42Rows, seen);
        const departures = new Map(f11Rows.map((row) => [cleanBagNumber(row.so_bd10_dong_di_kttinh), row.thoi_gian_bd10_dong_di_kttinh]));

        return f13.map((row) => {
            const arrivalRows = arrivals.get(row.ma_bg) || [];
            const arrival = arrivalRows.find((item) => item.ngay_do_kiem === date) || arrivalRows[arrivalRows.length - 1] || null;
            const tms = parseTime(row.thoi_gian_bd10_quet_tms);
            const ptc = parseTime(row.thoi_gian_ptc);
            const handover = pickHandover(handovers.get(row.ma_bg), ptc);
            const depart = arrival ? parseTime(departures.get(cleanBagNumber(arrival.so_hieu_bd10_xnd_bcp))) : null;
            const arrive = arrival ? parseTime(arrival.thoi_gian_xnd_bd1) : null;
            const gbt = handover ? parseTime(handover.thoi_gian_gbt) : null;
            const lot = lotOfParcel(lotOf.get(row.ma_bg), lots);
            return {
                lot,
                ma_lo: lot?.ma_lo ?? null,
                khong_tron_lo: Boolean(lot?.incomplete && row.danh_gia_2026 === FAILED),
                ma_bg: row.ma_bg,
                ma_bcvh: row.ma_bcvh,
                ten_bcvh: row.ten_bcvh,
                ma_tuyen: row.ma_tuyen || null,
                ten_tuyen: row.ten_tuyen || null,
                danh_gia: row.danh_gia_2026 || null,
                ma_buu_ta: handover?.ma_buu_ta || null,
                ten_buu_ta: handover?.ten_buu_ta || null,
                so_gio_tct: row.thoi_gian_thuc_hien_thuc_te_gio || null,
                milestones: { tms: formatTime(tms), depart: formatTime(depart), arrive: formatTime(arrive), gbt: formatTime(gbt), ptc: formatTime(ptc) },
                legs: {
                    tms_depart: legHours(tms, depart),
                    depart_arrive: legHours(depart, arrive),
                    tms_arrive: legHours(tms, arrive),
                    arrive_gbt: legHours(arrive, gbt),
                    gbt_ptc: legHours(gbt, ptc),
                    tms_ptc: legHours(tms, ptc),
                },
            };
        });
    }

    _coverage(parcels) {
        const count = (key) => parcels.filter((parcel) => parcel.milestones[key] !== null).length;
        return {
            parcels: parcels.length,
            tms: count('tms'),
            depart: count('depart'),
            arrive: count('arrive'),
            gbt: count('gbt'),
            ptc: count('ptc'),
        };
    }

    _lotSummary(parcels) {
        const failed = parcels.filter((parcel) => parcel.danh_gia === FAILED);
        const incomplete = failed.filter((parcel) => parcel.khong_tron_lo);
        return {
            failed: failed.length,
            failed_in_lot: failed.filter((parcel) => parcel.ma_lo).length,
            khong_tron_lo: incomplete.length,
            khong_tron_lo_lots: new Set(incomplete.map((parcel) => parcel.ma_lo)).size,
        };
    }

    _routes(parcels) {
        const groups = new Map();
        for (const parcel of parcels) {
            const key = `${parcel.ma_bcvh}|${parcel.ma_tuyen || ''}`;
            const group = groups.get(key) || { parcel, list: [] };
            group.list.push(parcel);
            groups.set(key, group);
        }
        return [...groups.values()].map(({ parcel, list }) => {
            const passed = list.filter((item) => item.danh_gia === 'Đạt').length;
            const postmen = new Map();
            for (const item of list) {
                if (!item.ten_buu_ta && !item.ma_buu_ta) continue;
                const key = item.ma_buu_ta || item.ten_buu_ta;
                const entry = postmen.get(key) || { ma_buu_ta: item.ma_buu_ta, ten_buu_ta: item.ten_buu_ta, volume: 0 };
                entry.volume += 1;
                postmen.set(key, entry);
            }
            const legs = {};
            for (const leg of LEGS) legs[leg] = median(list.map((item) => item.legs[leg]).filter((value) => value !== null));
            return {
                ma_bcvh: parcel.ma_bcvh,
                ten_bcvh: parcel.ten_bcvh,
                ma_tuyen: parcel.ma_tuyen,
                ten_tuyen: parcel.ten_tuyen,
                volume: list.length,
                passed,
                failed: list.length - passed,
                rate: Number(((passed / list.length) * 100).toFixed(1)),
                khong_tron_lo: list.filter((item) => item.khong_tron_lo).length,
                postmen: [...postmen.values()].sort((a, b) => b.volume - a.volume),
                legs,
            };
        }).sort((a, b) => b.volume - a.volume);
    }

    async getRoutes(date, options) {
        const parcels = await this._parcels(date, options);
        return {
            routes: this._routes(parcels),
            meta: { date, has_data: parcels.length > 0, coverage: this._coverage(parcels), lots: this._lotSummary(parcels) },
        };
    }

    async getParcels(date, { route = null, search = null, onlyKhongTronLo = false, sort = 'tms_ptc', order = 'desc', page = 1, pageSize = DEFAULT_PAGE_SIZE, ...scope } = {}) {
        const parcels = await this._parcels(date, scope);
        const needle = search ? String(search).trim().toUpperCase() : '';
        const kept = parcels.filter((parcel) => (!route || parcel.ma_tuyen === String(route))
            && (!onlyKhongTronLo || parcel.khong_tron_lo)
            && (!needle || parcel.ma_bg.toUpperCase().includes(needle) || (parcel.ma_lo || '').toUpperCase().includes(needle)));

        const direction = order === 'asc' ? 1 : -1;
        const valueOf = (parcel) => {
            if (LEGS.includes(sort)) return parcel.legs[sort];
            if (TEXT_SORT_FIELDS.has(sort)) return parcel[sort];
            return parcel.milestones[sort] ?? null;
        };
        // Missing values last in both directions.
        const sorted = kept
            .map((parcel, index) => ({ parcel, index, value: valueOf(parcel) }))
            .sort((a, b) => {
                if (a.value === null || a.value === undefined) return b.value === null || b.value === undefined ? a.index - b.index : 1;
                if (b.value === null || b.value === undefined) return -1;
                const compared = typeof a.value === 'number' ? a.value - b.value : String(a.value).localeCompare(String(b.value), 'vi');
                return compared * direction || a.index - b.index;
            })
            .map((item) => item.parcel);

        const size = Math.min(Math.max(Number(pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
        const totalPages = Math.max(1, Math.ceil(sorted.length / size));
        const current = Math.min(Math.max(Number(page) || 1, 1), totalPages);
        return {
            parcels: sorted.slice((current - 1) * size, current * size),
            meta: { date, total: sorted.length, page: current, page_size: size, total_pages: totalPages },
        };
    }
}

module.exports = { JourneyService, parseTime, cleanBagNumber, legHours, median, pickHandover };
