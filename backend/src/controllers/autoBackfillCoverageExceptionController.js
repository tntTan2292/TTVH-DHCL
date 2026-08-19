'use strict';

const { AutoBackfillCoverageExceptionService } = require('../services/autoBackfillCoverageExceptionService');

function createDefaultExceptionService() {
    const { all, get, run } = require('../config/db');
    return new AutoBackfillCoverageExceptionService({ db: { all, get, run } });
}

function requestRoles(req) {
    return [req.auth?.user?.role];
}

function requestActor(req) {
    return req.auth?.user?.username || req.auth?.user?.id || 'authenticated-user';
}

function sendError(res, error) {
    return res.status(error.statusCode || 400).json({
        success: false,
        error: {
            code: error.code || 'AUTO_BACKFILL_COVERAGE_EXCEPTION_REJECTED',
            message: error.message || 'Invalid Auto Backfill coverage exception request.',
        },
    });
}

class AutoBackfillCoverageExceptionController {
    constructor({ exceptionService = null } = {}) {
        this.exceptionService = exceptionService;
    }

    getService() {
        if (!this.exceptionService) this.exceptionService = createDefaultExceptionService();
        return this.exceptionService;
    }

    async list(req, res) {
        try {
            const data = await this.getService().list({
                indicator: req.query?.indicator || null,
                lane: req.query?.lane || null,
                businessDate: req.query?.business_date || null,
                status: req.query?.status || null,
                roles: requestRoles(req),
            });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return sendError(res, error);
        }
    }

    async create(req, res) {
        try {
            const data = await this.getService().create({
                indicator: req.body?.indicator || null,
                lane: req.body?.source_lane || req.body?.lane || null,
                businessDate: req.body?.business_date || null,
                exceptionType: req.body?.exception_type || null,
                reason: req.body?.reason || null,
                evidence: req.body?.evidence ?? null,
                actor: requestActor(req),
                roles: requestRoles(req),
            });
            return res.status(201).json({ success: true, data });
        } catch (error) {
            return sendError(res, error);
        }
    }

    async revoke(req, res) {
        try {
            const data = await this.getService().revoke({
                exceptionId: req.params.exceptionId,
                reason: req.body?.reason || null,
                actor: requestActor(req),
                roles: requestRoles(req),
            });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return sendError(res, error);
        }
    }
}

module.exports = new AutoBackfillCoverageExceptionController();
module.exports.AutoBackfillCoverageExceptionController = AutoBackfillCoverageExceptionController;
