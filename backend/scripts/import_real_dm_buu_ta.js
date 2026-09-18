/**
 * One-time script: dry-run + (if authorized) confirm import of the real
 * postman directory file into the operational database, using the exact
 * same classify/apply functions the API's Preview/Confirm endpoints call.
 *
 * Usage:
 *   node scripts/import_real_dm_buu_ta.js --dry-run
 *   node scripts/import_real_dm_buu_ta.js --confirm
 */

'use strict';

const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const SOURCE_FILE = path.resolve(__dirname, '..', '..', '2026.09.17 - DB Buu ta.xls');

const { parseDanhBaBuuTaExcel } = require('../src/services/postmanCatalog/parseDanhBaBuuTaExcel');
const { classifyPostmanCatalogImport, applyPostmanCatalogImport } = require('../src/services/postmanCatalog/postmanCatalogImport');
const { withTransaction } = require('../src/services/networkMapImport/transactionHelper');

async function main() {
    const mode = process.argv.includes('--confirm') ? 'confirm' : 'dry-run';
    console.log(`=== DB Bưu tá real-data import (${mode}) ===`);
    console.log('Source:', SOURCE_FILE);

    const fileBuffer = fs.readFileSync(SOURCE_FILE);
    const fileFingerprint = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    console.log('SHA-256 fingerprint:', fileFingerprint);

    const { records, rejected, stats } = parseDanhBaBuuTaExcel(SOURCE_FILE);
    console.log('Parse stats:', stats);
    if (rejected.length > 0) {
        console.log('REJECTED ROWS:', rejected);
    }

    const codes = records.map((r) => r.ma_buu_ta);
    const distinctCodes = new Set(codes);
    console.log(`Distinct codes in file: ${distinctCodes.size} / ${codes.length} parsed rows`);

    const forbiddenKeys = ['so_dien_thoai', 'ma_hrm', 'loai_hop_dong', 'chuc_danh', 'ma_bdt', 'ten_bdt', 'ma_bdh', 'ten_bdh'];
    const sample = records[0] || {};
    const leaked = forbiddenKeys.filter((k) => Object.prototype.hasOwnProperty.call(sample, k));
    console.log('Forbidden-field leakage check on parsed record shape:', leaked.length === 0 ? 'PASS (none present)' : `FAIL: ${leaked.join(', ')}`);

    const classified = await classifyPostmanCatalogImport(records);
    console.log('Classification summary:', classified.summary);
    console.log('Absent-from-file rows (existing DB codes not in this file):', classified.absentRows.length);

    const allValid = stats.rejected_rows === 0 && distinctCodes.size === codes.length && records.length === 198;
    console.log('\nGATE CHECK — 198/198 valid, zero duplicates, zero rejected:', allValid ? 'PASS' : 'FAIL');

    if (mode === 'dry-run') {
        console.log('\nDry-run only — no write performed.');
        process.exit(allValid ? 0 : 1);
        return;
    }

    if (!allValid) {
        console.error('\nABORTING confirm: gate check failed.');
        process.exit(1);
        return;
    }

    const batchId = `real-import-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const counts = await withTransaction((runInTx) => applyPostmanCatalogImport(runInTx, batchId, classified, {
        fileName: '2026.09.17 - DB Buu ta.xls',
        fileFingerprint,
        performedBy: 'po_authorized_real_import',
    }));

    console.log('\n=== CONFIRM COMPLETE ===');
    console.log('batch_id:', batchId);
    console.log('counts:', counts);
    process.exit(0);
}

main().catch((error) => {
    console.error('FAILED:', error);
    process.exit(1);
});
