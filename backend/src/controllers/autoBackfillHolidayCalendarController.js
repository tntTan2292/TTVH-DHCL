'use strict';

const { AutoBackfillHolidayCalendarService } = require('../services/autoBackfillHolidayCalendarService');

function createDefaultHolidayCalendarService() {
    const { all, get, run } = require('../config/db');
    return new AutoBackfillHolidayCalendarService({ db: { all, get, run } });
}

function requestActor(req) {
    return req.auth?.user?.username || req.auth?.user?.id || 'authenticated-user';
}

function sendError(res, error) {
    return res.status(error.statusCode || 400).json({
        success: false,
        error: {
            code: error.code || 'AUTO_BACKFILL_HOLIDAY_CALENDAR_REJECTED',
            message: error.message || 'Invalid Auto Backfill holiday calendar request.',
        },
    });
}

/**
 * AB-CALENDAR-01. A holiday carries no indicator and no source lane, so the
 * per-lane registry role check used by the coverage-exception service has
 * nothing to bind to; the route-level admin guard is the only write gate.
 * That is a deliberate, recorded simplification (design Section 5).
 */
class AutoBackfillHolidayCalendarController {
    constructor({ holidayCalendarService = null } = {}) {
        this.holidayCalendarService = holidayCalendarService;
    }

    getService() {
        if (!this.holidayCalendarService) this.holidayCalendarService = createDefaultHolidayCalendarService();
        return this.holidayCalendarService;
    }

    async list(req, res) {
        try {
            const data = await this.getService().list({
                fromDate: req.query?.from || null,
                toDate: req.query?.to || null,
                status: req.query?.status || null,
            });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return sendError(res, error);
        }
    }

    async create(req, res) {
        try {
            const data = await this.getService().create({
                businessDate: req.body?.business_date || null,
                reason: req.body?.reason || null,
                actor: requestActor(req),
            });
            return res.status(201).json({ success: true, data });
        } catch (error) {
            return sendError(res, error);
        }
    }

    async revoke(req, res) {
        try {
            const data = await this.getService().revoke({
                holidayId: req.params.holidayId,
                reason: req.body?.reason || null,
                actor: requestActor(req),
            });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return sendError(res, error);
        }
    }
}

module.exports = new AutoBackfillHolidayCalendarController();
module.exports.AutoBackfillHolidayCalendarController = AutoBackfillHolidayCalendarController;
