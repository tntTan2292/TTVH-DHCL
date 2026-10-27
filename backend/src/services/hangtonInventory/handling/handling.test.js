'use strict';

// HANGTON-HANDLING-01. Run: node --test src/services/hangtonInventory/handling/handling.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const { applyHangtonInventory01Schema } = require('../../../../migrate_hangton_inventory_01_schema');
const { applyHangtonHandling01Schema } = require('../../../../migrate_hangton_handling_01_schema');
const { resolveAccess } = require('../../auth/access/resolveAccess');
const roles = require('../../auth/access/roles');
const inventory = require('../compareService');
const catalog = require('./catalog');
const handling = require('./handlingService');
const excel = require('./handlingExcel');

const D1 = new Date(2026, 9, 27, 9, 0, 0); // 2026-10-27
const D2 = new Date(2026, 9, 28, 9, 0, 0); // 2026-10-28

async function makeDb() {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'handling-')), 'test.sqlite');
    await applyHangtonInventory01Schema(file);
    await applyHangtonHandling01Schema(file);
    const handle = new sqlite3.Database(file);
    return {
        run: (sql, p = []) => new Promise((res, rej) => handle.run(sql, p, function (e) { e ? rej(e) : res(this); })),
        get: (sql, p = []) => new Promise((res, rej) => handle.get(sql, p, (e, r) => (e ? rej(e) : res(r)))),
        all: (sql, p = []) => new Promise((res, rej) => handle.all(sql, p, (e, r) => (e ? rej(e) : res(r)))),
    };
}

// office codes: 533140 Thuận Hóa, 536250 Hương Thủy, 531110 Trung tâm Hành chính công (no BCVH owner)
async function addSnapshot(db, id, date, items, slot = '0730') {
    await db.run(
        `INSERT INTO hangton_snapshot (id, business_date, slot, captured_at, source_row_count, kept_row_count, is_stale, trigger) VALUES (?, ?, ?, ?, 0, 0, 0, 'SCHEDULE')`,
        [id, date, slot, `${date}T07:30:00.000Z`]);
    for (const it of items) {
        await db.run(
            `INSERT INTO hangton_snapshot_item (snapshot_id, item_code, status_name, ton_level, ton_rank, office, office_code, district, cod, customer_class, postman_code, postman_name)
             VALUES (?, ?, 'Đã xác nhận đến', ?, ?, ?, ?, 'Huế', 1000, ?, ?, ?)`,
            [id, it.code, it.rank >= 5 ? '≥5 ngày' : '<1 ngày', it.rank, it.office || 'BCVH Thuận Hóa', it.office_code || '533140', it.customer || 'KH Thường', 'P1', 'Bưu tá A']);
    }
}

const accessOf = (spec) => resolveAccess(spec);
const userOf = (id, name, spec) => ({ id, display_name: name, username: String(id), access: accessOf(spec) });
const GD_TH = userOf(10, 'GĐ Thuận Hóa', { tier: 'STAFF', position: 'GD_BCVH', bcvh: ['533140'] });
const CQ_TH = userOf(11, 'CQ Thuận Hóa', { tier: 'STAFF', position: 'CHUYEN_QUAN', bcvh: ['533140'] });
const GD_HT = userOf(12, 'GĐ Hương Thủy', { tier: 'STAFF', position: 'GD_BCVH', bcvh: ['536250'] });
const ADMIN = userOf(1, 'Admin', { tier: 'ADMIN' });
const LEADER = userOf(20, 'Lãnh đạo', { tier: 'LEADER', position: 'LD_BDTP' });
const actor = (user) => handling.actorOf(user);

const REVIEW_INPUT = { cause_code: 'KH_HEN_PHAT_LAI', plan_code: 'PHAT_LAI', result_code: 'DA_XU_LY', due_date: '2026-10-29' };

async function seed() {
    const db = await makeDb();
    await addSnapshot(db, 1, '2026-10-27', [
        { code: 'A1', rank: 7 }, { code: 'A2', rank: 5 }, { code: 'A3', rank: 1 },
        { code: 'B1', rank: 6, office: 'BCVH Hương Thủy', office_code: '536250' },
        { code: 'C1', rank: 14, office: 'Trung tâm Hành chính công', office_code: '531110', customer: 'KH Mới' },
    ]);
    return db;
}

// ---- roles -----------------------------------------------------------------------------------------------------------

test('positions: tier is validated, leaders are two groups with BĐTP above TTVH/IT, default is least privilege', () => {
    assert.equal(roles.POSITIONS.LD_BDTP.group, 'LEADER_BDTP');
    assert.equal(roles.POSITIONS.LD_TTVH.group, roles.POSITIONS.IT_BDTP.group);
    assert.ok(roles.outranks('LD_BDTP', 'LD_TTVH'));
    assert.ok(!roles.outranks('LD_TTVH', 'IT_BDTP') && !roles.outranks('IT_BDTP', 'LD_TTVH'));
    assert.ok(roles.outranks('CHUYEN_QUAN', 'GD_BCVH'));
    assert.equal(roles.resolvePosition('LEADER', null).code, 'LD_TTVH');
    assert.equal(roles.resolvePosition('LEADER', 'GD_BCVH').code, 'LD_TTVH', 'a position of another tier is ignored');
    assert.equal(roles.resolvePosition('STAFF', 'CHUYEN_QUAN').code, 'CHUYEN_QUAN');
    assert.equal(roles.isValidPositionForTier('STAFF', 'LD_BDTP'), false);
    assert.equal(roles.isValidPositionForTier('LEADER', 'IT_BDTP'), true);
    assert.equal(roles.positionFromTitle('Giám đốc BCVH'), 'GD_BCVH');
    assert.equal(roles.positionFromTitle('  CHUYÊN QUẢN '), 'CHUYEN_QUAN');
    assert.equal(roles.positionFromTitle('Lãnh đạo TTVH'), 'LD_TTVH');
    assert.equal(roles.positionFromTitle('Không biết'), null);
});

test('access: only director / chuyên quản / admin may write, leaders only view, approval is chuyên quản + admin', () => {
    const has = (access, cap) => access.capabilities.includes(cap);
    const W = roles.CAPABILITIES.HANGTON_HANDLING_WRITE;
    const A = roles.CAPABILITIES.HANGTON_HANDLING_APPROVE;
    const V = roles.CAPABILITIES.HANGTON_HANDLING_VIEW;
    const R = roles.CAPABILITIES.HANGTON_HANDLING_REASONS;
    for (const position of ['LD_BDTP', 'LD_TTVH', 'IT_BDTP']) {
        const access = accessOf({ tier: 'LEADER', position });
        assert.ok(has(access, V) && !has(access, W) && !has(access, A) && !has(access, R), position);
        assert.ok(access.hangton.screens.includes('handling'));
    }
    assert.ok(has(GD_TH.access, W) && !has(GD_TH.access, A));
    assert.ok(has(CQ_TH.access, W) && has(CQ_TH.access, A) && has(CQ_TH.access, R));
    assert.ok([W, A, R, V].every((cap) => has(ADMIN.access, cap)));
    assert.deepEqual(GD_TH.access.hangton.screens, ['office', 'compare', 'items', 'handling']);
    assert.deepEqual(GD_TH.access.hangton.offices, ['533140']);
    const plain = accessOf({ tier: 'STAFF', bcvh: ['533140'] });
    assert.deepEqual(plain.capabilities, []);
    assert.deepEqual(plain.hangton.screens, ['office', 'compare']);
    assert.equal(accessOf({ tier: 'LEADER', position: 'LD_BDTP' }).rank > accessOf({ tier: 'LEADER', position: 'LD_TTVH' }).rank, true);
    assert.deepEqual(accessOf({ tier: 'GUEST' }).capabilities, []);
});

test('KTC1 office goes to the F1.2 chuyên quản (Nguyễn Anh Dũng) and a plain admin covers every office', () => {
    const dung = accessOf({ tier: 'STAFF', position: 'CHUYEN_QUAN', indicators: ['F1.2'] });
    assert.deepEqual(dung.hangton.offices, ['530100']);
    assert.ok(handling.canWriteOffice(dung, '530100'));
    assert.ok(!handling.canWriteOffice(dung, '533140'));
    assert.ok(handling.canWriteOffice(ADMIN.access, '531110'), 'offices without a chuyên quản fall to the admin');
    assert.ok(!handling.canWriteOffice(LEADER.access, '533140'));
});

// ---- catalog ---------------------------------------------------------------------------------------------------------

test('catalog: content and plan are required, the result is derived, "Khác" needs text, due date rules', () => {
    const today = '2026-10-27';
    assert.equal(catalog.validateEntry({}, { today }).ok, false);
    assert.equal(catalog.validateEntry({ ...REVIEW_INPUT }, { today }).ok, true);
    const noDue = catalog.validateEntry({ ...REVIEW_INPUT, due_date: '' }, { today });
    assert.deepEqual(noDue.errors.map((e) => e.field), ['due_date'], 'PHAT_LAI needs a due date');
    assert.equal(catalog.validateEntry({ cause_code: 'KH_HEN_PHAT_LAI', plan_code: 'LIEN_HE_BC_GOC', result_code: 'DA_XU_LY' }, { today }).ok, true, 'no due date needed');
    assert.equal(catalog.validateEntry({ cause_code: 'KH_HEN_PHAT_LAI', plan_code: 'CHUYEN_HOAN', result_code: 'CHUA_XU_LY' }, { today }).ok, false, 'Chuyển hoàn ngày needs the date too');
    const detail = catalog.validateEntry({ cause_code: 'CHO_CHUYEN_VTN', plan_code: 'CHUYEN_CAP_TREN', plan_text: ' Phòng KHCL ', result_code: 'CHUA_XU_LY' }, { today });
    assert.deepEqual([detail.ok, detail.value.plan_text], [true, 'Phòng KHCL'], 'the detail of a plan is optional and kept');
    assert.equal(catalog.validateEntry({ cause_code: 'CHO_CHUYEN_VTN', plan_code: 'CHUYEN_CAP_TREN', result_code: 'CHUA_XU_LY' }, { today }).value.plan_text, null);
    assert.equal(catalog.validateEntry({ cause_code: 'CHO_CHUYEN_VTN', plan_code: 'PHAT_LAI', plan_text: 'bỏ qua', result_code: 'DA_XU_LY', due_date: '2026-10-29' }, { today }).value.plan_text, null, 'text is dropped where the answer takes none');
    // the result is never taken from the input: a content that settles the parcel is Đã xử lý, any other one Chưa xử lý
    const typedResult = catalog.validateEntry({ ...REVIEW_INPUT, result_code: 'DA_XU_LY' }, { today });
    assert.deepEqual([typedResult.ok, typedResult.value.result_code], [true, 'CHUA_XU_LY'], 'a typed Đã xử lý does not count for a content that does not settle the parcel');
    assert.equal(catalog.validateEntry({ ...REVIEW_INPUT, result_code: 'OTHER', result_text: 'Xong' }, { today }).value.result_code, 'CHUA_XU_LY');
    for (const [cause, plan] of [['PHAT_THANH_CONG', 'DA_PHAT'], ['MAT', 'DA_MAT'], ['VO_THUA_NHAN', 'DA_VTN'], ['CHUYEN_HOAN', 'CHUYEN_HOAN']]) {
        const settled = catalog.validateEntry({ cause_code: cause, plan_code: 'PHAT_LAI', result_code: 'CHUA_XU_LY', due_date: '2026-12-01' }, { today });
        assert.deepEqual([settled.ok, settled.value.plan_code, settled.value.result_code], [true, plan, 'DA_XU_LY'], cause);
        assert.equal(settled.value.due_date, cause === 'CHUYEN_HOAN' ? today : null, 'only Chuyển hoàn keeps a date, and it is today');
    }
    assert.equal(catalog.KIND_LABELS.cause, 'Nội dung xử lý');
    assert.deepEqual(catalog.selectableOptions('result').map((o) => o.label), ['Đã xử lý', 'Chưa xử lý']);
    assert.deepEqual(catalog.selectableOptions('cause').map((o) => o.label), ['Phát thành công', 'Chuyển hoàn', 'Mất', 'Vô thừa nhận', 'Chờ hoàn', 'Khách hàng hẹn phát lại', 'Thư TCNH có yêu cầu lưu 7 ngày', 'Chờ chuyển VTN', 'Nguyên nhân khác']);
    assert.deepEqual(catalog.selectableOptions('plan').map((o) => o.label), ['Phát lại ngày', 'Chuyển hoàn ngày', 'Liên hệ Bưu cục gốc', 'Chuyển cấp trên hỗ trợ', 'Hướng xử lý khác']);
    assert.equal(catalog.validateEntry({ ...REVIEW_INPUT, due_date: '2026-10-26' }, { today }).ok, false, 'not before today');
    assert.equal(catalog.validateEntry({ ...REVIEW_INPUT, due_date: '2026-13-40' }, { today }).ok, false);
    const other = catalog.validateEntry({ cause_code: 'OTHER', cause_text: ' ', plan_code: 'LIEN_HE_BC_GOC', result_code: 'DA_XU_LY' }, { today });
    assert.deepEqual(other.errors.map((e) => e.field), ['cause_text']);
    const ok = catalog.validateEntry({ cause_code: 'OTHER', cause_text: 'Cổng khóa', plan_code: 'LIEN_HE_BC_GOC', result_code: 'DA_XU_LY', cause_code_extra: 1 }, { today });
    assert.equal(ok.ok, true);
    assert.equal(ok.value.cause_text, 'Cổng khóa');
    assert.equal(catalog.validateEntry({ ...REVIEW_INPUT, cause_code: 'NOT_A_CODE' }, { today }).ok, false);
    assert.equal(catalog.validateEntry({ ...REVIEW_INPUT, cause_code: 'KHONG_LIEN_LAC' }, { today }).ok, false, 'group-only answers are not selectable for a cause');
});

test('catalog: smart grouping puts the many wordings of "Khác" into few groups', () => {
    const g = (kind, text, map) => catalog.groupOf(kind, catalog.OTHER, text, map);
    assert.equal(g('cause', 'Khách đi vắng cả tuần'), 'KHACH_VANG');
    assert.equal(g('cause', 'KHÁCH ĐI VẮNG'), 'KHACH_VANG');
    assert.equal(g('cause', 'không có ai ở nhà'), 'KHACH_VANG');
    assert.equal(g('cause', 'Sai số điện thoại'), 'SAI_DIA_CHI_SDT');
    assert.equal(g('cause', 'khách không mua nữa'), 'KHACH_TU_CHOI', 'the earlier group wins over "mưa"-like words');
    assert.equal(g('cause', 'gọi không nghe máy'), 'KHONG_LIEN_LAC');
    assert.equal(g('cause', 'tắc đường do ngập'), 'THIEN_TAI_GIAO_THONG');
    assert.equal(g('cause', 'lý do lạ hoắc'), catalog.UNGROUPED);
    // wordings the PO settled (2026-10-27): "hoàn" = Chuyển hoàn, "chờ hoàn" is its own group, "phát hoàn TC" = Phát thành công
    assert.equal(g('cause', 'hoàn'), 'CHUYEN_HOAN');
    assert.equal(g('cause', 'Hoàn về gốc'), 'CHUYEN_HOAN');
    assert.equal(g('cause', 'chờ hoàn'), 'CHO_HOAN', 'the longer rule wins over "hoàn"');
    assert.equal(g('cause', 'chờ chuyển hoàn'), 'CHO_HOAN');
    assert.equal(g('cause', 'chờ chuyển VTN'), 'CHO_CHUYEN_VTN');
    assert.equal(g('cause', 'phát hoàn TC'), 'PHAT_THANH_CONG');
    assert.equal(g('cause', 'PTC'), 'PHAT_THANH_CONG');
    assert.equal(catalog.groupLabel('cause', 'CHO_HOAN'), 'Chờ hoàn');
    assert.equal(g('cause', 'vangvang'), catalog.UNGROUPED, 'whole words only');
    assert.equal(catalog.groupOf('cause', 'HANG_NANG_CONG_KENH', null), 'HANG_NANG_CONG_KENH');
    assert.equal(g('plan', 'hẹn khách thứ 6'), 'HEN_LAI_KH');
    assert.equal(g('cause', 'Khách hẹn mai phát lại'), 'KH_HEN_PHAT_LAI');
    assert.equal(g('cause', 'thư TCNH lưu 7 ngày'), 'THU_TCNH_LUU_7N');
    assert.equal(g('cause', 'đang chờ chuyển VTN'), 'CHO_CHUYEN_VTN');
    assert.equal(g('plan', 'báo cấp trên hỗ trợ giúp'), 'CHUYEN_CAP_TREN');
    assert.equal(catalog.groupOf('result', 'CHUA_XU_LY', null), 'CHUA_XU_LY', 'a standard answer is its own group');
    const manual = new Map([[catalog.normalizeText('Cổng khóa'), 'KHACH_VANG']]);
    assert.equal(g('cause', 'cổng KHÓA!', manual), 'KHACH_VANG', 'a mapping set by a chuyên quản wins and ignores case/accents/punctuation');
    assert.equal(catalog.normalizeText('Đường  Điện-Biên'), 'duong dien bien');
});

// ---- service ---------------------------------------------------------------------------------------------------------

test('recordEntries: scope per office, newest snapshot only, complete answers only, one row per parcel', async () => {
    const db = await seed();
    const res = await handling.recordEntries(db, {
        entries: ['A1', 'A2', 'B1', 'ZZ', 'C1'].map((code) => ({ item_code: code, input: REVIEW_INPUT })), actor: actor(GD_TH), now: D1,
    });
    const status = Object.fromEntries(res.results.map((r) => [r.item_code, r.status + (r.reason ? `:${r.reason}` : '')]));
    assert.deepEqual(status, { A1: 'SAVED', A2: 'SAVED', B1: 'SKIPPED:OUT_OF_SCOPE', ZZ: 'SKIPPED:NOT_IN_STOCK', C1: 'SKIPPED:OUT_OF_SCOPE' });
    assert.equal(res.saved, 2);
    const rows = await db.all('SELECT * FROM hangton_handling_log ORDER BY id');
    assert.equal(rows.length, 2);
    assert.deepEqual([rows[0].action, rows[0].business_date, rows[0].actor_id, rows[0].office_code, rows[0].snapshot_id, rows[0].slot], ['REVIEW', '2026-10-27', 10, '533140', 1, '0730']);
    assert.equal(rows[0].postman_name, 'Bưu tá A', 'postman defaults to the one of the parcel');

    const bad = await handling.recordEntries(db, { entries: [{ item_code: 'A1', input: { cause_code: 'KH_HEN_PHAT_LAI' } }], actor: actor(GD_TH), now: D1 });
    assert.equal(bad.results[0].reason, 'INVALID');
    assert.deepEqual(bad.results[0].errors.map((e) => e.field), ['plan_code'], 'only the plan is missing: the result is not asked');

    await assert.rejects(handling.recordEntries(db, { entries: [{ item_code: 'A1', input: REVIEW_INPUT }], actor: actor(LEADER), now: D1 }), { code: 'FORBIDDEN' });
    await assert.rejects(handling.recordEntries(db, { entries: [], actor: actor(GD_TH), now: D1 }), { code: 'NO_ITEMS' });

    // admin covers an office with no chuyên quản
    const adminRes = await handling.recordEntries(db, { entries: [{ item_code: 'C1', input: REVIEW_INPUT }], actor: actor(ADMIN), now: D1 });
    assert.equal(adminRes.saved, 1);

    // a parcel that is no longer in the newest snapshot cannot be reviewed
    await addSnapshot(db, 2, '2026-10-28', [{ code: 'A2', rank: 6 }], '0730');
    const gone = await handling.recordEntries(db, { entries: [{ item_code: 'A1', input: REVIEW_INPUT }], actor: actor(GD_TH), now: D2 });
    assert.equal(gone.results[0].reason, 'NOT_IN_STOCK');
});

test('same-day correction supersedes in place (history kept); a new day starts a new review; KEEP repeats the last one', async () => {
    const db = await seed();
    await handling.recordEntries(db, { entries: [{ item_code: 'A1', input: REVIEW_INPUT }], actor: actor(GD_TH), now: D1 });
    const fix = await handling.recordEntries(db, {
        entries: [{ item_code: 'A1', input: { ...REVIEW_INPUT, cause_code: 'OTHER', cause_text: 'Cổng khóa', result_code: 'CHUA_XU_LY' } }], actor: actor(CQ_TH), now: D1,
    });
    assert.equal(fix.results[0].action, 'EDIT');
    let rows = await db.all('SELECT id, action, supersedes_id, actor_id FROM hangton_handling_log ORDER BY id');
    assert.deepEqual(rows.map((r) => [r.action, r.supersedes_id, r.actor_id]), [['REVIEW', null, 10], ['EDIT', rows[0].id, 11]]);

    await addSnapshot(db, 2, '2026-10-28', [{ code: 'A1', rank: 8 }, { code: 'A2', rank: 6 }]);
    const keep = await handling.recordEntries(db, {
        entries: [{ item_code: 'A1' }, { item_code: 'A2' }], mode: 'KEEP', actor: actor(GD_TH), now: D2,
    });
    assert.deepEqual(keep.results.map((r) => [r.item_code, r.status, r.reason || r.action]), [['A1', 'SAVED', 'KEEP'], ['A2', 'SKIPPED', 'NO_PREVIOUS']]);
    const again = await handling.recordEntries(db, { entries: [{ item_code: 'A1' }], mode: 'KEEP', actor: actor(GD_TH), now: D2 });
    assert.equal(again.results[0].reason, 'ALREADY_REVIEWED_TODAY');

    // a due date that has passed cannot be repeated: the person sets a new one
    await addSnapshot(db, 3, '2026-10-30', [{ code: 'A1', rank: 10 }]);
    const D4 = new Date(2026, 9, 30, 9, 0, 0);
    const late = await handling.recordEntries(db, { entries: [{ item_code: 'A1' }], mode: 'KEEP', actor: actor(GD_TH), now: D4 });
    assert.equal(late.results[0].reason, 'DUE_DATE_PASSED');
    rows = await db.all('SELECT business_date, action FROM hangton_handling_log WHERE item_code = ? ORDER BY id', ['A1']);
    assert.deepEqual(rows.map((r) => `${r.business_date}:${r.action}`), ['2026-10-27:REVIEW', '2026-10-27:EDIT', '2026-10-28:KEEP']);
});

test('stats: required = >= 5 days; done today / stale / never; answers grouped; scoped users see only their offices', async () => {
    const db = await seed();
    await handling.recordEntries(db, { entries: [{ item_code: 'A1', input: REVIEW_INPUT }], actor: actor(GD_TH), now: D1 });
    await handling.recordEntries(db, { entries: [{ item_code: 'A2', input: { ...REVIEW_INPUT, cause_code: 'OTHER', cause_text: 'khách hẹn phát lại hôm sau' } }], actor: actor(GD_TH), now: D1 });
    const snapshot = await inventory.getSnapshot(db, 1);
    const all = await handling.stats(db, snapshot, {});
    assert.equal(all.total.needed, 4, 'A1 A2 B1 C1 (A3 is only 1 day)');
    assert.deepEqual([all.total.done, all.total.pending, all.total.never, all.total.stale], [2, 2, 2, 0]);
    assert.equal(all.total.rate, 0.5);
    const th = all.by_office.find((o) => o.office_code === '533140');
    assert.deepEqual([th.needed, th.done, th.pending], [2, 2, 0]);
    assert.equal(all.by_cause.length, 1, '"Nguyên nhân khác: khách hẹn phát lại hôm sau" merged into the standard group');
    assert.deepEqual([all.by_cause[0].code, all.by_cause[0].n], ['KH_HEN_PHAT_LAI', 2]);
    assert.deepEqual(all.by_result.map((r) => [r.code, r.label, r.n]), [['CHUA_XU_LY', 'Chưa xử lý', 2]], 'a content that does not settle the parcel is Chưa xử lý');

    const scoped = await handling.stats(db, snapshot, { offices: ['536250'] });
    assert.deepEqual([scoped.total.needed, scoped.total.done], [1, 0]);
    const kh = await handling.stats(db, snapshot, { customers: 'KH Mới' });
    assert.equal(kh.total.needed, 1);

    // next day: the carried-over parcels count as "stale" until confirmed again
    await addSnapshot(db, 2, '2026-10-28', [{ code: 'A1', rank: 8 }, { code: 'A2', rank: 6 }, { code: 'N1', rank: 5 }]);
    const next = await handling.stats(db, await inventory.getSnapshot(db, 2), {});
    assert.deepEqual([next.total.needed, next.total.done, next.total.stale, next.total.never], [3, 0, 2, 1]);
});

test('decorateItems + items review filter follow the day of the snapshot', async () => {
    const db = await seed();
    await handling.recordEntries(db, { entries: [{ item_code: 'A1', input: REVIEW_INPUT }], actor: actor(GD_TH), now: D1 });
    const snapshot = await inventory.getSnapshot(db, 1);
    const names = async (review) => (await inventory.items(db, 1, { minRank: 5, review, reviewDate: snapshot.business_date })).rows.map((r) => r.item_code).sort();
    assert.deepEqual(await names('done'), ['A1']);
    assert.deepEqual(await names('pending'), ['A2', 'B1', 'C1']);
    assert.deepEqual(await names('never'), ['A2', 'B1', 'C1']);
    assert.deepEqual(await names('stale'), []);
    assert.deepEqual(await names(undefined), ['A1', 'A2', 'B1', 'C1']);
    const page = await inventory.items(db, 1, { minRank: 1, limit: 50 });
    const decorated = await handling.decorateItems(db, page.rows, '2026-10-27');
    const byCode = Object.fromEntries(decorated.map((r) => [r.item_code, r.handling]));
    assert.deepEqual([byCode.A1.state, byCode.A1.required, byCode.A1.last.cause_label, byCode.A1.last.plan_label], ['DONE', true, 'Khách hàng hẹn phát lại', 'Phát lại ngày']);
    assert.deepEqual([byCode.A2.state, byCode.A3.required], ['NONE', false]);
    const nextDay = await handling.decorateItems(db, page.rows, '2026-10-28');
    assert.equal(nextDay.find((r) => r.item_code === 'A1').handling.state, 'STALE');
    assert.equal(nextDay.find((r) => r.item_code === 'A1').handling.last.result_label, 'Chưa xử lý', 'last entry carries over');
});

test('edit of a past day: request -> chuyên quản approves -> a new row corrects that day; self-approval and other offices are refused', async () => {
    const db = await seed();
    await handling.recordEntries(db, { entries: [{ item_code: 'A1', input: REVIEW_INPUT }], actor: actor(GD_TH), now: D1 });
    const target = await db.get('SELECT id FROM hangton_handling_log LIMIT 1');
    const fixed = { ...REVIEW_INPUT, cause_code: 'CHO_CHUYEN_VTN', plan_code: 'CHUYEN_HOAN', result_code: 'CHUA_XU_LY', due_date: '2026-10-30' };

    await assert.rejects(handling.createEditRequest(db, { logId: target.id, input: fixed, reason: 'Nhập nhầm', actor: actor(GD_TH), now: D1 }), { code: 'SAME_DAY' });
    await assert.rejects(handling.createEditRequest(db, { logId: target.id, input: fixed, reason: 'Nhập nhầm nội dung', actor: actor(GD_HT), now: D2 }), { code: 'OUT_OF_SCOPE' });
    await assert.rejects(handling.createEditRequest(db, { logId: target.id, input: fixed, reason: 'ngắn', actor: actor(GD_TH), now: D2 }), { code: 'REASON_REQUIRED' });
    await assert.rejects(handling.createEditRequest(db, { logId: target.id, input: { cause_code: 'KH_HEN_PHAT_LAI' }, reason: 'Nhập nhầm nội dung', actor: actor(GD_TH), now: D2 }), { code: 'INVALID' });
    const req = await handling.createEditRequest(db, { logId: target.id, input: fixed, reason: 'Nhập nhầm nội dung', actor: actor(GD_TH), now: D2 });
    await assert.rejects(handling.createEditRequest(db, { logId: target.id, input: fixed, reason: 'Nhập nhầm nội dung', actor: actor(GD_TH), now: D2 }), { code: 'ALREADY_PENDING' });

    // nothing changed yet
    assert.equal((await db.all('SELECT id FROM hangton_handling_log')).length, 1);
    await assert.rejects(handling.decideEditRequest(db, { id: req.id, approve: true, actor: actor(GD_TH), now: D2 }), { code: 'FORBIDDEN' });
    const cqOther = userOf(30, 'CQ Hương Thủy', { tier: 'STAFF', position: 'CHUYEN_QUAN', bcvh: ['536250'] });
    await assert.rejects(handling.decideEditRequest(db, { id: req.id, approve: true, actor: actor(cqOther), now: D2 }), { code: 'OUT_OF_SCOPE' });

    const listed = await handling.listEditRequests(db, { status: 'PENDING', actor: actor(CQ_TH) });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].can_decide, true);
    assert.equal(listed[0].current.cause_label, 'Khách hàng hẹn phát lại');
    assert.equal((await handling.listEditRequests(db, { actor: actor(GD_TH) }))[0].can_decide, false, 'the director cannot decide');
    assert.equal((await handling.listEditRequests(db, { actor: actor(GD_HT) })).length, 0, 'other offices do not see it');

    const done = await handling.decideEditRequest(db, { id: req.id, approve: true, note: 'OK', actor: actor(CQ_TH), now: D2 });
    assert.equal(done.status, 'APPROVED');
    const rows = await db.all('SELECT * FROM hangton_handling_log ORDER BY id');
    assert.equal(rows.length, 2, 'old row kept, correction appended');
    assert.deepEqual([rows[1].action, rows[1].business_date, rows[1].supersedes_id, rows[1].cause_code, rows[1].actor_id, rows[1].approved_by_id], ['EDIT_APPROVED', '2026-10-27', rows[0].id, 'CHO_CHUYEN_VTN', 10, 11]);
    await assert.rejects(handling.decideEditRequest(db, { id: req.id, approve: false, actor: actor(CQ_TH), now: D2 }), { code: 'ALREADY_DECIDED' });

    // the corrected row is the one that counts for 27/10, and 27/10 stays the carried-over day
    const hist = await handling.history(db, 'A1', {});
    assert.equal(hist.entries.length, 2);
    assert.equal(hist.edit_requests[0].status, 'APPROVED');
    const decorated = await handling.decorateItems(db, [{ item_code: 'A1', ton_rank: 7 }], '2026-10-27');
    assert.equal(decorated[0].handling.last.cause_label, 'Chờ chuyển VTN');

    // rejected requests change nothing; a chuyên quản cannot approve their own request but the admin can
    const second = await handling.createEditRequest(db, { logId: rows[1].id, input: { ...fixed, cause_code: 'THU_TCNH_LUU_7N' }, reason: 'Muốn đổi lại', actor: actor(CQ_TH), now: D2 });
    await assert.rejects(handling.decideEditRequest(db, { id: second.id, approve: true, actor: actor(CQ_TH), now: D2 }), { code: 'SELF_APPROVAL' });
    const rej = await handling.decideEditRequest(db, { id: second.id, approve: false, note: 'Không cần', actor: actor(ADMIN), now: D2 });
    assert.equal(rej.status, 'REJECTED');
    assert.equal((await db.all('SELECT id FROM hangton_handling_log')).length, 2);
});

test('reason grouping: unmatched wordings listed by frequency; a mapping regroups old and new entries; new groups can be created', async () => {
    const db = await seed();
    const mk = (code, text) => ({ item_code: code, input: { ...REVIEW_INPUT, cause_code: 'OTHER', cause_text: text } });
    await handling.recordEntries(db, { entries: [mk('A1', 'Cổng khóa'), mk('A2', 'cổng khoá')], actor: actor(GD_TH), now: D1 });
    await handling.recordEntries(db, { entries: [mk('B1', 'Nhà đang sửa')], actor: actor(GD_HT), now: D1 });
    const list = await handling.ungroupedReasons(db, { kind: 'cause' });
    assert.deepEqual(list.map((r) => [r.norm_text, r.n]), [['cong khoa', 2], ['nha dang sua', 1]], 'accent/case variants count as one wording, most frequent first');

    await assert.rejects(handling.mapReason(db, { kind: 'cause', text: 'Cổng khóa', groupCode: 'KHACH_VANG', actor: actor(GD_TH) }), { code: 'FORBIDDEN' });
    await assert.rejects(handling.mapReason(db, { kind: 'cause', text: 'Cổng khóa', groupCode: 'NOPE', actor: actor(CQ_TH) }), { code: 'UNKNOWN_GROUP' });
    await handling.mapReason(db, { kind: 'cause', text: 'Cổng khóa', groupCode: 'KHACH_VANG', actor: actor(CQ_TH) });
    assert.deepEqual((await handling.ungroupedReasons(db, { kind: 'cause' })).map((r) => r.norm_text), ['nha dang sua']);
    const snapshot = await inventory.getSnapshot(db, 1);
    let stats = await handling.stats(db, snapshot, {});
    assert.deepEqual(Object.fromEntries(stats.by_cause.map((r) => [r.code, r.n])), { KHACH_VANG: 2, [catalog.UNGROUPED]: 1 });

    const created = await handling.mapReason(db, { kind: 'cause', text: 'Nhà đang sửa', newGroupLabel: 'Nhà đang sửa chữa', actor: actor(ADMIN) });
    assert.equal(created.group_code, 'G_NHA_DANG_SUA_CHUA');
    stats = await handling.stats(db, snapshot, {});
    assert.deepEqual(stats.by_cause.map((r) => [r.label, r.n]), [['Khách vắng nhà', 2], ['Nhà đang sửa chữa', 1]]);
    assert.ok((await handling.groupChoices(db, 'cause')).some((g) => g.code === 'G_NHA_DANG_SUA_CHUA'));
    // a later entry with the same wording is grouped at once, and the typed text is never altered
    const log = await handling.listLog(db, {});
    assert.ok(log.rows.some((r) => r.cause_text === 'cổng khoá' && r.cause_group === 'KHACH_VANG'));
});

test('audit log lists every entry newest first, filtered by day / office / person and scoped to the viewer', async () => {
    const db = await seed();
    await handling.recordEntries(db, { entries: [{ item_code: 'A1', input: REVIEW_INPUT }, { item_code: 'A2', input: REVIEW_INPUT }], actor: actor(GD_TH), now: D1 });
    await handling.recordEntries(db, { entries: [{ item_code: 'B1', input: REVIEW_INPUT }], actor: actor(GD_HT), now: D1 });
    const all = await handling.listLog(db, {});
    assert.equal(all.total, 3);
    assert.equal(all.rows[0].item_code, 'B1');
    assert.equal((await handling.listLog(db, { officeCode: '533140' })).total, 2);
    assert.equal((await handling.listLog(db, { actorId: 12 })).total, 1);
    assert.equal((await handling.listLog(db, { date: '2026-10-28' })).total, 0);
    assert.equal((await handling.listLog(db, { offices: ['536250'] })).total, 1, 'scoped viewer');
    assert.equal((await handling.listLog(db, { offices: [] })).total, 0);
    assert.equal((await handling.history(db, 'A1', { offices: ['536250'] })).entries.length, 0);
});

test('Excel: drop-down template carries the last entry; an upload fills many parcels; detail columns and dates are read', async () => {
    const db = await seed();
    await handling.recordEntries(db, { entries: [{ item_code: 'A1', input: REVIEW_INPUT }], actor: actor(GD_TH), now: D1 });
    const page = await inventory.items(db, 1, { minRank: 5, offices: ['533140'] });
    const buffer = await excel.buildTemplate(await handling.decorateItems(db, page.rows, '2026-10-27'));

    // the answer columns are drop-downs fed by the standard lists
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    assert.deepEqual(wb.worksheets.map((w) => w.name), ['Xử lý tồn', 'Danh mục', 'Hướng dẫn']);
    const sheet = wb.getWorksheet('Xử lý tồn');
    const headers = sheet.getRow(1).values.slice(1);
    assert.deepEqual(headers, Object.values(excel.HEADERS));
    assert.deepEqual(['cause', 'plan', 'result'].map((key) => excel.HEADERS[key].endsWith('*')), [true, true, false], 'the always-required columns carry the * mark; the result is calculated');
    assert.equal(excel.HEADERS.cause, 'Nội dung xử lý *');
    assert.ok(sheet.getCell(`${String.fromCharCode(65 + headers.indexOf(excel.HEADERS.check))}2`).value.formula, 'the check column is a live formula');
    assert.ok(sheet.conditionalFormattings.length >= 5, 'cells to fill are coloured by rules');
    const column = (header) => String.fromCharCode(65 + headers.indexOf(header));
    for (const [key, list] of [['cause', 'A'], ['plan', 'B']]) {
        const validation = sheet.getCell(`${column(excel.HEADERS[key])}2`).dataValidation;
        assert.equal(validation.type, 'list', key);
        assert.ok(validation.formulae[0].includes(`$${list}$2`), `${key} reads the list ${list}`);
        assert.equal(validation.showErrorMessage, true);
    }
    assert.ok(sheet.getCell(`${column(excel.HEADERS.cause)}${page.rows.length + 1}`).dataValidation, 'every row has the drop-down');
    const lists = wb.getWorksheet('Danh mục');
    const listOf = (c) => lists.getColumn(c).values.slice(2).filter(Boolean);
    assert.deepEqual(listOf(1), ['Phát thành công', 'Chuyển hoàn', 'Mất', 'Vô thừa nhận', 'Chờ hoàn', 'Khách hàng hẹn phát lại', 'Thư TCNH có yêu cầu lưu 7 ngày', 'Chờ chuyển VTN', 'Nguyên nhân khác']);
    assert.deepEqual(listOf(2), ['Phát lại ngày', 'Chuyển hoàn ngày', 'Liên hệ Bưu cục gốc', 'Chuyển cấp trên hỗ trợ', 'Hướng xử lý khác']);

    const book = XLSX.read(buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(book.Sheets['Xử lý tồn']);
    const a1 = rows.find((r) => r[excel.HEADERS.item_code] === 'A1');
    assert.deepEqual([a1[excel.HEADERS.cause], a1[excel.HEADERS.plan]], ['Khách hàng hẹn phát lại', 'Phát lại ngày']);
    const resultCell = sheet.getCell(`${column(excel.HEADERS.result)}2`);
    assert.ok(resultCell.value.formula.includes('Đã xử lý') && resultCell.value.formula.includes('Chưa xử lý'), 'the result column is a formula, not an input');
    assert.equal(typeof a1[excel.HEADERS.due_date], 'number', 'the date is a real Excel date');

    // fill A2 (reason "Nguyên nhân khác" + own wording, a plan with detail, a result), leave A1 as pre-filled
    const fill = rows.map((r) => ({ ...r }));
    const a2 = fill.find((r) => r[excel.HEADERS.item_code] === 'A2');
    a2[excel.HEADERS.cause] = 'Nguyên nhân khác';
    a2[excel.HEADERS.cause_text] = 'Cổng khóa';
    a2[excel.HEADERS.plan] = 'liên hệ bưu cục gốc';
    a2[excel.HEADERS.plan_text] = 'BC Phú Bài';
    const sheet2 = XLSX.utils.json_to_sheet(fill);
    const book2 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book2, sheet2, 'Xử lý tồn');
    const parsed = excel.parseUpload(XLSX.write(book2, { type: 'buffer', bookType: 'xlsx' }));
    assert.equal(parsed.entries.length, 2, 'A1 (pre-filled) and A2; rows with nothing filled are ignored');
    assert.equal(parsed.entries[0].input.due_date, '2026-10-29', 'the Excel date is read back as the same day');
    const res = await handling.recordEntries(db, { entries: parsed.entries, actor: actor(GD_TH), now: D1 });
    assert.deepEqual(res.results.map((r) => [r.item_code, r.status, r.action]), [['A1', 'SAVED', 'EDIT'], ['A2', 'SAVED', 'REVIEW']]);
    const saved = await db.get('SELECT * FROM hangton_handling_log WHERE item_code = ? ORDER BY id DESC', ['A2']);
    assert.deepEqual([saved.cause_code, saved.cause_text, saved.plan_code, saved.plan_text, saved.result_code], ['OTHER', 'Cổng khóa', 'LIEN_HE_BC_GOC', 'BC Phú Bài', 'CHUA_XU_LY']);

    assert.deepEqual(excel.resolveAnswer('plan', 'phat lai ngay'), { code: 'PHAT_LAI', text: '' });
    assert.deepEqual(excel.resolveAnswer('plan', ''), { code: '', text: '' });
    assert.deepEqual(excel.resolveAnswer('cause', 'Cổng hỏng'), { code: 'OTHER', text: 'Cổng hỏng' }, 'a wording outside the list is kept as "khác"');
    // typed dates
    const typed = XLSX.utils.json_to_sheet([{ [excel.HEADERS.item_code]: 'A2', [excel.HEADERS.cause]: 'Chờ chuyển VTN', [excel.HEADERS.plan]: 'Chuyển hoàn ngày', [excel.HEADERS.due_date]: '5/11/2026', [excel.HEADERS.result]: 'Chưa xử lý' }]);
    const book3 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book3, typed, 'Xử lý tồn');
    assert.equal(excel.parseUpload(XLSX.write(book3, { type: 'buffer', bookType: 'xlsx' })).entries[0].input.due_date, '2026-11-05');
});

test('parcel list sorts by the handling columns (review state, cause, plan, date, result, note) and by the TMS reason', async () => {
    const db = await seed();
    const input = (cause, plan, extra = {}) => ({ cause_code: cause, plan_code: plan, ...extra });
    await handling.recordEntries(db, {
        entries: [
            { item_code: 'A1', input: input('CHO_CHUYEN_VTN', 'CHUYEN_HOAN', { due_date: '2026-10-30', note: 'b' }) },
            { item_code: 'A2', input: input('MAT', '', { note: 'a' }) },
        ],
        actor: actor(GD_TH), now: D1,
    });
    const order = async (sort, dir, extra = {}) => (await inventory.items(db, 1, { minRank: 1, sort, dir, reviewDate: '2026-10-27', ...extra })).rows.map((r) => r.item_code);
    // cause: list order (KH_HEN_PHAT_LAI before CHO_CHUYEN_VTN), parcels with nothing entered last
    assert.deepEqual((await order('cause', 'asc')).slice(0, 2), ['A2', 'A1']);
    assert.deepEqual((await order('cause', 'desc')).slice(-2), ['A1', 'A2']);
    assert.deepEqual((await order('plan', 'asc')).slice(0, 2), ['A1', 'A2'], 'list order: Chuyển hoàn ngày before the settled plans');
    assert.deepEqual((await order('result', 'asc')).slice(0, 2), ['A2', 'A1'], 'Đã xử lý (Mất) before Chưa xử lý');
    assert.deepEqual((await order('due', 'asc')).slice(0, 1), ['A1']);
    assert.deepEqual((await order('note', 'asc')).slice(0, 2), ['A2', 'A1']);
    // review: not reviewed first when ascending
    const review = await order('review', 'asc');
    assert.deepEqual(review.slice(-2).sort(), ['A1', 'A2']);
    assert.deepEqual((await order('review', 'desc')).slice(0, 2).sort(), ['A1', 'A2']);
    // an unknown sort key falls back to the default and a plain column still works
    assert.equal((await order('nope', 'asc')).length, 5);
    assert.equal((await order('reason', 'asc')).length, 5);
    // sorting keeps the filters
    assert.deepEqual(await order('cause', 'asc', { office: 'BCVH Hương Thủy' }), ['B1']);
});

test('auto causes: "Phát thành công" and "Chuyển hoàn" need no plan or result; next day they raise the recheck warning and cannot be kept', async () => {
    const db = await seed();
    const res = await handling.recordEntries(db, {
        entries: [{ item_code: 'A1', input: { cause_code: 'PHAT_THANH_CONG' } }, { item_code: 'A2', input: { cause_code: 'CHUYEN_HOAN', plan_code: 'PHAT_LAI', result_code: 'CHUA_XU_LY' } }],
        actor: actor(GD_TH), now: D1,
    });
    assert.equal(res.saved, 2, 'nothing but the cause is needed');
    const rows = await db.all('SELECT item_code, cause_code, plan_code, result_code, due_date FROM hangton_handling_log ORDER BY item_code');
    assert.deepEqual(rows.map((r) => [r.item_code, r.cause_code, r.plan_code, r.result_code, r.due_date]), [
        ['A1', 'PHAT_THANH_CONG', 'DA_PHAT', 'DA_XU_LY', null],
        ['A2', 'CHUYEN_HOAN', 'CHUYEN_HOAN', 'DA_XU_LY', '2026-10-27'],
    ], 'plan and result come from the cause (what was typed for them is ignored); a Chuyển hoàn date left empty is today');
    const before = await handling.decorateItems(db, (await inventory.items(db, 1, { minRank: 1, offices: ['533140'] })).rows, '2026-10-27');
    assert.ok(before.filter((r) => ['A1', 'A2'].includes(r.item_code)).every((r) => r.handling.state === 'DONE' && r.handling.recheck === false));

    // the next day both parcels are still in stock although they were handled: warning, and "Giữ nguyên" is refused
    await addSnapshot(db, 2, '2026-10-28', [{ code: 'A1', rank: 8 }, { code: 'A2', rank: 6 }]);
    const after = await handling.decorateItems(db, (await inventory.items(db, 2, { minRank: 1, offices: ['533140'] })).rows, '2026-10-28');
    assert.deepEqual(after.map((r) => [r.handling.state, r.handling.recheck]), [['STALE', true], ['STALE', true]]);
    const keep = await handling.recordEntries(db, { entries: [{ item_code: 'A1' }, { item_code: 'A2' }], mode: 'KEEP', actor: actor(GD_TH), now: D2 });
    assert.deepEqual(keep.results.map((r) => r.reason), ['RECHECK_REQUIRED', 'RECHECK_REQUIRED']);
    const again = await handling.recordEntries(db, { entries: [{ item_code: 'A1', input: REVIEW_INPUT }], actor: actor(GD_TH), now: D2 });
    assert.equal(again.saved, 1, 'a new review of the cause clears the warning');
});

test('Excel upload: only what the answers need is required; titles with or without * load; the missing field is named', async () => {
    const db = await seed();
    const upload = (header, lines) => {
        const sheet = XLSX.utils.json_to_sheet(lines.map((line) => Object.fromEntries(Object.entries(line).map(([key, value]) => [header[key], value]))));
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, 'Xử lý tồn');
        return excel.parseUpload(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }));
    };
    const H = excel.HEADERS;
    const OLD = { ...H, cause: 'Nguyên nhân tồn', plan: 'Hướng xử lý', result: 'Kết quả xử lý' }; // files made before the * marks
    for (const header of [H, OLD]) {
        const parsed = upload(header, [{ item_code: 'A1', cause: 'Phát thành công' }, { item_code: 'A2', cause: 'Chuyển hoàn', plan: 'Phát lại ngày' }]);
        assert.equal(parsed.entries.length, 2);
        const res = await handling.recordEntries(db, { entries: parsed.entries, actor: actor(GD_TH), now: D1 });
        assert.equal(res.saved, 2, 'Phát thành công / Chuyển hoàn: no plan, result or date to fill');
    }
    // "Nguyên nhân khác" without its wording is the one thing that is missing here
    const bad = upload(H, [{ item_code: 'A1', cause: 'Nguyên nhân khác', plan: 'Chuyển hoàn ngày', due_date: '5/11/2026', result: 'Đã xử lý' }]);
    const res = await handling.recordEntries(db, { entries: bad.entries, actor: actor(GD_TH), now: D1 });
    assert.deepEqual([res.results[0].reason, res.results[0].errors.map((e) => e.field)], ['INVALID', ['cause_text']]);
});

test('parcel list search: a piece of a code, several codes pasted together, any case; % and _ are plain characters', async () => {
    const db = await seed();
    const codes = async (q) => (await inventory.items(db, 1, { minRank: 0, q, sort: 'item_code', dir: 'asc' })).rows.map((r) => r.item_code);
    assert.deepEqual(await codes('a1'), ['A1'], 'case does not matter');
    assert.deepEqual(await codes('1'), ['A1', 'B1', 'C1'], 'a piece of the code');
    assert.deepEqual(await codes('A1, c1\nzzz'), ['A1', 'C1'], 'several codes, separated by comma, space or line');
    assert.deepEqual(await codes('  '), ['A1', 'A2', 'A3', 'B1', 'C1'], 'an empty box filters nothing');
    assert.deepEqual(await codes('%'), [], '% is not a wildcard');
    assert.deepEqual(await codes('_1'), [], '_ is not a wildcard');
    assert.equal((await inventory.items(db, 1, { minRank: 0, q: 'A', offices: ['533140'] })).total, 3, 'the search stays inside the allowed offices');
});

// ---- findings of the independent review (2026-10-27) -----------------------------------------------------------------

test('Excel import: lines left as downloaded are not saved again (so "Giữ nguyên" and the recheck warning keep their meaning)', async () => {
    const db = await seed();
    await handling.recordEntries(db, { entries: [{ item_code: 'A1', input: { cause_code: 'PHAT_THANH_CONG' } }, { item_code: 'A2', input: REVIEW_INPUT }], actor: actor(GD_TH), now: D1 });
    await addSnapshot(db, 2, '2026-10-28', [{ code: 'A1', rank: 8 }, { code: 'A2', rank: 6 }]);
    const page = await inventory.items(db, 2, { minRank: 5, offices: ['533140'], sort: 'item_code', dir: 'asc' });
    const buffer = await excel.buildTemplate(await handling.decorateItems(db, page.rows, '2026-10-28', '2026-10-28'));
    const parsed = excel.parseUpload(buffer);
    assert.equal(parsed.entries.length, 2, 'both lines are pre-filled');
    const res = await handling.recordEntries(db, { entries: parsed.entries, mode: 'IMPORT', actor: actor(GD_TH), now: D2 });
    assert.deepEqual(res.results.map((r) => [r.item_code, r.status, r.reason]), [['A1', 'SKIPPED', 'UNCHANGED'], ['A2', 'SKIPPED', 'UNCHANGED']], 'nothing touched: nothing saved, no INVALID for the old date');
    const decorated = await handling.decorateItems(db, page.rows, '2026-10-28', '2026-10-28');
    assert.equal(decorated.find((r) => r.item_code === 'A1').handling.recheck, true, 'the warning is still there');
    // the same file with one line changed saves just that line
    const changed = parsed.entries.map((e) => (e.item_code === 'A2' ? { ...e, input: { ...e.input, cause_code: 'CHO_CHUYEN_VTN', plan_code: 'LIEN_HE_BC_GOC', due_date: '', result_code: 'CHUA_XU_LY' } } : e));
    const res2 = await handling.recordEntries(db, { entries: changed, mode: 'IMPORT', actor: actor(GD_TH), now: D2 });
    assert.deepEqual(res2.results.map((r) => [r.item_code, r.status]), [['A1', 'SKIPPED'], ['A2', 'SAVED']]);
});

test('two writers at once: entries, an edit request decided twice and a double-click request all stay consistent', async () => {
    const db = await seed();
    const [r1, r2] = await Promise.all([
        handling.recordEntries(db, { entries: [{ item_code: 'A1', input: REVIEW_INPUT }], actor: actor(GD_TH), now: D1 }),
        handling.recordEntries(db, { entries: [{ item_code: 'A2', input: REVIEW_INPUT }], actor: actor(GD_TH), now: D1 }),
    ]);
    assert.deepEqual([r1.saved, r2.saved], [1, 1], 'no "transaction within a transaction"');
    // a past entry, a request typed twice
    const past = await db.run(
        `INSERT INTO hangton_handling_log (item_code, business_date, snapshot_id, slot, office_code, office, ton_level, customer_class, action, cause_code, plan_code, result_code, actor_id, actor_name, actor_position, created_at)
         VALUES ('A3', '2026-10-26', 1, '0730', '533140', 'BCVH Thuận Hóa', '≥5 ngày', 'KH Thường', 'REVIEW', 'KH_HEN_PHAT_LAI', 'LIEN_HE_BC_GOC', 'DA_XU_LY', 10, 'GĐ', 'GD_BCVH', 1)`);
    const fix = { cause_code: 'CHO_CHUYEN_VTN', plan_code: 'LIEN_HE_BC_GOC', result_code: 'CHUA_XU_LY' };
    const twice = await Promise.allSettled([
        handling.createEditRequest(db, { logId: past.lastID, input: fix, reason: 'Nhập nhầm nguyên nhân', actor: actor(GD_TH), now: D1 }),
        handling.createEditRequest(db, { logId: past.lastID, input: fix, reason: 'Nhập nhầm nguyên nhân', actor: actor(GD_TH), now: D1 }),
    ]);
    assert.deepEqual(twice.map((r) => r.status).sort(), ['fulfilled', 'rejected'], 'only one pending request per entry');
    const requestId = twice.find((r) => r.status === 'fulfilled').value.id;
    const decided = await Promise.allSettled([
        handling.decideEditRequest(db, { id: requestId, approve: true, actor: actor(CQ_TH), now: D1 }),
        handling.decideEditRequest(db, { id: requestId, approve: false, actor: actor(CQ_TH), now: D1 }),
    ]);
    assert.deepEqual(decided.map((r) => r.status), ['fulfilled', 'rejected'], 'the second decision is refused');
    assert.equal((await db.get('SELECT status FROM hangton_edit_request WHERE id = ?', [requestId])).status, 'APPROVED');
    assert.equal((await db.all("SELECT id FROM hangton_handling_log WHERE action = 'EDIT_APPROVED'")).length, 1);
});

test('review date: the newest snapshot is counted on today; the warning only appears once the snapshot is of a later day than the entry', async () => {
    const db = await seed();
    const snapshot = await handling.newestSnapshot(db);
    assert.equal(await handling.reviewDateOf(db, snapshot, new Date(2026, 9, 28, 0, 30)), '2026-10-28', 'after midnight, before the first snapshot of the day');
    assert.equal(await handling.reviewDateOf(db, snapshot, new Date(2026, 9, 27, 23, 0)), '2026-10-27');
    await handling.recordEntries(db, { entries: [{ item_code: 'A1', input: { cause_code: 'PHAT_THANH_CONG' } }], actor: actor(GD_TH), now: new Date(2026, 9, 27, 15, 0) });
    const rows = (await inventory.items(db, 1, { minRank: 1, offices: ['533140'] })).rows;
    const sameDay = await handling.decorateItems(db, rows, '2026-10-28', '2026-10-27');
    assert.equal(sameDay.find((r) => r.item_code === 'A1').handling.recheck, false, 'entry and snapshot are of the same day: no warning yet');
    await addSnapshot(db, 2, '2026-10-28', [{ code: 'A1', rank: 8 }]);
    assert.equal(await handling.reviewDateOf(db, snapshot, new Date(2026, 9, 29, 9, 0)), '2026-10-27', 'an older snapshot keeps its own day');
});

test('smaller review findings: duplicate lines of a parcel, auto cause keeps no date, log limit, wordings of other offices stay hidden', async () => {
    const db = await seed();
    const dup = await handling.recordEntries(db, { entries: [{ item_code: 'A1', input: REVIEW_INPUT }, { item_code: 'A1', input: { ...REVIEW_INPUT, cause_code: 'CHO_CHUYEN_VTN' } }], actor: actor(GD_TH), now: D1 });
    assert.deepEqual(dup.results.map((r) => r.status === 'SAVED' || r.reason), [true, 'DUPLICATE_IN_BATCH']);
    assert.equal(catalog.validateEntry({ cause_code: 'PHAT_THANH_CONG', due_date: '2026-11-05' }, { today: '2026-10-27' }).value.due_date, null);
    assert.ok((await handling.listLog(db, { limit: -1 })).rows.length <= 1, 'a negative limit is not "no limit"');
    await handling.recordEntries(db, { entries: [{ item_code: 'B1', input: { cause_code: 'OTHER', cause_text: 'Hàng lạ ở Hương Thủy', plan_code: 'LIEN_HE_BC_GOC', result_code: 'CHUA_XU_LY' } }], actor: actor(GD_HT), now: D1 });
    const mine = await handling.ungroupedReasons(db, { kind: 'cause', offices: ['533140'] });
    assert.deepEqual(mine, [], 'a wording typed in another office is not shown');
    assert.equal((await handling.ungroupedReasons(db, { kind: 'cause', offices: null })).length, 1);
});
