/**
 * F13-RULE-PROPOSAL-01 phase B1 - additive table of the PO decisions on rule proposals (Chuyên quản corrections grouped as proposals).
 *
 *   f13_rule_proposal_decision  APPEND-ONLY: one row per decision; the current decision of a proposal is its latest row, a new decision supersedes
 *                               the previous one (supersedes_id). Triggers refuse UPDATE and DELETE (the pattern of f13_analysis_log).
 *
 * The proposal itself is not stored: it is computed from f13_analysis_log (read only). `proposal_key` is its stable string. `snapshot_json` keeps the
 * counts at decision time. Idempotent (IF NOT EXISTS), inserts no data, touches no other table.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DECISIONS = Object.freeze(['APPROVE', 'REJECT', 'APPLIED']);

const F13_RULE_PROPOSAL_01_STATEMENTS = Object.freeze([
    `CREATE TABLE IF NOT EXISTS f13_rule_proposal_decision (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proposal_key TEXT NOT NULL,
        decision TEXT NOT NULL CHECK (decision IN (${DECISIONS.map((code) => `'${code}'`).join(', ')})),
        note TEXT,
        ticket_id TEXT,
        snapshot_json TEXT,
        actor_id INTEGER,
        actor_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        supersedes_id INTEGER
    )`,
    'CREATE INDEX IF NOT EXISTS idx_f13_rule_decision_key ON f13_rule_proposal_decision(proposal_key, id)',
    `CREATE TRIGGER IF NOT EXISTS trg_f13_rule_decision_no_update BEFORE UPDATE ON f13_rule_proposal_decision
     BEGIN SELECT RAISE(ABORT, 'f13_rule_proposal_decision is append-only'); END`,
    `CREATE TRIGGER IF NOT EXISTS trg_f13_rule_decision_no_delete BEFORE DELETE ON f13_rule_proposal_decision
     BEGIN SELECT RAISE(ABORT, 'f13_rule_proposal_decision is append-only'); END`,
]);

const F13_RULE_PROPOSAL_01_TABLE_NAMES = ['f13_rule_proposal_decision'];

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function applyF13RuleProposal01Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (openErr) => {
            if (openErr) return reject(openErr);
            const fail = (error) => db.close(() => reject(error));
            const next = (index) => {
                if (index >= F13_RULE_PROPOSAL_01_STATEMENTS.length) {
                    return db.all(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${F13_RULE_PROPOSAL_01_TABLE_NAMES.map(() => '?').join(',')})`, F13_RULE_PROPOSAL_01_TABLE_NAMES, (queryErr, rows) => {
                        db.close((closeErr) => {
                            if (queryErr) return reject(queryErr);
                            if (closeErr) return reject(closeErr);
                            return resolve(rows.map((row) => row.name).sort());
                        });
                    });
                }
                return db.exec(F13_RULE_PROPOSAL_01_STATEMENTS[index], (execErr) => (execErr ? fail(execErr) : next(index + 1)));
            };
            db.exec('PRAGMA busy_timeout = 30000', (pragmaErr) => (pragmaErr ? fail(pragmaErr) : next(0)));
        });
    });
}

if (require.main === module) {
    const dbPath = resolveDbPath(process.argv.slice(2));
    console.log('=== F13-RULE-PROPOSAL-01 schema migration ===');
    console.log(`DB Path: ${dbPath}`);
    applyF13RuleProposal01Schema(dbPath)
        .then((tables) => { console.log(`[OK] Tables present: ${tables.join(', ')}`); })
        .catch((error) => { console.error('[FAIL]', error.message); process.exit(1); });
}

module.exports = { applyF13RuleProposal01Schema, F13_RULE_PROPOSAL_01_STATEMENTS, F13_RULE_PROPOSAL_01_TABLE_NAMES, DECISIONS };
