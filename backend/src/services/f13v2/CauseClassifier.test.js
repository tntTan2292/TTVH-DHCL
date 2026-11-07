'use strict';

// F13-WHY-DATA-02 R1: the cause tree of rules v5 (v4 + decisions E1-E7 of docs/10_TICKETS/F13-WHY-DATA-02_MANIFEST.md).
// Expected values are derived by hand from the manifests, not from the code's output.
// Run: node --experimental-sqlite --test backend/src/services/f13v2/CauseClassifier.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const { classify, limitMsOf, CAUSES, PHAT_DETAILS, STATUS, BASIS, REASONS, FLAGS, HINTS } = require('./CauseClassifier');
const { HOUR_MS, VERDICT } = require('./tctIntervals');
const { REMAINING_HINT_MS } = require('../../config/f13CauseConfig');

const at = (text) => Date.parse(`${text.replace(' ', 'T')}:00Z`);
// Journey: T 20/10 10:00, D 16:00, A 21/10 12:00, G 14:00, E 20:00. One night (10 h): L = 24 h, net T->A 16 h, T->G 18 h, T->E 24 h, TCT 24:00 (R = 0).
const base = () => ({
    failed: true, limit: 12, tct: '24:00', f41: 'OK', aSource: 'F41', khongTronLo: false,
    tms: at('2026-10-20 10:00'), depart: at('2026-10-20 16:00'), arrive: at('2026-10-21 12:00'), gbt: at('2026-10-21 14:00'), ptc: at('2026-10-21 20:00'),
});
const run = (over = {}) => classify({ ...base(), ...over });
const code = (r) => (r.cause ? r.cause.code : null);
const sub = (r) => (r.cause ? r.cause.detail : null);

// ---------------------------------------------------------------- unchanged v4 behaviour (new vocabulary where v5 renames it)
test('Đạt or not rated: no analysis, no flag, no hint, no basis', () => {
    const r = classify({ ...base(), failed: false, limit: null, tct: null });
    assert.deepEqual([r.status, r.cause, r.reason, r.basis, r.a_source, r.remaining_at_arrival_ms, r.flags, r.hints], [STATUS.NOT_ANALYSED, null, null, null, null, null, [], []]);
});

test('arrival over the limit: second leg longer -> Vận chuyển, first leg longer -> Khai thác, D unknown -> chưa phân biệt (E3)', () => {
    assert.equal(code(run()), 'VAN_CHUYEN');
    assert.equal(code(run({ depart: at('2026-10-20 23:00') })), 'KHAI_THAC'); // 11 h against 5 h
    const noD = run({ depart: null });
    assert.equal(code(noD), 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET');
    assert.deepEqual(noD.flags, [FLAGS.NO_D]);
    assert.equal(code(run({ depart: at('2026-10-20 18:00') })), 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET'); // 8 h against 8 h
});

test('limit missing: flag THIEU_CHI_TIEU, chưa đủ căn cứ, no fallback to 14 h', () => {
    for (const limit of [null, undefined, '', 'abc', 0, -5]) {
        const r = run({ limit });
        assert.deepEqual([r.status, r.step, r.reason, code(r), r.flags], [STATUS.UNDECIDED, 'CHI_TIEU', 'CHI_TIEU', null, [FLAGS.NO_LIMIT]], String(limit));
    }
    assert.equal(limitMsOf('abc'), null);
});

test('Không trọn lô wins over everything and keeps the hint DAU_HIEU_CHAM_TAI_BCVH when the arrival is conclusively over the limit', () => {
    const late = run({ khongTronLo: true });
    assert.equal(code(late), 'KHONG_TRON_LO');
    assert.deepEqual(late.hints, [HINTS.BCVH_LATE_SIGN]);
    for (const over of [{ limit: null }, { arrive: null, aSource: null, f41: 'NONE' }, { ptc: null }, { tct: '99:00' }]) assert.equal(code(run({ khongTronLo: true, ...over })), 'KHONG_TRON_LO');
});

test('G before A only raises the flag, the analysis goes on', () => {
    const r = run({ gbt: at('2026-10-21 10:00') });
    assert.equal(code(r), 'VAN_CHUYEN');
    assert.deepEqual(r.flags, [FLAGS.WRONG_ORDER]);
});

test('limits 12, 14, 15, 16, 17 and other valid values use the parcel own limit (equal is not over)', () => {
    for (const limit of [12, 14, 15, '15', 15.5]) assert.equal(code(run({ limit })), 'VAN_CHUYEN', `limit ${limit}`); // T->A 16 h is over
    assert.deepEqual([code(run({ limit: 16 })), sub(run({ limit: 16 }))], ['PHAT', 'CHAM_GIAO_BUU_TA']); // T->A 16 within; T->G 18 over
    assert.deepEqual([code(run({ limit: 18 })), sub(run({ limit: 18 }))], ['PHAT', 'PHAT_CHAM_SAU_GIAO']); // T->G 18 h equal to the limit is not over; T->E 24 h is
});

// ---------------------------------------------------------------- E1: the basis
test('E1: R valid keeps the interval method; R inside the tolerance is read as 0', () => {
    const r = run({ tct: '24:00' });
    assert.equal(r.basis, BASIS.INTERVAL);
    assert.equal(r.detail.stages.t_a.lower_ms, 16 * HOUR_MS);
    const cut = run({ tct: '20:00' }); // R = 4 h: T->A is [12, 16] h, the limit 12 h is inside it
    assert.deepEqual([cut.status, cut.reason, cut.step, cut.basis, cut.flags], [STATUS.WAIT_ANALYST, REASONS.INTERVAL_CUTS_LIMIT, 'T-A', BASIS.INTERVAL, [FLAGS.UNLOCATED]]);
    assert.equal(code(run({ tct: '20:00', limit: 11 })), 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET'); // interval [12, 16] over 11 h; the two legs' intervals overlap
});

test('E1: R invalid -> the stages are judged on the milestones with night rule C only, TCT hours are not reconciled', () => {
    const r = run({ tct: '26:00' }); // R = -2 h
    assert.equal(r.basis, BASIS.MILESTONES);
    assert.deepEqual(r.flags, [FLAGS.BAD_R]);
    assert.equal(code(r), 'VAN_CHUYEN'); // T->A net 16 h > 12 h, legs 6 h / 10 h
    assert.equal(r.detail.stages.t_a.net_ms, 16 * HOUR_MS);
    assert.equal(r.detail.stages.t_a.lower_ms, r.detail.stages.t_a.upper_ms); // no R: the bounds are the milestones themselves
    for (const tct of ['99:00', -2 * HOUR_MS, null]) assert.equal(run({ tct }).basis, BASIS.MILESTONES, String(tct));
    // the same milestones give the same cause with a valid and an invalid R
    assert.equal(code(run({ tct: '24:00' })), code(run({ tct: '26:00' })));
});

test('E1: a milestone-based night: a night scan with the second night covered is judged the same way as the interval method would', () => {
    // T 20/10 22:00 -> D 21/10 14:00 -> A 22/10 12:00 -> E 22/10 20:00: raw 46 h, nights 9 + 10 = 19 h, L = 27 h
    const input = { tms: at('2026-10-20 22:00'), depart: at('2026-10-21 14:00'), arrive: at('2026-10-22 12:00'), gbt: at('2026-10-22 14:00'), ptc: at('2026-10-22 20:00') };
    for (const tct of ['27:00', '30:00']) {
        const r = run({ ...input, tct });
        assert.equal(r.detail.stages.t_a.net_ms, 19 * HOUR_MS, tct);
        assert.equal(r.detail.stages.t_d.net_ms, 7 * HOUR_MS);
        assert.equal(r.detail.stages.d_a.net_ms, 12 * HOUR_MS);
        assert.equal(code(r), 'VAN_CHUYEN');
    }
    assert.equal(run({ ...input, tct: '27:00' }).basis, BASIS.INTERVAL);
    assert.equal(run({ ...input, tct: '30:00' }).basis, BASIS.MILESTONES);
});

// ---------------------------------------------------------------- E2 / E3: arrival source and the stages
test('E2: the source of A is reported; without D (a BatchFile arrival has no bag) Khai thác / Vận chuyển stay "chưa phân biệt"', () => {
    assert.equal(run().a_source, 'F41');
    const bf = run({ aSource: 'BF', f41: 'NONE', depart: null });
    assert.equal(bf.a_source, 'BF');
    assert.equal(code(bf), 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET');
    assert.deepEqual(bf.flags, [FLAGS.NO_F41, FLAGS.NO_D]);
    assert.equal(run({ arrive: null, aSource: null, f41: 'NONE' }).a_source, null);
});

test('E3: Phát is the stage A->E; Nộp tiền is not an input of the journey (an input without it classifies the same)', () => {
    const r = run({ limit: 20 });
    assert.equal(code(r), 'PHAT');
    assert.equal(r.cause.label, 'Phát');
    assert.equal(Object.keys(r.detail.stages).includes('cash'), false);
});

// ---------------------------------------------------------------- E4: the two details of Phát
test('E4: Chậm giao bưu tá = T->G over the limit', () => {
    const r = run({ limit: 17 }); // T->A 16 h within; T->G 18 h over; T->E 24 h
    assert.deepEqual([code(r), sub(r), r.cause.detail_label], ['PHAT', 'CHAM_GIAO_BUU_TA', PHAT_DETAILS.CHAM_GIAO_BUU_TA.label]);
});

test('E4: Chậm giao bưu tá = G on a later calendar day than A (T->G in time, handed over only the next day)', () => {
    // A 21/10 12:00, G 22/10 08:00, E 22/10 09:00: T->G 36 h and T->E 37 h net (one night), limit 36.5 h
    const next = run({ limit: 36.5, tct: '37:00', gbt: at('2026-10-22 08:00'), ptc: at('2026-10-22 09:00') });
    assert.equal(next.detail.stages.t_g.verdict, 'CON_HAN'); // in time by the clock...
    assert.deepEqual([code(next), sub(next)], ['PHAT', 'CHAM_GIAO_BUU_TA']); // ...but handed over on the day after the arrival
});

test('E4: Phát chậm sau khi giao = handover in time and on the day of arrival, delivery late', () => {
    const r = run({ limit: 20 }); // T->G 18 h within, same day as A, T->E 24 h over
    assert.deepEqual([code(r), sub(r), r.cause.detail_label], ['PHAT', 'PHAT_CHAM_SAU_GIAO', PHAT_DETAILS.PHAT_CHAM_SAU_GIAO.label]);
    assert.deepEqual(r.flags, []);
});

test('E4: G missing or invalid -> Phát judged on A->E only, the detail stays empty (flag says why)', () => {
    let r = run({ limit: 20, gbt: null });
    assert.deepEqual([code(r), sub(r), r.cause.detail_label, r.flags], ['PHAT', null, null, [FLAGS.NO_G]]);
    r = run({ limit: 20, gbt: at('2026-10-19 09:00') }); // before T
    assert.deepEqual([code(r), sub(r)], ['PHAT', null]);
    assert.ok(r.flags.includes(FLAGS.G_OUT_OF_ORDER) && r.flags.includes(FLAGS.G_BEFORE_T));
    r = run({ limit: 20, gbt: at('2026-10-21 22:00') }); // after E
    assert.deepEqual([code(r), sub(r)], ['PHAT', null]);
    assert.ok(r.flags.includes(FLAGS.G_OUT_OF_ORDER));
});

// ---------------------------------------------------------------- E5: a missing milestone
test('E5: A missing in both sources: T->G in time and the delivery late -> Phát chậm sau khi giao; flags say the arrival was never confirmed', () => {
    const r = run({ limit: 20, arrive: null, aSource: null, f41: 'NONE' });
    assert.deepEqual([code(r), sub(r), r.a_source], ['PHAT', 'PHAT_CHAM_SAU_GIAO', null]);
    assert.deepEqual(r.flags, [FLAGS.NO_F41, FLAGS.NO_ARRIVAL]);
    assert.equal(r.remaining_at_arrival_ms, null);
});

test('E5: A missing and T->G over the limit: a late arrival and a late handover cannot be told apart -> Chờ Chuyên quản', () => {
    const r = run({ limit: 12, arrive: null, aSource: null, f41: 'NONE' }); // T->G 18 h
    assert.deepEqual([r.status, r.reason, r.step, code(r)], [STATUS.WAIT_ANALYST, REASONS.LATE_ARRIVAL_OR_HANDOVER, 'T-G', null]);
});

test('E5: A and G both missing, or G invalid -> Chờ Chuyên quản; nothing is invented', () => {
    let r = run({ limit: 20, arrive: null, aSource: null, f41: 'NONE', gbt: null });
    assert.deepEqual([r.status, r.reason, r.step], [STATUS.WAIT_ANALYST, REASONS.NO_HANDOVER, 'T-G']);
    r = run({ limit: 20, arrive: null, aSource: null, f41: 'NONE', gbt: at('2026-10-19 09:00') });
    assert.deepEqual([r.status, r.reason], [STATUS.WAIT_ANALYST, REASONS.HANDOVER_ORDER]);
});

test('E5: E missing: an arrival over the limit is still judged on the milestones; an arrival in time leaves the delivery to the Chuyên quản', () => {
    const over = run({ ptc: null });
    assert.deepEqual([code(over), over.basis], ['VAN_CHUYEN', BASIS.MILESTONES]);
    assert.deepEqual(over.flags, [FLAGS.NO_E]);
    const inTime = run({ ptc: null, limit: 17 });
    assert.deepEqual([inTime.status, inTime.reason, inTime.step], [STATUS.WAIT_ANALYST, REASONS.NO_DELIVERY, 'T-E']);
});

test('E5: A out of order (before T or after E) -> Chờ Chuyên quản with a flag', () => {
    for (const arrive of [at('2026-10-20 09:00'), at('2026-10-21 21:00')]) {
        const r = run({ arrive });
        assert.deepEqual([r.status, r.reason, r.step, r.flags.includes(FLAGS.A_OUT_OF_ORDER)], [STATUS.WAIT_ANALYST, REASONS.NO_ARRIVAL_ORDER, 'T-A', true]);
    }
});

test('E5: an earlier fault wins and the later stages are not examined (a late arrival ignores G; Không trọn lô ignores the rest)', () => {
    assert.equal(code(run({ gbt: null })), 'VAN_CHUYEN');
    assert.equal(code(run({ gbt: at('2026-10-19 09:00') })), 'VAN_CHUYEN');
    assert.equal(code(run({ khongTronLo: true, gbt: null })), 'KHONG_TRON_LO');
});

test('no usable milestone at all (T missing, or nothing after T): "chưa đủ căn cứ", the only use left of that status', () => {
    for (const over of [{ tms: null }, { depart: null, arrive: null, gbt: null, ptc: null, aSource: null, f41: 'NONE' }]) {
        const r = run(over);
        assert.deepEqual([r.status, r.reason, r.step, code(r)], [STATUS.UNDECIDED, 'KHONG_CO_MOC', 'THOI_GIAN', null]);
    }
});

// ---------------------------------------------------------------- E6: time left at arrival (reference only)
test('E6: remaining = limit - net T->A; the hint DEN_BCVH_CON_IT_GIO for 0 <= remaining < 6 h (threshold from one constant), nothing otherwise', () => {
    assert.equal(REMAINING_HINT_MS, 6 * HOUR_MS);
    const r = run({ limit: 17 }); // 17 h - 16 h = 1 h
    assert.equal(r.remaining_at_arrival_ms, HOUR_MS);
    assert.deepEqual(r.hints, [HINTS.LITTLE_TIME_LEFT]);
    assert.equal(run({ limit: 16 }).remaining_at_arrival_ms, 0); // arrived exactly at the limit: in time, nothing left
    assert.deepEqual(run({ limit: 16 }).hints, [HINTS.LITTLE_TIME_LEFT]);
    assert.equal(run({ limit: 22 }).remaining_at_arrival_ms, 6 * HOUR_MS); // exactly the threshold: not "under"
    assert.deepEqual(run({ limit: 22 }).hints, []);
    assert.deepEqual(run({ limit: 30 }).hints, []); // 14 h left
    const over = run({ limit: 12 });
    assert.equal(over.remaining_at_arrival_ms, -4 * HOUR_MS); // already over the limit: no hint, the cause says it
    assert.deepEqual(over.hints, []);
    assert.equal(run({ limit: 17, tct: '26:00' }).remaining_at_arrival_ms, HOUR_MS); // same figure on the milestone basis
});

test('E6: the hint never changes a cause', () => {
    // same milestones, limits 16 and 18: the hint is there for 16 (0 left) and for 18 (2 h left); the cause follows the stages only
    assert.deepEqual([code(run({ limit: 16 })), sub(run({ limit: 16 }))], ['PHAT', 'CHAM_GIAO_BUU_TA']);
    assert.deepEqual([code(run({ limit: 18 })), sub(run({ limit: 18 }))], ['PHAT', 'PHAT_CHAM_SAU_GIAO']);
    assert.ok(run({ limit: 16 }).hints.includes(HINTS.LITTLE_TIME_LEFT) && run({ limit: 18 }).hints.includes(HINTS.LITTLE_TIME_LEFT));
    // the same parcel with the hint removed from the picture (limit 30: no hint) still gets a cause only from the stages
    assert.equal(run({ limit: 30 }).status, STATUS.WAIT_ANALYST); // T->E 24 h within 30 h: E7, not a hint matter
});

test('E6: Không trọn lô parcels carry the remaining time and the hint too', () => {
    const r = run({ limit: 17, khongTronLo: true });
    assert.equal(code(r), 'KHONG_TRON_LO');
    assert.equal(r.remaining_at_arrival_ms, HOUR_MS);
    assert.deepEqual(r.hints, [HINTS.LITTLE_TIME_LEFT]);
});

// ---------------------------------------------------------------- E7: the TCT verdict as given
test('E7: every milestone within the limit while TCT says Không đạt -> Chờ Chuyên quản, no stage chosen (real April samples of the manifest)', () => {
    const samples = [
        // CB294036850VN: TCT 34:14, T->E 23.6 clock h (13.6 net), limit 14
        { tms: at('2026-04-13 12:48'), arrive: at('2026-04-13 12:58'), gbt: at('2026-04-13 13:04'), ptc: at('2026-04-14 12:23'), tct: '34:14', limit: 14 },
        // CC579840515VN: TCT 13:26, T->E 11.4 clock h, limit 12
        { tms: at('2026-04-14 07:15'), arrive: at('2026-04-14 07:52'), gbt: at('2026-04-14 08:21'), ptc: at('2026-04-14 18:36'), tct: '13:26', limit: 12 },
        // CD460221265VN: TCT 18:36, T->E 24.4 clock h (14.4 net), limit 17
        { tms: at('2026-04-13 13:10'), arrive: at('2026-04-14 07:55'), gbt: at('2026-04-14 10:01'), ptc: at('2026-04-14 13:33'), tct: '18:36', limit: 17 },
    ];
    for (const sample of samples) {
        const r = classify({ failed: true, f41: 'OK', aSource: 'F41', khongTronLo: false, depart: null, ...sample });
        assert.deepEqual([r.status, r.reason, r.step, code(r), r.basis], [STATUS.WAIT_ANALYST, REASONS.TCT_LONGER_THAN_MILESTONES, 'T-E', null, BASIS.MILESTONES], String(sample.tct));
        assert.ok(r.flags.includes(FLAGS.BAD_R));
    }
});

test('E7: with a valid R the same situation (TCT within the limit but verdict Không đạt) is a data conflict left to the Chuyên quản', () => {
    const r = run({ tct: '10:00', limit: 12 }); // R = 14 h valid; T->A interval [2, 10] h within; T->E 10 h within
    assert.deepEqual([r.status, r.reason, r.basis], [STATUS.WAIT_ANALYST, REASONS.RESULT_NOT_MATCHING_LIMIT, BASIS.INTERVAL]);
    assert.ok(r.flags.includes(FLAGS.NOT_OVER_LIMIT));
});

// ---------------------------------------------------------------- layers and invariants
test('three layers: at most one cause, flags and hints are arrays apart, the input is not changed, statuses and causes are consistent', () => {
    const input = base();
    const copy = JSON.stringify(input);
    const r = classify(input);
    assert.equal(JSON.stringify(input), copy);
    assert.ok(Array.isArray(r.flags) && Array.isArray(r.hints));
    assert.equal(r.flags.some((flag) => Object.keys(CAUSES).includes(flag)), false);
    for (const over of [{}, { limit: 17 }, { limit: 20 }, { arrive: null, aSource: null, f41: 'NONE' }, { tct: '26:00' }, { ptc: null }, { tms: null }, { khongTronLo: true }]) {
        const result = run(over);
        assert.equal(result.status === STATUS.CAUSE, result.cause !== null, JSON.stringify(over));
        assert.equal(result.status === STATUS.WAIT_ANALYST || result.status === STATUS.UNDECIDED, result.reason !== null, JSON.stringify(over)); // a status without a cause always says why
        assert.equal(Object.keys(CAUSES).includes('CHUA_PHAT'), false);
    }
});

test('a TCT time given in milliseconds or as "h:mm" is the same', () => {
    assert.deepEqual(run({ tct: 24 * HOUR_MS }).detail, run({ tct: '24:00' }).detail);
});

// ---- F13-WHY-DATA-03: direct handover ĐTC1 -> BCVH (A earlier than T read as A = T)
// Real parcel CC557753117VN: T 05/11 12:19:11, A 05/11 12:11:52, G 06/11 08:28:12, E 06/11 13:47:18.
const handoverParcel = (over = {}) => ({
    failed: true, limit: 14, tct: '25:28', f41: 'OK', aSource: 'F41', khongTronLo: false, directHandover: true,
    tms: Date.UTC(2026, 10, 5, 12, 19, 11), depart: null, arrive: Date.UTC(2026, 10, 5, 12, 11, 52),
    gbt: Date.UTC(2026, 10, 6, 8, 28, 12), ptc: Date.UTC(2026, 10, 6, 13, 47, 18), ...over,
});

test('F13-WHY-DATA-03: the example parcel with directHandover -> Phát / Chậm giao bưu tá, flag set, t_a net 0', () => {
    const r = classify(handoverParcel());
    assert.deepEqual([r.status, code(r), sub(r)], [STATUS.CAUSE, 'PHAT', 'CHAM_GIAO_BUU_TA']);
    assert.equal(r.flags.includes(FLAGS.A_BEFORE_TMS_DIRECT), true);
    assert.equal(r.flags.includes(FLAGS.A_OUT_OF_ORDER), false);
    assert.equal(r.detail.stages.t_a.net_ms, 0);
    assert.equal(r.detail.stages.t_a.verdict, VERDICT.WITHIN);
    assert.equal(r.remaining_at_arrival_ms, 14 * HOUR_MS);
    assert.equal(r.flags.includes(FLAGS.WRONG_ORDER), false);
});

test('F13-WHY-DATA-03: the same parcel without directHandover stays MOC_A_KHONG_HOP_LE, no new flag', () => {
    for (const over of [{ directHandover: false }, { directHandover: undefined }]) {
        const r = classify(handoverParcel(over));
        assert.deepEqual([r.status, r.reason, r.step], [STATUS.WAIT_ANALYST, REASONS.NO_ARRIVAL_ORDER, 'T-A']);
        assert.equal(r.flags.includes(FLAGS.A_BEFORE_TMS_DIRECT), false);
    }
});

test('F13-WHY-DATA-03: 24 h cap - exactly 24 h is accepted, 24 h + 1 s and 25 h stay MOC_A_KHONG_HOP_LE', () => {
    const t = Date.UTC(2026, 10, 5, 12, 19, 11);
    assert.equal(code(classify(handoverParcel({ arrive: t - 24 * HOUR_MS }))), 'PHAT');
    for (const arrive of [t - 24 * HOUR_MS - 1000, t - 25 * HOUR_MS]) {
        const r = classify(handoverParcel({ arrive }));
        assert.deepEqual([r.status, r.reason], [STATUS.WAIT_ANALYST, REASONS.NO_ARRIVAL_ORDER]);
        assert.equal(r.flags.includes(FLAGS.A_BEFORE_TMS_DIRECT), false);
        assert.equal(r.flags.includes(FLAGS.A_OUT_OF_ORDER), true);
    }
});

test('F13-WHY-DATA-03: A after T or equal to T, or A missing: identical with and without directHandover', () => {
    const t = Date.UTC(2026, 10, 5, 12, 19, 11);
    for (const over of [{ arrive: t + 40 * 60000 }, { arrive: t }, { arrive: t + 20 * HOUR_MS }, { arrive: null, aSource: null, f41: 'NONE' }]) {
        const on = classify(handoverParcel(over));
        const off = classify(handoverParcel({ ...over, directHandover: false }));
        assert.deepEqual(on, off);
        assert.equal(on.flags.includes(FLAGS.A_BEFORE_TMS_DIRECT), false);
    }
});

test('F13-WHY-DATA-03: Không trọn lô comes first and keeps its cause; no late-sign hint (arrival counted in time)', () => {
    const r = classify(handoverParcel({ khongTronLo: true }));
    assert.equal(code(r), 'KHONG_TRON_LO');
    assert.equal(r.hints.includes(HINTS.BCVH_LATE_SIGN), false);
});

test('F13-WHY-DATA-03: A_eff feeds the next-day test and the G < A flag (G before T = G before A_eff)', () => {
    const sameDay = classify(handoverParcel({ gbt: Date.UTC(2026, 10, 5, 15, 0, 0) }));
    assert.equal(sub(sameDay), 'PHAT_CHAM_SAU_GIAO');
    const early = classify(handoverParcel({ gbt: Date.UTC(2026, 10, 5, 12, 15, 0) }));
    assert.equal(early.flags.includes(FLAGS.G_BEFORE_T), true);
    assert.equal(early.flags.includes(FLAGS.WRONG_ORDER), true);
});

test('F13-WHY-DATA-03: MILESTONES basis (R invalid) with A before T -> t_a net 0, not out of order', () => {
    const r = classify(handoverParcel({ tct: 'xx' }));
    assert.equal(r.basis, BASIS.MILESTONES);
    assert.equal(r.detail.stages.t_a.net_ms, 0);
    assert.equal(r.flags.includes(FLAGS.A_BEFORE_TMS_DIRECT), true);
    assert.equal(r.flags.includes(FLAGS.A_OUT_OF_ORDER), false);
    assert.equal(classify(handoverParcel({ tct: 'xx', directHandover: false })).reason, REASONS.NO_ARRIVAL_ORDER);
});
