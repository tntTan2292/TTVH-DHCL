'use strict';

const fs = require('fs');
const path = require('path');
const { selectNewestGeneratedFile } = require('./dkclHueF13SyncService');
const processManager = require('./browserProcessManager');

const DETAIL_METRIC_HEADER = 'SL bưu gửi phát thành công/Nộp tiền/CH';
const F41_REPORT_PATH = '/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc';
const F41_HUE_EXPORT_IDENTITY = 'sp_Phat_ChatLuong_PTC_BuuCuc_V2';
const F41_HUE_EXPORT_ACTION = `/export/${F41_HUE_EXPORT_IDENTITY}/all`;
const F41_TCT_EXPORT_IDENTITY = 'sp_Phat_ChatLuong_PTC_Tinh_V2';
const F41_TCT_EXPORT_ACTION = `/export/${F41_TCT_EXPORT_IDENTITY}/all`;

// AB-AUTH-10: F4.1 filter transport. The nine filter controls on the DKCL F4.1 report page are
// Select2-backed widgets. Playwright's selectOption() sets the underlying native <select>.value but
// does not necessarily sync Select2's own internal state -- and it is Select2's state, not the
// native value, that the page's own JS reads when it builds the report request. Real runs 97ac8d61
// and fb58df4b (HUE, all-zero summary) and 94e0eba8 (TCT, no summary table at all) failed exactly
// that way while the PO-supplied screenshots still showed the dropdowns displaying their greyed
// placeholder text: the page had built a request carrying the WRONG filters.
//
// The filters are therefore no longer written through the UI at all -- they travel in the report
// URL's own query string, the transport an internal VNPost extension has been using successfully
// against this same endpoint. The parameter names, values and order below reproduce byte for byte
// the PO-verified successful request recorded in
// docs/06_REVIEWS/Import/AUTO-BACKFILL-F41_CHECKPOINT_001.md Section 21, including the empty
// `stMaHuyenPhat=` and the absence of any pagination parameter. Only the TRANSPORT changed: every
// filter VALUE is the one this system already used, never the extension's where the two differ
// (notably stMaBuuCucPhat stays NULL for HUE, where the extension sends ALL).
const F41_LANE_QUERY_FILTERS = Object.freeze({
    HUE: Object.freeze({ TuyChonGR: 'BC', stMaTinhPhat: '53' }),
    TCT: Object.freeze({ TuyChonGR: 'TINH', stMaTinhPhat: 'ALL' })
});

// AB-AUTH-14: the portal's own default page size is 50 -- proved directly, not assumed: the real
// captured XHR responses for 2026-08-23 carry a `template_paginator` whose FilterSelected reads
// `"Page":1,"PageSize":50`. Any lane/date whose result set exceeds 50 outer rows would therefore
// have been silently truncated to the first 50, with no error anywhere. That has not bitten yet
// (23/08 returned 8 HUE / 38 TCT rows), but historical TCT backfill dates can legitimately carry
// more than 50 reporting provinces, so this is a real latent data-correctness hazard on exactly the
// backfill this system exists to run. These are the internal extension's proven values, unchanged.
const F41_REQUEST_PAGE_SIZE = '50000';
const F41_REQUEST_PAGE = '1';

const F41_XHR_HEADERS = Object.freeze({
    accept: '*/*',
    'x-requested-with': 'XMLHttpRequest'
});

function buildF41ReportQuery(lane, businessDate) {
    const laneFilters = F41_LANE_QUERY_FILTERS[String(lane || '').toUpperCase()];
    if (!laneFilters) {
        throw portalError(`F4.1 report query has no filter profile for lane ${lane}.`, 'F41_UNSUPPORTED_LANE');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(businessDate || ''))) {
        throw portalError('F4.1 report query requires a YYYY-MM-DD business date.', 'F41_REPORT_QUERY_DATE_INVALID');
    }
    const requestDate = formatPortalRequestDate(businessDate);
    return new URLSearchParams([
        ['TuyChonGR', laneFilters.TuyChonGR],
        ['stMaHuyenPhat', ''],
        ['stMaTinhPhat', laneFilters.stMaTinhPhat],
        ['stMaLoaiBCPhat', 'NULL'],
        ['stMaBuuCucPhat', 'NULL'],
        ['stLoaiDichVu', 'ALL'],
        ['stNhomLoaiKH', 'ALL'],
        ['stPhamViTinh', 'NULL'],
        ['stLoaiTuyenPhat', 'NULL'],
        ['stLoaiPhuongXa', 'NULL'],
        ['iFrom', requestDate],
        ['iTo', requestDate],
        // AB-AUTH-14: appended AFTER the PO-verified filter set, which is itself unchanged and still
        // byte-for-byte identical to the request recorded in AUTO-BACKFILL-F41_CHECKPOINT_001.md
        // Section 21. These two are pagination, not filters -- they cannot change WHICH rows the
        // report covers, only how many of them the server is willing to return in one response.
        ['iPageSize', F41_REQUEST_PAGE_SIZE],
        ['iPage', F41_REQUEST_PAGE]
    ]).toString();
}

const DEFAULT_CHROMIUM_LAUNCH_ARGS = Object.freeze([
    '--disable-session-crashed-bubble',
    '--hide-crash-restore-bubble',
    '--new-window',
    '--start-maximized'
]);

function buildPersistentLaunchOptions(options = {}) {
    const customArgs = Array.isArray(options.args) ? options.args : [];
    const mergedArgs = Array.from(new Set([...DEFAULT_CHROMIUM_LAUNCH_ARGS, ...customArgs]));
    return {
        headless: Boolean(options.headless),
        acceptDownloads: options.acceptDownloads !== false,
        handleSIGHUP: false,
        handleSIGINT: false,
        handleSIGTERM: false,
        args: mergedArgs
    };
}

function isDkclUrl(url) {
    return /^https?:\/\/dkcl\.vnpost\.vn(?:\/|$)/i.test(String(url || ''));
}

async function waitForPortalCapablePage(context, { timeoutMs = 15000 } = {}) {
    const timeoutAt = Date.now() + timeoutMs;

    while (Date.now() < timeoutAt) {
        const pages = typeof context.pages === 'function' ? context.pages() : [];
        const existingPage = pages.find((page) => page && typeof page.url === 'function');
        if (existingPage) return existingPage;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (typeof context.newPage === 'function') {
        return context.newPage();
    }

    throw portalError('BROWSER_PAGE_UNAVAILABLE: Browser page was not created.', 'BROWSER_PAGE_UNAVAILABLE');
}

function formatPortalDate(isoDate) {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
}

function formatPortalRequestDate(isoDate) {
    const [year, month, day] = isoDate.split('-');
    return `${month}/${day}/${year}`;
}

function loadPlaywright() {
    const localPath = path.resolve(process.cwd(), '../frontend/node_modules/playwright');
    if (fs.existsSync(localPath)) return require(localPath);
    return require('playwright');
}

function portalError(message, code) {
    const error = new Error(message);
    error.code = code;
    error.safeMessage = message;
    return error;
}

function normalizeNumber(value) {
    return Number(String(value || '').replace(/[^\d]/g, '')) || 0;
}

function findVisibleDetailCandidateIndex(cells, expectedHeader) {
    return (cells || []).findIndex((cell) => (
        cell.isAjaxCell &&
        !cell.isHiddenClass &&
        cell.isVisible &&
        cell.header === expectedHeader
    ));
}

function findExactFileRowIndexes(rows, filename) {
    return (rows || [])
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => (row.cells || []).some((cell) => cell === filename))
        .map(({ index }) => index);
}

class DkclHueF13PortalClient {
    constructor(options = {}) {
        this.headless = options.headless !== false;
        this.manualAuthWaitMs = Number(options.manualAuthWaitMs || 120000);
        this.manualAuthPollMs = Number(options.manualAuthPollMs || 3000);
        this.playwright = options.playwright || null;
        this.fs = options.fs || fs;
        this.path = options.path || path;
        this.context = null;
        this.page = null;
        this.baseUrl = null;
        this.profileDir = null;
        this.lockDir = null;
        // AB-AUTH-01: true only when THIS client's mkdirSync() actually created the lock
        // directory. close() must never remove a lock owned by another live process.
        this.ownsLock = false;
        this.loginAttempts = 0;
        this.source = options.source || 'HUE';
        this.onDisconnect = null;
        this.interactiveAuthenticatedOnOpen = false;
        this.logger = options.logger || console;
        // DIAGNOSTIC-TEMP (AB-AUTH-09): where captureF41Diagnostics() saves evidence. Overridable
        // for tests; defaults to backend/diagnostics/ (this file lives in backend/src/services/).
        this.diagnosticsDir = options.diagnosticsDir || this.path.resolve(__dirname, '../../diagnostics');
        // Set by submitF41HueFilters()/submitF41TctFilters() so readF41*OuterSummary() and
        // assertSummary() can name the business date in diagnostic captures without changing
        // either method's public signature.
        this.lastBusinessDate = null;
        // AB-AUTH-10: lane + exact query string applied by applyF41ReportFilters(), reused by
        // fetchF41OuterRows() so the summary is read from byte-for-byte the same filtered request
        // the page itself was navigated to.
        this.lastF41Lane = null;
        this.lastF41Query = null;
        // AB-AUTH-15: the report XHR's own `template_paginator` fragment, and the export request
        // derived from the <form id="exportReport"> inside it. See readF41ExportInfo().
        this.lastF41Paginator = null;
        this.lastF41ExportRequest = null;
        // DIAGNOSTIC-TEMP (AB-AUTH-11): upper bound on every diagnostic page read, so a hung page
        // can never delay the real F4.1 flow. Overridable for tests.
        this.diagnosticStepTimeoutMs = Number.isFinite(options.diagnosticStepTimeoutMs)
            ? options.diagnosticStepTimeoutMs
            : 5000;
    }

    async authenticate({ baseUrl, username, password, hrmCode, profileDir, requireExistingSession = false }) {
        if (!requireExistingSession && (!username || !password || !hrmCode)) {
            throw portalError('Hue portal credentials or HRM identifier are missing from local environment.', 'MISSING_CREDENTIALS');
        }

        this.baseUrl = String(baseUrl || 'https://dkcl.vnpost.vn/').replace(/\/+$/, '');
        this.loginUrl = `${this.baseUrl}/login`;
        this.profileDir = this.path.resolve(profileDir || this.path.resolve(process.cwd(), `../Data DKCL/BrowserProfiles/${this.source}`));
        this.acquireProfileLock();

        const { chromium } = this.playwright || loadPlaywright();
        this.context = await chromium.launchPersistentContext(
            this.profileDir,
            buildPersistentLaunchOptions({
                headless: this.headless,
                acceptDownloads: true
            })
        );
        if (this.context.on) {
            this.context.on('close', () => {
                if (this.onDisconnect) this.onDisconnect();
            });
        }
        this.page = await waitForPortalCapablePage(this.context);
        if (!isDkclUrl(this.page.url())) {
            await this.page.goto(this.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        }
        await this.page.bringToFront?.().catch(() => {});
        await processManager.setBrowserWindowsVisibleByProfile?.(this.profileDir).catch(() => {});

        await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await this.stopForSecurityChallenge({ allowHrm: true });

        if (await this.isAuthenticated()) return;
        if (requireExistingSession) {
            throw portalError('AUTHENTICATION_REQUIRED: an existing DKCL session is required.', 'AUTHENTICATION_REQUIRED');
        }

        if (!this.page.url().includes('/login')) {
            await this.page.goto(`${this.baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        }

        await this.performOneLoginAttempt({ username, password, hrmCode });
        if (!(await this.isAuthenticated())) {
            if (!this.headless && await this.waitForManualAuthentication()) return;
            const visibleMessage = await this.page.locator('.alert, .help-block, .invalid-feedback, .text-danger').first().textContent().catch(() => null);
            throw portalError(`AUTHENTICATION_REQUIRED${visibleMessage ? `: ${visibleMessage.trim()}` : ''}`, 'AUTHENTICATION_REQUIRED');
        }
    }

    // AB-AUTH-01: `this.lockDir` is assigned only AFTER mkdirSync() has actually created the
    // directory. Previously it was assigned first, so a client that failed with PROFILE_LOCKED
    // (the lock belongs to another live process) still carried a lockDir into close(), which
    // then deleted that other process's lock -- allowing a second Chromium to be launched
    // against a profile directory already open, risking Cookies/Preferences corruption.
    acquireProfileLock() {
        const parentDir = this.path.dirname(this.profileDir);
        this.fs.mkdirSync(parentDir, { recursive: true });
        const candidateLockDir = `${this.profileDir}.lock`;
        try {
            this.fs.mkdirSync(candidateLockDir);
        } catch (error) {
            if (error.code === 'EEXIST') {
                throw portalError(`${this.source} DKCL persistent browser profile is already in use.`, 'PROFILE_LOCKED');
            }
            throw error;
        }
        this.lockDir = candidateLockDir;
        this.ownsLock = true;
    }

    async close() {
        if (this.context) {
            await this.context.close().catch(() => {});
            this.context = null;
        }
        if (this.profileDir) {
            processManager.clearHiddenHwnds?.(this.profileDir);
        }
        // AB-AUTH-01: only release a lock this client actually created (see acquireProfileLock).
        if (this.ownsLock && this.lockDir && this.fs.existsSync(this.lockDir)) {
            this.fs.rmSync(this.lockDir, { recursive: true, force: true });
        }
        this.ownsLock = false;
        this.lockDir = null;
    }

    // AUTO-IMPORT-014 item 4: authentication-detection logic factored out of isAuthenticated()
    // so it can run against any candidate page, not just this.page — enabling rebind-to-a-
    // valid-page below. Detection markers are byte-for-byte unchanged from before this ticket.
    async _checkPageAuthenticated(page) {
        if (!page || page.isClosed?.()) return false;
        if (page.url().includes('/login')) return false;
        const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
        const loginInputCount = await page.locator('input[name="login"], input[id="login"], input[type="password"]').count().catch(() => 0);
        if (loginInputCount > 0) return false;
        if (/Thá»‘ng kÃª/iu.test(bodyText)) return true;
        return /Quan ly tep|Quản lý tệp|Tra cứu thông tin bưu gửi|Tra cuu thong tin buu gui|Dang xuat|Đăng xuất|Logout|tantn\.bdtth/i.test(bodyText);
    }

    // AUTO-IMPORT-014 item 4: if another open page in the same context is authenticated,
    // rebind this.page to it. Supports the multi-page case directly — closing a stray/
    // duplicate page must not fail the session if a valid authenticated page remains open.
    async findAuthenticatedPage() {
        if (!this.context || typeof this.context.pages !== 'function') return null;
        for (const candidatePage of this.context.pages()) {
            if (candidatePage === this.page) continue;
            if (await this._checkPageAuthenticated(candidatePage)) {
                this.page = candidatePage;
                return candidatePage;
            }
        }
        return null;
    }

    async isAuthenticated() {
        if (await this._checkPageAuthenticated(this.page)) return true;
        // The tracked page may have been closed, redirected away, or simply isn't the one that
        // completed login — check for another already-authenticated page before concluding the
        // whole session is unauthenticated (AUTO-IMPORT-014 item 4).
        const rebound = await this.findAuthenticatedPage();
        return Boolean(rebound);
    }

    // AUTO-IMPORT-014 item 3: lets preflight() distinguish a *confirmed* logged-out session
    // (a real login form present) from an inconclusive/transient reading before it decides
    // whether to expire anything.
    async hasLoginForm() {
        if (!this.page || this.page.isClosed?.()) return false;
        const count = await this.page.locator('input[name="login"], input[id="login"], input[type="password"]').count().catch(() => 0);
        return count > 0;
    }

    /**
     * AUTO-IMPORT-013 diagnostic instrumentation. Logs only non-sensitive, structural
     * signals (URL, page title, page/tab count, body-text length, boolean marker matches).
     * Never logs raw body text, form field values, cookies, or credentials.
     */
    async captureLoginDiagnostics(label) {
        try {
            const pages = typeof this.context?.pages === 'function' ? this.context.pages() : [];
            const url = this.page.url();
            const title = await this.page.title().catch(() => null);
            const bodyText = await this.page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
            const loginInputCount = await this.page.locator('input[name="login"], input[id="login"], input[type="password"]').count().catch(() => 0);
            const markers = {
                has_quan_ly_tep: /Quan ly tep|Quản lý tệp/i.test(bodyText),
                has_tra_cuu: /Tra cứu thông tin bưu gửi|Tra cuu thong tin buu gui/i.test(bodyText),
                has_dang_xuat: /Dang xuat|Đăng xuất|Logout/i.test(bodyText),
                has_tantn_bdtth: /tantn\.bdtth/i.test(bodyText),
                has_thong_ke_mojibake: /Thá»‘ng kÃª/iu.test(bodyText),
                has_login_input: loginInputCount > 0
            };
            console.log(`[AUTO-IMPORT-013][PortalClient ${this.source}] diagnostics(${label}): url=${url} title=${JSON.stringify(title)} pageCount=${pages.length} bodyTextLength=${bodyText.length} markers=${JSON.stringify(markers)}`);
        } catch (err) {
            console.warn(`[AUTO-IMPORT-013][PortalClient ${this.source}] diagnostics(${label}) capture failed: ${err.message}`);
        }
    }

    async prepareInteractiveAuthentication({ baseUrl, profileDir }) {
        this.baseUrl = String(baseUrl || 'https://dkcl.vnpost.vn/').replace(/\/+$/, '');
        this.loginUrl = `${this.baseUrl}/login`;
        this.profileDir = this.path.resolve(profileDir || this.path.resolve(process.cwd(), `../Data DKCL/BrowserProfiles/${this.source}`));
        processManager.clearHiddenHwnds?.(this.profileDir);
        this.acquireProfileLock();
        const { chromium } = this.playwright || loadPlaywright();
        const launchOptions = buildPersistentLaunchOptions({
            headless: false,
            acceptDownloads: true
        });
        const launchPromise = chromium.launchPersistentContext(this.profileDir, launchOptions);
        this.context = await Promise.race([
            launchPromise,
            new Promise((_, reject) => setTimeout(() => reject(portalError('BROWSER_LAUNCH_TIMEOUT: Browser took too long to launch or is stuck.', 'BROWSER_LAUNCH_TIMEOUT')), 15000))
        ]);

        if (this.context.on) {
            this.context.on('close', () => {
                if (this.onDisconnect) this.onDisconnect();
            });
        }
        this.page = await waitForPortalCapablePage(this.context);
        if (!isDkclUrl(this.page.url())) {
            await this.page.goto(this.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        }
        await this.page.bringToFront?.().catch(() => {});
        await processManager.setBrowserWindowsVisibleByProfile?.(this.profileDir).catch(() => {});
        const restoreResult = await this.restoreWindow();
        if (!restoreResult) {
            throw portalError('BROWSER_WINDOW_HIDDEN: Cannot show browser window for manual login. The process might be hung or the window is forcefully hidden.', 'BROWSER_WINDOW_HIDDEN');
        }

        await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        this.interactiveAuthenticatedOnOpen = await this.isAuthenticated();
        if (!await this.isAuthenticated()) {
            if (!this.page.url().includes('/login')) {
                await this.page.goto(`${this.baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            }
        }
    }

    async waitInteractiveAuthentication() {
        if (!await this.isAuthenticated()) {
            if (!await this.waitForManualAuthentication()) {
                throw portalError('AUTHENTICATION_REQUIRED: manual DKCL login was not completed.', 'AUTHENTICATION_REQUIRED');
            }
        }
        if (this.source === 'HUE') {
            await this.openF13Report().catch(() => {});
            if (!await this.isAuthenticated()) {
                throw portalError('AUTHENTICATION_REQUIRED: manual DKCL login was not confirmed.', 'AUTHENTICATION_REQUIRED');
            }
            if (!await this.isF13ReportReady()) {
                throw portalError('SOURCE_PAGE_REQUIRED: DKCL HUE F1.3 source page is not ready.', 'SOURCE_PAGE_REQUIRED');
            }
            return;
        }
        await this.openF13Report();
        if (!await this.isF13ReportReady()) {
            throw portalError('SOURCE_PAGE_REQUIRED: DKCL F1.3 source page is not ready.', 'SOURCE_PAGE_REQUIRED');
        }
    }

    async isF13ReportReady() {
        if (!this.page || this.page.url().includes('/login')) return false;
        const groupBy = this.page.locator('select[name="TuyChonGR"], select#TuyChonGR').first();
        return (await groupBy.count()) === 1;
    }

    async setWindowState(state) {
        if (!this.page) return false;
        try {
            const session = await this.page.context().newCDPSession(this.page);
            const { windowId } = await session.send('Browser.getWindowForTarget');
            await session.send('Browser.setWindowBounds', { windowId, bounds: { windowState: state } });
            await session.detach().catch(() => {});
            return true;
        } catch (err) {
            console.warn(`[PortalClient ${this.source}] setWindowState ${state} failed: ${err.message}`);
            return false;
        }
    }

    async hideWindow() {
        if (!this.page || !this.profileDir) return false;
        const result = await processManager.hideBrowserWindowsByProfile(this.profileDir);
        if (!result.success) {
            console.warn(`[PortalClient ${this.source}] hideWindow failed: ${result.errorCode || 'NO_MATCHING_WINDOW'}`);
        }
        return Boolean(result.success);
    }

    async hideBrowserWindow() { return this.hideWindow(); }

    async minimizeWindow() { return this.hideWindow(); }

    async restoreWindow() {
        let success = true;
        if (this.profileDir) {
            const res = await processManager.showBrowserWindowsByProfile(this.profileDir).catch(() => null);
            if (!res || (!res.success && res.matchedWindowCount === 0)) {
                success = false;
            }
        }
        await this.setWindowState('normal');
        return success;
    }

    async performOneLoginAttempt({ username, password, hrmCode }) {
        if (this.loginAttempts >= 1) {
            throw portalError('AUTHENTICATION_REQUIRED: automated login attempt already used.', 'AUTHENTICATION_REQUIRED');
        }
        this.loginAttempts++;

        const usernameInput = this.page.locator('input[type="text"], input[type="email"], input[name*="user" i], input[name*="login" i]').first();
        const passwordInput = this.page.locator('input[type="password"]').first();
        if (await usernameInput.count() === 0 || await passwordInput.count() === 0) {
            throw portalError('DKCL login form fields were not found.', 'LOGIN_FORM_NOT_FOUND');
        }

        await usernameInput.fill(username);
        await passwordInput.fill(password);

        const submit = this.page.locator('button[type="submit"], input[type="submit"]').first();
        if (await submit.count() === 0) {
            throw portalError('DKCL login submit control was not found.', 'LOGIN_SUBMIT_NOT_FOUND');
        }

        await Promise.all([
            this.page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {}),
            submit.click()
        ]);
        await this.page.waitForTimeout(1000);
        await this.fillHrmIdentifierIfPresent(hrmCode);
        await this.stopForSecurityChallenge({ allowHrm: false });
    }

    async fillHrmIdentifierIfPresent(hrmCode) {
        const bodyText = await this.page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
        if (!/HRM|ma nhan vien|employee|nhan vien/i.test(bodyText)) return;

        const hrmInput = this.page.locator(
            'input[name*="hrm" i], input[id*="hrm" i], input[name*="employee" i], input[id*="employee" i], input[type="text"]'
        ).first();
        if (await hrmInput.count() === 0) {
            throw portalError('AUTHENTICATION_REQUIRED: HRM identifier field was not recognized.', 'AUTHENTICATION_REQUIRED');
        }

        await hrmInput.fill(hrmCode);
        const submit = this.page.locator('button[type="submit"], input[type="submit"], button').first();
        if (await submit.count() === 0) {
            throw portalError('AUTHENTICATION_REQUIRED: HRM submit control was not recognized.', 'AUTHENTICATION_REQUIRED');
        }
        await Promise.all([
            this.page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {}),
            submit.click()
        ]);
        await this.page.waitForTimeout(1000);
    }

    async openF13Report() {
        await this.page.goto(`${this.baseUrl}/kpi/chat-luong-phat-buu-gui-lien-tinh`, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        await this.stopForSecurityChallenge({ allowHrm: false });

        // Wait for either the F1.3 report controls or the login inputs to be attached
        await Promise.race([
            this.page.waitForSelector('select[name="TuyChonGR"], select#TuyChonGR', { state: 'attached', timeout: 20000 }).catch(() => null),
            this.page.waitForSelector('input[name="login"], input[id="login"], input[type="password"]', { state: 'attached', timeout: 20000 }).catch(() => null)
        ]);

        await this.captureLoginDiagnostics('open_f13_report');

        if (this.page.url().includes('/login') || await this.page.locator('input[name="login"], input[id="login"], input[type="password"]').count() > 0) {
            throw portalError('AUTHENTICATION_REQUIRED: login required', 'AUTHENTICATION_REQUIRED');
        }
    }

    async openF41Report() {
        await this.page.goto(`${this.baseUrl}${F41_REPORT_PATH}`, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        await this.stopForSecurityChallenge({ allowHrm: false });
        await Promise.race([
            this.page.waitForSelector('select[name="TuyChonGR"]', { state: 'attached', timeout: 20000 }).catch(() => null),
            this.page.waitForSelector('input[name="login"], input[id="login"], input[type="password"]', { state: 'attached', timeout: 20000 }).catch(() => null)
        ]);
        if (this.page.url().includes('/login') || await this.page.locator('input[name="login"], input[id="login"], input[type="password"]').count() > 0) {
            throw portalError('AUTHENTICATION_REQUIRED: login required', 'AUTHENTICATION_REQUIRED');
        }
    }

    // AB-AUTH-10: retained but no longer on the F4.1 path -- waitForF41Cascade()/selectF41Exact()
    // drove the old Select2 UI transport that applyF41ReportFilters() replaced. Kept intact (not
    // deleted) so reverting the transport is a one-line change if the real-portal check fails.
    async waitForF41Cascade(fieldName) {
        try {
            await this.page.waitForLoadState('networkidle', { timeout: 15000 });
            await this.page.waitForTimeout(250);
        } catch {
            throw portalError(`F4.1 filter cascade did not finish after ${fieldName}.`, 'F41_FILTER_CASCADE_TIMEOUT');
        }
    }

    async selectF41Exact(name, value) {
        const selector = `select[name="${name}"]`;
        const control = this.page.locator(selector).first();
        if (await control.count() !== 1) {
            throw portalError(`Required F4.1 filter was not found: ${name}.`, 'FILTER_NOT_FOUND');
        }
        if (await control.inputValue() !== value) {
            await this.selectByValueOrLabel(selector, value);
        }
        await this.waitForSelectValue(selector, value);
        await this.waitForF41Cascade(name);
    }

    // DIAGNOSTIC-TEMP (AB-AUTH-11): AB-AUTH-09's capture only fires immediately before a throw, but
    // the post-AB-AUTH-10 failure can strand a job at the session check BEFORE any F4.1 throw is
    // reached, leaving no record at all. This logs one bounded line after every significant step of
    // applyF41ReportFilters() -> fetchF41OuterRows() -> readF41ExportInfo(), naming the page's real
    // URL and the first 300 characters of its content, which is enough to tell a rendered report
    // page apart from a raw JSON body. Best effort in every respect: never throws, and every page
    // read is raced against a short timeout so a hung page.content() (observed once for real, as a
    // 30s page.screenshot timeout in backend_err.log) can never stall the actual flow. Temporary --
    // remove with the rest of the F4.1 diagnostics once the root cause is fixed. See
    // AUTO-BACKFILL-RUNTIME_MANIFEST.md Section 32.
    async logF41Step(step, extra = {}) {
        try {
            const url = typeof this.page?.url === 'function' ? this.page.url() : null;
            let contentHead = null;
            if (typeof this.page?.content === 'function') {
                const html = await Promise.race([
                    this.page.content().catch(() => null),
                    new Promise((resolve) => setTimeout(() => resolve(null), this.diagnosticStepTimeoutMs))
                ]);
                if (typeof html === 'string') contentHead = html.replace(/\s+/g, ' ').slice(0, 300);
            }
            const details = Object.entries(extra).map(([key, value]) => `${key}=${value}`).join(' ');
            this.logger?.log?.(`[F41_STEP] lane=${this.lastF41Lane || this.source} step=${step}${details ? ' ' + details : ''} url=${url} contentHead=${JSON.stringify(contentHead)}`);
        } catch (error) {
            this.logger?.log?.(`[F41_STEP] step=${step} diagnostic capture failed: ${error.message}`);
        }
    }

    // AB-AUTH-13: AB-AUTH-11 (manifest Section 32) confirmed with real captures that this
    // report URL returns raw JSON to a plain page.goto() -- with no X-Requested-With header at
    // all -- so navigating the SHARED page here corrupted every session/login check that reads
    // that same page (isF13ReportReady()/_checkPageAuthenticated()/hasLoginForm()), producing the
    // real, observed unbounded WAITING_FOR_LOGIN-style loop on BOTH lanes. fetchF41OuterRows()
    // already reads the outer rows over page.request -- a real browser-context XHR that shares
    // the page's cookie jar without ever navigating the page -- so no page navigation is needed
    // here at all to acquire the data.
    //
    // Approved scope (PO, Section 32.4 steps 1-2 only -- step 3, the export, is an explicit
    // residual, see Section 33): this method no longer navigates the page to the filtered
    // query-string URL. It only records the lane/query/business date fetchF41OuterRows() needs,
    // then restores the shared page to a normal, real portal page via openF41Report() (the plain
    // report path, no query string) in a finally, so the page can never end up parked on the raw
    // JSON view again and a later login/session check always finds a real page -- even if
    // preparing the query itself throws (e.g. an invalid lane/date).
    async applyF41ReportFilters(lane, businessDate) {
        try {
            this.lastBusinessDate = businessDate;
            this.lastF41Lane = String(lane).toUpperCase();
            this.lastF41Query = buildF41ReportQuery(lane, businessDate);
            await this.logF41Step('filters_prepared', { businessDate });
        } finally {
            await this.openF41Report();
            await this.logF41Step('after_restore', { businessDate });
        }
    }

    // AB-AUTH-10: authoritative outer-row source. Requests byte-for-byte the same filtered report
    // URL as an XHR -- page.request shares the page's own cookie jar, so there is no JS injection,
    // no second login and no dependency on the page's Select2 state. The row-selection predicate
    // (at least 38 <td> cells, numeric first cell) and every cell index used by the callers are
    // unchanged from the previous DOM scrape, so unitCount/outerRowCount/totalVolume/passedVolume/
    // rate keep their exact prior meaning and assertSummary() is untouched.
    async fetchF41OuterRows(lane) {
        const query = this.lastF41Query || buildF41ReportQuery(lane, this.lastBusinessDate);
        const response = await this.page.request.get(`${this.baseUrl}${F41_REPORT_PATH}?${query}`, {
            headers: { ...F41_XHR_HEADERS }
        });
        const status = typeof response?.status === 'function' ? response.status() : 0;
        if (status < 200 || status >= 300) {
            throw portalError(`F4.1 report request returned HTTP ${status}.`, 'F41_REPORT_REQUEST_FAILED');
        }
        const body = await response.text();
        let rowsHtml = body;
        let bodyKind = 'HTML_OR_UNKNOWN';
        // AB-AUTH-15: the same response also carries `template_paginator`, which holds the real
        // <form id="exportReport"> -- action, method and every hidden input. Captured here so
        // readF41ExportInfo() can read the export target from the response that actually produced
        // these rows, instead of from a page that no longer shows a filtered report at all.
        this.lastF41Paginator = null;
        try {
            const payload = JSON.parse(body);
            if (typeof payload?.data === 'string') {
                rowsHtml = payload.data;
                bodyKind = 'JSON_WITH_DATA';
            } else {
                bodyKind = 'JSON_WITHOUT_DATA';
            }
            if (typeof payload?.template_paginator === 'string') {
                this.lastF41Paginator = payload.template_paginator;
            }
        } catch {
            rowsHtml = body;
        }
        await this.logF41Step('xhr_response', {
            status,
            bodyKind,
            bodyLength: body.length,
            rowsHtmlLength: rowsHtml.length,
            paginatorLength: this.lastF41Paginator ? this.lastF41Paginator.length : 0
        });
        const rows = await this.page.evaluate((html) => {
            const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ');
            const parsed = new DOMParser().parseFromString(`<table><tbody>${html}</tbody></table>`, 'text/html');
            return Array.from(parsed.querySelectorAll('tr'))
                .map((row) => Array.from(row.children).filter((cell) => cell.tagName === 'TD').map((cell) => normalize(cell.textContent)))
                .filter((cells) => cells.length >= 38 && /^\d+$/.test(cells[0] || ''));
        }, rowsHtml);
        await this.logF41Step('rows_parsed', { rowCount: rows.length });
        return rows;
    }

    // AB-AUTH-15: the export target is now read from the report XHR's own `template_paginator`
    // fragment rather than from `document`. AB-AUTH-13 left the shared page on the plain,
    // UNFILTERED report page (deliberately -- navigating it to the filtered URL was the AB-AUTH-11
    // root cause), and that page carries no export form at all: the real 26/08 run logged
    // `formCount=2 sampleActions=["/logout","/"] exportAction=null`, which is why every F4.1 run
    // still failed with exportIdentity null.
    //
    // The captured 23/08 responses show the portal returns the export form inside the very response
    // that produced the rows, fully formed and correctly scoped to the filters that produced them:
    //
    //   <form id="exportReport" action="https://dkcl.vnpost.vn/export/<identity>/all" method="GET">
    //     <input type="hidden" name="Total" value="38">
    //     <input type="hidden" name="FilterSelected" value="{...,&quot;iFrom&quot;:&quot;2026-08-23&quot;,...}">
    //
    // Reading it from there restores a genuine verification (the export target is still observed,
    // never inferred from the identity constant) AND yields a correctly-scoped export request
    // without the page needing to be filtered at all. The returned shape is unchanged, so
    // assertSummary() is untouched.
    async readF41ExportInfo(exportIdentity) {
        const probe = await this.page.evaluate(({ html, identity }) => {
            const parsed = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
            const forms = Array.from(parsed.querySelectorAll('form[action]'));
            const resolved = forms.map((form) => new URL(form.getAttribute('action'), location.origin));
            const index = resolved.findIndex((url) => url.pathname === `/export/${identity}/all`);
            const base = {
                formCount: forms.length,
                sampleActions: resolved.map((url) => url.pathname).slice(0, 5)
            };
            if (index < 0) {
                return { ...base, exportAction: null, exportUrl: null, method: null, params: null };
            }
            const params = {};
            for (const input of Array.from(forms[index].querySelectorAll('input[name]'))) {
                params[input.getAttribute('name')] = input.getAttribute('value') ?? '';
            }
            return {
                ...base,
                exportAction: resolved[index].pathname,
                exportUrl: resolved[index].href,
                method: String(forms[index].getAttribute('method') || 'GET').toUpperCase(),
                params
            };
        }, { html: this.lastF41Paginator, identity: exportIdentity });

        this.lastF41ExportRequest = probe.exportAction
            ? { url: probe.exportUrl, method: probe.method, params: probe.params, exportIdentity }
            : null;

        await this.logF41Step('export_info', {
            source: 'template_paginator',
            formCount: probe.formCount,
            sampleActions: JSON.stringify(probe.sampleActions),
            exportAction: probe.exportAction,
            method: probe.method,
            paramNames: JSON.stringify(Object.keys(probe.params || {}))
        });

        const exportAction = probe.exportAction;
        return { exportAction, exportIdentity: exportAction ? exportIdentity : null };
    }

    // AB-AUTH-15: shared implementation behind requestF41HueExport()/requestF41TctExport(). Issues
    // the export form's own request through page.request -- the same cookie-sharing, non-navigating
    // transport fetchF41OuterRows() already uses -- instead of clicking a submit button that is no
    // longer on the page. The URL, method and every parameter come verbatim from the form the
    // portal itself returned for these exact filters; nothing is reconstructed or guessed, so the
    // exported workbook is scoped to the same lane/date as the summary that was just verified.
    //
    // The response is logged (status, content-type, length) but deliberately NOT consumed as a
    // file: the existing flow expects this call only to TRIGGER server-side generation, after which
    // pollGeneratedFile() finds the workbook in the portal's own generated-file list. That contract
    // is unchanged. If a real run shows this endpoint returning the workbook inline instead, the
    // logged content-type will say so plainly -- see manifest Section 36.4.
    async requestF41Export(expectedIdentity, laneLabel) {
        const request = this.lastF41ExportRequest;
        if (!request?.url || request.exportIdentity !== expectedIdentity) {
            throw portalError(`F4.1 ${laneLabel} export control is not uniquely ready.`, 'EXPORT_CONTROL_NOT_READY');
        }
        const response = await this.page.request.fetch(request.url, {
            method: request.method || 'GET',
            params: request.params || {},
            headers: { ...F41_XHR_HEADERS }
        });
        const status = typeof response?.status === 'function' ? response.status() : 0;
        const contentType = typeof response?.headers === 'function' ? (response.headers()['content-type'] || null) : null;
        await this.logF41Step('export_requested', { lane: laneLabel, status, contentType, url: request.url });
        if (status < 200 || status >= 300) {
            throw portalError(`F4.1 ${laneLabel} export request returned HTTP ${status}.`, 'EXPORT_REQUEST_FAILED');
        }
        await this.page.waitForTimeout(1000);
    }

    async submitF41HueFilters({ businessDate }) {
        await this.applyF41ReportFilters('HUE', businessDate);
    }

    // DIAGNOSTIC-TEMP (AB-AUTH-09): PO confirmed real data exists on the portal for the dates
    // F4.1 keeps failing on (23-24/08), ruling out "no data yet" -- this is a real bug and needs
    // real evidence of what the page actually rendered, not another guess from code. Best-effort,
    // never throws, never changes the outcome of the caller: called right before every
    // F41_OUTER_SUMMARY_NOT_FOUND / F41_..._OUTER_SUMMARY_INVALID throw (both readF41*OuterSummary()
    // below and assertSummary() in f41HueSingleDateService.js/f41TctSingleDateService.js, via
    // portalClient.captureF41Diagnostics()) to save a full-page screenshot + page.content() HTML
    // snapshot to disk, named with lane/reason/businessDate/timestamp, and log both paths.
    // Temporary diagnostic tooling -- remove once the root cause is found and fixed. See
    // AUTO-BACKFILL-RUNTIME_MANIFEST.md Section 30.
    async captureF41Diagnostics({ businessDate, reason } = {}) {
        try {
            if (!this.page) return null;
            this.fs.mkdirSync(this.diagnosticsDir, { recursive: true });
            const lane = String(this.source || 'UNKNOWN').toUpperCase();
            const date = businessDate || this.lastBusinessDate || 'unknown-date';
            const safeReason = String(reason || 'failure').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const base = `f41-${lane.toLowerCase()}-${safeReason}-${date}-${timestamp}`;
            const screenshotPath = this.path.join(this.diagnosticsDir, `${base}.png`);
            const htmlPath = this.path.join(this.diagnosticsDir, `${base}.html`);

            let screenshotSaved = false;
            if (typeof this.page.screenshot === 'function') {
                await this.page.screenshot({ path: screenshotPath, fullPage: true })
                    .then(() => { screenshotSaved = true; })
                    .catch((error) => this.logger?.log?.(`[F41_DIAGNOSTIC_CAPTURE] screenshot failed: ${error.message}`));
            }

            let htmlSaved = false;
            if (typeof this.page.content === 'function') {
                await this.page.content()
                    .then((html) => {
                        this.fs.writeFileSync(htmlPath, html, 'utf8');
                        htmlSaved = true;
                    })
                    .catch((error) => this.logger?.log?.(`[F41_DIAGNOSTIC_CAPTURE] page content capture failed: ${error.message}`));
            }

            this.logger?.log?.(`[F41_DIAGNOSTIC_CAPTURE] lane=${lane} reason=${reason || 'unknown'} businessDate=${date} screenshot=${screenshotSaved ? screenshotPath : 'NOT_SAVED'} html=${htmlSaved ? htmlPath : 'NOT_SAVED'}`);
            return { screenshotPath: screenshotSaved ? screenshotPath : null, htmlPath: htmlSaved ? htmlPath : null };
        } catch (error) {
            this.logger?.log?.(`[F41_DIAGNOSTIC_CAPTURE] capture failed: ${error.message}`);
            return null;
        }
    }

    // AB-AUTH-10: the outer summary is no longer scraped out of the rendered page. Rows now come
    // from fetchF41OuterRows(), which re-requests the same filtered report URL as an XHR, so the
    // numbers can no longer be silently wrong because the page's Select2 state disagreed with the
    // filters we asked for. Everything downstream is unchanged: the same cell indices, the same
    // return shape, the same F41_OUTER_SUMMARY_NOT_FOUND code, the same [F41_HUE_OUTER_SUMMARY]
    // diagnostic line (Section 26/28) and the same AB-AUTH-09 screenshot/HTML capture before the
    // throw. Only `tablesScanned=` became `rowsScanned=`, because the new transport counts rows,
    // not top-level tables.
    async readF41HueOuterSummary() {
        const rows = await this.fetchF41OuterRows('HUE');
        const { exportAction, exportIdentity } = await this.readF41ExportInfo(F41_HUE_EXPORT_IDENTITY);
        if (!rows.length) {
            this.logger?.warn?.(`[F41_HUE_OUTER_SUMMARY] outer summary rows not found -- rowsScanned=${rows.length} exportAction=${exportAction} exportIdentity=${exportIdentity}`);
            await this.captureF41Diagnostics({ businessDate: this.lastBusinessDate, reason: 'OUTER_SUMMARY_NOT_FOUND' });
            throw portalError('F4.1 HUE outer summary table was not found.', 'F41_OUTER_SUMMARY_NOT_FOUND');
        }
        const cells = rows[0];
        return {
            unitCount: rows.length,
            totalVolume: normalizeNumber(cells[10]),
            passedVolume: normalizeNumber(cells[27]),
            rate: cells[28] || null,
            exportIdentity,
            exportAction
        };
    }

    async requestF41HueExport() {
        await this.requestF41Export(F41_HUE_EXPORT_IDENTITY, 'HUE');
    }

    async submitF41TctFilters({ businessDate }) {
        await this.applyF41ReportFilters('TCT', businessDate);
    }

    // AB-AUTH-10: same transport change as readF41HueOuterSummary() above -- rows over XHR instead
    // of a page scrape, everything else (shape, error code, diagnostic line, capture) unchanged.
    async readF41TctOuterSummary() {
        const rows = await this.fetchF41OuterRows('TCT');
        const { exportAction, exportIdentity } = await this.readF41ExportInfo(F41_TCT_EXPORT_IDENTITY);
        if (!rows.length) {
            this.logger?.warn?.(`[F41_TCT_OUTER_SUMMARY] outer summary table not found or empty -- outerRowCount=${rows.length} exportAction=${exportAction} exportIdentity=${exportIdentity}`);
            await this.captureF41Diagnostics({ businessDate: this.lastBusinessDate, reason: 'OUTER_SUMMARY_NOT_FOUND' });
            throw portalError('F4.1 TCT outer summary table was not found.', 'F41_OUTER_SUMMARY_NOT_FOUND');
        }
        return { outerRowCount: rows.length, exportIdentity, exportAction };
    }

    async requestF41TctExport() {
        await this.requestF41Export(F41_TCT_EXPORT_IDENTITY, 'TCT');
    }

    async submitFilters({ groupBy, provinceCode, fromDate, toDate }) {
        await this.selectByValueOrLabel('select[name="TuyChonGR"], select#TuyChonGR', groupBy);
        await this.waitForSelectValue('select[name="TuyChonGR"], select#TuyChonGR', groupBy);
        await this.selectByValueOrLabel('select[name="stMaTinhPhat"], select#stMaTinhPhat', provinceCode);
        await this.waitForSelectValue('select[name="stMaTinhPhat"], select#stMaTinhPhat', provinceCode);
        await this.selectDefaultAllIfPresent('select[name="stMaBCKTTinhPhat"], select#stMaBCKTTinhPhat');
        await this.selectDefaultAllIfPresent('select[name="stMaBuuCucPhat"], select#stMaBuuCucPhat');
        await this.normalizeRemainingFilters();
        await this.fillDateInputs({
            visibleFromDate: formatPortalDate(fromDate),
            visibleToDate: formatPortalDate(toDate),
            requestFromDate: formatPortalRequestDate(fromDate),
            requestToDate: formatPortalRequestDate(toDate)
        });
        await this.verifyDateInputs({
            visibleFromDate: formatPortalDate(fromDate),
            visibleToDate: formatPortalDate(toDate),
            requestFromDate: formatPortalRequestDate(fromDate),
            requestToDate: formatPortalRequestDate(toDate)
        });

        const submit = this.page.getByRole('button', { name: 'Thống kê' });
        if (await submit.count() !== 1) {
            throw portalError('F1.3 Thong ke button was not found uniquely.', 'REPORT_SUBMIT_NOT_FOUND');
        }
        await submit.click();
        await this.page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    }

    async getF13ExportReadiness({ groupBy, provinceCode, fromDate, toDate } = {}) {
        if (!await this.isF13ReportReady()) {
            return { ready: false, status: 'NOT_READY', code: 'REPORT_PAGE_REQUIRED', message: 'TCT F1.3 report page is not ready.' };
        }

        const expected = {
            groupBy: groupBy || null,
            provinceCode: provinceCode || null,
            visibleFromDate: fromDate ? formatPortalDate(fromDate) : null,
            visibleToDate: toDate ? formatPortalDate(toDate) : null
        };
        const readiness = await this.page.evaluate((expectation) => {
            const visible = (element) => {
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
            };
            const selectValue = (name) => document.querySelector(`select[name="${name}"]`)?.value || null;
            const dateValues = Array.from(document.querySelectorAll('input[type="text"], input[type="date"]'))
                .filter(visible)
                .map((input) => input.value);
            const exportButtons = Array.from(document.querySelectorAll(
                'form[action$="/export/sp_TT_Phat_LienTinh_Tinh/all"] button[type="submit"]'
            )).filter(visible);
            const exportButton = exportButtons.length === 1 ? exportButtons[0] : null;
            const scopeMatches = (!expectation.groupBy || selectValue('TuyChonGR') === expectation.groupBy) &&
                (!expectation.provinceCode || selectValue('stMaTinhPhat') === expectation.provinceCode);
            const dateMatches = (!expectation.visibleFromDate || dateValues.includes(expectation.visibleFromDate)) &&
                (!expectation.visibleToDate || dateValues.includes(expectation.visibleToDate));
            const resultTableReady = exportButtons.length === 1;
            const exportEnabled = Boolean(exportButton && !exportButton.disabled && exportButton.getAttribute('aria-disabled') !== 'true');
            return {
                url: location.href,
                title: document.title,
                scopeMatches,
                dateMatches,
                resultTableReady,
                exportButtonCount: exportButtons.length,
                exportEnabled,
                selectedGroupBy: selectValue('TuyChonGR'),
                selectedProvinceCode: selectValue('stMaTinhPhat'),
                dateValues
            };
        }, expected);

        if (!readiness.scopeMatches) return { ...readiness, ready: false, status: 'NOT_READY', code: 'TCT_SCOPE_NOT_READY', message: 'TCT scope is not applied.' };
        if (!readiness.dateMatches) return { ...readiness, ready: false, status: 'NOT_READY', code: 'DATE_FILTER_NOT_APPLIED', message: 'TCT date filter is not applied.' };
        if (!readiness.resultTableReady) return { ...readiness, ready: false, status: 'NOT_READY', code: 'RESULT_TABLE_NOT_READY', message: 'TCT report results are not ready.' };
        if (!readiness.exportEnabled) return { ...readiness, ready: false, status: 'NOT_READY', code: 'EXPORT_CONTROL_NOT_READY', message: 'TCT export control is not ready.' };
        return { ...readiness, ready: true, status: 'READY_TO_EXPORT', code: null, message: null };
    }

    async waitForF13ExportReadiness(expectation, { timeoutMs = 30000, intervalMs = 500 } = {}) {
        const deadline = Date.now() + timeoutMs;
        let readiness = null;
        while (Date.now() < deadline) {
            readiness = await this.getF13ExportReadiness(expectation);
            if (readiness.ready) return readiness;
            await this.page.waitForTimeout(intervalMs);
        }
        const error = portalError(readiness?.message || 'TCT F1.3 export readiness timed out.', readiness?.code || 'EXPORT_READINESS_TIMEOUT');
        error.readiness = readiness;
        throw error;
    }

    async requestSummaryExport() {
        const exportButton = this.page.locator('form[action$="/export/sp_TT_Phat_LienTinh_Tinh/all"] button[type="submit"]');
        if (await exportButton.count() !== 1 || !await exportButton.isVisible() || !await exportButton.isEnabled()) {
            throw portalError('TCT F1.3 export control is not ready.', 'EXPORT_CONTROL_NOT_READY');
        }
        await exportButton.click();
        await this.page.waitForTimeout(1000);
    }

    async readDetailTotal() {
        await this.page.locator('table tr').nth(2).waitFor({ timeout: 30000 });
        const total = await this.page.evaluate(() => {
            const headerRow = document.querySelectorAll('table tr')[0];
            const summaryRow = document.querySelectorAll('table tr')[2];
            if (!headerRow || !summaryRow) return '';
            const headers = Array.from(headerRow.children).map(cell => cell.innerText.trim().replace(/\s+/g, ' '));
            const targetIndex = headers.indexOf('SL bưu gửi phát thành công/Nộp tiền/CH');
            if (targetIndex === -1) return '';
            const cells = Array.from(summaryRow.children);
            return cells[targetIndex]?.innerText || '';
        });
        return normalizeNumber(total);
    }

    async getSelectedFilters() {
        return this.page.evaluate(() => {
            const selectValue = (name) => {
                const select = document.querySelector(`select[name="${name}"]`);
                return select ? {
                    value: select.value,
                    label: select.options[select.selectedIndex]?.textContent?.trim() || ''
                } : null;
            };
            const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="date"]'));
            const fromInput = inputs.at(-2);
            const toInput = inputs.at(-1);
            return {
                groupBy: selectValue('TuyChonGR'),
                province: selectValue('stMaTinhPhat'),
                bcktProvince: selectValue('stMaBCKTTinhPhat'),
                deliveryPostOffice: selectValue('stMaBuuCucPhat'),
                fromDate: fromInput?.value || '',
                toDate: toInput?.value || ''
            };
        });
    }

    async openDetailTable() {
        const candidate = await this.page.evaluate((expectedHeader) => {
            const summaryRow = document.querySelectorAll('table tr')[2];
            const headerRow = document.querySelectorAll('table tr')[0];
            if (!summaryRow || !headerRow) return { index: -1, visibleCandidateCount: 0 };
            const headers = Array.from(headerRow.children).map((cell) => cell.innerText.trim().replace(/\s+/g, ' '));
            const ajaxCells = Array.from(summaryRow.querySelectorAll('td.ajax_cell'));
            const cells = ajaxCells.map((cell, index) => {
                const cellIndex = Array.from(summaryRow.children).indexOf(cell);
                const rect = cell.getBoundingClientRect();
                const style = window.getComputedStyle(cell);
                const isHiddenClass = Array.from(cell.classList).includes('d-none');
                const isVisible = (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    rect.width > 0 &&
                    rect.height > 0
                );
                return {
                    index,
                    cellIndex,
                    header: headers[cellIndex] || '',
                    total: Number(String(cell.innerText || '').replace(/[^\d]/g, '')) || 0,
                    isAjaxCell: true,
                    isHiddenClass,
                    isVisible
                };
            });
            return {
                index: cells.findIndex((cell) => (
                    cell.isAjaxCell &&
                    !cell.isHiddenClass &&
                    cell.isVisible &&
                    cell.header === expectedHeader
                )),
                visibleCandidateCount: cells.filter((cell) => cell.isVisible && !cell.isHiddenClass).length,
                expectedHeader,
                selected: cells.find((cell) => (
                    cell.isAjaxCell &&
                    !cell.isHiddenClass &&
                    cell.isVisible &&
                    cell.header === expectedHeader
                )) || null
            };
        }, DETAIL_METRIC_HEADER);

        if (candidate.index < 0) {
            throw portalError(
                `Visible clickable detail metric was not found for header ${DETAIL_METRIC_HEADER}; visible candidates=${candidate.visibleCandidateCount}.`,
                'DETAIL_TOTAL_VISIBLE_CANDIDATE_NOT_FOUND'
            );
        }

        const detailCell = this.page.locator('table tr').nth(2).locator('td.ajax_cell').nth(candidate.index);
        if (await detailCell.count() !== 1 || !(await detailCell.isVisible())) {
            throw portalError('Visible detail-total candidate was not confirmed before click.', 'DETAIL_TOTAL_CANDIDATE_NOT_CONFIRMED');
        }
        await detailCell.click();
        await this.page.waitForTimeout(1000);
        return {
            header: candidate.selected.header,
            value: candidate.selected.total,
            cellIndex: candidate.selected.cellIndex,
            selector: 'summary aggregate row visible td.ajax_cell'
        };
    }

    async readDetailTableTotal() {
        const text = await this.page.locator('text=Tổng số:').last().innerText({ timeout: 30000 });
        return Number(String(text).replace(/[^\d]/g, ''));
    }

    async readDetailTableTotal() {
        await this.page.locator('form[action$="/export/sp_TT_Phat_LienTinh_ChiTiet/all"]').waitFor({ timeout: 30000 });
        const text = await this.page.evaluate(() => {
            const isVisible = (element) => {
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
            };
            return Array.from(document.querySelectorAll('body *'))
                .filter((element) => isVisible(element))
                .map((element) => element.innerText?.trim().replace(/\s+/g, ' '))
                .find((value) => /^Tổng số:\s*\d+(\s+Xuất toàn bộ)?/.test(value || '')) || '';
        });
        const match = String(text || '').match(/Tổng số:\s*([\d.,]+)/);
        return match ? normalizeNumber(match[1]) : normalizeNumber(text);
    }

    async requestDetailExport() {
        const formButton = this.page.locator('form[action$="/export/sp_TT_Phat_LienTinh_ChiTiet/all"] button[type="submit"]');
        if (await formButton.count() !== 1) {
            throw portalError('Detail-table export-all button was not found uniquely.', 'DETAIL_EXPORT_NOT_FOUND');
        }
        await formButton.click();
        await this.page.waitForTimeout(1000);
    }

    async pollGeneratedFile({ requestedAt, timeoutMs, intervalMs, match }) {
        const timeoutAt = Date.now() + timeoutMs;
        while (Date.now() < timeoutAt) {
            await this.page.goto(`${this.baseUrl}/files`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            
            let files = null;
            let readAttempts = 0;
            while (readAttempts < 3) {
                try {
                    files = await this.page.evaluate(() => Array.from(document.querySelectorAll('table tbody tr')).map((tr) => {
                        const cells = Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim().replace(/\s+/g, ' '));
                        const xlsx = Array.from(tr.querySelectorAll('a')).find((a) => /files-xlsx/i.test(a.href));
                        return {
                            filename: cells[1],
                            createdAtText: cells[3],
                            createdAt: cells[3],
                            href: xlsx?.getAttribute('href') || null
                        };
                    }));
                    break;
                } catch (error) {
                    const isNavError = error.message.includes('context was destroyed') || 
                                       error.message.includes('navigation') || 
                                       error.message.includes('loading');
                    if (isNavError && readAttempts < 2) {
                        readAttempts++;
                        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
                        await this.page.locator('table tbody tr').first().waitFor({ timeout: 5000 }).catch(() => {});
                        continue;
                    }
                    throw error;
                }
            }

            const normalized = files.map((file) => ({
                ...file,
                createdAt: this.parsePortalTimestamp(file.createdAtText)
            }));
            const selected = selectNewestGeneratedFile(normalized, { requestedAt, match });
            if (selected?.href) return selected;
            await this.page.waitForTimeout(intervalMs);
        }
        return null;
    }

    async downloadXlsx({ file, targetDir }) {
        fs.mkdirSync(targetDir, { recursive: true });
        const downloadPromise = this.page.waitForEvent('download', { timeout: 120000 });
        const downloadUrl = file.href.startsWith('http') ? file.href : `${this.baseUrl}${file.href}`;
        await this.page.evaluate((url) => {
            window.location.href = url;
        }, downloadUrl);
        const download = await downloadPromise;
        const targetPath = path.join(targetDir, file.filename);
        await download.saveAs(targetPath);
        return targetPath;
    }

    async deleteGeneratedFile(file) {
        if (!file?.filename) {
            throw portalError('Generated file metadata is missing for cleanup.', 'CLEANUP_FILE_MISSING');
        }

        await this.page.goto(`${this.baseUrl}/files`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const rowIndexes = await this.page.evaluate((filename) => {
            const rows = Array.from(document.querySelectorAll('table tbody tr')).map((tr) => ({
                cells: Array.from(tr.querySelectorAll('td')).map((td) => td.textContent.trim().replace(/\s+/g, ' '))
            }));
            return rows
                .map((row, index) => ({ row, index }))
                .filter(({ row }) => row.cells.some((cell) => cell === filename))
                .map(({ index }) => index);
        }, file.filename);
        if (rowIndexes.length === 0) {
            return { status: 'ALREADY_DELETED' };
        }
        if (rowIndexes.length !== 1) {
            throw portalError('Generated file row was not found uniquely for cleanup.', 'CLEANUP_ROW_NOT_FOUND');
        }

        const targetRow = this.page.locator('table tbody tr').nth(rowIndexes[0]);
        const deleteButton = targetRow.locator([
            'a.btn-danger',
            'button.btn-danger',
            'a[class*="danger" i]',
            'button[class*="danger" i]',
            'a[class*="red" i]',
            'button[class*="red" i]',
            'a[href*="delete" i]',
            'button[title*="xoa" i]',
            'a[title*="xoa" i]',
            'button[title*="xóa" i]',
            'a[title*="xóa" i]',
            'a:has(i[class*="trash" i])',
            'button:has(i[class*="trash" i])',
            'a:has([class*="trash" i])',
            'button:has([class*="trash" i])'
        ].join(', '));
        const visibleIndexes = [];
        const deleteButtonCount = await deleteButton.count();
        for (let index = 0; index < deleteButtonCount; index++) {
            if (await deleteButton.nth(index).isVisible().catch(() => false)) {
                visibleIndexes.push(index);
            }
        }
        if (visibleIndexes.length !== 1) {
            throw portalError('Generated file delete button was not found uniquely.', 'CLEANUP_DELETE_NOT_FOUND');
        }

        this.page.once('dialog', async (dialog) => {
            await dialog.accept();
        });
        await deleteButton.nth(visibleIndexes[0]).click();
        await this.page.waitForTimeout(500);
        const confirmDeleteButton = targetRow.locator('button.btn-danger').filter({ hasText: /Xoá|Xóa|Xoa/i });
        const confirmIndexes = [];
        const confirmCount = await confirmDeleteButton.count();
        for (let index = 0; index < confirmCount; index++) {
            if (await confirmDeleteButton.nth(index).isVisible().catch(() => false)) {
                confirmIndexes.push(index);
            }
        }
        if (confirmIndexes.length === 1) {
            await confirmDeleteButton.nth(confirmIndexes[0]).click();
        }
        await this.page.waitForTimeout(1000);

        const disappeared = await this.page.waitForFunction(
            (filename) => !Array.from(document.querySelectorAll('table tbody tr')).some((tr) => (
                Array.from(tr.querySelectorAll('td')).some((td) => td.textContent.trim().replace(/\s+/g, ' ') === filename)
            )),
            file.filename,
            { timeout: 30000 }
        ).then(() => true).catch(() => false);
        if (!disappeared) {
            throw portalError('Generated file row still appears after cleanup.', 'CLEANUP_ROW_STILL_PRESENT');
        }
        return { status: 'DELETED' };
    }

    async selectByValueOrLabel(selector, value) {
        const select = this.page.locator(selector).first();
        if (await select.count() === 0) throw portalError(`Required select not found: ${selector}`, 'FILTER_NOT_FOUND');
        await select.selectOption(value).catch(async () => {
            await select.selectOption({ label: value });
        });
    }

    async selectDefaultAllIfPresent(selector) {
        const select = this.page.locator(selector).first();
        if (await select.count() === 0) return;
        const value = await select.evaluate((element) => {
            const options = Array.from(element.options || []);
            if (options.some((option) => option.value === 'NULL')) return 'NULL';
            if (options.some((option) => option.value === 'ALL')) return 'ALL';
            return element.value;
        });
        await this.waitForSelectOption(selector, value);
        await this.selectByValueOrLabel(selector, value);
        await this.waitForSelectValue(selector, value);
    }

    async normalizeRemainingFilters() {
        await this.page.evaluate(() => {
            const fixedNames = new Set(['TuyChonGR', 'stMaTinhPhat', 'stMaBCKTTinhPhat', 'stMaBuuCucPhat']);
            for (const select of Array.from(document.querySelectorAll('select'))) {
                const name = select.getAttribute('name') || '';
                if (fixedNames.has(name)) continue;
                const options = Array.from(select.options || []);
                const allOption = options.find((option) => option.value === 'ALL' || /Chọn tất cả/i.test(option.textContent || ''));
                if (allOption) {
                    select.value = allOption.value;
                    allOption.selected = true;
                } else if (select.multiple) {
                    for (const option of options) option.selected = false;
                }
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }

    async waitForSelectOption(selector, value) {
        const selectorText = selector.split(',')[0].trim();
        await this.page.waitForFunction(
            ({ selectorText: cssSelector, expected }) => {
                const select = document.querySelector(cssSelector);
                return !!select && Array.from(select.options || []).some((option) => option.value === expected);
            },
            { selectorText, expected: value },
            { timeout: 30000 }
        ).catch(() => {
            throw portalError(`Required select option not loaded: ${selector}=${value}`, 'FILTER_OPTION_NOT_LOADED');
        });
    }

    async waitForSelectValue(selector, value) {
        const selectorText = selector.split(',')[0].trim();
        await this.page.waitForFunction(
            ({ selectorText: cssSelector, expected }) => {
                const select = document.querySelector(cssSelector);
                return !!select && select.value === expected;
            },
            { selectorText, expected: value },
            { timeout: 30000 }
        ).catch(async () => {
            const actual = await this.page.locator(selector).first().evaluate((select) => select.value).catch(() => '');
            throw portalError(`Filter value was not confirmed: ${selector} expected ${value} got ${actual}`, 'FILTER_VALUE_NOT_CONFIRMED');
        });
    }

    async fillDateInputs({ visibleFromDate, visibleToDate, requestFromDate, requestToDate }) {
        const inputs = this.page.locator('input[type="text"], input[type="date"]');
        const count = await inputs.count();
        if (count < 2) throw portalError('F1.3 date inputs were not found.', 'DATE_FILTER_NOT_FOUND');
        await this.setInputValue(inputs.nth(count - 2), visibleFromDate);
        await this.setInputValue(inputs.nth(count - 1), visibleToDate);
        await this.setNamedInputValue('iFrom', requestFromDate);
        await this.setNamedInputValue('iTo', requestToDate);
    }

    async verifyDateInputs({ visibleFromDate, visibleToDate, requestFromDate, requestToDate }) {
        const inputs = this.page.locator('input[type="text"], input[type="date"]');
        const count = await inputs.count();
        const actualFrom = await inputs.nth(count - 2).evaluate((input) => input.value);
        const actualTo = await inputs.nth(count - 1).evaluate((input) => input.value);
        const hidden = await this.page.evaluate(() => ({
            iFrom: document.querySelector('input[name="iFrom"]')?.value || '',
            iTo: document.querySelector('input[name="iTo"]')?.value || ''
        }));
        if (
            actualFrom !== visibleFromDate ||
            actualTo !== visibleToDate ||
            hidden.iFrom !== requestFromDate ||
            hidden.iTo !== requestToDate
        ) {
            throw portalError('F1.3 date filters were not confirmed after assignment.', 'DATE_FILTER_NOT_CONFIRMED');
        }
    }

    async setInputValue(locator, value) {
        await locator.evaluate((input, nextValue) => {
            input.value = nextValue;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }, value);
    }

    async setNamedInputValue(name, value) {
        await this.page.evaluate(({ fieldName, nextValue }) => {
            const input = document.querySelector(`input[name="${fieldName}"]`);
            if (!input) return;
            input.value = nextValue;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }, { fieldName: name, nextValue: value });
    }

    parsePortalTimestamp(value) {
        const match = String(value || '').match(/(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}):(\d{2}):(\d{2})/);
        if (!match) return value;
        return `${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}:${match[6]}+07:00`;
    }

    async stopForSecurityChallenge({ allowHrm = false } = {}) {
        const bodyText = await this.page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
        const hasHrm = /HRM|ma nhan vien|employee|nhan vien/i.test(bodyText);
        if (/captcha|otp|ma xac thuc|sso/i.test(bodyText) || (hasHrm && !allowHrm)) {
            if (!this.headless && await this.waitForManualAuthentication()) return;
            throw portalError('AUTHENTICATION_REQUIRED: DKCL requires an unrecognized security step or manual authentication.', 'AUTHENTICATION_REQUIRED');
        }
    }

    async waitForManualAuthentication() {
        const timeoutAt = Date.now() + this.manualAuthWaitMs;
        await this.captureLoginDiagnostics('wait_start');
        while (Date.now() < timeoutAt) {
            if (await this.isAuthenticated()) {
                await this.captureLoginDiagnostics('wait_detected_authenticated');
                return true;
            }
            await this.page.waitForTimeout(this.manualAuthPollMs);
        }
        await this.captureLoginDiagnostics('wait_timed_out');
        return false;
    }
}

module.exports = {
    DkclHueF13PortalClient,
    DEFAULT_CHROMIUM_LAUNCH_ARGS,
    buildPersistentLaunchOptions,
    waitForPortalCapablePage,
    portalError,
    formatPortalDate,
    formatPortalRequestDate,
    findVisibleDetailCandidateIndex,
    findExactFileRowIndexes,
    DETAIL_METRIC_HEADER,
    F41_REPORT_PATH,
    F41_LANE_QUERY_FILTERS,
    buildF41ReportQuery,
    F41_HUE_EXPORT_IDENTITY,
    F41_HUE_EXPORT_ACTION,
    F41_TCT_EXPORT_IDENTITY,
    F41_TCT_EXPORT_ACTION
};
