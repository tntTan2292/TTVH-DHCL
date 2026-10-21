'use strict';

const { dbPath, all, get } = require('../config/db');
const { AutoBackfillCoverageService } = require('./autoBackfillCoverageService');
const { AutoBackfillQueueStore } = require('./autoBackfillQueueStore');
const { AutoBackfillQueueService } = require('./autoBackfillQueueService');
const { AutoBackfillExecutorRegistry } = require('./autoBackfillExecutorRegistry');
const { AutoBackfillWorkerCoordinator } = require('./autoBackfillWorkerCoordinator');
const { registerVerifiedAutoBackfillExecutors } = require('./autoBackfillExecutors');
const { INDICATORS } = require('./importIndicatorRegistry');

let queueService = null;
let executorRegistry = null;
let coordinator = null;

// AUTO-BACKFILL-PARALLEL-LANES-01: AUTO_BACKFILL_PARALLEL_LANES=true gives every source lane (HUE, TCT) its own
// coordinator, so one HUE job and one TCT job can run at the same time (two different portal users, two browser
// profiles). Off by default: one job at a time in the whole queue, exactly as before.
function isParallelLanesEnabled(env = process.env) {
    return String(env.AUTO_BACKFILL_PARALLEL_LANES || '').trim().toLowerCase() === 'true';
}

function listLaneCodes() {
    const lanes = new Set();
    for (const indicator of Object.values(INDICATORS)) {
        for (const lane of Object.keys(indicator.lanes || {})) lanes.add(String(lane).toUpperCase());
    }
    return [...lanes].sort();
}

// One coordinator per lane behind the single-coordinator interface the rest of the runtime already uses.
class LaneCoordinatorGroup {
    constructor(coordinators) {
        this.coordinators = coordinators;
    }

    start() {
        for (const coordinator of this.coordinators) coordinator.start();
        return this;
    }

    wake(reason) {
        let woken = false;
        for (const coordinator of this.coordinators) woken = Boolean(coordinator.wake(reason)) || woken;
        return woken;
    }

    async stop() {
        await Promise.all(this.coordinators.map((coordinator) => coordinator.stop()));
    }

    snapshot() {
        return { parallel: true, lanes: this.coordinators.map((coordinator) => coordinator.snapshot()) };
    }
}

function buildRuntime({
    runtimeDbPath = dbPath,
    completionDb = { all, get },
    registerExecutors = registerVerifiedAutoBackfillExecutors,
    coordinatorFactory = (options) => new AutoBackfillWorkerCoordinator(options),
    parallelLanes = isParallelLanesEnabled(),
    lanes = listLaneCodes(),
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
    const runtimeCoordinator = parallelLanes && lanes.length > 1
        ? new LaneCoordinatorGroup(lanes.map((lane) => coordinatorFactory({ queueService: runtimeQueueService, lane })))
        : coordinatorFactory({ queueService: runtimeQueueService });
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
    if (coordinator instanceof LaneCoordinatorGroup) {
        console.log(`[AUTO-BACKFILL-QUEUE] parallel lanes ON: ${coordinator.coordinators.map((item) => item.lane).join(' + ')} run at the same time.`);
    } else {
        console.log('[AUTO-BACKFILL-QUEUE] one job at a time (set AUTO_BACKFILL_PARALLEL_LANES=true to run HUE and TCT in parallel).');
    }
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
    isParallelLanesEnabled,
    listLaneCodes,
    LaneCoordinatorGroup,
    getAutoBackfillQueueService,
    getAutoBackfillWorkerCoordinator,
    recoverAutoBackfillQueueOnStartup,
    startAutoBackfillQueueRuntime,
    stopAutoBackfillQueueRuntime,
    registerAutoBackfillExecutor,
    wakeAutoBackfillQueue,
};
