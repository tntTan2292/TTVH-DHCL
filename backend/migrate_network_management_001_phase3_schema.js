/**
 * migrate_network_management_001_phase3_schema.js
 *
 * NETWORK-MANAGEMENT-001 Phase 3 — Import/Export foundation.
 * Additive-only migration:
 *   1. network_import_session — short-lived server-side preview cache
 *      (parsed rows + classification), keyed by session_token, so Confirm
 *      never trusts client-echoed data.
 *   2. network_import_snapshot — one row per DB row affected by a Confirm,
 *      recording the before-image and operation type (INSERT/UPDATE/DELETE)
 *      so Rollback can reverse exactly what happened.
 *   3. network_import_log.rollback_of_import_log_id — nullable FK so a
 *      ROLLED_BACK log entry references the import it undid.
 *   4. UNIQUE(ma_buu_gui, ngay_phat, route_po_code) on network_delivery_point
 *      — the locked tuyến-phát row key, now DB-enforced, not just
 *      application-enforced. Verified zero existing violations before
 *      creation (see migration test + pre-flight check in this script).
 *
 * Safe to run against the live operational database: every statement is
 * idempotent (IF NOT EXISTS / column-existence-guarded ALTER). The UNIQUE
 * index creation is preceded by a duplicate-check that aborts loudly
 * instead of silently failing if the live table ever has violating rows.
 *
 * Usage: node migrate_network_management_001_phase3_schema.js [--db <path>]
 */

'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) {
        return path.resolve(argv[flagIndex + 1]);
    }
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbRun(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

// db.run() only executes the first statement of a multi-statement string;
// db.exec() is required to run the full ;-separated CREATE_TABLES_SQL block.
function dbExec(db, sql) {
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function columnExists(db, tableName, columnName) {
    const rows = await dbAll(db, `PRAGMA table_info(${tableName})`);
    return rows.some((row) => row.name === columnName);
}

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS network_import_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL CHECK (module IN ('service_point', 'level2_route', 'delivery_route')),
    session_token TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_fingerprint TEXT NOT NULL,
    parsed_payload TEXT NOT NULL,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_network_import_session_token ON network_import_session(session_token);
CREATE INDEX IF NOT EXISTS idx_network_import_session_expiry ON network_import_session(expires_at);

CREATE TABLE IF NOT EXISTS network_import_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_log_id INTEGER NOT NULL,
    table_name TEXT NOT NULL,
    row_key TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    before_image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(import_log_id) REFERENCES network_import_log(id)
);
CREATE INDEX IF NOT EXISTS idx_network_import_snapshot_log ON network_import_snapshot(import_log_id);
`;

async function ensureRollbackColumn(db) {
    const hasColumn = await columnExists(db, 'network_import_log', 'rollback_of_import_log_id');
    if (!hasColumn) {
        await dbRun(db, 'ALTER TABLE network_import_log ADD COLUMN rollback_of_import_log_id INTEGER REFERENCES network_import_log(id)');
        return true;
    }
    return false;
}

async function ensureDeliveryPointUniqueIndex(db) {
    const indexes = await dbAll(db, "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_network_delivery_point_unique_key'");
    if (indexes.length > 0) {
        return { created: false, violatingRows: 0 };
    }

    const violations = await dbAll(
        db,
        `SELECT ma_buu_gui, ngay_phat, route_po_code, COUNT(*) AS c
         FROM network_delivery_point
         GROUP BY ma_buu_gui, ngay_phat, route_po_code
         HAVING c > 1`,
    );
    if (violations.length > 0) {
        throw new Error(
            `Cannot create UNIQUE(ma_buu_gui, ngay_phat, route_po_code) index: ${violations.length} `
            + 'existing duplicate-key row group(s) found. Migration aborted — no index created, no data touched. '
            + 'Resolve the duplicates before re-running this migration.',
        );
    }

    await dbRun(
        db,
        'CREATE UNIQUE INDEX idx_network_delivery_point_unique_key ON network_delivery_point(ma_buu_gui, ngay_phat, route_po_code)',
    );
    return { created: true, violatingRows: 0 };
}

function applyNetworkManagement001Phase3Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, async (openErr) => {
            if (openErr) {
                reject(openErr);
                return;
            }

            try {
                await dbExec(db, CREATE_TABLES_SQL);
                const rollbackColumnAdded = await ensureRollbackColumn(db);
                const uniqueIndexResult = await ensureDeliveryPointUniqueIndex(db);

                db.close((closeErr) => {
                    if (closeErr) {
                        reject(closeErr);
                        return;
                    }
                    resolve({
                        rollback_column_added: rollbackColumnAdded,
                        unique_index_created: uniqueIndexResult.created,
                    });
                });
            } catch (error) {
                db.close(() => reject(error));
            }
        });
    });
}

if (require.main === module) {
    const dbPath = resolveDbPath(process.argv.slice(2));
    console.log('=== NETWORK-MANAGEMENT-001 Phase 3 — Schema Migration ===');
    console.log(`DB Path: ${dbPath}`);

    applyNetworkManagement001Phase3Schema(dbPath)
        .then((result) => {
            console.log('[OK] network_import_session / network_import_snapshot present.');
            console.log(`[OK] network_import_log.rollback_of_import_log_id present (added just now: ${result.rollback_column_added}).`);
            console.log(`[OK] network_delivery_point UNIQUE(ma_buu_gui, ngay_phat, route_po_code) present (created just now: ${result.unique_index_created}).`);
        })
        .catch((error) => {
            console.error('[FAIL] Migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = { applyNetworkManagement001Phase3Schema };
