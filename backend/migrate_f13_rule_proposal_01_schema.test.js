const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyF13RuleProposal01Schema, F13_RULE_PROPOSAL_01_TABLE_NAMES } = require('./migrate_f13_rule_proposal_01_schema');

function tempDb() { return path.join(os.tmpdir(), `f13-rule-proposal-schema-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`); }
function exec(dbPath, sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (e) => {
            if (e) return reject(e);
            db.all(sql, params, (err, rows) => db.close(() => (err ? reject(err) : resolve(rows))));
        });
    });
}

test('creates the decision table additively, is idempotent, inserts nothing and touches no other table', async () => {
    const dbPath = tempDb();
    try {
        await exec(dbPath, 'CREATE TABLE f13_analysis_log (id INTEGER PRIMARY KEY, ma_bg TEXT)');
        await exec(dbPath, "INSERT INTO f13_analysis_log (ma_bg) VALUES ('X')");
        assert.deepEqual(await applyF13RuleProposal01Schema(dbPath), F13_RULE_PROPOSAL_01_TABLE_NAMES);
        const first = await exec(dbPath, "SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name");
        assert.deepEqual(await applyF13RuleProposal01Schema(dbPath), F13_RULE_PROPOSAL_01_TABLE_NAMES);
        assert.deepEqual(await exec(dbPath, "SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name"), first);
        assert.equal((await exec(dbPath, 'SELECT COUNT(*) AS n FROM f13_rule_proposal_decision'))[0].n, 0);
        assert.deepEqual(await exec(dbPath, 'SELECT ma_bg FROM f13_analysis_log'), [{ ma_bg: 'X' }]);
    } finally { fs.rmSync(dbPath, { force: true }); }
});

test('append-only (UPDATE and DELETE refused by triggers) and only the three decisions are accepted', async () => {
    const dbPath = tempDb();
    try {
        await applyF13RuleProposal01Schema(dbPath);
        const insert = (decision) => exec(dbPath, "INSERT INTO f13_rule_proposal_decision (proposal_key, decision, actor_name, created_at) VALUES ('k', ?, 'a', 't')", [decision]);
        await insert('APPROVE');
        await insert('REJECT');
        await insert('APPLIED');
        await assert.rejects(insert('MAYBE'), /CHECK/);
        await assert.rejects(exec(dbPath, "UPDATE f13_rule_proposal_decision SET note = 'x'"), /append-only/);
        await assert.rejects(exec(dbPath, 'DELETE FROM f13_rule_proposal_decision'), /append-only/);
        assert.equal((await exec(dbPath, 'SELECT COUNT(*) AS n FROM f13_rule_proposal_decision'))[0].n, 3);
    } finally { fs.rmSync(dbPath, { force: true }); }
});
