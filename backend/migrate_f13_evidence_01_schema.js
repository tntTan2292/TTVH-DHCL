/**
 * F13-EVIDENCE-01 phase B1 - additive table of the analyses the Chuyên quản / Giám đốc BCVH record on failed F1.3 parcels.
 *
 *   f13_analysis_log  APPEND-ONLY: one row per recorded analysis; the current analysis of a parcel is its latest row, a correction is a new row.
 *                     Triggers refuse UPDATE and DELETE, so nothing can be changed afterwards (the pattern of hangton_handling_log, enforced).
 *
 * The parcel is keyed like f13_cause_parcel, by (ngay_do_kiem, ma_bg), and is NOT a foreign key: the cause table is rebuildable, the analyses are not.
 * Idempotent (IF NOT EXISTS), inserts no data, touches no other table.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const CAUSE_CODES = Object.freeze(['KHONG_TRON_LO', 'KHAI_THAC', 'VAN_CHUYEN', 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', 'GIAO_BUU_TA_QUA_GIO', 'PHAT_MUON', 'KHAC']);

const F13_EVIDENCE_01_STATEMENTS = Object.freeze([
    `CREATE TABLE IF NOT EXISTS f13_analysis_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ngay_do_kiem TEXT NOT NULL,
        ma_bg TEXT NOT NULL,
        ma_bcvh TEXT NOT NULL,
        cause_code TEXT NOT NULL CHECK (cause_code IN (${CAUSE_CODES.map((code) => `'${code}'`).join(', ')})),
        phat_detail TEXT,
        note TEXT,
        system_line TEXT,
        system_cause_code TEXT,
        system_cause_detail TEXT,
        system_cause_status TEXT,
        system_cause_reason TEXT,
        classifier_version TEXT,
        actor_id INTEGER,
        actor_name TEXT NOT NULL,
        actor_position TEXT,
        created_at TEXT NOT NULL,
        supersedes_id INTEGER
    )`,
    'CREATE INDEX IF NOT EXISTS idx_f13_analysis_parcel ON f13_analysis_log(ngay_do_kiem, ma_bg, id)',
    'CREATE INDEX IF NOT EXISTS idx_f13_analysis_bcvh ON f13_analysis_log(ma_bcvh, ngay_do_kiem)',
    `CREATE TRIGGER IF NOT EXISTS trg_f13_analysis_no_update BEFORE UPDATE ON f13_analysis_log
     BEGIN SELECT RAISE(ABORT, 'f13_analysis_log is append-only'); END`,
    `CREATE TRIGGER IF NOT EXISTS trg_f13_analysis_no_delete BEFORE DELETE ON f13_analysis_log
     BEGIN SELECT RAISE(ABORT, 'f13_analysis_log is append-only'); END`,
]);

const F13_EVIDENCE_01_TABLE_NAMES = ['f13_analysis_log'];

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function applyF13Evidence01Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (openErr) => {
            if (openErr) return reject(openErr);
            const fail = (error) => db.close(() => reject(error));
            // triggers contain ';' inside BEGIN..END, so each statement goes through exec on its own
            const next = (index) => {
                if (index >= F13_EVIDENCE_01_STATEMENTS.length) {
                    return db.all(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${F13_EVIDENCE_01_TABLE_NAMES.map(() => '?').join(',')})`, F13_EVIDENCE_01_TABLE_NAMES, (queryErr, rows) => {
                        db.close((closeErr) => {
                            if (queryErr) return reject(queryErr);
                            if (closeErr) return reject(closeErr);
                            return resolve(rows.map((row) => row.name).sort());
                        });
                    });
                }
                return db.exec(F13_EVIDENCE_01_STATEMENTS[index], (execErr) => (execErr ? fail(execErr) : next(index + 1)));
            };
            db.exec('PRAGMA busy_timeout = 30000', (pragmaErr) => (pragmaErr ? fail(pragmaErr) : next(0)));
        });
    });
}

if (require.main === module) {
    const dbPath = resolveDbPath(process.argv.slice(2));
    console.log('=== F13-EVIDENCE-01 schema migration ===');
    console.log(`DB Path: ${dbPath}`);
    applyF13Evidence01Schema(dbPath)
        .then((tables) => { console.log(`[OK] Tables present: ${tables.join(', ')}`); })
        .catch((error) => { console.error('[FAIL]', error.message); process.exit(1); });
}

module.exports = { applyF13Evidence01Schema, F13_EVIDENCE_01_STATEMENTS, F13_EVIDENCE_01_TABLE_NAMES, CAUSE_CODES };
