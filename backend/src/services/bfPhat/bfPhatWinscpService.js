/**
 * BF-PHAT-IMPORT-01 -- downloads daily BatchFiles from the "SLP Chitiet" folder with WinSCP.com using the
 * saved WinSCP session (the password stays in WinSCP; this code never sees or stores it).
 * Download only: nothing on the server is changed or deleted.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const DEFAULT_WINSCP_COM = 'C:\\Program Files (x86)\\WinSCP\\WinSCP.com';
const DEFAULT_SESSION = 'cas_hue@10.1.45.10';
const DEFAULT_REMOTE_DIR = '/SLP Chitiet';
const DEFAULT_LOCAL_ROOT = path.resolve(__dirname, '../../../../Data BF Phat');

const ddmmyyyy = (iso) => `${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(0, 4)}`;

function buildScript({ session, remoteDir, localDir, dates }) {
    const dest = `${localDir.replace(/\//g, '\\').replace(/\\+$/, '')}\\`;
    const lines = ['option batch continue', 'option confirm off', `open ${session}`, `cd "${remoteDir}"`];
    for (const date of dates) {
        lines.push(`get -transfer=binary -filemask="SanLuongChiTiet_${ddmmyyyy(date)}*.xlsx" * "${dest}"`);
    }
    lines.push('exit');
    return lines.join('\n');
}

/**
 * Downloads the files of the given ISO dates into <localRoot>/<year>/.
 * Resolves { code, log } -- code is WinSCP's exit code (0 = all transfers fine).
 */
function downloadDays(dates, {
    winscp = process.env.BF_PHAT_WINSCP_COM || DEFAULT_WINSCP_COM,
    session = process.env.BF_PHAT_WINSCP_SESSION || DEFAULT_SESSION,
    remoteDir = process.env.BF_PHAT_REMOTE_DIR || DEFAULT_REMOTE_DIR,
    localRoot = process.env.BF_PHAT_LOCAL_ROOT || DEFAULT_LOCAL_ROOT,
    timeoutMs = 10 * 60 * 1000,
} = {}) {
    const byYear = new Map();
    for (const date of dates) {
        const year = date.slice(0, 4);
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year).push(date);
    }
    return Promise.all([...byYear].map(([year, yearDates]) => new Promise((resolve) => {
        const localDir = path.join(localRoot, year);
        fs.mkdirSync(localDir, { recursive: true });
        const scriptPath = path.join(os.tmpdir(), `bfphat_get_${year}_${process.pid}_${Date.now()}.txt`);
        fs.writeFileSync(scriptPath, buildScript({ session, remoteDir, localDir, dates: yearDates }), 'ascii');
        execFile(winscp, [`/script=${scriptPath}`], { timeout: timeoutMs, windowsHide: true, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
            fs.rmSync(scriptPath, { force: true });
            resolve({ year, localDir, code: error ? (error.code ?? 1) : 0, log: `${stdout || ''}${stderr || ''}`.slice(-4000) });
        });
    }))).then((parts) => ({
        code: parts.every((part) => part.code === 0) ? 0 : 1,
        dirs: parts.map((part) => part.localDir),
        log: parts.map((part) => part.log).join('\n'),
    }));
}

module.exports = { downloadDays, buildScript, ddmmyyyy, DEFAULT_LOCAL_ROOT };
