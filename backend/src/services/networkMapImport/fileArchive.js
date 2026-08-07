/**
 * fileArchive — NETWORK-MANAGEMENT-001 Phase 4 (Sơ đồ tuyến phát remediation).
 *
 * Stages an uploaded raw source file to disk at Preview time (so it never
 * depends on multer's memoryStorage buffer, which is discarded once the
 * HTTP request ends — PO decision §8) and, only after a successful Confirm,
 * promotes it into a permanent archive directory alongside a
 * `network_import_archive` row recording filename, byte size, declared vs.
 * actual data period, uploader, and import time (PO decision §7).
 *
 * No retention/expiry logic exists here and none is added — files are never
 * auto-deleted, per the explicit PO instruction that retention is a
 * separate, not-yet-approved decision. An orphaned staged file (Preview
 * without a following Confirm) is left in place; storage growth from that
 * case is a known, accepted residual for the same reason.
 *
 * Test isolation mirrors the existing AUTO-IMPORT-012 pattern
 * (`src/services/importPipeline.js`): the archive root is resolved lazily
 * (not at module load) so unrelated test files that merely `require` this
 * module transitively never need to set the sandbox env var — only tests
 * that actually call `stageUploadedFile`/`promoteStagedFileToArchive` do.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { run, get, all } = require('../../config/db');

const operationalArchiveRoot = path.resolve(__dirname, '..', '..', '..', 'network_map_archive');

function resolveArchiveRoot() {
    if (process.env.NODE_ENV === 'test') {
        const configured = process.env.QIS_TEST_NETWORK_ARCHIVE_ROOT
            ? path.resolve(process.env.QIS_TEST_NETWORK_ARCHIVE_ROOT)
            : null;
        if (!configured) {
            throw new Error('NODE_ENV=test requires QIS_TEST_NETWORK_ARCHIVE_ROOT to point to an isolated archive sandbox directory.');
        }
        if (configured === operationalArchiveRoot) {
            throw new Error('QIS_TEST_NETWORK_ARCHIVE_ROOT must not resolve to the operational network_map_archive directory.');
        }
        return configured;
    }
    return operationalArchiveRoot;
}

function safeExtension(fileName) {
    const ext = path.extname(fileName || '');
    return /^\.[A-Za-z0-9]{1,10}$/.test(ext) ? ext : '.bin';
}

function stagingPath(module, fingerprint, fileName) {
    return path.join(resolveArchiveRoot(), '_staging', module, `${fingerprint}${safeExtension(fileName)}`);
}

function archivePath(module, fingerprint, fileName) {
    return path.join(resolveArchiveRoot(), module, `${fingerprint}${safeExtension(fileName)}`);
}

/**
 * Writes the uploaded buffer to a deterministic (fingerprint-keyed) staging
 * path immediately at Preview time. Idempotent — re-Previewing the exact
 * same file just overwrites the same path harmlessly.
 */
async function stageUploadedFile({ module, fingerprint, buffer, fileName }) {
    const dest = stagingPath(module, fingerprint, fileName);
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.writeFile(dest, buffer);
    return dest;
}

/**
 * Moves the staged file into the permanent archive and records a
 * `network_import_archive` row. Must be called only after the Confirm
 * transaction has already succeeded. Falls back to copy+unlink if a plain
 * rename fails (e.g. staging/archive on different volumes).
 */
async function promoteStagedFileToArchive({
    module, fingerprint, fileName, importLogId, declaredPeriod, actualPeriodMonths, uploadedBy,
}) {
    const from = stagingPath(module, fingerprint, fileName);
    const to = archivePath(module, fingerprint, fileName);
    await fs.promises.mkdir(path.dirname(to), { recursive: true });

    try {
        await fs.promises.rename(from, to);
    } catch {
        await fs.promises.copyFile(from, to);
        await fs.promises.unlink(from).catch(() => {});
    }

    const { size } = await fs.promises.stat(to);

    const result = await run(
        `INSERT INTO network_import_archive
            (import_log_id, module, file_name, file_fingerprint, byte_size, declared_period, actual_period_months, archived_path, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            importLogId, module, fileName, fingerprint, size,
            declaredPeriod || null, JSON.stringify(actualPeriodMonths || []), to, uploadedBy || null,
        ],
    );

    return {
        id: result.lastID,
        archivedPath: to,
        byteSize: size,
    };
}

async function getArchiveRecord(importLogId) {
    return get('SELECT * FROM network_import_archive WHERE import_log_id = ?', [importLogId]);
}

async function listArchiveRecords(module) {
    return all('SELECT * FROM network_import_archive WHERE module = ? ORDER BY id DESC', [module]);
}

/**
 * Reads an archived file back and verifies its checksum still matches the
 * recorded fingerprint — used by the retrieval/integrity test and available
 * for a future admin-facing "download archived file" feature.
 */
async function readArchivedFileWithChecksum(importLogId) {
    const record = await getArchiveRecord(importLogId);
    if (!record) return null;
    const buffer = await fs.promises.readFile(record.archived_path);
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    return { record, buffer, checksum, checksumMatches: checksum === record.file_fingerprint };
}

module.exports = {
    stageUploadedFile,
    promoteStagedFileToArchive,
    getArchiveRecord,
    listArchiveRecords,
    readArchivedFileWithChecksum,
    resolveArchiveRoot,
};
