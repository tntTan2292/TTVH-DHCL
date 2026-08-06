'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-fingerprint-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;

const { applyNetworkManagement001Phase1Schema } = require('../../../migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('../../../migrate_network_management_001_phase2_schema');
const { applyNetworkManagement001Phase3Schema } = require('../../../migrate_network_management_001_phase3_schema');
const { run } = require('../../config/db');
const { computeFingerprint, isFingerprintAlreadyImported } = require('./fingerprint');

test.before(async () => {
    await applyNetworkManagement001Phase1Schema(testDbPath);
    await applyNetworkManagement001Phase2Schema(testDbPath);
    await applyNetworkManagement001Phase3Schema(testDbPath);
});

test.after(() => {
    try { fs.rmSync(testDbDir, { recursive: true, force: true }); } catch { /* Windows file lock, best-effort */ }
});

test.beforeEach(async () => {
    await run('DELETE FROM network_import_log');
});

test('computeFingerprint is deterministic and content-sensitive', () => {
    const a = computeFingerprint(Buffer.from('hello'));
    const b = computeFingerprint(Buffer.from('hello'));
    const c = computeFingerprint(Buffer.from('world'));
    assert.equal(a, b);
    assert.notEqual(a, c);
});

test('an exact-fingerprint SUCCESS import blocks re-import for the same module only', async () => {
    const fp = computeFingerprint(Buffer.from('same-bytes'));
    await run(
        "INSERT INTO network_import_log (module, file_name, file_fingerprint, status) VALUES ('service_point', 'x.xlsx', ?, 'SUCCESS')",
        [fp],
    );

    assert.equal(await isFingerprintAlreadyImported('service_point', fp), true);
    assert.equal(await isFingerprintAlreadyImported('level2_route', fp), false, 'fingerprint check must be scoped per module');
});

test('a different fingerprint (edited file) for the same module is allowed — same-month re-import case', async () => {
    const fp1 = computeFingerprint(Buffer.from('june-file-v1'));
    const fp2 = computeFingerprint(Buffer.from('june-file-v2-edited'));
    await run(
        "INSERT INTO network_import_log (module, file_name, file_fingerprint, status) VALUES ('delivery_route', 'june.xlsx', ?, 'SUCCESS')",
        [fp1],
    );

    assert.equal(await isFingerprintAlreadyImported('delivery_route', fp1), true);
    assert.equal(await isFingerprintAlreadyImported('delivery_route', fp2), false);
});

test('a FAILED or ROLLED_BACK log entry does not block re-import of the same fingerprint', async () => {
    const fp = computeFingerprint(Buffer.from('retry-me'));
    await run(
        "INSERT INTO network_import_log (module, file_name, file_fingerprint, status) VALUES ('service_point', 'x.xlsx', ?, 'FAILED')",
        [fp],
    );
    assert.equal(await isFingerprintAlreadyImported('service_point', fp), false);
});
