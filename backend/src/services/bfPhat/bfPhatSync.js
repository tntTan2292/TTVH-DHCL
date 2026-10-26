/**
 * BF-PHAT-IMPORT-01 -- one sync pass: list the server folder, find the days that are new or whose file was re-exported
 * bigger (TCT corrects old days), download only those files, delete the superseded local copy so one day keeps one file,
 * and import each changed day. Only D-1 (the new day) is expected every time; older days are touched only when they changed.
 */
'use strict';

const path = require('path');

const { groupDailyFiles, pruneSupersededFiles } = require('./bfPhatImportService');
const { extractBfDateFromFilename } = require('./parseBfPhatDailyExcel');
const { listRemote, planChanges, downloadFiles, DEFAULT_LOCAL_ROOT } = require('./bfPhatWinscpService');

const TRACKING_START = '2026-01-01';

/**
 * Returns { listed, plan, results, errors } where results is the import outcome per changed day and errors are
 * human-readable problems (listing failed, a file did not arrive).
 */
async function syncChangedDays({
    toDate,
    fromDate = TRACKING_START,
    localRoot = process.env.BF_PHAT_LOCAL_ROOT || DEFAULT_LOCAL_ROOT,
    importer,
    list = listRemote,
    download = downloadFiles,
    actor = null,
    trigger = 'AUTO',
    logger = console,
}) {
    const out = { listed: 0, plan: [], results: [], errors: [], newDayOnServer: false };
    const listing = await list();
    if (listing.code !== 0) {
        out.errors.push('WinSCP không liệt kê được thư mục SLP Chitiet');
        return out;
    }
    out.listed = listing.files.length;
    out.newDayOnServer = listing.files.some((file) => extractBfDateFromFilename(file.name) === toDate);

    // one folder per year; days of other years are compared against their own folder
    const years = [...new Set(listing.files.map((file) => extractBfDateFromFilename(file.name).slice(0, 4)))].filter((year) => year >= fromDate.slice(0, 4) && year <= toDate.slice(0, 4));
    for (const year of years) {
        const dir = path.join(localRoot, year);
        let localByDate = new Map();
        try {
            localByDate = new Map([...groupDailyFiles(dir)].map(([date, group]) => [date, { name: group.winner.name, size: group.winner.size }]));
        } catch (_) { /* folder not there yet: every day is new */ }
        const plan = planChanges({ remote: listing.files, localByDate, fromDate: fromDate > `${year}-01-01` ? fromDate : `${year}-01-01`, toDate: toDate < `${year}-12-31` ? toDate : `${year}-12-31` });
        if (plan.length === 0) continue;
        out.plan.push(...plan);

        const got = await download(plan.map((item) => item.name), dir);
        if (got.code !== 0) logger.warn?.(`[BF-PHAT] WinSCP download exit ${got.code}; checking which files arrived.`);

        const after = groupDailyFiles(dir);
        const arrived = [];
        for (const item of plan) {
            const group = after.get(item.date);
            if (group && group.winner.name === item.name && group.winner.size === item.size) arrived.push(item);
            else out.errors.push(`${item.date}: file ${item.name} chưa về đủ`);
        }
        pruneSupersededFiles(dir, arrived.map((item) => item.date));
        for (const item of arrived) {
            const result = await importer.importFile(path.join(dir, item.name), { actor, trigger });
            out.results.push({ ...result, reason: item.reason });
        }
    }
    return out;
}

module.exports = { syncChangedDays, TRACKING_START };
