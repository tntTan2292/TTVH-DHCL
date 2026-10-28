'use strict';

// Leftover export files on the DKCL portal (PO decision 2026-10-28): the name pattern, the client sweep and its
// use by the queue executors.

const test = require('node:test');
const assert = require('node:assert/strict');
const { DkclHueF13PortalClient } = require('./src/services/dkclHueF13PortalClient');
const {
    LEFTOVER_EXPORT_NAME,
    LEFTOVER_MAX_FILES,
    sweepLeftoverFiles,
    sweepWhenIdle,
} = require('./src/services/dkclLeftoverCleanup');
const { DkclSessionKeepAlive } = require('./src/services/dkclSessionKeepAlive');
const { F42AutoBackfillExecutor } = require('./src/services/autoBackfillF42Executors');
const { F42_EXECUTOR_IDENTITIES } = require('./src/services/autoBackfillF42Contract');

const NOW = new Date('2026-10-28T09:00:00+07:00');

function portalTime(minutesAgo) {
    const d = new Date(NOW.getTime() - minutesAgo * 60000 + 7 * 3600000);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} - ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

function clientWithRows(rows, { failOn = new Set() } = {}) {
    const client = Object.create(DkclHueF13PortalClient.prototype);
    client.baseUrl = 'https://portal.test';
    client.source = 'TCT';
    client.deleted = [];
    client.page = {
        async goto() {},
        locator() { return { first() { return { async waitFor() {} }; } }; },
        async evaluate() { return rows.map((row) => ({ filename: row.filename, createdAtText: row.createdAtText })); },
    };
    client.deleteGeneratedFile = async (file) => {
        if (failOn.has(file.filename)) {
            const error = new Error('delete button missing');
            error.code = 'CLEANUP_DELETE_NOT_FOUND';
            throw error;
        }
        client.deleted.push(file.filename);
        return { status: 'DELETED' };
    };
    return client;
}

test('the leftover name pattern takes our exports in both naming forms and nothing else', () => {
    const ours = [
        '25418_28-10-2026_08-02-02_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh_01.xlsx',
        '25418_28-10-2026_07-46-56_F1.2_CL_thu_gom_buu_giay_lien_tinh_01.xlsx',
        '25418_27-10-2026_23-18-17_F4.2_chat_luong_phat_giao_buu_ta_01.xlsx',
        '25427_28-10-2026_07-32-46_F4.2_chat_luong_phat_giao_buu_ta_chi_tiet_01.csv',
        '25427_28-10-2026_07-30-22_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet_01.xlsx',
        '25418_28-10-2026_07-31-13_F4.1_chat_luong_phat_thanh_cong_cua_buu_cuc_01.xlsx',
        '27-10-2026_08-08-35_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh(1).xlsx',
    ];
    for (const name of ours) assert.equal(LEFTOVER_EXPORT_NAME.test(name), true, name);
    const notOurs = [
        'Bao_cao_tuan_42.xlsx',
        '25418_28-10-2026_08-02-02_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh_01.txt',
        '25418_28-10-2026_08-02-02_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh.xlsx',
        'F9.9_something_01.xlsx',
        '',
        undefined,
    ];
    for (const name of notOurs) assert.equal(LEFTOVER_EXPORT_NAME.test(String(name ?? '')), false, String(name));
});

test('the sweep deletes only our old files, oldest first, and leaves recent and foreign ones', async () => {
    const mine = (minutesAgo, tag) => ({ filename: `25418_28-10-2026_${tag}_F4.2_chat_luong_phat_giao_buu_ta_01.xlsx`, createdAtText: portalTime(minutesAgo) });
    const client = clientWithRows([
        mine(2, 'recent'),
        { filename: 'Bao_cao_tuan_42.xlsx', createdAtText: portalTime(600) },
        mine(60, 'b'),
        mine(300, 'a'),
        mine(14, 'edge'),
        { filename: mine(500, 'bad').filename, createdAtText: 'not a time' },
    ]);
    const outcome = await client.deleteLeftoverGeneratedFiles({ now: NOW });
    assert.deepEqual(client.deleted, [mine(300, 'a').filename, mine(60, 'b').filename]);
    assert.deepEqual({ listed: outcome.listed, candidates: outcome.candidates, deleted: outcome.deleted, failed: outcome.failed }, { listed: 6, candidates: 2, deleted: 2, failed: 0 });
});

test('the sweep stops at the file limit and keeps the rest for the next job', async () => {
    const rows = Array.from({ length: 14 }, (_, index) => ({
        filename: `25418_27-10-2026_10-00-${String(index).padStart(2, '0')}_F1.2_CL_thu_gom_buu_giay_lien_tinh_01.xlsx`,
        createdAtText: portalTime(1000 - index),
    }));
    const client = clientWithRows(rows);
    const outcome = await client.deleteLeftoverGeneratedFiles({ now: NOW });
    assert.equal(LEFTOVER_MAX_FILES, 10);
    assert.equal(outcome.candidates, 14);
    assert.equal(outcome.deleted, 10);
    assert.equal(client.deleted[0], rows[0].filename, 'the oldest goes first');
});

test('the sweep gives up after three failed deletions and reports why', async () => {
    const rows = Array.from({ length: 8 }, (_, index) => ({
        filename: `25418_27-10-2026_10-00-${String(index).padStart(2, '0')}_F4.1_chat_luong_phat_thanh_cong_cua_buu_cuc_01.xlsx`,
        createdAtText: portalTime(1000 - index),
    }));
    const failOn = new Set(rows.slice(0, 5).map((row) => row.filename));
    const client = clientWithRows(rows, { failOn });
    const outcome = await client.deleteLeftoverGeneratedFiles({ now: NOW });
    assert.equal(outcome.failed, 3);
    assert.equal(outcome.deleted, 0);
    assert.deepEqual(outcome.errors, ['CLEANUP_DELETE_NOT_FOUND', 'CLEANUP_DELETE_NOT_FOUND', 'CLEANUP_DELETE_NOT_FOUND']);
});

test('sweepLeftoverFiles never throws, logs a summary, and does not wait for a hung cleanup', async () => {
    const lines = [];
    const logger = { log: (line) => lines.push(`log ${line}`), warn: (line) => lines.push(`warn ${line}`) };

    assert.equal(await sweepLeftoverFiles({}, { source: 'TCT', logger }), null, 'a client without the method is skipped');

    const ok = await sweepLeftoverFiles({ deleteLeftoverGeneratedFiles: async () => ({ listed: 5, candidates: 3, deleted: 3, failed: 0, errors: [] }) }, { source: 'TCT', logger });
    assert.equal(ok.deleted, 3);
    assert.match(lines.at(-1), /log \[DKCL-LEFTOVER\] TCT listed=5 leftover=3 deleted=3 failed=0/);

    const quiet = await sweepLeftoverFiles({ deleteLeftoverGeneratedFiles: async () => ({ listed: 5, candidates: 0, deleted: 0, failed: 0, errors: [] }) }, { source: 'TCT', logger });
    assert.equal(quiet.candidates, 0);
    assert.equal(lines.length, 1, 'nothing to report, nothing logged');

    assert.equal(await sweepLeftoverFiles({ deleteLeftoverGeneratedFiles: async () => { throw new Error('page closed'); } }, { source: 'HUE', logger }), null);
    assert.match(lines.at(-1), /warn \[DKCL-LEFTOVER\] HUE cleanup failed: page closed/);

    const hung = await sweepLeftoverFiles({ deleteLeftoverGeneratedFiles: () => new Promise(() => {}) }, { source: 'HUE', logger, budgetMs: 20 });
    assert.equal(hung.timedOut, true);
    assert.match(lines.at(-1), /warn \[DKCL-LEFTOVER\] HUE cleanup did not finish within 20 ms/);
});

function executorHarness({ client }) {
    const entry = { activeOperation: null };
    const seen = { activeDuringSweep: null };
    const service = {
        async preflight() { return { status: 'SESSION_VALID' }; },
        async withSourceLock(source, fn) { return fn(); },
        getRegistryState() { return entry; },
        getInteractiveClient() { return client; },
    };
    client.deleteLeftoverGeneratedFiles = async () => {
        seen.activeDuringSweep = entry.activeOperation;
        seen.swept = (seen.swept || 0) + 1;
        if (seen.sweepThrows) throw new Error('sweep broke');
        return { listed: 1, candidates: 0, deleted: 0, failed: 0, errors: [] };
    };
    return { entry, seen, service };
}

test('an F4.2 executor sweeps after the job while it still owns the source, and a broken sweep changes nothing', async () => {
    const client = {};
    const { entry, seen, service } = executorHarness({ client });
    let adapterResult = { status: 'SUCCESS' };
    const adapter = { async runOneDate() { if (adapterResult instanceof Error) throw adapterResult; return adapterResult; } };
    const executor = new F42AutoBackfillExecutor({ identity: F42_EXECUTOR_IDENTITIES.TCT, adapter, sessionPreflightService: service });
    const request = { indicator: 'F4.2', sourceLane: 'TCT', businessDate: '2026-10-27' };

    assert.deepEqual(await executor.execute(request), { status: 'SUCCESS' });
    assert.equal(seen.swept, 1);
    assert.equal(seen.activeDuringSweep, 'AUTO_BACKFILL_F42_TCT', 'the sweep runs while the source is still owned');
    assert.equal(entry.activeOperation, null);

    seen.sweepThrows = true;
    assert.deepEqual(await executor.execute(request), { status: 'SUCCESS' }, 'a failing sweep does not fail the job');

    seen.sweepThrows = false;
    adapterResult = Object.assign(new Error('Timed out'), { code: 'EXPORT_TIMEOUT' });
    await assert.rejects(executor.execute(request), (error) => error.code === 'EXPORT_TIMEOUT');
    assert.equal(seen.swept, 3, 'a failed job is swept too');
    assert.equal(entry.activeOperation, null);
});

function idleService({ activeOperation = null, hasClient = true } = {}) {
    const entry = { activeOperation };
    const events = [];
    const client = {
        async deleteLeftoverGeneratedFiles() {
            events.push(`sweep while ${entry.activeOperation}`);
            return { listed: 3, candidates: 2, deleted: 2, failed: 0, errors: [] };
        },
    };
    return {
        entry,
        events,
        service: {
            getRegistryState: () => entry,
            getInteractiveClient: () => (hasClient ? client : null),
            async withSourceLock(source, fn) { events.push(`lock ${source}`); return fn(); },
        },
    };
}

test('an idle source is swept under the source lock with the marker set, and the marker is cleared afterwards', async () => {
    const { entry, events, service } = idleService();
    const outcome = await sweepWhenIdle(service, 'TCT', { logger: { log() {}, warn() {} } });
    assert.equal(outcome.deleted, 2);
    assert.deepEqual(events, ['lock TCT', 'sweep while LEFTOVER_CLEANUP_TCT']);
    assert.equal(entry.activeOperation, null);
});

test('a busy source or one without a live client is not swept', async () => {
    const busy = idleService({ activeOperation: 'AUTO_BACKFILL_F42_TCT' });
    assert.equal(await sweepWhenIdle(busy.service, 'TCT'), null);
    assert.deepEqual(busy.events, [], 'a busy source is not even locked');
    assert.equal(busy.entry.activeOperation, 'AUTO_BACKFILL_F42_TCT', 'its marker is left alone');

    const noClient = idleService({ hasClient: false });
    assert.equal(await sweepWhenIdle(noClient.service, 'TCT'), null);
    assert.equal(noClient.entry.activeOperation, null);

    assert.equal(await sweepWhenIdle({}, 'TCT'), null, 'a session service without locking is skipped');
});

test('the keep-alive sweeps only a source whose session is valid, and a failing sweep never disturbs it', async () => {
    const swept = [];
    const live = { HUE: true, TCT: true };
    const statuses = { HUE: 'SESSION_VALID', TCT: 'AUTHENTICATION_REQUIRED' };
    const sessionService = {
        getInteractiveClient: (source) => (live[source] ? {} : null),
        async preflight(source) { return { status: statuses[source] }; },
    };
    const silent = { log() {}, warn() {} };
    const logDir = require('node:fs').mkdtempSync(require('node:path').join(require('node:os').tmpdir(), 'keepalive-sweep-'));
    try {
        const keepAlive = new DkclSessionKeepAlive({
            sessionService, logDir, logger: silent,
            idleSweep: async (source) => { swept.push(source); throw new Error('sweep broke'); },
        });
        await keepAlive.tick();
        assert.deepEqual(swept, ['HUE']);
        const plain = new DkclSessionKeepAlive({ sessionService, logDir, logger: silent });
        await plain.tick();
        assert.deepEqual(swept, ['HUE'], 'without the hook nothing is swept');
    } finally {
        require('node:fs').rmSync(logDir, { recursive: true, force: true });
    }
});
