'use strict';

const express = require('express');
const { DkclHueBrowserBroker } = require('./dkclHueBrowserBroker');

function createBrokerApp(options = {}) {
    const app = express();
    const broker = options.broker || new DkclHueBrowserBroker(options.brokerOptions);

    app.use(express.json());

    app.get('/health', async (req, res) => {
        res.status(200).json({ success: true, data: broker.getHealth() });
    });

    app.post('/api/hue/open-login', async (req, res) => {
        try {
            const data = await broker.openLogin();
            res.status(data.status === 'SESSION_VALID' ? 200 : 202).json({ success: true, data });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: {
                    code: error.code || 'HUE_BROKER_OPEN_FAILED',
                    message: error.message || 'Failed to open HUE broker browser.'
                }
            });
        }
    });

    app.get('/api/hue/status', async (req, res) => {
        try {
            const data = await broker.getStatus();
            res.status(data.status === 'SESSION_VALID' ? 200 : 202).json({ success: true, data });
        } catch (error) {
            res.status(503).json({
                success: false,
                error: {
                    code: error.code || 'HUE_BROKER_STATUS_FAILED',
                    message: error.message || 'Failed to read HUE broker status.'
                }
            });
        }
    });

    app.get('/api/hue/session-ready', async (req, res) => {
        try {
            const data = await broker.getSessionReady();
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(503).json({
                success: false,
                error: {
                    code: error.code || 'HUE_BROKER_SESSION_READY_FAILED',
                    message: error.message || 'Failed to read HUE broker session readiness.'
                }
            });
        }
    });

    app.post('/api/hue/close', async (req, res) => {
        try {
            const data = await broker.close();
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: {
                    code: error.code || 'HUE_BROKER_CLOSE_FAILED',
                    message: error.message || 'Failed to close HUE broker browser.'
                }
            });
        }
    });

    return { app, broker };
}

module.exports = {
    createBrokerApp
};
