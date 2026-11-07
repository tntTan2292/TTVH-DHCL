'use strict';

// F13-RULE-PROPOSAL-01 B1: rule proposals over HTTP through the real routers, on a throw-away database.
// Covers: grouping on a seeded log (latest analysis per parcel only; a choice equal to the system is not a proposal), P2 fields, decision rules
// (note mandatory, APPLIED needs a ticket and an approval, append-only history and triggers), capability 403 for non-admin positions, empty log.
// Run: node --experimental-sqlite --test src/routes/f13v2RuleProposal.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f13-rule-proposal-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(tmpDir, 'f13_rule_proposal.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(tmpDir, 'data-root', 'F1.3');

const { db, run, all } = require('../config/db');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const { POSITIONS, CAPABILITIES } = require('../services/auth/access/roles');
const { clearResponseCache } = require('../middleware/responseCache');
const f13v2Routes = require('./f13v2Routes');
const { F13_WHY_AGG_01_SCHEMA_SQL } = require('../../migrate_f13_why_agg_01_schema');
const { applyF13Evidence01Schema } = require('../../migrate_f13_evidence_01_schema');
const { applyF13RuleProposal01Schema } = require('../../migrate_f13_rule_proposal_01_schema');
const { buildKey } = require('../services/f13v2/RuleProposalService');

const A = '537015';
const B = '535790';
const D1 = '2026-10-19';
const D2 = '2026-10-20';
const BUILT_AT = '2026-11-05T00:00:00.000Z';

const WAITING = { status: 'CHO_CHUYEN_QUAN', code: null, detail: null, reason: 'THIEU_MOC_G', line: null };
const PHAT = { status: 'CAUSE', code: 'PHAT', detail: 'CHAM_GIAO_BUU_TA', reason: null, line: 'GIAO_BUU_TA_QUA_GIO' };
const KT = { status: 'CAUSE', code: 'KHAI_THAC', detail: null, reason: null, line: 'KHAI_THAC' };

const KEY_WAITING_KT = buildKey({ status: 'CHO_CHUYEN_QUAN', reason: 'THIEU_MOC_G', cause: 'KHAI_THAC' });
const KEY_PHAT_VC = buildKey({ status: 'CAUSE', code: 'PHAT', detail: 'CHAM_GIAO_BUU_TA', cause: 'VAN_CHUYEN' });

let server;
let baseUrl;
let sequence = 0;

const exec = (sql) => new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));

async function seedParcel(day, bg, bcvh, now) {
    await run(
        `INSERT INTO f13_cause_parcel (ngay_do_kiem, ma_bg, ma_bcvh, ma_tuyen, route_scope, danh_gia, cause_code, cause_status, cause_detail, cause_reason, built_at, classifier_version)
         VALUES (?, ?, ?, 'T1', 'POSTMAN', 'Không đạt', ?, ?, ?, ?, ?, 'v-test')`,
        [day, bg, bcvh, now.code, now.status, now.detail, now.reason, BUILT_AT],
    );
}

async function analyse(day, bg, bcvh, cause, phat, note, system, actor, at) {
    await run(
        `INSERT INTO f13_analysis_log (ngay_do_kiem, ma_bg, ma_bcvh, cause_code, phat_detail, note, system_line, system_cause_code, system_cause_detail, system_cause_status,
            system_cause_reason, classifier_version, actor_id, actor_name, actor_position, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'v-test', 1, ?, 'CHUYEN_QUAN', ?)`,
        [day, bg, bcvh, cause, phat, note, system.line, system.code, system.detail, system.status, system.reason, actor, at],
    );
}

test.before(async () => {
    await exec(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    await exec(F13_WHY_AGG_01_SCHEMA_SQL);
    await applyF13Evidence01Schema(process.env.QIS_TEST_DB_PATH);
    await applyF13RuleProposal01Schema(process.env.QIS_TEST_DB_PATH);
    const app = express();
    app.use('/api/f13/v2', f13v2Routes);
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/f13/v2/rule-proposals`;
});

test.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

test.beforeEach(() => clearResponseCache());

function session(position, { bcvh = [] } = {}) {
    const tier = POSITIONS[position].tier;
    sequence += 1;
    const access = resolveAccess({ tier, bcvh, indicators: [], position });
    return authSessionStore.createSession({ id: 7000 + sequence, username: `${position}-${sequence}`, display_name: `Người ${position}`, role: tier === 'ADMIN' ? 'admin' : 'viewer', must_change_password: false, access });
}

async function call(sessionId, method, url, body = null) {
    const response = await fetch(`${baseUrl}${url}`, {
        method,
        headers: { 'x-session-id': sessionId, ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: response.status, body: json };
}
const enc = (key) => `/${encodeURIComponent(key)}`;

test('capabilities: f13.rule.view and f13.rule.decide are held by the admin position only', () => {
    for (const capability of [CAPABILITIES.F13_RULE_VIEW, CAPABILITIES.F13_RULE_DECIDE]) {
        assert.deepEqual(Object.values(POSITIONS).filter((p) => p.capabilities.includes(capability)).map((p) => p.code), ['ADMIN']);
    }
    assert.equal(CAPABILITIES.F13_RULE_VIEW, 'f13.rule.view');
    assert.equal(CAPABILITIES.F13_RULE_DECIDE, 'f13.rule.decide');
});

test('empty log: the list is empty with zero counts (admin), 401 without a session', async () => {
    assert.equal((await fetch(baseUrl)).status, 401);
    const admin = session('ADMIN');
    const result = await call(admin, 'GET', '');
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.data.items, []);
    assert.deepEqual(result.body.data.meta, { total: 0, counts: { PENDING: 0, APPROVED: 0, REJECTED: 0, APPLIED: 0 } });
});

test('non-admin positions get 403 on every endpoint (Chuyên quản, Giám đốc BCVH, leaders, staff)', async () => {
    for (const [position, bcvh] of [['CHUYEN_QUAN', [A]], ['GD_BCVH', [A]], ['LD_BDTP', []], ['GD_TTVH', []], ['STAFF', [A]]]) {
        const s = session(position, { bcvh });
        const id = s;
        assert.equal((await call(id, 'GET', '')).status, 403, `${position} list`);
        assert.equal((await call(id, 'GET', enc(KEY_WAITING_KT))).status, 403, `${position} detail`);
        assert.equal((await call(id, 'POST', `${enc(KEY_WAITING_KT)}/decisions`, { decision: 'APPROVE', note: 'x' })).status, 403, `${position} decide`);
    }
});

test.describe('on a seeded log', () => {
    let admin;
    test.before(async () => {
        admin = session('ADMIN');
        // group 1: waiting for the Chuyên quản, chosen Khai thác: 3 parcels, 2 BCVH, 2 analysts
        await seedParcel(D1, 'P1', A, { ...WAITING });
        await seedParcel(D1, 'P2', B, { ...WAITING });
        await seedParcel(D2, 'P3', A, { ...WAITING });
        await analyse(D1, 'P1', A, 'KHAC', null, 'lần đầu', WAITING, 'An', '2026-11-06T01:00:00Z'); // superseded by the next row: not counted as KHAC
        await analyse(D1, 'P1', A, 'KHAI_THAC', null, 'tải trễ ở khai thác', WAITING, 'An', '2026-11-06T02:00:00Z');
        await analyse(D1, 'P2', B, 'KHAI_THAC', null, 'xe đến muộn', WAITING, 'Bình', '2026-11-06T03:00:00Z');
        await analyse(D2, 'P3', A, 'KHAI_THAC', null, 'cùng lý do', WAITING, 'An', '2026-11-07T03:00:00Z');
        // group 2: the system said Phát - Chậm giao bưu tá, the analyst chose Vận chuyển; a rebuild has since changed the system conclusion
        await seedParcel(D1, 'P4', A, { ...KT });
        await analyse(D1, 'P4', A, 'VAN_CHUYEN', null, 'xe hỏng', PHAT, 'An', '2026-11-06T04:00:00Z');
        // equal to the system: not a proposal
        await seedParcel(D1, 'P5', A, { ...KT });
        await analyse(D1, 'P5', A, 'KHAI_THAC', null, 'đồng ý với hệ thống', KT, 'An', '2026-11-06T05:00:00Z');
    });

    test('grouping: latest analysis per parcel only, equal-to-system excluded, P2 fields', async () => {
        const result = await call(admin, 'GET', '');
        assert.equal(result.status, 200);
        const { items, meta } = result.body.data;
        assert.deepEqual(items.map((i) => i.key), [KEY_WAITING_KT, KEY_PHAT_VC]); // biggest first; no KHAC group, no P5 group
        const [g1, g2] = items;
        assert.equal(g1.parcels, 3);
        assert.equal(g1.bcvh, 2);
        assert.equal(g1.analysts, 2);
        assert.equal(g1.first_date, D1);
        assert.equal(g1.last_date, D2);
        assert.equal(g1.still_system_conclusion, 3);
        assert.equal(g1.status, 'PENDING');
        assert.deepEqual(g1.chosen, { cause: 'KHAI_THAC', phat_detail: null });
        assert.equal(g2.parcels, 1);
        assert.equal(g2.still_system_conclusion, 0, 'the cause table now says Khai thác, not Chậm giao bưu tá');
        assert.deepEqual(meta, { total: 2, counts: { PENDING: 2, APPROVED: 0, REJECTED: 0, APPLIED: 0 } });
        assert.equal((await call(admin, 'GET', '?status=APPROVED')).body.data.items.length, 0);
        assert.equal((await call(admin, 'GET', '?status=NOPE')).status, 400);
    });

    test('detail: samples with the analyst note, latest note per parcel, 404 and 400 on unknown keys', async () => {
        const detail = (await call(admin, 'GET', enc(KEY_WAITING_KT))).body.data;
        assert.equal(detail.samples.length, 3);
        assert.deepEqual(detail.samples.map((s) => s.ma_bg).sort(), ['P1', 'P2', 'P3']);
        assert.equal(detail.samples.find((s) => s.ma_bg === 'P1').note, 'tải trễ ở khai thác');
        assert.deepEqual(detail.history, []);
        assert.equal((await call(admin, 'GET', enc(buildKey({ status: 'CAUSE', code: 'X', cause: 'KHAC' })))).status, 404);
        assert.equal((await call(admin, 'GET', '/not-a-key')).status, 400);
    });

    test('decision rules: note mandatory, APPLIED needs a ticket and an approval, invalid decision refused', async () => {
        const url = `${enc(KEY_PHAT_VC)}/decisions`;
        assert.equal((await call(admin, 'POST', url, { decision: 'APPROVE' })).status, 400);
        assert.equal((await call(admin, 'POST', url, { decision: 'REJECT', note: '   ' })).body.error.code, 'NOTE_REQUIRED');
        assert.equal((await call(admin, 'POST', url, { decision: 'MAYBE', note: 'x' })).body.error.code, 'INVALID_DECISION');
        assert.equal((await call(admin, 'POST', url, { decision: 'APPLIED', note: 'x' })).body.error.code, 'TICKET_REQUIRED');
        assert.equal((await call(admin, 'POST', url, { decision: 'APPLIED', ticket_id: 'F13-X' })).body.error.code, 'NOT_APPROVED');
        assert.equal((await call(admin, 'POST', `${enc('CAUSE|NOPE|~>KHAC|~')}/decisions`, { decision: 'APPROVE', note: 'x' })).status, 404);
        assert.equal((await all('SELECT * FROM f13_rule_proposal_decision WHERE proposal_key = ?', [KEY_PHAT_VC])).length, 0, 'nothing written by refused calls');
    });

    test('decisions are append-only: a new decision supersedes the previous, snapshot stored, approved text ready, APPLIED marks the ticket', async () => {
        const url = `${enc(KEY_WAITING_KT)}/decisions`;
        const first = await call(admin, 'POST', url, { decision: 'REJECT', note: 'chưa đủ mẫu' });
        assert.equal(first.status, 201);
        assert.equal(first.body.data.proposal.status, 'REJECTED');
        assert.equal(first.body.data.superseded, null);
        const second = await call(admin, 'POST', url, { decision: 'APPROVE', note: 'đủ mẫu, duyệt' });
        assert.equal(second.status, 201);
        assert.equal(second.body.data.superseded, first.body.data.id);
        const approved = second.body.data.proposal;
        assert.equal(approved.status, 'APPROVED');
        assert.deepEqual(approved.decision.snapshot, { parcels: 3, bcvh: 2, analysts: 2, first_date: D1, last_date: D2, still_system_conclusion: 3 });
        assert.match(approved.ready_text, /đủ mẫu, duyệt/);
        assert.equal(approved.history.length, 2);
        const applied = await call(admin, 'POST', url, { decision: 'APPLIED', ticket_id: 'F13-WHY-DATA-04' });
        assert.equal(applied.status, 201);
        assert.equal(applied.body.data.proposal.status, 'APPLIED');
        assert.equal(applied.body.data.proposal.decision.ticket_id, 'F13-WHY-DATA-04');
        assert.equal(applied.body.data.proposal.ready_text, undefined);
        const list = (await call(admin, 'GET', '')).body.data;
        assert.deepEqual(list.meta.counts, { PENDING: 1, APPROVED: 0, REJECTED: 0, APPLIED: 1 });
        assert.equal((await call(admin, 'GET', '?status=APPLIED')).body.data.items[0].key, KEY_WAITING_KT);
        assert.equal((await all('SELECT id FROM f13_rule_proposal_decision WHERE proposal_key = ?', [KEY_WAITING_KT])).length, 3);
    });

    test('the table refuses UPDATE and DELETE; the analysis log is not written by any call', async () => {
        await assert.rejects(run("UPDATE f13_rule_proposal_decision SET note = 'x'"), /append-only/);
        await assert.rejects(run('DELETE FROM f13_rule_proposal_decision'), /append-only/);
        assert.equal((await all('SELECT id FROM f13_analysis_log')).length, 6);
    });
});
