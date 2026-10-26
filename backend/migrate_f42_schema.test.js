const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyF42Schema, F42_TABLE_NAMES } = require('./migrate_f42_schema');
const { F42_DB_COLUMNS } = require('./src/services/f42HueParser');
const { F42_TCT_DB_COLUMNS } = require('./src/services/f42TctParser');

const SYSTEM_COLUMNS = ['id', 'ngay_do_kiem', 'import_log_id', 'created_at'];

function tempDb() { return path.join(os.tmpdir(), `f42-schema-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`); }
function query(dbPath, sql) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (e) => {
            if (e) return reject(e);
            db.all(sql, [], (err, rows) => db.close(() => (err ? reject(err) : resolve(rows))));
        });
    });
}

test('creates fact_f42 and fact_f42_national, is idempotent and inserts nothing', async () => {
    const dbPath = tempDb();
    try {
        assert.deepEqual(await applyF42Schema(dbPath), F42_TABLE_NAMES);
        assert.deepEqual(await applyF42Schema(dbPath), F42_TABLE_NAMES);
        for (const table of F42_TABLE_NAMES) {
            assert.equal((await query(dbPath, `SELECT COUNT(*) AS n FROM ${table}`))[0].n, 0);
        }
    } finally { fs.rmSync(dbPath, { force: true }); }
});

test('table columns equal the system fields plus every parser column', async () => {
    const dbPath = tempDb();
    try {
        await applyF42Schema(dbPath);
        const detail = (await query(dbPath, 'PRAGMA table_info(fact_f42)')).map((c) => c.name);
        assert.deepEqual([...detail].sort(), [...SYSTEM_COLUMNS, ...F42_DB_COLUMNS].sort());
        const national = (await query(dbPath, 'PRAGMA table_info(fact_f42_national)')).map((c) => c.name);
        assert.deepEqual([...national].sort(), [...SYSTEM_COLUMNS, ...F42_TCT_DB_COLUMNS].sort());
    } finally { fs.rmSync(dbPath, { force: true }); }
});

test('schema.sql mirrors the migration', () => {
    const schema = fs.readFileSync(path.join(__dirname, 'src/db/schema.sql'), 'utf8');
    assert.match(schema, /CREATE TABLE IF NOT EXISTS fact_f42 \(/);
    assert.match(schema, /CREATE TABLE IF NOT EXISTS fact_f42_national \(/);
    assert.match(schema, /UNIQUE\(ngay_do_kiem, ma_bg, ma_buu_ta, thoi_gian_gbt\)/);
    assert.match(schema, /UNIQUE\(ngay_do_kiem, ma_tinh_phat\)/);
});

test('the key is parcel + postman + GBT time: a second postman for the same parcel is a new row', async () => {
    const dbPath = tempDb();
    try {
        await applyF42Schema(dbPath);
        const db = await new Promise((resolve, reject) => { const d = new sqlite3.Database(dbPath, (e) => (e ? reject(e) : resolve(d))); });
        const insert = (parcel, postman, gbt) => new Promise((resolve, reject) => db.run(
            'INSERT OR IGNORE INTO fact_f42 (ngay_do_kiem, ma_bc_phat, ma_buu_ta, ma_bg, thoi_gian_gbt) VALUES (?,?,?,?,?)',
            ['2026-10-10', '533140', postman, parcel, gbt], function done(e) { return e ? reject(e) : resolve(this.changes); },
        ));
        assert.equal(await insert('P1', 'A', '2026-10-10 08:00:00'), 1);
        assert.equal(await insert('P1', 'B', '2026-10-10 17:00:00'), 1);
        assert.equal(await insert('P1', 'A', '2026-10-10 08:00:00'), 0);
        await new Promise((resolve) => db.close(resolve));
    } finally { fs.rmSync(dbPath, { force: true }); }
});
