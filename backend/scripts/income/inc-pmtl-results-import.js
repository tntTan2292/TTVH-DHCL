'use strict';
/**
 * INC-PHAT-01 CLI - imports the stored PMTL results (kq_phat, kq_phat_ct csv) of ONE period into a COPY of the database and locks the period.
 *   node scripts/income/inc-pmtl-results-import.js --db <copy> --ky 2026-08 --dir <folder with kq_phat_<ky>.csv, kq_phat_ct_<ky>.csv, summary.json> [--actor name] [--apply]
 * Dry run by default. The files hold names, HRM codes and pay: keep the folder outside git (backend/storage/ is ignored).
 */
const fs = require('fs');
const path = require('path');
const { importPmtlResults } = require('../../src/services/income/incPmtlResultImporter');
const { parseArgs, requireCopyDb } = require('./_cli');

(async () => {
    const args = parseArgs(process.argv.slice(2));
    if (!args.ky || !args.dir) { console.error('Usage: --db <copy> --ky YYYY-MM --dir <fixture folder> [--actor name] [--apply]'); process.exit(2); }
    const db = requireCopyDb(args);
    const dir = path.resolve(args.dir);
    const summaryPath = path.join(dir, 'summary.json');
    const expected = fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, 'utf8'))[args.ky] : undefined;
    const result = await importPmtlResults({
        db, ky: args.ky, kqFile: path.join(dir, `kq_phat_${args.ky}.csv`), ctFile: path.join(dir, `kq_phat_ct_${args.ky}.csv`),
        expected, actor: args.actor || 'cli', dryRun: !args.apply,
    });
    console.log(JSON.stringify(result, null, 2));
})().catch((error) => { console.error('[FAIL]', error.message); process.exit(1); });
