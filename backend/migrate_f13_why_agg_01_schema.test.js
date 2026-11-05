const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyF13WhyAgg01Schema, F13_WHY_AGG_01_TABLE_NAMES, F13_WHY_AGG_01_ADDED_COLUMNS } = require('./migrate_f13_why_agg_01_schema');

function tempDb() { return path.join(os.tmpdir(), `f13-why-agg-schema-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`); }
function query(dbPath, sql) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (e) => {
            if (e) return reject(e);
            db.all(sql, [], (err, rows) => db.close(() => (err ? reject(err) : resolve(rows))));
        });
    });
}

test('creates the three derived tables, is idempotent (second run changes nothing) and inserts nothing', async () => {
    const dbPath = tempDb();
    try {
        assert.deepEqual(await applyF13WhyAgg01Schema(dbPath), F13_WHY_AGG_01_TABLE_NAMES);
        const first = await query(dbPath, `SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name`);
        assert.deepEqual(await applyF13WhyAgg01Schema(dbPath), F13_WHY_AGG_01_TABLE_NAMES);
        assert.deepEqual(await query(dbPath, `SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name`), first);
        for (const table of F13_WHY_AGG_01_TABLE_NAMES) assert.equal((await query(dbPath, `SELECT COUNT(*) AS n FROM ${table}`))[0].n, 0);
        assert.deepEqual(F13_WHY_AGG_01_TABLE_NAMES, ['f13_cause_day', 'f13_cause_parcel', 'f13_cause_run']);
    } finally { fs.rmSync(dbPath, { force: true }); }
});

test('adds nothing to other tables: only the three tables and their indexes appear', async () => {
    const dbPath = tempDb();
    try {
        await applyF13WhyAgg01Schema(dbPath);
        const tables = (await query(dbPath, `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)).map((r) => r.name);
        assert.deepEqual(tables, ['f13_cause_day', 'f13_cause_parcel', 'f13_cause_run']);
    } finally { fs.rmSync(dbPath, { force: true }); }
});

// F13-WHY-DATA-02 R2: a table created before the rules v5 gets the new columns, keeps its rows, and ends up the same as a new one.
test('an f13_cause_parcel created before the v5 columns is extended in place (rows kept, new columns empty), and a second run changes nothing', async () => {
    const dbPath = tempDb();
    try {
        await applyF13WhyAgg01Schema(dbPath);
        // rebuild the table as the first release had it (without the added columns), with one row
        await new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, (e) => {
                if (e) return reject(e);
                return db.exec(`DROP TABLE f13_cause_parcel;
                    CREATE TABLE f13_cause_parcel (ngay_do_kiem TEXT NOT NULL, ma_bg TEXT NOT NULL, ma_bcvh TEXT NOT NULL, ma_tuyen TEXT, route_scope TEXT NOT NULL,
                        ma_buu_ta_first TEXT, ten_buu_ta_first TEXT, ma_buu_ta_shown TEXT, ten_buu_ta_shown TEXT, danh_gia TEXT, cause_code TEXT, cause_status TEXT NOT NULL,
                        cause_step TEXT, flags TEXT, hints TEXT, ma_lo TEXT, khong_tron_lo INTEGER NOT NULL DEFAULT 0, limit_ms INTEGER, tct_ms INTEGER, l_ms INTEGER, r_ms INTEGER,
                        built_at TEXT NOT NULL, classifier_version TEXT NOT NULL);
                    CREATE UNIQUE INDEX uq_f13_cause_parcel ON f13_cause_parcel(ngay_do_kiem, ma_bg);
                    INSERT INTO f13_cause_parcel (ngay_do_kiem, ma_bg, ma_bcvh, route_scope, cause_status, built_at, classifier_version) VALUES ('2026-10-28', 'BG1', '533140', 'POSTMAN', 'KHONG_PHAN_TICH', 'x', 'v4');`,
                (err) => db.close(() => (err ? reject(err) : resolve())));
            });
        });
        const names = async () => (await query(dbPath, `SELECT name FROM pragma_table_info('f13_cause_parcel')`)).map((r) => r.name);
        assert.equal((await names()).includes('basis'), false);
        assert.deepEqual(await applyF13WhyAgg01Schema(dbPath), F13_WHY_AGG_01_TABLE_NAMES);
        const after = await names();
        for (const [name] of F13_WHY_AGG_01_ADDED_COLUMNS) assert.ok(after.includes(name), name);
        assert.deepEqual(after.slice(-F13_WHY_AGG_01_ADDED_COLUMNS.length), F13_WHY_AGG_01_ADDED_COLUMNS.map(([name]) => name));
        const row = (await query(dbPath, 'SELECT * FROM f13_cause_parcel'))[0];
        assert.deepEqual([row.ma_bg, row.classifier_version, row.cause_detail, row.cause_reason, row.remaining_at_arrival_ms, row.a_source, row.basis], ['BG1', 'v4', null, null, null, null, null]);
        const columnsOnceMore = await query(dbPath, `SELECT name, type FROM pragma_table_info('f13_cause_parcel')`);
        assert.deepEqual(await applyF13WhyAgg01Schema(dbPath), F13_WHY_AGG_01_TABLE_NAMES);
        assert.deepEqual(await query(dbPath, `SELECT name, type FROM pragma_table_info('f13_cause_parcel')`), columnsOnceMore);
        // a fresh database has the same columns in the same order
        const fresh = tempDb();
        try {
            await applyF13WhyAgg01Schema(fresh);
            assert.deepEqual(await query(fresh, `SELECT name, type FROM pragma_table_info('f13_cause_parcel')`), columnsOnceMore);
        } finally { fs.rmSync(fresh, { force: true }); }
    } finally { fs.rmSync(dbPath, { force: true }); }
});
