// OPS-JOURNAL-01 (PO 2026-10-30): choosing a spot drafts its "6 rõ" rows with the unit people on them; a draft spot can be removed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-ops-autorows-'));
const dbFile = path.join(tmpDir, 'autorows.sqlite');
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
const dayOf = async () => (await call(GD, 'GET', `/days/${DAY}`)).body.data;


test('choosing a spot drafts the 4 rows of the PL06 model with the real figures, dates and people of the unit', async () => {
    const picked = await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: ids(['533140', '537220']) });
    assert.equal(picked.status, 200, JSON.stringify(picked.body));
    const spots = picked.body.data.spots;
    assert.equal(spots.length, 2);
    for (const spot of spots) assert.equal(spot.actions.length, 4, 'four drafted rows per spot, as in the journals of 19-23/10');
    const thuan = spots.find((s) => s.officeCode === '533140');
    const [r1, r2, r3, r4] = thuan.actions;
    assert.deepEqual(r1.assigneeUserIds, [401], 'row 1: the unit Giám đốc BCVH');
    assert.equal(r1.whoText, 'Giám đốc BCVH Thuận Hóa');
    assert.match(r1.what, /^Rà soát toàn bộ 3 bưu gửi tồn từ 5 ngày trở lên, xử lý dứt điểm/, 'the real count of the spot');
    assert.equal(r1.due, 'Trong ngày 30/10');
    assert.equal(r1.where, 'BCVH Thuận Hóa');
    assert.deepEqual(r2.assigneeUserIds, [401]);
    assert.match(r2.how, /báo cáo trực tiếp cho cq-thuan-hoa tại TTVH/, 'the specialist is named');
    assert.deepEqual([...r3.assigneeUserIds].sort(), [401, 402], 'row 3: Chuyên quản phối hợp Giám đốc BCVH');
    assert.match(r3.whoText, /^cq-thuan-hoa \(Chuyên quản BCVH Thuận Hóa tại TTVH\) phối hợp Giám đốc BCVH Thuận Hóa$/);
    assert.deepEqual(r4.assigneeUserIds, [402], 'row 4: the Chuyên quản (the locked account 404 is never used)');
    assert.match(r4.how, /11h30, 21h00 ngày 30\/10 và 07h30 ngày 31\/10/, 'dates of the journal');
    const loc = spots.find((s) => s.officeCode === '537220');
    assert.deepEqual(loc.actions[0].assigneeUserIds, [], 'a unit with nobody on record: the manager picks');
    assert.equal(loc.actions[0].whoText, 'Giám đốc BCVH Phú Lộc');
    const again = (await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: ids(['533140', '537220']) })).body.data;
    assert.ok(again.spots.every((s) => s.actions.length === 4), 'choosing again does not draft a second set');
});

test('a draft spot can be removed by the manager; a finalized one, an unknown id and a stranger cannot', async () => {
    const day = await dayOf();
    const thuan = day.spots.find((s) => s.officeCode === '533140');
    const loc = day.spots.find((s) => s.officeCode === '537220');
    assert.equal((await call(U401, 'DELETE', `/spots/${loc.id}`)).status, 404, 'a stranger gets the plain 404');
    assert.equal((await dayOf()).spots.length, 2);
    const removed = await call(GD, 'DELETE', `/spots/${loc.id}`);
    assert.equal(removed.status, 200, JSON.stringify(removed.body));
    assert.deepEqual(removed.body.data.spots.map((s) => s.id), [thuan.id]);
    assert.equal((await get('SELECT COUNT(*) AS n FROM ops_journal_action WHERE spot_id = ?', [loc.id])).n, 0, 'its rows went with it');
    assert.equal((await call(GD, 'DELETE', `/spots/${loc.id}`)).status, 404);
    assert.equal((await call(GD, 'DELETE', '/spots/abc')).status, 404);
    const finalized = await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: [thuan.id] });
    assert.equal(finalized.status, 200, JSON.stringify(finalized.body));
    const refused = await call(GD, 'DELETE', `/spots/${thuan.id}`);
    assert.equal(refused.status, 409);
    assert.equal(refused.body.error.code, 'LOCKED');
    assert.equal((await get('SELECT COUNT(*) AS n FROM ops_journal_spot WHERE id = ?', [thuan.id])).n, 1);
});

test('just press chốt: a spot whose rows name nobody (no account on record) is finalized and exportable', async () => {
    const picked = await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: ids(['533140', '537220']) });
    assert.equal(picked.status, 200, JSON.stringify(picked.body));
    const loc = picked.body.data.spots.find((s) => s.officeCode === '537220');
    assert.ok(loc.actions.every((r) => r.assigneeUserIds.length === 0 || r.assigneeUserIds.length > 0));
    assert.deepEqual(loc.actions[0].assigneeUserIds, []);
    const done = await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: [loc.id] });
    assert.equal(done.status, 200, JSON.stringify(done.body));
    assert.equal(done.body.data.spots.find((s) => s.id === loc.id).status, 'FINALIZED');
    assert.equal(done.body.data.spots.find((s) => s.id === loc.id).closingDraft.doneTime, '17:00');
});

test('a spot that was finalized by mistake and reopened (no report yet) can be removed; one with a report cannot', async () => {
    const day = (await call(GD, 'GET', `/days/${DAY}`)).body.data;
    const spot = day.spots.find((s) => s.status === 'FINALIZED');
    assert.ok(spot);
    assert.equal((await call(GD, 'POST', `/spots/${spot.id}/reopen`, { reason: 'Chốt nhầm' })).status, 200);
    const reopened = (await call(GD, 'GET', `/days/${DAY}`)).body.data.spots.find((s) => s.id === spot.id);
    assert.equal(reopened.status, 'DRAFT');
    assert.equal(reopened.protected, false, 'nobody reported: not protected');
    const removed = await call(GD, 'DELETE', `/spots/${spot.id}`);
    assert.equal(removed.status, 200, JSON.stringify(removed.body));
    assert.ok(!removed.body.data.spots.some((s) => s.id === spot.id));
});
