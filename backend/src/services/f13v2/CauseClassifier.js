'use strict';

// F13-WHY-DATA-01 (Manifest v4, Business Rules SSOT LOCKED): the one primary cause of a failed F1.3 parcel.
// Pure function, no database, no side effect. It never touches the official result (Đạt / Không đạt, TCT hours): it only reads them.
//
// Three independent layers in the answer:
//   cause   at most one primary cause, only for a Không đạt parcel;
//   flags   data-quality flags (never a cause);
//   hints   operating hints (never a cause, never a second cause).
// "Chưa đủ căn cứ" is a status (with the step where the tree stopped), not a cause.
//
// Tree (an earlier fault wins; a step that cannot be judged stops the tree):
//   0 Đạt                 -> no analysis
//   1 Không trọn lô       -> the parcel's lot reached Huế in 2 TMS batches or more (evidence from the whole lot, built by the caller)
//   2 T -> A over limit   -> arrived at the BCVH late: Khai thác / Vận chuyển by the two legs T->D and D->A, "chưa phân biệt" when
//                            the two intervals overlap or D is missing
//   3 T -> G over limit   -> handed to the postman late
//   4 G -> E              -> delivery late (T -> E is over by definition for a failed parcel)
//   5 otherwise           -> chưa đủ căn cứ
// Stage verdicts come from tctIntervals (night rule C, difference R to the official TCT time, Lower/Upper interval): over only when
// the whole interval is above the limit, equal to the limit is not over. The limit is the parcel's own thoi_gian_chi_tieu: there is
// no default, no fixed list; without it the parcel gets the flag THIEU_CHI_TIEU and no cause.

const {
    HOUR_MS, TOLERANCE_MS, VERDICT, parseTctMs, journeyModel, stageOf, verdictOf,
} = require('./tctIntervals');

const CAUSES = Object.freeze({
    KHONG_TRON_LO: { group: 'A', objective: true, label: 'Không trọn lô' },
    KHAI_THAC: { group: 'A', objective: true, label: 'Khai thác (đến BCVH quá hạn)' },
    VAN_CHUYEN: { group: 'A', objective: true, label: 'Vận chuyển (đến BCVH quá hạn)' },
    KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET: { group: 'A', objective: true, label: 'Khai thác - Vận chuyển (chưa phân biệt)' },
    GIAO_BUU_TA_QUA_GIO: { group: 'B', objective: false, label: 'Giao bưu tá quá giờ' },
    PHAT_MUON: { group: 'B', objective: false, label: 'Phát muộn' },
});

const STATUS = Object.freeze({ CAUSE: 'CAUSE', NOT_ANALYSED: 'KHONG_PHAN_TICH', UNDECIDED: 'CHUA_DU_CAN_CU' });
const FLAGS = Object.freeze({
    NO_LIMIT: 'THIEU_CHI_TIEU',
    NO_F41: 'THIEU_F41',
    F41_NOT_UNIQUE: 'F41_KHONG_DUY_NHAT',
    WRONG_ORDER: 'SAI_TRINH_TU_NGHIEP_VU',
    G_BEFORE_T: 'G_TRUOC_T',
    NO_D: 'THIEU_MOC_D',
    D_OUT_OF_ORDER: 'MOC_D_DAO_THU_TU',
    NO_G: 'THIEU_MOC_G',
    G_OUT_OF_ORDER: 'MOC_G_KHONG_HOP_LE',
    A_OUT_OF_ORDER: 'MOC_A_KHONG_HOP_LE',
    NO_E: 'THIEU_MOC_E',
    BAD_TIME: 'THOI_GIAN_KHONG_HOP_LE',
    BAD_R: 'R_KHONG_HOP_LE',
    UNLOCATED: 'UNLOCATED_TCT_EXCLUSION',
    NOT_OVER_LIMIT: 'KET_QUA_KHONG_KHOP_CHI_TIEU',
});
const HINTS = Object.freeze({ BCVH_LATE_SIGN: 'DAU_HIEU_CHAM_TAI_BCVH' });

const isTime = (value) => Number.isFinite(value);

/** The parcel's own limit in ms; null when missing or not a positive number (no fallback). */
function limitMsOf(limit) {
    if (limit === null || limit === undefined || limit === '') return null;
    const hours = Number(limit);
    return Number.isFinite(hours) && hours > 0 ? Math.round(hours * HOUR_MS) : null;
}

/**
 * @param {object} input
 *   failed        true for a Không đạt parcel
 *   limit         thoi_gian_chi_tieu (hours)
 *   tct           official TCT time "h:mm" (thoi_gian_thuc_hien_thuc_te_gio) or milliseconds as a number
 *   tms, depart, arrive, gbt, ptc   T, D, A, G, E in ms (null when unknown)
 *   khongTronLo   lot evidence from the caller (batches counted over every parcel of the lot)
 *   f41           'OK' | 'NONE' | 'NOT_UNIQUE' (how the F4.1 row was found by the caller)
 */
function classify(input) {
    const flags = [];
    const hints = [];
    const detail = { limit_ms: null, tct_ms: null, l_ms: null, r_ms: null, raw_r_ms: null, stages: {} };
    const result = (status, cause, step = null) => ({ status, cause: cause ? { code: cause, ...CAUSES[cause] } : null, step, flags, hints, detail });

    if (!input || !input.failed) return { status: STATUS.NOT_ANALYSED, cause: null, step: null, flags: [], hints: [], detail };

    const { tms: T = null, depart: D = null, arrive: A = null, gbt: G = null, ptc: E = null } = input;
    const limitMs = limitMsOf(input.limit);
    detail.limit_ms = limitMs;
    if (limitMs === null) flags.push(FLAGS.NO_LIMIT);
    if (input.f41 === 'NONE') flags.push(FLAGS.NO_F41);
    if (input.f41 === 'NOT_UNIQUE') flags.push(FLAGS.F41_NOT_UNIQUE);
    if (isTime(G) && isTime(A) && G < A) flags.push(FLAGS.WRONG_ORDER);
    if (isTime(G) && isTime(T) && G < T) flags.push(FLAGS.G_BEFORE_T);
    if (!isTime(E)) flags.push(FLAGS.NO_E);

    const tctMs = typeof input.tct === 'number' ? input.tct : parseTctMs(input.tct);
    detail.tct_ms = tctMs;
    const model = journeyModel(T, E, tctMs);
    if (model.valid || model.reason === 'R_KHONG_HOP_LE') {
        detail.l_ms = model.lMs;
        detail.raw_r_ms = model.rawRMs;
    }
    if (!model.valid) {
        if (model.reason === 'R_KHONG_HOP_LE') flags.push(FLAGS.BAD_R);
        else if (isTime(E)) flags.push(FLAGS.BAD_TIME);
    } else {
        detail.r_ms = model.rMs;
        if (model.rMs > TOLERANCE_MS) flags.push(FLAGS.UNLOCATED);
    }

    const stage = (name, from, to) => {
        const value = stageOf(model, from, to);
        if (value) detail.stages[name] = { net_ms: value.netMs, lower_ms: value.bounds[0], upper_ms: value.bounds[1], verdict: limitMs === null ? null : verdictOf(value.bounds, limitMs) };
        return value;
    };

    const arrival = isTime(A) && limitMs !== null ? stage('t_a', T, A) : null;

    // Step 1: Không trọn lô. Independent of the time model; the hint below needs the time model.
    if (input.khongTronLo) {
        if (arrival && detail.stages.t_a.verdict === VERDICT.OVER) hints.push(HINTS.BCVH_LATE_SIGN);
        return result(STATUS.CAUSE, 'KHONG_TRON_LO');
    }

    if (limitMs === null) return result(STATUS.UNDECIDED, null, 'CHI_TIEU');
    if (!model.valid) return result(STATUS.UNDECIDED, null, 'THOI_GIAN');

    // Step 2: arrived at the BCVH after the limit.
    if (!isTime(A)) return result(STATUS.UNDECIDED, null, 'T-A');
    if (!arrival) {
        flags.push(FLAGS.A_OUT_OF_ORDER);
        return result(STATUS.UNDECIDED, null, 'T-A');
    }
    const arrivalVerdict = detail.stages.t_a.verdict;
    if (arrivalVerdict === VERDICT.UNDECIDED) return result(STATUS.UNDECIDED, null, 'T-A');
    if (arrivalVerdict === VERDICT.OVER) {
        if (!isTime(D)) flags.push(FLAGS.NO_D);
        const first = isTime(D) ? stage('t_d', T, D) : null;
        const second = isTime(D) ? stage('d_a', D, A) : null;
        if (isTime(D) && !(first && second)) flags.push(FLAGS.D_OUT_OF_ORDER);
        if (!first || !second) return result(STATUS.CAUSE, 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET');
        if (first.bounds[0] > second.bounds[1]) return result(STATUS.CAUSE, 'KHAI_THAC');
        if (second.bounds[0] > first.bounds[1]) return result(STATUS.CAUSE, 'VAN_CHUYEN');
        return result(STATUS.CAUSE, 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET');
    }

    // Step 3: handed to the postman after the limit (G < A only raises a flag, the stage is judged as it is).
    if (!isTime(G)) {
        flags.push(FLAGS.NO_G);
        return result(STATUS.UNDECIDED, null, 'T-G');
    }
    const handover = stage('t_g', T, G);
    if (!handover) {
        flags.push(FLAGS.G_OUT_OF_ORDER);
        return result(STATUS.UNDECIDED, null, 'T-G');
    }
    const handoverVerdict = detail.stages.t_g.verdict;
    if (handoverVerdict === VERDICT.UNDECIDED) return result(STATUS.UNDECIDED, null, 'T-G');
    if (handoverVerdict === VERDICT.OVER) return result(STATUS.CAUSE, 'GIAO_BUU_TA_QUA_GIO');

    // Step 4: delivery late. T -> E is over for a failed parcel; G -> E must be a valid stage.
    const delivery = stage('g_e', G, E);
    const total = stage('t_e', T, E);
    if (!delivery) {
        flags.push(FLAGS.G_OUT_OF_ORDER);
        return result(STATUS.UNDECIDED, null, 'G-E');
    }
    if (detail.stages.t_e.verdict !== VERDICT.OVER) {
        flags.push(FLAGS.NOT_OVER_LIMIT);
        return result(STATUS.UNDECIDED, null, 'T-E');
    }
    return total ? result(STATUS.CAUSE, 'PHAT_MUON') : result(STATUS.UNDECIDED, null, 'T-E');
}

module.exports = { classify, limitMsOf, CAUSES, STATUS, FLAGS, HINTS };
