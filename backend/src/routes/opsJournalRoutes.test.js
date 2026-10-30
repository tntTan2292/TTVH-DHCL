// OPS-JOURNAL-01 (A1): who may read the Nhật ký điều hành. The module is invisible to everyone but the manager
// (Giám đốc TTVH, admin) until a row is assigned to a user; that user then reads only their own rows. Every refusal is the
// same 404 as an unknown id, with no cache, so nothing (count, id, header) tells a stranger the module or a spot exists.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-ops-journal-'));
const dbFile = path.join(tmpDir, 'ops_journal.sqlite');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = dbFile;

const { db, run } = require('../config/db');
const { applyOpsJournal01Schema } = require('../../migrate_ops_journal_01_schema');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const roles = require('../services/auth/access/roles');
const createOpsJournalRouter = require('./opsJournalRoutes');

const DAY = '2026-10-29';
const NOW = Date.now();
let server;
let baseUrl;
const ids = {};

async function insertSpot(day, title, status, headline) {
    const result = await run(
        `INSERT INTO ops_journal_spot (day, indicator, scope_type, scope_key, office_code, title, headline, metrics_json, status, finalized_at, created_at)
         VALUES (?, 'F1.3', 'BCVH', '533140', '533140', ?, ?, ?, ?, ?, ?)`,
        [day, title, headline, JSON.stringify({ rate: 80, fail: 12 }), status, status === 'DRAFT' ? null : NOW, NOW]);
    return result.lastID;
}

async function insertRow(spotId, seq, what, assignedAt, users) {
    const result = await run('INSERT INTO ops_journal_action (spot_id, seq, what, assigned_at) VALUES (?, ?, ?, ?)', [spotId, seq, what, assignedAt]);
    for (const user of users) await run('INSERT INTO ops_journal_action_assignee (action_id, user_id) VALUES (?, ?)', [result.lastID, user]);
    return result.lastID;
}

test.before(async () => {
    await applyOpsJournal01Schema(dbFile);
    await run('INSERT INTO ops_journal_day (day, status, created_at, updated_at) VALUES (?, ?, ?, ?)', [DAY, 'ASSIGNED', NOW, NOW]);
    ids.s1 = await insertSpot(DAY, 'SPOT-ONE', 'FINALIZED', 'headline one');
    ids.s1a = await insertRow(ids.s1, 1, 'ROW-FOR-201', NOW, [201]);
    ids.s1b = await insertRow(ids.s1, 2, 'ROW-FOR-202', NOW, [202]);
    await insertRow(ids.s1, 3, 'ROW-FOR-NOBODY', NOW, []);
    await run('INSERT INTO ops_journal_closing (spot_id, lesson, updated_at) VALUES (?, ?, ?)', [ids.s1, 'SECRET-LESSON', NOW]);
    ids.s2 = await insertSpot(DAY, 'SPOT-DRAFT', 'DRAFT', 'headline draft');
    await insertRow(ids.s2, 1, 'ROW-IN-DRAFT-201', null, [201]);
    await insertRow(ids.s2, 2, 'ROW-IN-DRAFT-STAMPED', NOW, [201]); // even a stamped row is hidden while its spot is a draft
    ids.s3 = await insertSpot(DAY, 'SPOT-THREE', 'FINALIZED', 'headline three');
    await insertRow(ids.s3, 1, 'ROW-FOR-202-AND-204', NOW, [202, 204]);
    await insertRow(ids.s3, 2, 'ROW-UNSTAMPED-201', null, [201]); // assigned but not yet given out

    const app = express();
    app.use(express.json());
    app.use('/api/ops-journal', createOpsJournalRouter({ db: require('../config/db') }));
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/ops-journal`;
});

test.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

function session(id, name, spec, extra = {}) {
    return authSessionStore.createSession({ id, username: name, display_name: name, role: spec.tier === 'ADMIN' ? 'admin' : 'viewer', must_change_password: false, access: resolveAccess(spec), ...extra });
}
const GD_TTVH = session(301, 'gd-ttvh', { tier: 'LEADER', position: 'GD_TTVH' });
const ADMIN = session(1, 'admin', { tier: 'ADMIN' });
const LD_BDTP = session(302, 'ld-bdtp', { tier: 'LEADER', position: 'LD_BDTP' });
const LD_TTVH = session(303, 'ld-ttvh', { tier: 'LEADER', position: 'LD_TTVH' });
const IT = session(304, 'it', { tier: 'LEADER', position: 'IT_BDTP' });
const CQ = session(201, 'cq', { tier: 'STAFF', position: 'CHUYEN_QUAN', bcvh: ['533140'] });
const GD_BCVH = session(202, 'gd-bcvh', { tier: 'STAFF', position: 'GD_BCVH', bcvh: ['533140'] });
const PLAIN = session(203, 'plain', { tier: 'STAFF' });
const LEADER_ASSIGNEE = session(204, 'leader-assignee', { tier: 'LEADER', position: 'LD_TTVH' });
const MUST_CHANGE = session(201, 'cq-pw', { tier: 'STAFF', position: 'CHUYEN_QUAN', bcvh: ['533140'] }, { must_change_password: true });

async function call(sessionId, method, url) {
    const response = await fetch(`${baseUrl}${url}`, { method, headers: sessionId ? { 'x-session-id': sessionId } : {} });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* html */ }
    return { status: response.status, body: json, text, headers: response.headers };
}

const NOT_FOUND = { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy' } };

test('positions: only the Giám đốc TTVH and the admin hold journal.manage; the Giám đốc TTVH outranks the TTVH leader but not the BĐTP leader', () => {
    const holders = Object.values(roles.POSITIONS).filter((p) => p.capabilities.includes(roles.CAPABILITIES.JOURNAL_MANAGE)).map((p) => p.code).sort();
    assert.deepEqual(holders, ['ADMIN', 'GD_TTVH']);
    assert.equal(roles.POSITIONS.GD_TTVH.tier, 'LEADER');
    assert.ok(roles.outranks('GD_TTVH', 'LD_TTVH') && roles.outranks('GD_TTVH', 'IT_BDTP'));
    assert.ok(roles.outranks('LD_BDTP', 'GD_TTVH'));
    assert.equal(roles.positionFromTitle('Giám đốc TTVH'), 'GD_TTVH');
    assert.equal(roles.positionFromTitle('Giám đốc BCVH'), 'GD_BCVH', 'the BCVH director stays a BCVH position');
    assert.equal(roles.isValidPositionForTier('STAFF', 'GD_TTVH'), false, 'a staff account can never hold it');
    assert.equal(roles.isValidPositionForTier('LEADER', 'GD_TTVH'), true);
    assert.equal(roles.resolvePosition('LEADER', null).code, 'LD_TTVH', 'an unset leader does not become the director');
    for (const [name, spec] of [['GD_TTVH', { tier: 'LEADER', position: 'GD_TTVH' }], ['ADMIN', { tier: 'ADMIN' }]]) {
        assert.ok(resolveAccess(spec).capabilities.includes('journal.manage'), name);
    }
    for (const spec of [{ tier: 'LEADER', position: 'LD_BDTP' }, { tier: 'LEADER', position: 'LD_TTVH' }, { tier: 'LEADER', position: 'IT_BDTP' }, { tier: 'LEADER' },
        { tier: 'STAFF', position: 'CHUYEN_QUAN' }, { tier: 'STAFF', position: 'GD_BCVH' }, { tier: 'STAFF' }, { tier: 'STAFF', position: 'GD_TTVH' }]) {
        assert.ok(!resolveAccess(spec).capabilities.includes('journal.manage'), JSON.stringify(spec));
    }
});

test('anonymous and password-change sessions get no data, only the auth error', async () => {
    assert.equal((await call(null, 'GET', `/days/${DAY}`)).status, 401);
    assert.equal((await call('nope', 'GET', '/my-tasks')).status, 401);
    const blocked = await call(MUST_CHANGE, 'GET', '/my-tasks');
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.error.code, 'PASSWORD_CHANGE_REQUIRED');
});

test('manager (Giám đốc TTVH and admin) reads the whole day, every row and the closing, draft spots included', async () => {
    for (const who of [GD_TTVH, ADMIN]) {
        const day = await call(who, 'GET', `/days/${DAY}`);
        assert.equal(day.status, 200);
        assert.equal(day.body.data.status, 'ASSIGNED');
        assert.equal(day.body.data.spots.length, 3);
        const one = day.body.data.spots.find((s) => s.id === ids.s1);
        assert.equal(one.actions.length, 3);
        assert.deepEqual(one.actions.find((a) => a.what === 'ROW-FOR-201').assigneeUserIds, [201]);
        assert.equal(one.closing.lesson, 'SECRET-LESSON');
        assert.equal((await call(who, 'GET', `/spots/${ids.s2}`)).status, 200, 'a draft spot is readable by the manager');
        assert.equal((await call(who, 'GET', '/days/2026-01-01')).body.data.spots.length, 0, 'a day nobody opened is an empty draft');
    }
});

test('a user without the capability gets the same 404 for a real day, a missing day, a bad date and an unknown path', async () => {
    for (const who of [LD_BDTP, LD_TTVH, IT, CQ, GD_BCVH, PLAIN]) {
        const real = await call(who, 'GET', `/days/${DAY}`);
        const missing = await call(who, 'GET', '/days/2031-02-03');
        const bad = await call(who, 'GET', '/days/not-a-date');
        const unknown = await call(who, 'GET', '/whatever');
        const write = await call(who, 'POST', `/days/${DAY}/assign`);
        for (const answer of [real, missing, bad, unknown, write]) {
            assert.equal(answer.status, 404);
            assert.deepEqual(answer.body, NOT_FOUND);
        }
        assert.equal(real.text, unknown.text, 'byte-identical to an unknown path');
    }
});

test('a user with nothing assigned: empty task list, and a real spot looks exactly like a missing one', async () => {
    for (const who of [PLAIN, LD_BDTP, LD_TTVH, IT]) {
        const mine = await call(who, 'GET', '/my-tasks');
        assert.equal(mine.status, 200);
        assert.deepEqual(mine.body.data, { tasks: [] });
        const real = await call(who, 'GET', `/spots/${ids.s1}`);
        const missing = await call(who, 'GET', '/spots/999999');
        const junk = await call(who, 'GET', '/spots/abc');
        assert.equal(real.status, 404);
        assert.equal(real.text, missing.text);
        assert.equal(real.text, junk.text);
    }
});

test('an assignee reads only their own finalized rows: no other rows, assignees, closing, draft or unstamped rows', async () => {
    const mine = await call(CQ, 'GET', '/my-tasks');
    assert.equal(mine.status, 200);
    assert.equal(mine.body.data.tasks.length, 1, 'only SPOT-ONE: the draft spot and the unstamped row of SPOT-THREE are hidden');
    const task = mine.body.data.tasks[0];
    assert.equal(task.spotId, ids.s1);
    assert.equal(task.title, 'SPOT-ONE');
    assert.equal(task.headline, 'headline one');
    assert.deepEqual(task.myRows.map((r) => r.what), ['ROW-FOR-201']);
    for (const leaked of ['ROW-FOR-202', 'ROW-FOR-NOBODY', 'SECRET-LESSON', 'ROW-IN-DRAFT', 'ROW-UNSTAMPED', 'SPOT-DRAFT', 'SPOT-THREE', 'assigneeUserIds']) {
        assert.ok(!mine.text.includes(leaked), `my-tasks must not contain ${leaked}`);
    }
    const spot = await call(CQ, 'GET', `/spots/${ids.s1}`);
    assert.equal(spot.status, 200);
    assert.deepEqual(spot.body.data.myRows.map((r) => r.what), ['ROW-FOR-201']);
    assert.equal(spot.body.data.actions, undefined);
    assert.equal(spot.body.data.closing, undefined);
    for (const leaked of ['ROW-FOR-202', 'ROW-FOR-NOBODY', 'SECRET-LESSON', 'assigneeUserIds', '"202"', ':202']) {
        assert.ok(!spot.text.includes(leaked), `spot must not contain ${leaked}`);
    }
    // the other spots: exactly like a missing id
    const missing = await call(CQ, 'GET', '/spots/999999');
    for (const hidden of [ids.s2, ids.s3]) {
        const answer = await call(CQ, 'GET', `/spots/${hidden}`);
        assert.equal(answer.status, 404);
        assert.equal(answer.text, missing.text);
    }
    assert.equal((await call(CQ, 'GET', `/days/${DAY}`)).status, 404, 'being an assignee never opens the day view');
});

test('two assignees of one spot, and a leader who is an assignee, each see only their own rows', async () => {
    const gd = await call(GD_BCVH, 'GET', '/my-tasks');
    assert.deepEqual(gd.body.data.tasks.map((t) => [t.spotId, t.myRows.map((r) => r.what)]), [[ids.s3, ['ROW-FOR-202-AND-204']], [ids.s1, ['ROW-FOR-202']]]);
    assert.ok(!gd.text.includes('ROW-FOR-201'));
    const leader = await call(LEADER_ASSIGNEE, 'GET', '/my-tasks');
    assert.deepEqual(leader.body.data.tasks.map((t) => t.myRows.map((r) => r.what)), [['ROW-FOR-202-AND-204']]);
    assert.ok(!leader.text.includes('ROW-FOR-202"') && !leader.text.includes('SPOT-ONE'));
    assert.equal((await call(LEADER_ASSIGNEE, 'GET', `/days/${DAY}`)).status, 404, 'a leader who is only an assignee is not a manager');
    assert.equal((await call(LEADER_ASSIGNEE, 'GET', `/spots/${ids.s1}`)).status, 404);
});

test('nothing is cacheable and no CORS-style detail leaks through headers', async () => {
    for (const [who, url] of [[GD_TTVH, `/days/${DAY}`], [CQ, '/my-tasks'], [PLAIN, `/days/${DAY}`], [PLAIN, '/spots/1'], [CQ, '/nowhere']]) {
        const answer = await call(who, 'GET', url);
        assert.equal(answer.headers.get('cache-control'), 'no-store', url);
        assert.equal(answer.headers.get('etag'), null, `${url} must not carry an ETag`);
    }
});
