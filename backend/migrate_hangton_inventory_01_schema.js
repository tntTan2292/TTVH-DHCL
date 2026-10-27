/**
 * HANGTON-INVENTORY-01 phase 2 -- additive tables for the stock (hang ton) snapshots.
 *
 * hangton_snapshot       one row per capture (business_date + slot)
 * hangton_snapshot_item  the kept parcels of that capture (scope filter already applied)
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const STATEMENTS = Object.freeze([
    `CREATE TABLE IF NOT EXISTS hangton_snapshot (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_date TEXT NOT NULL,
        slot TEXT NOT NULL,
        captured_at TEXT NOT NULL,
        portal_timestamp TEXT,
        source_row_count INTEGER NOT NULL DEFAULT 0,
        kept_row_count INTEGER NOT NULL DEFAULT 0,
        is_stale INTEGER NOT NULL DEFAULT 0,
        trigger TEXT NOT NULL DEFAULT 'SCHEDULE',
        actor TEXT,
        UNIQUE (business_date, slot)
    )`,
    `CREATE TABLE IF NOT EXISTS hangton_snapshot_item (
        snapshot_id INTEGER NOT NULL,
        item_code TEXT NOT NULL,
        status_name TEXT,
        ton_level TEXT NOT NULL,
        ton_rank REAL NOT NULL,
        office TEXT,
        office_code TEXT,
        district TEXT,
        cod REAL,
        parcel_type TEXT,
        customer_class TEXT,
        postman_code TEXT,
        postman_name TEXT,
        reason TEXT,
        tms_scan_ms INTEGER,
        weight REAL,
        PRIMARY KEY (snapshot_id, item_code)
    ) WITHOUT ROWID`,
    'CREATE INDEX IF NOT EXISTS idx_hangton_item_office ON hangton_snapshot_item(snapshot_id, office)',
]);

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function exec(db, sql) {
    return new Promise((resolve, reject) => db.exec(sql, (error) => error ? reject(error) : resolve()));
}

async function applyHangtonInventory01Schema(dbPath) {
    const db = await new Promise((resolve, reject) => {
        const handle = new sqlite3.Database(dbPath, (error) => error ? reject(error) : resolve(handle));
    });
    try {
        for (const sql of STATEMENTS) await exec(db, sql);
        // additive: who took a manual / make-up snapshot (tables created before 2026-10-27 lack the column)
        const columns = await new Promise((resolve, reject) => db.all('PRAGMA table_info(hangton_snapshot)', (e, rows) => (e ? reject(e) : resolve(rows))));
        if (!columns.some((c) => c.name === 'actor')) await exec(db, 'ALTER TABLE hangton_snapshot ADD COLUMN actor TEXT');
    } finally {
        await new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
    }
}

if (require.main === module) {
    applyHangtonInventory01Schema(resolveDbPath(process.argv.slice(2)))
        .then(() => console.log('[OK] HANGTON-INVENTORY-01 schema present. No business data was changed.'))
        .catch((error) => {
            console.error('[FAIL] HANGTON-INVENTORY-01 migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = { applyHangtonInventory01Schema, STATEMENTS };
