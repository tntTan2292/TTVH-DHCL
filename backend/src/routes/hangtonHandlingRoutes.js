'use strict';

// HANGTON-HANDLING-01 - mounted at /api/hangton/handling (hangtonRoutes.js). Every route needs a signed-in user holding
// the matching capability (roles.js); the offices a user may touch come from req.access.hangton.offices.
const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/authMiddleware');
const { CAPABILITIES, can } = require('../services/auth/access/roles');
const inventory = require('../services/hangtonInventory/compareService');
const handling = require('../services/hangtonInventory/handling/handlingService');
const catalog = require('../services/hangtonInventory/handling/catalog');
const excel = require('../services/hangtonInventory/handling/handlingExcel');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function createHandlingRouter({ db = require('../config/db') } = {}) {
    const router = express.Router();
    const fail = (res, status, code, message, details = null) => res.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } });
    const wrap = (handler) => (req, res) => handler(req, res).catch((error) => {
        if (error instanceof handling.HandlingError) return fail(res, error.status, error.code, error.message, error.details);
        return fail(res, 500, 'HANGTON_HANDLING_ERROR', error.message);
    });
    const needs = (capability) => (req, res, next) => (can(req.access, capability) ? next() : fail(res, 403, 'FORBIDDEN', 'Bạn không có quyền truy cập chức năng này'));
    const view = [requireAuth, needs(CAPABILITIES.HANGTON_HANDLING_VIEW)];
    const write = [requireAuth, needs(CAPABILITIES.HANGTON_HANDLING_WRITE)];
    const approve = [requireAuth, needs(CAPABILITIES.HANGTON_HANDLING_APPROVE)];
    const reasons = [requireAuth, needs(CAPABILITIES.HANGTON_HANDLING_REASONS)];
    const officesOf = (req) => (req.access?.hangton?.offices === 'all' ? null : [...(req.access?.hangton?.offices || [])]);
    const actorOf = (req) => handling.actorOf(req.auth.user);

    router.get('/catalog', ...view, wrap(async (req, res) => {
        res.json({
            success: true,
            data: {
                ...catalog.publicCatalog(),
                min_rank: handling.REVIEW_MIN_RANK,
                can: {
                    write: can(req.access, CAPABILITIES.HANGTON_HANDLING_WRITE),
                    approve: can(req.access, CAPABILITIES.HANGTON_HANDLING_APPROVE),
                    reasons: can(req.access, CAPABILITIES.HANGTON_HANDLING_REASONS),
                },
                position: req.access.position,
                position_label: req.access.positionLabel,
            },
        });
    }));

    // Review statistics of one snapshot (?id | ?date&slot, ?customers=a|b).
    router.get('/stats', ...view, wrap(async (req, res) => {
        const snapshot = await inventory.resolveSnapshot(db, req.query);
        if (!snapshot) return fail(res, 404, 'NO_SNAPSHOT', 'Chưa có snapshot hàng tồn.');
        const data = await handling.stats(db, snapshot, { customers: req.query.customers, offices: officesOf(req), reviewDate: await handling.reviewDateOf(db, snapshot) });
        res.json({ success: true, data: { snapshot: inventory.publicSnapshot(snapshot, officesOf(req)), ...data } });
    }));

    router.get('/history/:itemCode', ...view, wrap(async (req, res) => {
        res.json({ success: true, data: await handling.history(db, String(req.params.itemCode), { offices: officesOf(req) }) });
    }));

    // Audit log, newest first: ?date=YYYY-MM-DD ?office_code= ?actor_id= ?limit ?offset
    router.get('/log', ...view, wrap(async (req, res) => {
        const { date, office_code: officeCode, actor_id: actorId, limit, offset } = req.query;
        res.json({ success: true, data: await handling.listLog(db, { date, officeCode, actorId, offices: officesOf(req), limit, offset }) });
    }));

    // Save reviews. Body: { mode: 'REVIEW'|'KEEP', item_codes: [...], input: {...} } (same answers for every code)
    // or { mode, entries: [{ item_code, input }] } (answers per parcel).
    router.post('/entries', ...write, wrap(async (req, res) => {
        const body = req.body || {};
        const mode = body.mode === 'KEEP' ? 'KEEP' : 'REVIEW'; // 'IMPORT' is only for the Excel upload route
        const entries = Array.isArray(body.entries)
            ? body.entries
            : (Array.isArray(body.item_codes) ? body.item_codes.map((code) => ({ item_code: code, input: body.input })) : []);
        res.json({ success: true, data: await handling.recordEntries(db, { entries, mode, actor: actorOf(req) }) });
    }));

    // Excel to fill in: same filters as the parcel list (?office ?min_rank ?levels ?customers ?review), newest snapshot by default.
    router.get('/template', ...write, wrap(async (req, res) => {
        const snapshot = await inventory.resolveSnapshot(db, req.query);
        if (!snapshot) return fail(res, 404, 'NO_SNAPSHOT', 'Chưa có snapshot hàng tồn.');
        const { office, min_rank: minRank, levels, customers, status, review, q } = req.query;
        const reviewDate = await handling.reviewDateOf(db, snapshot);
        const { rows, total } = await inventory.items(db, snapshot.id, {
            office, offices: officesOf(req), minRank: minRank ?? handling.REVIEW_MIN_RANK, levels, customers, status, review, q, reviewDate, limit: handling.MAX_BATCH, offset: 0,
        });
        const writable = rows.filter((row) => handling.canWriteOffice(req.access, row.office_code));
        const buffer = await excel.buildTemplate(await handling.decorateItems(db, writable, reviewDate, snapshot.business_date));
        // the file holds at most MAX_BATCH parcels: say so when the filter has more
        res.setHeader('X-Rows-Total', String(total));
        res.setHeader('X-Rows-Included', String(writable.length));
        res.setHeader('Content-Disposition', `attachment; filename="Xu_ly_ton_${snapshot.business_date}.xlsx"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Rows-Total, X-Rows-Included');
        res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(buffer);
    }));

    router.post('/import', ...write, upload.single('file'), wrap(async (req, res) => {
        if (!req.file) return fail(res, 400, 'NO_FILE', 'Chưa chọn file Excel.');
        let parsed;
        try {
            parsed = excel.parseUpload(req.file.buffer);
        } catch (error) {
            return fail(res, 400, 'BAD_FILE', 'Không đọc được file Excel.');
        }
        if (parsed.entries.length === 0) return fail(res, 400, 'EMPTY_FILE', 'File không có dòng nào được điền nội dung xử lý.');
        const result = await handling.recordEntries(db, { entries: parsed.entries, mode: 'IMPORT', actor: actorOf(req) });
        res.json({ success: true, data: { ...result, ignored_rows: parsed.ignored } });
    }));

    // Edit requests for entries of past days.
    router.post('/edit-requests', ...write, wrap(async (req, res) => {
        const { log_id: logId, input, reason } = req.body || {};
        res.status(201).json({ success: true, data: await handling.createEditRequest(db, { logId, input, reason, actor: actorOf(req) }) });
    }));
    router.get('/edit-requests', ...view, wrap(async (req, res) => {
        res.json({ success: true, data: await handling.listEditRequests(db, { status: req.query.status, actor: actorOf(req) }) });
    }));
    router.post('/edit-requests/:id/decision', ...approve, wrap(async (req, res) => {
        const { approve: approved, note } = req.body || {};
        res.json({ success: true, data: await handling.decideEditRequest(db, { id: req.params.id, approve: approved === true, note, actor: actorOf(req) }) });
    }));

    // "Gom nhóm lý do"
    router.get('/reasons/ungrouped', ...reasons, wrap(async (req, res) => {
        res.json({ success: true, data: await handling.ungroupedReasons(db, { kind: req.query.kind, offices: officesOf(req) }) });
    }));
    router.get('/reasons/groups', ...reasons, wrap(async (req, res) => {
        const kind = String(req.query.kind || '');
        if (!catalog.KINDS.includes(kind)) return fail(res, 400, 'BAD_KIND', 'Loại nội dung không hợp lệ.');
        res.json({ success: true, data: await handling.groupChoices(db, kind) });
    }));
    router.post('/reasons/map', ...reasons, wrap(async (req, res) => {
        const { kind, text, group_code: groupCode, new_group_label: newGroupLabel } = req.body || {};
        res.json({ success: true, data: await handling.mapReason(db, { kind, text, groupCode, newGroupLabel, actor: actorOf(req) }) });
    }));

    return router;
}

module.exports = createHandlingRouter;
module.exports.createHandlingRouter = createHandlingRouter;
