/**
 * PostmanCatalogController — F13-ROUTE-POSTMAN-IDENTITY-01 Phase 1.
 *
 * Rà soát danh mục bưu tá: directory list, unnamed-codes reconciliation,
 * conflict queue, import preview/confirm, manual edit, conflicts resolve,
 * history, rollback. Read = admin+viewer, write = admin-only (enforced by
 * route middleware, matching the rest of Quản lý mạng lưới — no new RBAC).
 */

'use strict';

const crypto = require('crypto');
const { withTransaction } = require('../services/networkMapImport/transactionHelper');
const { parseDanhBaBuuTaBuffer } = require('../services/postmanCatalog/parseDanhBaBuuTaExcel');
const { classifyPostmanCatalogImport, applyPostmanCatalogImport } = require('../services/postmanCatalog/postmanCatalogImport');
const {
    listDirectory, listOpenConflicts, listHistory, manualUpsert, resolveConflict, rollbackBatch,
} = require('../services/postmanCatalog/postmanCatalogService');
const { listUnnamedPostmen } = require('../services/postmanCatalog/unnamedPostmenService');
const { createSession, getSession, deleteSession } = require('../services/postmanCatalog/previewSessionCache');

function sendSuccess(res, data, meta) {
    const payload = { success: true, data };
    if (meta !== undefined) payload.meta = meta;
    return res.json(payload);
}

function sendError(res, status, code, message) {
    return res.status(status).json({ success: false, error: { code, message } });
}

async function getDirectory(req, res) {
    const rows = await listDirectory({ search: req.query.search, ma_bcvh: req.query.ma_bcvh });
    return sendSuccess(res, rows);
}

async function getUnnamed(req, res) {
    const rows = await listUnnamedPostmen({
        from_date: req.query.from_date, to_date: req.query.to_date, ma_bcvh: req.query.ma_bcvh,
    });
    return sendSuccess(res, rows);
}

async function getConflicts(req, res) {
    const rows = await listOpenConflicts();
    return sendSuccess(res, rows);
}

async function getHistory(req, res) {
    const rows = await listHistory(req.query.limit);
    return sendSuccess(res, rows);
}

async function previewImport(req, res) {
    if (!req.file) return sendError(res, 400, 'MISSING_FILE', 'Thiếu file Excel.');
    try {
        const fileFingerprint = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
        const { records, rejected, stats } = parseDanhBaBuuTaBuffer(req.file.buffer);
        const { summary } = await classifyPostmanCatalogImport(records);

        const sessionToken = createSession({ fileName: req.file.originalname, fileFingerprint, records });

        return sendSuccess(res, {
            session_token: sessionToken,
            summary,
            rejected,
            stats,
            hasBlockingError: false, // rejected rows never block Confirm — they are reported, not fatal (§7)
        });
    } catch (error) {
        return sendError(res, 400, 'PARSE_ERROR', error.message);
    }
}

async function confirmImport(req, res) {
    const { session_token: sessionToken } = req.body || {};
    if (!sessionToken) return sendError(res, 400, 'MISSING_SESSION', 'Thiếu session_token.');

    const session = getSession(sessionToken);
    if (!session) {
        return sendError(res, 410, 'SESSION_EXPIRED', 'Phiên Preview đã hết hạn hoặc không hợp lệ. Vui lòng Preview lại.');
    }

    try {
        const batchId = `import-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const classified = await classifyPostmanCatalogImport(session.records);
        const counts = await withTransaction((runInTx) => applyPostmanCatalogImport(runInTx, batchId, classified, {
            fileName: session.fileName,
            fileFingerprint: session.fileFingerprint,
            performedBy: req.auth.user.username,
        }));

        deleteSession(sessionToken);
        return sendSuccess(res, { batch_id: batchId, summary: classified.summary, ...counts });
    } catch (error) {
        return sendError(res, 500, 'CONFIRM_FAILED', error.message);
    }
}

async function putManual(req, res) {
    try {
        const row = await manualUpsert(req.params.ma_buu_ta, req.body || {}, req.auth.user.username);
        return sendSuccess(res, row);
    } catch (error) {
        const statusByCode = { MISSING_CODE: 400, MISSING_NAME: 400 };
        return sendError(res, statusByCode[error.code] || 500, error.code || 'MANUAL_EDIT_FAILED', error.message);
    }
}

async function postResolveConflict(req, res) {
    try {
        const row = await resolveConflict(Number(req.params.id), req.body?.decision, req.auth.user.username);
        return sendSuccess(res, row);
    } catch (error) {
        const statusByCode = { INVALID_DECISION: 400, CONFLICT_NOT_FOUND: 404 };
        return sendError(res, statusByCode[error.code] || 500, error.code || 'RESOLVE_FAILED', error.message);
    }
}

async function postRollback(req, res) {
    const result = await rollbackBatch(req.params.batchId, req.auth.user.username);
    if (!result.success) {
        const statusByReason = { BATCH_NOT_FOUND: 404, BLOCKED_BY_LATER_BATCH: 409 };
        return sendError(res, statusByReason[result.reason] || 400, result.reason, `Không thể rollback batch "${req.params.batchId}".`);
    }
    return sendSuccess(res, result);
}

module.exports = {
    getDirectory,
    getUnnamed,
    getConflicts,
    getHistory,
    previewImport,
    confirmImport,
    putManual,
    postResolveConflict,
    postRollback,
};
