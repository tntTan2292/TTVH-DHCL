/**
 * BF-PHAT-IMPORT-01 -- loads daily delivery BatchFiles into fact_bf_phat and records every attempt in
 * import_log (indicator 'BF-PHAT', lane 'HUE') so it shows in the Import log like the F indicators.
 *
 * A day is replaced as a whole inside one transaction (delete-by-day + insert), so re-importing is
 * idempotent and a failed parse leaves the previous data untouched. A dedicated SQLite connection is
 * used so the transaction never interleaves with statements of the shared app connection.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const { parseBfPhatDailyExcel, extractBfDateFromFilename, DB_COLUMNS } = require('./parseBfPhatDailyExcel');
const { insertImportLogRow, runWithImportContext, IMPORT_MODES } = require('../importLogAudit');

const INDICATOR = 'BF-PHAT';
const LANE = 'HUE';
const INSERT_BATCH = 200; // 31 params per row, well under SQLite's variable limit
const DEFAULT_DB_PATH = path.resolve(__dirname, '../../db/database.sqlite');

function openConnection(dbPath) {
    return new Promise((resolve, reject) => {
        const conn = new sqlite3.Database(dbPath, (error) => {
            if (error) return reject(error);
            conn.exec('PRAGMA busy_timeout = 30000;', (pragmaError) => (pragmaError ? reject(pragmaError) : resolve(conn)));
        });
    });
}

const promisify = (conn) => ({
    run: (sql, params = []) => new Promise((resolve, reject) => conn.run(sql, params, function onRun(error) {
        return error ? reject(error) : resolve({ changes: this.changes, lastID: this.lastID });
    })),
    all: (sql, params = []) => new Promise((resolve, reject) => conn.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)))),
    close: () => new Promise((resolve, reject) => conn.close((error) => (error ? reject(error) : resolve()))),
});

/** True when file `a` should replace file `b` for the same day: larger wins, a tie goes to the newer file. */
function isBetterFile(a, b) {
    if (a.size !== b.size) return a.size > b.size;
    if (a.mtimeMs !== b.mtimeMs) return a.mtimeMs > b.mtimeMs;
    return a.name > b.name;
}

/**
 * Files per business date in `dir`: the winner (largest, since TCT re-exports a corrected day as a bigger file and the
 * server leaves a 3 KB stub as the plain name) plus the losers that are superseded.
 */
function groupDailyFiles(dir) {
    const byDate = new Map();
    for (const name of fs.readdirSync(dir)) {
        const date = extractBfDateFromFilename(name);
        if (!date) continue;
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        const file = { date, name, path: full, mtimeMs: stat.mtimeMs, size: stat.size };
        const group = byDate.get(date) || { date, winner: null, losers: [] };
        if (!group.winner) group.winner = file;
        else if (isBetterFile(file, group.winner)) { group.losers.push(group.winner); group.winner = file; } else group.losers.push(file);
        byDate.set(date, group);
    }
    return byDate;
}

/** Winner file per business date, oldest day first. */
function pickDailyFiles(dir) {
    return [...groupDailyFiles(dir).values()].map((group) => group.winner).sort((a, b) => a.date.localeCompare(b.date));
}

/** Deletes the superseded local copies (only the downloaded raw files; nothing on the server). Returns the deleted names. */
function pruneSupersededFiles(dir, onlyDates = null) {
    const removed = [];
    for (const group of groupDailyFiles(dir).values()) {
        if (onlyDates && !onlyDates.includes(group.date)) continue;
        for (const file of group.losers) {
            fs.rmSync(file.path, { force: true });
            removed.push(file.name);
        }
    }
    return removed;
}

class BfPhatImportService {
    constructor({ dbPath = DEFAULT_DB_PATH } = {}) {
        this.dbPath = dbPath;
    }

    async withDb(fn) {
        const conn = await openConnection(this.dbPath);
        const db = promisify(conn);
        try {
            return await fn(db);
        } finally {
            await db.close();
        }
    }

    /** Days already loaded: Map<ngay_bf, { rows, sourceFile }>. */
    async loadedDays() {
        return this.withDb(async (db) => {
            const rows = await db.all('SELECT ngay_bf, COUNT(*) AS n, MAX(source_file) AS source_file FROM fact_bf_phat GROUP BY ngay_bf');
            return new Map(rows.map((row) => [row.ngay_bf, { rows: row.n, sourceFile: row.source_file }]));
        });
    }

    /**
     * Imports one daily file. Returns { date, status, rows, skipped, replaced }.
     * Never throws for a bad file: the failure is logged and returned with status 'FAILED'.
     */
    async importFile(filePath, { actor = null, trigger = 'AUTO', importMode = null } = {}) {
        const fileName = path.basename(filePath);
        const date = extractBfDateFromFilename(fileName);
        if (!date) return { date: null, file: fileName, status: 'FAILED', error: 'Tên file không phải SanLuongChiTiet_DDMMYYYY.xlsx', rows: 0 };

        return this.withDb(async (db) => {
            const writeLog = (status, counts) => insertImportLogRow({
                run: db.run,
                all: db.all,
                columns: ['file_name', 'ngay_do_kiem', 'indicator', 'source_lane', 'trigger_source', 'status', 'total_records', 'error_records', 'skipped_records'],
                values: [fileName, date, INDICATOR, LANE, trigger, status, counts.total, counts.errors, counts.skipped],
            });
            const context = { actor, importMode };

            let parsed;
            try {
                parsed = parseBfPhatDailyExcel(filePath);
            } catch (error) {
                await runWithImportContext(context, () => writeLog('FAILED', { total: 0, errors: 1, skipped: 0 }));
                return { date, file: fileName, status: 'FAILED', error: error.message, rows: 0 };
            }

            if (parsed.rows.length === 0) {
                // an empty export (the server leaves a 3 KB header-only stub until the real file lands): never replace good data with it
                await runWithImportContext(context, () => writeLog('FAILED', { total: 0, errors: 1, skipped: parsed.skipped }));
                return { date, file: fileName, status: 'FAILED', error: 'File không có dòng dữ liệu (file rỗng).', rows: 0 };
            }

            const placeholders = DB_COLUMNS.map(() => '?').join(', ');
            const insertSql = `INSERT INTO fact_bf_phat (ngay_bf, import_log_id, source_file, ${DB_COLUMNS.join(', ')}) VALUES (?, ?, ?, ${placeholders})`;
            await db.run('BEGIN IMMEDIATE');
            try {
                const before = (await db.all('SELECT COUNT(*) AS n FROM fact_bf_phat WHERE ngay_bf = ?', [date]))[0].n;
                const mode = importMode || (before > 0 ? IMPORT_MODES.REIMPORT : IMPORT_MODES.NEW);
                context.importMode = mode;
                context.replacedRowCount = before;
                await db.run('DELETE FROM fact_bf_phat WHERE ngay_bf = ?', [date]);
                const log = await runWithImportContext(context, () => writeLog('SUCCESS', {
                    total: parsed.rows.length, errors: 0, skipped: parsed.skipped,
                }));
                const tuple = `(?, ?, ?, ${placeholders})`;
                for (let i = 0; i < parsed.rows.length; i += INSERT_BATCH) {
                    const chunk = parsed.rows.slice(i, i + INSERT_BATCH);
                    const params = [];
                    for (const row of chunk) params.push(date, log.lastID, fileName, ...DB_COLUMNS.map((column) => row[column]));
                    await db.run(`${insertSql.slice(0, insertSql.indexOf('VALUES') + 6)} ${chunk.map(() => tuple).join(', ')}`, params);
                }
                await db.run('COMMIT');
                return { date, file: fileName, status: 'SUCCESS', rows: parsed.rows.length, skipped: parsed.skipped, replaced: before };
            } catch (error) {
                await db.run('ROLLBACK').catch(() => {});
                await runWithImportContext(context, () => writeLog('FAILED', { total: parsed.rows.length, errors: parsed.rows.length || 1, skipped: parsed.skipped }))
                    .catch(() => {});
                return { date, file: fileName, status: 'FAILED', error: error.message, rows: 0 };
            }
        });
    }

    /** Imports every day found in `dir` (not yet loaded, unless force / the date is in `onlyDates`). */
    async importFolder(dir, { force = false, onlyDates = null, actor = null, trigger = 'MANUAL', onProgress = null } = {}) {
        const loaded = force ? new Map() : await this.loadedDays();
        const files = pickDailyFiles(dir).filter((file) => (onlyDates ? onlyDates.includes(file.date) : true));
        const results = [];
        for (const file of files) {
            const had = loaded.get(file.date);
            if (!force && had && had.sourceFile === file.name) { // same file already loaded; a different (bigger re-export) file is loaded again
                results.push({ date: file.date, file: file.name, status: 'SKIPPED', rows: had.rows });
                continue;
            }
            const result = await this.importFile(file.path, { actor, trigger });
            results.push(result);
            if (onProgress) onProgress(result);
        }
        return results;
    }
}

module.exports = { BfPhatImportService, pickDailyFiles, pruneSupersededFiles, groupDailyFiles, INDICATOR, LANE };
