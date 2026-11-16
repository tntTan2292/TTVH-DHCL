'use strict';

// AUTO-IMPORT-016: F1.3 HUE detail-table timeout (16/11/2026). P0 log time + evidence, P2 preflight never navigates a
// busy source, P3 detail table wait with one re-click. (P1 is in test_dkclLeftoverCleanup.js, P4 in
// test_autoBackfillSafety.js / test_autoBackfillQueueService.js.)

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const logTimestamp = require('../config/logTimestamp');
const evidence = require('./dkclDetailTimeoutEvidence');
const { DkclHueF13PortalClient } = require('./dkclHueF13PortalClient');
const { DkclSessionPreflightService, PREFLIGHT_STATUSES } = require('./dkclSessionPreflightService');
const { DKCL_LIFECYCLE_STATES } = require('./dkclLifecycleContract');

// ---------------------------------------------------------------- P0

test('AUTO-IMPORT-016 P0: every console line gets an ISO time, once, and objects still print as objects', () => {
    const seen = [];
    const target = {};
    for (const method of ['log', 'info', 'warn', 'error', 'debug']) target[method] = (...args) => seen.push([method, args]);
    const fixed = () => new Date('2026-11-16T00:30:28.405Z');
    assert.equal(logTimestamp.install({ target, now: fixed }), true);
    assert.equal(logTimestamp.install({ target, now: fixed }), false, 'second install does nothing');

    target.warn('[DKCL] something');
    target.log({ a: 1 });
    assert.deepEqual(seen[0], ['warn', ['[2026-11-16T00:30:28.405Z] [DKCL] something']]);
    assert.deepEqual(seen[1], ['log', ['[2026-11-16T00:30:28.405Z]', { a: 1 }]]);
});

function tmpDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'ai016-'));
}

test('AUTO-IMPORT-016 P0: evidence keeps only the newest 20 files', () => {
    const dir = tmpDir();
    try {
        for (let i = 0; i < 26; i += 1) {
            const file = path.join(dir, `${evidence.EVIDENCE_PREFIX}${String(i).padStart(2, '0')}.png`);
            fs.writeFileSync(file, 'x');
            const when = new Date(Date.now() - (100 - i) * 1000);
            fs.utimesSync(file, when, when);
        }
        fs.writeFileSync(path.join(dir, 'other.txt'), 'keep me');
        evidence.pruneEvidence(dir);
        const left = fs.readdirSync(dir).filter((name) => name.startsWith(evidence.EVIDENCE_PREFIX)).sort();
        assert.equal(left.length, evidence.MAX_EVIDENCE_FILES);
        assert.equal(left[0], `${evidence.EVIDENCE_PREFIX}06.png`, 'the six oldest were removed');
        assert.ok(fs.existsSync(path.join(dir, 'other.txt')), 'files that are not evidence are never touched');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('AUTO-IMPORT-016 P0: a timeout writes screenshot + html and one line with the page facts; it never throws', async () => {
    const dir = tmpDir();
    const lines = [];
    const logger = { warn: (line) => lines.push(line), log: (line) => lines.push(line) };
    const page = {
        url: () => 'https://dkcl.example/kpi/chat-luong-phat-buu-gui-lien-tinh',
        title: async () => 'Chất lượng phát bưu gửi liên tỉnh',
        evaluate: async () => ({ formPresent: false, ajaxCellCount: 4, tableRowCount: 3, totalText: 'Tổng số: 3092' }),
        screenshot: async () => Buffer.from('png'),
        content: async () => '<html></html>',
    };
    try {
        evidence.resetLoopDelay();
        const summary = await evidence.captureDetailTimeoutEvidence(page, {
            source: 'HUE', clickedAtMs: 1000, clicks: 2, detailFormSelector: 'form.x', dir, now: () => 61000, logger,
        });
        assert.equal(summary.url, 'https://dkcl.example/kpi/chat-luong-phat-buu-gui-lien-tinh');
        assert.equal(summary.formPresent, false);
        assert.equal(summary.ajaxCellCount, 4);
        assert.equal(summary.totalText, 'Tổng số: 3092');
        assert.equal(summary.msSinceFirstClick, 60000);
        assert.equal(summary.clicks, 2);
        assert.ok(summary.loopDelayMaxMs === null || summary.loopDelayMaxMs >= 0, 'event-loop delay is reported');
        const written = fs.readdirSync(dir);
        assert.equal(written.filter((n) => n.endsWith('.png')).length, 1);
        assert.equal(written.filter((n) => n.endsWith('.html')).length, 1);
        assert.match(lines.at(-1), /^\[F13-DETAIL-TIMEOUT\] \{.*"formPresent":false.*"ajaxCellCount":4/);

        const broken = { url: () => { throw new Error('closed'); }, title: async () => { throw new Error('closed'); }, evaluate: async () => { throw new Error('closed'); }, screenshot: async () => { throw new Error('closed'); }, content: async () => { throw new Error('closed'); } };
        await assert.doesNotReject(() => evidence.captureDetailTimeoutEvidence(broken, { source: 'HUE', dir, logger }));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

// ---------------------------------------------------------------- P3

const REPORT_URL = 'https://dkcl.example/kpi/chat-luong-phat-buu-gui-lien-tinh';

// A page with one clickable detail cell; the detail form appears after `appearsOnClick` clicks (0 = never).
function detailPage({ appearsOnClick = 1, url = REPORT_URL } = {}) {
    const state = { clicks: 0, waits: [], url, content: '<html></html>' };
    const cell = {
        async count() { return 1; },
        async isVisible() { return true; },
        async click() { state.clicks += 1; },
    };
    const page = {
        state,
        url: () => state.url,
        title: async () => 'Chất lượng phát bưu gửi liên tỉnh',
        async waitForTimeout() {},
        async evaluate(fn) {
            // the candidate lookup (first call, takes the header) -- anything else is the evidence facts
            if (String(fn).includes('visibleCandidateCount')) {
                return { index: 0, visibleCandidateCount: 1, selected: { header: 'SL bưu gửi phát thành công/Nộp tiền/CH', total: 3092, cellIndex: 4 } };
            }
            return { formPresent: false, ajaxCellCount: 1, tableRowCount: 3, totalText: null };
        },
        screenshot: async () => Buffer.from('png'),
        content: async () => state.content,
        locator(selector) {
            if (selector === 'table tr') return { nth: () => ({ locator: () => ({ nth: () => cell }) }) };
            return {
                async waitFor({ timeout }) {
                    state.waits.push(timeout);
                    if (appearsOnClick > 0 && state.clicks >= appearsOnClick) return;
                    const error = new Error(`locator.waitFor: Timeout ${timeout}ms exceeded.`);
                    error.name = 'TimeoutError';
                    throw error;
                },
            };
        },
    };
    return page;
}

function clientFor(page, dir) {
    const lines = [];
    const client = new DkclHueF13PortalClient({ headless: true, source: 'HUE', logger: { log: (l) => lines.push(l), warn: (l) => lines.push(l) } });
    client.page = page;
    client.detailEvidenceDir = dir;
    client.lines = lines;
    return client;
}

test('AUTO-IMPORT-016 P3: the form appears after the first click -> one click, click-to-form time logged', async () => {
    const dir = tmpDir();
    try {
        const page = detailPage({ appearsOnClick: 1 });
        const client = clientFor(page, dir);
        const metric = await client.openDetailTable();
        assert.equal(page.state.clicks, 1);
        assert.deepEqual(page.state.waits, [20000], 'first wait is 20 s');
        assert.equal(metric.value, 3092);
        assert.ok(client.lines.some((l) => /\[F13-DETAIL\] HUE detail table opened click_to_form_ms=\d+ clicks=1/.test(l)));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('AUTO-IMPORT-016 P3: no form after 20 s while still on the F1.3 report -> click once more, 60 s in all', async () => {
    const dir = tmpDir();
    try {
        const page = detailPage({ appearsOnClick: 2 });
        const client = clientFor(page, dir);
        await client.openDetailTable();
        assert.equal(page.state.clicks, 2);
        assert.equal(page.state.waits[0], 20000);
        assert.equal(page.state.waits[1], 40000, 'the second wait is the rest of the 60 s');
        assert.ok(client.lines.some((l) => /clicks=2/.test(l)));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('AUTO-IMPORT-016 P3: still no form after the second click -> F13_DETAIL_TABLE_TIMEOUT with evidence saved', async () => {
    const dir = tmpDir();
    try {
        const page = detailPage({ appearsOnClick: 0 });
        const client = clientFor(page, dir);
        await assert.rejects(() => client.openDetailTable(), (error) => {
            assert.equal(error.code, 'F13_DETAIL_TABLE_TIMEOUT');
            assert.match(error.message, /within 60 seconds/);
            return true;
        });
        assert.equal(page.state.clicks, 2, 'exactly one re-click, never more');
        assert.ok(fs.readdirSync(dir).some((n) => n.endsWith('.png')), 'screenshot kept');
        assert.ok(client.lines.some((l) => /\[F13-DETAIL-TIMEOUT\].*"clicks":2/.test(l)));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('AUTO-IMPORT-016 P3: a page that left the F1.3 report is not clicked again', async () => {
    const dir = tmpDir();
    try {
        const page = detailPage({ appearsOnClick: 0, url: 'https://dkcl.example/files' });
        const client = clientFor(page, dir);
        await assert.rejects(() => client.openDetailTable(), { code: 'F13_DETAIL_TABLE_TIMEOUT' });
        assert.equal(page.state.clicks, 1, 'no blind second click on another page');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('AUTO-IMPORT-016 P3: the duplicate readDetailTableTotal definition is gone', () => {
    const source = fs.readFileSync(path.join(__dirname, 'dkclHueF13PortalClient.js'), 'utf8');
    assert.equal((source.match(/async readDetailTableTotal\(/g) || []).length, 1);
});

// ---------------------------------------------------------------- P2

function serviceWithReadyClient({ navigations }) {
    const service = new DkclSessionPreflightService({ coordinatorEnabled: false, reprobeRetryDelayMs: 1 });
    const client = {
        isAuthenticated: async () => true,
        isF13ReportReady: async () => false,
        hasLoginForm: async () => false,
        revalidateSession: async () => { navigations.push('revalidateSession'); return true; },
        openF13Report: async () => { navigations.push('openF13Report'); },
        hideWindow: async () => false,
        restoreWindow: async () => {},
        close: async () => {},
    };
    const entry = service.getRegistryState('HUE');
    entry.client = client;
    entry.state = DKCL_LIFECYCLE_STATES.F13_READY;
    entry.lifecycleState = DKCL_LIFECYCLE_STATES.F13_READY;
    entry.authenticated = true;
    entry.backgroundReady = true;
    entry.activeOperation = null;
    entry.lastValidatedDate = '2000-01-01'; // a day rollover: would normally call revalidateSession()
    return { service, entry, client };
}

test('AUTO-IMPORT-016 P2: while an operation owns the source, preflight answers valid and navigates nothing', async () => {
    const navigations = [];
    const { service, entry } = serviceWithReadyClient({ navigations });
    entry.activeOperation = 'AUTO_BACKFILL_F13_HUE';
    const result = await service.preflight('HUE');
    assert.equal(result.status, PREFLIGHT_STATUSES.SESSION_VALID);
    assert.deepEqual(navigations, []);
    entry.activeOperation = null;
});

test('AUTO-IMPORT-016 P2: while the source lock is held (activeOperation not yet set), preflight navigates nothing', async () => {
    const navigations = [];
    const { service, entry } = serviceWithReadyClient({ navigations });
    let release;
    const held = service.withSourceLock('HUE', () => new Promise((resolve) => { release = resolve; }));
    try {
        assert.equal(service.isSourceBusy('HUE'), true);
        const result = await service.preflight('HUE');
        assert.equal(result.status, PREFLIGHT_STATUSES.SESSION_VALID);
        assert.deepEqual(navigations, [], 'neither revalidateSession nor openF13Report ran on the shared page');
    } finally {
        release();
        await held;
    }
    assert.equal(service.isSourceBusy('HUE'), false, 'the busy flag clears once the lock work ended');
    entry.client = null;
});

test('AUTO-IMPORT-016 P2: a job that takes the source while the probe reads the page stops the probe before openF13Report', async () => {
    const navigations = [];
    const { service, entry, client } = serviceWithReadyClient({ navigations });
    entry.lastValidatedDate = new Date().toLocaleDateString('sv'); // no rollover: go straight to the report check
    entry.lastValidatedAt = Date.now();
    client.isAuthenticated = async () => { entry.activeOperation = 'AUTO_BACKFILL_F13_HUE'; return true; };
    const result = await service.preflight('HUE');
    assert.equal(result.status, PREFLIGHT_STATUSES.SESSION_VALID);
    assert.equal(result.busy, true);
    assert.deepEqual(navigations, [], 'the report was not reopened under the running job');
    entry.activeOperation = null;
});

test('AUTO-IMPORT-016 P2: an idle source is still probed and its report reopened', async () => {
    const navigations = [];
    const { service, entry, client } = serviceWithReadyClient({ navigations });
    entry.lastValidatedDate = new Date().toLocaleDateString('sv');
    entry.lastValidatedAt = Date.now();
    client.isF13ReportReady = async () => false;
    const result = await service.preflight('HUE');
    assert.equal(result.status, PREFLIGHT_STATUSES.SESSION_VALID);
    assert.deepEqual(navigations, ['openF13Report'], 'nothing owns the source, so the original recovery still runs');
    entry.client = null;
});
