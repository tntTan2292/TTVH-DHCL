'use strict';

/**
 * AUTO-LOGIN-01 supervised probe -- run by the Product Owner, never by a scheduler.
 *
 *   node probe_dkcl_auto_login.js HUE            observe only: opens the DKCL login window and reports what it shows
 *   node probe_dkcl_auto_login.js HUE --follow   click the "Đăng nhập qua portal" link and describe the next page (types nothing)
 *   node probe_dkcl_auto_login.js HUE --hold     when a saved session exists: keeps the window open so you can sign out by hand
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
    const hold = process.argv.includes('--hold');
    const follow = process.argv.includes('--follow');
    if (!SOURCE_CONFIG[source]) {
        console.error('Usage: node probe_dkcl_auto_login.js HUE|TCT [--follow] [--hold] [--attempt]');
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

    // A lock folder left by an earlier probe that was closed mid-way (no backend, no browser on the profile) is stale.
    const lockDir = `${profileDir}.lock`;
    if (require('fs').existsSync(lockDir)) {
        try {
            require('fs').rmdirSync(lockDir); // only an empty folder is removed
            console.log(`[probe ${source}] Removed a stale profile lock left by an earlier run.`);
        } catch (error) {
            console.error(`[probe ${source}] The profile lock folder is not empty or cannot be removed (${error.code}); not touching it.`);
            process.exit(5);
        }
    }

    const client = new DkclHueF13PortalClient({ headless: false, source, manualAuthWaitMs: 60000 });
    try {
        await client.prepareInteractiveAuthentication({ baseUrl: process.env.PORTAL_BASE_URL || 'https://dkcl.vnpost.vn/', profileDir });
        const alreadyIn = await client.isAuthenticated();
        const pagePath = new URL(client.page.url()).pathname;
        const body = await client.page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
        console.log(`[probe ${source}] page path: ${pagePath}`);
        console.log(`[probe ${source}] already signed in (saved session): ${alreadyIn}`);
        // Structure of the page (never values): which fields and buttons the sign-in page really has. Waits for the page to settle first.
        await client.page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
        const describe = () => client.page.evaluate(() => {
            const attrs = (el) => ({ tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || null, name: el.getAttribute('name') || null, id: el.getAttribute('id') || null, autocomplete: el.getAttribute('autocomplete') || null, placeholder: el.getAttribute('placeholder') || null, visible: !!(el.offsetWidth || el.offsetHeight) });
            return {
                title: document.title,
                host: location.hostname,
                path: location.pathname,
                forms: document.querySelectorAll('form').length,
                iframes: document.querySelectorAll('iframe').length,
                inputs: [...document.querySelectorAll('input, select, textarea')].map(attrs),
                buttons: [...document.querySelectorAll('button, input[type=submit], a.btn, [role=button]')].slice(0, 12).map((el) => ({ ...attrs(el), text: (el.innerText || el.value || '').trim().slice(0, 40) })),
            };
        }).catch((error) => ({ error: error.message }));
        const structure = await describe();
        console.log(`[probe ${source}] page structure: ${JSON.stringify(structure)}`);
        console.log(`[probe ${source}] markers: login_form=${await client.hasLoginForm()} captcha_or_otp_words=${/captcha|otp|ma xac thuc|mã xác thực/i.test(body)} hrm_prompt_words=${/HRM|ma nhan vien|mã nhân viên|employee/i.test(body)}`);

        if (follow && !alreadyIn) {
            const link = client.page.locator('a:has-text("Đăng nhập qua portal"), a:has-text("Dang nhap qua portal")').first();
            if (await link.count() === 0) {
                console.log(`[probe ${source}] --follow: the "Đăng nhập qua portal" link was not found on this page.`);
            } else {
                await Promise.all([client.page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {}), link.click()]);
                await client.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
                console.log(`[probe ${source}] after clicking the link, page structure: ${JSON.stringify(await describe())}`);
                // Is the captcha field really shown to a person? Size and style of the field and its parents, and any picture in the form.
                const captcha = await client.page.evaluate(() => {
                    const el = document.querySelector('#captchaGenerated, input[name="captchaGenerated"]');
                    if (!el) return { found: false };
                    const chain = [];
                    for (let node = el, i = 0; node && i < 6; node = node.parentElement, i += 1) {
                        const style = getComputedStyle(node);
                        const rect = node.getBoundingClientRect();
                        chain.push({ tag: node.tagName.toLowerCase(), id: node.id || null, cls: String(node.className || '').slice(0, 40), display: style.display, visibility: style.visibility, opacity: style.opacity, w: Math.round(rect.width), h: Math.round(rect.height) });
                    }
                    const form = el.closest('form');
                    return { found: true, chain, images: form ? form.querySelectorAll('img, canvas, svg').length : 0, required: el.required, disabled: el.disabled };
                }).catch((error) => ({ error: error.message }));
                console.log(`[probe ${source}] captcha field detail: ${JSON.stringify(captcha)}`);
                console.log(`[probe ${source}] nothing was typed. markers there: captcha_or_otp_words=${/captcha|otp|ma xac thuc|mã xác thực/i.test(await client.page.locator('body').innerText({ timeout: 5000 }).catch(() => ''))}`);
            }
        }
        if (follow && !alreadyIn) {
            console.log(`[probe ${source}] The window stays open on the sign-in page. LOOK at it: is there a captcha picture or box? Then press Enter here to close (nothing is typed).`);
            await new Promise((resolve) => require('readline').createInterface({ input: process.stdin }).once('line', resolve));
        }
        if (alreadyIn && hold) {
            console.log(`[probe ${source}] The window stays open. Click Đăng xuất (sign out) in it, wait for the login page, then come back here and press Enter.`);
            await new Promise((resolve) => require('readline').createInterface({ input: process.stdin }).once('line', resolve));
            const stillIn = await client.isAuthenticated().catch(() => false);
            console.log(`[probe ${source}] signed in after your sign-out step: ${stillIn}${stillIn ? ' (the sign-out did not happen; run again)' : ' - now run again with --attempt'}`);
        } else if (alreadyIn) {
            console.log(`[probe ${source}] A saved session exists: nothing to log in. Run with --hold to keep the window open and sign out by hand, then run again with --attempt.`);
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
