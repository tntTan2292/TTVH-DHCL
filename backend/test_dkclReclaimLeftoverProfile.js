'use strict';

// A DKCL browser / profile lock left behind by a previous backend run is reclaimed by the background preflight,
// so a restart no longer parks the Auto Backfill at "cannot verify the process using the browser profile".

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const processManager = require('./src/services/browserProcessManager');
const { DkclSessionPreflightService, globalRegistry } = require('./src/services/dkclSessionPreflightService');

function setup({ matching = [], lockDir = false }) {
    globalRegistry.clear();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dkcl-reclaim-'));
    const profileDir = path.join(root, 'TCT');
    fs.mkdirSync(profileDir);
    if (lockDir) fs.mkdirSync(`${profileDir}.lock`);
    process.env.DKCL_TCT_PROFILE_DIR = profileDir;
    const calls = { terminated: [], cleaned: 0, authenticated: 0 };
    processManager.findBrowserProcessByProfile = async () => ({ inspectionStatus: 'SUCCESS', matchingProcesses: matching, errorCode: null });
    processManager.terminateProcessTree = async (pid) => { calls.terminated.push(pid); };
    processManager.cleanupStaleLocks = (dir) => { calls.cleaned += 1; fs.rmSync(`${dir}.lock`, { recursive: true, force: true }); };
    const service = new DkclSessionPreflightService({
        coordinatorEnabled: false,
        hueBrokerEnabled: false,
        portalClientFactory: () => ({
            authenticate: async () => { calls.authenticated += 1; },
            close: async () => {},
        }),
    });
    return { service, calls, profileDir, root };
}

const proc = (pid, parentPid) => ({ pid, parentPid, exactProfileMatch: true });

test('an orphaned browser from a previous backend run is ended before the session check', async () => {
    const { service, calls, root } = setup({ matching: [proc(100, 1), proc(101, 100), proc(102, 100)], lockDir: true });
    try {
        const result = await service.preflight('TCT');
        assert.deepEqual(calls.terminated, [100]);
        assert.equal(calls.cleaned, 1);
        assert.equal(calls.authenticated, 1);
        assert.equal(result.status, 'SESSION_VALID');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('a stale lock folder with no browser is removed', async () => {
    const { service, calls, profileDir, root } = setup({ lockDir: true });
    try {
        await service.preflight('TCT');
        assert.deepEqual(calls.terminated, []);
        assert.equal(calls.cleaned, 1);
        assert.equal(fs.existsSync(`${profileDir}.lock`), false);
        assert.equal(calls.authenticated, 1);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('a browser started by this very process is left alone', async () => {
    const { service, calls, root } = setup({ matching: [proc(200, process.pid), proc(201, 200)], lockDir: true });
    try {
        await service.preflight('TCT');
        assert.deepEqual(calls.terminated, []);
        assert.equal(calls.cleaned, 0);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('nothing is touched when there is neither a browser nor a lock', async () => {
    const { service, calls, root } = setup({});
    try {
        await service.preflight('TCT');
        assert.deepEqual(calls.terminated, []);
        assert.equal(calls.cleaned, 0);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
