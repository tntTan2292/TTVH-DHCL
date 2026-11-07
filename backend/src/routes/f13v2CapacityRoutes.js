'use strict';

// F13-ROUTE-CAPACITY-01 (G2): route capacity and daily load. Mounted by f13v2Routes at /capacity, so auth, module and scope middleware apply.
// A BCVH filter goes through resolveBcvh (it can narrow the scope, never widen it); a BCVH-mode account sees its own unit only.

const express = require('express');
const { resolveBcvh, scopedBcvhList, sendIfOutOfScope } = require('../middleware/accessScope');
const { RouteCapacityService } = require('../services/f13v2/RouteCapacityService');

const router = express.Router();

const BAD_REQUEST_CODES = new Set(['INVALID_FILTER', 'INVALID_DATE', 'INVALID_RANGE', 'RANGE_TOO_LONG', 'INVALID_WEEK_ID', 'INVALID_MONTH_ID', 'MISSING_PARAM']);

let service = null;
// The shared connection is required on first use, so loading this file never opens the operational database.
function capacityService() {
    if (!service) service = new RouteCapacityService({ db: require('../config/db').db });
    return service;
}

function scopeOf(req) {
    const requested = req.query.bcvh ?? req.query.ma_bcvh;
    return {
        bcvhId: resolveBcvh(req, requested && requested !== 'all' ? String(requested) : null),
        allowedCodes: scopedBcvhList(req),
    };
}

function sendError(res, error) {
    if (sendIfOutOfScope(res, error)) return;
    if (error?.code === 'OUT_OF_SCOPE') {
        res.status(403).json({ success: false, error: { code: 'OUT_OF_SCOPE', message: error.message } });
        return;
    }
    if (BAD_REQUEST_CODES.has(error?.code)) {
        res.status(400).json({ success: false, error: { code: error.code, message: error.message } });
        return;
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Không đọc được năng lực tuyến' } });
}

function handler(method) {
    return async (req, res) => {
        try {
            const data = await capacityService()[method]({ ...req.query }, scopeOf(req));
            res.status(200).json({ success: true, data });
        } catch (error) {
            sendError(res, error);
        }
    };
}

router.get('/routes', handler('routes'));
router.get('/route-days', handler('routeDays'));

module.exports = router;
