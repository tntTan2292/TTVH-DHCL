'use strict';

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
            code: error.code || 'AUTO_BACKFILL_QUEUE_REJECTED',
            message: error.message || 'Invalid Auto Backfill queue request.',
        },
    });
}

class AutoBackfillQueueController {
    constructor({ queueService = null } = {}) {
        this.queueService = queueService;
    }

    getService() {
        if (!this.queueService) {
            this.queueService = require('../services/autoBackfillQueueRuntime').getAutoBackfillQueueService();
        }
        return this.queueService;
    }

    async createRun(req, res) {
        if (Object.hasOwn(req.body || {}, 'as_of') || Object.hasOwn(req.query || {}, 'as_of')) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'AUTO_BACKFILL_AS_OF_NOT_ALLOWED',
                    message: 'as_of is not allowed; queue coverage always uses the backend business clock in Asia/Ho_Chi_Minh.',
                },
            });
        }
        try {
            const data = await this.getService().createRun({
                indicator: req.body?.indicator || null,
                lane: req.body?.lane || null,
                fromDate: req.body?.from_date || null,
                toDate: req.body?.to_date || null,
                includeExcluded: Boolean(req.body?.include_excluded),
                actor: requestActor(req),
                roles: requestRoles(req),
            });
            return res.status(data.creation?.created ? 201 : 200).json({ success: true, data });
        } catch (error) {
            return sendError(res, error);
        }
    }

    // AB-AUTH-06 (design Section 5, C1)
    async listRuns(req, res) {
        try {
            const data = await this.getService().listRuns({
                status: req.query?.status || null,
                limit: req.query?.limit,
                offset: req.query?.offset,
                roles: requestRoles(req),
            });
            return res.status(200).json({ success: true, data: { runs: data } });
        } catch (error) {
            return sendError(res, error);
        }
    }

    async getRun(req, res) {
        try {
            const data = await this.getService().getRun(req.params.runId, { roles: requestRoles(req) });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return sendError(res, error);
        }
    }

    async pauseRun(req, res) {
        try {
            const data = await this.getService().pauseRun(req.params.runId, {
                actor: requestActor(req),
                roles: requestRoles(req),
            });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return sendError(res, error);
        }
    }

    async resumeRun(req, res) {
        try {
            const data = await this.getService().resumeRun(req.params.runId, {
                actor: requestActor(req),
                roles: requestRoles(req),
            });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return sendError(res, error);
        }
    }

    async resetCircuits(req, res) {
        try {
            const data = await this.getService().resetCircuits(req.params.runId, {
                actor: requestActor(req),
                roles: requestRoles(req),
            });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return sendError(res, error);
        }
    }

    async getEvents(req, res) {
        try {
            const data = await this.getService().getEvents(req.params.runId, { roles: requestRoles(req) });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return sendError(res, error);
        }
    }

    async getReport(req, res) {
        try {
            const data = await this.getService().getReport(req.params.runId, { roles: requestRoles(req) });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return sendError(res, error);
        }
    }
}

module.exports = new AutoBackfillQueueController();
module.exports.AutoBackfillQueueController = AutoBackfillQueueController;
