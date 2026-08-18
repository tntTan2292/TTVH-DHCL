'use strict';

const { dbPath, all, get } = require('../config/db');
const { AutoBackfillCoverageService } = require('./autoBackfillCoverageService');
const { AutoBackfillQueueStore } = require('./autoBackfillQueueStore');
const { AutoBackfillQueueService } = require('./autoBackfillQueueService');
const { AutoBackfillExecutorRegistry } = require('./autoBackfillExecutorRegistry');

let queueService = null;

function getAutoBackfillQueueService() {
    if (!queueService) {
        const completionDb = { all, get };
        const coverageService = new AutoBackfillCoverageService({ db: completionDb });
        queueService = new AutoBackfillQueueService({
            store: new AutoBackfillQueueStore({ dbPath }),
            coverageService,
            completionDb,
            // Deliberately empty until a later adapter ticket installs a verified executor.
            executorRegistry: new AutoBackfillExecutorRegistry(),
        });
    }
    return queueService;
}

async function recoverAutoBackfillQueueOnStartup() {
    return getAutoBackfillQueueService().recoverInterruptedWork();
}

module.exports = {
    getAutoBackfillQueueService,
    recoverAutoBackfillQueueOnStartup,
};
