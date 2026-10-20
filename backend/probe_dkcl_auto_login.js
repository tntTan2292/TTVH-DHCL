'use strict';

/**
 * AUTO-LOGIN-01 supervised probe -- run by the Product Owner, never by a scheduler.
 *
 *   node probe_dkcl_auto_login.js HUE            observe only: opens the DKCL login window and reports what it shows
 *   node probe_dkcl_auto_login.js HUE --attempt  also makes the ONE automatic sign-in attempt and reports the result
 *   (same for TCT)
 *
 * Stop the backend first (it owns the browser profile). The PO sits at the screen: the window is visible and nothing is
 * hidden. The output has structure only (page path, yes/no markers, reasons): never a credential, cookie or page text.
 * One attempt per run, and it counts in the same attempt limits as the real feature, so a wrong password here cannot
 * lock the account either (two failures in a row stop all automatic attempts until a login succeeds).
 */

require('./src/config/env').loadLocalEnv({ files: [require('path').resolve(__dirname, '../.env')] });
const path = require('path');
const { DkclHueF13PortalClient } = require('./src/services/dkclHueF13PortalClient');
const { DkclAutoLoginService } = require('./src/services/dkclAutoLoginService');
const { SOURCE_CONFIG, resolveProfileDir } = require('./src/services/dkclSessionPreflightService');

async function main() {
    const source = String(process.argv[2] || '').toUpperCase();
    const attempt = process.argv.includes('--attempt');
    if (!SOURCE_CONFIG[source]) {
        console.error('Usage: node probe_dkcl_auto_login.js HUE|TCT [--attempt]');
        process.exit(2);
    }

    // The probe forces the feature on for this one run; the limits stay in force.
    process.env[`DKCL_AUTO_LOGIN_${source}_ENABLED`] = 'true';
    const autoLogin = new DkclAutoLoginService();
    const credentialsPresent = Boolean(autoLogin.credentialsFor(source));
    console.log(`[probe ${source}] credentials present in .env: ${credentialsPresent ? 'yes' : 'NO (HUE needs username, password and HRM code; TCT username and password)'}`);
    console.log(`[probe ${source}] attempt gate: ${JSON.stringify(autoLogin.check(source))}`);

    const profileDir = resolveProfileDir(SOURCE_CONFIG[source]);

    // The backend (and any browser it left behind) owns this profile: a second Chromium on it closes at once.
    const port = Number(process.env.PORT || 5050);
    const backendUp = await new Promise((resolve) => {
        const socket = require('net').connect({ host: '127.0.0.1', port, timeout: 1500 });
        socket.once('connect', () => { socket.destroy(); resolve(true); });
        socket.once('error', () => resolve(false));
        socket.once('timeout', () => { socket.destroy(); resolve(false); });
    });
    if (backendUp) {
        console.error(`[probe ${source}] The backend is still running on port ${port}. Stop it first (close its window or press Ctrl+C), then run this again.`);
        process.exit(3);
    }
    const leftovers = await require('./src/services/browserProcessManager').findBrowserProcessByProfile(profileDir).catch(() => null);
    const leftoverCount = leftovers?.matchingProcesses?.length || 0;
    if (leftoverCount > 0) {
        console.error(`[probe ${source}] ${leftoverCount} browser process(es) of the ${source} profile are still running (left by the backend). Close the DKCL browser windows or end those chrome processes in Task Manager, then run this again.`);
        process.exit(4);
    }

    const client = new DkclHueF13PortalClient({ headless: false, source, manualAuthWaitMs: 60000 });
    try {
        await client.prepareInteractiveAuthentication({ baseUrl: process.env.PORTAL_BASE_URL || 'https://dkcl.vnpost.vn/', profileDir });
        const alreadyIn = await client.isAuthenticated();
        const pagePath = new URL(client.page.url()).pathname;
        const body = await client.page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
        console.log(`[probe ${source}] page path: ${pagePath}`);
        console.log(`[probe ${source}] already signed in (saved session): ${alreadyIn}`);
        console.log(`[probe ${source}] markers: login_form=${await client.hasLoginForm()} captcha_or_otp_words=${/captcha|otp|ma xac thuc|mã xác thực/i.test(body)} hrm_prompt_words=${/HRM|ma nhan vien|mã nhân viên|employee/i.test(body)}`);

        if (alreadyIn) {
            console.log(`[probe ${source}] A saved session exists: nothing to log in. Sign out in the window first if you want to test the login.`);
        } else if (!attempt) {
            console.log(`[probe ${source}] Observe-only run: no attempt made. Add --attempt to try the automatic sign-in once.`);
        } else if (!credentialsPresent) {
            console.log(`[probe ${source}] Cannot attempt: credentials missing.`);
        } else {
            const result = await autoLogin.attempt(source, client);
            console.log(`[probe ${source}] attempt result: ${JSON.stringify(result)}`);
            if (result.authenticated) {
                await client.openF13Report().catch(() => {});
                console.log(`[probe ${source}] F1.3 report page ready: ${await client.isF13ReportReady().catch(() => false)}`);
                console.log(`[probe ${source}] page path after sign-in: ${new URL(client.page.url()).pathname}`);
            }
        }
    } finally {
        console.log(`[probe ${source}] profile: ${path.basename(profileDir)} - closing the window.`);
        await client.close().catch(() => {});
    }
}

main().catch((error) => {
    console.error(`[probe] failed: ${error?.code || ''} ${error?.message || error}`);
    process.exit(1);
});
