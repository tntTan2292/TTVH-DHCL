'use strict';

// F41-DASHBOARD-MINIMUM-01 - Phase B1 Backend
const { f41DashboardService } = require('../services/F41DashboardService');
const { CANONICAL_BCVH_UNITS } = require('../config/canonicalBcvhUnits');

const canonicalBcvhCodes = new Set(CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh));

function normalizeBcvh(ma_bcvh) {
    if (ma_bcvh === undefined || ma_bcvh === null || ma_bcvh === '') return null;
    if (ma_bcvh === 'all') return null;
    if (canonicalBcvhCodes.has(ma_bcvh)) return ma_bcvh;
    return undefined;
}

class F41DashboardController {
    async getKpi(req, res) {
        try {
            const { from_date, to_date, ma_bcvh } = req.query;
            if (!from_date || !to_date) {
                return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu from_date và to_date' } });
            }
            const normalizedBcvh = normalizeBcvh(ma_bcvh);
            if (normalizedBcvh === undefined) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_PARAM', message: 'Mã BCVH không hợp lệ.' } });
            }
            const result = await f41DashboardService.getDashboardKpi(from_date, to_date, { bcvhId: normalizedBcvh });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
        }
    }

    async getBcvhReconciliation(req, res) {
        try {
            const { date } = req.query;
            if (!date) {
                return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu date' } });
            }
            const result = await f41DashboardService.getBcvhReconciliation(date);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
        }
    }

    async getMeta(req, res) {
        try {
            const result = await f41DashboardService.getDashboardMeta();
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
        }
    }
}

module.exports = new F41DashboardController();
