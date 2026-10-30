'use strict';

// OPS-JOURNAL-01 -- mounted at /api/ops-journal. Needs a signed-in user (401 otherwise); after that, who may see what is
// decided in services/opsJournal/visibility.js and every refusal is the same 404 as an unknown path or id, so a user
// without the right learns nothing about the module. Nothing here is cacheable.
const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const visibility = require('../services/opsJournal/visibility');
const candidateService = require('../services/opsJournal/candidateService');
const journal = require('../services/opsJournal/journalService');
const exporter = require('../services/opsJournal/exportService');
const attachments = require('../services/opsJournal/attachmentService');
const notifications = require('../services/opsJournal/notificationService');
const multer = require('multer');
const fs = require('fs');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: attachments.MAX_BYTES, files: 1 } });

function createOpsJournalRouter({ db = require('../config/db'), adapters = null } = {}) {
    let sourceAdapters = adapters;
    const router = express.Router();
    const notFound = (res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy' } });
    const wrap = (handler) => (req, res) => handler(req, res).catch((error) => {
        if (error instanceof visibility.NotFoundError) return notFound(res);
        if (error instanceof candidateService.DataUpdatingError) return res.status(409).json({ success: false, error: { code: error.code, message: error.message } });
        if (error && error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, error: { code: 'FILE_TOO_BIG', message: 'Tệp quá lớn (tối đa 15 MB).' } });
        if (error && typeof error.code === 'string' && error.code.startsWith('LIMIT_')) return res.status(400).json({ success: false, error: { code: 'BAD_UPLOAD', message: 'Tệp tải lên không hợp lệ.' } });
        if (error instanceof journal.JournalError) return res.status(error.status).json({ success: false, error: { code: error.code, message: error.message } });
        console.error('[ops-journal]', error);
        return res.status(500).json({ success: false, error: { code: 'OPS_JOURNAL_ERROR', message: 'Lỗi hệ thống' } });
    });
    const who = (req) => ({ access: req.access, userId: req.auth.user.id ?? null });
    const adaptersOf = () => {
        if (!sourceAdapters) sourceAdapters = require('../services/HomeExecutiveService').buildDefaultAdapters(db.db);
        return sourceAdapters;
    };
    // manager-only write: the gate runs BEFORE the body is looked at, so a stranger learns nothing from validation errors
    const managerWrite = (handler) => wrap(async (req, res) => {
        visibility.assertManager(who(req));
        res.json({ success: true, data: await handler(req, journal.actorOf(req.auth.user)) });
    });

    // before requireAuth, so even the 401 / password-change answers are no-store and carry no ETag
    router.use((req, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        // res.end skips Express's automatic ETag, so no conditional request can ever answer 304 for a spot
        res.json = (payload) => {
            res.type('application/json; charset=utf-8');
            return res.end(JSON.stringify(payload));
        };
        next();
    });
    router.use(requireAuth);

    // Candidates for the journal day (default: today). Manager only; the figures come from the indicators' own services.
    router.get('/candidates', wrap(async (req, res) => {
        visibility.assertManager(who(req));
        const date = req.query.date ? visibility.asDay(req.query.date) : new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10) /* today in Vietnam */;
        res.json({ success: true, data: await candidateService.buildCandidates({ db, date, adapters: adaptersOf() }) });
    }));

    router.get('/assignable-users', wrap(async (req, res) => {
        visibility.assertManager(who(req));
        res.json({ success: true, data: await journal.assignableUsers(db, { officeCode: req.query.officeCode, indicator: req.query.indicator, all: req.query.all === '1' }) });
    }));

    router.put('/days/:date/spots', managerWrite((req, actor) => journal.selectSpots(db, {
        date: req.params.date, candidateIds: req.body?.candidateIds ?? [], manual: req.body?.manual ?? [], actor, adapters: adaptersOf(),
    })));
    router.post('/days/:date/assign', managerWrite((req, actor) => journal.finalizeSpots(db, { date: req.params.date, spotIds: req.body?.spotIds, actor })));
    router.post('/days/:date/close', managerWrite((req, actor) => journal.closeDay(db, { date: req.params.date, actor })));
    router.delete('/spots/:id', managerWrite((req, actor) => journal.removeSpot(db, { spotId: req.params.id, actor })));
    router.put('/spots/:id/actions', managerWrite((req, actor) => journal.saveActions(db, { spotId: req.params.id, actions: req.body?.actions, actor })));
    router.post('/spots/:id/reopen', managerWrite((req, actor) => journal.reopenSpot(db, { spotId: req.params.id, reason: req.body?.reason, actor })));
    router.put('/spots/:id/closing', managerWrite((req, actor) => journal.saveClosing(db, { spotId: req.params.id, closing: req.body, actor })));
    router.post('/actions/:id/done', managerWrite((req, actor) => journal.markDone(db, { actionId: req.params.id, actor })));

    // Assignee: any signed-in user; the service answers NOT_FOUND unless the row names them on a finalized spot.
    router.post('/actions/:id/report', wrap(async (req, res) => {
        res.json({ success: true, data: await journal.report(db, {
            actionId: req.params.id, status: req.body?.status, causeText: req.body?.causeText, reportText: req.body?.reportText, actor: journal.actorOf(req.auth.user),
        }) });
    }));

    // Evidence files on a report. The right to attach is checked BEFORE the upload body is read, so a stranger cannot make the server
    // buffer 15 MB, and gets the plain 404.
    router.post('/actions/:id/attachments', wrap(async (req, res) => {
        const user = req.auth.user;
        if (!(await attachments.canAttach(db, { actionId: req.params.id, userId: user.id ?? null }))) return notFound(res);
        await new Promise((resolve, reject) => upload.single('file')(req, res, (error) => (error ? reject(error) : resolve())));
        const saved = await attachments.addAttachment(db, { actionId: req.params.id, file: req.file, actor: journal.actorOf(user) });
        res.json({ success: true, data: saved });
    }));
    router.get('/attachments/:id', wrap(async (req, res) => {
        const file = await attachments.readAttachment(db, { attachmentId: req.params.id, userId: req.auth.user.id ?? null, isManager: visibility.isManager(req.access) });
        res.status(200);
        res.setHeader('Content-Type', file.mime);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', `attachment; filename="${file.name.replace(/[^ -~]/g, '_').replace(/"/g, '_')}"; filename*=UTF-8''${encodeURIComponent(file.name)}`);
        res.setHeader('Content-Length', String(file.size));
        fs.createReadStream(file.path).on('error', () => res.destroy()).pipe(res);
    }));
    router.delete('/attachments/:id', wrap(async (req, res) => {
        res.json({ success: true, data: await attachments.removeAttachment(db, { attachmentId: req.params.id, actor: journal.actorOf(req.auth.user) }) });
    }));

    // The user's own notifications (new task, a report came in, a row accepted).
    router.get('/notifications', wrap(async (req, res) => {
        res.json({ success: true, data: await notifications.listNotifications(db, who(req)) });
    }));
    router.post('/notifications/read', wrap(async (req, res) => {
        res.json({ success: true, data: await notifications.markRead(db, { userId: req.auth.user.id ?? null, ids: req.body?.ids, all: req.body?.all === true }) });
    }));

    // One PL06 (Word or PDF) per finalized spot. Manager only; the file is never cached.
    router.get('/spots/:id/export', wrap(async (req, res) => {
        visibility.assertManager(who(req));
        const file = await exporter.exportSpot(db, { spotId: req.params.id, format: req.query.format, user: req.auth.user });
        res.status(200);
        res.setHeader('Content-Type', file.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename.replace(/[^ -~]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
        res.setHeader('Content-Length', String(file.buffer.length));
        res.end(file.buffer);
    }));

    router.get('/days/:date', wrap(async (req, res) => {
        res.json({ success: true, data: await visibility.getDay(db, who(req), req.params.date) });
    }));

    router.get('/spots/:id', wrap(async (req, res) => {
        res.json({ success: true, data: await visibility.getSpot(db, who(req), req.params.id) });
    }));

    router.get('/my-tasks', wrap(async (req, res) => {
        res.json({ success: true, data: await visibility.listMyTasks(db, who(req)) });
    }));

    // Any other path or method: the same answer as a refused one.
    router.use((req, res) => notFound(res));

    return router;
}

module.exports = createOpsJournalRouter;
