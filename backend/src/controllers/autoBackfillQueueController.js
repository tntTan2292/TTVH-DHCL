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
                // IMPORT-BULK-REIMPORT-ALL-01 Part A (Design of Record v2 §7.2)
                confirmReplaceCompleted: Boolean(req.body?.confirm_replace_completed),
                // IMPORT-LOG-AUDIT-01 Part B: chosen day + the two days before it, all indicators, both lanes.
                anchorDate: req.body?.anchor_date || null,
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
            const service = this.getService();
            const data = await service.listRuns({
                status: req.query?.status || null,
                limit: req.query?.limit,
                offset: req.query?.offset,
                roles: requestRoles(req),
            });
            // total = how many runs match the status filter (the list itself is capped by `limit`)
            const statuses = req.query?.status
                ? String(req.query.status).split(',').map((value) => value.trim().toUpperCase()).filter(Boolean)
                : undefined;
            const total = typeof service.store?.countRuns === 'function' ? await service.store.countRuns({ statuses }) : data.length;
            return res.status(200).json({ success: true, data: { runs: data, total } });
        } catch (error) {
            return sendError(res, error);
        }
    }

    // AUTO-IMPORT-LOG-01: GET /import/auto-backfill/jobs -- the complete job log, filterable and paged.
    async listJobs(req, res) {
        try {
            const query = req.query || {};
            const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
            for (const key of ['business_date_from', 'business_date_to', 'created_from', 'created_to']) {
                if (query[key] && !ISO_DATE.test(String(query[key]))) {
                    return res.status(400).json({ success: false, error: { code: 'INVALID_DATE', message: `${key} must be YYYY-MM-DD.` } });
                }
            }
            // created_from / created_to are Vietnam days: [from 00:00, to + 1 day 00:00) in UTC
            const vnStart = (day) => new Date(`${day}T00:00:00+07:00`).toISOString();
            const vnNextDayStart = (day) => new Date(new Date(`${day}T00:00:00+07:00`).getTime() + 24 * 3600 * 1000).toISOString();
            const data = await this.getService().listJobs({
                businessDateFrom: query.business_date_from || null,
                businessDateTo: query.business_date_to || null,
                indicator: query.indicator ? String(query.indicator).toUpperCase() : null,
                lane: query.lane ? String(query.lane).toUpperCase() : null,
                states: query.state ? String(query.state).split(',').map((value) => value.trim().toUpperCase()).filter(Boolean) : [],
                actor: query.actor || null,
                importMode: query.import_mode ? String(query.import_mode).toUpperCase() : null,
                runId: query.run_id || null,
                createdFrom: query.created_from ? vnStart(query.created_from) : null,
                createdTo: query.created_to ? vnNextDayStart(query.created_to) : null,
                limit: query.pageSize || query.limit,
                offset: query.offset !== undefined ? query.offset : (Math.max(Number(query.page) || 1, 1) - 1) * (Math.min(Math.max(Number(query.pageSize || query.limit) || 50, 1), 200)),
            }, { roles: requestRoles(req) });
            return res.status(200).json({ success: true, data });
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
