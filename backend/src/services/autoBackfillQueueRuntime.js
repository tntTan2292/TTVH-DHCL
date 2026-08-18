'use strict';

const { dbPath, all, get } = require('../config/db');
const { AutoBackfillCoverageService } = require('./autoBackfillCoverageService');
const { AutoBackfillQueueStore } = require('./autoBackfillQueueStore');
const { AutoBackfillQueueService } = require('./autoBackfillQueueService');
const { AutoBackfillExecutorRegistry } = require('./autoBackfillExecutorRegistry');
const { AutoBackfillWorkerCoordinator } = require('./autoBackfillWorkerCoordinator');
const { registerVerifiedAutoBackfillExecutors } = require('./autoBackfillExecutors');

let queueService = null;
let executorRegistry = null;
let coordinator = null;

function buildRuntime({
    runtimeDbPath = dbPath,
    completionDb = { all, get },
    registerExecutors = registerVerifiedAutoBackfillExecutors,
    coordinatorFactory = (options) => new AutoBackfillWorkerCoordinator(options),
} = {}) {
    const runtimeExecutorRegistry = new AutoBackfillExecutorRegistry();
    registerExecutors(runtimeExecutorRegistry, { db: completionDb });
    const coverageService = new AutoBackfillCoverageService({ db: completionDb });
    const runtimeQueueService = new AutoBackfillQueueService({
        store: new AutoBackfillQueueStore({ dbPath: runtimeDbPath }),
        coverageService,
        completionDb,
        executorRegistry: runtimeExecutorRegistry,
    });
    const runtimeCoordinator = coordinatorFactory({ queueService: runtimeQueueService });
    runtimeQueueService.setWorkAvailableNotifier(() => runtimeCoordinator.wake());
    return {
        queueService: runtimeQueueService,
        executorRegistry: runtimeExecutorRegistry,
        coordinator: runtimeCoordinator,
    };
}

function ensureRuntime() {
    if (queueService) return;
    const runtime = buildRuntime();
    queueService = runtime.queueService;
    executorRegistry = runtime.executorRegistry;
    coordinator = runtime.coordinator;
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
    buildRuntime,
    getAutoBackfillQueueService,
    getAutoBackfillWorkerCoordinator,
    recoverAutoBackfillQueueOnStartup,
    startAutoBackfillQueueRuntime,
    stopAutoBackfillQueueRuntime,
    registerAutoBackfillExecutor,
    wakeAutoBackfillQueue,
};
