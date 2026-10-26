/**
 * BF-PHAT-IMPORT-01 -- talks to the "SLP Chitiet" folder with WinSCP.com using the saved WinSCP session (the password
 * stays in WinSCP; this code never sees or stores it). Download and listing only: nothing on the server is changed or deleted.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const { extractBfDateFromFilename } = require('./parseBfPhatDailyExcel');

const DEFAULT_WINSCP_COM = 'C:\\Program Files (x86)\\WinSCP\\WinSCP.com';
const DEFAULT_SESSION = 'cas_hue@10.1.45.10';
const DEFAULT_REMOTE_DIR = '/SLP Chitiet';
const DEFAULT_LOCAL_ROOT = path.resolve(__dirname, '../../../../Data BF Phat');
const LINE_BREAK = /\r?\n/;

const ddmmyyyy = (iso) => `${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(0, 4)}`;

function settings(options = {}) {
    return {
        winscp: options.winscp || process.env.BF_PHAT_WINSCP_COM || DEFAULT_WINSCP_COM,
        session: options.session || process.env.BF_PHAT_WINSCP_SESSION || DEFAULT_SESSION,
        remoteDir: options.remoteDir || process.env.BF_PHAT_REMOTE_DIR || DEFAULT_REMOTE_DIR,
        timeoutMs: options.timeoutMs || 10 * 60 * 1000,
    };
}

function runScript(lines, { winscp, timeoutMs }) {
    return new Promise((resolve) => {
        const scriptPath = path.join(os.tmpdir(), `bfphat_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.txt`);
        fs.writeFileSync(scriptPath, lines.join('\n'), 'ascii');
        execFile(winscp, [`/script=${scriptPath}`], { timeout: timeoutMs, windowsHide: true, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
            fs.rmSync(scriptPath, { force: true });
            resolve({ code: error ? (error.code ?? 1) : 0, out: `${stdout || ''}`, log: `${stdout || ''}${stderr || ''}`.slice(-4000) });
        });
    });
}

/** Parses WinSCP `ls` output into [{ name, size }] for daily BatchFile names only. */
function parseRemoteListing(text) {
    const files = [];
    for (const line of String(text).split(LINE_BREAK)) {
        const match = /^-\S+\s+\d+\s+\S+\s+\S+\s+(\d+)\s+\w{3}\s+\d+\s+[\d:]+(?:\s+\d{4})?\s+(SanLuongChiTiet_\S+\.xlsx)\s*$/.exec(line);
        if (match && extractBfDateFromFilename(match[2])) files.push({ name: match[2], size: Number(match[1]) });
    }
    return files;
}

/** Lists the daily files on the server: { code, files, log }. */
async function listRemote(options = {}) {
    const s = settings(options);
    const result = await runScript(['option batch abort', 'option confirm off', `open ${s.session}`, `cd "${s.remoteDir}"`, 'ls', 'exit'], s);
    return { code: result.code, files: result.code === 0 ? parseRemoteListing(result.out) : [], log: result.log };
}

/**
 * Which days need a download: the day has no local file, or the best remote file (the largest -- TCT re-exports a
 * corrected day as a bigger file -- a tie going to the later name) is not the file kept locally.
 * `remote` is [{name,size}]; `localByDate` is Map<date, {name,size}>; only days fromDate..toDate (ISO) are looked at.
 * Returns [{ date, name, size, reason: 'NEW' | 'CHANGED' }], oldest first.
 */
function planChanges({ remote, localByDate, fromDate, toDate }) {
    const best = new Map();
    for (const file of remote) {
        const date = extractBfDateFromFilename(file.name);
        if (!date || date < fromDate || date > toDate) continue;
        const current = best.get(date);
        if (!current || file.size > current.size || (file.size === current.size && file.name > current.name)) best.set(date, { date, ...file });
    }
    const plan = [];
    for (const item of [...best.values()].sort((a, b) => a.date.localeCompare(b.date))) {
        const local = localByDate.get(item.date);
        if (!local) plan.push({ ...item, reason: 'NEW' });
        else if (local.name !== item.name || local.size !== item.size) plan.push({ ...item, reason: 'CHANGED' });
    }
    return plan;
}

/** Downloads exact file names into localDir. */
function downloadFiles(names, localDir, options = {}) {
    const s = settings(options);
    fs.mkdirSync(localDir, { recursive: true });
    const dest = `${path.resolve(localDir)}${path.sep}`;
    const lines = ['option batch continue', 'option confirm off', `open ${s.session}`, `cd "${s.remoteDir}"`];
    for (const name of names) lines.push(`get -transfer=binary "${name}" "${dest}"`);
    lines.push('exit');
    return runScript(lines, s);
}

module.exports = { listRemote, parseRemoteListing, planChanges, downloadFiles, ddmmyyyy, DEFAULT_LOCAL_ROOT };
