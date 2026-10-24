'use strict';

// HANGTON-INVENTORY-01 phase 2 - mounted at /api/hangton (server.js).
// Reads: admin + viewer. Manual snapshot run: admin only.
// RBAC-01: reads need a Hang ton screen in the user's access and are limited to req.hangtonOffices (office_code).
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireHangton } = require('../middleware/accessScope');
const { SLOTS } = require('../services/hangtonInventory/scope');
const inventory = require('../services/hangtonInventory/compareService');
const { takeSnapshot } = require('../services/hangtonInventory/snapshotService');
const { fetchStockData } = require('../services/hangtonInventory/client');
const { buildItemsXlsx, buildItemsCsv } = require('../services/hangtonInventory/itemsExport');

function createHangtonRouter({ db = require('../config/db'), fetchStock = () => fetchStockData() } = {}) {
    const router = express.Router();
    const read = [requireAuth, requireRole(['admin', 'viewer'])];
    const fail = (res, status, code, message) => res.status(status).json({ success: false, error: { code, message } });
    const wrap = (handler) => (req, res) => handler(req, res).catch((error) => fail(res, 500, 'HANGTON_ERROR', error.message));

    router.get('/snapshots', ...read, requireHangton('overview', 'office', 'compare', 'items'), wrap(async (req, res) => {
        const snapshots = await inventory.listSnapshots(db, { limit: Math.min(Number(req.query.limit) || 90, 400) });
        res.json({ success: true, data: snapshots.map((snapshot) => inventory.publicSnapshot(snapshot, req.hangtonOffices)) });
    }));

    // Overview of one snapshot: ?id= or ?date=YYYY-MM-DD&slot=0730 (defaults: newest day, 0730 else latest slot).
    // Every read below also takes ?customers=KH Mới|KH Shopee (exact Phân Loại KH, "|"-joined; empty = all groups).
    router.get('/overview', ...read, requireHangton('overview', 'office'), wrap(async (req, res) => {
        const snapshot = await inventory.resolveSnapshot(db, req.query);
        if (!snapshot) return fail(res, 404, 'NO_SNAPSHOT', 'Chưa có snapshot hàng tồn.');
        res.json({ success: true, data: { snapshot: inventory.publicSnapshot(snapshot, req.hangtonOffices), ...(await inventory.overview(db, snapshot.id, { customers: req.query.customers, offices: req.hangtonOffices })) } });
    }));

    // Parcel list of one snapshot (Chi tiết): ?id|date&slot, ?office=, ?min_rank= (e.g. 5), ?status=, ?levels=a|b (exact Loại Tồn), ?sort=rank|office|cod|item_code|status|postman|customer, ?dir=asc|desc, ?limit&offset (limit up to 20000).
    router.get('/items', ...read, requireHangton('items', 'office'), wrap(async (req, res) => {
        const snapshot = await inventory.resolveSnapshot(db, req.query);
        if (!snapshot) return fail(res, 404, 'NO_SNAPSHOT', 'Chưa có snapshot hàng tồn.');
        const { office, min_rank: minRank, levels, customers, status, sort, dir, limit, offset } = req.query;
        res.json({ success: true, data: { snapshot: inventory.publicSnapshot(snapshot, req.hangtonOffices), ...(await inventory.items(db, snapshot.id, { office, offices: req.hangtonOffices, minRank, levels, customers, status, sort, dir, limit, offset })) } });
    }));

    // Same filters as /items, but every matching row as a file: ?format=xlsx (default) | csv.
    router.get('/items/export', ...read, requireHangton('items', 'office'), wrap(async (req, res) => {
        const snapshot = await inventory.resolveSnapshot(db, req.query);
        if (!snapshot) return fail(res, 404, 'NO_SNAPSHOT', 'Chưa có snapshot hàng tồn.');
        const { office, min_rank: minRank, levels, customers, status, sort, dir } = req.query;
        const { rows } = await inventory.items(db, snapshot.id, { office, offices: req.hangtonOffices, minRank, levels, customers, status, sort, dir, limit: inventory.ITEMS_MAX_LIMIT, offset: 0 });
        const csv = String(req.query.format).toLowerCase() === 'csv';
        const name = `Hang_ton_${snapshot.business_date}_${snapshot.slot}`;
        res.setHeader('Content-Disposition', `attachment; filename="${name}.${csv ? 'csv' : 'xlsx'}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        if (csv) {
            res.type('text/csv; charset=utf-8').send(buildItemsCsv(rows));
        } else {
            res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(buildItemsXlsx(rows));
        }
    }));

    // Parcel-level comparison. to = ?id|date+slot (default newest); from = ?from_id, or ?base_date/?base_slot,
    // default = the same slot on the closest earlier day. ?detail=1 adds the resolved / aged_up / new lists.
    router.get('/compare', ...read, requireHangton('compare'), wrap(async (req, res) => {
        const to = await inventory.resolveSnapshot(db, req.query);
        if (!to) return fail(res, 404, 'NO_SNAPSHOT', 'Chưa có snapshot hàng tồn.');
        const from = req.query.from_id
            ? await inventory.getSnapshot(db, Number(req.query.from_id))
            : await inventory.resolveDefaultBase(db, to, { baseDate: req.query.base_date, baseSlot: req.query.base_slot });
        if (!from) return fail(res, 404, 'NO_BASE_SNAPSHOT', 'Chưa có snapshot mốc so sánh (cùng khung giờ ngày trước).');
        const data = await inventory.compare(db, from.id, to.id, { detail: req.query.detail === '1', customers: req.query.customers, offices: req.hangtonOffices });
        res.json({ success: true, data: { from: inventory.publicSnapshot(from, req.hangtonOffices), to: inventory.publicSnapshot(to, req.hangtonOffices), ...data } });
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
