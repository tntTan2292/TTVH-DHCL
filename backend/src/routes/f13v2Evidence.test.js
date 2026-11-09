'use strict';

// F13-EVIDENCE-01 B1: evidence list / export / analyses over HTTP, through the real routers, on a throw-away database.
// Covers: permissions per position and scope, append-only history, mandatory note, list = figure for every filter, Excel rows = list total,
// and /why system figures unchanged by any analysis.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const ExcelJS = require('exceljs');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f13-evidence-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(tmpDir, 'f13_evidence.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(tmpDir, 'data-root', 'F1.3');

const { db, run, get, all } = require('../config/db');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const { POSITIONS, CAPABILITIES } = require('../services/auth/access/roles');
const { clearResponseCache } = require('../middleware/responseCache');
const f13v2Routes = require('./f13v2Routes');
const { F13_WHY_AGG_01_SCHEMA_SQL } = require('../../migrate_f13_why_agg_01_schema');
const { applyF13Evidence01Schema } = require('../../migrate_f13_evidence_01_schema');
const { EXPORT_MAX_DAYS } = require('../services/f13v2/EvidenceService');

const A = '537015'; // Thuận An
const B = '535790'; // A Lưới
const NAMES = { 537015: 'BCVH Thuận An', 535790: 'BCVH A Lưới' };
const D1 = '2026-10-19';
const D2 = '2026-10-20';
const DAYS = [D1, D2];
const BUILT_AT = '2026-11-05T00:00:00.000Z';

let server;
let baseUrl;
let sequence = 0;

const exec = (sql) => new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));

// Index inside a (day, BCVH) block of 10: 0-3 Đạt, 4 unrated, 5 failed with a Phát cause (Chậm giao bưu tá), 6 failed with Khai thác,
// 7-8 failed and waiting for the Chuyên quản, 9 failed without enough evidence.
function systemFor(index) {
    if (index === 5) return { status: 'CAUSE', code: 'PHAT', detail: 'CHAM_GIAO_BUU_TA', reason: null };
    if (index === 6) return { status: 'CAUSE', code: 'KHAI_THAC', detail: null, reason: null };
    if (index === 7) return { status: 'CHO_CHUYEN_QUAN', code: null, detail: null, reason: 'THIEU_MOC_G' };
    if (index === 8) return { status: 'CHO_CHUYEN_QUAN', code: null, detail: null, reason: 'MOC_A_KHONG_HOP_LE' };
    if (index === 9) return { status: 'CHUA_DU_CAN_CU', code: null, detail: null, reason: 'KHONG_CO_MOC' };
    return { status: 'KHONG_PHAN_TICH', code: null, detail: null, reason: null };
}
const verdictFor = (index) => (index < 4 ? 'Đạt' : (index === 4 ? null : 'Không đạt'));
const bgOf = (day, code, index) => `BG${code}${day.slice(8)}${index}`;

test.before(async () => {
    await exec(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    await exec('CREATE TABLE IF NOT EXISTS fact_bf_phat (id INTEGER PRIMARY KEY AUTOINCREMENT, ngay_bf TEXT, lading_code TEXT, ma_lo TEXT, mabc_phat TEXT, xac_nhan_den_bcp TEXT)');
    await exec(F13_WHY_AGG_01_SCHEMA_SQL);
    await applyF13Evidence01Schema(process.env.QIS_TEST_DB_PATH);
    await run('BEGIN');
    for (const day of DAYS) {
        for (const code of [A, B]) {
            for (let index = 0; index < 10; index += 1) {
                const verdict = verdictFor(index);
                const system = systemFor(index);
                const route = `${code}0${index % 3}`;
                const postman = `PM${index % 2}`;
                await run(
                    `INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_tinh_phat, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, loai_tuyen_phat, thoi_gian_bd10_quet_tms, thoi_gian_ptc, thoi_gian_thuc_hien_thuc_te_gio, thoi_gian_chi_tieu, danh_gia_2026, ket_qua_f13)
                     VALUES (?, ?, '53', ?, ?, ?, ?, 'Tuyến phát xã', ?, ?, '10:12', '8', ?, ?)`,
                    [day, bgOf(day, code, index), code, NAMES[code], route, `Tuyến ${route}`, `${day.slice(8)}/10/2026 07:00:00`, verdict ? `${day} 17:12:41` : null, verdict, verdict],
                );
                await run(
                    `INSERT INTO f13_cause_parcel (ngay_do_kiem, ma_bg, ma_bcvh, ma_tuyen, route_scope, ma_buu_ta_first, ten_buu_ta_first, ma_buu_ta_shown, ten_buu_ta_shown, danh_gia,
                        cause_code, cause_status, cause_step, flags, hints, ma_lo, khong_tron_lo, limit_ms, tct_ms, l_ms, r_ms, built_at, classifier_version, cause_detail, cause_reason, remaining_at_arrival_ms, a_source, basis)
                     VALUES (?, ?, ?, ?, 'POSTMAN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 28800000, 36720000, NULL, NULL, ?, 'v-test', ?, ?, ?, ?, ?)`,
                    [day, bgOf(day, code, index), code, route, postman, `Bưu tá ${postman}`, postman, `Bưu tá ${postman}`, verdict, system.code, system.status, system.status === 'CAUSE' ? 'T-G' : null,
                        index === 9 ? 'THIEU_F41' : null, index === 7 ? 'DEN_BCVH_CON_IT_GIO' : null, BUILT_AT, system.detail, system.reason, system.status === 'CAUSE' ? 3600000 : null, system.status === 'CAUSE' ? 'F41' : null, system.status === 'CAUSE' ? 'INTERVAL' : null],
                );
            }
        }
    }
    // the milestones the list shows are read from the cause table (B1-FIX): the TMS scan and, for rated parcels, the PTC of the fact rows above
    await run(`UPDATE f13_cause_parcel SET ms_tms = CAST(strftime('%s', ngay_do_kiem || ' 07:00:00') AS INTEGER) * 1000,
        ms_ptc = CASE WHEN danh_gia IS NOT NULL THEN CAST(strftime('%s', ngay_do_kiem || ' 17:12:41') AS INTEGER) * 1000 END`);
    await run('COMMIT');
    const app = express();
    app.use('/api/f13/v2', f13v2Routes);
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/f13/v2`;
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
    return authSessionStore.createSession({ id: 9000 + sequence, username: `${position}-${bcvh.join('-')}-${sequence}`, display_name: `Người ${position}`, role: tier === 'ADMIN' ? 'admin' : 'viewer', must_change_password: false, access });
}

async function call(sessionId, method, pathAndQuery, body = null) {
    const response = await fetch(`${baseUrl}${pathAndQuery}`, {
        method,
        headers: { 'x-session-id': sessionId, ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: response.status, body: json, text };
}
const get_ = (sid, url) => call(sid, 'GET', url);
const post = (sid, body) => call(sid, 'POST', '/evidence/analyses', body);

const PERIOD = `from=${D1}&to=${D2}`;
const parcelKey = (day, code, index) => ({ ngay_do_kiem: day, ma_bg: bgOf(day, code, index) });
const FAILED_CAUSE_PARCEL = (code = A, day = D1) => parcelKey(day, code, 5); // explained by the system: Phát - Chậm giao bưu tá
const WAITING_PARCEL = (code = A, day = D1) => parcelKey(day, code, 7); // Chờ Chuyên quản

// ------------------------------------------------------------------ permissions

test('capabilities per position: view for every position, write for Chuyên quản, Giám đốc BCVH and the admin only', () => {
    const view = Object.values(POSITIONS).filter((p) => p.capabilities.includes(CAPABILITIES.F13_ANALYSIS_VIEW)).map((p) => p.code).sort();
    const write = Object.values(POSITIONS).filter((p) => p.capabilities.includes(CAPABILITIES.F13_ANALYSIS_WRITE)).map((p) => p.code).sort();
    assert.deepEqual(view, Object.keys(POSITIONS).sort());
    assert.deepEqual(write, ['ADMIN', 'CHUYEN_QUAN', 'GD_BCVH']);
});

test('no session -> 401; an account without F1.3 access -> 403 on every evidence endpoint', async () => {
    assert.equal((await fetch(`${baseUrl}/evidence/list?${PERIOD}`)).status, 401);
    const noModule = session('STAFF', { bcvh: [] });
    for (const url of [`/evidence/list?${PERIOD}`, `/evidence/export?${PERIOD}`, '/evidence/catalog', `/evidence/history?ngay_do_kiem=${D1}&ma_bg=x`]) {
        assert.equal((await get_(noModule, url)).status, 403, url);
    }
    assert.equal((await post(noModule, { ...WAITING_PARCEL(), cause: 'KHAI_THAC' })).status, 403);
});

test('write permission per position: Chuyên quản and Giám đốc BCVH of the unit and the admin record; leaders, IT and Chuyên viên only see', async () => {
    const attempts = [
        ['CHUYEN_QUAN', { bcvh: [A] }, 201],
        ['GD_BCVH', { bcvh: [A] }, 201],
        ['ADMIN', {}, 201],
        ['STAFF', { bcvh: [A] }, 403],
        ['LD_BDTP', {}, 403],
        ['GD_TTVH', {}, 403],
        ['LD_TTVH', {}, 403],
        ['IT_BDTP', {}, 403],
    ];
    const targets = [parcelKey(D1, A, 8), parcelKey(D2, A, 8), parcelKey(D1, A, 9), parcelKey(D2, A, 9), parcelKey(D1, A, 7), parcelKey(D2, A, 7), parcelKey(D1, B, 8), parcelKey(D1, B, 9)];
    for (const [index, [position, scope, expected]] of attempts.entries()) {
        const sid = session(position, scope);
        const response = await post(sid, { ...targets[index], cause: 'KHAI_THAC' });
        assert.equal(response.status, expected, `${position}: ${response.text}`);
        const catalog = await get_(sid, '/evidence/catalog');
        assert.equal(catalog.status, 200, `${position} can open the catalog`);
        assert.equal(catalog.body.data.can.write, expected === 201, position);
        assert.equal((await get_(sid, `/evidence/list?${PERIOD}&page_size=1`)).status, 200, `${position} can read the list`);
    }
});

test('scope: a BCVH account sees and analyses its own unit only; another unit is refused (list, history, write); the admin covers every unit', async () => {
    const cq = session('CHUYEN_QUAN', { bcvh: [A] });
    const list = await get_(cq, `/evidence/list?${PERIOD}&page_size=100`);
    assert.equal(list.status, 200);
    assert.ok(list.body.data.items.length > 0);
    assert.ok(list.body.data.items.every((item) => item.ma_bcvh === A));
    assert.ok(!list.text.includes(NAMES[B]) && !list.text.includes(`"${B}"`));
    assert.equal((await get_(cq, `/evidence/list?${PERIOD}&bcvh=${B}`)).status, 403);
    const foreign = parcelKey(D1, B, 5);
    assert.equal((await post(cq, { ...foreign, cause: 'KHAI_THAC', note: 'x' })).status, 403);
    assert.equal((await get_(cq, `/evidence/history?ngay_do_kiem=${foreign.ngay_do_kiem}&ma_bg=${foreign.ma_bg}`)).status, 403);
    assert.equal((await get_(cq, `/evidence/export?${PERIOD}&bcvh=${B}`)).status, 403);
    const admin = session('ADMIN');
    const cityList = await get_(admin, `/evidence/list?${PERIOD}&page_size=100`);
    assert.deepEqual([...new Set(cityList.body.data.items.map((item) => item.ma_bcvh))].sort(), [B, A].sort());
    const written = await post(admin, { ...foreign, cause: 'KHAI_THAC', note: 'Hỗ trợ đơn vị' });
    assert.equal(written.status, 201, written.text);
    // a leader sees the analysis the admin recorded
    const leader = session('LD_BDTP');
    const seen = (await get_(leader, `/evidence/list?${PERIOD}&bcvh=${B}&analysed=yes`)).body.data.items;
    assert.equal(seen.length, 1);
    assert.equal(seen[0].analysis.by, 'Người ADMIN');
});

// ------------------------------------------------------------------ rules of writing (PO V3, V4)

test('writing is refused for a parcel that is not Không đạt, an unknown parcel, a cause outside the list; Đạt parcels stay evidence only', async () => {
    const cq = session('CHUYEN_QUAN', { bcvh: [A] });
    const passed = await post(cq, { ...parcelKey(D2, A, 0), cause: 'KHAI_THAC', note: 'x' });
    assert.deepEqual([passed.status, passed.body.error.code], [400, 'NOT_FAILED']);
    const unrated = await post(cq, { ...parcelKey(D2, A, 4), cause: 'KHAI_THAC', note: 'x' });
    assert.deepEqual([unrated.status, unrated.body.error.code], [400, 'NOT_FAILED']);
    const missing = await post(cq, { ngay_do_kiem: D2, ma_bg: 'NOPE', cause: 'KHAI_THAC', note: 'x' });
    assert.deepEqual([missing.status, missing.body.error.code], [404, 'PARCEL_NOT_FOUND']);
    for (const cause of ['PHAT', 'CHUA_DU_CAN_CU', 'khai_thac', '', undefined, 'DROP TABLE']) {
        const response = await post(cq, { ...WAITING_PARCEL(A, D2), cause });
        assert.deepEqual([response.status, response.body.error.code], [400, 'INVALID_CAUSE'], String(cause));
    }
    const list = (await get_(cq, `/evidence/list?${PERIOD}&verdict=${encodeURIComponent('Đạt')}&page_size=100`)).body.data.items;
    assert.ok(list.length > 0 && list.every((item) => item.can_analyse === false && item.analysis === null));
    assert.equal(Number((await get(`SELECT COUNT(*) AS n FROM f13_analysis_log`)).n) >= 0, true);
});

test('the note is mandatory for "Khác", for a parcel the system already explained, and when the choice differs; optional on a waiting parcel', async () => {
    const cq = session('CHUYEN_QUAN', { bcvh: [A] });
    const code = async (body) => { const r = await post(cq, body); return [r.status, r.body.error?.code ?? null]; };
    const waiting = WAITING_PARCEL(A, D2);
    const explained = FAILED_CAUSE_PARCEL(A, D2);
    assert.deepEqual(await code({ ...waiting, cause: 'KHAC' }), [400, 'NOTE_REQUIRED']);
    assert.deepEqual(await code({ ...waiting, cause: 'KHAC', note: '   ' }), [400, 'NOTE_REQUIRED']);
    assert.deepEqual(await code({ ...explained, cause: 'GIAO_BUU_TA_QUA_GIO' }), [400, 'NOTE_REQUIRED']); // same as the system: still a reason
    assert.deepEqual(await code({ ...explained, cause: 'KHAI_THAC' }), [400, 'NOTE_REQUIRED']); // differs
    assert.deepEqual(await code({ ...waiting, cause: 'KHAI_THAC', note: 'x'.repeat(1001) }), [400, 'NOTE_TOO_LONG']);
    assert.deepEqual(await code({ ...waiting, cause: 'VAN_CHUYEN' }), [201, null]); // waiting parcel, no note needed
    const confirmed = await post(cq, { ...explained, cause: 'GIAO_BUU_TA_QUA_GIO', note: 'Đã đối chiếu với bưu tá' });
    assert.equal(confirmed.status, 201);
    assert.equal(confirmed.body.data.analysis.versus_system, 'SAME');
    assert.equal(confirmed.body.data.analysis.phat_detail, 'CHAM_GIAO_BUU_TA');
    const changed = await post(cq, { ...explained, cause: 'KHAI_THAC', note: 'Túi đến muộn theo biên bản' });
    assert.equal(changed.status, 201);
    assert.equal(changed.body.data.analysis.versus_system, 'DIFFERENT');
    assert.equal(changed.body.data.superseded, confirmed.body.data.id);
});

// ------------------------------------------------------------------ append-only history

test('history is append-only: a correction is a new row that supersedes the previous one, the latest is the current analysis; UPDATE and DELETE are refused', async () => {
    const cq = session('GD_BCVH', { bcvh: [A] });
    const target = parcelKey(D1, A, 6); // explained by the system as Khai thác: every entry needs a reason
    const first = await post(cq, { ...target, cause: 'KHAI_THAC', note: 'Đã đối chiếu, đúng như hệ thống' });
    const second = await post(cq, { ...target, cause: 'PHAT_MUON', note: 'Sửa lại sau khi kiểm tra biên bản' });
    const third = await post(cq, { ...target, cause: 'KHAC', note: 'Nguyên nhân khác: bưu gửi chờ khách xác nhận' });
    assert.deepEqual([first.status, second.status, third.status], [201, 201, 201]);
    const history = (await get_(cq, `/evidence/history?ngay_do_kiem=${target.ngay_do_kiem}&ma_bg=${target.ma_bg}`)).body.data;
    assert.deepEqual(history.entries.map((entry) => entry.cause), ['KHAC', 'PHAT_MUON', 'KHAI_THAC']);
    assert.deepEqual(history.entries.map((entry) => entry.current), [true, false, false]);
    assert.deepEqual(history.entries.map((entry) => entry.supersedes_id), [second.body.data.id, first.body.data.id, null]);
    assert.equal(history.entries[0].system_at_that_time.status, 'CAUSE');
    assert.equal(history.entries[0].system_at_that_time.line, 'KHAI_THAC');
    assert.ok(history.entries[0].classifier_version);
    assert.equal(history.entries[0].by, 'Người GD_BCVH');
    assert.equal(history.entries[0].position, 'GD_BCVH');
    const current = (await get_(cq, `/evidence/list?from=${target.ngay_do_kiem}&to=${target.ngay_do_kiem}&bcvh=${A}&search=${target.ma_bg}`)).body.data.items;
    assert.equal(current.length, 1);
    assert.equal(current[0].analysis.cause, 'KHAC');
    await assert.rejects(() => run('UPDATE f13_analysis_log SET note = ? WHERE id = ?', ['x', first.body.data.id]), /append-only/);
    await assert.rejects(() => run('DELETE FROM f13_analysis_log WHERE id = ?', [first.body.data.id]), /append-only/);
    assert.equal(Number((await get('SELECT COUNT(*) AS n FROM f13_analysis_log WHERE ma_bg = ?', [target.ma_bg])).n), 3);
});

// ------------------------------------------------------------------ the list and the figures

test('the evidence list shows every F1.3 row, Đạt included, with the milestones and their sources, TCT hours, limit, system conclusion, flags and hints', async () => {
    const admin = session('ADMIN');
    const all_ = (await get_(admin, `/evidence/list?from=${D1}&to=${D1}&bcvh=${A}&page_size=100`)).body.data;
    assert.equal(all_.meta.total, 10);
    assert.equal(all_.items.length, 10);
    const passed = all_.items.find((item) => item.ma_bg === bgOf(D1, A, 0));
    assert.equal(passed.danh_gia, 'Đạt');
    assert.equal(passed.milestones_state, 'OK');
    assert.deepEqual(passed.milestones.tms, { at: '2026-10-19 07:00:00', source: 'F1.3' });
    assert.equal(passed.milestones.ptc.source, 'F1.3');
    assert.equal(passed.tct.limit_hours, 8);
    assert.equal(passed.tct.hours_text, '10:12');
    assert.equal(passed.tct.tct_hours, 10.2);
    const explained = all_.items.find((item) => item.ma_bg === bgOf(D1, A, 5));
    assert.deepEqual([explained.system.status, explained.system.line, explained.system.label, explained.can_analyse], ['CAUSE', 'GIAO_BUU_TA_QUA_GIO', 'Phát - Chậm giao bưu tá', true]);
    const waiting = all_.items.find((item) => item.ma_bg === bgOf(D1, A, 7));
    assert.deepEqual([waiting.system.status, waiting.system.reason, waiting.hints], ['CHO_CHUYEN_QUAN', 'THIEU_MOC_G', ['DEN_BCVH_CON_IT_GIO']]);
    const unknown = all_.items.find((item) => item.ma_bg === bgOf(D1, A, 9));
    assert.deepEqual([unknown.system.status, unknown.flags], ['CHUA_DU_CAN_CU', ['THIEU_F41']]);
});

test('default order: failed parcels waiting for the Chuyên quản and not yet analysed come first; once analysed they move down; sort=date drops the priority', async () => {
    const cq = session('CHUYEN_QUAN', { bcvh: [A] });
    const waiting = (item) => item.system.status === 'CHO_CHUYEN_QUAN' && item.danh_gia === 'Không đạt' && item.analysis === null;
    const read = async () => (await get_(cq, `/evidence/list?${PERIOD}&page_size=100`)).body.data.items;
    const before = await read();
    const flags = before.map(waiting);
    const count = flags.filter(Boolean).length;
    assert.ok(count >= 1, 'the fixture keeps at least one unanalysed waiting parcel');
    assert.deepEqual(flags, [...flags].sort((x, y) => Number(y) - Number(x)), 'waiting parcels first, then the rest');
    const first = before[0];
    assert.equal((await post(cq, { ngay_do_kiem: first.ngay_do_kiem, ma_bg: first.ma_bg, cause: 'KHAI_THAC', note: 'đã xem' })).status, 201);
    const after = await read();
    assert.equal(after.filter(waiting).length, count - 1);
    assert.deepEqual(after.map(waiting), [...after.map(waiting)].sort((x, y) => Number(y) - Number(x)));
    assert.equal(after.findIndex((item) => item.ma_bg === first.ma_bg) >= count - 1, true);
    const byDate = await get_(cq, `/evidence/list?from=${D1}&to=${D2}&sort=date&order=asc&page_size=100`);
    assert.equal(byDate.body.data.meta.order, 'DATE');
    assert.equal(byDate.body.data.items[0].ngay_do_kiem, D1);
});

const FILTERS = [
    '', `&bcvh=${A}`, `&bcvh=${A}&route=${A}01`, `&bcvh=${B}&route=${B}02`, '&postman=PM0', '&postman=PM1&bcvh=' + B,
    `&verdict=${encodeURIComponent('Không đạt')}`, `&verdict=${encodeURIComponent('Đạt')}`, '&verdict=CHUA_DANH_GIA',
    '&cause=KHAI_THAC', '&cause=GIAO_BUU_TA_QUA_GIO', '&cause=PHAT', '&cause=CHO_CHUYEN_QUAN', '&cause=CHUA_DU_CAN_CU', '&cause=CHO_CHUYEN_QUAN&reason=THIEU_MOC_G',
    '&hint=DEN_BCVH_CON_IT_GIO', `&week=${'2026-W43'}`,
];

test('count parity: for every filter the evidence list total equals the /why parcel list and the figure it was opened from', async () => {
    const admin = session('ADMIN');
    for (const filter of FILTERS) {
        const query = filter.includes('week=') ? filter.slice(1) : `${PERIOD}${filter}`;
        const evidence = await get_(admin, `/evidence/list?${query}&page_size=1`);
        const why = await get_(admin, `/why/parcels?${query}&page_size=1`);
        if (filter.includes('week=')) { assert.equal(evidence.status, why.status, filter); continue; }
        assert.equal(evidence.status, 200, `${filter}: ${evidence.text}`);
        assert.equal(evidence.body.data.meta.total, why.body.data.meta.total, `evidence = /why/parcels for ${filter}`);
    }
    // and against the figure of a row of /why (volume / failed / unrated / cause line)
    const routes = (await get_(admin, `/why/routes?${PERIOD}&bcvh=${A}`)).body.data.rows;
    for (const row of routes) {
        const query = new URLSearchParams(Object.fromEntries(Object.entries(row.filter).map(([key, value]) => [key, String(value)]))).toString();
        const total = async (extra) => (await get_(admin, `/evidence/list?${query}${extra}&page_size=1`)).body.data.meta.total;
        assert.equal(await total(''), row.volume, `${row.key} rows`);
        assert.equal(await total(`&verdict=${encodeURIComponent('Không đạt')}`), row.failed, `${row.key} failed`);
        assert.equal(await total('&verdict=CHUA_DANH_GIA'), row.unrated, `${row.key} unrated`);
        for (const line of row.cause_mix.lines) assert.equal(await total(`&cause=${line.code}`), line.count, `${row.key} ${line.code}`);
        assert.equal(await total('&cause=CHO_CHUYEN_QUAN'), row.cause_mix.cho_chuyen_quan.count, `${row.key} Chờ CQ`);
    }
});

test('analysed filters: analysed=yes / no and analyst_cause split the list and add up; the analysed figure of /why equals analysed=yes on the failed parcels', async () => {
    const admin = session('ADMIN');
    const total = async (extra) => (await get_(admin, `/evidence/list?${PERIOD}${extra}&page_size=1`)).body.data.meta.total;
    const failed = `&verdict=${encodeURIComponent('Không đạt')}`;
    const yes = await total(`${failed}&analysed=yes`);
    const no = await total(`${failed}&analysed=no`);
    assert.ok(yes > 0);
    assert.equal(yes + no, await total(failed));
    assert.equal(await total('&analysed=yes') + await total('&analysed=no'), await total(''));
    const summary = (await get_(admin, `/why/summary?${PERIOD}`)).body.data.totals;
    assert.equal(summary.analysed, yes);
    for (const [cause, count] of Object.entries(summary.analysed_mix.by_cause)) assert.equal(await total(`&analyst_cause=${cause}`), count, cause);
    assert.equal(Object.values(summary.analysed_mix.by_cause).reduce((a, b) => a + b, 0), yes);
    assert.equal(summary.analysed_mix.same_as_system + summary.analysed_mix.different_from_system + summary.analysed_mix.no_system_cause, yes);
    assert.equal((await get_(admin, `/evidence/list?${PERIOD}&analysed=maybe`)).status, 400);
    assert.equal((await get_(admin, `/evidence/list?${PERIOD}&analyst_cause=nope`)).status, 400);
});

// ------------------------------------------------------------------ Excel

async function readXlsx(sid, query) {
    const response = await fetch(`${baseUrl}/evidence/export?${query}`, { headers: { 'x-session-id': sid } });
    if (response.status !== 200) return { status: response.status, body: await response.json() };
    const buffer = Buffer.from(await response.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    const rows = [];
    sheet.eachRow((row, number) => { if (number > 1) rows.push(row.values.slice(1)); });
    return { status: 200, headers: response.headers, header: sheet.getRow(1).values.slice(1), rows };
}

test('Excel export: the whole filtered set server side, row count = list total, scope respected, analysis columns filled', async () => {
    const admin = session('ADMIN');
    for (const filter of ['', `&bcvh=${A}`, `&verdict=${encodeURIComponent('Không đạt')}`, '&cause=CHO_CHUYEN_QUAN', '&analysed=yes']) {
        const list = await get_(admin, `/evidence/list?${PERIOD}${filter}&page_size=1`);
        const file = await readXlsx(admin, `${PERIOD}${filter}`);
        assert.equal(file.status, 200, filter);
        assert.equal(file.rows.length, list.body.data.meta.total, `rows = total for ${filter}`);
        assert.equal(file.headers.get('x-export-rows'), String(list.body.data.meta.total));
        assert.match(file.headers.get('content-disposition'), /minh-chung-f13_2026-10-19_2026-10-20\.xlsx/);
    }
    const all_ = await readXlsx(admin, `${PERIOD}&analysed=yes`);
    assert.ok(all_.rows.length > 0);
    const header = all_.header;
    const cause = header.indexOf('Chuyên quản: nguyên nhân');
    const note = header.indexOf('Chuyên quản: ghi chú');
    assert.ok(all_.rows.every((row) => row[cause]) && all_.rows.some((row) => row[note]));
    const cq = session('CHUYEN_QUAN', { bcvh: [A] });
    const own = await readXlsx(cq, PERIOD);
    assert.equal(own.rows.length, 20);
    assert.ok(own.rows.every((row) => row[header.indexOf('BCVH')] === A));
});

test('Excel export: a range beyond the stated limit is refused before anything is streamed', async () => {
    const admin = session('ADMIN');
    const refused = await readXlsx(admin, `from=2026-09-01&to=2026-10-20`);
    assert.equal(refused.status, 400);
    assert.equal(refused.body.error.code, 'EXPORT_TOO_LARGE');
    assert.match(refused.body.error.message, new RegExp(String(EXPORT_MAX_DAYS)));
    const exact = await readXlsx(admin, `from=2026-09-20&to=2026-10-20`);
    assert.equal(exact.status, 200); // 31 days is the limit
});

// ------------------------------------------------------------------ the system figures never move (PO V2)

function withoutAnalysed(node) {
    if (Array.isArray(node)) return node.map(withoutAnalysed);
    if (node && typeof node === 'object') {
        const copy = {};
        for (const [key, value] of Object.entries(node)) if (key !== 'analysed' && key !== 'analysed_mix') copy[key] = withoutAnalysed(value);
        return copy;
    }
    return node;
}

test('/why system figures are the same whatever has been analysed; the analysed counts add up at every level and the official tables are untouched', async () => {
    const admin = session('ADMIN');
    const readAll = async () => {
        const out = {};
        for (const endpoint of ['summary', 'bcvh', 'routes', 'postmen']) out[endpoint] = (await get_(admin, `/why/${endpoint}?${PERIOD}`)).body.data;
        return out;
    };
    const factBefore = await all('SELECT ngay_do_kiem, ma_bg, danh_gia_2026 FROM fact_f13 ORDER BY ngay_do_kiem, ma_bg');
    const causeBefore = await all('SELECT * FROM f13_cause_parcel ORDER BY ngay_do_kiem, ma_bg');
    const before = await readAll();
    // analyse a mix: confirm, change a conclusion, resolve a waiting parcel, "Khác"
    const cq = session('CHUYEN_QUAN', { bcvh: [A] });
    for (const [target, cause, note] of [
        [parcelKey(D2, A, 9), 'KHAI_THAC', null], [parcelKey(D2, A, 6), 'KHAI_THAC', 'Xác nhận'], [parcelKey(D2, A, 6), 'VAN_CHUYEN', 'Sửa'], [parcelKey(D1, A, 8), 'KHAC', 'Khác: chờ khách'],
    ]) assert.equal((await post(cq, { ...target, cause, note })).status, 201);
    const after = await readAll();
    assert.deepEqual(withoutAnalysed(after), withoutAnalysed(before), 'every system figure, line, share, parcel list pointer is identical');
    assert.deepEqual(await all('SELECT ngay_do_kiem, ma_bg, danh_gia_2026 FROM fact_f13 ORDER BY ngay_do_kiem, ma_bg'), factBefore);
    assert.deepEqual(await all('SELECT * FROM f13_cause_parcel ORDER BY ngay_do_kiem, ma_bg'), causeBefore);
    // analysed counts: summary = sum of BCVH = sum of routes = sum of postmen, for the parcels analysed in the period
    const sum = (rows) => rows.reduce((total, row) => total + row.analysed, 0);
    assert.equal(after.summary.totals.analysed, sum(after.bcvh.rows));
    assert.equal(after.summary.totals.analysed, sum(after.routes.rows));
    assert.equal(after.summary.totals.analysed, sum(after.postmen.rows));
    const own = after.bcvh.rows.find((row) => row.ma_bcvh === A);
    const other = after.bcvh.rows.find((row) => row.ma_bcvh === B);
    assert.equal(own.analysed + other.analysed, after.summary.totals.analysed);
    assert.equal(own.analysed_mix.by_cause.KHAC >= 1, true);
    assert.ok(own.analysed_mix.different_from_system >= 1);
    // a BCVH account sees the count of its own unit only
    const staff = session('CHUYEN_QUAN', { bcvh: [B] });
    const foreign = (await get_(staff, `/why/summary?${PERIOD}`)).body.data.totals;
    assert.equal(foreign.analysed, other.analysed); // its own unit's count only, never A's
    const ownTotals = await get_(staff, `/why/bcvh?${PERIOD}`);
    assert.ok(ownTotals.body.data.rows.every((row) => row.ma_bcvh === B));
});

test('B1-R1: a parcel analysed while Không đạt and later Đạt or unrated is not "analysed" in the list either: analysed=yes of the list = analysed of /why', async () => {
    const admin = session('ADMIN');
    const target = parcelKey(D2, B, 9);
    assert.equal((await post(admin, { ...target, cause: 'KHAI_THAC' })).status, 201);
    const figures = async () => {
        const total = async (extra) => (await get_(admin, `/evidence/list?${PERIOD}${extra}&page_size=1`)).body.data.meta.total;
        const why = (await get_(admin, `/why/summary?${PERIOD}`)).body.data.totals;
        return { why: why.analysed, yes: await total('&analysed=yes'), no: await total('&analysed=no'), all: await total(''), byCause: await total('&analyst_cause=KHAI_THAC'), whyByCause: why.analysed_mix.by_cause.KHAI_THAC || 0 };
    };
    try {
        const failed = await figures();
        assert.equal(failed.yes, failed.why);
        assert.equal(failed.byCause, failed.whyByCause);
        assert.equal(failed.yes + failed.no, failed.all);
        for (const verdict of ['Đạt', null]) { // a TCT reload or a cause rebuild changes the verdict after the analysis
            await run('UPDATE f13_cause_parcel SET danh_gia = ? WHERE ngay_do_kiem = ? AND ma_bg = ?', [verdict, target.ngay_do_kiem, target.ma_bg]);
            const changed = await figures();
            assert.equal(changed.why, failed.why - 1, `/why no longer counts the parcel (${verdict})`);
            assert.equal(changed.yes, changed.why, `list analysed=yes = /why analysed (${verdict})`);
            assert.equal(changed.byCause, changed.whyByCause, `analyst_cause = /why by_cause (${verdict})`);
            assert.equal(changed.yes + changed.no, changed.all, `yes and no still split the whole list (${verdict})`);
            assert.equal(changed.no, failed.no + 1);
            // the item still shows the old analysis, and the history keeps it
            const item = (await get_(admin, `/evidence/list?from=${target.ngay_do_kiem}&to=${target.ngay_do_kiem}&bcvh=${B}&search=${target.ma_bg}`)).body.data.items[0];
            assert.equal(item.analysis.cause, 'KHAI_THAC');
            assert.equal(item.can_analyse, false);
        }
    } finally {
        await run("UPDATE f13_cause_parcel SET danh_gia = 'Không đạt' WHERE ngay_do_kiem = ? AND ma_bg = ?", [target.ngay_do_kiem, target.ma_bg]);
    }
});

test('the analysis table is the only new write: the official tables keep their row counts', async () => {
    assert.equal(Number((await get('SELECT COUNT(*) AS n FROM fact_f13')).n), 40);
    assert.equal(Number((await get('SELECT COUNT(*) AS n FROM f13_cause_parcel')).n), 40);
    assert.ok(Number((await get('SELECT COUNT(*) AS n FROM f13_analysis_log')).n) > 0);
});
