'use strict';

// HANGTON-INVENTORY-01 phase 2 - mounted at /api/hangton (server.js).
// Reads: admin + viewer. Manual snapshot run: admin only.
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { SLOTS } = require('../services/hangtonInventory/scope');
const inventory = require('../services/hangtonInventory/compareService');
const { takeSnapshot } = require('../services/hangtonInventory/snapshotService');
const { fetchStockData } = require('../services/hangtonInventory/client');

function createHangtonRouter({ db = require('../config/db'), fetchStock = () => fetchStockData() } = {}) {
    const router = express.Router();
    const read = [requireAuth, requireRole(['admin', 'viewer'])];
    const fail = (res, status, code, message) => res.status(status).json({ success: false, error: { code, message } });
    const wrap = (handler) => (req, res) => handler(req, res).catch((error) => fail(res, 500, 'HANGTON_ERROR', error.message));

    router.get('/snapshots', ...read, wrap(async (req, res) => {
        res.json({ success: true, data: await inventory.listSnapshots(db, { limit: Math.min(Number(req.query.limit) || 90, 400) }) });
    }));

    // Overview of one snapshot: ?id= or ?date=YYYY-MM-DD&slot=0730 (defaults: newest day, 0730 else latest slot).
    router.get('/overview', ...read, wrap(async (req, res) => {
        const snapshot = await inventory.resolveSnapshot(db, req.query);
        if (!snapshot) return fail(res, 404, 'NO_SNAPSHOT', 'Chưa có snapshot hàng tồn.');
        res.json({ success: true, data: { snapshot, ...(await inventory.overview(db, snapshot.id)) } });
    }));

    // Parcel list of one snapshot (Chi tiết): ?id|date&slot, ?office=, ?min_rank= (e.g. 5), ?status=, ?sort=rank|office|cod, ?limit&offset.
    router.get('/items', ...read, wrap(async (req, res) => {
        const snapshot = await inventory.resolveSnapshot(db, req.query);
        if (!snapshot) return fail(res, 404, 'NO_SNAPSHOT', 'Chưa có snapshot hàng tồn.');
        const { office, min_rank: minRank, status, sort, limit, offset } = req.query;
        res.json({ success: true, data: { snapshot, ...(await inventory.items(db, snapshot.id, { office, minRank, status, sort, limit, offset })) } });
    }));

    // Parcel-level comparison. to = ?id|date+slot (default newest); from = ?from_id, or ?base_date/?base_slot,
    // default = the same slot on the closest earlier day. ?detail=1 adds the resolved / aged_up / new lists.
    router.get('/compare', ...read, wrap(async (req, res) => {
        const to = await inventory.resolveSnapshot(db, req.query);
        if (!to) return fail(res, 404, 'NO_SNAPSHOT', 'Chưa có snapshot hàng tồn.');
        const from = req.query.from_id
            ? await inventory.getSnapshot(db, Number(req.query.from_id))
            : await inventory.resolveDefaultBase(db, to, { baseDate: req.query.base_date, baseSlot: req.query.base_slot });
        if (!from) return fail(res, 404, 'NO_BASE_SNAPSHOT', 'Chưa có snapshot mốc so sánh (cùng khung giờ ngày trước).');
        const data = await inventory.compare(db, from.id, to.id, { detail: req.query.detail === '1' });
        res.json({ success: true, data: { from, to, ...data } });
    }));

    router.post('/snapshots/run', requireAuth, requireRole(['admin']), wrap(async (req, res) => {
        const slot = String(req.body?.slot || '');
        if (!SLOTS.includes(slot)) return fail(res, 400, 'BAD_SLOT', `slot phải là một trong ${SLOTS.join(', ')}`);
        res.json({ success: true, data: await takeSnapshot({ db, fetchStock, slot, trigger: 'MANUAL' }) });
    }));

    return router;
}

module.exports = createHangtonRouter;
module.exports.createHangtonRouter = createHangtonRouter;
