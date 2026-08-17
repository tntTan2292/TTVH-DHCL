'use strict';

const path = require('path');
const { extractDateFromFilename, parseF13Excel } = require('./excelParser');
const { parseF13NationalExcel } = require('./nationalExcelParser');
const { extractF41DateFromFilename, parseF41HueExcel } = require('./f41HueExcelParser');
const { parseF41TctExcel } = require('./f41TctExcelParser');

const INDICATORS = {
    'F1.3': {
        key: 'F1.3',
        folder: 'F1.3',
        filenamePattern: /^F1\.3-\d{4}\.\d{2}\.\d{2}\.xlsx$/i,
        extractDate: extractDateFromFilename,
        lanes: {
            HUE: { parser: (buffer) => parseF13Excel(buffer), targetTable: 'fact_f13' },
            TCT: { parser: (buffer) => parseF13NationalExcel(buffer), targetTable: 'fact_f13_national' },
        },
    },
    'F4.1': {
        key: 'F4.1',
        folder: 'F4.1',
        filenamePattern: /^F4\.1-\d{4}\.\d{2}\.\d{2}\.xlsx$/i,
        extractDate: extractF41DateFromFilename,
        lanes: {
            HUE: { parser: (buffer, filename) => parseF41HueExcel(buffer, filename), targetTable: 'fact_f41' },
            TCT: { parser: (buffer, filename) => parseF41TctExcel(buffer, filename), targetTable: 'fact_f41_national' },
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

function normalizeIndicator(indicator = 'F1.3') {
    const key = String(indicator || 'F1.3').toUpperCase();
    if (!INDICATORS[key]) throw new Error(`Unsupported Import indicator '${indicator}'.`);
    return key;
}

function normalizeLane(lane = 'HUE') {
    const key = String(lane || 'HUE').toUpperCase();
    if (!['HUE', 'TCT'].includes(key)) throw new Error(`Unsupported Import lane '${lane}'.`);
    return key;
}

function getOperationalRoot(indicator) {
    return path.join(operationalDataBase, INDICATORS[indicator].folder);
}

function getTestRoot(indicator) {
    if (indicator === 'F1.3') return configuredTestDataRoot;
    return configuredF41TestDataRoot || (configuredTestDataRoot ? path.join(path.dirname(configuredTestDataRoot), 'F4.1') : null);
}

function assertImportRootsSafe() {
    if (process.env.NODE_ENV !== 'test') return;
    if (!configuredTestDataRoot) {
        throw new Error('NODE_ENV=test requires QIS_TEST_DATA_ROOT to point to an isolated Import sandbox directory.');
    }
    for (const indicator of Object.keys(INDICATORS)) {
        const testRoot = getTestRoot(indicator);
        const operationalRoot = getOperationalRoot(indicator);
        if (!testRoot) throw new Error(`NODE_ENV=test requires an isolated Import sandbox directory for ${indicator}.`);
        if (path.resolve(testRoot) === path.resolve(operationalRoot)) {
            throw new Error(`Test Import root for ${indicator} must not resolve to the operational Data DKCL/${indicator} directory.`);
        }
    }
}

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
    return {
        ...indicatorConfig.lanes[laneKey],
        indicator: indicatorConfig.key,
        lane: laneKey,
        indicatorConfig,
    };
}

function getWatchIncomingDirs() {
    return Object.keys(INDICATORS).map((indicator) => getIndicatorConfig(indicator).incomingDir);
}

function resolveContextFromFilePath(filePath, explicit = {}) {
    const explicitIndicator = explicit.indicator ? normalizeIndicator(explicit.indicator) : null;
    const candidates = explicitIndicator ? [getIndicatorConfig(explicitIndicator)] : Object.keys(INDICATORS).map(getIndicatorConfig);
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
    INDICATORS,
    normalizeIndicator,
    normalizeLane,
    getIndicatorConfig,
    getLaneConfig,
    getWatchIncomingDirs,
    resolveContextFromFilePath,
    operationalDataRoot,
    configuredTestDataRoot,
};
