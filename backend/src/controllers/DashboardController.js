const f13DashboardService = require('../services/F13DashboardService');
const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');
const { BcvhOverviewService } = require('../services/bcvhOverviewService');
const timelineService = require('../services/timelineService');
const { CANONICAL_BCVH_UNITS } = require('../config/canonicalBcvhUnits');

const canonicalBcvhCodes = new Set(CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh));
const bcvhOverviewService = new BcvhOverviewService({ repository: factBuuGuiRepo });

function normalizeDashboardBcvh(ma_bcvh) {
    if (ma_bcvh === undefined || ma_bcvh === null || ma_bcvh === '') return null;
    if (ma_bcvh === 'all') return null;
    if (canonicalBcvhCodes.has(ma_bcvh)) return ma_bcvh;
    return undefined;
}

class DashboardController {
    async getKpi(req, res) {
        try {
            const { from_date, to_date, ma_bcvh } = req.query;
            if (!from_date || !to_date) {
                return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu from_date và to_date' }});
            }
            const normalizedBcvh = normalizeDashboardBcvh(ma_bcvh);
            if (normalizedBcvh === undefined) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_PARAM', message: 'Mã BCVH không hợp lệ.' }});
            }
            const result = await f13DashboardService.getDashboardKpi(from_date, to_date, { bcvhId: normalizedBcvh });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message }});
        }
    }

    async getQualityTimeline(req, res) {
        try {
            const { toDate, ma_bcvh, mode, include_national_rank } = req.query;
            if (!toDate) {
                return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu toDate' }});
            }
            const result = await timelineService.getQualityTimeline(toDate, ma_bcvh, {
                mode,
                includeNationalRank: include_national_rank === '1' || include_national_rank === 'true'
            });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message }});
        }
    }

    async getDailyTrend(req, res) {
        try {
            const fromDate = req.query.from_date;
            const toDate = req.query.to_date;
            const bcvhId = req.query.ma_bcvh || req.query.bcvh_id || req.query.bcvh || null;

            if (!fromDate || !toDate) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'MISSING_PARAM', message: 'Yêu cầu from_date và to_date' }
                });
            }

            const result = await f13DashboardService.getDailyTrend(fromDate, toDate, { bcvhId });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            const status = error?.code === 'INVALID_DATE' || error?.code === 'INVALID_RANGE' ? 400 : 500;
            res.status(status).json({
                success: false,
                error: {
                    code: error?.code || 'SERVER_ERROR',
                    message: error.message
                }
            });
        }
    }

    async getBcvh(req, res) {
        try {
            const from_date = req.query.from_date || req.query.fromDate;
            const to_date = req.query.to_date || req.query.toDate;
            const { sort, order } = req.query;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.page_size) || 20;

            if (!from_date || !to_date) return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu from_date và to_date' }});
            if (from_date > to_date) return res.status(400).json({ success: false, error: { code: 'INVALID_RANGE', message: 'from_date phải nhỏ hơn hoặc bằng to_date' }});

            // Inclusive range: ngay_do_kiem BETWEEN from_date AND to_date.
            // Callers wanting a single-evaluation-day contract (e.g. BCVH Ranking)
            // send from_date === to_date; Operation Dashboard sends a real range.
            const result = await f13DashboardService.getBcvhRanking(from_date, to_date, page, pageSize, sort, order);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            const status = error?.code === 'INVALID_DATE' || error?.code === 'INVALID_RANGE' ? 400 : 500;
            res.status(status).json({ success: false, error: { code: error?.code || 'SERVER_ERROR', message: error.message }});
        }
    }

    async getBcvhOverview(req, res) {
        try {
            const result = await bcvhOverviewService.getOverview(req.query.anchor_date);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            const status = error?.code === 'INVALID_DATE' ? 400 : 500;
            res.status(status).json({
                success: false,
                error: { code: error?.code || 'SERVER_ERROR', message: error.message },
            });
        }
    }

    async getRoute(req, res) {
        try {
            const { date, bcvh, sort, order, route_type } = req.query;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.page_size) || 20;

            if (!date || !bcvh) return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu date và bcvh' }});

            const result = await f13DashboardService.getRouteRanking(date, bcvh, page, pageSize, sort, order, {
                routeType: route_type,
            });
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message }});
        }
    }

    async getPareto(req, res) {
        try {
            const { date, bcvh } = req.query;
            if (!date) return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu date' }});

            const result = await f13DashboardService.getParetoAnalysis(date, bcvh);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message }});
        }
    }

    async getEvidence(req, res) {
        try {
            const { date, bcvh, route, reason } = req.query;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.page_size) || 20;

            if (!date || !bcvh) return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu date, bcvh' }});

            // `route` is optional: absent or 'all' means "every route for this BCVH/date",
            // per the Product Owner-authorized Evidence "Tất cả tuyến" requirement.
            const routeFilter = route && route !== 'all' ? route : undefined;
            const result = await f13DashboardService.getEvidenceList(date, bcvh, routeFilter, page, pageSize, reason);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message }});
        }
    }
}

module.exports = new DashboardController();
