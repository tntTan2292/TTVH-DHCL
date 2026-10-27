'use strict';

// Run: node --experimental-sqlite --test scripts/realign-handling-entries.test.js   (throw-away database only)

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();
const { applyHangtonInventory01Schema } = require('../migrate_hangton_inventory_01_schema');
const { applyHangtonHandling01Schema } = require('../migrate_hangton_handling_01_schema');
const { planRealign, applyPlan, changesCsv, REALIGNED_BY } = require('./realign-handling-entries');

const TODAY = '2026-10-27';

async function makeDb() {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'realign-')), 'test.sqlite');
    await applyHangtonInventory01Schema(file);
    await applyHangtonHandling01Schema(file);
    const handle = new sqlite3.Database(file);
    return {
        handle,
        run: (sql, p = []) => new Promise((res, rej) => handle.run(sql, p, function onRun(e) { e ? rej(e) : res(this); })),
        all: (sql, p = []) => new Promise((res, rej) => handle.all(sql, p, (e, r) => (e ? rej(e) : res(r)))),
    };
}

let seq = 0;
async function typed(db, fields) {
    seq += 1;
    await db.run(
        `INSERT INTO hangton_handling_log (item_code, business_date, snapshot_id, slot, office_code, office, ton_level, customer_class, action,
            cause_code, cause_text, plan_code, plan_text, result_code, due_date, note, actor_id, actor_name, actor_position, created_at)
         VALUES (?, ?, 1, '0730', '533140', 'BCVH Thuận Hóa', '≥5 ngày', 'KH Thường', 'REVIEW', ?, ?, ?, ?, ?, ?, ?, 10, 'Mai Quang Vinh', 'GD_BCVH', ?)`,
        [fields.code, fields.date || TODAY, fields.cause, fields.text ?? null, fields.plan, fields.planText ?? null, fields.result, fields.due ?? null, fields.note ?? null, seq]);
}
const newest = () => 'SELECT * FROM hangton_handling_log WHERE id IN (SELECT MAX(id) FROM hangton_handling_log GROUP BY item_code) ORDER BY item_code';

test('the typed wordings are brought in line with the contents of the list; the result is recomputed; doubtful lines are left alone', async () => {
    const db = await makeDb();
    await typed(db, { code: 'A1', cause: 'OTHER', text: 'hoàn', plan: 'CHUYEN_HOAN', due: TODAY, result: 'DA_XU_LY' });
    await typed(db, { code: 'A2', cause: 'OTHER', text: 'phát hoàn TC', plan: 'OTHER', planText: '27/10', result: 'DA_XU_LY' });
    await typed(db, { code: 'A3', cause: 'OTHER', text: 'chờ hoàn', plan: 'CHUYEN_HOAN', due: '2026-10-29', result: 'DA_XU_LY' });
    await typed(db, { code: 'A4', cause: 'KH_HEN_PHAT_LAI', plan: 'PHAT_LAI', due: '2026-10-28', result: 'DA_XU_LY' });
    await typed(db, { code: 'A5', cause: 'OTHER', text: 'ptc', plan: 'OTHER', planText: '27/10', result: 'CHUA_XU_LY' });
    await typed(db, { code: 'A6', cause: 'OTHER', text: 'phát không trọn lô', plan: 'OTHER', planText: 'chờ mượn máy', result: 'CHUA_XU_LY' });
    await typed(db, { code: 'A8', cause: 'OTHER', text: 'chậm giao', plan: 'OTHER', planText: 'mất 27/10', result: 'DA_XU_LY' });
    await typed(db, { code: 'A9', cause: 'OTHER', text: 'ptc', plan: 'LIEN_HE_BC_GOC', planText: 'BC Phú Bài', result: 'DA_XU_LY', note: 'đã gọi' });
    await typed(db, { code: 'A7', date: '2026-10-26', cause: 'OTHER', text: 'hoàn', plan: 'CHUYEN_HOAN', due: '2026-10-26', result: 'DA_XU_LY' });

    const plan = planRealign(await db.all(newest()), { today: TODAY });
    assert.deepEqual(plan.map((p) => [p.item_code, p.status]), [['A1', 'CHANGE'], ['A2', 'CHANGE'], ['A3', 'CHANGE'], ['A4', 'CHANGE'], ['A5', 'LEFT_AS_TYPED'], ['A8', 'CHANGE'], ['A9', 'CHANGE']],
        'A6 is already in line; A7 is of an older day (needs the chuyên quản)');

    const result = await applyPlan(db.handle, plan, { now: new Date(2026, 9, 27, 18, 0) });
    assert.equal(result.written, 6);
    const byCode = Object.fromEntries((await db.all(newest())).map((r) => [r.item_code, r]));
    assert.deepEqual([byCode.A1.cause_code, byCode.A1.cause_text, byCode.A1.plan_code, byCode.A1.result_code, byCode.A1.due_date], ['CHUYEN_HOAN', null, 'CHUYEN_HOAN', 'DA_XU_LY', TODAY]);
    assert.deepEqual([byCode.A2.cause_code, byCode.A2.cause_text, byCode.A2.plan_code, byCode.A2.result_code, byCode.A2.due_date], ['PHAT_THANH_CONG', '27/10', 'DA_PHAT', 'DA_XU_LY', null], 'what was written as plan ("27/10") is kept as the detail of the content');
    // "chậm giao" + plan "mất 27/10": content Mất 27/10, the old wording in the note, nothing lost
    assert.deepEqual([byCode.A8.cause_code, byCode.A8.cause_text, byCode.A8.note, byCode.A8.result_code], ['MAT', '27/10', 'Chậm giao', 'DA_XU_LY']);
    // a plan with real content that the new structure has no place for goes to the note, the existing note stays
    assert.deepEqual([byCode.A9.cause_code, byCode.A9.result_code], ['PHAT_THANH_CONG', 'DA_XU_LY']);
    assert.equal(byCode.A9.note, 'đã gọi | Hướng xử lý trước đó: Liên hệ Bưu cục gốc BC Phú Bài');
    assert.deepEqual([byCode.A3.cause_code, byCode.A3.plan_code, byCode.A3.due_date, byCode.A3.result_code], ['CHO_HOAN', 'CHUYEN_HOAN', '2026-10-29', 'CHUA_XU_LY'], '"chờ hoàn" keeps its plan and date but is not settled');
    assert.deepEqual([byCode.A4.cause_code, byCode.A4.result_code], ['KH_HEN_PHAT_LAI', 'CHUA_XU_LY'], 'a normal content is Chưa xử lý');
    assert.deepEqual([byCode.A5.cause_text, byCode.A5.result_code], ['ptc', 'CHUA_XU_LY'], 'the person marked it Chưa xử lý: left as typed');
    assert.equal(byCode.A7.cause_text, 'hoàn', 'an older day is not touched');

    // history stays: the old row is still there, the new one supersedes it, same author, realigned by
    const rows = await db.all("SELECT * FROM hangton_handling_log WHERE item_code = 'A1' ORDER BY id");
    assert.deepEqual(rows.map((r) => [r.action, r.actor_name, r.approved_by_name]), [['REVIEW', 'Mai Quang Vinh', null], ['EDIT', 'Mai Quang Vinh', REALIGNED_BY]]);
    assert.equal(rows[1].supersedes_id, rows[0].id);

    const csv = changesCsv(plan);
    assert.ok(csv.includes('CG') === false && csv.includes('chậm giao') && csv.includes('Chậm giao'), 'the before / after list keeps both versions');
    // a second run finds nothing to change
    assert.deepEqual(planRealign(await db.all(newest()), { today: TODAY }).filter((p) => p.status === 'CHANGE'), []);
});

test('a parcel typed again while the plan was being applied is left for the next run', async () => {
    const db = await makeDb();
    await typed(db, { code: 'B1', cause: 'OTHER', text: 'hoàn', plan: 'CHUYEN_HOAN', due: TODAY, result: 'DA_XU_LY' });
    const plan = planRealign(await db.all(newest()), { today: TODAY });
    await typed(db, { code: 'B1', cause: 'OTHER', text: 'hoàn', plan: 'CHUYEN_HOAN', due: TODAY, result: 'DA_XU_LY' }); // typed meanwhile
    const result = await applyPlan(db.handle, plan);
    assert.deepEqual([result.written, result.skipped], [0, 1]);
});
