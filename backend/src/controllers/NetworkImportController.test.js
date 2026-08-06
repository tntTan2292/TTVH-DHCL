'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const xlsx = require('xlsx');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-network-import-controller-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;

const { applyNetworkManagement001Phase1Schema } = require('../../migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('../../migrate_network_management_001_phase2_schema');
const { applyNetworkManagement001Phase3Schema } = require('../../migrate_network_management_001_phase3_schema');
const { run, all } = require('../config/db');
const networkImportController = require('./NetworkImportController');
const { EXPECTED_HEADERS: SERVICE_POINT_HEADERS, SHEET_NAME: SERVICE_POINT_SHEET } = require('../services/networkMapSeed/parseServicePointsExcel');

test.before(async () => {
    await applyNetworkManagement001Phase1Schema(testDbPath);
    await applyNetworkManagement001Phase2Schema(testDbPath);
    await applyNetworkManagement001Phase3Schema(testDbPath);
});

test.after(() => {
    try { fs.rmSync(testDbDir, { recursive: true, force: true }); } catch { /* Windows file lock, best-effort */ }
});

test.beforeEach(async () => {
    await run('DELETE FROM network_service_point');
    await run('DELETE FROM network_import_snapshot');
    await run('DELETE FROM network_import_log');
    await run('DELETE FROM network_import_session');
});

function createResponse() {
    return {
        statusCode: 200,
        body: null,
        headers: {},
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
        setHeader(name, value) { this.headers[name] = value; },
        send(buf) { this.body = buf; return this; },
    };
}

function buildServicePointsFileBuffer(rows) {
    const sheetRows = [
        ['title'], ['note'], [],
        SERVICE_POINT_HEADERS,
        ...rows,
    ];
    const sheet = xlsx.utils.aoa_to_sheet(sheetRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, SERVICE_POINT_SHEET);
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function adminReq(overrides = {}) {
    return { auth: { user: { username: 'admin', role: 'admin' } }, query: {}, params: {}, body: {}, ...overrides };
}

test('Preview never writes to network_service_point, and returns a usable session_token', async () => {
    const buffer = buildServicePointsFileBuffer([[1, '999999', 'Điểm mới', 'Giao dịch', null, 'X', 'Y', 'Hoạt động', 107.6, 16.5, 'Z']]);
    const req = adminReq({ file: { buffer, originalname: 'test.xlsx' } });
    const res = createResponse();

    await networkImportController.previewServicePoints(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.session_token);
    assert.equal(res.body.data.summary.added, 1);

    const rows = await all('SELECT * FROM network_service_point');
    assert.equal(rows.length, 0, 'Preview must never write to the business table');
});

test('Confirm with a valid session_token writes the row and logs history', async () => {
    const buffer = buildServicePointsFileBuffer([[1, '999999', 'Điểm mới', 'Giao dịch', null, 'X', 'Y', 'Hoạt động', 107.6, 16.5, 'Z']]);
    const previewReq = adminReq({ file: { buffer, originalname: 'test.xlsx' } });
    const previewRes = createResponse();
    await networkImportController.previewServicePoints(previewReq, previewRes);
    const sessionToken = previewRes.body.data.session_token;

    const confirmReq = adminReq({ body: { session_token: sessionToken } });
    const confirmRes = createResponse();
    await networkImportController.confirmServicePoints(confirmReq, confirmRes);

    assert.equal(confirmRes.statusCode, 200);
    assert.equal(confirmRes.body.data.inserted, 1);

    const rows = await all('SELECT * FROM network_service_point');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ma_diem, '999999');

    const history = await all("SELECT * FROM network_import_log WHERE module = 'service_point'");
    assert.equal(history.length, 1);
    assert.equal(history[0].status, 'SUCCESS');
});

test('Confirm with a missing/expired session_token is rejected with no write', async () => {
    const req = adminReq({ body: { session_token: 'does-not-exist' } });
    const res = createResponse();
    await networkImportController.confirmServicePoints(req, res);

    assert.equal(res.statusCode, 410);
    assert.equal(res.body.error.code, 'SESSION_EXPIRED');

    const rows = await all('SELECT * FROM network_service_point');
    assert.equal(rows.length, 0);
});

test('Confirming the same exact file twice is rejected the second time (fingerprint already logged)', async () => {
    const buffer = buildServicePointsFileBuffer([[1, '999999', 'Điểm mới', 'Giao dịch', null, 'X', 'Y', 'Hoạt động', 107.6, 16.5, 'Z']]);

    const preview1 = createResponse();
    await networkImportController.previewServicePoints(adminReq({ file: { buffer, originalname: 'a.xlsx' } }), preview1);
    const confirm1 = createResponse();
    await networkImportController.confirmServicePoints(adminReq({ body: { session_token: preview1.body.data.session_token } }), confirm1);
    assert.equal(confirm1.statusCode, 200);

    // Re-preview the SAME bytes — must be rejected at preview time already.
    const preview2 = createResponse();
    await networkImportController.previewServicePoints(adminReq({ file: { buffer, originalname: 'a.xlsx' } }), preview2);
    assert.equal(preview2.statusCode, 409);
    assert.equal(preview2.body.error.code, 'DUPLICATE_FILE');
});

test('Confirm blocks the entire file when any row is a hard error (Mạng điểm phục vụ scope)', async () => {
    const buffer = buildServicePointsFileBuffer([
        [1, '999999', 'Hợp lệ', 'Giao dịch', null, 'X', 'Y', 'Hoạt động', 107.6, 16.5, 'Z'],
        [2, '', 'Thiếu mã', 'Giao dịch', null, 'X', 'Y', 'Hoạt động', 107.6, 16.5, 'Z'],
    ]);
    const previewRes = createResponse();
    await networkImportController.previewServicePoints(adminReq({ file: { buffer, originalname: 'bad.xlsx' } }), previewRes);
    assert.equal(previewRes.body.data.hasBlockingError, true);

    const confirmRes = createResponse();
    await networkImportController.confirmServicePoints(adminReq({ body: { session_token: previewRes.body.data.session_token } }), confirmRes);
    assert.equal(confirmRes.statusCode, 422);
    assert.equal(confirmRes.body.error.code, 'BLOCKING_ERROR');

    const rows = await all('SELECT * FROM network_service_point');
    assert.equal(rows.length, 0, 'nothing is written when the file has a blocking error, including the valid row');
});

test('Rollback endpoint round-trips: confirm then rollback via the controller', async () => {
    const buffer = buildServicePointsFileBuffer([[1, '999999', 'Điểm mới', 'Giao dịch', null, 'X', 'Y', 'Hoạt động', 107.6, 16.5, 'Z']]);
    const previewRes = createResponse();
    await networkImportController.previewServicePoints(adminReq({ file: { buffer, originalname: 'a.xlsx' } }), previewRes);
    const confirmRes = createResponse();
    await networkImportController.confirmServicePoints(adminReq({ body: { session_token: previewRes.body.data.session_token } }), confirmRes);
    const importLogId = confirmRes.body.data.importLogId;

    const rollbackRes = createResponse();
    await networkImportController.rollback(adminReq({ params: { importLogId: String(importLogId) } }), rollbackRes);
    assert.equal(rollbackRes.statusCode, 200);
    assert.equal(rollbackRes.body.data.success, true);

    const rows = await all('SELECT * FROM network_service_point');
    assert.equal(rows.length, 0);
});

test('importHistory returns entries scoped to the requested module only', async () => {
    await run("INSERT INTO network_import_log (module, file_name, file_fingerprint, status) VALUES ('service_point', 'a.xlsx', 'fp1', 'SUCCESS')");
    await run("INSERT INTO network_import_log (module, file_name, file_fingerprint, status) VALUES ('delivery_route', 'b.xlsx', 'fp2', 'SUCCESS')");

    const res = createResponse();
    await networkImportController.importHistory(adminReq({ params: { module: 'service_point' } }), res);

    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].module, 'service_point');
});
