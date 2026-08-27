/**
 * probe_f41_hue_detail_export.js  --  DIAGNOSTIC-TEMP (AB-AUTH-17)
 *
 * Real, bounded verification of the F4.1 HUE detail-export path. Delete once AB-AUTH-17 is closed.
 *
 *   node probe_f41_hue_detail_export.js [YYYY-MM-DD]     (default: 2026-08-23)
 *
 * What it does, in order, and nothing else:
 *   1. opens the HUE DKCL session (interactive; log in if the portal asks)
 *   2. reads the F4.1 HUE outer summary for the date  -- read only
 *   3. opens the detail table over the portal's own AJAX contract  -- read only
 *   4. saves the raw detail response to backend/diagnostics/  -- read only
 *   5. prints the DETAIL export form the portal returned (action + parameters)
 *   6. requests that export, then lists EVERY generated file whose name mentions F4.1, so the
 *      real generated-filename slug is observed rather than assumed
 *   7. downloads the workbook and reports: header count, whether `Số hiệu bưu gửi` exists,
 *      and the data-row count against the summary's totalVolume
 *
 * It NEVER writes to the database, never runs the Import pipeline, and never copies anything into
 * an Incoming folder. The only outward action is step 6's export request -- the portal-side file
 * generation this ticket exists to prove.
 *
 * Requires the HUE browser profile to be free (stop the backend / close the DKCL HUE window first);
 * the profile lock exists to stop two Chromium processes sharing one profile directory.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// The project loads .env through its own loader (no dotenv dependency).
require('./src/config/env').loadLocalEnv();

const {
    DkclHueF13PortalClient,
    F41_HUE_DETAIL_IDENTITY,
    F41_HUE_DETAIL_EXPORT_ACTION
} = require('./src/services/dkclHueF13PortalClient');
const { F41_EXECUTOR_IDENTITIES } = require('./src/services/autoBackfillF41Contract');

const businessDate = process.argv[2] || '2026-08-23';
const diagnosticsDir = path.resolve(__dirname, 'diagnostics');
const downloadDir = path.resolve(__dirname, '../portal-downloads/dkcl/hue/f41/probe');

function stamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

function save(name, content) {
    fs.mkdirSync(diagnosticsDir, { recursive: true });
    const target = path.join(diagnosticsDir, `${name}-${businessDate}-${stamp()}.txt`);
    fs.writeFileSync(target, content);
    console.log(`  saved: ${target}`);
    return target;
}

async function main() {
    const client = new DkclHueF13PortalClient({
        headless: false,
        source: 'HUE',
        manualAuthWaitMs: Number(process.env.DKCL_HUE_MANUAL_AUTH_WAIT_MS || 240000)
    });

    try {
        console.log(`\n[1] Opening the HUE DKCL session for ${businessDate} ...`);
        await client.authenticate({
            baseUrl: process.env.PORTAL_BASE_URL,
            username: process.env.PORTAL_HUE_USERNAME,
            password: process.env.PORTAL_HUE_PASSWORD,
            hrmCode: process.env.PORTAL_HUE_HRM_CODE,
            profileDir: process.env.DKCL_HUE_PROFILE_DIR
                ? path.resolve(__dirname, '..', process.env.DKCL_HUE_PROFILE_DIR)
                : undefined
        });

        console.log('\n[2] Reading the outer summary (read only) ...');
        await client.openF41Report();
        await client.submitF41HueFilters({ businessDate });
        const summary = await client.readF41HueOuterSummary();
        console.log(`  totalVolume=${summary.totalVolume} passedVolume=${summary.passedVolume} rate=${summary.rate}`);
        console.log(`  outer exportIdentity=${summary.exportIdentity} (this is the AGGREGATE report)`);
        console.log(`  unitCodes=${JSON.stringify(summary.unitCodes)}`);
        save('probe-f41-hue-outer', client.lastF41RowsHtml || '');

        console.log('\n[3] Opening the detail table over the portal\'s own AJAX contract ...');
        const opened = await client.openF41HueDetailTable();
        console.log(`  metric=${opened.header} iTotal=${opened.value} detailRowsInFirstPage=${opened.detailRowCount}`);
        save('probe-f41-hue-detail-paginator', client.lastF41DetailPaginator || '(no paginator returned)');

        console.log('\n[4] The DETAIL export form the portal returned:');
        const info = await client.readF41ExportInfo(
            F41_HUE_DETAIL_IDENTITY,
            client.lastF41DetailPaginator,
            'detail_template_paginator'
        );
        console.log(`  exportAction=${info.exportAction}`);
        console.log(`  exportIdentity=${info.exportIdentity}  (expected ${F41_HUE_DETAIL_IDENTITY})`);
        console.log(`  request=${JSON.stringify(client.lastF41ExportRequest, null, 2)}`);
        if (info.exportAction !== F41_HUE_DETAIL_EXPORT_ACTION) {
            console.log(`  !! MISMATCH against the implemented constant ${F41_HUE_DETAIL_EXPORT_ACTION}`);
        }

        console.log('\n[5] Requesting the detail export (the one outward action) ...');
        const requestedAt = new Date();
        await client.requestF41HueExport();

        console.log('\n[6] Observing the REAL generated filename (matching only on "F4.1") ...');
        const observed = await client.pollGeneratedFile({
            requestedAt,
            timeoutMs: Number(process.env.DKCL_HUE_GENERATION_TIMEOUT_MS || 900000),
            intervalMs: 15000,
            match: 'F4.1'
        });
        if (!observed) {
            console.log('  !! no F4.1 file appeared before the timeout');
            return;
        }
        console.log(`  observed filename : ${observed.filename}`);
        console.log(`  configured match  : ${F41_EXECUTOR_IDENTITIES.HUE.generatedFileMatch}`);
        console.log(`  match is correct  : ${observed.filename.includes(F41_EXECUTOR_IDENTITIES.HUE.generatedFileMatch)}`);

        console.log('\n[7] Downloading and inspecting the workbook (no import, no DB write) ...');
        fs.mkdirSync(downloadDir, { recursive: true });
        const downloaded = await client.downloadXlsx({ file: observed, targetDir: downloadDir });
        console.log(`  file: ${downloaded} (${fs.statSync(downloaded).size} bytes)`);
        const workbook = xlsx.read(fs.readFileSync(downloaded), { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: null });
        const headerIndex = rows.findIndex((row) => (row || []).some((cell) => String(cell || '').trim() === 'Số hiệu bưu gửi'));
        console.log(`  sheets            : ${JSON.stringify(workbook.SheetNames)}`);
        console.log(`  header row index  : ${headerIndex}`);
        console.log(`  "Số hiệu bưu gửi" : ${headerIndex >= 0 ? 'PRESENT' : 'ABSENT  <-- still the wrong workbook'}`);
        if (headerIndex >= 0) {
            const header = rows[headerIndex].map((cell) => String(cell || '').trim());
            const dataRows = rows.length - headerIndex - 1;
            console.log(`  column count      : ${header.length} (F4.1 HUE schema expects 42)`);
            console.log(`  data rows         : ${dataRows}`);
            console.log(`  summary total     : ${summary.totalVolume}`);
            console.log(`  reconciles        : ${dataRows === summary.totalVolume}`);
            save('probe-f41-hue-workbook-header', header.join('\n'));
        }
    } finally {
        await client.close().catch(() => {});
    }
}

main().catch((error) => {
    console.error('\nPROBE FAILED:', error?.code || '', error?.message || error);
    process.exitCode = 1;
});
