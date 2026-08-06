/**
 * NetworkImportController — NETWORK-MANAGEMENT-001 Phase 3 (Import/Export).
 *
 * Admin-only (enforced by route middleware, not just here). Preview never
 * writes to a business table; Confirm re-validates the session server-side
 * and never trusts client-echoed parsed data.
 */

'use strict';

const xlsx = require('xlsx');
const { withTransaction } = require('../services/networkMapImport/transactionHelper');
const { computeFingerprint, isFingerprintAlreadyImported } = require('../services/networkMapImport/fingerprint');
const { createSession, getSession, deleteSession } = require('../services/networkMapImport/importSession');
const { all } = require('../config/db');
const { rollbackImport } = require('../services/networkMapImport/rollbackService');

const { parseServicePointsWorkbook } = require('../services/networkMapSeed/parseServicePointsExcel');
const { classifyServicePoints, hasBlockingError: hasServicePointError, applyServicePointsImport } = require('../services/networkMapImport/servicePointsImport');

const { parseLevel2RoutesImportWorkbook, groupStopRowsByRoute } = require('../services/networkMapImport/parseLevel2RoutesImportExcel');
const { classifyLevel2Routes, applyLevel2RoutesImport } = require('../services/networkMapImport/level2RoutesImport');

const { parseDeliveryRoutesImportWorkbook } = require('../services/networkMapImport/parseDeliveryRoutesImportExcel');
const { classifyDeliveryPoints, hasBlockingError: hasDeliveryError, applyDeliveryRoutesImport } = require('../services/networkMapImport/deliveryRoutesImport');

const {
    buildServicePointsExport, buildLevel2RoutesExport, buildDeliveryRoutesExport, buildDeliveryRoutesExportPreviewCount,
} = require('../services/networkMapImport/exportBuilders');

function sendSuccess(res, data, meta) {
    const payload = { success: true, data };
    if (meta !== undefined) payload.meta = meta;
    return res.json(payload);
}

function sendError(res, status, code, message) {
    return res.status(status).json({ success: false, error: { code, message } });
}

function sendWorkbookBuffer(res, buffer, fileName) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
}

// ==================== Mạng điểm phục vụ ====================

async function previewServicePoints(req, res) {
    if (!req.file) return sendError(res, 400, 'MISSING_FILE', 'Thiếu file Excel.');
    try {
        const fingerprint = computeFingerprint(req.file.buffer);
        if (await isFingerprintAlreadyImported('service_point', fingerprint)) {
            return sendError(res, 409, 'DUPLICATE_FILE', 'File này đã được Import trước đó (trùng fingerprint).');
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const { records, warnings } = parseServicePointsWorkbook(workbook);
        const { rows, summary } = await classifyServicePoints(records);

        const sessionToken = await createSession({
            module: 'service_point', fileName: req.file.originalname, fingerprint,
            parsedPayload: records, createdBy: req.auth.user.username,
        });

        return sendSuccess(res, { session_token: sessionToken, rows, summary, warnings, hasBlockingError: hasServicePointError(rows) });
    } catch (error) {
        return sendError(res, 400, 'PARSE_ERROR', error.message);
    }
}

async function confirmServicePoints(req, res) {
    const { session_token: sessionToken } = req.body || {};
    if (!sessionToken) return sendError(res, 400, 'MISSING_SESSION', 'Thiếu session_token.');

    const session = await getSession(sessionToken);
    if (!session || session.module !== 'service_point') {
        return sendError(res, 410, 'SESSION_EXPIRED', 'Phiên Preview đã hết hạn hoặc không hợp lệ. Vui lòng Preview lại.');
    }
    if (await isFingerprintAlreadyImported('service_point', session.file_fingerprint)) {
        return sendError(res, 409, 'DUPLICATE_FILE', 'File này đã được Import trước đó (trùng fingerprint).');
    }

    const { rows } = await classifyServicePoints(session.parsed_payload);
    if (hasServicePointError(rows)) {
        return sendError(res, 422, 'BLOCKING_ERROR', 'File có dòng lỗi — không thể Confirm cho đến khi sửa toàn bộ lỗi.');
    }

    try {
        const result = await withTransaction(async (runInTx) => {
            const logResult = await runInTx(
                `INSERT INTO network_import_log (module, file_name, file_fingerprint, status, total_records, uploaded_by)
                 VALUES ('service_point', ?, ?, 'SUCCESS', ?, ?)`,
                [session.file_name, session.file_fingerprint, rows.length, req.auth.user.username],
            );
            const importLogId = logResult.lastID;
            const applyResult = await applyServicePointsImport(runInTx, importLogId, rows);
            await runInTx(
                'UPDATE network_import_log SET inserted_records = ?, updated_records = ?, skipped_records = ? WHERE id = ?',
                [applyResult.inserted, applyResult.updated, applyResult.skipped, importLogId],
            );
            return { importLogId, ...applyResult };
        });

        await deleteSession(sessionToken);
        return sendSuccess(res, result);
    } catch (error) {
        return sendError(res, 500, 'CONFIRM_FAILED', error.message);
    }
}

async function exportServicePoints(req, res) {
    const { buffer, rowCount } = await buildServicePointsExport();
    res.setHeader('X-Row-Count', String(rowCount));
    return sendWorkbookBuffer(res, buffer, `mang-diem-phuc-vu-export-${Date.now()}.xlsx`);
}

// ==================== Đường thư cấp 2 ====================

async function previewLevel2Routes(req, res) {
    if (!req.file) return sendError(res, 400, 'MISSING_FILE', 'Thiếu file Excel.');
    try {
        const fingerprint = computeFingerprint(req.file.buffer);
        if (await isFingerprintAlreadyImported('level2_route', fingerprint)) {
            return sendError(res, 409, 'DUPLICATE_FILE', 'File này đã được Import trước đó (trùng fingerprint).');
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const { stopRows, warnings } = parseLevel2RoutesImportWorkbook(workbook);
        const groups = groupStopRowsByRoute(stopRows);
        const { routes, summary } = await classifyLevel2Routes(groups);

        const sessionToken = await createSession({
            module: 'level2_route', fileName: req.file.originalname, fingerprint,
            parsedPayload: groups, createdBy: req.auth.user.username,
        });

        return sendSuccess(res, { session_token: sessionToken, routes, summary, warnings });
    } catch (error) {
        return sendError(res, 400, 'PARSE_ERROR', error.message);
    }
}

async function confirmLevel2Routes(req, res) {
    const { session_token: sessionToken, selected_route_keys: selectedRouteKeys } = req.body || {};
    if (!sessionToken) return sendError(res, 400, 'MISSING_SESSION', 'Thiếu session_token.');
    if (!Array.isArray(selectedRouteKeys) || selectedRouteKeys.length === 0) {
        return sendError(res, 400, 'NO_ROUTE_SELECTED', 'Phải chọn ít nhất một hành trình để Confirm.');
    }

    const session = await getSession(sessionToken);
    if (!session || session.module !== 'level2_route') {
        return sendError(res, 410, 'SESSION_EXPIRED', 'Phiên Preview đã hết hạn hoặc không hợp lệ. Vui lòng Preview lại.');
    }
    if (await isFingerprintAlreadyImported('level2_route', session.file_fingerprint)) {
        return sendError(res, 409, 'DUPLICATE_FILE', 'File này đã được Import trước đó (trùng fingerprint).');
    }

    const { routes } = await classifyLevel2Routes(session.parsed_payload);
    const selectedGroups = routes.filter((r) => selectedRouteKeys.includes(r.route_id !== null ? `id:${r.route_id}` : `new:${r.route_name}`));
    if (selectedGroups.some((r) => r.classification === 'error')) {
        return sendError(res, 422, 'BLOCKING_ERROR', 'Một hoặc nhiều hành trình được chọn có lỗi — không thể Confirm cho đến khi sửa.');
    }

    try {
        const result = await withTransaction(async (runInTx) => {
            const logResult = await runInTx(
                `INSERT INTO network_import_log (module, file_name, file_fingerprint, status, total_records, uploaded_by)
                 VALUES ('level2_route', ?, ?, 'SUCCESS', ?, ?)`,
                [session.file_name, session.file_fingerprint, routes.length, req.auth.user.username],
            );
            const importLogId = logResult.lastID;
            const applyResult = await applyLevel2RoutesImport(runInTx, importLogId, routes, selectedRouteKeys);
            await runInTx(
                'UPDATE network_import_log SET inserted_records = ?, updated_records = ?, skipped_records = ? WHERE id = ?',
                [applyResult.routesAdded, applyResult.routesUpdated, applyResult.routesSkipped, importLogId],
            );
            return { importLogId, ...applyResult };
        });

        await deleteSession(sessionToken);
        return sendSuccess(res, result);
    } catch (error) {
        return sendError(res, 500, 'CONFIRM_FAILED', error.message);
    }
}

async function exportLevel2Routes(req, res) {
    const { buffer, rowCount } = await buildLevel2RoutesExport();
    res.setHeader('X-Row-Count', String(rowCount));
    return sendWorkbookBuffer(res, buffer, `duong-thu-cap-2-export-${Date.now()}.xlsx`);
}

// ==================== Sơ đồ tuyến phát ====================

async function previewDeliveryRoutes(req, res) {
    if (!req.file) return sendError(res, 400, 'MISSING_FILE', 'Thiếu file Excel.');
    try {
        const fingerprint = computeFingerprint(req.file.buffer);
        if (await isFingerprintAlreadyImported('delivery_route', fingerprint)) {
            return sendError(res, 409, 'DUPLICATE_FILE', 'File này đã được Import trước đó (trùng fingerprint).');
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const { records, warnings } = parseDeliveryRoutesImportWorkbook(workbook);
        const { rows, summary } = await classifyDeliveryPoints(records);

        const sessionToken = await createSession({
            module: 'delivery_route', fileName: req.file.originalname, fingerprint,
            parsedPayload: records, createdBy: req.auth.user.username,
        });

        return sendSuccess(res, { session_token: sessionToken, summary, warnings, hasBlockingError: hasDeliveryError(rows), rowCount: rows.length });
    } catch (error) {
        return sendError(res, 400, 'PARSE_ERROR', error.message);
    }
}

async function confirmDeliveryRoutes(req, res) {
    const { session_token: sessionToken } = req.body || {};
    if (!sessionToken) return sendError(res, 400, 'MISSING_SESSION', 'Thiếu session_token.');

    const session = await getSession(sessionToken);
    if (!session || session.module !== 'delivery_route') {
        return sendError(res, 410, 'SESSION_EXPIRED', 'Phiên Preview đã hết hạn hoặc không hợp lệ. Vui lòng Preview lại.');
    }
    if (await isFingerprintAlreadyImported('delivery_route', session.file_fingerprint)) {
        return sendError(res, 409, 'DUPLICATE_FILE', 'File này đã được Import trước đó (trùng fingerprint).');
    }

    const { rows } = await classifyDeliveryPoints(session.parsed_payload);
    if (hasDeliveryError(rows)) {
        return sendError(res, 422, 'BLOCKING_ERROR', 'File có dòng lỗi — không thể Confirm cho đến khi sửa toàn bộ lỗi.');
    }

    try {
        const result = await withTransaction(async (runInTx) => {
            const logResult = await runInTx(
                `INSERT INTO network_import_log (module, file_name, file_fingerprint, status, total_records, uploaded_by)
                 VALUES ('delivery_route', ?, ?, 'SUCCESS', ?, ?)`,
                [session.file_name, session.file_fingerprint, rows.length, req.auth.user.username],
            );
            const importLogId = logResult.lastID;
            const applyResult = await applyDeliveryRoutesImport(runInTx, importLogId, rows);
            await runInTx(
                'UPDATE network_import_log SET inserted_records = ?, updated_records = ?, skipped_records = ? WHERE id = ?',
                [applyResult.inserted, applyResult.updated, applyResult.skipped, importLogId],
            );
            return { importLogId, ...applyResult };
        });

        await deleteSession(sessionToken);
        return sendSuccess(res, result);
    } catch (error) {
        return sendError(res, 500, 'CONFIRM_FAILED', error.message);
    }
}

async function exportDeliveryRoutesPreview(req, res) {
    const { from, to, all: exportAll } = req.query;
    const isAll = exportAll === 'true';
    if (!isAll && (!from || !to)) {
        return sendError(res, 400, 'MISSING_RANGE', 'Phải cung cấp from/to hoặc all=true.');
    }
    const rowCount = await buildDeliveryRoutesExportPreviewCount({ from, to, all: isAll });
    return sendSuccess(res, { rowCount });
}

async function exportDeliveryRoutes(req, res) {
    const { from, to, all: exportAll } = req.query;
    const isAll = exportAll === 'true';
    if (!isAll && (!from || !to)) {
        return sendError(res, 400, 'MISSING_RANGE', 'Phải cung cấp from/to hoặc all=true.');
    }
    const { buffer, rowCount } = await buildDeliveryRoutesExport({ from, to, all: isAll });
    res.setHeader('X-Row-Count', String(rowCount));
    return sendWorkbookBuffer(res, buffer, `tuyen-phat-export-${Date.now()}.xlsx`);
}

// ==================== History / Rollback (shared) ====================

async function importHistory(req, res) {
    const { module } = req.params;
    const rows = await all(
        'SELECT * FROM network_import_log WHERE module = ? ORDER BY id DESC LIMIT 200',
        [module],
    );
    return sendSuccess(res, rows);
}

async function rollback(req, res) {
    const importLogId = Number(req.params.importLogId);
    if (!Number.isInteger(importLogId)) {
        return sendError(res, 400, 'INVALID_ID', 'import log id không hợp lệ.');
    }
    const result = await rollbackImport(importLogId, req.auth.user.username);
    if (!result.success) {
        const statusByCode = { IMPORT_LOG_NOT_FOUND: 404, NOT_ROLLBACKABLE: 409, BLOCKED_BY_LATER_IMPORT: 409 };
        return sendError(res, statusByCode[result.code] || 400, result.code, result.message);
    }
    return sendSuccess(res, result);
}

module.exports = {
    previewServicePoints, confirmServicePoints, exportServicePoints,
    previewLevel2Routes, confirmLevel2Routes, exportLevel2Routes,
    previewDeliveryRoutes, confirmDeliveryRoutes, exportDeliveryRoutes, exportDeliveryRoutesPreview,
    importHistory, rollback,
};
