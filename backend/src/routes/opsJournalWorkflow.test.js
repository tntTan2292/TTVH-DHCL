// OPS-JOURNAL-01 (A3): the write side end to end -- choose at least 1 spot, fill the "6 rõ" rows, finalize (giao việc), report,
// accept, close -- and who may do each step. A stranger must learn nothing from any write route (same 404, nothing changed).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-ops-workflow-'));
const dbFile = path.join(tmpDir, 'workflow.sqlite');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = dbFile;

const { db, run, get, all } = require('../config/db');
const { applyOpsJournal01Schema } = require('../../migrate_ops_journal_01_schema');
const { applyHangtonInventory01Schema } = require('../../migrate_hangton_inventory_01_schema');
const { applyRbac01Schema } = require('../../migrate_rbac_01_schema');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const createOpsJournalRouter = require('./opsJournalRoutes');

const DAY = '2026-10-30';
const OFFICES = [['533140', 'BCVH Thuận Hóa'], ['536250', 'BCVH Hương Thủy'], ['535470', 'BCVH Hương Trà'], ['537220', 'BCVH Phú Lộc'], ['537015', 'BCVH Thuận An']];
let server;
let baseUrl;

async function addUser(id, username, tier, position, { active = 1, bcvh = [], indicators = [] } = {}) {
    await run('INSERT INTO qis_user (id, username, display_name, tier, position, password_hash, must_change_password, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 1, 1)',
        [id, username, username, tier, position, 'x', active]);
    for (const code of bcvh) await run('INSERT INTO qis_user_bcvh (user_id, ma_bcvh) VALUES (?, ?)', [id, code]);
    for (const code of indicators) await run('INSERT INTO qis_user_indicator (user_id, indicator) VALUES (?, ?)', [id, code]);
}

test.before(async () => {
    await applyRbac01Schema(dbFile);
    await applyHangtonInventory01Schema(dbFile);
    await applyOpsJournal01Schema(dbFile);
    await addUser(401, 'gd-thuan-hoa', 'STAFF', 'GD_BCVH', { bcvh: ['533140'] });
    await addUser(402, 'cq-thuan-hoa', 'STAFF', 'CHUYEN_QUAN', { bcvh: ['533140'] });
    await addUser(403, 'plain', 'STAFF', null, { bcvh: ['533140'] });
    await addUser(404, 'locked-cq', 'STAFF', 'CHUYEN_QUAN', { active: 0, bcvh: ['533140'] });
    await addUser(405, 'gd-huong-thuy', 'STAFF', 'GD_BCVH', { bcvh: ['536250'] });
    await addUser(406, 'cq-f12', 'STAFF', 'CHUYEN_QUAN', { indicators: ['F1.2'] });
    await run(`INSERT INTO hangton_snapshot (id, business_date, slot, captured_at, source_row_count, kept_row_count, is_stale, trigger) VALUES (1, ?, '0730', 'x', 0, 0, 0, 'SCHEDULE')`, [DAY]);
    for (const [code, name] of OFFICES) {
        for (let i = 0; i < 3; i += 1) {
            await run(`INSERT INTO hangton_snapshot_item (snapshot_id, item_code, status_name, ton_level, ton_rank, office, office_code, district, cod, customer_class, postman_code, postman_name)
                       VALUES (1, ?, 's', 'l', 5, ?, ?, 'Huế', 1000, 'KH', 'P', 'B')`, [`I${code}${i}`, name, code]);
        }
    }
    const app = express();
    app.use(express.json());
    const none = { ranking: async () => ({ data: [] }), offices: async () => ({ data: [] }), pairs: async () => ({ rows: [], columns: [] }) };
    app.use('/api/ops-journal', createOpsJournalRouter({ db: require('../config/db'), adapters: { f11: { ...none }, f12: { ...none }, f13: { ...none }, f41: { ...none } } }));
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/ops-journal`;
});

test.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

function session(id, name, spec) {
    return authSessionStore.createSession({ id, username: name, display_name: name, role: spec.tier === 'ADMIN' ? 'admin' : 'viewer', must_change_password: false, access: resolveAccess(spec) });
}
const GD = session(301, 'gd-ttvh', { tier: 'LEADER', position: 'GD_TTVH' });
const LD = session(303, 'ld-ttvh', { tier: 'LEADER', position: 'LD_TTVH' });
const U401 = session(401, 'gd-thuan-hoa', { tier: 'STAFF', position: 'GD_BCVH', bcvh: ['533140'] });
const U402 = session(402, 'cq-thuan-hoa', { tier: 'STAFF', position: 'CHUYEN_QUAN', bcvh: ['533140'] });
const U403 = session(403, 'plain', { tier: 'STAFF', bcvh: ['533140'] });
const U405 = session(405, 'gd-huong-thuy', { tier: 'STAFF', position: 'GD_BCVH', bcvh: ['536250'] });

async function call(sessionId, method, url, body) {
    const response = await fetch(`${baseUrl}${url}`, {
        method, headers: { ...(sessionId ? { 'x-session-id': sessionId } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined,
    });
    const textBody = await response.text();
    let json = null;
    try { json = JSON.parse(textBody); } catch { /* html */ }
    return { status: response.status, body: json, text: textBody };
}
const ids = (codes) => codes.map((code) => `HANGTON:BCVH:${code}`);
const ALL_FIVE = ids(OFFICES.map(([code]) => code));
const rowFor = (what, users) => ({ whoText: 'Giám đốc BCVH', what, where: 'BCVH', due: 'Trong ngày', how: 'Rà soát', expectedResult: 'Xử lý dứt điểm', assigneeUserIds: users });
const dayOf = async () => (await call(GD, 'GET', `/days/${DAY}`)).body.data;
const logKinds = async () => (await all('SELECT kind FROM ops_journal_action_log ORDER BY id')).map((r) => r.kind);

test('a stranger cannot write anything: same 404 as an unknown path, and nothing changes', async () => {
    const probes = [
        ['PUT', `/days/${DAY}/spots`, { candidateIds: ALL_FIVE }], ['POST', `/days/${DAY}/assign`, { spotIds: [1] }], ['POST', `/days/${DAY}/close`, {}],
        ['PUT', '/spots/1/actions', { actions: [] }], ['POST', '/spots/1/reopen', { reason: 'x' }], ['PUT', '/spots/1/closing', {}], ['POST', '/actions/1/done', {}],
        ['GET', '/assignable-users?officeCode=533140', null], ['GET', `/candidates?date=${DAY}`, null],
    ];
    for (const who of [LD, U401, U402, U403]) {
        const unknown = await call(who, 'GET', '/whatever');
        for (const [method, url, body] of probes) {
            const answer = await call(who, method, url, body);
            assert.equal(answer.status, 404, `${method} ${url}`);
            assert.equal(answer.text, unknown.text);
        }
    }
    assert.equal((await get('SELECT COUNT(*) AS n FROM ops_journal_spot')).n, 0);
    assert.equal((await get('SELECT COUNT(*) AS n FROM ops_journal_action_log')).n, 0);
    assert.equal((await call(null, 'PUT', `/days/${DAY}/spots`, { candidateIds: ALL_FIVE })).status, 401);
});

test('choosing spots: at least 1 per day (the manager decides how many), only real candidates, manual spots validated, re-choosing keeps what exists', async () => {
    const few = await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: [] });
    assert.equal(few.status, 400);
    assert.equal(few.body.error.code, 'OUT_OF_RANGE');
    const fake = await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: [...ALL_FIVE.slice(0, 4), 'F1.3:BCVH:999999'] });
    assert.equal(fake.status, 409);
    assert.equal(fake.body.error.code, 'UNKNOWN_CANDIDATE');
    const many = await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: ALL_FIVE, manual: Array.from({ length: 46 }, (_, i) => ({ indicator: 'F1.3', title: `tay ${i}`, officeCode: '533140' })) });
    assert.equal(many.status, 400);
    assert.equal((await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: ALL_FIVE.slice(0, 4), manual: [{ indicator: 'F9.9', title: 'x' }] })).body.error.code, 'BAD_MANUAL');
    assert.equal((await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: ALL_FIVE.slice(0, 4), manual: [{ indicator: 'F1.3', title: '  ' }] })).body.error.code, 'BAD_MANUAL');
    assert.equal((await dayOf()).spots.length, 0, 'none of the refused choices left anything behind');
});

test('the snapshot of the figures is taken on the server; a valid choice creates DRAFT spots and logs them', async () => {
    assert.equal((await dayOf()).spots.length, 0, 'the earlier failed choices left nothing behind');
    const ok = await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: ALL_FIVE.slice(0, 4), manual: [{ indicator: 'F1.3', title: 'F1.3 - tuyến phát thêm tay', officeCode: '533140', headline: 'Do Giám đốc ghi' }] });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    const day = ok.body.data;
    assert.equal(day.status, 'DRAFT');
    assert.equal(day.spots.length, 5);
    assert.ok(day.spots.every((s) => s.status === 'DRAFT'));
    const system = day.spots.find((s) => s.source === 'SYSTEM');
    assert.equal(system.metrics.stockGe5, 3);
    assert.equal(system.detectedAt, '07:30');
    assert.equal(system.channel, 'Dashboard');
    assert.equal(day.spots.find((s) => s.source === 'MANUAL').headline, 'Do Giám đốc ghi');
    assert.equal((await logKinds()).filter((k) => k === 'SPOT_ADDED').length, 5);
    // choosing again with the same list changes nothing; swapping one draft for another removes the old one
    const before = day.spots.map((s) => s.id).sort();
    const again = (await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: ALL_FIVE.slice(0, 4), manual: [{ indicator: 'F1.3', title: 'F1.3 - tuyến phát thêm tay', officeCode: '533140' }] })).body.data;
    assert.deepEqual(again.spots.map((s) => s.id).sort(), before);
    const swapped = (await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: ALL_FIVE })).body.data;
    assert.equal(swapped.spots.length, 5);
    assert.ok(!swapped.spots.some((s) => s.source === 'MANUAL'), 'the manual draft was dropped');
    assert.ok((await logKinds()).includes('SPOT_REMOVED'));
});

test('rows: validated, assignees must be active accounts, nothing reaches an assignee before finalizing', async () => {
    const spots = (await dayOf()).spots;
    const first = spots[0].id;
    assert.equal((await call(GD, 'PUT', `/spots/${first}/actions`, { actions: [rowFor('x', [999])] })).body.error.code, 'UNKNOWN_ASSIGNEE');
    assert.equal((await call(GD, 'PUT', `/spots/${first}/actions`, { actions: [rowFor('x', [404])] })).body.error.code, 'UNKNOWN_ASSIGNEE', 'a locked account cannot be assigned');
    assert.equal((await call(GD, 'PUT', `/spots/${first}/actions`, { actions: Array.from({ length: 13 }, () => rowFor('x', [401])) })).body.error.code, 'BAD_ROW');
    assert.equal((await call(GD, 'PUT', `/spots/${first}/actions`, { actions: [{ ...rowFor('x', [401]), what: 'a'.repeat(4001) }] })).body.error.code, 'TOO_LONG');
    assert.equal((await call(GD, 'PUT', '/spots/999999/actions', { actions: [] })).status, 404);
    for (const spot of spots) {
        const saved = await call(GD, 'PUT', `/spots/${spot.id}/actions`, { actions: [rowFor('Rà soát nguyên nhân', [401, 402]), rowFor('Tìm giải pháp', [402])] });
        assert.equal(saved.status, 200, JSON.stringify(saved.body));
    }
    assert.deepEqual((await call(U401, 'GET', '/my-tasks')).body.data, { tasks: [] }, 'draft rows are invisible to the assignee');
    const saved = (await dayOf()).spots[0];
    assert.deepEqual(saved.actions.map((a) => [a.seq, a.assigneeUserIds]), [[1, [401, 402]], [2, [402]]]);
});

test('finalizing is all-or-nothing and needs complete rows; afterwards the assignees see their rows and the spot is locked', async () => {
    const spots = (await dayOf()).spots;
    const bare = spots[4].id;
    await call(GD, 'PUT', `/spots/${bare}/actions`, { actions: [] });
    const refused = await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: spots.map((s) => s.id) });
    assert.equal(refused.status, 400);
    assert.equal(refused.body.error.code, 'SPOT_INCOMPLETE');
    assert.ok((await dayOf()).spots.every((s) => s.status === 'DRAFT'), 'one incomplete spot stops the whole batch');
    await call(GD, 'PUT', `/spots/${bare}/actions`, { actions: [{ ...rowFor('', [401]) }] });
    assert.equal((await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: [bare] })).body.error.code, 'SPOT_INCOMPLETE', 'a row needs "Làm gì"');
    await call(GD, 'PUT', `/spots/${bare}/actions`, { actions: [rowFor('Rà soát', [405])] });
    assert.equal((await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: [] })).status, 400);
    assert.equal((await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: [spots[0].id, spots[1].id, spots[2].id] })).status, 200);
    let day = await dayOf();
    assert.equal(day.status, 'ASSIGNED');
    assert.deepEqual(day.spots.map((s) => s.status), ['FINALIZED', 'FINALIZED', 'FINALIZED', 'DRAFT', 'DRAFT']);
    // visibility: 401 and 402 now see spots 0-2, 405 nothing yet, 403 nothing
    const t401 = (await call(U401, 'GET', '/my-tasks')).body.data.tasks;
    assert.equal(t401.length, 3);
    assert.deepEqual(t401[0].myRows.map((r) => r.what), ['Rà soát nguyên nhân'], '401 is on row 1 only');
    assert.deepEqual((await call(U402, 'GET', '/my-tasks')).body.data.tasks[0].myRows.map((r) => r.what).sort(), ['Rà soát nguyên nhân', 'Tìm giải pháp']);
    assert.deepEqual((await call(U405, 'GET', '/my-tasks')).body.data, { tasks: [] }, 'a draft spot stays hidden');
    assert.deepEqual((await call(U403, 'GET', '/my-tasks')).body.data, { tasks: [] });
    // locked
    const locked = await call(GD, 'PUT', `/spots/${spots[0].id}/actions`, { actions: [rowFor('đổi', [401])] });
    assert.equal(locked.status, 409);
    assert.equal(locked.body.error.code, 'LOCKED');
    assert.equal((await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: [spots[0].id] })).status, 409);
    assert.equal((await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: [spots[3].id] })).status, 200);
    assert.equal((await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: [bare] })).status, 200);
    day = await dayOf();
    assert.ok(day.spots.every((s) => s.status === 'FINALIZED'));
    assert.equal((await call(U405, 'GET', '/my-tasks')).body.data.tasks.length, 1);
});

test('reports: only a named assignee, on a finalized spot; co-assignees see each other; the manager accepts', async () => {
    const spot = (await dayOf()).spots[0];
    const shared = spot.actions[0]; // 401 and 402
    const mine = spot.actions[1]; // 402 only
    const missing = await call(U403, 'POST', '/actions/999999/report', { status: 'REPORTED', reportText: 'x' });
    for (const who of [U403, U405, GD]) {
        const answer = await call(who, 'POST', `/actions/${shared.id}/report`, { status: 'REPORTED', reportText: 'x' });
        assert.equal(answer.status, 404);
        assert.equal(answer.text, missing.text, 'a real row looks exactly like a missing one');
    }
    assert.equal((await call(U401, 'POST', `/actions/${mine.id}/report`, { status: 'REPORTED', reportText: 'x' })).status, 404, '401 is not on row 2');
    assert.equal((await call(U401, 'POST', `/actions/${shared.id}/report`, { status: 'DONE', reportText: 'x' })).body.error.code, 'BAD_STATUS', 'an assignee cannot mark DONE');
    assert.equal((await call(U401, 'POST', `/actions/${shared.id}/report`, { status: 'REPORTED', reportText: ' ' })).body.error.code, 'REPORT_REQUIRED');
    assert.equal((await call(U401, 'POST', `/actions/${shared.id}/report`, { status: 'IN_PROGRESS', causeText: 'Chờ khách' })).status, 200);
    const done = await call(U401, 'POST', `/actions/${shared.id}/report`, { status: 'REPORTED', causeText: 'KH hẹn lại', reportText: 'Đã gọi lại 12 khách' });
    assert.equal(done.status, 200);
    const seenBy402 = (await call(U402, 'GET', `/spots/${spot.id}`)).body.data.myRows.find((r) => r.id === shared.id);
    assert.equal(seenBy402.reportText, 'Đã gọi lại 12 khách', 'a shared row shows its report to everyone on it (PO: as on paper)');
    assert.equal(seenBy402.status, 'REPORTED');
    assert.equal((await call(GD, 'POST', `/actions/${mine.id}/done`, {})).body.error.code, 'NOT_REPORTED');
    assert.equal((await call(GD, 'POST', `/actions/${shared.id}/done`, {})).status, 200);
    assert.equal((await call(U401, 'POST', `/actions/${shared.id}/report`, { status: 'REPORTED', reportText: 'sửa' })).body.error.code, 'LOCKED');
    const kinds = await logKinds();
    assert.equal(kinds.filter((k) => k === 'REPORT').length, 2);
    assert.ok(kinds.includes('DONE'));
    const reportLog = await get("SELECT * FROM ops_journal_action_log WHERE kind = 'REPORT' ORDER BY id DESC LIMIT 1");
    assert.equal(reportLog.actor_id, 401);
});

test('reopening needs a reason, hides the spot from assignees, keeps the reports, and a reported row cannot be dropped', async () => {
    const spot = (await dayOf()).spots[0];
    assert.equal((await call(GD, 'POST', `/spots/${spot.id}/reopen`, {})).body.error.code, 'REASON_REQUIRED');
    assert.equal((await call(GD, 'POST', `/spots/${spot.id}/reopen`, { reason: 'Sai người được giao' })).status, 200);
    assert.equal((await call(U401, 'GET', `/spots/${spot.id}`)).status, 404);
    assert.ok(!(await call(U401, 'GET', '/my-tasks')).body.data.tasks.some((t) => t.spotId === spot.id));
    const drop = await call(GD, 'PUT', `/spots/${spot.id}/actions`, { actions: [] });
    assert.equal(drop.body.error.code, 'ROW_HAS_REPORT');
    const rewrite = await call(GD, 'PUT', `/spots/${spot.id}/actions`, { actions: [rowFor('Rà soát lại', [401]), rowFor('Tìm giải pháp', [402])] });
    assert.equal(rewrite.body.error.code, 'ROW_DONE', 'a confirmed row cannot get new work or new people');
    const edited = await call(GD, 'PUT', `/spots/${spot.id}/actions`, { actions: [{ ...rowFor('Rà soát nguyên nhân', [401, 402]), how: 'Cách làm mới' }, rowFor('Tìm giải pháp', [402])] });
    assert.equal(edited.status, 200);
    const row1 = edited.body.data.spots.find((s) => s.id === spot.id).actions[0];
    assert.equal(row1.id, spot.actions[0].id, 'the row is updated in place');
    assert.equal(row1.reportText, 'Đã gọi lại 12 khách', 'the report survives a correction');
    assert.deepEqual(row1.assigneeUserIds, [401, 402]);
    assert.equal(row1.how, 'Cách làm mới');
    assert.equal((await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: [spot.id] })).status, 200);
    assert.equal((await call(U401, 'GET', `/spots/${spot.id}`)).body.data.myRows[0].reportText, 'Đã gọi lại 12 khách');
    assert.equal((await call(GD, 'POST', `/spots/${spot.id}/reopen`, { reason: 'lần 2' })).status, 200);
    await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: [spot.id] });
    assert.ok((await logKinds()).filter((k) => k === 'REOPENED').length === 2);
});

test('assignable users: Giám đốc / Chuyên quản of the office or of the indicator, active only; all=1 lists every one', async () => {
    const names = async (url) => (await call(GD, 'GET', url)).body.data.map((u) => u.id).sort();
    assert.deepEqual(await names('/assignable-users?officeCode=533140'), [401, 402]);
    assert.deepEqual(await names('/assignable-users?officeCode=536250'), [405]);
    assert.deepEqual(await names('/assignable-users?officeCode=533140&indicator=F1.2'), [401, 402, 406], 'plus the F1.2 specialist');
    assert.deepEqual(await names('/assignable-users?officeCode=999999'), []);
    assert.deepEqual(await names('/assignable-users?all=1'), [401, 402, 405, 406], 'no plain staff and no locked account');
});

test('closing: sections 3-4 per spot, the day closes only when every spot is final, then everything is read-only', async () => {
    const day0 = await dayOf();
    const extra = (await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: ALL_FIVE, manual: [{ indicator: 'F4.1', title: 'F4.1 - thêm', officeCode: '533140' }] })).body.data;
    assert.equal(extra.spots.length, 6);
    const draft = extra.spots.find((s) => s.status === 'DRAFT');
    const notReady = await call(GD, 'POST', `/days/${DAY}/close`, {});
    assert.equal(notReady.status, 409);
    assert.equal(notReady.body.error.code, 'DAY_NOT_READY');
    assert.equal((await call(GD, 'PUT', `/spots/${draft.id}/closing`, { resolved: true })).status, 409, 'a draft spot has no end-of-day result');
    // drop the draft again (6 -> 5)
    assert.equal((await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: ALL_FIVE })).status, 200);
    const spotId = day0.spots[0].id;
    const saved = await call(GD, 'PUT', `/spots/${spotId}/closing`, { resolved: true, recovered: false, handlingTimeText: '2 giờ', lesson: 'Rà soát sớm', processUpdate: 'Không', doneTime: '17:00' });
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.body.data.spots.find((s) => s.id === spotId).closing, { resolved: true, recovered: false, handlingTimeText: '2 giờ', lesson: 'Rà soát sớm', processUpdate: 'Không', doneTime: '17:00' });
    assert.ok(!(await call(U401, 'GET', `/spots/${spotId}`)).text.includes('Rà soát sớm'), 'the closing never reaches an assignee');
    const closed = await call(GD, 'POST', `/days/${DAY}/close`, {});
    assert.equal(closed.status, 200);
    assert.equal(closed.body.data.status, 'CLOSED');
    assert.ok(closed.body.data.spots.every((s) => s.status === 'CLOSED'));
    for (const [method, url, body] of [
        ['PUT', `/days/${DAY}/spots`, { candidateIds: ALL_FIVE }], ['PUT', `/spots/${spotId}/actions`, { actions: [] }], ['POST', `/spots/${spotId}/reopen`, { reason: 'x' }],
        ['PUT', `/spots/${spotId}/closing`, { lesson: 'x' }], ['POST', `/days/${DAY}/assign`, { spotIds: [spotId] }],
    ]) {
        const answer = await call(GD, method, url, body);
        assert.equal(answer.status, 409, `${method} ${url}`);
        assert.equal(answer.body.error.code, 'DAY_CLOSED');
    }
    const rowId = day0.spots[0].actions[0].id;
    assert.equal((await call(U401, 'POST', `/actions/${rowId}/report`, { status: 'REPORTED', reportText: 'muộn' })).status, 404, 'a closed spot takes no more reports');
    assert.equal((await call(U401, 'GET', `/spots/${spotId}`)).status, 200, 'but the assignee can still read their phiếu');
});

test('the change log recorded every step with the actor, and the database refuses to alter it', async () => {
    const kinds = new Set(await logKinds());
    for (const kind of ['SPOT_ADDED', 'SPOT_REMOVED', 'ACTIONS_SAVED', 'FINALIZED', 'REPORT', 'DONE', 'REOPENED', 'CLOSING_SAVED', 'DAY_CLOSED']) assert.ok(kinds.has(kind), kind);
    const actors = (await all('SELECT DISTINCT actor_id FROM ops_journal_action_log')).map((r) => r.actor_id).sort();
    assert.deepEqual(actors, [301, 401], 'the manager and the one assignee who reported');
    await assert.rejects(run('DELETE FROM ops_journal_action_log'), /append-only/);
});
