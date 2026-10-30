'use strict';

// OPS-JOURNAL-01 -- mounted at /api/ops-journal. Needs a signed-in user (401 otherwise); after that, who may see what is
// decided in services/opsJournal/visibility.js and every refusal is the same 404 as an unknown path or id, so a user
// without the right learns nothing about the module. Nothing here is cacheable.
const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const visibility = require('../services/opsJournal/visibility');

function createOpsJournalRouter({ db = require('../config/db') } = {}) {
    const router = express.Router();
    const notFound = (res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy' } });
    const wrap = (handler) => (req, res) => handler(req, res).catch((error) => {
        if (error instanceof visibility.NotFoundError) return notFound(res);
        console.error('[ops-journal]', error);
        return res.status(500).json({ success: false, error: { code: 'OPS_JOURNAL_ERROR', message: 'Lỗi hệ thống' } });
    });
    const who = (req) => ({ access: req.access, userId: req.auth.user.id ?? null });

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
