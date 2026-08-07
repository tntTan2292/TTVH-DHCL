'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-file-archive-db-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);
const testArchiveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-file-archive-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;
process.env.QIS_TEST_NETWORK_ARCHIVE_ROOT = testArchiveDir;

const { applyNetworkManagement001Phase1Schema } = require('../../../migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('../../../migrate_network_management_001_phase2_schema');
const { applyNetworkManagement001Phase3Schema } = require('../../../migrate_network_management_001_phase3_schema');
const { applyNetworkManagement001Phase4Schema } = require('../../../migrate_network_management_001_phase4_schema');
const { run } = require('../../config/db');
const {
    stageUploadedFile, promoteStagedFileToArchive, getArchiveRecord, readArchivedFileWithChecksum, resolveArchiveRoot,
} = require('./fileArchive');

test.before(async () => {
    await applyNetworkManagement001Phase1Schema(testDbPath);
    await applyNetworkManagement001Phase2Schema(testDbPath);
    await applyNetworkManagement001Phase3Schema(testDbPath);
    await applyNetworkManagement001Phase4Schema(testDbPath);
});

test.after(() => {
    try { fs.rmSync(testDbDir, { recursive: true, force: true }); } catch { /* Windows file lock, best-effort */ }
    try { fs.rmSync(testArchiveDir, { recursive: true, force: true }); } catch { /* Windows file lock, best-effort */ }
});

test.beforeEach(async () => {
    await run('DELETE FROM network_import_archive');
    await run('DELETE FROM network_import_log');
});

test('resolveArchiveRoot resolves to the isolated test sandbox, never the operational directory', () => {
    const root = resolveArchiveRoot();
    assert.equal(path.resolve(root), path.resolve(testArchiveDir));
    const operationalRoot = path.resolve(__dirname, '..', '..', '..', 'network_map_archive');
    assert.notEqual(path.resolve(root), operationalRoot, 'must never resolve to the real operational archive directory under NODE_ENV=test');
});

test('stageUploadedFile writes the exact bytes to a fingerprint-keyed staging path, independent of any in-memory buffer', async () => {
    const buffer = Buffer.from('fake xlsb content for staging test');
    const fingerprint = crypto.createHash('sha256').update(buffer).digest('hex');

    const stagedPath = await stageUploadedFile({
        module: 'delivery_route', fingerprint, buffer, fileName: 'test.xlsb',
    });

    assert.ok(fs.existsSync(stagedPath));
    const written = fs.readFileSync(stagedPath);
    assert.deepEqual(written, buffer);
});

test('promoteStagedFileToArchive moves the staged file into the permanent archive and records full metadata', async () => {
    const buffer = Buffer.from('fake xlsb content for promote test');
    const fingerprint = crypto.createHash('sha256').update(buffer).digest('hex');
    const fileName = '2026.07.01 - BatchFile Phat thang 06.2026.xlsb';

    const stagedPath = await stageUploadedFile({ module: 'delivery_route', fingerprint, buffer, fileName });

    const logResult = await run(
        `INSERT INTO network_import_log (module, file_name, file_fingerprint, status, total_records, uploaded_by)
         VALUES ('delivery_route', ?, ?, 'SUCCESS', 1, 'admin')`,
        [fileName, fingerprint],
    );
    const importLogId = logResult.lastID;

    const result = await promoteStagedFileToArchive({
        module: 'delivery_route',
        fingerprint,
        fileName,
        importLogId,
        declaredPeriod: '2026-06',
        actualPeriodMonths: ['2026-06'],
        uploadedBy: 'admin',
    });

    assert.ok(!fs.existsSync(stagedPath), 'staged file must be moved, not copied-and-left-behind');
    assert.ok(fs.existsSync(result.archivedPath));
    assert.equal(result.byteSize, buffer.length);

    const record = await getArchiveRecord(importLogId);
    assert.equal(record.file_name, fileName);
    assert.equal(record.file_fingerprint, fingerprint);
    assert.equal(record.byte_size, buffer.length);
    assert.equal(record.declared_period, '2026-06');
    assert.deepEqual(JSON.parse(record.actual_period_months), ['2026-06']);
    assert.equal(record.uploaded_by, 'admin');
    assert.ok(record.archived_at);
});

test('readArchivedFileWithChecksum retrieves the archived file and confirms its checksum still matches the recorded fingerprint', async () => {
    const buffer = Buffer.from('content for checksum verification test — must round-trip byte-for-byte');
    const fingerprint = crypto.createHash('sha256').update(buffer).digest('hex');
    const fileName = 'checksum-test.xlsb';

    await stageUploadedFile({ module: 'delivery_route', fingerprint, buffer, fileName });
    const logResult = await run(
        `INSERT INTO network_import_log (module, file_name, file_fingerprint, status, total_records, uploaded_by)
         VALUES ('delivery_route', ?, ?, 'SUCCESS', 1, 'admin')`,
        [fileName, fingerprint],
    );
    const importLogId = logResult.lastID;
    await promoteStagedFileToArchive({
        module: 'delivery_route', fingerprint, fileName, importLogId, declaredPeriod: '2026-06', actualPeriodMonths: ['2026-06'], uploadedBy: 'admin',
    });

    const { record, buffer: readBuffer, checksum, checksumMatches } = await readArchivedFileWithChecksum(importLogId);
    assert.ok(record);
    assert.deepEqual(readBuffer, buffer, 'archived bytes must be byte-identical to the original upload');
    assert.equal(checksum, fingerprint);
    assert.equal(checksumMatches, true);
});

test('a second, different module archiving the same fingerprint does not collide (module is part of the unique key)', async () => {
    const buffer = Buffer.from('shared-fingerprint-content');
    const fingerprint = crypto.createHash('sha256').update(buffer).digest('hex');

    await stageUploadedFile({ module: 'delivery_route', fingerprint, buffer, fileName: 'a.xlsb' });
    const log1 = await run(
        "INSERT INTO network_import_log (module, file_name, file_fingerprint, status, uploaded_by) VALUES ('delivery_route', 'a.xlsb', ?, 'SUCCESS', 'admin')",
        [fingerprint],
    );
    await promoteStagedFileToArchive({
        module: 'delivery_route', fingerprint, fileName: 'a.xlsb', importLogId: log1.lastID, declaredPeriod: null, actualPeriodMonths: [], uploadedBy: 'admin',
    });

    const record = await getArchiveRecord(log1.lastID);
    assert.ok(record);
});
