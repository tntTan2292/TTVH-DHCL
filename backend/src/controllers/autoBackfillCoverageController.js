'use strict';

const { all, get } = require('../config/db');
const { AutoBackfillCoverageService } = require('../services/autoBackfillCoverageService');

const coverageService = new AutoBackfillCoverageService({ db: { all, get } });

class AutoBackfillCoverageController {
    async getCoverage(req, res) {
        try {
            const data = await coverageService.scan({
                asOf: req.query?.as_of || null,
                indicator: req.query?.indicator || null,
                lane: req.query?.lane || null,
                roles: [req.auth?.user?.role],
            });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(error.statusCode || 400).json({
                success: false,
                error: {
                    code: error.code || 'AUTO_BACKFILL_COVERAGE_REJECTED',
                    message: error.message || 'Invalid Auto Backfill coverage request.',
                },
            });
        }
    }
}

module.exports = new AutoBackfillCoverageController();
