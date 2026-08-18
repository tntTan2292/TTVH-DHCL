'use strict';

const { AutoBackfillCoverageService } = require('../services/autoBackfillCoverageService');

function createDefaultCoverageService() {
    const { all, get } = require('../config/db');
    return new AutoBackfillCoverageService({ db: { all, get } });
}

class AutoBackfillCoverageController {
    constructor({ coverageService = null } = {}) {
        this.coverageService = coverageService;
    }

    getService() {
        if (!this.coverageService) this.coverageService = createDefaultCoverageService();
        return this.coverageService;
    }

    async getCoverage(req, res) {
        if (Object.hasOwn(req.query || {}, 'as_of')) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'AUTO_BACKFILL_AS_OF_NOT_ALLOWED',
                    message: 'as_of is not allowed; coverage always uses the backend business clock in Asia/Ho_Chi_Minh.',
                },
            });
        }

        try {
            const data = await this.getService().scan({
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
module.exports.AutoBackfillCoverageController = AutoBackfillCoverageController;
