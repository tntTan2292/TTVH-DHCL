'use strict';

// F12-PHASE-3 - one-date Portal acquisition for F1.2 (thu gom buu gui lien tinh), HUE and TCT lanes.
//
// Same shape and safety contract as F11SingleDateService: exactly one indicator x lane x business
// date; open report -> verified outer summary -> export -> poll the portal's generated-file list ->
// download -> parse with the frozen parser -> RECONCILE the workbook with the summary -> standardized
// copy into Incoming -> shared Import pipeline -> cleanup of the portal-generated file. Nothing is
// accepted that does not reconcile.
//
// Reconciliation is EXACT (F12-PHASE-3 manifest Section 7): the detail file carries a rating on every
// parcel, so rows / Dat / Khong dat must equal the summary's BD10 count / Dat / Qua quy dinh with no
// tolerance (the F1.1 tolerance exists for blank evaluations, which F1.2 does not have).
//
// `importEnabled: false` is the supervised probe mode (probe_f12_single_date.js): everything up to and
// including the reconciliation runs, but nothing is copied into Incoming and no Import is executed.

const fs = require('node:fs');
const path = require('node:path');
const { executeImport } = require('./importPipeline');
const { getIndicatorConfig } = require('./importIndicatorRegistry');
const { parseF12HueExcel } = require('./f12HueExcelParser');
const { parseF12TctExcel } = require('./f12TctExcelParser');
const { F12_EXECUTOR_IDENTITIES } = require('./autoBackfillF12Contract');

const REQUIRED_PORTAL_METHODS = Object.freeze({
    HUE: Object.freeze([
        'openF12Report', 'submitF12HueFilters', 'readF12HueOuterSummary', 'requestF12HueExport',
        'pollGeneratedFile', 'downloadXlsx',
    ]),
    TCT: Object.freeze([
        'openF12Report', 'submitF12TctFilters', 'readF12TctOuterSummary', 'requestF12TctExport',
        'pollGeneratedFile', 'downloadXlsx',
    ]),
});

function serviceError(code, message, details = null) {
    const error = new Error(message);
    error.code = code;
    if (details) error.details = details;
    return error;
}

function standardizedFilename(businessDate) {
    return `F1.2-${businessDate.replace(/-/g, '.')}.xlsx`;
}

function normalizeBusinessDate(value, lane) {
    const text = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        throw serviceError('INVALID_DATE', `F1.2 ${lane} business date must use YYYY-MM-DD.`);
    }
    return text;
}

const sum = (rows, column) => rows.reduce((total, row) => total + Number(row[column] || 0), 0);

function describe(workbook, portal, differences) {
    return `workbook ${JSON.stringify(workbook)} vs portal summary ${JSON.stringify(portal)}, differences ${JSON.stringify(differences)}`;
}

function exactDifferences(workbook, portal) {
    const differences = {};
    for (const key of Object.keys(workbook)) {
        const delta = Number(workbook[key]) - Number(portal[key]);
        if (delta !== 0) differences[key] = delta;
    }
    return differences;
}

class F12SingleDateService {
    constructor(lane, options = {}) {
        this.lane = lane;
        this.identity = F12_EXECUTOR_IDENTITIES[lane];
        this.executeImport = options.executeImport || executeImport;
        this.parser = options.parser || (lane === 'HUE' ? parseF12HueExcel : parseF12TctExcel);
        this.fs = options.fs || fs;
        this.path = options.path || path;
        this.clock = options.clock || (() => new Date());
        this.logger = options.logger || console;
        this.importEnabled = options.importEnabled !== false;
        const laneDir = lane.toLowerCase();
        this.config = {
            rawDownloadDir: options.rawDownloadDir || path.resolve(process.cwd(), `../portal-downloads/dkcl/${laneDir}/f12/raw`),
            generationTimeoutMs: options.generationTimeoutMs || Number(process.env.DKCL_HUE_GENERATION_TIMEOUT_MS || 900000),
            generationPollingIntervalMs: options.generationPollingIntervalMs || Number(process.env.DKCL_HUE_GENERATION_POLL_INTERVAL_MS || 3000),
            downloadStableTimeoutMs: options.downloadStableTimeoutMs || 120000,
        };
    }

    async runOneDate(businessDate, { portalClient, refreshRequested = false } = {}) {
        const lane = this.lane;
        const date = normalizeBusinessDate(businessDate, lane);
        for (const method of REQUIRED_PORTAL_METHODS[lane]) {
            if (typeof portalClient?.[method] !== 'function') {
                throw serviceError(`F12_${lane}_PORTAL_CLIENT_INCOMPLETE`, `F1.2 ${lane} requires portalClient.${method}().`);
            }
        }

        await portalClient.openF12Report();
        await (lane === 'HUE' ? portalClient.submitF12HueFilters({ businessDate: date }) : portalClient.submitF12TctFilters({ businessDate: date }));
        const summary = await (lane === 'HUE' ? portalClient.readF12HueOuterSummary() : portalClient.readF12TctOuterSummary());
        this.assertSummary(summary, portalClient, date);

        const requestedAt = this.clock();
        await (lane === 'HUE' ? portalClient.requestF12HueExport() : portalClient.requestF12TctExport());
        const generatedFile = await portalClient.pollGeneratedFile({
            requestedAt,
            timeoutMs: this.config.generationTimeoutMs,
            intervalMs: this.config.generationPollingIntervalMs,
            match: this.identity.generatedFileMatch,
        });
        if (!generatedFile) {
            throw serviceError('EXPORT_TIMEOUT', `Timed out waiting for the verified F1.2 ${lane} generated resource.`);
        }

        this.fs.mkdirSync(this.config.rawDownloadDir, { recursive: true });
        const downloadedPath = await portalClient.downloadXlsx({ file: generatedFile, targetDir: this.config.rawDownloadDir });
        const stablePath = await this.waitForStableFile(downloadedPath);
        const filename = standardizedFilename(date);
        const parsed = this.parser(this.fs.readFileSync(stablePath), filename);
        const figures = this.reconcile(parsed, summary);

        const result = {
            status: 'SUCCESS',
            indicator: 'F1.2',
            sourceLane: lane,
            businessDate: date,
            generatedPortalFilename: generatedFile.filename,
            downloadedPath: stablePath,
            standardizedFilename: filename,
            summary,
            ...figures,
        };
        if (!this.importEnabled) return { ...result, dryRun: true, importResult: null, cleanup: { status: 'SKIPPED_DRY_RUN' } };

        const indicator = getIndicatorConfig('F1.2');
        const incomingDir = this.path.join(indicator.incomingDir, lane);
        this.fs.mkdirSync(incomingDir, { recursive: true });
        const incomingPath = this.path.join(incomingDir, filename);
        if (this.fs.existsSync(incomingPath)) {
            throw serviceError('MANUAL_REVIEW_REQUIRED', `Standardized F1.2 ${lane} Incoming file already exists.`);
        }
        this.fs.copyFileSync(stablePath, incomingPath);

        const importResult = await this.executeImport({
            filePath: incomingPath,
            forceReimport: Boolean(refreshRequested),
            source: `AUTO_BACKFILL_F12_${lane}`,
            indicator: 'F1.2',
            lane,
        });
        if (importResult?.requiresConfirmation) {
            throw serviceError('MANUAL_REVIEW_REQUIRED', `F1.2 ${lane} Import requires confirmation for existing evidence.`, importResult);
        }
        if (!importResult?.success) {
            throw serviceError(`F12_${lane}_IMPORT_FAILED`, `F1.2 ${lane} Import did not report success.`, importResult);
        }

        let cleanup = { status: 'NOT_SUPPORTED' };
        if (typeof portalClient.deleteGeneratedFile === 'function') {
            try {
                cleanup = await portalClient.deleteGeneratedFile(generatedFile);
            } catch (error) {
                cleanup = { status: 'FAILED', warning: error.message };
            }
        }
        return { ...result, processedPath: importResult.processedPath || null, importResult, cleanup };
    }

    assertSummary(summary, portalClient = null, businessDate = null) {
        const lane = this.lane;
        const isCount = (value) => Number.isInteger(value) && value >= 0;
        const checks = {
            totalVolume: { value: summary?.totalVolume, expected: 'integer > 0', ok: Number.isInteger(summary?.totalVolume) && summary.totalVolume > 0 },
            evaluatedVolume: { value: summary?.evaluatedVolume, expected: 'integer >= 0', ok: isCount(summary?.evaluatedVolume) },
            passedVolume: { value: summary?.passedVolume, expected: 'integer <= evaluated', ok: isCount(summary?.passedVolume) && summary.passedVolume <= (summary?.evaluatedVolume || 0) },
            failedVolume: { value: summary?.failedVolume, expected: 'integer >= 0', ok: isCount(summary?.failedVolume) },
        };
        if (lane === 'HUE') {
            checks.detailIdentity = { value: summary?.detailIdentity, expected: this.identity.detailResourceIdentity, ok: summary?.detailIdentity === this.identity.detailResourceIdentity };
        } else {
            checks.exportIdentity = { value: summary?.exportIdentity, expected: this.identity.resourceIdentity, ok: summary?.exportIdentity === this.identity.resourceIdentity };
        }
        const failed = Object.entries(checks).filter(([, check]) => !check.ok).map(([name]) => name);
        if (failed.length > 0) {
            this.logger.warn?.(`[F12_${lane}_SUMMARY] outer summary rejected -- failed: [${failed.join(', ')}] -- details: ${JSON.stringify(checks)}`);
            if (typeof portalClient?.captureF41Diagnostics === 'function') {
                portalClient.captureF41Diagnostics({ businessDate, reason: `F12_${lane}_OUTER_SUMMARY_INVALID` }).catch(() => {});
            }
            throw serviceError(`F12_${lane}_OUTER_SUMMARY_INVALID`, `F1.2 ${lane} outer summary is incomplete or inconsistent (failed: ${failed.join(', ')}).`, { summary, checks });
        }
    }

    // The workbook must equal the verified outer summary figure by figure, exactly.
    reconcile(parsed, summary) {
        const rows = parsed.parsedData;
        if (this.lane === 'HUE') {
            const passed = rows.filter((row) => row.danh_gia === 'Đạt').length;
            const failed = rows.filter((row) => row.danh_gia === 'Không đạt').length;
            const workbook = { total: parsed.totalParsed, passed, failed };
            const portal = { total: summary.totalVolume, passed: summary.passedVolume, failed: summary.failedVolume };
            const differences = exactDifferences(workbook, portal);
            if (Object.keys(differences).length > 0) {
                throw serviceError(
                    'F12_HUE_RECONCILIATION_FAILED',
                    `F1.2 HUE workbook does not reconcile with the verified outer summary: ${describe(workbook, portal, differences)}.`,
                    { workbook, portal, differences },
                );
            }
            return {
                total: parsed.totalParsed,
                evaluated: passed + failed,
                passed,
                failed,
                notEnoughInfo: summary.notEnoughInfoVolume ?? null,
                rate: parsed.totalParsed ? Number(((passed / parsed.totalParsed) * 100).toFixed(2)) : null,
                reconciliation: { exact: true, differences: {} },
            };
        }
        const workbook = {
            total: sum(rows, 'sl_bd10_dong_di'),
            evaluated: sum(rows, 'sl_bd10_quet_tms'),
            passed: sum(rows, 'sl_dung_qd'),
            failed: sum(rows, 'sl_qua_qd'),
        };
        const portal = {
            total: summary.totalVolume,
            evaluated: summary.evaluatedVolume,
            passed: summary.passedVolume,
            failed: summary.failedVolume,
        };
        const differences = exactDifferences(workbook, portal);
        if (Object.keys(differences).length > 0) {
            throw serviceError(
                'F12_TCT_RECONCILIATION_FAILED',
                `F1.2 TCT workbook does not reconcile with the verified outer summary: ${describe(workbook, portal, differences)}.`,
                { workbook, portal, differences },
            );
        }
        // `Total` of the export form was 54 = 53 unit rows + the grand-total row on the observed day.
        return {
            rows: parsed.totalParsed,
            exportTotal: summary.exportTotal ?? null,
            notEnoughInfo: sum(rows, 'sl_chua_du_thong_tin'),
            ...workbook,
            reconciliation: { exact: true, differences: {} },
        };
    }

    async waitForStableFile(filePath) {
        const deadline = Date.now() + this.config.downloadStableTimeoutMs;
        let previousSize = -1;
        while (Date.now() < deadline) {
            if (this.fs.existsSync(filePath)) {
                const size = this.fs.statSync(filePath).size;
                if (size > 0 && size === previousSize) return filePath;
                previousSize = size;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw serviceError('DOWNLOAD_NOT_STABLE', `F1.2 ${this.lane} download did not become stable before timeout.`);
    }
}

class F12HueSingleDateService extends F12SingleDateService {
    constructor(options = {}) { super('HUE', options); }
}

class F12TctSingleDateService extends F12SingleDateService {
    constructor(options = {}) { super('TCT', options); }
}

class F12PortalAdapter {
    constructor({ service }) {
        if (typeof service?.runOneDate !== 'function') throw new Error('F12 adapter requires service.runOneDate().');
        this.service = service;
    }

    runOneDate(businessDate, context = {}) {
        return this.service.runOneDate(businessDate, {
            portalClient: context.portalClient || null,
            refreshRequested: Boolean(context.refreshRequested),
        });
    }
}

module.exports = {
    F12SingleDateService,
    F12HueSingleDateService,
    F12TctSingleDateService,
    F12HueAdapter: F12PortalAdapter,
    F12TctAdapter: F12PortalAdapter,
    standardizedFilename,
};
