// OPS-JOURNAL-01 (PO 2026-10-30): evidence files on reports and the in-app notifications.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-ops-files-'));
const dbFile = path.join(tmpDir, 'files.sqlite');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = dbFile;

const { db, run, get, all } = require('../config/db');
const { applyOpsJournal01Schema } = require('../../migrate_ops_journal_01_schema');
const { applyOpsJournal02Schema } = require('../../migrate_ops_journal_02_schema');
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
    await applyOpsJournal02Schema(dbFile);
    await addUser(401, 'gd-thuan-hoa', 'STAFF', 'GD_BCVH', { bcvh: ['533140'] });
    await addUser(402, 'cq-thuan-hoa', 'STAFF', 'CHUYEN_QUAN', { bcvh: ['533140'] });
    await addUser(403, 'plain', 'STAFF', null, { bcvh: ['533140'] });
    await addUser(404, 'locked-cq', 'STAFF', 'CHUYEN_QUAN', { active: 0, bcvh: ['533140'] });
    await addUser(301, 'gd-ttvh', 'LEADER', 'GD_TTVH');
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



const form = (name, bytes) => { const f = new FormData(); f.append('file', new Blob([bytes]), name); return f; };
async function upload(sessionId, actionId, name, bytes) {
    const response = await fetch(`${baseUrl}/actions/${actionId}/attachments`, { method: 'POST', headers: sessionId ? { 'x-session-id': sessionId } : {}, body: form(name, bytes) });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: response.status, body: json, text };
}
async function download(sessionId, id) {
    const response = await fetch(`${baseUrl}/attachments/${id}`, { headers: sessionId ? { 'x-session-id': sessionId } : {} });
    return { status: response.status, headers: response.headers, buffer: Buffer.from(await response.arrayBuffer()) };
}
const ZIPBYTES = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('fake xlsx body')]);
const notes = async (sessionId) => (await call(sessionId, 'GET', '/notifications')).body.data;
let spotId;
let rowThree;

test('finalizing tells the people named on the rows, and nobody else', async () => {
    const day = (await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: ids(['533140']) })).body.data;
    spotId = day.spots[0].id;
    rowThree = day.spots[0].actions[2];
    assert.equal((await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: [spotId] })).status, 200);
    const gdNotes = await notes(U401);
    assert.equal(gdNotes.unread, 1);
    assert.equal(gdNotes.items[0].kind, 'ASSIGNED');
    assert.equal(gdNotes.items[0].target, 'MY_TASKS');
    assert.match(gdNotes.items[0].title, /^gd-ttvh – Giám đốc TTVH giao việc: Hàng tồn - BCVH Thuận Hóa$/, 'who assigned, with the position');
    assert.match(gdNotes.items[0].body, /dòng việc ngày 30\/10/);
    assert.equal((await notes(U402)).unread, 1);
    assert.deepEqual(await notes(U403), { items: [], unread: 0, hasAny: false }, 'a user nobody notified sees an empty list (the bell stays hidden)');
    assert.equal((await call(null, 'GET', '/notifications')).status, 401);
});

test('evidence files: type checked by name and by content, only the people on the row attach, only they and the manager read', async () => {
    const rowId = rowThree.id; // row 3: Giám đốc + Chuyên quản
    assert.equal((await upload(U403, rowId, 'a.xlsx', ZIPBYTES)).status, 404, 'a stranger gets the plain 404 before the body is read');
    assert.equal((await upload(U405, rowId, 'a.xlsx', ZIPBYTES)).status, 404, 'a person of another unit too');
    assert.equal((await upload(null, rowId, 'a.xlsx', ZIPBYTES)).status, 401);
    assert.equal((await upload(U402, rowId, 'virus.exe', ZIPBYTES)).status, 415);
    assert.equal((await upload(U402, rowId, 'fake.xlsx', Buffer.from('MZ not a zip'))).status, 415, 'content must match the extension');
    assert.equal((await upload(U402, rowId, 'fake.pdf', ZIPBYTES)).status, 415);
    const ok = await upload(U402, rowId, 'Biên bản kiểm tra.xlsx', ZIPBYTES);
    assert.equal(ok.status, 200, ok.text);
    assert.equal(ok.body.data.name, 'Biên bản kiểm tra.xlsx', 'Vietnamese names survive');
    const pdf = await upload(U402, rowId, 'scan.pdf', Buffer.from('%PDF-1.4 fake'));
    assert.equal(pdf.status, 200, pdf.text);
    const dayData = (await call(GD, 'GET', `/days/${DAY}`)).body.data;
    const files = dayData.spots[0].actions[2].attachments;
    assert.deepEqual(files.map((f) => f.name), ['Biên bản kiểm tra.xlsx', 'scan.pdf']);
    assert.equal(files[0].uploadedByName, 'cq-thuan-hoa');
    const mine = (await call(U401, 'GET', '/my-tasks')).body.data.tasks[0].myRows.find((r) => r.id === rowId);
    assert.equal(mine.attachments.length, 2, 'a co-assignee sees the evidence of the row');
    for (const who of [GD, U401, U402]) {
        const got = await download(who, ok.body.data.id);
        assert.equal(got.status, 200);
        assert.equal(got.headers.get('x-content-type-options'), 'nosniff');
        assert.match(got.headers.get('content-disposition'), /^attachment; filename=/);
        assert.deepEqual(got.buffer, ZIPBYTES);
    }
    assert.equal((await download(U403, ok.body.data.id)).status, 404);
    assert.equal((await download(U405, ok.body.data.id)).status, 404);
    assert.equal((await download(GD, 999999)).status, 404);
    assert.equal((await call(U401, 'DELETE', `/attachments/${pdf.body.data.id}`)).status, 404, 'only the uploader takes a file back');
    assert.equal((await call(U402, 'DELETE', `/attachments/${pdf.body.data.id}`)).status, 200);
    assert.equal((await download(GD, pdf.body.data.id)).status, 404);
});

test('a report tells the manager (with the file count) and the co-assignee, not the reporter; accepting tells the row people', async () => {
    const rowId = rowThree.id;
    const before = (await notes(U401)).unread;
    const reported = await call(U402, 'POST', `/actions/${rowId}/report`, { status: 'REPORTED', causeText: 'Test lần 1', reportText: 'Đã kiểm tra, xem file kèm' });
    assert.equal(reported.status, 200, JSON.stringify(reported.body));
    const managerNotes = await notes(GD);
    assert.equal(managerNotes.items[0].kind, 'REPORTED');
    assert.equal(managerNotes.items[0].target, 'MANAGER');
    assert.equal(managerNotes.items[0].title, 'cq-thuan-hoa – Chuyên quản BCVH đã báo cáo dòng 3: Hàng tồn - BCVH Thuận Hóa', 'who reported, with the position');
    assert.match(managerNotes.items[0].body, /Đính kèm: 1 file/);
    const co = await notes(U401);
    assert.equal(co.unread, before + 1);
    assert.equal(co.items[0].kind, 'REPORTED');
    assert.equal(co.items[0].target, 'MY_TASKS');
    assert.equal((await notes(U402)).items.filter((n) => n.kind === 'REPORTED').length, 0, 'the reporter is not told about their own report');
    assert.equal((await call(GD, 'POST', `/actions/${rowId}/done`)).status, 200);
    const done = (await notes(U402)).items[0];
    assert.equal(done.kind, 'DONE');
    assert.equal(done.title, 'gd-ttvh – Giám đốc TTVH xác nhận hoàn thành dòng 3: Hàng tồn - BCVH Thuận Hóa', 'who accepted, with the position');
    assert.equal((await upload(U402, rowId, 'late.pdf', Buffer.from('%PDF-1.4 x'))).status, 409, 'no new file on an accepted row');
});

test('reading: only your own notifications can be marked read', async () => {
    const mine = await notes(U401);
    assert.ok(mine.unread >= 2);
    const stolen = await call(U402, 'POST', '/notifications/read', { ids: mine.items.map((n) => n.id) });
    assert.equal(stolen.body.data.updated, 0, 'ids of somebody else change nothing');
    assert.equal((await notes(U401)).unread, mine.unread);
    const one = await call(U401, 'POST', '/notifications/read', { ids: [mine.items[0].id] });
    assert.equal(one.body.data.updated, 1);
    assert.equal((await notes(U401)).unread, mine.unread - 1);
    const all = await call(U401, 'POST', '/notifications/read', { all: true });
    assert.equal(all.body.data.updated, mine.unread - 1);
    assert.equal((await notes(U401)).unread, 0);
    assert.equal((await notes(U401)).hasAny, true);
});

test('the assigned list: one light line per finalized spot, manager only, bounded range', async () => {
    const answer = await call(GD, 'GET', `/assigned?from=2026-10-20&to=${DAY}`);
    assert.equal(answer.status, 200, JSON.stringify(answer.body));
    const [item] = answer.body.data.items;
    assert.equal(item.id, spotId);
    assert.equal(item.day, DAY);
    assert.equal(item.rowCount, 4);
    assert.deepEqual(item.counts, { assigned: 3, inProgress: 0, reported: 0, done: 1 });
    assert.equal(item.fileCount, 1);
    assert.deepEqual([...item.pending].sort((a, b) => a.name.localeCompare(b.name)), [{ name: 'cq-thuan-hoa', seqs: [1, 2, 4] }, { name: 'gd-thuan-hoa', seqs: [1, 2, 4] }], 'who still owes a report, and for which rows');
    assert.ok(item.lastReportedAt > 0);
    assert.deepEqual(item.assignees, ['cq-thuan-hoa', 'gd-thuan-hoa']);
    assert.equal(JSON.stringify(item).includes('reportText'), false, 'no report text in the list');
    assert.deepEqual(answer.body.data.days, [{ day: DAY, status: 'ASSIGNED' }]);
    assert.deepEqual((await call(GD, 'GET', '/assigned?from=2026-10-31&to=2026-10-31')).body.data.items, [], 'a day with nothing finalized is empty');
    assert.equal((await call(GD, 'GET', '/assigned?from=2026-01-01&to=2026-10-30')).status, 404, 'a range over 62 days is refused');
    assert.equal((await call(GD, 'GET', '/assigned?from=nope&to=2026-10-30')).status, 404);
    for (const who of [U401, U402, U403]) assert.equal((await call(who, 'GET', '/assigned')).status, 404, 'only the manager');
});

test('one report for the whole spot (either person of the team), accepted all at once', async () => {
    // a second spot of the same unit, finalized: both people are on every row
    const day = (await call(GD, 'PUT', `/days/${DAY}/spots`, { candidateIds: ids(['533140', '536250']) })).body.data;
    const second = day.spots.find((s) => s.officeCode === '536250');
    assert.equal((await call(GD, 'POST', `/days/${DAY}/assign`, { spotIds: [second.id] })).status, 200);
    assert.equal((await call(U403, 'POST', `/spots/${second.id}/report`, { status: 'REPORTED', reportText: 'x' })).status, 404, 'a stranger gets the plain 404');
    assert.equal((await call(U401, 'POST', `/spots/${second.id}/report`, { status: 'REPORTED', reportText: 'x' })).status, 404, 'a person of another unit too');
    const bad = await call(U405, 'POST', `/spots/${second.id}/report`, { status: 'REPORTED', reportText: '' });
    assert.equal(bad.body.error.code, 'REPORT_REQUIRED');
    const sent = await call(U405, 'POST', `/spots/${second.id}/report`, { status: 'REPORTED', causeText: 'Thiếu người', reportText: 'Hai bên đã thống nhất, báo cáo chung.' });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    assert.equal(sent.body.data.actionIds.length, 4, 'the report lands on every row of the spot');
    const after = (await call(GD, 'GET', `/spots/${second.id}`)).body.data;
    assert.ok(after.actions.every((a) => a.status === 'REPORTED' && a.reportText === 'Hai bên đã thống nhất, báo cáo chung.'));
    // the manager is told once, for all rows
    const managerNotes = (await notes(GD)).items.filter((n) => n.title.includes('Hương Thủy'));
    assert.equal(managerNotes.filter((n) => n.kind === 'REPORTED').length, 1);
    assert.match(managerNotes[0].title, /gd-huong-thuy – Giám đốc BCVH đã báo cáo các dòng 1, 2, 3, 4/);
    // the manager accepts the whole spot at once
    assert.equal((await call(U405, 'POST', `/spots/${second.id}/done`)).status, 404, 'only the manager accepts');
    const done = await call(GD, 'POST', `/spots/${second.id}/done`);
    assert.equal(done.status, 200, JSON.stringify(done.body));
    assert.equal(done.body.data.done, 4);
    assert.ok((await call(GD, 'GET', `/spots/${second.id}`)).body.data.actions.every((a) => a.status === 'DONE'));
    assert.equal((await call(GD, 'POST', `/spots/${second.id}/done`)).body.error.code, 'NOT_REPORTED');
    assert.equal((await call(U405, 'POST', `/spots/${second.id}/report`, { status: 'REPORTED', reportText: 'again' })).status, 409, 'nothing left to report on');
    assert.match((await notes(U405)).items[0].title, /Giám đốc TTVH xác nhận hoàn thành các dòng 1, 2, 3, 4/);
});
