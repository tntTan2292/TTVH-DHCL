'use strict';

/**
 * IMPORT-LOG-AUDIT-01 -- who/when/how an import was written.
 *
 * The import pipeline is deep (queue -> executor -> single-date service ->
 * executeImport -> importProcessor), so the actor, run, job and import mode are
 * carried in an AsyncLocalStorage context instead of widening every signature.
 * Whoever starts an import (a queue job, a manual upload) wraps the call in
 * runWithImportContext(); insertImportLog() and the FAILED-log writers read it.
 *
 * Columns are appended only when import_log already has them, so a database
 * that has not run the audit migration keeps writing the old row shape.
 */

const { AsyncLocalStorage } = require('node:async_hooks');

const { bumpCoverageVersion } = require('./coverageVersion');

const storage = new AsyncLocalStorage();

const IMPORT_MODES = Object.freeze({
    NEW: 'NEW',
    REIMPORT: 'REIMPORT',
    REFRESH_WINDOW: 'REFRESH_WINDOW',
    REFRESH_DAY: 'REFRESH_DAY',
    MANUAL_UPLOAD: 'MANUAL_UPLOAD',
    MANUAL_REIMPORT: 'MANUAL_REIMPORT',
});

const AUDIT_COLUMNS = Object.freeze(['actor', 'run_id', 'job_id', 'import_mode', 'replaced_row_count']);

function runWithImportContext(context, fn) {
    return storage.run({ ...context }, fn);
}

function currentImportContext() {
    return storage.getStore() || null;
}

function auditValues(context) {
    return {
        actor: context?.actor ?? null,
        run_id: context?.runId ?? null,
        job_id: context?.jobId ?? null,
        import_mode: context?.importMode ?? null,
        replaced_row_count: context?.replacedRowCount ?? null,
    };
}

/**
 * Returns the column and value lists for an import_log INSERT: the caller's own
 * columns first, then every audit column the table has.
 */
async function withAuditColumns(allFn, columns, values) {
    let present;
    try {
        present = new Set((await allFn('PRAGMA table_info(import_log)')).map((column) => column.name));
    } catch (_) {
        present = new Set();
    }
    const context = auditValues(currentImportContext());
    const outColumns = [...columns];
    const outValues = [...values];
    for (const column of AUDIT_COLUMNS) {
        if (!present.has(column)) continue;
        outColumns.push(column);
        outValues.push(context[column]);
    }
    return { columns: outColumns, values: outValues };
}

async function insertImportLogRow({ run, all, columns, values }) {
    const merged = await withAuditColumns(all, columns, values);
    const placeholders = merged.columns.map(() => '?').join(', ');
    try {
        return await run(
            `INSERT INTO import_log (${merged.columns.join(', ')}) VALUES (${placeholders})`,
            merged.values,
        );
    } finally {
        bumpCoverageVersion(); // a log row changes what a coverage scan reports
    }
}

module.exports = {
    IMPORT_MODES,
    AUDIT_COLUMNS,
    runWithImportContext,
    currentImportContext,
    withAuditColumns,
    insertImportLogRow,
};
