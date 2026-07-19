'use strict';

const { DkclHueF13SyncService } = require('../services/dkclHueF13SyncService');
const { DkclHueF13PortalClient } = require('../services/dkclHueF13PortalClient');

const service = new DkclHueF13SyncService({
    portalClient: new DkclHueF13PortalClient({
        headless: process.env.DKCL_HUE_HEADLESS !== 'false',
        manualAuthWaitMs: Number(process.env.DKCL_HUE_MANUAL_AUTH_WAIT_MS || 120000)
    })
});

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
}

module.exports = new DkclHueF13SyncController();
