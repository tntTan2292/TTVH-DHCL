'use strict';

// PROV-PKG-01 (S3b): the single place where the province code and the province display names are read.
//
// Source of truth: table system_config (keys below). load(db) reads them once at start-up; the getters are
// synchronous, so the module-level code of the services can call them at any time.
//
// Before load():
//   - edition `full` (default, the Hue edition): the Hue defaults of ./hueDefaults.js, so the ~120 test
//     files that require the services directly keep working and Hue behaves exactly as before;
//   - edition `province`: every getter throws PROVINCE_CONFIG_NOT_LOADED (better to stop than to silently
//     load Hue data). The province bundle contains no Hue default at all (design condition C1).

const KEYS = Object.freeze([
    'default_province_code',
    'default_province_name',
    'display_unit_name',
    'display_legal_name',
    'display_short_name',
    'display_brand_short',
    'unit_leader_label',
    'province_configured',
    'unit_catalog_autofill',
]);

const PROVINCE_CODE_PATTERN = /^[0-9]{2}$/;

function codedError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function edition() {
    const value = String(process.env.QIS_EDITION || 'full').trim().toLowerCase();
    if (value !== 'full' && value !== 'province') {
        throw codedError('PROVINCE_EDITION_INVALID', `QIS_EDITION must be 'full' or 'province' (got '${value}').`);
    }
    return value;
}

// Lazy and only for the full edition: this is the one require() the province build stubs out.
function fullDefaults() {
    return require('./hueDefaults');
}

let state = null; // { values: {key: string|undefined}, fromDb: Set<key> }

function assertProvinceCode(value) {
    if (typeof value !== 'string' || !PROVINCE_CODE_PATTERN.test(value)) {
        throw codedError('PROVINCE_CODE_INVALID', 'default_province_code must be exactly two digits.');
    }
    return value;
}

function readRows(db) {
    return new Promise((resolve, reject) => {
        const placeholders = KEYS.map(() => '?').join(',');
        db.all(
            `SELECT config_key, config_value FROM system_config WHERE config_key IN (${placeholders})`,
            [...KEYS],
            (error, rows) => (error ? reject(error) : resolve(rows || [])),
        );
    });
}

async function load(db) {
    if (!db || typeof db.all !== 'function') throw codedError('PROVINCE_CONFIG_DB_REQUIRED', 'provinceConfig.load() needs an open sqlite3 database.');
    const mode = edition();
    const rows = await readRows(db);
    const values = {};
    const fromDb = new Set();
    rows.forEach((row) => {
        values[row.config_key] = row.config_value === null || row.config_value === undefined ? '' : String(row.config_value);
        fromDb.add(row.config_key);
    });

    if (mode === 'province') {
        if (!fromDb.has('default_province_code')) {
            throw codedError('PROVINCE_NOT_CONFIGURED', 'Chưa cấu hình mã tỉnh. Hãy chạy install.cmd.');
        }
        assertProvinceCode(values.default_province_code);
        if (values.province_configured !== '1') {
            throw codedError('PROVINCE_NOT_CONFIGURED', 'Chưa chạy install.cmd.');
        }
    } else if (fromDb.has('default_province_code')) {
        assertProvinceCode(values.default_province_code);
    }

    state = { values, fromDb };
    return snapshot();
}

// Used after an administrator edits a display name; the province code itself is not editable from the UI.
function reload(db) {
    return load(db);
}

function isLoaded() {
    return state !== null;
}

function raw(key) {
    if (state && state.fromDb.has(key)) return state.values[key];
    if (edition() === 'province') {
        throw codedError('PROVINCE_CONFIG_NOT_LOADED', state ? `system_config key '${key}' is missing.` : 'Province configuration has not been loaded.');
    }
    return fullDefaults()[key];
}

function getProvinceCode() {
    return raw('default_province_code');
}

// Whether system_config really holds default_province_code (kpiController keeps its 500 for a missing key).
function hasConfiguredProvinceCode() {
    return state !== null && state.fromDb.has('default_province_code') && state.values.default_province_code !== '';
}

function getProvinceName() {
    return raw('default_province_name');
}

function getDisplay() {
    return Object.freeze({
        unitName: raw('display_unit_name'),
        legalName: raw('display_legal_name'),
        shortName: raw('display_short_name'),
        brandShort: raw('display_brand_short'),
        leaderLabel: raw('unit_leader_label'),
    });
}

function isCatalogAutofillEnabled() {
    return String(raw('unit_catalog_autofill')).toLowerCase() === 'on';
}

// The three shapes in which the DKCL portal and the SQL code receive the province code (design 1.3).
//   plain    '53'      portal form field value
//   nquoted  "N'53'"   the F1.2 portal form wants the SQL literal
//   numeric  53        for reports that send a number
function formatForPortal(kind = 'plain') {
    const code = assertProvinceCode(getProvinceCode());
    if (kind === 'plain') return code;
    if (kind === 'nquoted') return `N'${code}'`;
    if (kind === 'numeric') return Number(code);
    throw codedError('PROVINCE_FORMAT_INVALID', `Unknown portal format '${kind}'.`);
}

// Route codes of this province start with the province code. getRoutePrefix() is the bare prefix;
// getRouteLikePattern() is the value to bind to `LIKE ?` (never concatenate the code into SQL text).
function getRoutePrefix() {
    return assertProvinceCode(getProvinceCode());
}

function getRouteLikePattern() {
    return `${getRoutePrefix()}%`;
}

function snapshot() {
    return Object.freeze({ ...(state ? state.values : {}) });
}

// Test helper: forget the loaded state.
function _reset() {
    state = null;
}

module.exports = {
    KEYS,
    load,
    reload,
    isLoaded,
    getProvinceCode,
    hasConfiguredProvinceCode,
    getProvinceName,
    getDisplay,
    isCatalogAutofillEnabled,
    formatForPortal,
    getRoutePrefix,
    getRouteLikePattern,
    _reset,
};
