'use strict';

// F41-DASHBOARD-RANKING-01 (T1/T2) - HTTP layer for the F4.1 Operation Dashboard
// and BCVH Ranking read endpoints (mounted under /api/f41 by f41Routes.js).
// Request/response contract mirrors the /api/f13 twins (Design of Record 4.3).
// Read-only; every response is no-store like the existing F4.1 endpoints.

const { f41RankingService } = require('../services/F41RankingService');

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
    const code = error?.code || 'SERVER_ERROR';
    const status = BAD_REQUEST_CODES.has(code) ? 400 : 500;
    res.status(status).json({ success: false, error: { code, message: error.message } });
}

function bcvhParam(value) {
    if (value === undefined || value === null || value === '' || value === 'all') return null;
    return String(value);
}

function createController(service = f41RankingService) {
    const ok = (res, body) => {
        setNoStore(res);
        res.status(200).json({ success: true, ...body });
    };

    return {
        async getSummary(req, res) {
            try {
                const { from_date, to_date } = req.query;
                if (!from_date || !to_date) {
                    return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu from_date và to_date' } });
                }
                const data = await service.getSummary(from_date, to_date, { bcvhId: bcvhParam(req.query.ma_bcvh) });
                ok(res, { data });
            } catch (error) { fail(res, error); }
        },

        async getDailyTrend(req, res) {
            try {
                const from_date = req.query.from_date || req.query.fromDate;
                const to_date = req.query.to_date || req.query.toDate;
                if (!from_date || !to_date) {
                    return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu from_date và to_date' } });
                }
                const data = await service.getDailyTrend(from_date, to_date, { bcvhId: bcvhParam(req.query.ma_bcvh || req.query.bcvh_id || req.query.bcvh) });
                ok(res, { data });
            } catch (error) { fail(res, error); }
        },

        async getOverview(req, res) {
            try { ok(res, { data: await service.getOverview(req.query.anchor_date) }); } catch (error) { fail(res, error); }
        },

        async getWeeks(req, res) {
            try { ok(res, { data: { weeks: await service.listWeeks() } }); } catch (error) { fail(res, error); }
        },

        async getWeeklyComparison(req, res) {
            try {
                ok(res, { data: await service.compareWeeks(req.query.week, req.query.compare_week) });
            } catch (error) { fail(res, error); }
        },

        async getWeeklyTrend(req, res) {
            try {
                ok(res, { data: await service.trendWeeks(req.query.week, { limit: req.query.limit }) });
            } catch (error) { fail(res, error); }
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
                if (!from_date || !to_date) {
                    return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu from_date và to_date' } });
                }
                const page = parseInt(req.query.page, 10) || 1;
                const pageSize = parseInt(req.query.page_size, 10) || 20;
                const result = await service.getBcvhRanking(from_date, to_date, page, pageSize, req.query.sort, req.query.order);
                ok(res, { data: result.data, meta: result.meta });
            } catch (error) { fail(res, error); }
        },
    };
}

module.exports = createController();
module.exports.createController = createController;
