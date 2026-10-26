/**
 * BF-PHAT-IMPORT-01 CLI -- delivery BatchFile into fact_bf_phat.
 *
 *   node import_bf_phat.js [--year 2026] [--dir <folder>] [--prune] [--force] [--dry-run]
 *       load the local folder: a day already loaded from the same file is skipped, a day whose kept file differs is loaded again
 *       --prune  first delete the superseded local copy of each day (the bigger file wins)
 *   node import_bf_phat.js --sync [--to 2026-10-25]
 *       list the server, download new / re-exported-bigger days, delete the superseded local copy, import those days
 *
 * Default folder: <repo>/Data BF Phat/<year>.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const { BfPhatImportService, pickDailyFiles, pruneSupersededFiles } = require('./src/services/bfPhat/bfPhatImportService');
const { syncChangedDays } = require('./src/services/bfPhat/bfPhatSync');
const { DEFAULT_LOCAL_ROOT } = require('./src/services/bfPhat/bfPhatWinscpService');

function arg(name) {
    const index = process.argv.indexOf(name);
    return index === -1 ? null : (process.argv[index + 1] || '');
}

function yesterdayVietnam() {
    const vn = new Date(Date.now() + 7 * 3600 * 1000 - 24 * 3600 * 1000);
    return vn.toISOString().slice(0, 10);
}

async function main() {
    const year = arg('--year') || '2026';
    const force = process.argv.includes('--force');
    const dryRun = process.argv.includes('--dry-run');
    const service = new BfPhatImportService();

    if (process.argv.includes('--sync')) {
        const toDate = arg('--to') || yesterdayVietnam();
        const result = await syncChangedDays({ toDate, importer: service, actor: 'cli', trigger: 'MANUAL' });
        console.log(`Server files: ${result.listed}; days to fetch: ${result.plan.length}`);
        for (const item of result.plan) console.log(`  ${item.date} ${item.reason} ${item.name} (${item.size} bytes)`);
        for (const r of result.results) console.log(`  ${r.date} ${r.status} rows=${r.rows}${r.replaced ? ` replaced=${r.replaced}` : ''}${r.error ? ` ERROR ${r.error}` : ''}`);
        for (const e of result.errors) console.error(`  PROBLEM ${e}`);
        if (result.errors.length || result.results.some((r) => r.status === 'FAILED')) process.exitCode = 1;
        return;
    }

    const dir = arg('--dir') || path.join(DEFAULT_LOCAL_ROOT, year);
    if (!fs.existsSync(dir)) throw new Error(`Folder not found: ${dir}`);

    if (process.argv.includes('--prune') && !dryRun) {
        const removed = pruneSupersededFiles(dir);
        console.log(`Pruned ${removed.length} superseded file(s): ${removed.join(', ')}`);
    }

    if (dryRun) {
        const loaded = await service.loadedDays();
        const files = pickDailyFiles(dir);
        const todo = files.filter((file) => force || loaded.get(file.date)?.sourceFile !== file.name);
        console.log(`[dry-run] ${files.length} day files in ${dir}; ${loaded.size} days loaded; ${todo.length} would be imported.`);
        return;
    }

    const results = await service.importFolder(dir, {
        force, actor: 'cli', trigger: 'MANUAL',
        onProgress: (r) => console.log(`${r.date} ${r.status} rows=${r.rows}${r.replaced ? ` replaced=${r.replaced}` : ''}${r.error ? ` ERROR ${r.error}` : ''}`),
    });
    const count = (status) => results.filter((r) => r.status === status).length;
    console.log(`Done: ${count('SUCCESS')} imported, ${count('SKIPPED')} already loaded, ${count('FAILED')} failed.`);
    if (count('FAILED')) process.exitCode = 1;
}

main().catch((error) => { console.error('[FAIL]', error.message); process.exit(1); });
