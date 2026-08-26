'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { executeImport } = require('./importPipeline');
const { getIndicatorConfig } = require('./importIndicatorRegistry');
const {
    parseF41TctExcel,
    F41_TCT_RATE_COLUMNS,
} = require('./f41TctExcelParser');
const { REQUIRED_TCT_PROVINCE_CODES, findMissingRequiredCodes } = require('./f41RequiredUnits');
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
// AB-AUTH-16: retained as a documented reference of the units observed on the original sample day
// and still exported for callers that report on it, but NO LONGER an acceptance gate -- which
// units fall outside the ranked population varies legitimately from day to day.
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
        this.assertSummary(summary, portalClient, date);

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
        // AB-AUTH-16: the workbook must carry every nationally-ranked province, and percentages must
        // still be preserved as TEXT. The raw/accepted/excluded totals and the exact excluded-code
        // list are reported for diagnostics but no longer gate acceptance: which non-ranked units
        // happen to report on a given day is not a property of workbook validity.
        const missingProvinces = findMissingRequiredCodes(
            REQUIRED_TCT_PROVINCE_CODES,
            parsed.parsedData.map((row) => row.ma_don_vi)
        );
        if (missingProvinces.length > 0 || !percentagesRemainText(parsed.parsedData)) {
            throw serviceError('F41_TCT_RECONCILIATION_FAILED', 'F4.1 TCT workbook does not satisfy the frozen population contract.', {
                missingProvinces,
                percentagesRemainText: percentagesRemainText(parsed.parsedData),
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
    //
    // DIAGNOSTIC-TEMP (AB-AUTH-09): `portalClient`/`businessDate` are optional and additive --
    // see the identical note on F41HueSingleDateService.assertSummary(). Deliberately not
    // awaited (stays synchronous) and deliberately swallowed (a capture failure can never mask
    // or delay the real validation error).
    assertSummary(summary, portalClient = null, businessDate = null) {
        // AB-AUTH-16: completeness is "all 34 nationally-ranked provinces reported", not "exactly
        // 47 rows". Non-ranked units (EMS, Từ Liêm, ...) and the grand-total line come and go
        // legitimately -- see f41RequiredUnits.js.
        const missingProvinces = findMissingRequiredCodes(REQUIRED_TCT_PROVINCE_CODES, summary?.provinceCodes);
        const checks = {
            requiredProvinces: {
                value: missingProvinces.length > 0 ? `missing ${missingProvinces.join(', ')}` : 'all present',
                observedOuterRowCount: summary?.outerRowCount,
                expected: `all ${REQUIRED_TCT_PROVINCE_CODES.length} nationally-ranked province codes present`,
                ok: missingProvinces.length === 0
            },
            exportIdentity: { value: summary?.exportIdentity, expected: F41_EXECUTOR_IDENTITIES.TCT.resourceIdentity, ok: summary?.exportIdentity === F41_EXECUTOR_IDENTITIES.TCT.resourceIdentity },
        };
        const failedChecks = Object.entries(checks).filter(([, check]) => !check.ok).map(([name]) => name);
        if (failedChecks.length > 0) {
            this.logger.warn?.(`[F41_TCT_SUMMARY] outer summary rejected -- failed: [${failedChecks.join(', ')}] -- details: ${JSON.stringify(checks)}`);
            if (typeof portalClient?.captureF41Diagnostics === 'function') {
                portalClient.captureF41Diagnostics({ businessDate, reason: 'OUTER_SUMMARY_INVALID' }).catch(() => {});
            }
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
