'use strict';

const fs = require('fs');
const path = require('path');
const { selectNewestGeneratedFile } = require('./dkclHueF13SyncService');

const DETAIL_METRIC_HEADER = 'SL bưu gửi phát thành công/Nộp tiền/CH';

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
        this.loginAttempts = 0;
        this.source = options.source || 'HUE';
        this.onDisconnect = null;
    }

    async authenticate({ baseUrl, username, password, hrmCode, profileDir, requireExistingSession = false }) {
        if (!requireExistingSession && (!username || !password || !hrmCode)) {
            throw portalError('Hue portal credentials or HRM identifier are missing from local environment.', 'MISSING_CREDENTIALS');
        }

        this.baseUrl = String(baseUrl || 'https://dkcl.vnpost.vn/').replace(/\/+$/, '');
        this.profileDir = this.path.resolve(profileDir || this.path.resolve(process.cwd(), `../Data DKCL/BrowserProfiles/${this.source}`));
        this.acquireProfileLock();

        const { chromium } = this.playwright || loadPlaywright();
        this.context = await chromium.launchPersistentContext(this.profileDir, {
            headless: this.headless,
            acceptDownloads: true
        });
        if (this.context.on) {
            this.context.on('close', () => {
                if (this.onDisconnect) this.onDisconnect();
            });
        }
        this.page = this.context.pages()[0] || await this.context.newPage();

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

    acquireProfileLock() {
        const parentDir = this.path.dirname(this.profileDir);
        this.fs.mkdirSync(parentDir, { recursive: true });
        this.lockDir = `${this.profileDir}.lock`;
        try {
            this.fs.mkdirSync(this.lockDir);
        } catch (error) {
            if (error.code === 'EEXIST') {
                throw portalError(`${this.source} DKCL persistent browser profile is already in use.`, 'PROFILE_LOCKED');
            }
            throw error;
        }
    }

    async close() {
        if (this.context) {
            await this.context.close().catch(() => {});
            this.context = null;
        }
        if (this.lockDir && this.fs.existsSync(this.lockDir)) {
            this.fs.rmSync(this.lockDir, { recursive: true, force: true });
        }
    }

    async isAuthenticated() {
        if (this.page.url().includes('/login')) return false;
        const bodyText = await this.page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
        return /Quan ly tep|Quản lý tệp|Tra cứu thông tin bưu gửi|Tra cuu thong tin buu gui|Dang xuat|Đăng xuất|Logout|tantn\.bdtth/i.test(bodyText);
    }

    async openInteractiveAuthentication({ baseUrl, profileDir }) {
        this.baseUrl = String(baseUrl || 'https://dkcl.vnpost.vn/').replace(/\/+$/, '');
        this.profileDir = this.path.resolve(profileDir || this.path.resolve(process.cwd(), `../Data DKCL/BrowserProfiles/${this.source}`));
        this.acquireProfileLock();
        const { chromium } = this.playwright || loadPlaywright();
        this.context = await chromium.launchPersistentContext(this.profileDir, { headless: false, acceptDownloads: true });
        if (this.context.on) {
            this.context.on('close', () => {
                if (this.onDisconnect) this.onDisconnect();
            });
        }
        this.page = this.context.pages()[0] || await this.context.newPage();
        await this.restoreWindow();
        await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        if (!await this.isAuthenticated()) {
            if (!this.page.url().includes('/login')) {
                await this.page.goto(`${this.baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            }
            if (!await this.waitForManualAuthentication()) {
                throw portalError('AUTHENTICATION_REQUIRED: manual DKCL login was not completed.', 'AUTHENTICATION_REQUIRED');
            }
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

    async minimizeWindow() { return this.setWindowState('minimized'); }

    async restoreWindow() { return this.setWindowState('normal'); }

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
        if (this.page.url().includes('/login')) {
            throw portalError('AUTHENTICATION_REQUIRED: login required', 'AUTHENTICATION_REQUIRED');
        }
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
            const summaryRow = document.querySelectorAll('table tr')[2];
            const cells = summaryRow ? Array.from(summaryRow.children) : [];
            const detailCell = cells.find((cell) => cell.getAttribute('data-detail') === '1');
            return detailCell?.innerText || cells[7]?.innerText || '';
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
            const files = await this.page.evaluate(() => Array.from(document.querySelectorAll('table tbody tr')).map((tr) => {
                const cells = Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim().replace(/\s+/g, ' '));
                const xlsx = Array.from(tr.querySelectorAll('a')).find((a) => /files-xlsx/i.test(a.href));
                return {
                    filename: cells[1],
                    createdAtText: cells[3],
                    createdAt: cells[3],
                    href: xlsx?.href || null
                };
            }));
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
        const locator = this.page.locator(`a[href="${file.href}"]`);
        if (await locator.count() !== 1) {
            throw portalError('Generated XLSX download button was not found uniquely.', 'XLSX_DOWNLOAD_NOT_FOUND');
        }
        const downloadPromise = this.page.waitForEvent('download', { timeout: 120000 });
        await locator.click();
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
        while (Date.now() < timeoutAt) {
            if (await this.isAuthenticated()) return true;
            await this.page.waitForTimeout(this.manualAuthPollMs);
        }
        return false;
    }
}

module.exports = {
    DkclHueF13PortalClient,
    portalError,
    formatPortalDate,
    formatPortalRequestDate,
    findVisibleDetailCandidateIndex,
    findExactFileRowIndexes,
    DETAIL_METRIC_HEADER
};
