'use strict';

const { DkclHueF13SyncService } = require('../services/dkclHueF13SyncService');
const { DkclHueF13PortalClient } = require('../services/dkclHueF13PortalClient');
const { DkclHueF13BackfillService } = require('../services/dkclHueF13BackfillService');

const service = new DkclHueF13SyncService({
    portalClient: new DkclHueF13PortalClient({
        headless: process.env.DKCL_HUE_HEADLESS !== 'false',
        manualAuthWaitMs: Number(process.env.DKCL_HUE_MANUAL_AUTH_WAIT_MS || 120000)
    })
});
const backfillService = new DkclHueF13BackfillService({ syncService: service });

function statusCodeFor(result) {
    if (result.status === 'IN_PROGRESS') return 409;
    if (result.status === 'ALREADY_COMPLETED') return 200;
    if (result.status === 'AUTHENTICATION_REQUIRED') return 401;
    if (result.status === 'MANUAL_REVIEW_REQUIRED') return 409;
    return 202;
}

class DkclHueF13SyncController {
    async start(req, res) {
        try {
            const result = await service.start(req.body?.measurement_date);
            return res.status(statusCodeFor(result)).json({
                success: result.status !== 'MANUAL_REVIEW_REQUIRED',
                data: result.run,
                status: result.status
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: error.code || 'DKCL_HUE_F13_SYNC_REJECTED',
                    message: error.message || 'Invalid DKCL Hue F1.3 sync request.'
                }
            });
        }
    }

    async getStatus(req, res) {
        const run = service.getRun(req.params.runId);
        if (!run) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'RUN_NOT_FOUND',
                    message: 'DKCL Hue F1.3 sync run was not found.'
                }
            });
        }

        return res.status(200).json({ success: true, data: run });
    }

    async scanMissingDates(req, res) {
        try {
            const data = await backfillService.scanMissingDates({
                fromDate: req.query?.from_date,
                toDate: req.query?.to_date
            });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: error.code || 'HUE_F13_BACKFILL_SCAN_REJECTED',
                    message: error.message || 'Invalid Hue F1.3 backfill scan request.'
                }
            });
        }
    }

    async getCoverageSummary(req, res) {
        try {
            const data = await backfillService.getCoverageSummary({
                fromDate: req.query?.from_date || null,
                toDate: req.query?.to_date || null
            });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: error.code || 'HUE_F13_COVERAGE_REJECTED',
                    message: error.message || 'Invalid Hue F1.3 coverage request.'
                }
            });
        }
    }

    async startBackfillQueue(req, res) {
        try {
            const data = await backfillService.startQueue(req.body?.dates, req.body?.refresh_dates);
            return res.status(202).json({ success: true, data });
        } catch (error) {
            const code = error.code || 'HUE_F13_BACKFILL_QUEUE_REJECTED';
            const status = code === 'QUEUE_ALREADY_ACTIVE' ? 409 : 400;
            return res.status(status).json({
                success: false,
                error: {
                    code,
                    message: error.message || 'Invalid Hue F1.3 backfill queue request.'
                }
            });
        }
    }

    async getBackfillQueue(req, res) {
        const queueId = req.params.queueId || 'active';
        const data = queueId === 'active'
            ? backfillService.getActiveQueue()
            : backfillService.getQueue(queueId);
        if (!data) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'QUEUE_NOT_FOUND',
                    message: 'Hue F1.3 backfill queue was not found.'
                }
            });
        }
        return res.status(200).json({ success: true, data });
    }

    async stopBackfillQueue(req, res) {
        try {
            const data = backfillService.stopQueue(req.params.queueId);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(error.code === 'QUEUE_NOT_FOUND' ? 404 : 400).json({
                success: false,
                error: {
                    code: error.code || 'HUE_F13_BACKFILL_STOP_REJECTED',
                    message: error.message || 'Invalid Hue F1.3 backfill stop request.'
                }
            });
        }
    }

    async retryBackfillQueueItem(req, res) {
        try {
            const data = await backfillService.retryQueueItem(
                req.params.queueId,
                req.body?.measurement_date
            );
            return res.status(202).json({ success: true, data });
        } catch (error) {
            const code = error.code || 'HUE_F13_BACKFILL_RETRY_REJECTED';
            const status = code === 'QUEUE_NOT_FOUND' || code === 'QUEUE_ITEM_NOT_FOUND'
                ? 404
                : (code === 'QUEUE_ALREADY_ACTIVE' ? 409 : 400);
            return res.status(status).json({
                success: false,
                error: {
                    code,
                    message: error.message || 'Invalid Hue F1.3 backfill retry request.'
                }
            });
        }
    }
}

module.exports = new DkclHueF13SyncController();
