'use strict';

// F42-PHASE-3 - one-date Portal acquisition for F4.2 (chat luong phat giao buu ta), HUE and TCT lanes.
//
// Same shape and safety contract as F12SingleDateService: exactly one indicator x lane x business date;
// open report -> verified outer summary -> export -> poll the portal's generated-file list -> download ->
// parse with the frozen parser -> RECONCILE the file with the summary -> standardized copy into Incoming ->
// shared Import pipeline -> cleanup of the portal-generated file. Nothing is accepted that does not reconcile.
//
// Differences from F1.2 (F42-PHASE-3 manifest): the HUE detail is a CSV (standardized as F4.2-YYYY.MM.DD.csv),
// the TCT file is the national POSTMAN workbook (standardized as .xlsx), and the rate counts every GBT row.
//
// Reconciliation is EXACT. HUE: rows / Dat / Khong dat must equal the summary's GBT count / PTC dung QD /
// qua thoi gian quy dinh (the blank ratings are the rows of neither). TCT: the parser already checks the
// published grand total against all 13 665 postman rows; here the grand total it read must equal the
// summary the portal screen showed (GBT, dung QD).
//
// `importEnabled: false` is the supervised probe mode (probe_f42_single_date.js): everything up to and
// including the reconciliation runs, but nothing is copied into Incoming and no Import is executed.

const fs = require('node:fs');
const path = require('node:path');
const { executeImport } = require('./importPipeline');
const { getIndicatorConfig } = require('./importIndicatorRegistry');
const { parseF42Hue } = require('./f42HueParser');
const { parseF42Tct } = require('./f42TctParser');
const { F42_EXECUTOR_IDENTITIES } = require('./autoBackfillF42Contract');

const REQUIRED_PORTAL_METHODS = Object.freeze({
    HUE: Object.freeze([
        'openF42Report', 'submitF42HueFilters', 'readF42HueOuterSummary', 'requestF42HueExport',
        'pollF42GeneratedFile', 'downloadF42File',
    ]),
    TCT: Object.freeze([
        'openF42Report', 'submitF42TctFilters', 'readF42TctOuterSummary', 'requestF42TctExport',
        'pollF42GeneratedFile', 'downloadF42File',
    ]),
});

function serviceError(code, message, details = null) {
    const error = new Error(message);
    error.code = code;
    if (details) error.details = details;
    return error;
}

function standardizedFilename(businessDate, lane = 'TCT') {
    return `F4.2-${businessDate.replace(/-/g, '.')}.${lane === 'HUE' ? 'csv' : 'xlsx'}`;
}

function normalizeBusinessDate(value, lane) {
    const text = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        throw serviceError('INVALID_DATE', `F4.2 ${lane} business date must use YYYY-MM-DD.`);
    }
    return text;
}

function describe(file, portal, differences) {
    return `file ${JSON.stringify(file)} vs portal summary ${JSON.stringify(portal)}, differences ${JSON.stringify(differences)}`;
}

const HUE_PASSED_SHORTFALL_ACCEPTED = 1;

function exactDifferences(file, portal) {
    const differences = {};
    for (const key of Object.keys(file)) {
        const delta = Number(file[key]) - Number(portal[key]);
        if (delta !== 0) differences[key] = delta;
    }
    return differences;
}

class F42SingleDateService {
    constructor(lane, options = {}) {
        this.lane = lane;
        this.identity = F42_EXECUTOR_IDENTITIES[lane];
        this.executeImport = options.executeImport || executeImport;
        this.parser = options.parser || (lane === 'HUE' ? parseF42Hue : parseF42Tct);
        this.fs = options.fs || fs;
        this.path = options.path || path;
        this.clock = options.clock || (() => new Date());
        this.logger = options.logger || console;
        this.importEnabled = options.importEnabled !== false;
        const laneDir = lane.toLowerCase();
        this.config = {
            rawDownloadDir: options.rawDownloadDir || path.resolve(process.cwd(), `../portal-downloads/dkcl/${laneDir}/f42/raw`),
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
                throw serviceError(`F42_${lane}_PORTAL_CLIENT_INCOMPLETE`, `F4.2 ${lane} requires portalClient.${method}().`);
            }
        }

        await portalClient.openF42Report();
        await (lane === 'HUE' ? portalClient.submitF42HueFilters({ businessDate: date }) : portalClient.submitF42TctFilters({ businessDate: date }));
        const summary = await (lane === 'HUE' ? portalClient.readF42HueOuterSummary() : portalClient.readF42TctOuterSummary());
        this.assertSummary(summary, portalClient, date);

        const requestedAt = this.clock();
        await (lane === 'HUE' ? portalClient.requestF42HueExport() : portalClient.requestF42TctExport());
        const generatedFile = await portalClient.pollF42GeneratedFile({
            requestedAt,
            timeoutMs: this.config.generationTimeoutMs,
            intervalMs: this.config.generationPollingIntervalMs,
            match: this.identity.generatedFileMatch,
            format: this.identity.generatedFileFormat,
        });
        if (!generatedFile) {
            throw serviceError('EXPORT_TIMEOUT', `Timed out waiting for the verified F4.2 ${lane} generated resource.`);
        }

        this.fs.mkdirSync(this.config.rawDownloadDir, { recursive: true });
        const downloadedPath = await portalClient.downloadF42File({ file: generatedFile, targetDir: this.config.rawDownloadDir });
        const stablePath = await this.waitForStableFile(downloadedPath);
        const filename = standardizedFilename(date, lane);
        const parsed = this.parser(this.fs.readFileSync(stablePath), filename);
        const figures = this.reconcile(parsed, summary);

        const result = {
            status: 'SUCCESS',
            indicator: 'F4.2',
            sourceLane: lane,
            businessDate: date,
            generatedPortalFilename: generatedFile.filename,
            downloadedPath: stablePath,
            standardizedFilename: filename,
            summary,
            ...figures,
        };
        if (!this.importEnabled) return { ...result, dryRun: true, importResult: null, cleanup: { status: 'SKIPPED_DRY_RUN' } };

        const indicator = getIndicatorConfig('F4.2');
        const incomingDir = this.path.join(indicator.incomingDir, lane);
        this.fs.mkdirSync(incomingDir, { recursive: true });
        const incomingPath = this.path.join(incomingDir, filename);
        if (this.fs.existsSync(incomingPath)) {
            throw serviceError('MANUAL_REVIEW_REQUIRED', `Standardized F4.2 ${lane} Incoming file already exists.`);
        }
        this.fs.copyFileSync(stablePath, incomingPath);

        const importResult = await this.executeImport({
            filePath: incomingPath,
            forceReimport: Boolean(refreshRequested),
            source: `AUTO_BACKFILL_F42_${lane}`,
            indicator: 'F4.2',
            lane,
        });
        if (importResult?.requiresConfirmation) {
            throw serviceError('MANUAL_REVIEW_REQUIRED', `F4.2 ${lane} Import requires confirmation for existing evidence.`, importResult);
        }
        if (!importResult?.success) {
            throw serviceError(`F42_${lane}_IMPORT_FAILED`, `F4.2 ${lane} Import did not report success.`, importResult);
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
            evaluatedVolume: { value: summary?.evaluatedVolume, expected: 'integer <= total', ok: isCount(summary?.evaluatedVolume) && summary.evaluatedVolume <= (summary?.totalVolume || 0) },
            passedVolume: { value: summary?.passedVolume, expected: 'integer <= delivered', ok: isCount(summary?.passedVolume) && summary.passedVolume <= (summary?.evaluatedVolume || 0) },
            failedVolume: { value: summary?.failedVolume, expected: 'integer >= 0', ok: isCount(summary?.failedVolume) },
        };
        if (lane === 'HUE') {
            checks.detailIdentity = { value: summary?.detailIdentity, expected: this.identity.detailResourceIdentity, ok: summary?.detailIdentity === this.identity.detailResourceIdentity };
        } else {
            checks.exportIdentity = { value: summary?.exportIdentity, expected: this.identity.resourceIdentity, ok: summary?.exportIdentity === this.identity.resourceIdentity };
        }
        const failed = Object.entries(checks).filter(([, check]) => !check.ok).map(([name]) => name);
        if (failed.length > 0) {
            this.logger.warn?.(`[F42_${lane}_SUMMARY] outer summary rejected -- failed: [${failed.join(', ')}] -- details: ${JSON.stringify(checks)}`);
            if (typeof portalClient?.captureF41Diagnostics === 'function') {
                portalClient.captureF41Diagnostics({ businessDate, reason: `F42_${lane}_OUTER_SUMMARY_INVALID` }).catch(() => {});
            }
            throw serviceError(`F42_${lane}_OUTER_SUMMARY_INVALID`, `F4.2 ${lane} outer summary is incomplete or inconsistent (failed: ${failed.join(', ')}).`, { summary, checks });
        }
    }

    // The file must equal the verified outer summary figure by figure, exactly.
    reconcile(parsed, summary) {
        const rows = parsed.parsedData;
        if (this.lane === 'HUE') {
            const passed = rows.filter((row) => row.danh_gia === 'Đạt').length;
            const failed = rows.filter((row) => row.danh_gia === 'Không đạt').length;
            const file = { total: parsed.totalParsed, passed, failed };
            const portal = { total: summary.totalVolume, passed: summary.passedVolume, failed: summary.failedVolume };
            const differences = exactDifferences(file, portal);
            // PO decision 2026-10-27: a file that holds exactly one "Đạt" fewer than the portal summary (total and
            // failed equal) is accepted and stored as the file reads; six backfill days showed this same -1.
            const acceptedShortfall = Object.keys(differences).length === 1 && differences.passed === -HUE_PASSED_SHORTFALL_ACCEPTED;
            if (Object.keys(differences).length > 0 && !acceptedShortfall) {
                throw serviceError(
                    'F42_HUE_RECONCILIATION_FAILED',
                    `F4.2 HUE file does not reconcile with the verified outer summary: ${describe(file, portal, differences)}.`,
                    { file, portal, differences },
                );
            }
            return {
                total: parsed.totalParsed,
                passed,
                failed,
                blank: parsed.totalParsed - passed - failed,
                notEnoughInfo: summary.notEnoughInfoVolume ?? null,
                rate: parsed.totalParsed ? Number(((passed / parsed.totalParsed) * 100).toFixed(2)) : null,
                reconciliation: { exact: !acceptedShortfall, differences },
            };
        }
        // The parser verified the published grand total against every postman row and returns it with the
        // 34 stored provinces; it must also be the summary the portal screen showed.
        const file = { total: parsed.grandTotal?.sl_gbt, passed: parsed.grandTotal?.sl_dung_qd };
        const portal = { total: summary.totalVolume, passed: summary.passedVolume };
        const differences = exactDifferences(file, portal);
        if (Object.keys(differences).length > 0) {
            throw serviceError(
                'F42_TCT_RECONCILIATION_FAILED',
                `F4.2 TCT file does not reconcile with the verified outer summary: ${describe(file, portal, differences)}.`,
                { file, portal, differences },
            );
        }
        return {
            rows: parsed.totalParsed,
            postmanRows: parsed.postmanRows,
            exportTotal: summary.exportTotal ?? null,
            ...file,
            notStored: parsed.notStored,
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
        throw serviceError('DOWNLOAD_NOT_STABLE', `F4.2 ${this.lane} download did not become stable before timeout.`);
    }
}

class F42HueSingleDateService extends F42SingleDateService {
    constructor(options = {}) { super('HUE', options); }
}

class F42TctSingleDateService extends F42SingleDateService {
    constructor(options = {}) { super('TCT', options); }
}

class F42PortalAdapter {
    constructor({ service }) {
        if (typeof service?.runOneDate !== 'function') throw new Error('F42 adapter requires service.runOneDate().');
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
    F42SingleDateService,
    F42HueSingleDateService,
    F42TctSingleDateService,
    F42HueAdapter: F42PortalAdapter,
    F42TctAdapter: F42PortalAdapter,
    standardizedFilename,
};
