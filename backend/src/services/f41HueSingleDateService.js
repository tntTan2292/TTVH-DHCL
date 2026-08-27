'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { executeImport } = require('./importPipeline');
const { getIndicatorConfig } = require('./importIndicatorRegistry');
const { parseF41HueExcel } = require('./f41HueExcelParser');
const { F41_EXECUTOR_IDENTITIES } = require('./autoBackfillF41Contract');
const { REQUIRED_HUE_BCVH_CODES, findMissingRequiredCodes } = require('./f41RequiredUnits');

const REQUIRED_PORTAL_METHODS = Object.freeze([
    'openF41Report',
    'submitF41HueFilters',
    'readF41HueOuterSummary',
    'requestF41HueExport',
    'pollGeneratedFile',
    'downloadXlsx',
]);

function serviceError(code, message, details = null) {
    const error = new Error(message);
    error.code = code;
    if (details) error.details = details;
    return error;
}

function normalizeBusinessDate(value) {
    const text = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        throw serviceError('INVALID_DATE', 'F4.1 HUE business date must use YYYY-MM-DD.');
    }
    return text;
}

function standardizedFilename(businessDate) {
    return `F4.1-${businessDate.replace(/-/g, '.')}.xlsx`;
}

function normalizeRate(value) {
    const number = Number(String(value ?? '').replace('%', '').replace(',', '.').trim());
    return Number.isFinite(number) ? Number(number.toFixed(2)) : null;
}

class F41HueSingleDateService {
    constructor(options = {}) {
        this.executeImport = options.executeImport || executeImport;
        this.parser = options.parser || parseF41HueExcel;
        this.fs = options.fs || fs;
        this.path = options.path || path;
        this.clock = options.clock || (() => new Date());
        this.logger = options.logger || console;
        this.config = {
            rawDownloadDir: options.rawDownloadDir || path.resolve(process.cwd(), '../portal-downloads/dkcl/hue/f41/raw'),
            generationTimeoutMs: options.generationTimeoutMs || Number(process.env.DKCL_HUE_GENERATION_TIMEOUT_MS || 900000),
            generationPollingIntervalMs: options.generationPollingIntervalMs || Number(process.env.DKCL_HUE_GENERATION_POLL_INTERVAL_MS || 30000),
            downloadStableTimeoutMs: options.downloadStableTimeoutMs || 120000,
        };
    }

    async runOneDate(businessDate, { portalClient, refreshRequested = false } = {}) {
        const date = normalizeBusinessDate(businessDate);
        if (refreshRequested) {
            throw serviceError('F41_HUE_FORCE_REIMPORT_FORBIDDEN', 'F4.1 HUE Auto Backfill never force-overwrites completed data.');
        }
        for (const method of REQUIRED_PORTAL_METHODS) {
            if (typeof portalClient?.[method] !== 'function') {
                throw serviceError('F41_HUE_PORTAL_CLIENT_INCOMPLETE', `F4.1 HUE requires portalClient.${method}().`);
            }
        }

        await portalClient.openF41Report();
        await portalClient.submitF41HueFilters({ businessDate: date });
        const summary = await portalClient.readF41HueOuterSummary();
        this.assertSummary(summary, portalClient, date);

        const requestedAt = this.clock();
        await portalClient.requestF41HueExport();
        const generatedFile = await portalClient.pollGeneratedFile({
            requestedAt,
            timeoutMs: this.config.generationTimeoutMs,
            intervalMs: this.config.generationPollingIntervalMs,
            // AB-AUTH-17: was `resourceIdentity` (a stored-procedure name), which can never appear
            // in a generated filename. Now the detail report's filename slug, matching how F1.3 and
            // F4.1 TCT already poll.
            match: F41_EXECUTOR_IDENTITIES.HUE.generatedFileMatch,
        });
        if (!generatedFile) {
            throw serviceError('EXPORT_TIMEOUT', 'Timed out waiting for the verified F4.1 HUE generated resource.');
        }

        this.fs.mkdirSync(this.config.rawDownloadDir, { recursive: true });
        const downloadedPath = await portalClient.downloadXlsx({ file: generatedFile, targetDir: this.config.rawDownloadDir });
        const stablePath = await this.waitForStableFile(downloadedPath);
        const filename = standardizedFilename(date);
        const parsed = this.parser(this.fs.readFileSync(stablePath), filename);
        const passed = parsed.parsedData.filter((row) => row.danh_gia_co_tms_ptc_8h === 'Đạt').length;
        const rate = parsed.totalParsed > 0 ? Number(((passed / parsed.totalParsed) * 100).toFixed(2)) : null;
        if (parsed.totalParsed !== summary.totalVolume || passed !== summary.passedVolume || rate !== normalizeRate(summary.rate)) {
            throw serviceError('F41_HUE_RECONCILIATION_FAILED', 'F4.1 HUE workbook does not reconcile with the verified outer summary.', {
                workbook: { total: parsed.totalParsed, passed, rate },
                portal: summary,
            });
        }

        const indicator = getIndicatorConfig('F4.1');
        const incomingDir = this.path.join(indicator.incomingDir, 'HUE');
        this.fs.mkdirSync(incomingDir, { recursive: true });
        const incomingPath = this.path.join(incomingDir, filename);
        if (this.fs.existsSync(incomingPath)) {
            throw serviceError('MANUAL_REVIEW_REQUIRED', 'Standardized F4.1 HUE Incoming file already exists.');
        }
        this.fs.copyFileSync(stablePath, incomingPath);

        const importResult = await this.executeImport({
            filePath: incomingPath,
            forceReimport: false,
            source: 'AUTO_BACKFILL_F41_HUE',
            indicator: 'F4.1',
            lane: 'HUE',
        });
        if (importResult?.requiresConfirmation) {
            throw serviceError('MANUAL_REVIEW_REQUIRED', 'F4.1 HUE Import requires confirmation for existing evidence.', importResult);
        }
        if (!importResult?.success) {
            throw serviceError('F41_HUE_IMPORT_FAILED', 'F4.1 HUE Import did not report success.', importResult);
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
            sourceLane: 'HUE',
            businessDate: date,
            generatedPortalFilename: generatedFile.filename,
            standardizedFilename: filename,
            processedPath: importResult.processedPath || null,
            total: parsed.totalParsed,
            passed,
            rate,
            importResult,
            cleanup,
        };
    }

    // Follow-up requested after run 208e49c4 (F4.1/HUE 23/08) failed with
    // F41_HUE_OUTER_SUMMARY_INVALID and there was no record of which of the 6 OR-ed conditions
    // actually fired -- the DB only ever stored the error code and a hash, not the values read
    // from the portal page. This logs every condition and its real value BEFORE throwing, so the
    // next occurrence is diagnosable from the log alone instead of requiring guesswork.
    //
    // DIAGNOSTIC-TEMP (AB-AUTH-09): `portalClient`/`businessDate` are optional and additive --
    // every existing call site that only ever passed `summary` keeps working unchanged. When
    // provided and the summary is rejected, fires (but does not await) a best-effort real-page
    // screenshot + HTML capture via portalClient.captureF41Diagnostics() before throwing --
    // deliberately not awaited so this method stays synchronous (existing callers use
    // `assert.throws(() => service.assertSummary(...))`), and deliberately swallowed so a capture
    // failure can never mask or delay the real validation error.
    assertSummary(summary, portalClient = null, businessDate = null) {
        const computedRate = Number.isInteger(summary?.totalVolume) && summary.totalVolume > 0
            ? Number(((summary.passedVolume / summary.totalVolume) * 100).toFixed(2))
            : null;
        // AB-AUTH-16: completeness is "all 6 canonical BCVH units reported", not "exactly 9 rows".
        // A province-total line, a retired code such as 531120, or any non-fixed unit may appear or
        // vanish day to day without that being a data defect -- see f41RequiredUnits.js.
        const missingUnits = findMissingRequiredCodes(REQUIRED_HUE_BCVH_CODES, summary?.unitCodes);
        const checks = {
            requiredUnits: {
                value: missingUnits.length > 0 ? `missing ${missingUnits.join(', ')}` : 'all present',
                observedUnitCount: summary?.unitCount,
                expected: `all ${REQUIRED_HUE_BCVH_CODES.length} canonical BCVH codes present`,
                ok: missingUnits.length === 0
            },
            totalVolume: { value: summary?.totalVolume, expected: 'integer > 0', ok: Number.isInteger(summary?.totalVolume) && summary.totalVolume > 0 },
            passedVolume: { value: summary?.passedVolume, expected: 'integer', ok: Number.isInteger(summary?.passedVolume) },
            rate: { value: summary?.rate, normalized: normalizeRate(summary?.rate), expected: computedRate, ok: normalizeRate(summary?.rate) === computedRate },
            exportIdentity: { value: summary?.exportIdentity, expected: F41_EXECUTOR_IDENTITIES.HUE.resourceIdentity, ok: summary?.exportIdentity === F41_EXECUTOR_IDENTITIES.HUE.resourceIdentity },
        };
        const failedChecks = Object.entries(checks).filter(([, check]) => !check.ok).map(([name]) => name);
        if (failedChecks.length > 0) {
            this.logger.warn?.(`[F41_HUE_SUMMARY] outer summary rejected -- failed: [${failedChecks.join(', ')}] -- details: ${JSON.stringify(checks)}`);
            if (typeof portalClient?.captureF41Diagnostics === 'function') {
                portalClient.captureF41Diagnostics({ businessDate, reason: 'OUTER_SUMMARY_INVALID' }).catch(() => {});
            }
            throw serviceError('F41_HUE_OUTER_SUMMARY_INVALID', `F4.1 HUE outer summary is incomplete or inconsistent (failed: ${failedChecks.join(', ')}).`, { summary, checks });
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
        throw serviceError('DOWNLOAD_NOT_STABLE', 'F4.1 HUE download did not become stable before timeout.');
    }
}

module.exports = {
    F41HueSingleDateService,
    normalizeRate,
    standardizedFilename,
};
