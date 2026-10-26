'use strict';

// F42-DASHBOARD-RANKING-01 - HTTP layer for the F4.2 Operation Dashboard, BCVH Ranking and
// postman-table read endpoints (mounted under /api/f42 by f42Routes.js). Request/response contract
// mirrors the /api/f41 twins. Read-only; every response is no-store.

const { f42RankingService } = require('../services/F42RankingService');
const { resolveBcvh, sendIfOutOfScope } = require('../middleware/accessScope');

const BAD_REQUEST_CODES = new Set([
    'MISSING_PARAM',
    'INVALID_DATE',
    'INVALID_RANGE',
    'INVALID_BCVH',
    'INVALID_WEEK_ID',
    'WEEK_NOT_FOUND',
    'INVALID_MONTH_ID',
    'MONTH_NOT_FOUND',
]);

function setNoStore(res) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
}

function fail(res, error) {
    if (sendIfOutOfScope(res, error)) return;
    const code = error?.code || 'SERVER_ERROR';
    const status = BAD_REQUEST_CODES.has(code) ? 400 : 500;
    res.status(status).json({ success: false, error: { code, message: error.message } });
}

function bcvhParam(value) {
    if (value === undefined || value === null || value === '' || value === 'all') return null;
    return String(value);
}

function createController(service = f42RankingService) {
    const ok = (res, body) => {
        setNoStore(res);
        res.status(200).json({ success: true, ...body });
    };
    const missingRange = (res) => res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu from_date và to_date' } });

    return {
        async getSummary(req, res) {
            try {
                const { from_date, to_date } = req.query;
                if (!from_date || !to_date) return missingRange(res);
                ok(res, { data: await service.getSummary(from_date, to_date, { bcvhId: resolveBcvh(req, bcvhParam(req.query.ma_bcvh)) }) });
            } catch (error) { fail(res, error); }
        },

        async getDailyTrend(req, res) {
            try {
                const from_date = req.query.from_date || req.query.fromDate;
                const to_date = req.query.to_date || req.query.toDate;
                if (!from_date || !to_date) return missingRange(res);
                ok(res, { data: await service.getDailyTrend(from_date, to_date, { bcvhId: resolveBcvh(req, bcvhParam(req.query.ma_bcvh || req.query.bcvh_id || req.query.bcvh)) }) });
            } catch (error) { fail(res, error); }
        },

        async getMeta(req, res) {
            try { ok(res, { data: await service.getDashboardMeta() }); } catch (error) { fail(res, error); }
        },

        async getNationalRanking(req, res) {
            try {
                const { from_date, to_date } = req.query;
                if (!from_date || !to_date) return missingRange(res);
                ok(res, { data: await service.getNationalRanking(from_date, to_date) });
            } catch (error) { fail(res, error); }
        },

        async getOverview(req, res) {
            try { ok(res, { data: await service.getOverview(req.query.anchor_date) }); } catch (error) { fail(res, error); }
        },

        async getWeeks(req, res) {
            try { ok(res, { data: { weeks: await service.listWeeks() } }); } catch (error) { fail(res, error); }
        },

        async getWeeklyComparison(req, res) {
            try { ok(res, { data: await service.compareWeeks(req.query.week, req.query.compare_week) }); } catch (error) { fail(res, error); }
        },

        async getWindowComparison(req, res) {
            try { ok(res, { data: await service.compareRollingWindow(req.query.to_date, { bcvhId: resolveBcvh(req, bcvhParam(req.query.ma_bcvh)) }) }); } catch (error) { fail(res, error); }
        },

        async getWeeklyTrend(req, res) {
            try { ok(res, { data: await service.trendWeeks(req.query.week, { limit: req.query.limit }) }); } catch (error) { fail(res, error); }
        },

        async getMonths(req, res) {
            try { ok(res, { data: { months: await service.listMonths() } }); } catch (error) { fail(res, error); }
        },

        async getMonthlyComparison(req, res) {
            try {
                const samePeriod = req.query.same_period === '1' || req.query.same_period === 'true';
                ok(res, { data: await service.compareMonths(req.query.month, req.query.compare_month, { samePeriod }) });
            } catch (error) { fail(res, error); }
        },

        async getBcvhRanking(req, res) {
            try {
                const from_date = req.query.from_date || req.query.fromDate;
                const to_date = req.query.to_date || req.query.toDate;
                if (!from_date || !to_date) return missingRange(res);
                // A BCVH-mode user: the response sanitiser runs AFTER paging, so page by page a user could read their own
                // rank from the position of their row. Scoped users always get page 1 of everything (the sanitiser then keeps
                // only their row), whatever page / page_size they send (review of F4.2, 2026-10-26).
                const scoped = req.scope?.mode === 'bcvh';
                const page = scoped ? 1 : (parseInt(req.query.page, 10) || 1);
                const pageSize = scoped ? 100 : (parseInt(req.query.page_size, 10) || 20);
                const result = await service.getBcvhRanking(from_date, to_date, page, pageSize);
                ok(res, { data: result.data, meta: result.meta });
            } catch (error) { fail(res, error); }
        },

        async getPostmanTable(req, res) {
            try {
                const data = await service.getPostmanTable({
                    period: req.query.period,
                    anchorDate: req.query.anchor_date,
                    fromDate: req.query.from_date,
                    toDate: req.query.to_date,
                    // a BCVH-mode user is pinned to the scope (403 for a foreign unit), a city-wide user may pick one or all
                    bcvhId: resolveBcvh(req, bcvhParam(req.query.ma_bcvh)),
                });
                ok(res, { data });
            } catch (error) { fail(res, error); }
        },
    };
}

module.exports = createController();
module.exports.createController = createController;
