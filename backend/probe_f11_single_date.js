/**
 * probe_f11_single_date.js -- F11-PHASE-3 supervised live verification of the F1.1 acquisition.
 *
 *   node probe_f11_single_date.js HUE 2026-10-07
 *   node probe_f11_single_date.js TCT 2026-10-07
 *
 * What it does (one lane, one business date, nothing else):
 *   1. reopens the saved browser profile of that lane (HUE or TCT: separate profiles, as in F4.1) and
 *      waits for the PO to sign in by hand if the portal asks (no credential is read or typed);
 *   2. runs the real one-date service in DRY mode: report -> verified outer summary -> export ->
 *      generated-file poll -> download -> parse -> reconcile with the summary;
 *   3. compares the downloaded workbook with the PO's reference file of the same date, if present;
 *   4. prints everything and stops. It NEVER copies into Incoming, never runs Import, never writes
 *      the database, never deletes the portal-generated file.
 *
 * Requirements: the backend is stopped and the DKCL window of that lane is closed (the profile lock
 * exists to stop two Chromium processes sharing one profile). Budget: one report submit, one export.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

require('./src/config/env').loadLocalEnv();

const { DkclHueF13PortalClient } = require('./src/services/dkclHueF13PortalClient');
const { F11HueSingleDateService, F11TctSingleDateService } = require('./src/services/f11SingleDateServices');

const lane = String(process.argv[2] || '').toUpperCase();
const businessDate = process.argv[3] || '2026-10-07';
if (!['HUE', 'TCT'].includes(lane) || !/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
    console.error('Usage: node probe_f11_single_date.js <HUE|TCT> <YYYY-MM-DD>');
    process.exit(2);
}

const referenceFile = {
    HUE: path.resolve(__dirname, '../Data DKCL/F1.1-2026.10.07.xlsx'),
    TCT: path.resolve(__dirname, '../Data DKCL/F1.1/Processed/TCT/F1.1-2026.10.07.xlsx'),
}[lane];
const downloadDir = path.resolve(__dirname, `../portal-downloads/dkcl/${lane.toLowerCase()}/f11/probe`);
const norm = (value) => (value === null || value === undefined ? '' : String(value).normalize('NFC').trim());

function readRows(file) {
    const workbook = xlsx.read(fs.readFileSync(file), { type: 'buffer' });
    return xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: null, raw: true });
}

async function main() {
    const profileEnv = lane === 'HUE' ? process.env.DKCL_HUE_PROFILE_DIR : process.env.DKCL_TCT_PROFILE_DIR;
    const client = new DkclHueF13PortalClient({
        headless: false,
        source: lane,
        manualAuthWaitMs: Number(process.env[`DKCL_${lane}_MANUAL_AUTH_WAIT_MS`] || 240000),
    });
    try {
        console.log(`\n[1] Opening the ${lane} DKCL session (sign in by hand if the portal asks) ...`);
        const authOptions = {
            baseUrl: process.env.PORTAL_BASE_URL,
            username: process.env[`PORTAL_${lane}_USERNAME`],
            password: process.env[`PORTAL_${lane}_PASSWORD`],
            hrmCode: process.env[`PORTAL_${lane}_HRM_CODE`],
            profileDir: profileEnv ? path.resolve(__dirname, '..', profileEnv) : undefined,
        };
        if (lane === 'TCT') {
            // TCT keeps no stored credentials (as F4.1): reuse the profile's session, else the PO signs in by hand.
            try {
                await client.authenticate({ ...authOptions, requireExistingSession: true });
            } catch (error) {
                if (error?.code !== 'AUTHENTICATION_REQUIRED') throw error;
                console.log('  No session in the TCT profile: sign in by hand in the open window ...');
                if (!(await client.waitForManualAuthentication())) throw error;
            }
        } else {
            await client.authenticate(authOptions);
        }

        console.log(`\n[2] DRY run of the real one-date service for ${lane} ${businessDate} (no Incoming copy, no Import, no DB write) ...`);
        const Service = lane === 'HUE' ? F11HueSingleDateService : F11TctSingleDateService;
        const service = new Service({
            importEnabled: false,
            rawDownloadDir: downloadDir,
            generationPollingIntervalMs: 15000,
        });
        const result = await service.runOneDate(businessDate, { portalClient: client });
        const { summary, ...rest } = result;
        console.log('  outer summary :', JSON.stringify(summary));
        console.log('  result        :', JSON.stringify(rest, null, 2));

        console.log('\n[3] Comparing the downloaded workbook with the PO reference file ...');
        if (!fs.existsSync(referenceFile) || businessDate !== '2026-10-07') {
            console.log(`  (no reference file for ${businessDate}; skipped)`);
        } else {
            const a = readRows(referenceFile);
            const b = readRows(result.downloadedPath);
            let differences = 0;
            const maxRows = Math.max(a.length, b.length);
            for (let r = 0; r < maxRows; r++) {
                const ra = a[r] || [];
                const rb = b[r] || [];
                const maxCols = Math.max(ra.length, rb.length);
                for (let c = 0; c < maxCols; c++) if (norm(ra[c]) !== norm(rb[c])) differences++;
            }
            console.log(`  rows reference/downloaded: ${a.length}/${b.length}; cell differences: ${differences}`);
            console.log(differences === 0 ? '  RESULT: IDENTICAL to the PO file' : '  RESULT: DIFFERENT -- do not enable this lane');
        }
        console.log('\nDone. The portal-generated file was left in place (no cleanup in DRY mode).');
    } finally {
        await client.close().catch(() => {});
    }
}

main().catch((error) => {
    console.error('\nPROBE FAILED:', error?.code || '', error?.message || error);
    if (error?.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
});
