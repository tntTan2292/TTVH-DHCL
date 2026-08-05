/**
 * migrate_network_management_001_phase1_schema.js
 *
 * NETWORK-MANAGEMENT-001 Phase 1 — Nền tảng.
 * Additive-only migration: creates the network_import_log,
 * network_service_point, network_level2_route, network_level2_route_stop,
 * and network_delivery_point tables if they do not already exist.
 *
 * Safe to run against the live operational database: every statement is
 * CREATE TABLE/INDEX IF NOT EXISTS, no existing table is dropped or altered,
 * and no business data is inserted.
 *
 * Usage: node migrate_network_management_001_phase1_schema.js [--db <path>]
 */

'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const NETWORK_MANAGEMENT_001_PHASE1_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS network_import_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL CHECK (module IN ('service_point', 'level2_route', 'delivery_route')),
    file_name TEXT NOT NULL,
    file_fingerprint TEXT NOT NULL,
    status TEXT NOT NULL,
    total_records INTEGER DEFAULT 0,
    inserted_records INTEGER DEFAULT 0,
    updated_records INTEGER DEFAULT 0,
    skipped_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    uploaded_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_network_import_log_fingerprint ON network_import_log(module, file_fingerprint);

CREATE TABLE IF NOT EXISTS network_service_point (
    ma_diem TEXT PRIMARY KEY,
    ten_diem TEXT,
    loai_diem TEXT,
    dia_chi TEXT,
    phuong_xa TEXT,
    don_vi_quan_ly TEXT,
    trang_thai TEXT,
    dien_thoai TEXT,
    lat REAL,
    lon REAL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(import_log_id) REFERENCES network_import_log(id)
);

CREATE TABLE IF NOT EXISTS network_level2_route (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_name TEXT NOT NULL,
    declared_km REAL,
    trips_per_week INTEGER,
    operator TEXT,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(import_log_id) REFERENCES network_import_log(id)
);

CREATE TABLE IF NOT EXISTS network_level2_route_stop (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    seq INTEGER NOT NULL,
    ma_diem TEXT,
    stop_name TEXT,
    arrival TEXT,
    handling TEXT,
    departure TEXT,
    leg_km REAL,
    note TEXT,
    lat REAL,
    lon REAL,
    FOREIGN KEY(route_id) REFERENCES network_level2_route(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_network_level2_route_stop_route ON network_level2_route_stop(route_id, seq);

CREATE TABLE IF NOT EXISTS network_delivery_point (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_phat TEXT NOT NULL,
    ma_bcvh TEXT NOT NULL,
    postman_code TEXT NOT NULL,
    bien_so TEXT,
    ma_buu_gui TEXT,
    lat REAL,
    lon REAL,
    status_time TEXT,
    loai_dich_vu TEXT,
    tien_thu_ho REAL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(import_log_id) REFERENCES network_import_log(id)
);
CREATE INDEX IF NOT EXISTS idx_network_delivery_point_query ON network_delivery_point(ngay_phat, ma_bcvh, postman_code);
`;

const NEW_TABLE_NAMES = [
    'network_import_log',
    'network_service_point',
    'network_level2_route',
    'network_level2_route_stop',
    'network_delivery_point',
];

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) {
        return path.resolve(argv[flagIndex + 1]);
    }
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function applyNetworkManagement001Phase1Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (openErr) => {
            if (openErr) {
                reject(openErr);
                return;
            }

            db.exec(NETWORK_MANAGEMENT_001_PHASE1_SCHEMA_SQL, (execErr) => {
                if (execErr) {
                    db.close(() => reject(execErr));
                    return;
                }

                db.all(
                    `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${NEW_TABLE_NAMES.map(() => '?').join(',')}) ORDER BY name`,
                    NEW_TABLE_NAMES,
                    (queryErr, rows) => {
                        db.close((closeErr) => {
                            if (queryErr) {
                                reject(queryErr);
                                return;
                            }
                            if (closeErr) {
                                reject(closeErr);
                                return;
                            }
                            resolve(rows.map((row) => row.name));
                        });
                    },
                );
            });
        });
    });
}

if (require.main === module) {
    const dbPath = resolveDbPath(process.argv.slice(2));
    console.log('=== NETWORK-MANAGEMENT-001 Phase 1 — Schema Migration ===');
    console.log(`DB Path: ${dbPath}`);

    applyNetworkManagement001Phase1Schema(dbPath)
        .then((createdTables) => {
            console.log('[OK] Tables present after migration:');
            createdTables.forEach((name) => console.log(`  - ${name}`));
            if (createdTables.length !== NEW_TABLE_NAMES.length) {
                console.error('[FAIL] Expected table set does not match.');
                process.exit(1);
            }
            console.log('[OK] Migration complete. No business data was inserted.');
        })
        .catch((error) => {
            console.error('[FAIL] Migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    applyNetworkManagement001Phase1Schema,
    NETWORK_MANAGEMENT_001_PHASE1_SCHEMA_SQL,
    NEW_TABLE_NAMES,
};
