'use strict';

const assert = require('assert');
const {
    DKCL_REPORT_EXTENSIONS,
    attachSourceEvidence,
    createBaseEvidence,
    createQueueId,
    publicQueue
} = require('./src/services/dkclImportOperationsContract');

const fixedClock = () => new Date('2026-07-24T10:11:12.000Z');

const hueQueueId = createQueueId({
    source: 'HUE',
    report: 'F1.3',
    purpose: 'backfill',
    clock: fixedClock,
    sequence: 1
});
const tctQueueId = createQueueId({
    source: 'TCT',
    report: 'F1.3',
    purpose: 'backfill',
    clock: fixedClock,
    sequence: 1
});

assert.strictEqual(hueQueueId, 'hue-f13-backfill-20260724101112-0001');
assert.strictEqual(tctQueueId, 'tct-f13-backfill-20260724101112-0001');
assert.notStrictEqual(hueQueueId, tctQueueId, 'identical timestamps remain source-isolated');

const evidence = attachSourceEvidence(
    createBaseEvidence({
        source: 'TCT',
        report: 'F1.3',
        businessDate: '2026-07-24',
        queueId: tctQueueId,
        runId: 'run-1'
    }),
    {
        source: 'TCT',
        report: 'F1.3',
        originalFilename: 'F1.3_chat_luong_phat_buu_giay_lien_tinh.xlsx',
        standardizedFilename: 'F1.3-2026.07.24.xlsx',
        processedPath: 'Data DKCL/F1.3/Processed/TCT/F1.3-2026.07.24.xlsx'
    }
);

assert.strictEqual(evidence.source, 'TCT');
assert.strictEqual(evidence.source_report, 'TCT_F13');
assert.strictEqual(evidence.source_original_filename, 'F1.3_chat_luong_phat_buu_giay_lien_tinh.xlsx');
assert.strictEqual(evidence.source_standardized_filename, 'F1.3-2026.07.24.xlsx');
assert.match(evidence.source_processed_artifact, /Processed\/TCT/);

const queue = publicQueue({
    queueId: tctQueueId,
    source: 'TCT',
    report: 'F1.3',
    status: 'SUCCESS',
    stopRequested: false,
    createdAt: fixedClock().toISOString(),
    startedAt: fixedClock().toISOString(),
    endedAt: fixedClock().toISOString(),
    restartNotice: 'memory queue',
    items: [
        {
            measurementDate: '2026-07-24',
            status: 'SUCCESS',
            evidence
        }
    ]
});

assert.strictEqual(queue.source, 'TCT');
assert.strictEqual(queue.report, 'F1.3');
assert.strictEqual(queue.progress.success, 1);
assert.strictEqual(queue.items[0].evidence.source_report, 'TCT_F13');

assert.deepStrictEqual(
    DKCL_REPORT_EXTENSIONS,
    {
        F13: 'F1.3',
        F11: 'F1.1',
        F12: 'F1.2',
        F41: 'F4.1'
    },
    'future report identifiers are reserved without implementing report behavior'
);

console.log('dkclImportOperationsContract checks passed.');
