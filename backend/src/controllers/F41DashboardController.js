'use strict';

// F41-DASHBOARD-MINIMUM-01 - Phase B1 Backend
// ITR remediation (ITR-F41-NB-03, ITR-F41-NB-06): date-value validation on
// every date-shaped parameter, and consistent no-store caching on all three
// read endpoints.
const { f41DashboardService } = require('../services/F41DashboardService');
const { CANONICAL_BCVH_UNITS } = require('../config/canonicalBcvhUnits');

const canonicalBcvhCodes = new Set(CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh));

function normalizeBcvh(ma_bcvh) {
    if (ma_bcvh === undefined || ma_bcvh === null || ma_bcvh === '') return null;
    if (ma_bcvh === 'all') return null;
    if (canonicalBcvhCodes.has(ma_bcvh)) return ma_bcvh;
    return undefined;
}

// ITR-F41-NB-03: shape AND calendar-validity check (rejects '2026-13-45',
// 'not-a-date', etc.) - not just the regex F1.3's getKpi settles for.
function isValidIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function setNoStore(res) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
}

class F41DashboardController {
    async getKpi(req, res) {
        try {
            const { from_date, to_date, ma_bcvh } = req.query;
            if (!from_date || !to_date) {
                return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu from_date và to_date' } });
            }
            if (!isValidIsoDate(from_date) || !isValidIsoDate(to_date)) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_DATE', message: 'from_date/to_date phải là ngày hợp lệ định dạng YYYY-MM-DD' } });
            }
            if (from_date > to_date) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_RANGE', message: 'from_date phải nhỏ hơn hoặc bằng to_date' } });
            }
            const normalizedBcvh = normalizeBcvh(ma_bcvh);
            if (normalizedBcvh === undefined) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_PARAM', message: 'Mã BCVH không hợp lệ.' } });
            }
            setNoStore(res);
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
            if (!isValidIsoDate(date)) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_DATE', message: 'date phải là ngày hợp lệ định dạng YYYY-MM-DD' } });
            }
            setNoStore(res);
            const result = await f41DashboardService.getBcvhReconciliation(date);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
        }
    }

    async getMeta(req, res) {
        try {
            const result = await f41DashboardService.getDashboardMeta();
            setNoStore(res);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
        }
    }
}

module.exports = new F41DashboardController();
