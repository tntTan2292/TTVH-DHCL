const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyF13Evidence01Schema, F13_EVIDENCE_01_TABLE_NAMES, CAUSE_CODES } = require('./migrate_f13_evidence_01_schema');
const { ANALYST_CAUSES } = require('./src/services/f13v2/EvidenceService');

function tempDb() { return path.join(os.tmpdir(), `f13-evidence-schema-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`); }
function exec(dbPath, sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (e) => {
            if (e) return reject(e);
            db.all(sql, params, (err, rows) => db.close(() => (err ? reject(err) : resolve(rows))));
        });
    });
}

test('creates the analysis log additively, is idempotent, inserts nothing and touches no other table', async () => {
    const dbPath = tempDb();
    try {
        await exec(dbPath, 'CREATE TABLE fact_f13 (id INTEGER PRIMARY KEY, ma_bg TEXT)');
        await exec(dbPath, "INSERT INTO fact_f13 (ma_bg) VALUES ('X')");
        assert.deepEqual(await applyF13Evidence01Schema(dbPath), F13_EVIDENCE_01_TABLE_NAMES);
        const first = await exec(dbPath, "SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name");
        assert.deepEqual(await applyF13Evidence01Schema(dbPath), F13_EVIDENCE_01_TABLE_NAMES);
        assert.deepEqual(await exec(dbPath, "SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name"), first);
        assert.equal((await exec(dbPath, 'SELECT COUNT(*) AS n FROM f13_analysis_log'))[0].n, 0);
        assert.deepEqual(await exec(dbPath, 'SELECT ma_bg FROM fact_f13'), [{ ma_bg: 'X' }]);
    } finally { fs.rmSync(dbPath, { force: true }); }
});

test('the log is append-only (UPDATE and DELETE are refused by triggers) and accepts only the causes of the list', async () => {
    const dbPath = tempDb();
    try {
        await applyF13Evidence01Schema(dbPath);
        const insert = (cause) => exec(dbPath, "INSERT INTO f13_analysis_log (ngay_do_kiem, ma_bg, ma_bcvh, cause_code, actor_name, created_at) VALUES ('2026-10-19', 'BG1', '537015', ?, 'a', 't')", [cause]);
        await insert('KHAC');
        await assert.rejects(() => insert('PHAT'), /CHECK constraint/);
        await assert.rejects(() => exec(dbPath, "UPDATE f13_analysis_log SET note = 'x'"), /append-only/);
        await assert.rejects(() => exec(dbPath, 'DELETE FROM f13_analysis_log'), /append-only/);
        assert.equal((await exec(dbPath, 'SELECT COUNT(*) AS n FROM f13_analysis_log'))[0].n, 1);
        assert.deepEqual(CAUSE_CODES, ANALYST_CAUSES.map((cause) => cause.code), 'the list of the service and the CHECK of the table are one list');
    } finally { fs.rmSync(dbPath, { force: true }); }
});
