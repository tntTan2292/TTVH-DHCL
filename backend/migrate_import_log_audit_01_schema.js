/**
 * IMPORT-LOG-AUDIT-01 -- additive audit columns on import_log.
 *
 * Adds who / which run / which job / how (import mode) / how many rows were
 * replaced. Columns only; nothing is rewritten, so every earlier log row keeps
 * NULL in these columns (shown as "not recorded").
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const REQUIRED_COLUMNS = Object.freeze({
    import_log: Object.freeze({
        actor: 'TEXT',
        run_id: 'TEXT',
        job_id: 'TEXT',
        import_mode: 'TEXT',
        replaced_row_count: 'INTEGER',
    }),
});

const INDEX_SQL = 'CREATE INDEX IF NOT EXISTS idx_import_log_date_indicator ON import_log(ngay_do_kiem, indicator, source_lane)';

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

async function applyImportLogAudit01Schema(dbPath) {
    const db = await openDb(dbPath);
    try {
        for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
            const existing = new Set((await all(db, `PRAGMA table_info(${table})`)).map((column) => column.name));
            if (existing.size === 0) throw new Error(`IMPORT-LOG-AUDIT-01 requires existing ${table}.`);
            for (const [column, definition] of Object.entries(columns)) {
                if (!existing.has(column)) await exec(db, `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
            }
        }
        await exec(db, INDEX_SQL);
        return { columns: REQUIRED_COLUMNS };
    } finally {
        await closeDb(db);
    }
}

if (require.main === module) {
    applyImportLogAudit01Schema(resolveDbPath(process.argv.slice(2)))
        .then(() => console.log('[OK] IMPORT-LOG-AUDIT-01 schema present. No business data was changed.'))
        .catch((error) => {
            console.error('[FAIL] IMPORT-LOG-AUDIT-01 migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    applyImportLogAudit01Schema,
    REQUIRED_COLUMNS,
};
