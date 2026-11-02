'use strict';

// F13-V2-STRUCTURE-01: handlers of /api/f13/v2. Scope comes from requireModule('f13') (req.scope); a BCVH filter goes
// through resolveBcvh like every other single-unit F1.3 endpoint, so a client value can narrow the scope, never widen it.

const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');
const f13DashboardService = require('../services/F13DashboardService');
const { layoutFor } = require('../services/f13v2/blockRegistry');
const { resolvePeriod } = require('../services/f13v2/periodResolve');
const { DaySummaryService } = require('../services/f13v2/DaySummaryService');
const { resolveBcvh, sendIfOutOfScope } = require('../middleware/accessScope');

const daySummaryService = new DaySummaryService({ repository: factBuuGuiRepo, dashboardService: f13DashboardService });

const BAD_REQUEST_CODES = new Set([
    'NO_DATA', 'INVALID_KIND', 'INVALID_DATE', 'INVALID_RANGE', 'RANGE_TOO_LONG', 'INVALID_BCVH', 'INVALID_WEEK_ID', 'INVALID_MONTH_ID', 'MISSING_PARAM',
]);

function sendError(res, error) {
    if (sendIfOutOfScope(res, error)) return;
    const status = BAD_REQUEST_CODES.has(error?.code) ? 400 : 500;
    res.status(status).json({ success: false, error: { code: error?.code || 'SERVER_ERROR', message: error.message } });
}

class F13V2Controller {
    async getLayout(req, res) {
        try {
            res.status(200).json({ success: true, data: layoutFor(req.scope) });
        } catch (error) {
            sendError(res, error);
        }
    }

    async resolvePeriod(req, res) {
        try {
            const { kind, value } = req.query;
            if (!kind || (kind !== 'latest' && !value)) {
                const error = new Error('Yêu cầu kind (và value, trừ kind=latest)');
                error.code = 'MISSING_PARAM';
                throw error;
            }
            const latestDate = await factBuuGuiRepo.getLatestBcvhDataDateInRange('2000-01-01', '2100-12-31');
            res.status(200).json({ success: true, data: resolvePeriod({ kind, value: value === undefined ? undefined : String(value), latestDate }) });
        } catch (error) {
            sendError(res, error);
        }
    }

    async getDaySummary(req, res) {
        try {
            const { from, to, ma_bcvh: maBcvh } = req.query;
            if (!from || !to) {
                const error = new Error('Yêu cầu from và to');
                error.code = 'MISSING_PARAM';
                throw error;
            }
            const bcvhId = resolveBcvh(req, maBcvh && maBcvh !== 'all' ? String(maBcvh) : null);
            const result = await daySummaryService.getSummary(String(from), String(to), { bcvhId });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            sendError(res, error);
        }
    }
}

module.exports = new F13V2Controller();
