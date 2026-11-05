'use strict';

// F13-WHY-DATA-01 Phase 2: the cause tree of Manifest v4 section 5. Cases C1-C11 come from the design prototype (session scratchpad
// protoTests.js, not in the repository); expected values derived by hand from the Manifest, not from the code's output.
// Cases marked "added" are new (Opus review edge cases, PO list of 2026-11-05).
// Run: node --experimental-sqlite --test backend/src/services/f13v2/CauseClassifier.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const { classify, limitMsOf, CAUSES, STATUS, FLAGS, HINTS } = require('./CauseClassifier');
const { HOUR_MS } = require('./tctIntervals');

const at = (text) => Date.parse(`${text.replace(' ', 'T')}:00Z`);
// Journey: T 20/10 10:00, D 16:00, A 21/10 12:00, G 14:00, E 20:00. One night (10 h): L = 24 h, net T->A 16 h, T->G 18 h, T->E 24 h.
const base = () => ({
    failed: true, limit: 12, tct: '24:00', f41: 'OK', khongTronLo: false,
    tms: at('2026-10-20 10:00'), depart: at('2026-10-20 16:00'), arrive: at('2026-10-21 12:00'), gbt: at('2026-10-21 14:00'), ptc: at('2026-10-21 20:00'),
});
const run = (over = {}) => classify({ ...base(), ...over });
const code = (r) => (r.cause ? r.cause.code : null);

test('C1 a Đạt parcel is not analysed: no cause, no flag, no hint', () => {
    const r = classify({ ...base(), failed: false, limit: null, tct: null });
    assert.deepEqual([r.status, r.cause, r.flags, r.hints], [STATUS.NOT_ANALYSED, null, [], []]);
});

test('C2 arrived late, second leg longer -> Vận chuyển', () => assert.equal(code(run()), 'VAN_CHUYEN'));
test('C3 arrived late, first leg longer (D at 23:00: 11 h against 5 h) -> Khai thác', () => assert.equal(code(run({ depart: at('2026-10-20 23:00') })), 'KHAI_THAC'));

test('C4 D missing -> Khai thác - Vận chuyển (chưa phân biệt) + flag THIEU_MOC_D', () => {
    const r = run({ depart: null });
    assert.equal(code(r), 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET');
    assert.deepEqual(r.flags, [FLAGS.NO_D]);
});

test('C5 A missing (no F4.1 row): chưa đủ căn cứ at T-A, flag THIEU_F41, no cause', () => {
    const r = run({ arrive: null, f41: 'NONE' });
    assert.deepEqual([r.status, r.step, code(r), r.flags], [STATUS.UNDECIDED, 'T-A', null, [FLAGS.NO_F41]]);
});

test('C6 limit missing: flag THIEU_CHI_TIEU, no cause, no fallback to 14 h', () => {
    for (const limit of [null, undefined, '', 'abc', 0, -5]) {
        const r = run({ limit });
        assert.deepEqual([r.status, r.step, code(r), r.flags], [STATUS.UNDECIDED, 'CHI_TIEU', null, [FLAGS.NO_LIMIT]], String(limit));
    }
    assert.equal(limitMsOf(null), null);
    assert.equal(limitMsOf('abc'), null);
});

test('C7 Không trọn lô with a conclusive T->A over limit: cause stays Không trọn lô, hint DAU_HIEU_CHAM_TAI_BCVH, no second cause', () => {
    const r = run({ khongTronLo: true });
    assert.equal(code(r), 'KHONG_TRON_LO');
    assert.deepEqual(r.hints, [HINTS.BCVH_LATE_SIGN]);
    assert.equal(r.status, STATUS.CAUSE);
});
test('C8 Không trọn lô, arrived within the limit (17 h): cause only, no hint', () => {
    const r = run({ khongTronLo: true, limit: 17 });
    assert.deepEqual([code(r), r.hints], ['KHONG_TRON_LO', []]);
});

test('C9 R = 4 h cuts the limit at T->A -> chưa đủ căn cứ, flag UNLOCATED_TCT_EXCLUSION', () => {
    const r = run({ tct: '20:00' });
    assert.deepEqual([r.status, r.step, code(r)], [STATUS.UNDECIDED, 'T-A', null]);
    assert.deepEqual(r.flags, [FLAGS.UNLOCATED]);
    assert.equal(r.detail.r_ms, 4 * HOUR_MS);
});

test('C10 G before A: the flag SAI_TRINH_TU_NGHIEP_VU only, analysis goes on (T->A over -> Vận chuyển)', () => {
    const r = run({ gbt: at('2026-10-21 10:00') });
    assert.equal(code(r), 'VAN_CHUYEN');
    assert.deepEqual(r.flags, [FLAGS.WRONG_ORDER]);
});

test('C11 TCT 26 h against 24 h of journey (R = -2 h): chưa đủ căn cứ, flag R_KHONG_HOP_LE', () => {
    const r = run({ tct: '26:00' });
    assert.deepEqual([r.status, r.step, code(r), r.flags], [STATUS.UNDECIDED, 'THOI_GIAN', null, [FLAGS.BAD_R]]);
});

// ---- added: the rest of the tree, the tolerance, the limits, the layers
test('added: limits 12, 14, 15, 16, 17 and other valid values use the parcel own limit (equal is not over)', () => {
    for (const limit of [12, 14, 15, '15', 15.5]) assert.equal(code(run({ limit })), 'VAN_CHUYEN', `limit ${limit}`); // T->A 16 h is over
    // T->A is 16 h: at 16 and 17 it is within, so the tree goes on to T->G (18 h): over 16 and over 17 -> handover late
    assert.equal(code(run({ limit: 16 })), 'GIAO_BUU_TA_QUA_GIO');
    assert.equal(code(run({ limit: 17 })), 'GIAO_BUU_TA_QUA_GIO');
    assert.equal(code(run({ limit: 18 })), 'PHAT_MUON'); // T->G 18 h equal to the limit is not over; T->E 24 h is
    assert.equal(code(run({ limit: 19.5 })), 'PHAT_MUON');
});

test('added: handover late is judged by T->G (needs G >= T) and delivery late by the remainder G->E', () => {
    assert.equal(code(run({ limit: 17, gbt: at('2026-10-21 14:00') })), 'GIAO_BUU_TA_QUA_GIO');
    assert.equal(code(run({ limit: 17, gbt: at('2026-10-21 10:00') })), 'PHAT_MUON'); // T->G = 14 h within 17 h
    const r = run({ limit: 20, gbt: at('2026-10-21 14:00') });
    assert.equal(code(r), 'PHAT_MUON');
    assert.equal(r.detail.stages.t_g.verdict, 'CON_HAN');
    assert.equal(r.detail.stages.g_e.net_ms, 6 * HOUR_MS);
});

test('added: G missing, G before T, G after E: chưa đủ căn cứ at the handover step with the right flag', () => {
    let r = run({ limit: 17, gbt: null });
    assert.deepEqual([r.status, r.step, r.flags], [STATUS.UNDECIDED, 'T-G', [FLAGS.NO_G]]);
    r = run({ limit: 17, gbt: at('2026-10-19 09:00') });
    assert.deepEqual([r.status, r.step, [...r.flags].sort()], [STATUS.UNDECIDED, 'T-G', [FLAGS.G_BEFORE_T, FLAGS.G_OUT_OF_ORDER, FLAGS.WRONG_ORDER].sort()]);
    r = run({ limit: 17, gbt: at('2026-10-21 22:00') });
    assert.deepEqual([r.status, r.step], [STATUS.UNDECIDED, 'T-G']);
});

test('added: E missing: no journey model, no cause, flag THIEU_MOC_E (no CHUA_PHAT cause)', () => {
    const r = run({ ptc: null });
    assert.deepEqual([r.status, r.step, code(r), r.flags], [STATUS.UNDECIDED, 'THOI_GIAN', null, [FLAGS.NO_E]]);
    assert.equal(Object.keys(CAUSES).includes('CHUA_PHAT'), false);
});

test('added: R = -90 000 ms is read as 0 (valid), R = -96 000 ms is not (flag R_KHONG_HOP_LE)', () => {
    const l = 24 * HOUR_MS;
    assert.equal(code(run({ tct: l + 90000 })), 'VAN_CHUYEN');
    const bad = run({ tct: l + 96000 });
    assert.deepEqual([bad.status, bad.flags], [STATUS.UNDECIDED, [FLAGS.BAD_R]]);
    assert.equal(bad.detail.raw_r_ms, -96000);
});

test('added: R = 0 is plain; R = L (TCT 0:00) puts every stage at [0, 0]: within the limit all the way, T->E is not over -> chưa đủ căn cứ', () => {
    assert.equal(run({ tct: '24:00' }).detail.r_ms, 0);
    const r = run({ tct: '0:00', limit: 12 });
    assert.equal(r.detail.r_ms, 24 * HOUR_MS);
    assert.deepEqual([r.status, r.step, r.flags.includes(FLAGS.NOT_OVER_LIMIT), r.flags.includes(FLAGS.UNLOCATED)], [STATUS.UNDECIDED, 'T-E', true, true]);
});

test('added: R above L (negative TCT) is not valid', () => {
    const r = run({ tct: -2 * HOUR_MS });
    assert.deepEqual([r.status, r.flags], [STATUS.UNDECIDED, [FLAGS.BAD_R]]);
});

test('added: Khai thác and Vận chuyển intervals that overlap -> chưa phân biệt (no 1 h threshold)', () => {
    const r = run({ tct: '20:00', limit: 11 }); // R = 4 h: T->D [2, 6] against D->A [6, 10]: 6 is not above 6
    assert.equal(code(r), 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET');
    assert.deepEqual(r.flags, [FLAGS.UNLOCATED]);
});

test('added: a gap of 3 h between the legs is decided; a gap of 0 (exact tie) is not; no 1 h threshold', () => {
    assert.equal(code(run({ depart: at('2026-10-20 16:30') })), 'VAN_CHUYEN'); // 6.5 h against 9.5 h
    assert.equal(code(run({ depart: at('2026-10-20 17:50') })), 'VAN_CHUYEN'); // 7 h 50 against 8 h 10: a 20 min gap is decided
    assert.equal(code(run({ depart: at('2026-10-20 18:00') })), 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET'); // 8 h against 8 h
});

test('added: D after A or before T is a flag, the arrival is still over -> chưa phân biệt', () => {
    for (const depart of [at('2026-10-21 13:00'), at('2026-10-20 08:00')]) {
        const r = run({ depart });
        assert.equal(code(r), 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET');
        assert.deepEqual(r.flags, [FLAGS.D_OUT_OF_ORDER]);
    }
});

test('added: A before T or after E: flag, chưa đủ căn cứ at T-A', () => {
    for (const arrive of [at('2026-10-20 09:00'), at('2026-10-21 21:00')]) {
        const r = run({ arrive });
        assert.deepEqual([r.status, r.step, r.flags.includes(FLAGS.A_OUT_OF_ORDER)], [STATUS.UNDECIDED, 'T-A', true]);
    }
});

test('added: F4.1 not unique: flag F41_KHONG_DUY_NHAT, no A given by the caller -> chưa đủ căn cứ', () => {
    const r = run({ arrive: null, f41: 'NOT_UNIQUE' });
    assert.deepEqual([r.status, r.step, r.flags], [STATUS.UNDECIDED, 'T-A', [FLAGS.F41_NOT_UNIQUE]]);
});

test('added: Không trọn lô wins even when the limit, F4.1 or the time model are missing (lot evidence is separate); the hint needs them', () => {
    for (const over of [{ limit: null }, { arrive: null, f41: 'NONE' }, { ptc: null }, { tct: '99:00' }]) {
        const r = run({ khongTronLo: true, ...over });
        assert.equal(code(r), 'KHONG_TRON_LO');
        assert.deepEqual(r.hints, []);
    }
});

test('added: at most one cause; the layers are separate arrays; the input is not changed', () => {
    const input = base();
    const copy = JSON.stringify(input);
    const r = classify(input);
    assert.equal(JSON.stringify(input), copy);
    assert.ok(Array.isArray(r.flags) && Array.isArray(r.hints));
    assert.ok(r.cause === null || typeof r.cause.code === 'string');
    assert.equal(r.flags.some((flag) => Object.keys(CAUSES).includes(flag)), false);
});

test('added: a TCT time given in milliseconds or as "h:mm" is the same', () => {
    assert.deepEqual(run({ tct: 24 * HOUR_MS }).detail, run({ tct: '24:00' }).detail);
});

test('added: a night scan journey is judged on the model, not on raw hours', () => {
    // T 20/10 22:00 -> D 21/10 14:00 -> A 22/10 12:00 -> E 22/10 20:00: raw 46 h, nights 9 + 10 = 19 h, L = 27 h
    const r = classify({
        failed: true, limit: 12, tct: '27:00', f41: 'OK', khongTronLo: false,
        tms: at('2026-10-20 22:00'), depart: at('2026-10-21 14:00'), arrive: at('2026-10-22 12:00'), gbt: at('2026-10-22 14:00'), ptc: at('2026-10-22 20:00'),
    });
    assert.equal(r.detail.l_ms, 27 * HOUR_MS);
    assert.equal(r.detail.stages.t_a.net_ms, 19 * HOUR_MS);
    assert.equal(r.detail.stages.t_d.net_ms, 7 * HOUR_MS); // 16 h raw, 9 h of the first night
    assert.equal(r.detail.stages.d_a.net_ms, 12 * HOUR_MS); // 22 h raw, 10 h of the second night
    assert.equal(code(r), 'VAN_CHUYEN');
});
