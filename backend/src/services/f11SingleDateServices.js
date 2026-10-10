'use strict';

// F11-PHASE-3 - one-date Portal acquisition for F1.1 (toan trinh noi tinh), HUE and TCT lanes.
//
// Same shape and safety contract as F41HueSingleDateService / F41TctSingleDateService: exactly one
// indicator x lane x business date; open report -> verified outer summary -> export -> poll the
// portal's generated-file list -> download -> parse with the frozen parser -> RECONCILE the workbook
// with the summary -> standardized copy into Incoming -> shared Import pipeline -> cleanup of the
// portal-generated file. Nothing is accepted that does not reconcile.
//
// `importEnabled: false` is the supervised probe mode (probe_f11_single_date.js): everything up to and
// including the reconciliation runs, but nothing is copied into Incoming and no Import is executed.

const fs = require('node:fs');
const path = require('node:path');
const { executeImport } = require('./importPipeline');
const { getIndicatorConfig } = require('./importIndicatorRegistry');
const { parseF11HueExcel } = require('./f11HueExcelParser');
const { parseF11TctExcel } = require('./f11TctExcelParser');
const { F11_EXECUTOR_IDENTITIES } = require('./autoBackfillF11Contract');

const REQUIRED_PORTAL_METHODS = Object.freeze({
    HUE: Object.freeze([
        'openF11Report', 'submitF11HueFilters', 'readF11HueOuterSummary', 'requestF11HueExport',
        'pollGeneratedFile', 'downloadXlsx',
    ]),
    TCT: Object.freeze([
        'openF11Report', 'submitF11TctFilters', 'readF11TctOuterSummary', 'requestF11TctExport',
        'pollGeneratedFile', 'downloadXlsx',
    ]),
});

function serviceError(code, message, details = null) {
    const error = new Error(message);
    error.code = code;
    if (details) error.details = details;
    return error;
}

// Reconciliation of a workbook against the portal's outer summary (PO decision 2026-10-10): the total and the
// passed count must match exactly (they carry the dashboard rate); the evaluated / failed counts may differ by up
// to 2 % of the day's total (at least 5 parcels) because the portal counts a few parcels without a 2026 target
// time as evaluated while the detail leaves their evaluation blank (1-2 parcels on ~1,800 observed). Any such
// difference is reported, never silent.
const RECONCILIATION_TOLERANCE_RATE = 0.02;
const RECONCILIATION_TOLERANCE_MIN = 5;

function evaluateReconciliation(workbook, portal, keys) {
    const tolerance = Math.max(RECONCILIATION_TOLERANCE_MIN, Math.ceil((portal.total || 0) * RECONCILIATION_TOLERANCE_RATE));
    const differences = {};
    let blocking = false;
    for (const key of keys) {
        const delta = Number(workbook[key]) - Number(portal[key]);
        if (delta === 0) continue;
        differences[key] = delta;
        if (key === 'total' || key === 'passed' || Math.abs(delta) > tolerance) blocking = true;
    }
    return { ok: !blocking, differences, tolerance, exact: Object.keys(differences).length === 0 };
}

function describeReconciliation(workbook, portal, outcome) {
    return `workbook ${JSON.stringify(workbook)} vs portal summary ${JSON.stringify(portal)}, differences ${JSON.stringify(outcome.differences)}, tolerance ${outcome.tolerance}`;
}

function standardizedFilename(businessDate) {
    return `F1.1-${businessDate.replace(/-/g, '.')}.xlsx`;
}

function normalizeBusinessDate(value, lane) {
    const text = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        throw serviceError('INVALID_DATE', `F1.1 ${lane} business date must use YYYY-MM-DD.`);
    }
    return text;
}

const sum = (rows, column) => rows.reduce((total, row) => total + Number(row[column] || 0), 0);

class F11SingleDateService {
    constructor(lane, options = {}) {
        this.lane = lane;
        this.identity = F11_EXECUTOR_IDENTITIES[lane];
        this.executeImport = options.executeImport || executeImport;
        this.parser = options.parser || (lane === 'HUE' ? parseF11HueExcel : parseF11TctExcel);
        this.fs = options.fs || fs;
        this.path = options.path || path;
        this.clock = options.clock || (() => new Date());
        this.logger = options.logger || console;
        this.importEnabled = options.importEnabled !== false;
        const laneDir = lane.toLowerCase();
        this.config = {
            rawDownloadDir: options.rawDownloadDir || path.resolve(process.cwd(), `../portal-downloads/dkcl/${laneDir}/f11/raw`),
            generationTimeoutMs: options.generationTimeoutMs || Number(process.env.DKCL_HUE_GENERATION_TIMEOUT_MS || 900000),
            generationPollingIntervalMs: options.generationPollingIntervalMs || Number(process.env.DKCL_HUE_GENERATION_POLL_INTERVAL_MS || 30000),
            downloadStableTimeoutMs: options.downloadStableTimeoutMs || 120000,
        };
    }

    async runOneDate(businessDate, { portalClient, refreshRequested = false } = {}) {
        const lane = this.lane;
        const date = normalizeBusinessDate(businessDate, lane);
        for (const method of REQUIRED_PORTAL_METHODS[lane]) {
            if (typeof portalClient?.[method] !== 'function') {
                throw serviceError(`F11_${lane}_PORTAL_CLIENT_INCOMPLETE`, `F1.1 ${lane} requires portalClient.${method}().`);
            }
        }

        await portalClient.openF11Report();
        await (lane === 'HUE' ? portalClient.submitF11HueFilters({ businessDate: date }) : portalClient.submitF11TctFilters({ businessDate: date }));
        const summary = await (lane === 'HUE' ? portalClient.readF11HueOuterSummary() : portalClient.readF11TctOuterSummary());
        this.assertSummary(summary, portalClient, date);

        const requestedAt = this.clock();
        await (lane === 'HUE' ? portalClient.requestF11HueExport() : portalClient.requestF11TctExport());
        const generatedFile = await portalClient.pollGeneratedFile({
            requestedAt,
            timeoutMs: this.config.generationTimeoutMs,
            intervalMs: this.config.generationPollingIntervalMs,
            match: this.identity.generatedFileMatch,
        });
        if (!generatedFile) {
            throw serviceError('EXPORT_TIMEOUT', `Timed out waiting for the verified F1.1 ${lane} generated resource.`);
        }

        this.fs.mkdirSync(this.config.rawDownloadDir, { recursive: true });
        const downloadedPath = await portalClient.downloadXlsx({ file: generatedFile, targetDir: this.config.rawDownloadDir });
        const stablePath = await this.waitForStableFile(downloadedPath);
        const filename = standardizedFilename(date);
        const parsed = this.parser(this.fs.readFileSync(stablePath), filename);
        const figures = this.reconcile(parsed, summary);

        const result = {
            status: 'SUCCESS',
            indicator: 'F1.1',
            sourceLane: lane,
            businessDate: date,
            generatedPortalFilename: generatedFile.filename,
            downloadedPath: stablePath,
            standardizedFilename: filename,
            summary,
            ...figures,
        };
        if (!this.importEnabled) return { ...result, dryRun: true, importResult: null, cleanup: { status: 'SKIPPED_DRY_RUN' } };

        const indicator = getIndicatorConfig('F1.1');
        const incomingDir = this.path.join(indicator.incomingDir, lane);
        this.fs.mkdirSync(incomingDir, { recursive: true });
        const incomingPath = this.path.join(incomingDir, filename);
        if (this.fs.existsSync(incomingPath)) {
            throw serviceError('MANUAL_REVIEW_REQUIRED', `Standardized F1.1 ${lane} Incoming file already exists.`);
        }
        this.fs.copyFileSync(stablePath, incomingPath);

        const importResult = await this.executeImport({
            filePath: incomingPath,
            forceReimport: Boolean(refreshRequested),
            source: `AUTO_BACKFILL_F11_${lane}`,
            indicator: 'F1.1',
            lane,
        });
        if (importResult?.requiresConfirmation) {
            throw serviceError('MANUAL_REVIEW_REQUIRED', `F1.1 ${lane} Import requires confirmation for existing evidence.`, importResult);
        }
        if (!importResult?.success) {
            throw serviceError(`F11_${lane}_IMPORT_FAILED`, `F1.1 ${lane} Import did not report success.`, importResult);
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
        const checks = {
            totalVolume: { value: summary?.totalVolume, expected: 'integer > 0', ok: Number.isInteger(summary?.totalVolume) && summary.totalVolume > 0 },
            evaluatedVolume: { value: summary?.evaluatedVolume, expected: 'integer <= total', ok: Number.isInteger(summary?.evaluatedVolume) && summary.evaluatedVolume >= 0 && summary.evaluatedVolume <= (summary?.totalVolume || 0) },
            passedVolume: { value: summary?.passedVolume, expected: 'integer <= evaluated', ok: Number.isInteger(summary?.passedVolume) && summary.passedVolume >= 0 && summary.passedVolume <= (summary?.evaluatedVolume || 0) },
        };
        if (lane === 'HUE') {
            checks.detailIdentity = { value: summary?.detailIdentity, expected: this.identity.detailResourceIdentity, ok: summary?.detailIdentity === this.identity.detailResourceIdentity };
        } else {
            checks.exportIdentity = { value: summary?.exportIdentity, expected: this.identity.resourceIdentity, ok: summary?.exportIdentity === this.identity.resourceIdentity };
        }
        const failed = Object.entries(checks).filter(([, check]) => !check.ok).map(([name]) => name);
        if (failed.length > 0) {
            this.logger.warn?.(`[F11_${lane}_SUMMARY] outer summary rejected -- failed: [${failed.join(', ')}] -- details: ${JSON.stringify(checks)}`);
            if (typeof portalClient?.captureF41Diagnostics === 'function') {
                portalClient.captureF41Diagnostics({ businessDate, reason: `F11_${lane}_OUTER_SUMMARY_INVALID` }).catch(() => {});
            }
            throw serviceError(`F11_${lane}_OUTER_SUMMARY_INVALID`, `F1.1 ${lane} outer summary is incomplete or inconsistent (failed: ${failed.join(', ')}).`, { summary, checks });
        }
    }

    // The workbook must equal the verified outer summary figure by figure.
    reconcile(parsed, summary) {
        const rows = parsed.parsedData;
        if (this.lane === 'HUE') {
            const evaluated = rows.filter((row) => row.danh_gia_2026 !== null && row.danh_gia_2026 !== undefined).length;
            const passed = rows.filter((row) => row.danh_gia_2026 === 'Đạt').length;
            const failed = rows.filter((row) => row.danh_gia_2026 === 'Không đạt').length;
            const workbook = { total: parsed.totalParsed, evaluated, passed, failed };
            const portal = { total: summary.totalVolume, evaluated: summary.evaluatedVolume, passed: summary.passedVolume, failed: summary.failedVolume };
            const outcome = evaluateReconciliation(workbook, portal, ['total', 'evaluated', 'passed', 'failed']);
            if (!outcome.ok) {
                throw serviceError(
                    'F11_HUE_RECONCILIATION_FAILED',
                    `F1.1 HUE workbook does not reconcile with the verified outer summary: ${describeReconciliation(workbook, portal, outcome)}.`,
                    { workbook, portal, differences: outcome.differences, tolerance: outcome.tolerance },
                );
            }
            if (!outcome.exact) {
                this.logger.warn?.(`[F11_HUE_RECONCILIATION] accepted within tolerance: ${describeReconciliation(workbook, portal, outcome)}`);
            }
            return {
                total: parsed.totalParsed,
                evaluated,
                passed,
                failed,
                rate: parsed.totalParsed ? Number(((passed / parsed.totalParsed) * 100).toFixed(2)) : null,
                reconciliation: { exact: outcome.exact, differences: outcome.differences, tolerance: outcome.tolerance },
            };
        }
        const workbook = {
            total: sum(rows, 'sl_co_thong_tin_phat'),
            evaluated: sum(rows, 'sl_theo_chi_tieu'),
            passed: sum(rows, 'sl_dung_chi_tieu'),
        };
        const portal = { total: summary.totalVolume, evaluated: summary.evaluatedVolume, passed: summary.passedVolume };
        const outcome = evaluateReconciliation(workbook, portal, ['total', 'evaluated', 'passed']);
        if (!outcome.ok) {
            throw serviceError(
                'F11_TCT_RECONCILIATION_FAILED',
                `F1.1 TCT workbook does not reconcile with the verified outer summary: ${describeReconciliation(workbook, portal, outcome)}.`,
                { workbook, portal, differences: outcome.differences, tolerance: outcome.tolerance },
            );
        }
        if (!outcome.exact) {
            this.logger.warn?.(`[F11_TCT_RECONCILIATION] accepted within tolerance: ${describeReconciliation(workbook, portal, outcome)}`);
        }
        // `Total` of the export form was 85 = 84 province rows + the grand-total row on the observed day.
        return {
            rows: parsed.totalParsed,
            exportTotal: summary.exportTotal ?? null,
            ...workbook,
            reconciliation: { exact: outcome.exact, differences: outcome.differences, tolerance: outcome.tolerance },
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
        throw serviceError('DOWNLOAD_NOT_STABLE', `F1.1 ${this.lane} download did not become stable before timeout.`);
    }
}

class F11HueSingleDateService extends F11SingleDateService {
    constructor(options = {}) { super('HUE', options); }
}

class F11TctSingleDateService extends F11SingleDateService {
    constructor(options = {}) { super('TCT', options); }
}

class F11PortalAdapter {
    constructor({ service }) {
        if (typeof service?.runOneDate !== 'function') throw new Error('F11 adapter requires service.runOneDate().');
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
    F11SingleDateService,
    F11HueSingleDateService,
    F11TctSingleDateService,
    F11HueAdapter: F11PortalAdapter,
    F11TctAdapter: F11PortalAdapter,
    standardizedFilename,
};
