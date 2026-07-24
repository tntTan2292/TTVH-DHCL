'use strict';

const { all, get } = require('../config/db');
const { DkclSessionPreflightService } = require('../services/dkclSessionPreflightService');
const { TctF13BackfillService } = require('../services/tctF13BackfillService');

const sessionPreflightService = new DkclSessionPreflightService();
const tctBackfillService = new TctF13BackfillService({ db: { all, get }, sessionPreflightService });

const sessionStatusCode = (status) => status === 'SESSION_VALID'
    ? 200
    : (status === 'LOGIN_IN_PROGRESS' ? 202
        : (status === 'AUTHENTICATION_REQUIRED' ? 401 : 503));

class DkclSharedOperationsController {
    async preflight(req, res) {
        try {
            const result = await sessionPreflightService.preflight(req.body?.source || req.query?.source);
            const statusCode = sessionStatusCode(result.status);
            return res.status(statusCode).json({
                success: result.status === 'SESSION_VALID' || result.status === 'LOGIN_IN_PROGRESS',
                data: result
            });
        } catch (error) {
            console.error('[preflight] Error details:', error);
            const isKnown = error.code && error.code !== 'Error';
            return res.status(400).json({
                success: false,
                error: {
                    code: error.code || 'SESSION_PREFLIGHT_REJECTED',
                    message: isKnown ? error.message : 'Kiểm tra phiên đăng nhập thất bại. Vui lòng kiểm tra lại cấu hình và nhật ký hệ thống.'
                }
            });
        }
    }
 
    async interactiveAuthenticate(req, res) {
        try {
            const result = await sessionPreflightService.interactiveAuthenticate(req.body?.source || req.query?.source);
            const statusCode = sessionStatusCode(result.status);
            return res.status(statusCode).json({
                success: result.status === 'SESSION_VALID' || result.status === 'LOGIN_IN_PROGRESS',
                data: result
            });
        } catch (error) {
            console.error('[interactiveAuthenticate] Error details:', error);
            const isKnown = error.code && error.code !== 'Error';
            return res.status(400).json({
                success: false,
                error: {
                    code: error.code || 'INTERACTIVE_AUTH_REJECTED',
                    message: isKnown ? error.message : 'Yêu cầu đăng nhập tương tác thất bại. Vui lòng kiểm tra lại trình duyệt và nhật ký hệ thống.'
                }
            });
        }
    }
 
    async cancelLogin(req, res) {
        try {
            const result = await sessionPreflightService.cancelInteractiveLogin(req.body?.source || req.query?.source);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('[cancelLogin] Error details:', error);
            return res.status(400).json({
                success: false,
                error: {
                    code: error.code || 'CANCEL_LOGIN_REJECTED',
                    message: error.message || 'Invalid DKCL cancel-login request.'
                }
            });
        }
    }

    async recover(req, res) {
        try {
            const result = await sessionPreflightService.recover(req.body?.source || req.query?.source);
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: error.code || 'RECOVERY_FAILED',
                    message: error.message || 'Failed to recover DKCL session.'
                }
            });
        }
    }

    async getTctCoverageSummary(req, res) {
        try {
            const data = await tctBackfillService.getCoverageSummary({
                fromDate: req.query?.from_date || null,
                toDate: req.query?.to_date || null
            });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: error.code || 'TCT_F13_COVERAGE_REJECTED',
                    message: error.message || 'Invalid TCT F1.3 coverage request.'
                }
            });
        }
    }

    async scanTctMissingDates(req, res) {
        try {
            const data = await tctBackfillService.scanMissingDates({
                fromDate: req.query?.from_date,
                toDate: req.query?.to_date
            });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: error.code || 'TCT_F13_BACKFILL_SCAN_REJECTED',
                    message: error.message || 'Invalid TCT F1.3 missing-date scan request.'
                }
            });
        }
    }

    async startTctBackfillQueue(req, res) {
        try {
            const data = await tctBackfillService.startQueue(req.body?.dates, { refreshDates: req.body?.refresh_dates });
            return res.status(202).json({ success: true, data });
        } catch (error) {
            const code = error.code || 'TCT_F13_BACKFILL_QUEUE_REJECTED';
            const status = code === 'QUEUE_ALREADY_ACTIVE' ? 409
                : (code === 'SESSION_VALID' ? 202
                    : (code === 'AUTHENTICATION_REQUIRED' || code === 'LOGIN_IN_PROGRESS' ? 401
                        : (code === 'SESSION_CHECK_FAILED' ? 503 : 400)));
            return res.status(status).json({
                success: false,
                error: {
                    code,
                    message: error.message || 'Invalid TCT F1.3 backfill queue request.'
                },
                data: error.preflight || null
            });
        }
    }

    async getTctBackfillQueue(req, res) {
        const queueId = req.params.queueId || 'active';
        const data = queueId === 'active'
            ? tctBackfillService.getActiveQueue()
            : tctBackfillService.getQueue(queueId);
        if (!data) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'QUEUE_NOT_FOUND',
                    message: 'TCT F1.3 backfill queue was not found.'
                }
            });
        }
        return res.status(200).json({ success: true, data });
    }

    async stopTctBackfillQueue(req, res) {
        try {
            const data = tctBackfillService.stopQueue(req.params.queueId);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(error.code === 'QUEUE_NOT_FOUND' ? 404 : 400).json({
                success: false,
                error: {
                    code: error.code || 'TCT_F13_BACKFILL_STOP_REJECTED',
                    message: error.message || 'Invalid TCT F1.3 backfill stop request.'
                }
            });
        }
    }

    async retryTctBackfillQueueItem(req, res) {
        try {
            const data = await tctBackfillService.retryQueueItem(
                req.params.queueId,
                req.body?.measurement_date
            );
            return res.status(202).json({ success: true, data });
        } catch (error) {
            const code = error.code || 'TCT_F13_BACKFILL_RETRY_REJECTED';
            const status = code === 'QUEUE_NOT_FOUND' || code === 'QUEUE_ITEM_NOT_FOUND'
                ? 404
                : (code === 'QUEUE_ALREADY_ACTIVE' ? 409 : 400);
            return res.status(status).json({
                success: false,
                error: {
                    code,
                    message: error.message || 'Invalid TCT F1.3 backfill retry request.'
                }
            });
        }
    }
}

module.exports = new DkclSharedOperationsController();
