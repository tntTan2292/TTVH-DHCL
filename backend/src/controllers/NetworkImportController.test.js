'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const xlsx = require('xlsx');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-network-import-controller-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);
const testArchiveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-network-import-archive-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;
process.env.QIS_TEST_NETWORK_ARCHIVE_ROOT = testArchiveDir;

const { applyNetworkManagement001Phase1Schema } = require('../../migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('../../migrate_network_management_001_phase2_schema');
const { applyNetworkManagement001Phase3Schema } = require('../../migrate_network_management_001_phase3_schema');
const { applyNetworkManagement001Phase4Schema } = require('../../migrate_network_management_001_phase4_schema');
const { run, all } = require('../config/db');
const networkImportController = require('./NetworkImportController');
const { EXPECTED_HEADERS: SERVICE_POINT_HEADERS, SHEET_NAME: SERVICE_POINT_SHEET } = require('../services/networkMapSeed/parseServicePointsExcel');
const { readArchivedFileWithChecksum } = require('../services/networkMapImport/fileArchive');

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
    await run('DELETE FROM network_service_point');
    await run('DELETE FROM network_delivery_point');
    await run('DELETE FROM network_import_archive');
    await run('DELETE FROM network_import_snapshot');
    await run('DELETE FROM network_import_log');
    await run('DELETE FROM network_import_session');
});

// Raw BatchFile fixture builder: header-name-based, 29-column layout,
// matching the real monthly file exactly (column order/count intentionally
// mirrors the live Data QLML source so this fixture stays representative).
const RAW_HEADER = [
    'LADING_CODE', 'Mã Tỉnh', 'Mã huyện', 'Mã bưu cục', 'POSTMAN_CODE', 'ROUTE_PO_CODE', 'STATUS_CODE',
    'TYPE_CODE_PAYROLL', 'TYPE_NAME_PAYROLL', 'SERVICE_NAME_PAYROLL', 'REGION_CODE', 'KG', 'AREA_CODE',
    'SERVICE_CODE', 'ITEM_TYPE_CODE', 'STATUS_DATE', 'QUANTITY', 'SERVICE_PRO', 'MABC_CN', 'MABC_PHAT',
    'SO_TIEN_THU_HO', 'CUSTOMER_CODE', 'LAT', 'LON', 'STATUS_TIME', 'GTGT', 'Xác nhận đến BCP', 'Mã lô',
    'Thời gian nhập phát',
];

function buildRawBatchRow(overrides = {}) {
    const row = new Array(29).fill(null);
    row[0] = 'CN0001'; // LADING_CODE
    row[4] = '53A121'; // POSTMAN_CODE
    row[5] = '533140145'; // ROUTE_PO_CODE
    row[9] = 'C-Bưu kiện'; // SERVICE_NAME_PAYROLL
    row[15] = 20260601; // STATUS_DATE
    row[16] = 1; // QUANTITY
    row[19] = '533140'; // MABC_PHAT
    row[20] = 100000; // SO_TIEN_THU_HO
    row[22] = 16.5; // LAT
    row[23] = 107.6; // LON
    row[24] = 103200; // STATUS_TIME
    row[28] = '01/06/2026 10:32:00'; // Thời gian nhập phát
    return Object.assign(row, overrides);
}

function buildRawBatchFileBuffer(rows, sheetName = 'Data_Ghep_1234567890') {
    const sheet = xlsx.utils.aoa_to_sheet([RAW_HEADER, ...rows]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, sheetName);
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

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

// ==================== Phase 4: Sơ đồ tuyến phát raw-BatchFile Import + Archive ====================

test('Preview accepts the raw BatchFile exactly (no reformatting), reports a matching declared/actual period, and writes nothing', async () => {
    const buffer = buildRawBatchFileBuffer([buildRawBatchRow()]);
    const fileName = '2026.07.01 - BatchFile Phat thang 06.2026.xlsb';
    const req = adminReq({ file: { buffer, originalname: fileName } });
    const res = createResponse();

    await networkImportController.previewDeliveryRoutes(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.declaredPeriod, '2026-06');
    assert.deepEqual(res.body.data.actualPeriodMonths, ['2026-06']);
    assert.equal(res.body.data.periodWarning, null, 'declared and actual period match — no warning');
    assert.equal(res.body.data.summary.added, 1);
    assert.ok(res.body.data.session_token);

    const rows = await all('SELECT * FROM network_delivery_point');
    assert.equal(rows.length, 0, 'Preview must never write to the business table');
});

test('Preview warns (does not block) when the filename period does not match the content period', async () => {
    // Filename declares July, but the row's STATUS_DATE is in June.
    const buffer = buildRawBatchFileBuffer([buildRawBatchRow()]);
    const fileName = '2026.08.01 - BatchFile Phat thang 07.2026.xlsb';
    const req = adminReq({ file: { buffer, originalname: fileName } });
    const res = createResponse();

    await networkImportController.previewDeliveryRoutes(req, res);

    assert.equal(res.statusCode, 200, 'mismatch must warn, not hard-block');
    assert.match(res.body.data.periodWarning, /không khớp/i);
    assert.equal(res.body.data.hasBlockingError, false);
});

test('Preview warns when the file contains multiple distinct months', async () => {
    const buffer = buildRawBatchFileBuffer([
        buildRawBatchRow({ 0: 'CN0001' }),
        buildRawBatchRow({ 0: 'CN0002', 15: 20260701 }),
    ]);
    const fileName = '2026.07.01 - BatchFile Phat thang 06.2026.xlsb';
    const req = adminReq({ file: { buffer, originalname: fileName } });
    const res = createResponse();

    await networkImportController.previewDeliveryRoutes(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data.actualPeriodMonths, ['2026-06', '2026-07']);
    assert.match(res.body.data.periodWarning, /nhiều kỳ/i);
});

test('Preview fails loudly (never silently mis-maps) when a required raw header is missing', async () => {
    const badHeader = RAW_HEADER.map((h) => (h === 'STATUS_DATE' ? 'STATUS_DATE_RENAMED' : h));
    const sheet = xlsx.utils.aoa_to_sheet([badHeader, buildRawBatchRow()]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'Data_Ghep_x');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const req = adminReq({ file: { buffer, originalname: '2026.07.01 - BatchFile Phat thang 06.2026.xlsb' } });
    const res = createResponse();
    await networkImportController.previewDeliveryRoutes(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'PARSE_ERROR');
    assert.match(res.body.error.message, /STATUS_DATE/);
});

test('Confirm writes rows, then archives the original raw file with a checksum that matches, retrievable by import_log_id', async () => {
    const buffer = buildRawBatchFileBuffer([buildRawBatchRow()]);
    const fileName = '2026.07.01 - BatchFile Phat thang 06.2026.xlsb';

    const previewRes = createResponse();
    await networkImportController.previewDeliveryRoutes(adminReq({ file: { buffer, originalname: fileName } }), previewRes);

    const confirmRes = createResponse();
    await networkImportController.confirmDeliveryRoutes(adminReq({ body: { session_token: previewRes.body.data.session_token } }), confirmRes);

    assert.equal(confirmRes.statusCode, 200);
    assert.equal(confirmRes.body.data.inserted, 1);
    assert.ok(confirmRes.body.data.archive.archivedPath);
    assert.equal(confirmRes.body.data.archive.byteSize, buffer.length);

    const rows = await all('SELECT * FROM network_delivery_point');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ma_buu_gui, 'CN0001');
    assert.equal(rows[0].bien_so, null, '"Biển số" has no source — must stay null');

    const { record, checksumMatches } = await readArchivedFileWithChecksum(confirmRes.body.data.importLogId);
    assert.ok(record, 'archive record must be retrievable by import_log_id');
    assert.equal(record.file_name, fileName);
    assert.equal(record.declared_period, '2026-06');
    assert.deepEqual(JSON.parse(record.actual_period_months), ['2026-06']);
    assert.equal(record.uploaded_by, 'admin');
    assert.ok(checksumMatches, 'archived file bytes must still match the recorded fingerprint');
});

test('Sequential import of a second month never alters or duplicates the first month\'s rows', async () => {
    const juneBuffer = buildRawBatchFileBuffer([buildRawBatchRow({ 0: 'CN-JUNE-1' })]);
    const junePreview = createResponse();
    await networkImportController.previewDeliveryRoutes(
        adminReq({ file: { buffer: juneBuffer, originalname: '2026.07.01 - BatchFile Phat thang 06.2026.xlsb' } }),
        junePreview,
    );
    const juneConfirm = createResponse();
    await networkImportController.confirmDeliveryRoutes(
        adminReq({ body: { session_token: junePreview.body.data.session_token } }),
        juneConfirm,
    );
    assert.equal(juneConfirm.statusCode, 200);

    const julyBuffer = buildRawBatchFileBuffer([buildRawBatchRow({ 0: 'CN-JULY-1', 15: 20260701 })]);
    const julyPreview = createResponse();
    await networkImportController.previewDeliveryRoutes(
        adminReq({ file: { buffer: julyBuffer, originalname: '2026.08.01 - BatchFile Phat thang 07.2026.xlsb' } }),
        julyPreview,
    );
    const julyConfirm = createResponse();
    await networkImportController.confirmDeliveryRoutes(
        adminReq({ body: { session_token: julyPreview.body.data.session_token } }),
        julyConfirm,
    );
    assert.equal(julyConfirm.statusCode, 200);

    const juneRows = await all("SELECT * FROM network_delivery_point WHERE ngay_phat = '2026-06-01'");
    assert.equal(juneRows.length, 1, 'June row must be unchanged/untouched by the July import');
    assert.equal(juneRows[0].ma_buu_gui, 'CN-JUNE-1');

    const julyRows = await all("SELECT * FROM network_delivery_point WHERE ngay_phat = '2026-07-01'");
    assert.equal(julyRows.length, 1);
    assert.equal(julyRows[0].ma_buu_gui, 'CN-JULY-1');

    const allRows = await all('SELECT * FROM network_delivery_point');
    assert.equal(allRows.length, 2, 'no cross-month overwrite or mixing');

    const archives = await all("SELECT * FROM network_import_archive WHERE module = 'delivery_route'");
    assert.equal(archives.length, 2, 'both months archived independently');
});
