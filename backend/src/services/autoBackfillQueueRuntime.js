'use strict';

const { dbPath, all, get } = require('../config/db');
const { AutoBackfillCoverageService } = require('./autoBackfillCoverageService');
const { AutoBackfillQueueStore } = require('./autoBackfillQueueStore');
const { AutoBackfillQueueService } = require('./autoBackfillQueueService');
const { AutoBackfillExecutorRegistry } = require('./autoBackfillExecutorRegistry');
const { AutoBackfillWorkerCoordinator } = require('./autoBackfillWorkerCoordinator');

let queueService = null;
let executorRegistry = null;
let coordinator = null;

function ensureRuntime() {
    if (queueService) return;
    const completionDb = { all, get };
    const coverageService = new AutoBackfillCoverageService({ db: completionDb });
    executorRegistry = new AutoBackfillExecutorRegistry();
    queueService = new AutoBackfillQueueService({
        store: new AutoBackfillQueueStore({ dbPath }),
        coverageService,
        completionDb,
        // Deliberately empty until a later adapter ticket installs a verified executor.
        executorRegistry,
    });
    coordinator = new AutoBackfillWorkerCoordinator({ queueService });
    queueService.setWorkAvailableNotifier(() => coordinator.wake());
}

function getAutoBackfillQueueService() {
    ensureRuntime();
    return queueService;
}

async function recoverAutoBackfillQueueOnStartup() {
    const recovered = await getAutoBackfillQueueService().recoverInterruptedWork();
    coordinator?.wake();
    return recovered;
}

function getAutoBackfillWorkerCoordinator() {
    ensureRuntime();
    return coordinator;
}

async function startAutoBackfillQueueRuntime() {
    ensureRuntime();
    await queueService.recoverInterruptedWork();
    coordinator.start();
    return coordinator;
}

async function stopAutoBackfillQueueRuntime() {
    if (coordinator) await coordinator.stop();
}

function registerAutoBackfillExecutor(id, executor, options = {}) {
    ensureRuntime();
    executorRegistry.register(id, executor, options);
    coordinator.wake();
    return executor;
}

function wakeAutoBackfillQueue() {
    return getAutoBackfillWorkerCoordinator().wake();
}

module.exports = {
    getAutoBackfillQueueService,
    getAutoBackfillWorkerCoordinator,
    recoverAutoBackfillQueueOnStartup,
    startAutoBackfillQueueRuntime,
    stopAutoBackfillQueueRuntime,
    registerAutoBackfillExecutor,
    wakeAutoBackfillQueue,
};
