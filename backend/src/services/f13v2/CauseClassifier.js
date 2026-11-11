'use strict';

// F13-WHY-DATA-02 (Business Rules SSOT v5 = v4 + decisions E1-E7): the one primary cause of a failed F1.3 parcel.
// Pure function, no database, no side effect. It never touches the official result (Đạt / Không đạt, TCT hours): it only reads them.
//
// Three independent layers in the answer:
//   cause   at most one primary cause, only for a Không đạt parcel (Phát carries a `detail`);
//   status  CAUSE | CHO_CHUYEN_QUAN (with a `reason`) | CHUA_DU_CAN_CU (no usable milestone at all) | KHONG_PHAN_TICH (Đạt, not rated);
//   flags   data-quality flags (never a cause), hints   operating hints (never a cause, never a second cause).
//
// Stages (E3): Khai thác T->D, Vận chuyển D->A, Phát A->E (Nộp tiền E->cash is never part of the journey).
// Tree (an earlier fault wins; the later stages are not examined, E5):
//   0 Đạt / not rated                -> no analysis
//   1 Không trọn lô                  -> the parcel's lot reached Huế in 2 TMS batches or more (evidence built by the caller)
//   2 T -> A over the limit          -> Khai thác / Vận chuyển by T->D and D->A ("chưa phân biệt" when D is unknown or the legs overlap)
//   3 delivery late (A within limit) -> Phát; detail CHAM_GIAO_BUU_TA (T->G over the limit, or G on a later calendar day than A) /
//                                       PHAT_CHAM_SAU_GIAO (handover in time and on the day of arrival) / none (G missing or invalid)
//   4 anything that cannot be inferred, or TCT says Không đạt while every milestone is within the limit (E7) -> CHO_CHUYEN_QUAN
// Basis (E1): INTERVAL when the TCT hours can be recomputed (R valid): stage verdicts come from the Lower / Upper interval of tctIntervals.
// MILESTONES when they cannot (R invalid): stages are judged on the milestones with night rule C only (T -> last milestone), TCT hours
// are not reconciled. The limit is the parcel's own thoi_gian_chi_tieu: no default, no list.
// Time left at arrival (E6, reference only): limit - net T->A. It never changes a cause; it feeds the hint DEN_BCVH_CON_IT_GIO.

const {
    HOUR_MS, DAY_MS, TOLERANCE_MS, VERDICT, nightIntervals, stageNetMs, parseTctMs, journeyModel, stageOf, verdictOf,
} = require('./tctIntervals');
const { REMAINING_HINT_MS, DIRECT_HANDOVER_MAX_EARLY_MS } = require('../../config/f13CauseConfig');

const CAUSES = Object.freeze({
    KHONG_TRON_LO: { group: 'A', objective: true, label: 'Không trọn lô' },
    KHAI_THAC: { group: 'A', objective: true, label: 'Khai thác (đến BCVH quá hạn)' },
    VAN_CHUYEN: { group: 'A', objective: true, label: 'Vận chuyển (đến BCVH quá hạn)' },
    KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET: { group: 'A', objective: true, label: 'Khai thác - Vận chuyển (chưa phân biệt)' },
    PHAT: { group: 'B', objective: false, label: 'Phát' },
});

const PHAT_DETAILS = Object.freeze({
    CHAM_GIAO_BUU_TA: { label: 'Chậm giao bưu tá', line: 'GIAO_BUU_TA_QUA_GIO' },
    PHAT_CHAM_SAU_GIAO: { label: 'Phát chậm sau khi giao', line: 'PHAT_MUON' },
});

const STATUS = Object.freeze({ CAUSE: 'CAUSE', WAIT_ANALYST: 'CHO_CHUYEN_QUAN', UNDECIDED: 'CHUA_DU_CAN_CU', NOT_ANALYSED: 'KHONG_PHAN_TICH' });
const BASIS = Object.freeze({ INTERVAL: 'INTERVAL', MILESTONES: 'MILESTONES' });

// Why a parcel is left to the Chuyên quản ("Chờ Chuyên quản phân tích", E5 / E7).
const REASONS = Object.freeze({
    TCT_LONGER_THAN_MILESTONES: 'TCT_DAI_HON_MOC', // E7: every milestone within the limit, TCT says Không đạt (TCT may start from an earlier scan)
    RESULT_NOT_MATCHING_LIMIT: 'KET_QUA_KHONG_KHOP_CHI_TIEU', // the TCT hours are within the limit but the verdict is Không đạt
    INTERVAL_CUTS_LIMIT: 'KHOANG_CAT_CHI_TIEU', // the interval of a stage crosses the limit
    LATE_ARRIVAL_OR_HANDOVER: 'CHAM_DEN_HAY_CHAM_GIAO', // no arrival time and T->G over the limit: the two cannot be told apart
    NO_ARRIVAL_ORDER: 'MOC_A_KHONG_HOP_LE',
    NO_HANDOVER: 'THIEU_MOC_G',
    HANDOVER_ORDER: 'MOC_G_KHONG_HOP_LE',
    NO_DELIVERY: 'THIEU_PTC',
});

const FLAGS = Object.freeze({
    NO_LIMIT: 'THIEU_CHI_TIEU',
    NO_F41: 'THIEU_F41',
    F41_NOT_UNIQUE: 'F41_KHONG_DUY_NHAT',
    NO_ARRIVAL: 'KHONG_XAC_NHAN_DEN', // no arrival time in F4.1 nor in the BatchFile
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
    A_BEFORE_TMS_DIRECT: 'A_TRUOC_TMS_GIAO_TRUC_TIEP', // F13-WHY-DATA-03: direct handover, A read as T
});
const HINTS = Object.freeze({ BCVH_LATE_SIGN: 'DAU_HIEU_CHAM_TAI_BCVH', LITTLE_TIME_LEFT: 'DEN_BCVH_CON_IT_GIO' });

const isTime = (value) => Number.isFinite(value);
const dayOf = (ms) => Math.floor(ms / DAY_MS);

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
 *   tms, depart, arrive, gbt, ptc   T, D, A, G, E in ms (null when unknown); A is F4.1 by the exact key, else the BatchFile (E2)
 *   aSource       'F41' | 'BF' | null: where A comes from
 *   khongTronLo   lot evidence from the caller (batches counted over every parcel of the lot)
 *   directHandover  true when the BCVH receives directly from ĐTC1 (F13-WHY-DATA-03): A earlier than T by at most 24 h is read as A = T
 *   f41           'OK' | 'NONE' | 'NOT_UNIQUE' (how the F4.1 row was found by the caller)
 */
function classify(input) {
    const flags = [];
    const hints = [];
    const detail = { limit_ms: null, tct_ms: null, l_ms: null, r_ms: null, raw_r_ms: null, stages: {} };
    const out = { basis: null, aSource: null, remaining: null };
    // F13-PARCEL-CARD-01 B3 (C6): the evidence is built in the same pass as the decision, from the very values the decision compared.
    let decision = null; // { rule, ...extra }: the branch that decided; set just before each return
    const decide = (rule, extra = {}) => { decision = { rule, ...extra }; };
    const buildEvidence = (status, causeCode, sub, reason, step) => {
        const limitMs = detail.limit_ms;
        const pairs = { t_a: [T, A], t_d: [T, D], d_a: [D, A], t_g: [T, G], t_e: [T, E] };
        const stages = {};
        for (const [name, value] of Object.entries(detail.stages)) {
            const [from, to] = pairs[name];
            const clockMs = to - from;
            stages[name] = {
                from_ms: from, to_ms: to, clock_ms: clockMs, night_ms: clockMs - value.net_ms, net_ms: value.net_ms,
                lower_ms: value.lower_ms, upper_ms: value.upper_ms, verdict: value.verdict,
                over_ms: limitMs === null ? null : value.net_ms - limitMs,
            };
        }
        const gap = (from, to) => (isTime(from) && isTime(to) ? to - from : null);
        const decisionNow = decision || { rule: reason || causeCode || status };
        const orderFlags = [FLAGS.A_OUT_OF_ORDER, FLAGS.G_OUT_OF_ORDER, FLAGS.D_OUT_OF_ORDER, FLAGS.WRONG_ORDER, FLAGS.G_BEFORE_T].filter((flag) => flags.includes(flag));
        return {
            version: 1,
            status, cause_code: causeCode, detail: sub, reason, step,
            basis: out.basis,
            limit_ms: limitMs, tct_ms: detail.tct_ms, l_ms: detail.l_ms, r_ms: detail.r_ms,
            interval: out.basis === BASIS.INTERVAL ? { r_ms: detail.r_ms, tolerance_ms: TOLERANCE_MS, unlocated: detail.r_ms > TOLERANCE_MS } : null,
            remaining_at_arrival_ms: out.remaining,
            a_source: out.aSource,
            direct_handover_applied: directEarly,
            milestones: { tms: T, depart: D, arrive: A, arrive_raw: rawA, gbt: G, ptc: E },
            missing: Object.entries({ tms: T, depart: D, arrive: A, gbt: G, ptc: E }).filter(([, value]) => !isTime(value)).map(([key]) => key),
            out_of_order: orderFlags,
            clock_ms: { tms_depart: gap(T, D), depart_arrive: gap(D, A), tms_arrive: gap(T, A), arrive_gbt: gap(A, G), gbt_ptc: gap(G, E), tms_gbt: gap(T, G), tms_ptc: gap(T, E) },
            stages,
            decision: decisionNow,
            decisive: decisionNow.stage && stages[decisionNow.stage] ? { stage: decisionNow.stage, ...stages[decisionNow.stage], limit_ms: limitMs } : null,
        };
    };
    const answer = (status, causeCode, { sub = null, step = null, reason = null } = {}) => ({
        status,
        cause: causeCode ? { code: causeCode, ...CAUSES[causeCode], detail: sub, detail_label: sub ? PHAT_DETAILS[sub].label : null } : null,
        reason,
        step,
        basis: out.basis,
        a_source: out.aSource,
        remaining_at_arrival_ms: out.remaining,
        flags,
        hints,
        detail,
        evidence: buildEvidence(status, causeCode, sub, reason, step),
    });
    const wait = (reason, step) => answer(STATUS.WAIT_ANALYST, null, { reason, step });
    const unknown = (reason, step) => answer(STATUS.UNDECIDED, null, { reason, step });

    if (!input || !input.failed) return { status: STATUS.NOT_ANALYSED, cause: null, reason: null, step: null, basis: null, a_source: null, remaining_at_arrival_ms: null, flags: [], hints: [], detail, evidence: null };

    const { tms: T = null, depart: D = null, arrive: rawA = null, gbt: G = null, ptc: E = null } = input;
    // F13-WHY-DATA-03: direct handover from ĐTC1. A_eff = T when A is earlier than T by at most the guard; every later use reads A_eff.
    const directEarly = Boolean(input.directHandover) && isTime(rawA) && isTime(T) && rawA < T && T - rawA <= DIRECT_HANDOVER_MAX_EARLY_MS;
    const A = directEarly ? T : rawA;
    const limitMs = limitMsOf(input.limit);
    detail.limit_ms = limitMs;
    out.aSource = isTime(A) ? (input.aSource || 'F41') : null;
    if (limitMs === null) flags.push(FLAGS.NO_LIMIT);
    if (input.f41 === 'NONE') flags.push(FLAGS.NO_F41);
    if (input.f41 === 'NOT_UNIQUE') flags.push(FLAGS.F41_NOT_UNIQUE);
    if (!isTime(A)) flags.push(FLAGS.NO_ARRIVAL);
    if (directEarly) flags.push(FLAGS.A_BEFORE_TMS_DIRECT);
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

    // E1: INTERVAL when TCT hours can be recomputed; else the milestones with night rule C only (T -> E, or the last known milestone).
    let intervals = null;
    let endMs = null;
    if (model.valid) {
        out.basis = BASIS.INTERVAL;
        intervals = model.intervals;
        endMs = E;
    } else if (isTime(T)) {
        const known = (isTime(E) && E > T ? [E] : [D, A, G].filter((value) => isTime(value) && value > T));
        endMs = known.length ? Math.max(...known) : null;
        if (endMs !== null) {
            out.basis = BASIS.MILESTONES;
            intervals = nightIntervals(T, endMs);
        }
    }

    const stage = (name, from, to) => {
        if (out.basis === null || !isTime(from) || !isTime(to)) return null;
        let value = null;
        if (out.basis === BASIS.INTERVAL) value = stageOf(model, from, to);
        else if (to >= from && from >= T && to <= endMs) {
            const netMs = stageNetMs(intervals, from, to);
            value = { netMs, bounds: [netMs, netMs] };
        }
        if (!value) return null;
        detail.stages[name] = { net_ms: value.netMs, lower_ms: value.bounds[0], upper_ms: value.bounds[1], verdict: limitMs === null ? null : verdictOf(value.bounds, limitMs) };
        return value;
    };
    const verdictOfStage = (name) => detail.stages[name].verdict;

    const arrival = isTime(A) && limitMs !== null ? stage('t_a', T, A) : null;
    // E6: time left at arrival, reference only (limit - net T->A with night rule C, whatever the basis)
    if (arrival && limitMs !== null) {
        out.remaining = limitMs - arrival.netMs;
        if (out.remaining >= 0 && out.remaining < REMAINING_HINT_MS) hints.push(HINTS.LITTLE_TIME_LEFT);
    }

    // Step 1: Không trọn lô, independent of the time model.
    if (input.khongTronLo) {
        if (arrival && verdictOfStage('t_a') === VERDICT.OVER) hints.push(HINTS.BCVH_LATE_SIGN);
        decide('KHONG_TRON_LO', { stage: arrival ? 't_a' : null });
        return answer(STATUS.CAUSE, 'KHONG_TRON_LO');
    }

    if (limitMs === null) return unknown('CHI_TIEU', 'CHI_TIEU');
    if (out.basis === null) return unknown('KHONG_CO_MOC', 'THOI_GIAN'); // T missing, or no other milestone: nothing to judge

    // Step 2: arrival at the BCVH after the limit (Khai thác / Vận chuyển).
    if (isTime(A)) {
        if (!arrival) {
            flags.push(FLAGS.A_OUT_OF_ORDER);
            return wait(REASONS.NO_ARRIVAL_ORDER, 'T-A');
        }
        const arrivalVerdict = verdictOfStage('t_a');
        if (arrivalVerdict === VERDICT.UNDECIDED) { decide(REASONS.INTERVAL_CUTS_LIMIT, { stage: 't_a' }); return wait(REASONS.INTERVAL_CUTS_LIMIT, 'T-A'); }
        if (arrivalVerdict === VERDICT.OVER) {
            if (!isTime(D)) flags.push(FLAGS.NO_D);
            const first = isTime(D) ? stage('t_d', T, D) : null;
            const second = isTime(D) ? stage('d_a', D, A) : null;
            if (isTime(D) && !(first && second)) flags.push(FLAGS.D_OUT_OF_ORDER);
            const split = (result, why) => decide('DEN_BCVH_QUA_HAN', { stage: 't_a', split: { result, why } });
            if (!isTime(D)) split('KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', 'THIEU_MOC_D');
            else if (!first || !second) split('KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', 'MOC_D_DAO_THU_TU');
            else if (first.bounds[0] > second.bounds[1]) split('KHAI_THAC', 'T_D_LON_HON_D_A');
            else if (second.bounds[0] > first.bounds[1]) split('VAN_CHUYEN', 'D_A_LON_HON_T_D');
            else split('KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', 'HAI_CHANG_CHONG_LAN');
            if (!first || !second) return answer(STATUS.CAUSE, 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET');
            if (first.bounds[0] > second.bounds[1]) return answer(STATUS.CAUSE, 'KHAI_THAC');
            if (second.bounds[0] > first.bounds[1]) return answer(STATUS.CAUSE, 'VAN_CHUYEN');
            return answer(STATUS.CAUSE, 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET');
        }
    }

    // From here the arrival is within the limit, or unknown (E5). Is the delivery late at all? E7: TCT says Không đạt.
    if (!isTime(E)) return wait(REASONS.NO_DELIVERY, 'T-E');
    const total = stage('t_e', T, E);
    if (!total) return wait(REASONS.NO_ARRIVAL_ORDER, 'T-E');
    if (verdictOfStage('t_e') !== VERDICT.OVER) {
        decide(out.basis === BASIS.INTERVAL ? REASONS.RESULT_NOT_MATCHING_LIMIT : REASONS.TCT_LONGER_THAN_MILESTONES, { stage: 't_e' });
        if (out.basis === BASIS.INTERVAL) {
            flags.push(FLAGS.NOT_OVER_LIMIT);
            return wait(REASONS.RESULT_NOT_MATCHING_LIMIT, 'T-E');
        }
        return wait(REASONS.TCT_LONGER_THAN_MILESTONES, 'T-E'); // every milestone within the limit, TCT says Không đạt
    }

    // Step 3: the handover to the postman, inside the Phát stage (E4).
    let handover = null;
    if (!isTime(G)) flags.push(FLAGS.NO_G);
    else {
        handover = stage('t_g', T, G);
        if (!handover) flags.push(FLAGS.G_OUT_OF_ORDER);
    }
    if (!isTime(A)) {
        // E5: no arrival time anywhere. G is after A by nature: T->G in time and delivery late = Phát chậm sau khi giao;
        // T->G over the limit = a late arrival and a late handover cannot be told apart.
        if (!isTime(G)) return wait(REASONS.NO_HANDOVER, 'T-G');
        if (!handover) return wait(REASONS.HANDOVER_ORDER, 'T-G');
        const handoverVerdict = verdictOfStage('t_g');
        if (handoverVerdict === VERDICT.WITHIN) { decide('PHAT_SAU_GIAO', { stage: 't_g', via: 'T_G_TRONG_HAN', arrival_missing: true }); return answer(STATUS.CAUSE, 'PHAT', { sub: 'PHAT_CHAM_SAU_GIAO' }); }
        if (handoverVerdict === VERDICT.OVER) { decide(REASONS.LATE_ARRIVAL_OR_HANDOVER, { stage: 't_g' }); return wait(REASONS.LATE_ARRIVAL_OR_HANDOVER, 'T-G'); }
        decide(REASONS.INTERVAL_CUTS_LIMIT, { stage: 't_g' });
        return wait(REASONS.INTERVAL_CUTS_LIMIT, 'T-G');
    }
    const handoverVerdict = handover ? verdictOfStage('t_g') : null;
    const nextDay = isTime(G) && dayOf(G) > dayOf(A); // arrived and handed over only the next day
    if (handoverVerdict === VERDICT.OVER || nextDay) {
        decide('PHAT_CHAM_GIAO_BUU_TA', { stage: handover ? 't_g' : null, via: handoverVerdict === VERDICT.OVER ? 'T_G_QUA_HAN' : 'G_NGAY_SAU_NGAY_DEN', next_day: nextDay });
        return answer(STATUS.CAUSE, 'PHAT', { sub: 'CHAM_GIAO_BUU_TA' });
    }
    if (handoverVerdict === VERDICT.WITHIN) { decide('PHAT_SAU_GIAO', { stage: 't_g', via: 'T_G_TRONG_HAN', next_day: false }); return answer(STATUS.CAUSE, 'PHAT', { sub: 'PHAT_CHAM_SAU_GIAO' }); }
    decide('PHAT_KHONG_CHI_TIET', { stage: handover ? 't_g' : null });
    return answer(STATUS.CAUSE, 'PHAT'); // G missing, invalid or its interval crosses the limit: the stage is judged on A->E only, no detail
}

module.exports = { classify, limitMsOf, CAUSES, PHAT_DETAILS, STATUS, BASIS, REASONS, FLAGS, HINTS };
