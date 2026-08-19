const express = require('express');
const cors = require('cors');
const { loadLocalEnv } = require('./src/config/env');
const { getViewerConfigStatus } = require('./src/services/auth/runtimeUsers');

const envLoadResult = loadLocalEnv();

const f13Routes = require('./src/routes/f13Routes');
const importRoutes = require('./src/routes/importRoutes');
const authRoutes = require('./src/routes/authRoutes');
const networkMapRoutes = require('./src/routes/networkMapRoutes');
const { startWatcher } = require('./src/services/importWatcher');
const { dbPath: activeDbPath } = require('./src/config/db');
const { applyNetworkManagement001Phase1Schema } = require('./migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('./migrate_network_management_001_phase2_schema');
const { applyNetworkManagement001Phase3Schema } = require('./migrate_network_management_001_phase3_schema');
const { applyNetworkManagement001Phase4Schema } = require('./migrate_network_management_001_phase4_schema');
const { applyF41Phase1Schema } = require('./migrate_f41_phase1_schema');
const { applyF41Phase2Schema } = require('./migrate_f41_phase2_schema');
const { applyAutoBackfillQueueSchema } = require('./migrate_auto_backfill_queue_schema');
const { applyAutoBackfillSafetySchema } = require('./migrate_auto_backfill_safety_schema');
const { applyAutoBackfillCoverageExceptionSchema } = require('./migrate_auto_backfill_coverage_exception_schema');

const app = express();
const PORT = Number(process.env.PORT || 5050);
const HOST = process.env.HOST || '0.0.0.0';
let activeServer = null;
let shutdownPromise = null;

const logRuntimeBanner = () => {
    const viewerConfig = getViewerConfigStatus();
    const loadedEnvPath =
        envLoadResult.loadedFiles[0] ||
        envLoadResult.candidates.find(Boolean) ||
        'NO_LOCAL_ENV_FOUND';

    console.log('====================================');
    console.log('Backend Runtime Started');
    console.log(`PID: ${process.pid}`);
    console.log(`Node: ${process.version}`);
    console.log(`Host: ${HOST}`);
    console.log(`Port: ${PORT}`);
    console.log(`Loaded .env: ${loadedEnvPath}`);
    console.log(`Viewer username: ${viewerConfig.viewerUsername || 'N/A'}`);
    console.log(`Viewer enabled: ${viewerConfig.viewerEnabled ? 'yes' : 'no'}`);
    console.log(`Viewer hash valid: ${viewerConfig.hashFormatValid ? 'yes' : 'no'}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('====================================');
};

async function shutdown(signal, exitCode = 0) {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
        console.log('====================================');
        console.log(`${signal} RECEIVED`);
        console.log(`Time: ${new Date().toISOString()}`);
        console.log(`PID: ${process.pid}`);
        console.log('====================================');
        try {
            const { stopAutoBackfillQueueRuntime } = require('./src/services/autoBackfillQueueRuntime');
            await stopAutoBackfillQueueRuntime();
            if (activeServer?.listening) {
                await new Promise((resolve) => activeServer.close(resolve));
            }
        } finally {
            process.exit(exitCode);
        }
    })();
    return shutdownPromise;
}

process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });

process.on('uncaughtException', (error) => {
    console.error('====================================');
    console.error('UNCAUGHT EXCEPTION');
    console.error(`Error: ${error?.message || error}`);
    console.error(`Stack: ${error?.stack || 'N/A'}`);
    console.error(`Time: ${new Date().toISOString()}`);
    console.error('====================================');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('====================================');
    console.error('UNHANDLED REJECTION');
    console.error(`Reason: ${reason instanceof Error ? reason.message : String(reason)}`);
    console.error(`Promise: ${promise}`);
    console.error(`Time: ${new Date().toISOString()}`);
    console.error('====================================');
});

process.on('exit', (code) => {
    console.log('====================================');
    console.log('PROCESS EXIT');
    console.log(`Exit Code: ${code}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`PID: ${process.pid}`);
    console.log('====================================');
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/f13', f13Routes);
app.use('/api/import', importRoutes);
app.use('/api/network-map', networkMapRoutes);

// Additive, idempotent schema migrations applied on every startup so any
// environment running this codebase self-heals instead of depending on
// manual one-off scripts per machine.
async function ensureStartupSchemaMigrations(dbPath = activeDbPath) {
    await applyNetworkManagement001Phase1Schema(dbPath);
    await applyNetworkManagement001Phase2Schema(dbPath);
    await applyNetworkManagement001Phase3Schema(dbPath);
    await applyNetworkManagement001Phase4Schema(dbPath);
    await applyF41Phase1Schema(dbPath);
    await applyF41Phase2Schema(dbPath);
    await applyAutoBackfillQueueSchema(dbPath);
    await applyAutoBackfillSafetySchema(dbPath);
    await applyAutoBackfillCoverageExceptionSchema(dbPath);
}

function startServer() {
    return ensureStartupSchemaMigrations(activeDbPath)
        .then(async () => {
            const { startAutoBackfillQueueRuntime } = require('./src/services/autoBackfillQueueRuntime');
            await startAutoBackfillQueueRuntime();
        })
        .then(() => {
            const server = app.listen(PORT, HOST, () => {
                logRuntimeBanner();
                console.log(`TTVH Backend running on port ${PORT}`);
                startWatcher();
            });
            activeServer = server;

            server.on('error', (error) => {
                if (error?.code === 'EADDRINUSE') {
                    console.error('====================================');
                    console.error(`PORT ${PORT} IS OCCUPIED`);
                    console.error(`Host: ${HOST}`);
                    console.error('Run the Windows port check first:');
                    console.error('powershell -ExecutionPolicy Bypass -File .\\scripts\\check-qis-lan-ports.ps1');
                    console.error('Then stop the owning process before restarting QIS V2.');
                    console.error('====================================');
                    void shutdown('EADDRINUSE', 1);
                    return;
                }

                throw error;
            });
            return server;
        })
        .catch(async (error) => {
            const { stopAutoBackfillQueueRuntime } = require('./src/services/autoBackfillQueueRuntime');
            await stopAutoBackfillQueueRuntime();
            console.error('====================================');
            console.error('STARTUP INITIALIZATION FAILED');
            console.error(`Error: ${error?.message || error}`);
            console.error('====================================');
            process.exit(1);
        });
}

if (require.main === module) {
    startServer();
}

module.exports = {
    app,
    ensureStartupSchemaMigrations,
    startServer,
    shutdown,
};
