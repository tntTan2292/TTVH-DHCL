// HANGTON-HANDLING-01: the handling routes end to end -- who may read, enter, approve, and what a scoped user cannot see.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const XLSX = require('xlsx');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-handling-routes-'));
const dbFile = path.join(tmpDir, 'handling_routes.sqlite');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = dbFile;

const { db, run } = require('../config/db');
const { applyHangtonInventory01Schema } = require('../../migrate_hangton_inventory_01_schema');
const { applyHangtonHandling01Schema } = require('../../migrate_hangton_handling_01_schema');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const { localDate } = require('../services/hangtonInventory/snapshotService');
const createHangtonRouter = require('./hangtonRoutes');

const TODAY = localDate(new Date());
const YESTERDAY = localDate(new Date(Date.now() - 24 * 3600 * 1000));
const INPUT = { cause_code: 'KH_HEN_PHAT_LAI', plan_code: 'LIEN_HE_BC_GOC', result_code: 'DA_XU_LY' };
const TOMORROW = localDate(new Date(Date.now() + 24 * 3600 * 1000));
let server;
let baseUrl;

test.before(async () => {
    await applyHangtonInventory01Schema(dbFile);
    await applyHangtonHandling01Schema(dbFile);
    await run(`INSERT INTO hangton_snapshot (id, business_date, slot, captured_at, source_row_count, kept_row_count, is_stale, trigger) VALUES (1, ?, '0730', ?, 0, 0, 0, 'SCHEDULE')`, [TODAY, new Date().toISOString()]);
    const offices = [['533140', 'BCVH Thuận Hóa'], ['536250', 'BCVH Hương Thủy']];
    for (const [code, name] of offices) {
        for (let i = 0; i < 4; i += 1) {
            await run(
                `INSERT INTO hangton_snapshot_item (snapshot_id, item_code, status_name, ton_level, ton_rank, office, office_code, district, cod, customer_class, postman_code, postman_name)
                 VALUES (1, ?, 'Đã xác nhận đến', ?, ?, ?, ?, 'Huế', 1000, 'KH Thường', 'P1', 'Bưu tá')`,
                [`Z${code}${i}`, i < 3 ? '≥5 ngày' : '<1 ngày', i < 3 ? 5 : 0, name, code]);
        }
    }
    const app = express();
    app.use(express.json());
    app.use('/api/hangton', createHangtonRouter({ db: require('../config/db') }));
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

function session(id, name, spec) {
    return authSessionStore.createSession({ id, username: name, display_name: name, role: spec.tier === 'ADMIN' ? 'admin' : 'viewer', must_change_password: false, access: resolveAccess(spec) });
}
const GD = session(101, 'gd-thuan-hoa', { tier: 'STAFF', position: 'GD_BCVH', bcvh: ['533140'] });
const CQ = session(102, 'cq-thuan-hoa', { tier: 'STAFF', position: 'CHUYEN_QUAN', bcvh: ['533140'] });
const LEADER = session(103, 'leader', { tier: 'LEADER', position: 'LD_BDTP' });
const ADMIN = session(1, 'admin', { tier: 'ADMIN' });
const PLAIN = session(104, 'plain', { tier: 'STAFF', bcvh: ['533140'] });

async function call(sessionId, method, url, body) {
    const response = await fetch(`${baseUrl}${url}`, {
        method, headers: { 'x-session-id': sessionId, ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}) },
        body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    let json = null;
    try { json = JSON.parse(buffer.toString('utf8')); } catch { /* file */ }
    return { status: response.status, body: json, buffer };
}

test('permissions: plain staff and anonymous are refused; leaders read but never write or approve', async () => {
    assert.equal((await call('nope', 'GET', '/hangton/handling/catalog')).status, 401);
    assert.equal((await call(PLAIN, 'GET', '/hangton/handling/catalog')).status, 403);
    assert.equal((await call(PLAIN, 'POST', '/hangton/handling/entries', { item_codes: ['x'], input: INPUT })).status, 403);

    const catalog = (await call(LEADER, 'GET', '/hangton/handling/catalog')).body.data;
    assert.deepEqual(catalog.can, { write: false, approve: false, reasons: false });
    assert.equal(catalog.position, 'LD_BDTP');
    assert.equal((await call(LEADER, 'POST', '/hangton/handling/entries', { item_codes: ['Z5331400'], input: INPUT })).status, 403);
    assert.equal((await call(LEADER, 'POST', '/hangton/handling/edit-requests/1/decision', { approve: true })).status, 403);
    assert.equal((await call(LEADER, 'POST', '/hangton/handling/reasons/map', { kind: 'cause', text: 'a b', group_code: 'KHACH_VANG' })).status, 403);
    assert.equal((await call(GD, 'POST', '/hangton/handling/edit-requests/1/decision', { approve: true })).status, 403, 'a director cannot approve');
    assert.equal((await call(GD, 'GET', '/hangton/handling/reasons/ungrouped')).status, 403);
    assert.equal((await call(LEADER, 'GET', '/hangton/handling/stats')).status, 200);
    assert.deepEqual((await call(GD, 'GET', '/hangton/handling/catalog')).body.data.can, { write: true, approve: false, reasons: false });
    assert.deepEqual((await call(CQ, 'GET', '/hangton/handling/catalog')).body.data.can, { write: true, approve: true, reasons: true });
});

test('a director enters reviews for the own office only; the statistics and the parcel list follow', async () => {
    const stats0 = (await call(GD, 'GET', '/hangton/handling/stats')).body.data;
    assert.deepEqual(stats0.by_office.map((o) => o.office_code), ['533140'], 'scoped statistics');
    assert.equal(stats0.total.needed, 3);
    assert.equal(stats0.total.done, 0);

    const res = await call(GD, 'POST', '/hangton/handling/entries', { mode: 'REVIEW', item_codes: ['Z5331400', 'Z5331401', 'Z5362500'], input: INPUT });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.results.map((r) => `${r.item_code}:${r.status}:${r.reason || ''}`), ['Z5331400:SAVED:', 'Z5331401:SAVED:', 'Z5362500:SKIPPED:OUT_OF_SCOPE']);

    const incomplete = await call(GD, 'POST', '/hangton/handling/entries', { item_codes: ['Z5331402'], input: { cause_code: 'KH_HEN_PHAT_LAI' } });
    assert.equal(incomplete.body.data.results[0].reason, 'INVALID');

    const stats1 = (await call(LEADER, 'GET', '/hangton/handling/stats')).body.data;
    assert.deepEqual([stats1.total.needed, stats1.total.done, stats1.total.pending], [6, 2, 4], 'the leader sees every office');
    const leaderOwnScope = (await call(GD, 'GET', '/hangton/handling/stats')).body.data;
    assert.deepEqual([leaderOwnScope.total.done, leaderOwnScope.total.pending], [2, 1]);

    const items = (await call(GD, 'GET', '/hangton/items?min_rank=5&review=pending')).body.data;
    assert.deepEqual(items.rows.map((r) => r.item_code), ['Z5331402']);
    assert.equal(items.rows[0].handling.state, 'NONE');
    const done = (await call(GD, 'GET', '/hangton/items?review=done')).body.data;
    assert.equal(done.rows.length, 2);
    assert.equal(done.rows[0].handling.last.cause_label, 'Khách hàng hẹn phát lại');

    const hist = (await call(GD, 'GET', '/hangton/handling/history/Z5331400')).body.data;
    assert.equal(hist.entries.length, 1);
    assert.equal(hist.entries[0].actor_name, 'gd-thuan-hoa');
    assert.deepEqual((await call(GD, 'GET', '/hangton/handling/history/Z5362500')).body.data.entries, []);

    // KEEP: nothing to repeat for an unreviewed parcel
    const keep = await call(GD, 'POST', '/hangton/handling/entries', { mode: 'KEEP', item_codes: ['Z5331400', 'Z5331402'] });
    assert.deepEqual(keep.body.data.results.map((r) => r.reason), ['ALREADY_REVIEWED_TODAY', 'NO_PREVIOUS']);

    const log = (await call(LEADER, 'GET', `/hangton/handling/log?date=${TODAY}`)).body.data;
    assert.equal(log.total, 2);
});

test('admin enters for an office with no chuyên quản; Excel template and upload round trip over HTTP', async () => {
    const adminRes = await call(ADMIN, 'POST', '/hangton/handling/entries', { item_codes: ['Z5362500'], input: INPUT });
    assert.equal(adminRes.body.data.saved, 1);

    const tpl = await call(GD, 'GET', '/hangton/handling/template');
    assert.equal(tpl.status, 200);
    const book = XLSX.read(tpl.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(book.Sheets['Xử lý tồn']);
    assert.deepEqual(rows.map((r) => r['Mã bưu gửi']).sort(), ['Z5331400', 'Z5331401', 'Z5331402'], 'only the own office, only >= 5 days');
    const filled = rows.find((r) => r['Mã bưu gửi'] === 'Z5331402');
    const H = require('../services/hangtonInventory/handling/handlingExcel').HEADERS;
    filled[H.cause] = 'Nguyên nhân khác';
    filled[H.cause_text] = 'Cổng khóa';
    filled[H.plan] = 'Liên hệ Bưu cục gốc';
    filled[H.result] = 'Chưa xử lý';
    const sheet = XLSX.utils.json_to_sheet(rows);
    const upload = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(upload, sheet, 'Xử lý tồn');
    const form = new FormData();
    form.append('file', new Blob([XLSX.write(upload, { type: 'buffer', bookType: 'xlsx' })]), 'x.xlsx');
    const imported = await call(GD, 'POST', '/hangton/handling/import', form);
    assert.equal(imported.status, 200, JSON.stringify(imported.body));
    assert.equal(imported.body.data.saved, 1, 'only the line that was filled in is a new review');
    assert.deepEqual(imported.body.data.results.filter((r) => r.status === 'SKIPPED').map((r) => r.reason), ['UNCHANGED', 'UNCHANGED'], 'the pre-filled lines that were not touched are not saved again');
    const saved = (await call(GD, 'GET', '/hangton/handling/history/Z5331402')).body.data.entries[0];
    assert.deepEqual([saved.cause_code, saved.cause_text, saved.cause_group], ['OTHER', 'Cổng khóa', catalogUngrouped()]);
    assert.equal((await call(GD, 'POST', '/hangton/handling/import', new FormData())).status, 400);
    assert.equal((await call(LEADER, 'GET', '/hangton/handling/template')).status, 403);
});

function catalogUngrouped() {
    return require('../services/hangtonInventory/handling/catalog').UNGROUPED;
}

test('past-day edit over HTTP: request by the director, decision by the chuyên quản, free-text grouping by the chuyên quản', async () => {
    await run(
        `INSERT INTO hangton_handling_log (item_code, business_date, snapshot_id, slot, office_code, office, ton_level, customer_class, action, cause_code, plan_code, result_code, actor_id, actor_name, actor_position, created_at)
         VALUES ('Z5331403', ?, 1, '0730', '533140', 'BCVH Thuận Hóa', '≥5 ngày', 'KH Thường', 'REVIEW', 'KH_HEN_PHAT_LAI', 'LIEN_HE_BC_GOC', 'DA_XU_LY', 101, 'gd-thuan-hoa', 'GD_BCVH', 1)`, [YESTERDAY]);
    const logId = await new Promise((resolve, reject) => db.get("SELECT id FROM hangton_handling_log WHERE item_code = 'Z5331403'", (e, r) => (e ? reject(e) : resolve(r.id))));
    const fix = { cause_code: 'CHO_CHUYEN_VTN', plan_code: 'CHUYEN_HOAN', result_code: 'CHUA_XU_LY', due_date: TOMORROW };

    const created = await call(GD, 'POST', '/hangton/handling/edit-requests', { log_id: logId, input: fix, reason: 'Nhập nhầm nguyên nhân' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal((await call(GD, 'POST', `/hangton/handling/edit-requests/${created.body.data.id}/decision`, { approve: true })).status, 403);
    const pending = (await call(CQ, 'GET', '/hangton/handling/edit-requests?status=PENDING')).body.data;
    assert.equal(pending.length, 1);
    assert.equal(pending[0].can_decide, true);
    assert.equal((await call(LEADER, 'GET', '/hangton/handling/edit-requests?status=PENDING')).body.data[0].can_decide, false, 'leaders only look');

    const decided = await call(CQ, 'POST', `/hangton/handling/edit-requests/${created.body.data.id}/decision`, { approve: true, note: 'Đồng ý' });
    assert.equal(decided.body.data.status, 'APPROVED');
    const hist = (await call(CQ, 'GET', '/hangton/handling/history/Z5331403')).body.data;
    assert.deepEqual(hist.entries.map((e) => [e.action, e.cause_code]), [['REVIEW', 'KH_HEN_PHAT_LAI'], ['EDIT_APPROVED', 'CHO_CHUYEN_VTN']]);
    assert.equal(hist.entries[1].approved_by_name, 'cq-thuan-hoa');

    // free-text grouping
    const ungrouped = (await call(CQ, 'GET', '/hangton/handling/reasons/ungrouped?kind=cause')).body.data;
    assert.deepEqual(ungrouped.map((r) => r.norm_text), ['cong khoa']);
    const mapped = await call(CQ, 'POST', '/hangton/handling/reasons/map', { kind: 'cause', text: 'Cổng khóa', new_group_label: 'Cổng khóa / nhà đóng cửa' });
    assert.equal(mapped.status, 200, JSON.stringify(mapped.body));
    assert.deepEqual((await call(CQ, 'GET', '/hangton/handling/reasons/ungrouped?kind=cause')).body.data, []);
    const stats = (await call(CQ, 'GET', '/hangton/handling/stats')).body.data;
    assert.ok(stats.by_cause.some((r) => r.label === 'Cổng khóa / nhà đóng cửa' && r.n === 1));
    assert.equal((await call(CQ, 'GET', '/hangton/handling/reasons/groups?kind=bad')).status, 400);
});
