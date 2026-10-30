// OPS-JOURNAL-01: regression tests for the findings of the Opus review of A2-A4 (reopened spots are not droppable,
// reports do not move to other people, candidates are not frozen from an open transaction, strangers get 404 before 400, ...).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-ops-fixes-'));
const dbFile = path.join(tmpDir, 'fixes.sqlite');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = dbFile;

const dbModule = require('../config/db');
const { db, run, get, all } = dbModule;
const { applyOpsJournal01Schema } = require('../../migrate_ops_journal_01_schema');
const { applyHangtonInventory01Schema } = require('../../migrate_hangton_inventory_01_schema');
const { applyRbac01Schema } = require('../../migrate_rbac_01_schema');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const createOpsJournalRouter = require('./opsJournalRoutes');
const { shiftOf, buildPl06 } = require('../services/opsJournal/pl06Document');
const { buildDocx } = require('../services/opsJournal/pl06Docx');
const JSZip = require('jszip');

const DAY = '2026-10-31';
const OFFICES = [['533140', 'BCVH Thuận Hóa'], ['536250', 'BCVH Hương Thủy'], ['535470', 'BCVH Hương Trà'], ['537220', 'BCVH Phú Lộc'], ['537015', 'BCVH Thuận An'], ['535790', 'BCVH A Lưới']];
const IDS = OFFICES.map(([code]) => `HANGTON:BCVH:${code}`);
let server;
let baseUrl;

test.before(async () => {
    await applyRbac01Schema(dbFile);
    await applyHangtonInventory01Schema(dbFile);
    await applyOpsJournal01Schema(dbFile);
    for (const id of [401, 402, 403]) {
        await run('INSERT INTO qis_user (id, username, display_name, tier, position, password_hash, must_change_password, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, 1, 1, 1)',
            [id, `u${id}`, `u${id}`, 'STAFF', 'CHUYEN_QUAN', 'x']);
    }
    await run(`INSERT INTO hangton_snapshot (id, business_date, slot, captured_at, source_row_count, kept_row_count, is_stale, trigger) VALUES (1, ?, '0730', 'x', 0, 0, 0, 'SCHEDULE')`, [DAY]);
    for (const [code, name] of OFFICES) {
        await run(`INSERT INTO hangton_snapshot_item (snapshot_id, item_code, status_name, ton_level, ton_rank, office, office_code, district, cod, customer_class, postman_code, postman_name)
                   VALUES (1, ?, 's', 'l', 5, ?, ?, 'Huế', 1, 'KH', 'P', 'B')`, [`I${code}`, name, code]);
    }
    const app = express();
    app.use(express.json());
    app.use('/api/ops-journal', createOpsJournalRouter({ db: dbModule, adapters: { f11: {}, f12: {}, f13: {}, f41: {} } }));
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/ops-journal`;
});

test.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

const session = (id, name, spec) => authSessionStore.createSession({ id, username: name, display_name: name, role: 'viewer', must_change_password: false, access: resolveAccess(spec) });
const GD = session(301, 'gd', { tier: 'LEADER', position: 'GD_TTVH' });
const U401 = session(401, 'u401', { tier: 'STAFF', position: 'CHUYEN_QUAN', bcvh: ['533140'] });
const U402 = session(402, 'u402', { tier: 'STAFF', position: 'CHUYEN_QUAN', bcvh: ['533140'] });
const U403 = session(403, 'u403', { tier: 'STAFF', position: 'CHUYEN_QUAN', bcvh: ['533140'] });

async function call(sessionId, method, url, body) {
    const response = await fetch(`${baseUrl}${url}`, { method, headers: { 'x-session-id': sessionId, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* html */ }
    return { status: response.status, body: json, text };
}
const row = (what, users) => ({ whoText: 'Ai', what, where: 'x', due: 'Trong ngày', how: 'y', expectedResult: 'z', assigneeUserIds: users });
const dayOf = async () => (await call(GD, 'GET', `/days/${DAY}`)).body.data;
const logKinds = async () => (await all('SELECT kind FROM ops_journal_action_log ORDER BY id')).map((r) => r.kind);

test('setup: five spots with rows, finalized; 401 reports on the first', async () => {
    assert.equal((await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: IDS.slice(0, 5) })).status, 200);
    for (const spot of (await dayOf()).spots) {
        assert.equal((await call(GD, 'PUT', `/spots/${spot.id}/actions`, { actions: [row('Rà soát', [401, 402]), row('Theo dõi', [402])] })).status, 200);
    }
    const spots = (await dayOf()).spots;
    assert.equal((await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: spots.map((s) => s.id) })).status, 200);
    const first = spots[0].actions[0];
    assert.equal((await call(U401, 'POST', `/actions/${first.id}/report`, { status: 'REPORTED', reportText: 'Đã rà soát' })).status, 200);
});

test('M1: a reopened spot that was finalized or reported cannot be dropped by choosing a different list', async () => {
    const spots = (await dayOf()).spots;
    const target = spots[0];
    assert.equal((await call(GD, 'POST', `/spots/${target.id}/reopen`, { reason: 'Sửa người' })).status, 200);
    // the new list leaves the reopened spot out and adds a sixth one
    const others = spots.slice(1).map((s) => `HANGTON:BCVH:${s.scopeKey}`);
    const answer = await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: [...others, IDS[5]] });
    assert.equal(answer.status, 200, JSON.stringify(answer.body));
    const after = answer.body.data.spots;
    assert.equal(after.length, 6, 'the protected spot stays and counts: 5 kept + 1 new');
    const kept = after.find((s) => s.id === target.id);
    assert.ok(kept, 'the reopened spot is still there');
    assert.equal(kept.actions[0].reportText, 'Đã rà soát', 'with its report');
    assert.ok(!(await logKinds()).includes('SPOT_REMOVED'));
    // a plain draft that was never finalized can still be dropped, and its rows go to the log
    const sixth = after.find((s) => s.scopeKey === OFFICES[5][0]);
    await call(GD, 'PUT', `/spots/${sixth.id}/actions`, { actions: [row('Nháp', [403])] });
    assert.equal((await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: others })).status, 200);
    const removed = await get("SELECT before_json FROM ops_journal_action_log WHERE kind = 'SPOT_REMOVED'");
    assert.equal(JSON.parse(removed.before_json).rows[0].what, 'Nháp');
});

test('M2: on a reopened spot a reported row keeps its report only while the same work stays with the reporter; a DONE row is final', async () => {
    const day = await dayOf();
    const target = day.spots.find((s) => s.status === 'DRAFT'); // the reopened one
    const [r1, r2] = target.actions;
    assert.equal(r1.reportText, 'Đã rà soát');
    // same work, reporter still on it: report survives
    const same = await call(GD, 'PUT', `/spots/${target.id}/actions`, { actions: [row('Rà soát', [401, 403]), row('Theo dõi', [402])] });
    assert.equal(same.status, 200);
    assert.equal(same.body.data.spots.find((s) => s.id === target.id).actions[0].reportText, 'Đã rà soát');
    // the reporter is replaced: the report is reset (not handed to the new person) and the old one is logged
    const swapped = await call(GD, 'PUT', `/spots/${target.id}/actions`, { actions: [row('Rà soát', [403]), row('Theo dõi', [402])] });
    const a1 = swapped.body.data.spots.find((s) => s.id === target.id).actions[0];
    assert.equal(a1.reportText, null);
    assert.equal(a1.status, 'DRAFT');
    assert.ok((await logKinds()).includes('REPORT_RESET'));
    const reset = await get("SELECT before_json FROM ops_journal_action_log WHERE kind = 'REPORT_RESET'");
    assert.equal(JSON.parse(reset.before_json).text, 'Đã rà soát');
    // finalize again, 402 reports and the manager accepts row 2; then it cannot be rewritten
    await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: [target.id] });
    assert.equal((await call(U402, 'POST', `/actions/${r2.id}/report`, { status: 'REPORTED', reportText: 'Xong' })).status, 200);
    assert.equal((await call(GD, 'POST', `/actions/${r2.id}/done`, {})).status, 200);
    await call(GD, 'POST', `/spots/${target.id}/reopen`, { reason: 'Lần hai' });
    const changed = await call(GD, 'PUT', `/spots/${target.id}/actions`, { actions: [row('Rà soát', [403]), row('Theo dõi', [401])] });
    assert.equal(changed.status, 409);
    assert.equal(changed.body.error.code, 'ROW_DONE');
    const unchanged = await call(GD, 'PUT', `/spots/${target.id}/actions`, { actions: [row('Rà soát', [403]), { ...row('Theo dõi', [402]), where: 'chỉ sửa chỗ' }] });
    assert.equal(unchanged.status, 200, 'text around the work may still be edited; the work and its people may not');
    assert.equal(unchanged.body.data.spots.find((s) => s.id === target.id).actions[1].status, 'DONE');
});

test('L1: a stranger gets 404 on /report whatever the body says; assignee ids must be integers', async () => {
    const day = await dayOf();
    const someRow = day.spots.find((s) => s.status === 'FINALIZED').actions[0];
    const missing = await call(U403, 'POST', '/actions/999999/report', {});
    for (const body of [{}, { status: 'NOPE' }, { status: 'REPORTED' }, { status: 'REPORTED', reportText: 'x'.repeat(5000) }]) {
        const answer = await call(U403, 'POST', `/actions/${someRow.id}/report`, body);
        assert.equal(answer.status, 404);
        assert.equal(answer.text, missing.text);
    }
    const other = day.spots.filter((s) => s.status === 'FINALIZED')[1];
    assert.equal((await call(GD, 'POST', `/spots/${other.id}/reopen`, { reason: 'thử' })).status, 200);
    const draft = other;
    for (const bad of [[true], ['1e3'], [1.5], ['0x1'], [' 401']]) {
        assert.equal((await call(GD, 'PUT', `/spots/${draft.id}/actions`, { actions: [row('x', bad)] })).body.error.code, 'BAD_ROW', JSON.stringify(bad));
    }
    assert.equal((await call(GD, 'PUT', `/spots/${draft.id}/actions`, { actions: [row('x', ['401', 402])] })).status, 200, 'digit strings are fine');
});

test('M3: candidates are not built while an import or snapshot transaction is open', async () => {
    dbModule.txState.active = 1;
    try {
        const refused = await call(GD, 'GET', `/candidates?date=${DAY}`);
        assert.equal(refused.status, 409);
        assert.equal(refused.body.error.code, 'DATA_UPDATING');
        const choose = await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: IDS.slice(0, 5) });
        assert.equal(choose.status, 409, 'choosing from candidates is refused too');
    } finally {
        dbModule.txState.active = 0;
    }
    assert.equal((await call(GD, 'GET', `/candidates?date=${DAY}`)).status, 200);
});

test('L4 / L7: the .docx drops characters XML rejects; the shift is read in Vietnam time whatever the server zone', async () => {
    const model = buildPl06({
        id: 1, day: DAY, indicator: 'F4.1', officeName: 'X', title: 'F4.1 - X', status: 'FINALIZED', finalizedAt: Date.parse('2026-10-31T08:10:00+07:00'), detectedAt: '07:30', channel: 'Dashboard',
        headline: 'a￾b￿c', actions: [], closing: null,
    }, { name: 'M', positionCode: 'GD_TTVH' });
    const xml = await (await JSZip.loadAsync(await buildDocx(model))).file('word/document.xml').async('string');
    assert.ok(xml.includes('abc') && !xml.includes('￾') && !xml.includes('￿'));
    assert.deepEqual(['2026-10-31T08:10:00+07:00', '2026-10-31T13:00:00+07:00', '2026-10-31T22:30:00+07:00', '2026-10-31T00:30:00+07:00'].map((t) => shiftOf(Date.parse(t))), [0, 1, 2, 0]);
});
