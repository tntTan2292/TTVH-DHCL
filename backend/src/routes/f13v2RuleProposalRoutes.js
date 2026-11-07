'use strict';

// F13-RULE-PROPOSAL-01 (G3): Chuyên quản corrections grouped as rule proposals and the PO decisions. Mounted by f13v2Routes at /rule-proposals, so auth, module and scope middleware apply.
// Capabilities f13.rule.view / f13.rule.decide are held by the admin tier only (P5).

const express = require('express');
const { db: sharedDb } = require('../config/db');
const { CAPABILITIES, can } = require('../services/auth/access/roles');
const { RuleProposalService } = require('../services/f13v2/RuleProposalService');

const router = express.Router();
const service = new RuleProposalService({ db: sharedDb });

const needs = (capability) => (req, res, next) => (can(req.access, capability)
    ? next()
    : res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập chức năng này' } }));

const STATUS_BY_CODE = {
    INVALID_FILTER: 400, INVALID_KEY: 400, INVALID_DECISION: 400, NOTE_REQUIRED: 400, NOTE_TOO_LONG: 400, TICKET_REQUIRED: 400, NO_ACTOR: 400,
    PROPOSAL_NOT_FOUND: 404, NOT_APPROVED: 409,
};

function sendError(res, error) {
    const status = STATUS_BY_CODE[error?.code] || 500;
    res.status(status).json({ success: false, error: { code: error?.code || 'SERVER_ERROR', message: error?.message || 'Lỗi hệ thống' } });
}

router.get('/', needs(CAPABILITIES.F13_RULE_VIEW), async (req, res) => {
    try { res.status(200).json({ success: true, data: await service.list(req.query) }); } catch (error) { sendError(res, error); }
});

router.get('/:key', needs(CAPABILITIES.F13_RULE_VIEW), async (req, res) => {
    try { res.status(200).json({ success: true, data: await service.detail(req.params.key) }); } catch (error) { sendError(res, error); }
});

router.post('/:key/decisions', express.json({ limit: '16kb' }), needs(CAPABILITIES.F13_RULE_DECIDE), async (req, res) => {
    try {
        const user = req.auth?.user || {};
        const actor = { id: user.id ?? null, name: user.display_name || user.username || null };
        res.status(201).json({ success: true, data: await service.decide(req.params.key, req.body || {}, actor) });
    } catch (error) { sendError(res, error); }
});

module.exports = router;
