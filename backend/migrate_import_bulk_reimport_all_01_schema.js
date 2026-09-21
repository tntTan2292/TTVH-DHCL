/**
 * IMPORT-BULK-REIMPORT-ALL-01 Part A -- additive "Nhap lai" (confirmed
 * reimport of a COMPLETED date) persistence.
 *
 * Adds `auto_backfill_job.force_reimport` (INTEGER NOT NULL DEFAULT 0):
 * the single source of truth for "this job was admitted through the new
 * confirm_replace_completed path" (Design of Record v2 Section 7.4). Every
 * existing job keeps `force_reimport = 0` and every existing code path is
 * unaffected.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const REQUIRED_COLUMNS = Object.freeze({
    auto_backfill_job: Object.freeze({
        force_reimport: 'INTEGER NOT NULL DEFAULT 0',
    }),
});

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function openDb(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (error) => error ? reject(error) : resolve(db));
    });
}

function exec(db, sql) {
    return new Promise((resolve, reject) => db.exec(sql, (error) => error ? reject(error) : resolve()));
}

function all(db, sql, params = []) {
    return new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
}

function closeDb(db) {
    return new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
}

async function ensureColumns(db) {
    for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
        const existing = new Set((await all(db, `PRAGMA table_info(${table})`)).map((column) => column.name));
        if (existing.size === 0) throw new Error(`IMPORT-BULK-REIMPORT-ALL-01 requires existing ${table}.`);
        for (const [column, definition] of Object.entries(columns)) {
            if (!existing.has(column)) await exec(db, `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        }
    }
}

async function applyImportBulkReimportAll01Schema(dbPath) {
    const db = await openDb(dbPath);
    try {
        await exec(db, 'PRAGMA foreign_keys=ON');
        await ensureColumns(db);
        return { columns: REQUIRED_COLUMNS };
    } finally {
        await closeDb(db);
    }
}

if (require.main === module) {
    applyImportBulkReimportAll01Schema(resolveDbPath(process.argv.slice(2)))
        .then(() => console.log('[OK] IMPORT-BULK-REIMPORT-ALL-01 schema present. No queue or business data was inserted.'))
        .catch((error) => {
            console.error('[FAIL] IMPORT-BULK-REIMPORT-ALL-01 migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    applyImportBulkReimportAll01Schema,
    REQUIRED_COLUMNS,
};
