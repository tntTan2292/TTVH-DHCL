'use strict';

/**
 * importProcessor.js
 *
 * SSOT Reference : docs/04_DOMAINS/.../data_blueprint.md § 4 (Reimport), § 5 (Duplicates)
 * Technical Design: docs/05_TECHNICAL_IMPLEMENTATION/f1.3_technical_design_v1.0.md § 2.1
 *
 * Exports:
 *   importParsedData(params)                            — Core DB import (TD-compliant)
 *   processImportFile(filePath, IN, PROCESSED, ERROR)   — File-based wrapper for importWatcher.js
 *
 * DOES NOT:
 *   - Parse Excel (delegated to excelParser.js).
 *   - Calculate KPI metrics.
 *   - Apply Business Rules.
 *   - Duplicate column mapping (reuses DB_COLUMNS from excelParser.js).
 */

const fs   = require('fs');
const path = require('path');

const { run }                                            = require('../config/db');
const { extractDateFromFilename, parseF13Excel, DB_COLUMNS } = require('./excelParser');

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// All columns inserted per row = 41 Excel fields + 2 system fields
const INSERT_COLUMNS = [...DB_COLUMNS, 'ngay_do_kiem', 'import_log_id'];

// SQLite SQLITE_MAX_VARIABLE_NUMBER default = 999.
// Batch size = floor(999 / numColumnsPerRow) to stay within the limit.
const MAX_SQLITE_PARAMS = 999;
const BATCH_SIZE        = Math.floor(MAX_SQLITE_PARAMS / INSERT_COLUMNS.length); // = 23 rows

// Pre-build per-row placeholder string: "(?, ?, ...)" with INSERT_COLUMNS.length placeholders
const SINGLE_ROW_PLACEHOLDER = `(${INSERT_COLUMNS.map(() => '?').join(', ')})`;
const COLUMN_LIST             = INSERT_COLUMNS.join(', ');

// ─────────────────────────────────────────────────────────────────────────────
// Core Import Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Import pre-parsed F1.3 data into fact_f13 inside a single transaction.
 *
 * Technical Design § 2.1:
 *   "Sử dụng INSERT OR IGNORE INTO fact_f13 để bỏ qua các dòng vi phạm
 *    Unique Constraint mà không Rollback toàn bộ file."
 *   "Tính toán error_records = total_parsed - total_inserted."
 *
 * SSOT data_blueprint.md § 5:
 *   "Tuyệt đối không hủy bỏ toàn bộ quá trình nạp file chỉ vì một số dòng bị trùng lặp."
 *
 * SSOT data_blueprint.md § 4 (Reimport):
 *   forceReimport = true → "Xóa toàn bộ dữ liệu ngày đó → Import mới → Ghi log lịch sử."
 *
 * @param {Object}   params
 * @param {Object[]} params.parsedData      Rows from parseF13Excel() — keyed by DB field names
 * @param {string}   params.ngay_do_kiem    'YYYY-MM-DD' extracted from filename (SSOT)
 * @param {string}   params.filename        Original filename — stored in import_log
 * @param {boolean}  [params.forceReimport=false]
 *   true  → DELETE rows for ngay_do_kiem before inserting (re-import/overwrite scenario)
 *   false → INSERT OR IGNORE only, no delete (additive insert)
 *
 * @returns {Promise<{
 *   success      : boolean,
 *   total        : number,   — total rows received from parsedData
 *   inserted     : number,   — rows actually written (INSERT OR IGNORE .changes)
 *   errors       : number,   — rows skipped by IGNORE (= total - inserted)
 *   skipped      : number,   — reserved; always 0 in this version
 *   import_log_id: number
 * }>}
 *
 * @throws {Error} Re-throws after ROLLBACK + FAILED log write.
 *   SSOT: rollback only on database/system errors, never on duplicate rows.
 */
async function importParsedData({ parsedData, ngay_do_kiem, filename, forceReimport = false }) {
    const totalParsed = parsedData.length;

    await run('BEGIN TRANSACTION');
    let import_log_id = null;

    try {
        // ── Step 1: Re-import — delete existing rows for this date ────────────
        // SSOT data_blueprint.md § 4: "Xóa toàn bộ dữ liệu ngày đó → Import mới"
        if (forceReimport) {
            await run('DELETE FROM fact_f13 WHERE ngay_do_kiem = ?', [ngay_do_kiem]);
        }

        // ── Step 2: Create import_log entry ───────────────────────────────────
        // error_records will be updated at Step 4 with the accurate count.
        const logResult = await run(
            `INSERT INTO import_log
                (file_name, ngay_do_kiem, status, total_records, error_records, skipped_records)
             VALUES (?, ?, 'SUCCESS', ?, 0, 0)`,
            [filename, ngay_do_kiem, totalParsed]
        );
        import_log_id = logResult.lastID;

        // ── Step 3: Batch INSERT OR IGNORE ────────────────────────────────────
        // TD § 2.1: INSERT OR IGNORE skips rows violating UNIQUE(ngay_do_kiem, ma_bg)
        // without aborting the rest of the import.
        let totalInserted = 0;

        for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
            const batch = parsedData.slice(i, i + BATCH_SIZE);

            // Build VALUES clause: "(?, ...), (?, ...), ..."
            const placeholders = batch.map(() => SINGLE_ROW_PLACEHOLDER).join(', ');
            const values       = [];

            for (const row of batch) {
                // 41 Excel-mapped fields (null if column was missing in Excel)
                for (const col of DB_COLUMNS) {
                    values.push(row[col] !== undefined ? row[col] : null);
                }
                // System fields
                values.push(ngay_do_kiem);
                values.push(import_log_id);
            }

            const sql    = `INSERT OR IGNORE INTO fact_f13 (${COLUMN_LIST}) VALUES ${placeholders}`;
            const result = await run(sql, values);

            // result.changes = rows actually inserted (ignored rows = 0 changes each)
            totalInserted += result.changes;
        }

        // ── Step 4: Update import_log with accurate skip/error counts ─────────
        // New Business Rule: skipped_records = duplicates, error_records = real errors
        const skippedRecords = totalParsed - totalInserted;
        const errorRecords = 0; // Success path = 0 real errors

        await run(
            'UPDATE import_log SET skipped_records = ?, error_records = ? WHERE id = ?',
            [skippedRecords, errorRecords, import_log_id]
        );

        // ── Step 5: Commit ─────────────────────────────────────────────────────
        await run('COMMIT');

        return {
            success      : true,
            total        : totalParsed,
            inserted     : totalInserted,
            skipped      : skippedRecords,
            errors       : errorRecords,
            import_log_id: import_log_id
        };

    } catch (error) {
        // Rollback the transaction on any database/system error.
        // SSOT: rollback is only triggered by DB errors, never by duplicate rows
        // (which are handled silently by INSERT OR IGNORE above).
        // NOTE: ROLLBACK itself is wrapped in try-catch to ensure the FAILED log
        // is always written even in degenerate states (e.g. nested transaction errors).
        try {
            await run('ROLLBACK');
        } catch (rollbackErr) {
            console.error('[importProcessor] ROLLBACK failed:', rollbackErr.message);
        }

        // Write FAILED log in a new, autonomous statement (outside the rolled-back txn).
        try {
            await run(
                `INSERT INTO import_log
                    (file_name, ngay_do_kiem, status, total_records, error_records, skipped_records)
                 VALUES (?, ?, 'FAILED', ?, ?, 0)`,
                [filename, ngay_do_kiem, totalParsed, totalParsed]
            );
        } catch (logErr) {
            console.error('[importProcessor] Could not write FAILED log:', logErr.message);
        }

        throw error; // Re-throw so callers can handle / report appropriately
    }
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
    importParsedData
};
