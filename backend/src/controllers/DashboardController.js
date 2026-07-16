const f13DashboardService = require('../services/F13DashboardService');
const timelineService = require('../services/timelineService');

class DashboardController {
    async getKpi(req, res) {
        try {
            const { from_date, to_date } = req.query;
            if (!from_date || !to_date) {
                return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu from_date và to_date' }});
            }
            const result = await f13DashboardService.getDashboardKpi(from_date, to_date);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message }});
        }
    }

    async getQualityTimeline(req, res) {
        try {
            const { toDate, ma_bcvh } = req.query;
            if (!toDate) {
                return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu toDate' }});
            }
            const result = await timelineService.getQualityTimeline(toDate, ma_bcvh);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message }});
        }
    }

    async getDailyTrend(req, res) {
        try {
            const fromDate = req.query.from_date;
            const toDate = req.query.to_date;
            const bcvhId = req.query.bcvh_id || req.query.bcvh || null;

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

            const result = await f13DashboardService.getBcvhRanking(to_date, page, pageSize, sort, order);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message }});
        }
    }

    async getRoute(req, res) {
        try {
            const { date, bcvh, sort, order } = req.query;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.page_size) || 20;

            if (!date || !bcvh) return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu date và bcvh' }});

            const result = await f13DashboardService.getRouteRanking(date, bcvh, page, pageSize, sort, order);
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
            const { date, bcvh, route } = req.query;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.page_size) || 20;

            if (!date || !bcvh || !route) return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu date, bcvh, route' }});

            const result = await f13DashboardService.getEvidenceList(date, bcvh, route, page, pageSize);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message }});
        }
    }
}

module.exports = new DashboardController();
