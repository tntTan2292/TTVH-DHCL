'use strict';

// F13-PARCEL-CARD-01 B2 (C5): handover before arrival (ms_gbt < ms_arrive), computed at read time from f13_cause_parcel.
// Over HTTP, through the real routers.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f13-early-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(tmpDir, 'f13_early.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(tmpDir, 'data-root', 'F1.3');

const { db, run } = require('../config/db');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const { POSITIONS } = require('../services/auth/access/roles');
const { clearResponseCache } = require('../middleware/responseCache');
const f13v2Routes = require('./f13v2Routes');
const { F13_WHY_AGG_01_SCHEMA_SQL } = require('../../migrate_f13_why_agg_01_schema');
const { applyF13Evidence01Schema } = require('../../migrate_f13_evidence_01_schema');

const A = '535790';
const B = '536250';
const MIN = 60000;
const HOUR = 3600000;
const MONTH = '2026-10';
const DAYS = ['2026-10-10', '2026-10-11'];

let server;
let baseUrl;
let sequence = 0;
const exec = (sql) => new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));
const all = (query, params = []) => new Promise((resolve, reject) => db.all(query, params, (e, rows) => (e ? reject(e) : resolve(rows))));
const median = (values) => { const s = [...values].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// per (day, unit, postman): 10 parcels. Index 0..3 are handed (index+1)*10 min BEFORE the arrival scan (leg Den-Giao null, as the build stores it);
// index 4 has no handover; index 5..9 are handed (index-4) hours after the arrival.
function parcel(day, index) {
    const arrive = Date.parse(`${day}T00:00:00Z`) + 11 * HOUR;
    if (index < 4) return { arrive, gbt: arrive - (index + 1) * 10 * MIN, leg: null };
    if (index === 4) return { arrive, gbt: null, leg: null };
    return { arrive, gbt: arrive + (index - 4) * HOUR, leg: (index - 4) * HOUR };
}

test.before(async () => {
    await exec(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    await exec('CREATE TABLE IF NOT EXISTS fact_bf_phat (id INTEGER PRIMARY KEY AUTOINCREMENT, ngay_bf TEXT, lading_code TEXT, ma_lo TEXT, mabc_phat TEXT, xac_nhan_den_bcp TEXT)');
    await exec(F13_WHY_AGG_01_SCHEMA_SQL);
    await applyF13Evidence01Schema(process.env.QIS_TEST_DB_PATH);
    await run('BEGIN');
    for (const day of DAYS) {
        for (const code of [A, B]) {
            for (const pm of ['PM0', 'PM1']) {
                for (let index = 0; index < 10; index += 1) {
                    // unit B has no early parcel on the second day, so the counts differ by day and unit
                    const p = parcel(day, code === B && day === DAYS[1] && index < 4 ? 6 : index);
                    await run(
                        `INSERT INTO f13_cause_parcel (ngay_do_kiem, ma_bg, ma_bcvh, ma_tuyen, route_scope, ma_buu_ta_first, ten_buu_ta_first, ma_buu_ta_shown, ten_buu_ta_shown, danh_gia,
                            cause_status, khong_tron_lo, limit_ms, tct_ms, built_at, classifier_version, ms_arrive, ms_gbt, ms_arrive_source, leg_arrive_gbt_ms)
                         VALUES (?, ?, ?, ?, 'POSTMAN', ?, ?, ?, ?, 'Đạt', 'KHONG_PHAN_TICH', 0, 28800000, 3600000, '2026-11-05T00:00:00.000Z', 'v-test', ?, ?, 'F41', ?)`,
                        [day, `BG${code}${day.slice(8)}${pm}${index}`, code, `${code}R1`, pm, `Bưu tá ${pm}`, pm, `Bưu tá ${pm}`, p.arrive, p.gbt, p.leg],
                    );
                }
            }
        }
    }
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

function session() {
    sequence += 1;
    const tier = POSITIONS.ADMIN.tier;
    const access = resolveAccess({ tier, bcvh: [], indicators: [], position: 'ADMIN' });
    return authSessionStore.createSession({ id: 8000 + sequence, username: `admin-${sequence}`, display_name: 'Admin', role: 'admin', must_change_password: false, access });
}

async function get_(sid, pathAndQuery) {
    const response = await fetch(`${baseUrl}${pathAndQuery}`, { headers: { 'x-session-id': sid } });
    const text = await response.text();
    return { status: response.status, body: JSON.parse(text), text };
}

test('/journey/routes: gbt_before_arrive and arrive_gbt_counted per row and per BCVH equal a direct SQL count', async () => {
    const sid = session();
    const res = await get_(sid, `/journey/routes?month=${MONTH}`);
    assert.equal(res.status, 200, res.text);
    const { routes, meta } = res.body.data;
    assert.equal(routes.length, 4); // 2 units x 2 postmen
    for (const row of routes) {
        const [direct] = await all(
            `SELECT SUM(ms_gbt < ms_arrive) AS early, SUM(leg_arrive_gbt_ms IS NOT NULL) AS counted, COUNT(*) AS n
             FROM f13_cause_parcel WHERE ma_bcvh = ? AND ma_buu_ta_shown = ? AND ngay_do_kiem LIKE '2026-10%'`, [row.ma_bcvh, row.ma_buu_ta]);
        assert.equal(row.gbt_before_arrive, Number(direct.early), `${row.key} early`);
        assert.equal(row.arrive_gbt_counted, Number(direct.counted), `${row.key} counted`);
        assert.equal(row.volume, Number(direct.n));
    }
    assert.deepEqual(meta.bcvh.map((u) => u.ma_bcvh), [B, A].sort());
    for (const unit of meta.bcvh) {
        const [direct] = await all('SELECT SUM(ms_gbt < ms_arrive) AS early, SUM(leg_arrive_gbt_ms IS NOT NULL) AS counted, COUNT(*) AS n FROM f13_cause_parcel WHERE ma_bcvh = ?', [unit.ma_bcvh]);
        assert.equal(unit.gbt_before_arrive, Number(direct.early));
        assert.equal(unit.arrive_gbt_counted, Number(direct.counted));
        assert.equal(unit.volume, Number(direct.n));
    }
    // A: 4 early x 2 postmen x 2 days = 16; B: only day 1 = 8
    assert.equal(meta.bcvh.find((u) => u.ma_bcvh === A).gbt_before_arrive, 16);
    assert.equal(meta.bcvh.find((u) => u.ma_bcvh === B).gbt_before_arrive, 8);
});

test('the Đến–Giao median of each row is unchanged: only the parcels in the right order count', async () => {
    const sid = session();
    const { routes } = (await get_(sid, `/journey/routes?month=${MONTH}`)).body.data;
    for (const row of routes) {
        const rows = await all('SELECT leg_arrive_gbt_ms AS v FROM f13_cause_parcel WHERE ma_bcvh = ? AND ma_buu_ta_shown = ? AND leg_arrive_gbt_ms IS NOT NULL', [row.ma_bcvh, row.ma_buu_ta]);
        assert.equal(rows.length, row.arrive_gbt_counted);
        assert.equal(row.legs.arrive_gbt, Number((median(rows.map((r) => r.v)) / HOUR).toFixed(2)), `${row.key} median`);
    }
    assert.equal(routes.find((r) => r.ma_bcvh === A && r.ma_buu_ta === 'PM0').legs.arrive_gbt, 3); // legs 1..5 h on both days
});

test('/journey/parcels, /evidence/list and /evidence/parcel carry the minutes of an early handover; null otherwise', async () => {
    const sid = session();
    const day = DAYS[0];
    const parcels = (await get_(sid, `/journey/parcels?date=${day}&ma_bcvh=${A}&route=${A}R1&postman=PM0&page_size=50`)).body.data.parcels;
    assert.equal(parcels.length, 10);
    const list = (await get_(sid, `/evidence/list?date=${day}&view=journey&bcvh=${A}&route=${A}R1&postman=PM0&page_size=50`)).body.data.items;
    assert.equal(list.length, 10);
    const expectedMs = (index) => (index < 4 ? (index + 1) * 10 * MIN : null);
    for (let index = 0; index < 10; index += 1) {
        const bg = `BG${A}${day.slice(8)}PM0${index}`;
        assert.equal(parcels.find((p) => p.ma_bg === bg).gbt_before_arrive_ms, expectedMs(index), `${bg} journey`);
        assert.equal(list.find((p) => p.ma_bg === bg).journey.gbt_before_arrive_ms, expectedMs(index), `${bg} list`);
        const card = (await get_(sid, `/evidence/parcel?ngay_do_kiem=${day}&ma_bg=${bg}`)).body.data;
        assert.equal(card.journey.gbt_before_arrive_ms, expectedMs(index), `${bg} card`);
    }
});

test('/evidence/list sort key gbt_before_arrive: largest early first, parcels in the right order last in both directions', async () => {
    const sid = session();
    for (const order of ['desc', 'asc']) {
        const res = await get_(sid, `/evidence/list?date=${DAYS[0]}&view=journey&bcvh=${A}&sort=gbt_before_arrive&order=${order}&page_size=100`);
        assert.equal(res.status, 200, res.text);
        const values = res.body.data.items.map((p) => p.journey.gbt_before_arrive_ms);
        assert.equal(values.length, 20);
        assert.ok(values.slice(0, 8).every((v) => v !== null), 'the 8 early parcels come first');
        assert.ok(values.slice(8).every((v) => v === null));
        const early = values.slice(0, 8);
        assert.deepEqual(early, [...early].sort((x, y) => (order === 'desc' ? y - x : x - y)));
        assert.equal(res.body.data.meta.sort, 'gbt_before_arrive');
    }
});
