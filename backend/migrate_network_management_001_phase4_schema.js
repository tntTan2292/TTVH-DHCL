/**
 * migrate_network_management_001_phase4_schema.js
 *
 * NETWORK-MANAGEMENT-001 Phase 4 — Sơ đồ tuyến phát data contract
 * remediation (PO-approved audit + remediation, 2026-08-06).
 *
 * Additive-only migration:
 *   1. network_import_archive — one row per successfully-Confirmed Import,
 *      recording where the original raw source file was archived on disk
 *      (`archived_path`), its byte size, its declared vs. actual data
 *      period, and who/when imported it. No retention/expiry logic exists
 *      here or anywhere else — rows and archived files are never
 *      auto-deleted (explicit PO decision).
 *
 * `bien_so` on network_delivery_point is deliberately left untouched —
 * per the locked PO decision, it stays in the schema (nullable) to avoid a
 * breaking migration, even though it is no longer populated by Import or
 * shown by Export.
 *
 * Safe to run against the live operational database: idempotent
 * (CREATE TABLE/INDEX IF NOT EXISTS).
 *
 * Usage: node migrate_network_management_001_phase4_schema.js [--db <path>]
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

function dbExec(db, sql) {
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS network_import_archive (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_log_id INTEGER NOT NULL,
    module TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_fingerprint TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    declared_period TEXT,
    actual_period_months TEXT,
    archived_path TEXT NOT NULL,
    uploaded_by TEXT,
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(import_log_id) REFERENCES network_import_log(id)
);
CREATE INDEX IF NOT EXISTS idx_network_import_archive_log ON network_import_archive(import_log_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_network_import_archive_fingerprint ON network_import_archive(module, file_fingerprint);
`;

function applyNetworkManagement001Phase4Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, async (openErr) => {
            if (openErr) {
                reject(openErr);
                return;
            }

            try {
                await dbExec(db, CREATE_TABLES_SQL);

                db.close((closeErr) => {
                    if (closeErr) {
                        reject(closeErr);
                        return;
                    }
                    resolve({ archive_table_ensured: true });
                });
            } catch (error) {
                db.close(() => reject(error));
            }
        });
    });
}

if (require.main === module) {
    const dbPath = resolveDbPath(process.argv.slice(2));
    console.log('=== NETWORK-MANAGEMENT-001 Phase 4 — Schema Migration ===');
    console.log(`DB Path: ${dbPath}`);

    applyNetworkManagement001Phase4Schema(dbPath)
        .then(() => {
            console.log('[OK] network_import_archive present.');
        })
        .catch((error) => {
            console.error('[FAIL] Migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = { applyNetworkManagement001Phase4Schema };
