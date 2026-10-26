/**
 * BF-PHAT-IMPORT-01 CLI -- load daily delivery BatchFiles into fact_bf_phat.
 *
 *   node import_bf_phat.js [--dir <folder>] [--year 2026] [--force] [--dry-run]
 *   node import_bf_phat.js --download 2026-10-24 2026-10-25     (WinSCP, then import those days)
 *
 * Default folder: <repo>/Data BF Phat/<year>. Days already loaded are skipped unless --force.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const { BfPhatImportService, pickDailyFiles } = require('./src/services/bfPhat/bfPhatImportService');
const { downloadDays, DEFAULT_LOCAL_ROOT } = require('./src/services/bfPhat/bfPhatWinscpService');

function arg(name) {
    const index = process.argv.indexOf(name);
    return index === -1 ? null : (process.argv[index + 1] || '');
}

async function main() {
    const year = arg('--year') || '2026';
    const force = process.argv.includes('--force');
    const dryRun = process.argv.includes('--dry-run');
    let onlyDates = null;

    const downloadIndex = process.argv.indexOf('--download');
    if (downloadIndex !== -1) {
        onlyDates = process.argv.slice(downloadIndex + 1).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
        const result = await downloadDays(onlyDates);
        console.log(`[WinSCP] exit ${result.code}`);
        if (result.code !== 0) console.error(result.log);
    }

    const dir = arg('--dir') || path.join(DEFAULT_LOCAL_ROOT, year);
    if (!fs.existsSync(dir)) throw new Error(`Folder not found: ${dir}`);
    const service = new BfPhatImportService();

    if (dryRun) {
        const loaded = await service.loadedDays();
        const files = pickDailyFiles(dir);
        const todo = files.filter((file) => force || !loaded.has(file.date));
        console.log(`[dry-run] ${files.length} day files in ${dir}; ${loaded.size} days already loaded; ${todo.length} would be imported.`);
        return;
    }

    const results = await service.importFolder(dir, {
        force, onlyDates, actor: 'cli', trigger: 'MANUAL',
        onProgress: (r) => console.log(`${r.date} ${r.status} rows=${r.rows}${r.replaced ? ` replaced=${r.replaced}` : ''}${r.error ? ` ERROR ${r.error}` : ''}`),
    });
    const count = (status) => results.filter((r) => r.status === status).length;
    console.log(`Done: ${count('SUCCESS')} imported, ${count('SKIPPED')} already loaded, ${count('FAILED')} failed.`);
    if (count('FAILED')) process.exitCode = 1;
}

main().catch((error) => { console.error('[FAIL]', error.message); process.exit(1); });
