/**
 * probe_f42_single_date.js -- F42-PHASE-3 supervised live verification of the F4.2 acquisition.
 *
 *   node probe_f42_single_date.js HUE 2026-10-10
 *   node probe_f42_single_date.js TCT 2026-10-10
 *
 * What it does (one lane, one business date, nothing else):
 *   1. reopens the saved browser profile of that lane (HUE or TCT: separate profiles, as in F4.1) and
 *      waits for the PO to sign in by hand if the portal asks (no credential is read or typed);
 *   2. runs the real one-date service in DRY mode: report -> verified outer summary -> export ->
 *      generated-file poll -> download -> parse -> reconcile with the summary;
 *   3. compares the downloaded file with the PO's reference file of the same date, if present
 *      (compared through the frozen parsers, row by row, so a different export time never matters);
 *   4. prints everything and stops. It NEVER copies into Incoming, never runs Import, never writes
 *      the database, never deletes the portal-generated file.
 *
 * Requirements: the backend is stopped and the DKCL window of that lane is closed (the profile lock
 * exists to stop two Chromium processes sharing one profile). Budget: one report submit, one export.
 */
'use strict';

const fs = require('fs');
const path = require('path');

require('./src/config/env').loadLocalEnv();

const { DkclHueF13PortalClient } = require('./src/services/dkclHueF13PortalClient');
const { F42HueSingleDateService, F42TctSingleDateService } = require('./src/services/f42SingleDateServices');
const { parseF42Hue } = require('./src/services/f42HueParser');
const { parseF42Tct } = require('./src/services/f42TctParser');

const lane = String(process.argv[2] || '').toUpperCase();
const businessDate = process.argv[3] || '2026-10-10';
if (!['HUE', 'TCT'].includes(lane) || !/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
    console.error('Usage: node probe_f42_single_date.js <HUE|TCT> <YYYY-MM-DD>');
    process.exit(2);
}

const referenceFile = {
    HUE: path.resolve(__dirname, '../Data DKCL/F4.2-2026.10.10.csv'),
    TCT: path.resolve(__dirname, '../Data DKCL/F4.2-TCT-2026.10.10.xlsx'),
}[lane];
const downloadDir = path.resolve(__dirname, `../portal-downloads/dkcl/${lane.toLowerCase()}/f42/probe`);

function compare(a, b, keyOf) {
    const mapA = new Map(a.map((row) => [keyOf(row), JSON.stringify(row)]));
    const mapB = new Map(b.map((row) => [keyOf(row), JSON.stringify(row)]));
    let onlyReference = 0;
    let onlyDownloaded = 0;
    let changed = 0;
    for (const [key, value] of mapA) {
        if (!mapB.has(key)) onlyReference++;
        else if (mapB.get(key) !== value) changed++;
    }
    for (const key of mapB.keys()) if (!mapA.has(key)) onlyDownloaded++;
    return { onlyReference, onlyDownloaded, changed };
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
        const Service = lane === 'HUE' ? F42HueSingleDateService : F42TctSingleDateService;
        const service = new Service({
            importEnabled: false,
            rawDownloadDir: downloadDir,
            generationPollingIntervalMs: 15000,
        });
        const result = await service.runOneDate(businessDate, { portalClient: client });
        const { summary, ...rest } = result;
        console.log('  outer summary :', JSON.stringify(summary));
        console.log('  result        :', JSON.stringify(rest, null, 2));

        console.log('\n[3] Comparing the downloaded file with the PO reference file ...');
        if (!fs.existsSync(referenceFile) || businessDate !== '2026-10-10') {
            console.log(`  (no reference file for ${businessDate}; skipped)`);
        } else if (lane === 'HUE') {
            const ref = parseF42Hue(fs.readFileSync(referenceFile), 'F4.2-2026.10.10.csv').parsedData;
            const got = parseF42Hue(fs.readFileSync(result.downloadedPath), 'F4.2-2026.10.10.csv').parsedData;
            const diff = compare(ref, got, (r) => `${r.ma_bg}|${r.ma_buu_ta}|${r.thoi_gian_gbt}`);
            console.log(`  rows reference/downloaded: ${ref.length}/${got.length}; ${JSON.stringify(diff)}`);
            console.log(diff.onlyReference + diff.onlyDownloaded + diff.changed === 0 ? '  RESULT: IDENTICAL to the PO file' : '  RESULT: DIFFERENT (the portal revises recent days; judge by the reconciliation above)');
        } else {
            const ref = parseF42Tct(fs.readFileSync(referenceFile), 'F4.2-2026.10.10.xlsx').parsedData;
            const got = parseF42Tct(fs.readFileSync(result.downloadedPath), 'F4.2-2026.10.10.xlsx').parsedData;
            const diff = compare(ref, got, (r) => r.ma_tinh_phat);
            console.log(`  provinces reference/downloaded: ${ref.length}/${got.length}; ${JSON.stringify(diff)}`);
            console.log(diff.onlyReference + diff.onlyDownloaded + diff.changed === 0 ? '  RESULT: IDENTICAL to the PO file' : '  RESULT: DIFFERENT (the portal revises recent days; judge by the reconciliation above)');
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
