'use strict';

const path = require('path');
const { extractDateFromFilename, parseF13Excel } = require('./excelParser');
const { parseF13NationalExcel } = require('./nationalExcelParser');
const { extractF41DateFromFilename, parseF41HueExcel } = require('./f41HueExcelParser');
const { parseF41TctExcel } = require('./f41TctExcelParser');
const { createSqliteImportCompletionPolicy, assertSqlIdentifier } = require('./autoBackfillCompletionPolicies');
const { F13_EXECUTOR_IDENTITIES } = require('./autoBackfillF13Contract');

const REGISTRY_VERSION = 'AUTO-BACKFILL-F13-1';
const BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh';
const TRACKING_START_DATE = '2026-01-01';
const INDICATOR_STATUSES = new Set(['ACTIVE', 'PLANNED', 'PAUSED', 'RETIRED']);
const AUTOMATION_MODES = new Set(['AUTOMATED', 'MANUAL_ONLY', 'DISABLED']);
const SUPPORTED_LANES = new Set(['HUE', 'TCT']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const DEFAULT_RETRY_POLICY = Object.freeze({
    maxAttempts: 3,
    strategy: 'BOUNDED_EXPONENTIAL',
    initialDelayMs: 2000,
    maxDelayMs: 30000,
    retryableClasses: Object.freeze(['PORTAL_TRANSIENT', 'LOCAL_SYSTEM']),
    terminalClasses: Object.freeze(['DATE_DATA', 'AUTH', 'PORTAL_SYSTEMIC', 'INTEGRITY_FATAL']),
});

const DEFAULT_PERMISSIONS = Object.freeze({
    coverageReadRoles: Object.freeze(['admin']),
    runControlRoles: Object.freeze(['admin']),
    retryRoles: Object.freeze(['admin']),
    auditReadRoles: Object.freeze(['admin']),
});

function createFilenameDateRule({ id, prefix, parse }) {
    return Object.freeze({
        id,
        parse,
        format(businessDate) {
            assertIsoDate(businessDate, 'businessDate');
            return `${prefix}-${businessDate.replace(/-/g, '.')}.xlsx`;
        },
    });
}

function createLane({
    code,
    priority,
    parser,
    targetTable,
    distinctColumn,
    expectedRowCount = null,
    automationMode = 'MANUAL_ONLY',
    manualOnlyReason,
    portalAdapter = null,
}) {
    return {
        code,
        priority,
        parser,
        targetTable,
        completionPolicy: createSqliteImportCompletionPolicy({
            id: `${targetTable.toUpperCase()}_IMPORT_ARTIFACT_V1`,
            distinctColumn,
            expectedRowCount,
        }),
        automationMode,
        manualOnlyReason,
        portalAdapter,
        permissions: DEFAULT_PERMISSIONS,
        retryPolicy: DEFAULT_RETRY_POLICY,
        circuitScope: {
            dimensions: ['adapter', 'source', 'resource'],
            threshold: 5,
            sameSignatureConsecutive: true,
            integrityFailureStopsImmediately: true,
        },
    };
}

const F13_FILENAME_DATE_RULE = createFilenameDateRule({
    id: 'F13_DOTTED_ISO_DATE',
    prefix: 'F1.3',
    parse: extractDateFromFilename,
});
const F41_FILENAME_DATE_RULE = createFilenameDateRule({
    id: 'F41_DOTTED_ISO_DATE',
    prefix: 'F4.1',
    parse: extractF41DateFromFilename,
});

const INDICATORS = {
    'F1.3': {
        code: 'F1.3',
        key: 'F1.3',
        name: 'F1.3 - Chat luong phat buu gui lien tinh',
        status: 'ACTIVE',
        priority: 10,
        trackingStartDate: TRACKING_START_DATE,
        businessTimezone: BUSINESS_TIMEZONE,
        folder: 'F1.3',
        filenamePattern: /^F1\.3-\d{4}\.\d{2}\.\d{2}\.xlsx$/i,
        filenameDateRule: F13_FILENAME_DATE_RULE,
        extractDate: F13_FILENAME_DATE_RULE.parse,
        formatFilename: F13_FILENAME_DATE_RULE.format,
        testDataRoot: { env: 'QIS_TEST_DATA_ROOT' },
        lanes: {
            HUE: createLane({
                code: 'HUE',
                priority: 10,
                parser: (buffer) => parseF13Excel(buffer),
                targetTable: 'fact_f13',
                distinctColumn: 'ma_bg',
                automationMode: 'AUTOMATED',
                portalAdapter: {
                    ...F13_EXECUTOR_IDENTITIES.HUE,
                    verified: true,
                },
            }),
            TCT: createLane({
                code: 'TCT',
                priority: 20,
                parser: (buffer) => parseF13NationalExcel(buffer),
                targetTable: 'fact_f13_national',
                distinctColumn: 'ma_tinh_phat',
                expectedRowCount: 34,
                automationMode: 'AUTOMATED',
                portalAdapter: {
                    ...F13_EXECUTOR_IDENTITIES.TCT,
                    verified: true,
                },
            }),
        },
    },
    'F4.1': {
        code: 'F4.1',
        key: 'F4.1',
        name: 'F4.1 - Chat luong phat thanh cong cua buu cuc',
        status: 'ACTIVE',
        priority: 20,
        trackingStartDate: TRACKING_START_DATE,
        businessTimezone: BUSINESS_TIMEZONE,
        folder: 'F4.1',
        filenamePattern: /^F4\.1-\d{4}\.\d{2}\.\d{2}\.xlsx$/i,
        filenameDateRule: F41_FILENAME_DATE_RULE,
        extractDate: F41_FILENAME_DATE_RULE.parse,
        formatFilename: F41_FILENAME_DATE_RULE.format,
        testDataRoot: {
            env: 'QIS_TEST_DATA_ROOT_F41',
            fallbackEnv: 'QIS_TEST_DATA_ROOT',
            fallbackSibling: 'F4.1',
        },
        lanes: {
            HUE: createLane({
                code: 'HUE',
                priority: 10,
                parser: (buffer, filename) => parseF41HueExcel(buffer, filename),
                targetTable: 'fact_f41',
                distinctColumn: 'ma_bg',
                manualOnlyReason: 'PORTAL_ADAPTER_NOT_VERIFIED',
            }),
            TCT: createLane({
                code: 'TCT',
                priority: 20,
                parser: (buffer, filename) => parseF41TctExcel(buffer, filename),
                targetTable: 'fact_f41_national',
                distinctColumn: 'ma_don_vi',
                expectedRowCount: 34,
                manualOnlyReason: 'PORTAL_ADAPTER_NOT_VERIFIED',
            }),
        },
    },
};

const operationalDataBase = path.resolve(process.cwd(), '../Data DKCL');
const operationalDataRoot = path.join(operationalDataBase, 'F1.3');
const configuredTestDataRoot = process.env.QIS_TEST_DATA_ROOT
    ? path.resolve(process.env.QIS_TEST_DATA_ROOT)
    : null;
const configuredF41TestDataRoot = process.env.QIS_TEST_DATA_ROOT_F41
    ? path.resolve(process.env.QIS_TEST_DATA_ROOT_F41)
    : null;

function assertIsoDate(value, fieldName) {
    const text = String(value || '');
    const parts = text.split('-').map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    if (!ISO_DATE.test(text)
        || date.getUTCFullYear() !== parts[0]
        || date.getUTCMonth() !== parts[1] - 1
        || date.getUTCDate() !== parts[2]) {
        throw new Error(`${fieldName} must be an ISO business date.`);
    }
}

function assertRoleList(value, fieldName) {
    if (!Array.isArray(value) || value.length === 0 || value.some((role) => !String(role || '').trim())) {
        throw new Error(`${fieldName} must contain at least one role.`);
    }
}

function validateIndicatorRegistration(indicator, registryKey = indicator?.code) {
    if (!indicator || typeof indicator !== 'object') throw new Error('Indicator registration must be an object.');
    if (!indicator.code || indicator.code !== registryKey) throw new Error(`Indicator code must match registry key '${registryKey}'.`);
    if (!indicator.name || typeof indicator.name !== 'string') throw new Error(`${indicator.code}.name is required.`);
    if (!INDICATOR_STATUSES.has(indicator.status)) throw new Error(`${indicator.code}.status is invalid.`);
    if (!Number.isInteger(indicator.priority)) throw new Error(`${indicator.code}.priority must be an integer.`);
    assertIsoDate(indicator.trackingStartDate, `${indicator.code}.trackingStartDate`);
    if (indicator.businessTimezone !== BUSINESS_TIMEZONE) {
        throw new Error(`${indicator.code}.businessTimezone must be ${BUSINESS_TIMEZONE}.`);
    }
    if (!indicator.folder || !(indicator.filenamePattern instanceof RegExp)) {
        throw new Error(`${indicator.code} must declare folder and filenamePattern.`);
    }
    if (typeof indicator.filenameDateRule?.parse !== 'function' || typeof indicator.filenameDateRule?.format !== 'function') {
        throw new Error(`${indicator.code}.filenameDateRule must declare parse and format.`);
    }
    if (!indicator.lanes || Object.keys(indicator.lanes).length === 0) {
        throw new Error(`${indicator.code}.lanes must not be empty.`);
    }

    for (const [laneKey, lane] of Object.entries(indicator.lanes)) {
        if (!SUPPORTED_LANES.has(laneKey) || lane.code !== laneKey) {
            throw new Error(`${indicator.code}.${laneKey} is not a supported source lane.`);
        }
        if (!Number.isInteger(lane.priority)) throw new Error(`${indicator.code}.${laneKey}.priority must be an integer.`);
        if (typeof lane.parser !== 'function') throw new Error(`${indicator.code}.${laneKey}.parser is required.`);
        assertSqlIdentifier(lane.targetTable, `${indicator.code}.${laneKey}.targetTable`);
        if (!lane.completionPolicy?.id || typeof lane.completionPolicy.evaluate !== 'function') {
            throw new Error(`${indicator.code}.${laneKey}.completionPolicy is required.`);
        }
        if (!AUTOMATION_MODES.has(lane.automationMode)) {
            throw new Error(`${indicator.code}.${laneKey}.automationMode is invalid.`);
        }
        if (lane.automationMode === 'AUTOMATED' && !lane.portalAdapter?.verified) {
            throw new Error(`${indicator.code}.${laneKey} cannot be AUTOMATED without a verified Portal adapter.`);
        }
        if (lane.automationMode === 'AUTOMATED'
            && (!lane.portalAdapter.id || !lane.portalAdapter.reportIdentity || !lane.portalAdapter.resourceIdentity)) {
            throw new Error(`${indicator.code}.${laneKey} AUTOMATED adapter identity is incomplete.`);
        }
        if (lane.automationMode === 'MANUAL_ONLY' && lane.portalAdapter) {
            throw new Error(`${indicator.code}.${laneKey} MANUAL_ONLY registration cannot expose a Portal adapter.`);
        }
        if (lane.automationMode === 'MANUAL_ONLY' && !lane.manualOnlyReason) {
            throw new Error(`${indicator.code}.${laneKey}.manualOnlyReason is required.`);
        }
        for (const permissionField of ['coverageReadRoles', 'runControlRoles', 'retryRoles', 'auditReadRoles']) {
            assertRoleList(lane.permissions?.[permissionField], `${indicator.code}.${laneKey}.permissions.${permissionField}`);
        }
        if (lane.retryPolicy?.maxAttempts !== 3 || lane.retryPolicy?.strategy !== 'BOUNDED_EXPONENTIAL') {
            throw new Error(`${indicator.code}.${laneKey}.retryPolicy must use the approved bounded three-attempt policy.`);
        }
        if (lane.permissions.runControlRoles.some((role) => String(role).toLowerCase() !== 'admin')
            || lane.permissions.retryRoles.some((role) => String(role).toLowerCase() !== 'admin')) {
            throw new Error(`${indicator.code}.${laneKey} run control and retry must be admin-only.`);
        }
        if (lane.circuitScope?.dimensions?.join('|') !== 'adapter|source|resource'
            || lane.circuitScope?.threshold !== 5
            || !lane.circuitScope?.sameSignatureConsecutive
            || !lane.circuitScope?.integrityFailureStopsImmediately) {
            throw new Error(`${indicator.code}.${laneKey}.circuitScope does not match the approved safety contract.`);
        }
    }

    return indicator;
}

function validateIndicatorRegistry(registry = INDICATORS) {
    for (const [key, indicator] of Object.entries(registry)) validateIndicatorRegistration(indicator, key);
    return registry;
}

function normalizeIndicator(indicator = 'F1.3') {
    const key = String(indicator || 'F1.3').toUpperCase();
    if (!INDICATORS[key]) throw new Error(`Unsupported Import indicator '${indicator}'.`);
    return key;
}

function normalizeLane(lane = 'HUE') {
    const key = String(lane || 'HUE').toUpperCase();
    if (!SUPPORTED_LANES.has(key)) throw new Error(`Unsupported Import lane '${lane}'.`);
    return key;
}

function getOperationalRoot(indicator) {
    return path.join(operationalDataBase, INDICATORS[indicator].folder);
}

function getTestRoot(indicator) {
    const config = INDICATORS[indicator].testDataRoot || {};
    const direct = config.env && process.env[config.env];
    if (direct) return path.resolve(direct);
    const fallback = config.fallbackEnv && process.env[config.fallbackEnv];
    if (fallback && config.fallbackSibling) {
        return path.join(path.dirname(path.resolve(fallback)), config.fallbackSibling);
    }
    return null;
}

function assertImportRootsSafe() {
    if (process.env.NODE_ENV !== 'test') return;
    for (const indicator of Object.keys(INDICATORS)) {
        const testRoot = getTestRoot(indicator);
        const operationalRoot = getOperationalRoot(indicator);
        if (!testRoot) throw new Error(`NODE_ENV=test requires an isolated Import sandbox directory for ${indicator}.`);
        if (path.resolve(testRoot) === path.resolve(operationalRoot)) {
            throw new Error(`Test Import root for ${indicator} must not resolve to the operational Data DKCL/${indicator} directory.`);
        }
    }
}

validateIndicatorRegistry();
assertImportRootsSafe();

function getIndicatorConfig(indicator = 'F1.3') {
    const key = normalizeIndicator(indicator);
    const root = process.env.NODE_ENV === 'test' ? getTestRoot(key) : getOperationalRoot(key);
    return {
        ...INDICATORS[key],
        root,
        incomingDir: path.join(root, 'Incoming'),
        processingDir: path.join(root, 'Processing'),
        processedDir: path.join(root, 'Processed'),
        errorDir: path.join(root, 'Error'),
        quarantineDir: path.join(root, 'Quarantine'),
    };
}

function getLaneConfig(indicator = 'F1.3', lane = 'HUE') {
    const indicatorConfig = getIndicatorConfig(indicator);
    const laneKey = normalizeLane(lane);
    if (!indicatorConfig.lanes[laneKey]) {
        throw new Error(`Import lane '${laneKey}' is not registered for ${indicatorConfig.code}.`);
    }
    return {
        ...indicatorConfig.lanes[laneKey],
        indicator: indicatorConfig.key,
        lane: laneKey,
        indicatorConfig,
    };
}

function listIndicatorConfigs() {
    return Object.keys(INDICATORS).map(getIndicatorConfig);
}

function getWatchIncomingDirs() {
    return listIndicatorConfigs().map((indicator) => indicator.incomingDir);
}

function resolveContextFromFilePath(filePath, explicit = {}) {
    const explicitIndicator = explicit.indicator ? normalizeIndicator(explicit.indicator) : null;
    const candidates = explicitIndicator ? [getIndicatorConfig(explicitIndicator)] : listIndicatorConfigs();
    const resolvedPath = path.resolve(filePath);

    for (const indicatorConfig of candidates) {
        const relative = path.relative(indicatorConfig.incomingDir, path.dirname(resolvedPath));
        if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
            const laneFromPath = relative.split(path.sep)[0] || 'HUE';
            const lane = explicit.lane ? normalizeLane(explicit.lane) : normalizeLane(laneFromPath);
            return { indicatorConfig, laneConfig: getLaneConfig(indicatorConfig.key, lane), relativePath: lane };
        }
    }

    const indicatorConfig = getIndicatorConfig(explicitIndicator || 'F1.3');
    const lane = normalizeLane(explicit.lane || 'HUE');
    return { indicatorConfig, laneConfig: getLaneConfig(indicatorConfig.key, lane), relativePath: lane };
}

module.exports = {
    REGISTRY_VERSION,
    BUSINESS_TIMEZONE,
    TRACKING_START_DATE,
    DEFAULT_RETRY_POLICY,
    DEFAULT_PERMISSIONS,
    INDICATORS,
    createFilenameDateRule,
    validateIndicatorRegistration,
    validateIndicatorRegistry,
    normalizeIndicator,
    normalizeLane,
    getIndicatorConfig,
    getLaneConfig,
    listIndicatorConfigs,
    getWatchIncomingDirs,
    resolveContextFromFilePath,
    operationalDataRoot,
    configuredTestDataRoot,
    configuredF41TestDataRoot,
};
