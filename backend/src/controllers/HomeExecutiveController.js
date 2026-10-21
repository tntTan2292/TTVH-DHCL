'use strict';

// HOME-BI-01 (B1) - HTTP layer of the executive Home page (mounted at /api/home by homeRoutes.js).
// Read-only; the response contract is documented in docs/10_TICKETS/HOME-BI-01_MANIFEST.md Section 7.

const { homeExecutiveService } = require('../services/HomeExecutiveService');

const BAD_REQUEST_CODES = new Set(['INVALID_DATE', 'INVALID_RANGE', 'MISSING_PARAM', 'INVALID_INDICATOR']);

function fail(res, error) {
    const code = error?.code || 'SERVER_ERROR';
    const status = BAD_REQUEST_CODES.has(code) ? 400 : 500;
    res.status(status).json({ success: false, error: { code, message: error.message } });
}

// offset = how many periods back from the latest one (0, -1, -2 ...); anything else is rejected by the service.
function parseOffset(value) {
    if (value === undefined || value === null || value === '') return 0;
    return Number(value);
}

function createHomeExecutiveController(service = homeExecutiveService) {
    return {
        async getExecutive(req, res) {
            try {
                const data = await service.getExecutive({
                    anchorDate: req.query.anchor_date || null,
                    period: req.query.period || 'day',
                    offset: parseOffset(req.query.offset),
                });
                res.status(200).json({ success: true, data });
            } catch (error) { fail(res, error); }
        },

        async getNationalRanking(req, res) {
            try {
                const data = await service.getNationalRanking({
                    indicator: req.query.indicator,
                    period: req.query.period || 'day',
                    anchorDate: req.query.anchor_date || null,
                    fromDate: req.query.from_date || null,
                    toDate: req.query.to_date || null,
                    offset: parseOffset(req.query.offset),
                });
                res.status(200).json({ success: true, data });
            } catch (error) { fail(res, error); }
        },
    };
}

module.exports = { createHomeExecutiveController, ...createHomeExecutiveController() };
