'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { executeImport } = require('./importPipeline');
const { getIndicatorConfig } = require('./importIndicatorRegistry');
const {
    parseF41TctExcel,
    F41_TCT_RATE_COLUMNS,
    EXPECTED_RAW_REPORTING_UNITS,
    EXPECTED_ACCEPTED_REPORTING_UNITS,
} = require('./f41TctExcelParser');
const { F41_EXECUTOR_IDENTITIES } = require('./autoBackfillF41Contract');
const { standardizedFilename } = require('./f41HueSingleDateService');

const REQUIRED_PORTAL_METHODS = Object.freeze([
    'openF41Report',
    'submitF41TctFilters',
    'readF41TctOuterSummary',
    'requestF41TctExport',
    'pollGeneratedFile',
    'downloadXlsx',
]);
const EXPECTED_EXCLUDED_CODES = Object.freeze(['01', '08', '11', '12', '14', '15', '34', '49', '71', '75', '77', '82']);

function serviceError(code, message, details = null) {
    const error = new Error(message);
    error.code = code;
    if (details) error.details = details;
    return error;
}

function normalizeBusinessDate(value) {
    const text = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        throw serviceError('INVALID_DATE', 'F4.1 TCT business date must use YYYY-MM-DD.');
    }
    return text;
}

function percentagesRemainText(parsedData) {
    return parsedData.every((row) => F41_TCT_RATE_COLUMNS.every((column) => (
        row[column] === null || (typeof row[column] === 'string' && row[column].endsWith('%'))
    )));
}

class F41TctSingleDateService {
    constructor(options = {}) {
        this.executeImport = options.executeImport || executeImport;
        this.parser = options.parser || parseF41TctExcel;
        this.fs = options.fs || fs;
        this.path = options.path || path;
        this.clock = options.clock || (() => new Date());
        this.logger = options.logger || console;
        this.config = {
            rawDownloadDir: options.rawDownloadDir || path.resolve(process.cwd(), '../portal-downloads/dkcl/tct/f41/raw'),
            generationTimeoutMs: options.generationTimeoutMs || Number(process.env.DKCL_TCT_GENERATION_TIMEOUT_MS || 900000),
            generationPollingIntervalMs: options.generationPollingIntervalMs || Number(process.env.DKCL_TCT_GENERATION_POLL_INTERVAL_MS || 30000),
            downloadStableTimeoutMs: options.downloadStableTimeoutMs || 120000,
        };
    }

    async runOneDate(businessDate, { portalClient, refreshRequested = false } = {}) {
        const date = normalizeBusinessDate(businessDate);
        if (refreshRequested) {
            throw serviceError('F41_TCT_FORCE_REIMPORT_FORBIDDEN', 'F4.1 TCT Auto Backfill never force-overwrites completed data.');
        }
        for (const method of REQUIRED_PORTAL_METHODS) {
            if (typeof portalClient?.[method] !== 'function') {
                throw serviceError('F41_TCT_PORTAL_CLIENT_INCOMPLETE', `F4.1 TCT requires portalClient.${method}().`);
            }
        }

        await portalClient.openF41Report();
        await portalClient.submitF41TctFilters({ businessDate: date });
        const summary = await portalClient.readF41TctOuterSummary();
        this.assertSummary(summary);

        const requestedAt = this.clock();
        await portalClient.requestF41TctExport();
        const generatedFile = await portalClient.pollGeneratedFile({
            requestedAt,
            timeoutMs: this.config.generationTimeoutMs,
            intervalMs: this.config.generationPollingIntervalMs,
            match: F41_EXECUTOR_IDENTITIES.TCT.generatedFileMatch,
        });
        if (!generatedFile) {
            throw serviceError('EXPORT_TIMEOUT', 'Timed out waiting for the verified F4.1 TCT generated resource.');
        }

        this.fs.mkdirSync(this.config.rawDownloadDir, { recursive: true });
        const downloadedPath = await portalClient.downloadXlsx({ file: generatedFile, targetDir: this.config.rawDownloadDir });
        const stablePath = await this.waitForStableFile(downloadedPath);
        const filename = standardizedFilename(date);
        const parsed = this.parser(this.fs.readFileSync(stablePath), filename);
        const excludedCodes = parsed.excludedRows.map((row) => row.ma_don_vi);
        if (parsed.rawReportingRows !== EXPECTED_RAW_REPORTING_UNITS
            || parsed.acceptedRows !== EXPECTED_ACCEPTED_REPORTING_UNITS
            || parsed.excludedRowsCount !== EXPECTED_RAW_REPORTING_UNITS - EXPECTED_ACCEPTED_REPORTING_UNITS
            || JSON.stringify(excludedCodes) !== JSON.stringify(EXPECTED_EXCLUDED_CODES)
            || !percentagesRemainText(parsed.parsedData)) {
            throw serviceError('F41_TCT_RECONCILIATION_FAILED', 'F4.1 TCT workbook does not satisfy the frozen population contract.', {
                rawReportingRows: parsed.rawReportingRows,
                acceptedRows: parsed.acceptedRows,
                excludedRowsCount: parsed.excludedRowsCount,
                excludedCodes,
            });
        }

        const indicator = getIndicatorConfig('F4.1');
        const incomingDir = this.path.join(indicator.incomingDir, 'TCT');
        this.fs.mkdirSync(incomingDir, { recursive: true });
        const incomingPath = this.path.join(incomingDir, filename);
        if (this.fs.existsSync(incomingPath)) {
            throw serviceError('MANUAL_REVIEW_REQUIRED', 'Standardized F4.1 TCT Incoming file already exists.');
        }
        this.fs.copyFileSync(stablePath, incomingPath);

        const importResult = await this.executeImport({
            filePath: incomingPath,
            forceReimport: false,
            source: 'AUTO_BACKFILL_F41_TCT',
            indicator: 'F4.1',
            lane: 'TCT',
        });
        if (importResult?.requiresConfirmation) {
            throw serviceError('MANUAL_REVIEW_REQUIRED', 'F4.1 TCT Import requires confirmation for existing evidence.', importResult);
        }
        if (!importResult?.success) {
            throw serviceError('F41_TCT_IMPORT_FAILED', 'F4.1 TCT Import did not report success.', importResult);
        }

        let cleanup = { status: 'NOT_SUPPORTED' };
        if (typeof portalClient.deleteGeneratedFile === 'function') {
            try {
                cleanup = await portalClient.deleteGeneratedFile(generatedFile);
            } catch (error) {
                cleanup = { status: 'FAILED', warning: error.message };
            }
        }
        return {
            status: 'SUCCESS',
            indicator: 'F4.1',
            sourceLane: 'TCT',
            businessDate: date,
            generatedPortalFilename: generatedFile.filename,
            standardizedFilename: filename,
            processedPath: importResult.processedPath || null,
            rawReportingRows: parsed.rawReportingRows,
            acceptedRows: parsed.acceptedRows,
            excludedRowsCount: parsed.excludedRowsCount,
            importResult,
            cleanup,
        };
    }

    // Same follow-up as F41HueSingleDateService.assertSummary(): log which condition actually
    // failed, with the real values read from the portal page, before throwing -- so a future
    // occurrence is diagnosable from the log alone.
    assertSummary(summary) {
        const checks = {
            outerRowCount: { value: summary?.outerRowCount, expected: 47, ok: summary?.outerRowCount === 47 },
            exportIdentity: { value: summary?.exportIdentity, expected: F41_EXECUTOR_IDENTITIES.TCT.resourceIdentity, ok: summary?.exportIdentity === F41_EXECUTOR_IDENTITIES.TCT.resourceIdentity },
        };
        const failedChecks = Object.entries(checks).filter(([, check]) => !check.ok).map(([name]) => name);
        if (failedChecks.length > 0) {
            this.logger.warn?.(`[F41_TCT_SUMMARY] outer summary rejected -- failed: [${failedChecks.join(', ')}] -- details: ${JSON.stringify(checks)}`);
            throw serviceError('F41_TCT_OUTER_SUMMARY_INVALID', `F4.1 TCT outer summary is incomplete or inconsistent (failed: ${failedChecks.join(', ')}).`, { summary, checks });
        }
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
        throw serviceError('DOWNLOAD_NOT_STABLE', 'F4.1 TCT download did not become stable before timeout.');
    }
}

module.exports = {
    F41TctSingleDateService,
    percentagesRemainText,
    EXPECTED_EXCLUDED_CODES,
};
