'use strict';

// HANGTON-INVENTORY-01 - mounted at /api/import/hangton by importRoutes.js, which already puts every route behind
// the admin guard: this router adds no guard of its own.
//   GET    /status               today's slots, extra points and the last 7 days
//   POST   /snapshots            { kind: 'MANUAL' } extra point | { kind: 'MAKEUP', slot: '0730'|'1130'|'2100' } fill a missed slot
//   DELETE /snapshots/:id        delete an extra point or a make-up (never a scheduled snapshot)
const express = require('express');
const service = require('../services/hangtonInventory/hangtonImportService');
const { fetchStockData } = require('../services/hangtonInventory/client');

const ERRORS = Object.freeze({
    HANGTON_BUSY: [409, 'Đang có một lần lấy dữ liệu khác chạy, thử lại sau ít giây.'],
    HANGTON_SLOT_EXISTS: [409, 'Khung giờ này đã có snapshot, không ghi đè.'],
    HANGTON_SLOT_NOT_DUE: [409, 'Khung giờ này chưa đến, chưa thể lấy bù.'],
    HANGTON_BAD_SLOT: [400, 'Khung giờ lấy bù phải là 07:30, 11:30 hoặc 21:00.'],
    HANGTON_NOT_FOUND: [404, 'Không tìm thấy snapshot.'],
    HANGTON_NOT_DELETABLE: [403, 'Chỉ xóa được mốc thủ công hoặc mốc lấy bù, không xóa mốc của lịch.'],
    HANGTON_CREDENTIALS_MISSING: [503, 'Chưa cấu hình tài khoản đăng nhập hangton trên máy chủ.'],
    HANGTON_NO_SESSION_COOKIE: [502, 'Đăng nhập hangton không trả về phiên làm việc.'],
    HANGTON_DATA_SHAPE: [502, 'Hangton trả dữ liệu không đúng dạng.'],
});

function describeError(error) {
    const code = String(error?.message || '');
    if (ERRORS[code]) return ERRORS[code];
    if (code.startsWith('HANGTON_LOGIN_FAILED')) return [502, 'Đăng nhập hangton thất bại (sai tài khoản hoặc cổng từ chối).'];
    if (code.startsWith('HANGTON_DATA_FAILED')) return [502, 'Hangton không trả dữ liệu (cổng lỗi hoặc đang bận).'];
    if (error?.name === 'TimeoutError' || /abort|timeout/i.test(code)) return [504, 'Hangton không phản hồi kịp, thử lại sau.'];
    return [500, code || 'Lỗi không xác định.'];
}

function createHangtonImportRouter({ db = require('../config/db'), fetchStock = () => fetchStockData(), now = () => new Date() } = {}) {
    const router = express.Router();
    const actorOf = (req) => req.auth?.user?.username || req.auth?.user?.id || null;
    const send = (res, promise) => promise
        .then((data) => res.json({ success: true, data }))
        .catch((error) => {
            const [status, message] = describeError(error);
            res.status(status).json({ success: false, error: { code: String(error?.message || 'HANGTON_ERROR'), message } });
        });

    router.get('/status', (req, res) => send(res, service.importStatus(db, now())));

    router.post('/snapshots', (req, res) => {
        const kind = String(req.body?.kind || '').toUpperCase();
        if (kind === 'MANUAL') {
            return send(res, service.runManualSnapshot({ db, fetchStock, actor: actorOf(req), now: now() }));
        }
        if (kind === 'MAKEUP') {
            return send(res, service.runMakeupSnapshot({ db, fetchStock, slot: String(req.body?.slot || ''), actor: actorOf(req), now: now() }));
        }
        return res.status(400).json({ success: false, error: { code: 'BAD_KIND', message: "kind phải là 'MANUAL' hoặc 'MAKEUP'." } });
    });

    router.delete('/snapshots/:id', (req, res) => send(res, service.deleteExtraSnapshot(db, req.params.id)));

    return router;
}

module.exports = createHangtonImportRouter;
module.exports.createHangtonImportRouter = createHangtonImportRouter;
module.exports.describeError = describeError;
