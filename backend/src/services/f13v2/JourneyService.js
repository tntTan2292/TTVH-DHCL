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
// F13-WHY-DATA-02 (rules v5, E2): the arrival A is F4.1 by the exact key; when F4.1 has no row (or not a unique one), the BatchFile Phát
// `xac_nhan_den_bcp` of the parcel for the same BCVH (earliest non-empty value); the source is kept (`a_source`). BF Phát is read once, with
// the lot numbers (same window D-10..D+6).
//
// F13-WHY-DATA-01 (Manifest v4): every failed parcel gets at most one primary cause from CauseClassifier, with data-quality flags and
// operating hints beside it. The classifier's inputs are built here:
//   - the F4.1 arrival row is found by the exact key ma_bg + ngay_do_kiem + ma_bc_phat (none -> no arrival, several -> not unique;
//     never another day, another BCVH or the last row);
//   - G for the classifier is the FIRST handover by time in F4.2, success or not (`pickFirstHandover`); the displayed milestone and the
//     postman name keep `pickHandover` (unchanged);
//   - "Không trọn lô": the TMS batches of a lot are counted over EVERY parcel of the lot (BF Phát gives the lot number); only a failed
//     parcel of a lot with 2 batches or more carries the cause, even when it reached the BCVH in time. A lot with one batch gets none.

const { CANONICAL_BCVH_UNITS } = require('../../config/canonicalBcvhUnits');
const { isRealDate } = require('./periodResolve');
const { classify } = require('./CauseClassifier');
const { DIRECT_HANDOVER_BCVH, DIRECT_HANDOVER_MAX_EARLY_MS } = require('../../config/f13CauseConfig');

// A parcel's F4.1 / F4.2 row can carry an earlier or a later date than its F1.3 row.
const DAYS_BEFORE = 10;
const DAYS_AFTER = 5;
const BF_EXTRA_DAYS = 1; // BF Phát can be dated the day after delivery
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

/** BatchFile times come as M/D/YYYY h:mm:ss AM/PM (local clock like the other sources); null when empty or malformed. */
function parseBatchFileTime(value) {
    if (!value) return null;
    const match = String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) (AM|PM)$/i);
    if (!match) return null;
    const hour = (Number(match[4]) % 12) + (match[7].toUpperCase() === 'PM' ? 12 : 0);
    return Date.UTC(Number(match[3]), Number(match[1]) - 1, Number(match[2]), hour, Number(match[5]), Number(match[6]));
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

/** F13-WHY-DATA-01: the first handover by time (F4.2), delivery succeeded or not; null when no row has a valid time. */
function pickFirstHandover(rows) {
    if (!rows || !rows.length) return null;
    let chosen = null;
    let chosenAt = null;
    for (const row of rows) {
        const at = parseTime(row.thoi_gian_gbt);
        if (at !== null && (chosenAt === null || at < chosenAt)) {
            chosen = row;
            chosenAt = at;
        }
    }
    return chosen;
}

/** F13-WHY-DATA-01: the F4.1 row of this parcel on this measurement day for this BCVH. Several rows are not unique: nothing is guessed. */
function pickArrival(rows, date, bcvh) {
    const exact = (rows || []).filter((row) => row.ngay_do_kiem === date && String(row.ma_bc_phat ?? '') === String(bcvh ?? ''));
    if (exact.length === 0) return { row: null, state: 'NONE' };
    if (exact.length > 1) return { row: null, state: 'NOT_UNIQUE' };
    return { row: exact[0], state: 'OK' };
}

/** F13-WHY-DATA-02 (E2): the earliest confirmed arrival at this BCVH in the BatchFile rows of a parcel; null when none. */
function pickBatchFileArrival(rows, bcvh) {
    let chosen = null;
    for (const row of rows || []) {
        if (String(row.mabc_phat ?? '') !== String(bcvh ?? '')) continue;
        const at = parseBatchFileTime(row.xac_nhan_den_bcp);
        if (at !== null && (chosen === null || at < chosen)) chosen = at;
    }
    return chosen;
}

/**
 * Per lot: its parcels and TMS batches (counted over every parcel of the lot, passed or failed). The batches decide for every account (a lot is one lot), the parcel counts only cover
 * the units the account may see, so a BCVH account never learns another unit's volume.
 */
function buildLots(lotRows, scanRows, allowed) {
    const lotOf = new Map();
    for (const row of lotRows) if (row.ma_lo && !lotOf.has(row.lading_code)) lotOf.set(row.lading_code, row.ma_lo);
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
        incomplete: lot.scans.size > 1,
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
            this.repository.getBfLots(fromDate, shiftIsoDate(toDate, BF_EXTRA_DAYS)),
            this.repository.getF13LotScans(fromDate, toDate),
        ]);
        const { lotOf, lots } = buildLots(lotRows, scanRows, allowed);
        const arrivals = groupByParcel(f41Rows, seen);
        const batchFile = new Map(); // BF Phát rows (lading_code) of the parcels of this day, for the arrival time (E2)
        for (const row of lotRows) {
            if (!row.xac_nhan_den_bcp || !seen.has(row.lading_code)) continue;
            const list = batchFile.get(row.lading_code);
            if (list) list.push(row);
            else batchFile.set(row.lading_code, [row]);
        }
        const handovers = groupByParcel(f42Rows, seen);
        const departures = new Map(f11Rows.map((row) => [cleanBagNumber(row.so_bd10_dong_di_kttinh), row.thoi_gian_bd10_dong_di_kttinh]));

        return f13.map((row) => {
            const { row: arrival, state: f41State } = pickArrival(arrivals.get(row.ma_bg), date, row.ma_bcvh);
            const tms = parseTime(row.thoi_gian_bd10_quet_tms);
            const ptc = parseTime(row.thoi_gian_ptc);
            const handover = pickHandover(handovers.get(row.ma_bg), ptc);
            const depart = arrival ? parseTime(departures.get(cleanBagNumber(arrival.so_hieu_bd10_xnd_bcp))) : null;
            const arriveF41 = arrival ? parseTime(arrival.thoi_gian_xnd_bd1) : null;
            // E2: F4.1 by the exact key first; without a usable F4.1 row, the BatchFile arrival of the same BCVH.
            const arriveBf = arriveF41 === null ? pickBatchFileArrival(batchFile.get(row.ma_bg), row.ma_bcvh) : null;
            const arrive = arriveF41 !== null ? arriveF41 : arriveBf;
            const aSource = arriveF41 !== null ? 'F41' : (arriveBf !== null ? 'BF' : null);
            const gbt = handover ? parseTime(handover.thoi_gian_gbt) : null;
            const lot = lotOfParcel(lotOf.get(row.ma_bg), lots);
            const khongTronLo = Boolean(lot?.incomplete && row.danh_gia_2026 === FAILED);
            const firstHandover = pickFirstHandover(handovers.get(row.ma_bg));
            const gbtFirst = firstHandover ? parseTime(firstHandover.thoi_gian_gbt) : null;
            const analysis = classify({
                failed: row.danh_gia_2026 === FAILED,
                khongTronLo,
                limit: row.thoi_gian_chi_tieu,
                tct: row.thoi_gian_thuc_hien_thuc_te_gio,
                f41: f41State,
                aSource,
                tms,
                depart,
                arrive,
                gbt: gbtFirst,
                ptc,
                directHandover: DIRECT_HANDOVER_BCVH.includes(String(row.ma_bcvh)),
            });
            // F13-WHY-DATA-03: the leg T -> A uses A_eff (= T) when the classifier applied the direct-handover rule; the milestone shown stays the raw A.
            // (computed here too, not from the flags: a passed parcel is not classified but its leg must match)
            const directEarly = DIRECT_HANDOVER_BCVH.includes(String(row.ma_bcvh)) && arrive !== null && tms !== null && arrive < tms && tms - arrive <= DIRECT_HANDOVER_MAX_EARLY_MS;
            const arriveEff = directEarly ? tms : arrive;
            return {
                cause: analysis.cause,
                cause_status: analysis.status,
                cause_step: analysis.step,
                cause_reason: analysis.reason,
                cause_basis: analysis.basis,
                a_source: analysis.a_source,
                remaining_at_arrival_ms: analysis.remaining_at_arrival_ms,
                flags: analysis.flags,
                hints: analysis.hints,
                cause_detail: analysis.detail,
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
                // F13-WHY-AGG-01: the postman of the first handover (the one the classifier uses); ma_buu_ta stays the one shown on the journey.
                ma_buu_ta_first: firstHandover?.ma_buu_ta || null,
                ten_buu_ta_first: firstHandover?.ten_buu_ta || null,
                so_gio_tct: row.thoi_gian_thuc_hien_thuc_te_gio || null,
                milestones: { tms: formatTime(tms), depart: formatTime(depart), arrive: formatTime(arrive), arrive_source: aSource, gbt: formatTime(gbt), gbt_first: formatTime(gbtFirst), ptc: formatTime(ptc) },
                legs: {
                    tms_depart: legHours(tms, depart),
                    depart_arrive: legHours(depart, arrive),
                    tms_arrive: legHours(tms, arriveEff),
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

module.exports = { JourneyService, parseBatchFileTime, pickBatchFileArrival, DAYS_BEFORE, DAYS_AFTER, BF_EXTRA_DAYS, shiftIsoDate, parseTime, cleanBagNumber, legHours, median, pickHandover, pickFirstHandover, pickArrival };
