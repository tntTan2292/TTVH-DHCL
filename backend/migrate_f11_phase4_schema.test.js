const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyF11Phase4Schema, F11_PHASE4_TABLE_NAMES } = require('./migrate_f11_phase4_schema');
const { F11_TCT_DB_COLUMNS } = require('./src/services/f11TctExcelParser');

function tempDb() { return path.join(os.tmpdir(), `f11-phase4-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`); }
function query(dbPath, sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (e) => {
            if (e) return reject(e);
            db.all(sql, params, (err, rows) => db.close(() => (err ? reject(err) : resolve(rows))));
        });
    });
}
function exec(dbPath, sql) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (e) => {
            if (e) return reject(e);
            db.exec(sql, (err) => db.close(() => (err ? reject(err) : resolve())));
        });
    });
}

test('creates fact_f11_national, is idempotent and inserts nothing', async () => {
    const dbPath = tempDb();
    try {
        assert.deepEqual(await applyF11Phase4Schema(dbPath), F11_PHASE4_TABLE_NAMES);
        assert.deepEqual(await applyF11Phase4Schema(dbPath), F11_PHASE4_TABLE_NAMES);
        assert.equal((await query(dbPath, 'SELECT COUNT(*) AS n FROM fact_f11_national'))[0].n, 0);
    } finally { fs.rmSync(dbPath, { force: true }); }
});

test('table columns equal the system fields plus every parser column', async () => {
    const dbPath = tempDb();
    try {
        await applyF11Phase4Schema(dbPath);
        const columns = (await query(dbPath, 'PRAGMA table_info(fact_f11_national)')).map((c) => c.name).sort();
        assert.deepEqual(columns, ['id', 'ngay_do_kiem', 'import_log_id', 'created_at', ...F11_TCT_DB_COLUMNS].sort());
    } finally { fs.rmSync(dbPath, { force: true }); }
});

test('UNIQUE(date, accepting province, delivering province) and the two indexes', async () => {
    const dbPath = tempDb();
    try {
        await applyF11Phase4Schema(dbPath);
        await exec(dbPath, "INSERT INTO fact_f11_national (ngay_do_kiem, ma_tinh_chap_nhan, ma_tinh_phat) VALUES ('2026-10-07','53','53'), ('2026-10-07','01','53'), ('2026-10-08','53','53')");
        await assert.rejects(exec(dbPath, "INSERT INTO fact_f11_national (ngay_do_kiem, ma_tinh_chap_nhan, ma_tinh_phat) VALUES ('2026-10-07','53','53')"), /UNIQUE/);
        const names = (await query(dbPath, "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='fact_f11_national'")).map((r) => r.name);
        assert.ok(names.includes('idx_f11_nat_ngay') && names.includes('idx_f11_nat_phat_ngay'));
    } finally { fs.rmSync(dbPath, { force: true }); }
});

test('leaves the Huế table untouched', async () => {
    const dbPath = tempDb();
    try {
        await exec(dbPath, "CREATE TABLE fact_f11 (id INTEGER PRIMARY KEY, ma_bg TEXT); INSERT INTO fact_f11 (ma_bg) VALUES ('A'), ('B');");
        await applyF11Phase4Schema(dbPath);
        assert.equal((await query(dbPath, 'SELECT COUNT(*) AS n FROM fact_f11'))[0].n, 2);
    } finally { fs.rmSync(dbPath, { force: true }); }
});
