const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyIncPhat01Schema, INC_PHAT_01_TABLE_NAMES, LOCKED_BY_PERIOD } = require('./migrate_inc_phat_01_schema');

function tempDb() { return path.join(os.tmpdir(), `inc-phat-schema-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`); }
function exec(dbPath, sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (e) => {
            if (e) return reject(e);
            db.all(sql, params, (err, rows) => db.close(() => (err ? reject(err) : resolve(rows))));
        });
    });
}

test('creates only inc_ tables, additively, idempotently, inserting nothing and leaving other tables alone', async () => {
    const dbPath = tempDb();
    try {
        await exec(dbPath, 'CREATE TABLE fact_bf_phat (id INTEGER PRIMARY KEY, lading_code TEXT)');
        await exec(dbPath, "INSERT INTO fact_bf_phat (lading_code) VALUES ('X')");
        const before = await exec(dbPath, "SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name");
        assert.deepEqual(await applyIncPhat01Schema(dbPath), [...INC_PHAT_01_TABLE_NAMES].sort());
        const first = await exec(dbPath, "SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name");
        assert.deepEqual(await applyIncPhat01Schema(dbPath), [...INC_PHAT_01_TABLE_NAMES].sort());
        assert.deepEqual(await exec(dbPath, "SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name"), first);
        const old = before.filter((row) => row.type === 'table');
        for (const row of old) assert.ok(first.some((r) => r.name === row.name && r.sql === row.sql), `${row.name} unchanged`);
        const added = first.filter((row) => !before.some((b) => b.name === row.name));
        assert.ok(added.every((row) => /^(inc_|idx_inc_|trg_inc_)/.test(row.name)), 'everything added is inc_-prefixed');
        for (const name of INC_PHAT_01_TABLE_NAMES) if (name !== 'inc_price_row') assert.equal((await exec(dbPath, `SELECT COUNT(*) AS n FROM ${name}`))[0].n, 0);
        assert.deepEqual(await exec(dbPath, 'SELECT lading_code FROM fact_bf_phat'), [{ lading_code: 'X' }]);
    } finally { fs.rmSync(dbPath, { force: true }); }
});

test('inc_audit_log is append-only', async () => {
    const dbPath = tempDb();
    try {
        await applyIncPhat01Schema(dbPath);
        await exec(dbPath, "INSERT INTO inc_audit_log (at, actor, action) VALUES ('t', 'a', 'x')");
        await assert.rejects(() => exec(dbPath, "UPDATE inc_audit_log SET actor = 'b'"), /append-only/);
        await assert.rejects(() => exec(dbPath, 'DELETE FROM inc_audit_log'), /append-only/);
        assert.equal((await exec(dbPath, 'SELECT COUNT(*) AS n FROM inc_audit_log'))[0].n, 1);
    } finally { fs.rmSync(dbPath, { force: true }); }
});

test('a KHOA period freezes its results and period-keyed inputs, and the period row itself', async () => {
    const dbPath = tempDb();
    try {
        await applyIncPhat01Schema(dbPath);
        await exec(dbPath, "INSERT INTO inc_period (ky, trang_thai, nguon, created_at) VALUES ('2026-08', 'DA_TINH', 'PMTL', 't')");
        await exec(dbPath, "INSERT INTO inc_period (ky, trang_thai, nguon, created_at) VALUES ('2026-09', 'DA_TINH', 'PMTL', 't')");
        const ins = (ky) => exec(dbPath, 'INSERT INTO inc_result (ky, ma_hrm, tong, nguon) VALUES (?, ?, 1, ?)', [ky, '00000001', 'PMTL']);
        await ins('2026-08');
        await exec(dbPath, "UPDATE inc_period SET trang_thai = 'KHOA', locked_at = 't', locked_by = 'a' WHERE ky = '2026-08'");
        await assert.rejects(() => ins('2026-08'), /locked/);
        await assert.rejects(() => exec(dbPath, "UPDATE inc_result SET tong = 2 WHERE ky = '2026-08'"), /locked/);
        await assert.rejects(() => exec(dbPath, "UPDATE inc_result SET ky = '2026-09' WHERE ky = '2026-08'"), /locked/);
        await assert.rejects(() => exec(dbPath, "DELETE FROM inc_result WHERE ky = '2026-08'"), /locked/);
        await assert.rejects(() => exec(dbPath, "UPDATE inc_period SET trang_thai = 'NHAP' WHERE ky = '2026-08'"), /locked/);
        await assert.rejects(() => exec(dbPath, "DELETE FROM inc_period WHERE ky = '2026-08'"), /locked/);
        await assert.rejects(() => exec(dbPath, "INSERT INTO inc_penalty (ky, ma_buu_ta, diem) VALUES ('2026-08', 'P1', 1)"), /locked/);
        await ins('2026-09'); // another period stays writable
        await exec(dbPath, "INSERT INTO inc_penalty (ky, ma_buu_ta, diem) VALUES ('2026-09', 'P1', 1)");
        assert.equal((await exec(dbPath, "SELECT COUNT(*) AS n FROM inc_result WHERE ky = '2026-08'"))[0].n, 1);
        assert.ok(LOCKED_BY_PERIOD.includes('inc_result') && LOCKED_BY_PERIOD.includes('inc_result_detail'));
    } finally { fs.rmSync(dbPath, { force: true }); }
});

test('period and status are validated', async () => {
    const dbPath = tempDb();
    try {
        await applyIncPhat01Schema(dbPath);
        await assert.rejects(() => exec(dbPath, "INSERT INTO inc_period (ky, nguon, created_at) VALUES ('2026-8', 'PMTL', 't')"), /CHECK/);
        await assert.rejects(() => exec(dbPath, "INSERT INTO inc_period (ky, nguon, created_at) VALUES ('2026-08', 'EXCEL', 't')"), /CHECK/);
        await assert.rejects(() => exec(dbPath, "INSERT INTO inc_penalty (ky, ma_buu_ta, diem) VALUES ('2026-08', 'P1', -1)"), /CHECK/);
    } finally { fs.rmSync(dbPath, { force: true }); }
});
