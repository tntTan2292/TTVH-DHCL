'use strict';

// TIME-AXIS-TEMPLATE-01: the F1.3 Theo ngày / tuần / tháng template for another indicator, mounted at /api/<indicator>/v2.
// Same middleware order as f13v2Routes. The blocks read the indicator's existing endpoints; only these three are added.

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { cachedRead } = require('../middleware/responseCache');
const { requireModule, resolveBcvh, sendIfOutOfScope } = require('../middleware/accessScope');
const { scopeBcvhResponse } = require('../services/auth/access/scopeResponse');
const { layoutFor } = require('../services/f13v2/blockRegistry');
const { resolvePeriod } = require('../services/f13v2/periodResolve');
const { daysInclusive, MAX_RANGE_DAYS } = require('../services/f13v2/DaySummaryService');

const BAD_REQUEST_CODES = new Set([
    'NO_DATA', 'INVALID_KIND', 'INVALID_DATE', 'INVALID_RANGE', 'RANGE_TOO_LONG', 'INVALID_BCVH', 'INVALID_WEEK_ID', 'INVALID_MONTH_ID', 'MISSING_PARAM',
]);

function coded(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function sendError(res, error) {
    if (sendIfOutOfScope(res, error)) return;
    const status = BAD_REQUEST_CODES.has(error?.code) ? 400 : 500;
    res.status(status).json({ success: false, error: { code: error?.code || 'SERVER_ERROR', message: error.message } });
}

/**
 * @param {object} options
 * @param {string} options.indicatorId module key and block list: f11 | f12 | f41 | f42
 * @param {{compareSamePeriod: Function}} options.service the indicator's ranking service
 * @param {() => Promise<string|null>} options.getLatestDate latest measured day of the indicator
 */
function createTimeAxisRoutes({ indicatorId, service, getLatestDate }) {
    const router = express.Router();
    router.use(
        requireAuth,
        requireRole(['admin', 'viewer']),
        requireModule(indicatorId),
        cachedRead({ shouldCache: (req) => req.path === '/day/summary' }),
    );
    router.use(scopeBcvhResponse());

    router.get('/layout', (req, res) => {
        try {
            res.status(200).json({ success: true, data: layoutFor(req.scope, indicatorId) });
        } catch (error) {
            sendError(res, error);
        }
    });

    router.get('/period/resolve', async (req, res) => {
        try {
            const { kind, value } = req.query;
            if (!kind || (kind !== 'latest' && !value)) throw coded('MISSING_PARAM', 'Yêu cầu kind (và value, trừ kind=latest)');
            const latestDate = await getLatestDate();
            res.status(200).json({ success: true, data: resolvePeriod({ kind, value: value === undefined ? undefined : String(value), latestDate }) });
        } catch (error) {
            sendError(res, error);
        }
    });

    // A BCVH-mode account keeps its own row only: no city total.
    router.get('/day/summary', scopeBcvhResponse({ drop: ['data.meta.total_row'] }), async (req, res) => {
        try {
            const { from, to, ma_bcvh: maBcvh } = req.query;
            if (!from || !to) throw coded('MISSING_PARAM', 'Yêu cầu from và to');
            const fromDate = String(from);
            const toDate = String(to);
            const bcvhId = resolveBcvh(req, maBcvh && maBcvh !== 'all' ? String(maBcvh) : null);
            if (/^\d{4}-\d{2}-\d{2}$/.test(fromDate) && /^\d{4}-\d{2}-\d{2}$/.test(toDate) && daysInclusive(fromDate, toDate) > MAX_RANGE_DAYS) {
                throw coded('RANGE_TOO_LONG', `range is limited to ${MAX_RANGE_DAYS} days`);
            }
            res.status(200).json({ success: true, data: await service.compareSamePeriod(fromDate, toDate, { bcvhId }) });
        } catch (error) {
            sendError(res, error);
        }
    });

    return router;
}

module.exports = { createTimeAxisRoutes };
