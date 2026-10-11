const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyF12Schema, F12_TABLE_NAMES } = require('./migrate_f12_schema');
const { F12_DB_COLUMNS } = require('./src/services/f12HueExcelParser');
const { F12_TCT_DB_COLUMNS } = require('./src/services/f12TctExcelParser');

const SYSTEM_COLUMNS = ['id', 'ngay_do_kiem', 'import_log_id', 'created_at'];

function tempDb() { return path.join(os.tmpdir(), `f12-schema-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`); }
function query(dbPath, sql) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (e) => {
            if (e) return reject(e);
            db.all(sql, [], (err, rows) => db.close(() => (err ? reject(err) : resolve(rows))));
        });
    });
}

test('creates fact_f12 and fact_f12_national, is idempotent and inserts nothing', async () => {
    const dbPath = tempDb();
    try {
        assert.deepEqual(await applyF12Schema(dbPath), F12_TABLE_NAMES);
        assert.deepEqual(await applyF12Schema(dbPath), F12_TABLE_NAMES);
        for (const table of F12_TABLE_NAMES) {
            assert.equal((await query(dbPath, `SELECT COUNT(*) AS n FROM ${table}`))[0].n, 0);
        }
    } finally { fs.rmSync(dbPath, { force: true }); }
});

test('table columns equal the system fields plus every parser column', async () => {
    const dbPath = tempDb();
    try {
        await applyF12Schema(dbPath);
        const detail = (await query(dbPath, 'PRAGMA table_info(fact_f12)')).map((c) => c.name);
        assert.deepEqual([...detail].sort(), [...SYSTEM_COLUMNS, ...F12_DB_COLUMNS].sort());
        const national = (await query(dbPath, 'PRAGMA table_info(fact_f12_national)')).map((c) => c.name);
        assert.deepEqual([...national].sort(), [...SYSTEM_COLUMNS, ...F12_TCT_DB_COLUMNS].sort());
    } finally { fs.rmSync(dbPath, { force: true }); }
});

test('schema.sql mirrors the migration', () => {
    const schema = fs.readFileSync(path.join(__dirname, 'src/db/schema.sql'), 'utf8');
    assert.match(schema, /CREATE TABLE IF NOT EXISTS fact_f12 \(/);
    assert.match(schema, /CREATE TABLE IF NOT EXISTS fact_f12_national \(/);
    assert.match(schema, /UNIQUE\(ngay_do_kiem, ma_tinh_chap_nhan\)/);
});
