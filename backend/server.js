const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { loadLocalEnv } = require('./src/config/env');

const envLoadResult = loadLocalEnv();

const f13Routes = require('./src/routes/f13Routes');
const importRoutes = require('./src/routes/importRoutes');
const authRoutes = require('./src/routes/authRoutes');
const adminUserRoutes = require('./src/routes/adminUserRoutes');
const networkMapRoutes = require('./src/routes/networkMapRoutes');
const f41Routes = require('./src/routes/f41Routes');
const f11Routes = require('./src/routes/f11Routes');
const f12Routes = require('./src/routes/f12Routes');
const f42Routes = require('./src/routes/f42Routes');
const homeRoutes = require('./src/routes/homeRoutes');
const createHangtonRouter = require('./src/routes/hangtonRoutes');
const { startWatcher } = require('./src/services/importWatcher');
const { dbPath: activeDbPath } = require('./src/config/db');
const { applyNetworkManagement001Phase1Schema } = require('./migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('./migrate_network_management_001_phase2_schema');
const { applyNetworkManagement001Phase3Schema } = require('./migrate_network_management_001_phase3_schema');
const { applyNetworkManagement001Phase4Schema } = require('./migrate_network_management_001_phase4_schema');
const { applyF41Phase1Schema } = require('./migrate_f41_phase1_schema');
const { applyF41Phase2Schema } = require('./migrate_f41_phase2_schema');
const { applyF11Phase1Schema } = require('./migrate_f11_phase1_schema');
const { applyF11Phase4Schema } = require('./migrate_f11_phase4_schema');
const { applyF12Schema } = require('./migrate_f12_schema');
const { applyF42Schema } = require('./migrate_f42_schema');
const { applyRbac01Schema } = require('./migrate_rbac_01_schema');
const { applyAutoBackfillQueueSchema } = require('./migrate_auto_backfill_queue_schema');
const { applyAutoBackfillSafetySchema } = require('./migrate_auto_backfill_safety_schema');
const { applyAutoBackfillCoverageExceptionSchema } = require('./migrate_auto_backfill_coverage_exception_schema');
const { applyAutoBackfillHolidayCalendarSchema } = require('./migrate_auto_backfill_holiday_calendar_schema');
const { applyF13RoutePostmanIdentity01Phase1Schema } = require('./migrate_f13_route_postman_identity_phase1_schema');
const { applyImportBulkReimportAll01Schema } = require('./migrate_import_bulk_reimport_all_01_schema');
const { applyImportLogAudit01Schema } = require('./migrate_import_log_audit_01_schema');
const { applyBfPhat01Schema } = require('./migrate_bf_phat_01_schema');
const { applyPerfLoad01AggSchema } = require('./migrate_perf_load_01_agg_schema');
const { applyHangtonInventory01Schema } = require('./migrate_hangton_inventory_01_schema');

const app = express();
const PORT = Number(process.env.PORT || 5050);
const HOST = process.env.HOST || '0.0.0.0';
let activeServer = null;
let shutdownPromise = null;

const logRuntimeBanner = () => {
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
            hangtonScheduler?.stop();
            bfPhatScheduler?.stop();
            autoImportSchedule?.stop();
            sessionKeepAlive?.stop();
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

// RBAC-01: the front end reaches this backend through its own proxy on this computer; trust that hop only
// (loopback) so req.ip is the real client for the login throttle. Direct callers cannot spoof X-Forwarded-For.
app.set('trust proxy', 'loopback');
app.use(cors());
// PERF-LOAD-01 Phase 1: gzip JSON responses (ranking/overview payloads are large and repetitive).
app.use(compression());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/f13', f13Routes);
app.use('/api/import', importRoutes);
app.use('/api/network-map', networkMapRoutes);
app.use('/api/f41', f41Routes);
app.use('/api/f11', f11Routes);
app.use('/api/f12', f12Routes);
app.use('/api/f42', f42Routes);
app.use('/api/home', homeRoutes);
app.use('/api/hangton', createHangtonRouter());

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
    await applyF11Phase1Schema(dbPath);
    await applyF11Phase4Schema(dbPath);
    await applyF12Schema(dbPath);
    await applyF42Schema(dbPath);
    await applyAutoBackfillQueueSchema(dbPath);
    await applyAutoBackfillSafetySchema(dbPath);
    await applyAutoBackfillCoverageExceptionSchema(dbPath);
    await applyAutoBackfillHolidayCalendarSchema(dbPath);
    await applyF13RoutePostmanIdentity01Phase1Schema(dbPath);
    await applyImportBulkReimportAll01Schema(dbPath);
    await applyImportLogAudit01Schema(dbPath);
    await applyPerfLoad01AggSchema(dbPath);
    await applyHangtonInventory01Schema(dbPath);
    await applyRbac01Schema(dbPath);
    await applyBfPhat01Schema(dbPath);
}

// HANGTON-INVENTORY-01: three daily stock snapshots (07:30, 11:30, 21:00). Off in tests, with
// HANGTON_SCHEDULER=off, or when no hangton login is configured.
let hangtonScheduler = null;
function startHangtonScheduler() {
    if (process.env.NODE_ENV === 'test' || String(process.env.HANGTON_SCHEDULER || 'on').toLowerCase() === 'off') return;
    const { readCredentials, fetchStockData } = require('./src/services/hangtonInventory/client');
    const credentials = readCredentials();
    if (!credentials.username || !credentials.password) {
        console.warn('[hangton] scheduler not started: no credentials in backend/.hangton.env');
        return;
    }
    const { createScheduler } = require('./src/services/hangtonInventory/scheduler');
    hangtonScheduler = createScheduler({ db: require('./src/config/db'), fetchStock: () => fetchStockData({ credentials }) });
    hangtonScheduler.start();
}

// BF-PHAT-IMPORT-01: daily N-1 load of the delivery BatchFile through WinSCP. Off in tests or with BF_PHAT_SCHEDULE_ENABLED=false.
let bfPhatScheduler = null;
function startBfPhatScheduler() {
    if (process.env.NODE_ENV === 'test') return;
    const { BfPhatScheduler } = require('./src/services/bfPhat/bfPhatScheduler');
    bfPhatScheduler = new BfPhatScheduler({ dbPath: activeDbPath });
    bfPhatScheduler.start();
}

// AUTO-IMPORT-SCHEDULE-01: scheduled automatic import (off unless AUTO_IMPORT_SCHEDULE_ENABLED=true) and DKCL session
// keep-alive (on unless DKCL_KEEPALIVE_ENABLED=false). Neither signs in: the DKCL sign-in has a captcha.
let autoImportSchedule = null;
let sessionKeepAlive = null;
function startAutoImportSchedule() {
    const { AutoImportScheduler } = require('./src/services/autoImportScheduler');
    const { DkclSessionKeepAlive } = require('./src/services/dkclSessionKeepAlive');
    const { DkclSessionPreflightService } = require('./src/services/dkclSessionPreflightService');
    const { getAutoBackfillQueueService } = require('./src/services/autoBackfillQueueRuntime');
    const sessionService = new DkclSessionPreflightService();
    autoImportSchedule = new AutoImportScheduler({
        queueService: getAutoBackfillQueueService(),
        sessionService,
    });
    autoImportSchedule.start();
    sessionKeepAlive = new DkclSessionKeepAlive({
        sessionService,
        // a source that becomes valid again (sign-in, re-attach, restart) wakes the queue lanes, which park themselves without a session
        // and resumes the runs that were waiting for a sign-in of that source (AUTO_BACKFILL_AUTO_RESUME=false keeps the manual button only)
        onSessionValid: async (source) => {
            const runtime = require('./src/services/autoBackfillQueueRuntime');
            const resumed = await runtime.getAutoBackfillQueueService().resumeAuthWaitForLane(source);
            runtime.wakeAutoBackfillQueue();
            return resumed;
        },
    });
    sessionKeepAlive.start();
    // The queue lanes start only after the first keep-alive look has re-attached the DKCL windows from the saved sessions
    // (or after 4 minutes at the latest): draining earlier finds no session and parks the lanes in WAITING_AUTH.
    const { startAutoBackfillCoordinator } = require('./src/services/autoBackfillQueueRuntime');
    let coordinatorStarted = false;
    const startCoordinatorOnce = () => {
        if (coordinatorStarted) return;
        coordinatorStarted = true;
        startAutoBackfillCoordinator();
    };
    const fallbackStart = setTimeout(startCoordinatorOnce, 4 * 60 * 1000);
    fallbackStart.unref?.();
    void sessionKeepAlive.tick().catch(() => {}).finally(() => {
        clearTimeout(fallbackStart);
        startCoordinatorOnce();
    });
}

function startServer() {
    return ensureStartupSchemaMigrations(activeDbPath)
        .then(async () => {
            // RBAC-01: persistent sessions survive a restart.
            const authSessionStore = require('./src/services/auth/AuthSessionStore');
            authSessionStore.attachPersistence(require('./src/services/auth/sessionPersistence'));
            const restoredSessions = await authSessionStore.restore();
            console.log(`[auth] restored ${restoredSessions} session(s)`);
            const { startAutoBackfillQueueRuntime } = require('./src/services/autoBackfillQueueRuntime');
            await startAutoBackfillQueueRuntime({ deferStart: true });
            startAutoImportSchedule();
            startHangtonScheduler();
            startBfPhatScheduler();
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
