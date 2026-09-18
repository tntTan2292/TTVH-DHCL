/**
 * migrate_f13_route_postman_identity_phase1_schema.js
 *
 * F13-ROUTE-POSTMAN-IDENTITY-01 Phase 1 — Postman directory foundation.
 * Additive-only migration (Design of Record v2 §6):
 *   1. dm_buu_ta — postman directory (5 business fields + source/update
 *      metadata only; no personal-contact fields).
 *   2. dm_buu_ta_event — history/rollback log, own table (network_import_log
 *      / network_import_snapshot deliberately not reused — their CHECK
 *      constraints exclude this module).
 *   3. dm_buu_ta_conflict — D1 manual-vs-file name conflict queue.
 *   4. idx_network_delivery_point_route_day — additive covering index for
 *      the ranking join (Design Review R2); rollback is DROP INDEX, no
 *      existing table altered.
 *
 * Safe to run against the live operational database: every statement is
 * idempotent (IF NOT EXISTS). No business data is written by this script.
 *
 * Usage: node migrate_f13_route_postman_identity_phase1_schema.js [--db <path>]
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

function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS dm_buu_ta (
    ma_buu_ta TEXT PRIMARY KEY,
    ten_buu_ta TEXT NOT NULL,
    ma_bcvh TEXT,
    ten_bcvh TEXT,
    trang_thai_hoat_dong TEXT,
    nguon TEXT NOT NULL CHECK (nguon IN ('IMPORT', 'MANUAL')),
    in_latest_import INTEGER NOT NULL DEFAULT 0,
    last_import_batch_id TEXT,
    updated_by TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dm_buu_ta_bcvh ON dm_buu_ta(ma_bcvh);

CREATE TABLE IF NOT EXISTS dm_buu_ta_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    ma_buu_ta TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'RESOLVE_CONFLICT', 'ROLLBACK')),
    before_image TEXT,
    after_image TEXT NOT NULL,
    nguon TEXT NOT NULL CHECK (nguon IN ('IMPORT', 'MANUAL')),
    file_name TEXT,
    file_fingerprint TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dm_buu_ta_event_batch ON dm_buu_ta_event(batch_id);
CREATE INDEX IF NOT EXISTS idx_dm_buu_ta_event_code ON dm_buu_ta_event(ma_buu_ta, created_at);

CREATE TABLE IF NOT EXISTS dm_buu_ta_conflict (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_buu_ta TEXT NOT NULL,
    ten_hien_tai TEXT NOT NULL,
    ten_tu_file TEXT NOT NULL,
    ma_bcvh_file TEXT,
    ten_bcvh_file TEXT,
    trang_thai_file TEXT,
    batch_id TEXT NOT NULL,
    file_name TEXT,
    file_fingerprint TEXT,
    trang_thai TEXT NOT NULL CHECK (trang_thai IN ('OPEN', 'KEPT_MANUAL', 'APPLIED_FILE')) DEFAULT 'OPEN',
    resolved_by TEXT,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dm_buu_ta_conflict_open ON dm_buu_ta_conflict(ma_buu_ta) WHERE trang_thai = 'OPEN';

CREATE INDEX IF NOT EXISTS idx_network_delivery_point_route_day
    ON network_delivery_point(ngay_phat, route_po_code, postman_code);
`;

async function ensureDmBuuTaTables(db) {
    const before = await dbAll(db, "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('dm_buu_ta','dm_buu_ta_event','dm_buu_ta_conflict')");
    await dbExec(db, CREATE_TABLES_SQL);
    return { tablesAlreadyPresent: before.length };
}

function applyF13RoutePostmanIdentity01Phase1Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, async (openErr) => {
            if (openErr) {
                reject(openErr);
                return;
            }

            try {
                const result = await ensureDmBuuTaTables(db);
                db.close((closeErr) => {
                    if (closeErr) {
                        reject(closeErr);
                        return;
                    }
                    resolve(result);
                });
            } catch (error) {
                db.close(() => reject(error));
            }
        });
    });
}

if (require.main === module) {
    const dbPath = resolveDbPath(process.argv.slice(2));
    console.log('=== F13-ROUTE-POSTMAN-IDENTITY-01 Phase 1 — Schema Migration ===');
    console.log(`DB Path: ${dbPath}`);

    applyF13RoutePostmanIdentity01Phase1Schema(dbPath)
        .then((result) => {
            console.log(`[OK] dm_buu_ta / dm_buu_ta_event / dm_buu_ta_conflict present (already present before this run: ${result.tablesAlreadyPresent}/3).`);
            console.log('[OK] idx_network_delivery_point_route_day present.');
        })
        .catch((error) => {
            console.error('[FAIL] Migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = { applyF13RoutePostmanIdentity01Phase1Schema };
