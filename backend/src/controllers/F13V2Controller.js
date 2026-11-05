'use strict';

// F13-V2-STRUCTURE-01: handlers of /api/f13/v2. Scope comes from requireModule('f13') (req.scope); a BCVH filter goes
// through resolveBcvh like every other single-unit F1.3 endpoint, so a client value can narrow the scope, never widen it.

const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');
const f13DashboardService = require('../services/F13DashboardService');
const { layoutFor } = require('../services/f13v2/blockRegistry');
const { resolvePeriod } = require('../services/f13v2/periodResolve');
const { DaySummaryService } = require('../services/f13v2/DaySummaryService');
const { JourneyService } = require('../services/f13v2/JourneyService');
const f13JourneyRepo = require('../repositories/F13JourneyRepository');
const { CauseAggQueryService } = require('../services/f13v2/CauseAggQueryService');
const { db: sharedDb } = require('../config/db');
const { resolveBcvh, scopedBcvhList, sendIfOutOfScope } = require('../middleware/accessScope');

const daySummaryService = new DaySummaryService({ repository: factBuuGuiRepo, dashboardService: f13DashboardService });
const journeyService = new JourneyService({ repository: f13JourneyRepo });
const causeAggService = new CauseAggQueryService({ db: sharedDb });

function journeyScope(req) {
    const { date, ma_bcvh: maBcvh } = req.query;
    if (!date) {
        const error = new Error('Yêu cầu date');
        error.code = 'MISSING_PARAM';
        throw error;
    }
    return {
        date: String(date),
        scope: {
            bcvhId: resolveBcvh(req, maBcvh && maBcvh !== 'all' ? String(maBcvh) : null),
            allowedCodes: scopedBcvhList(req),
        },
    };
}

// F13-WHY-AGG-01 P2: the common filter of /why/*. A BCVH filter goes through resolveBcvh (it can narrow the scope, never widen it); a
// BCVH-mode account never receives a city-level total.
function whyRequest(req) {
    const requested = req.query.bcvh ?? req.query.ma_bcvh;
    return {
        query: { ...req.query },
        scope: {
            bcvhId: resolveBcvh(req, requested && requested !== 'all' ? String(requested) : null),
            allowedCodes: scopedBcvhList(req),
            canSeeCity: req.scope?.mode === 'all',
        },
    };
}

const BAD_REQUEST_CODES = new Set([
    'INVALID_FILTER', 'NO_DATA', 'INVALID_KIND', 'INVALID_DATE', 'INVALID_RANGE', 'RANGE_TOO_LONG', 'INVALID_BCVH', 'INVALID_WEEK_ID', 'INVALID_MONTH_ID', 'MISSING_PARAM',
]);

function sendError(res, error) {
    if (sendIfOutOfScope(res, error)) return;
    if (error?.code === 'OUT_OF_SCOPE') {
        res.status(403).json({ success: false, error: { code: 'OUT_OF_SCOPE', message: error.message } });
        return;
    }
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

    async getJourneyRoutes(req, res) {
        try {
            const { date, scope } = journeyScope(req);
            res.status(200).json({ success: true, data: await journeyService.getRoutes(date, scope) });
        } catch (error) {
            sendError(res, error);
        }
    }

    async getJourneyParcels(req, res) {
        try {
            const { date, scope } = journeyScope(req);
            const { route, search, khong_tron_lo: khongTronLo, sort, order, page, page_size: pageSize } = req.query;
            const result = await journeyService.getParcels(date, {
                ...scope,
                route: route ? String(route) : null,
                search: search ? String(search) : null,
                onlyKhongTronLo: khongTronLo === '1',
                sort: sort ? String(sort) : undefined,
                order: order ? String(order) : undefined,
                page,
                pageSize,
            });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            sendError(res, error);
        }
    }

    // ---- F13-WHY-AGG-01 P2: query layer over f13_cause_parcel (read only)
    async getWhySummary(req, res) {
        await F13V2Controller.why(req, res, (request) => causeAggService.summary(request.query, request.scope));
    }

    async getWhyBcvh(req, res) {
        await F13V2Controller.why(req, res, (request) => causeAggService.bcvh(request.query, request.scope));
    }

    async getWhyRoutes(req, res) {
        await F13V2Controller.why(req, res, (request) => causeAggService.routes(request.query, request.scope));
    }

    async getWhyPostmen(req, res) {
        await F13V2Controller.why(req, res, (request) => causeAggService.postmen(request.query, request.scope));
    }

    async getWhyParcels(req, res) {
        await F13V2Controller.why(req, res, (request) => causeAggService.parcels(request.query, request.scope));
    }

    static async why(req, res, handler) {
        try {
            res.status(200).json({ success: true, data: await handler(whyRequest(req)) });
        } catch (error) {
            sendError(res, error);
        }
    }
}

module.exports = new F13V2Controller();
