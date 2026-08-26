'use strict';

// AB-AUTH-16: F4.1's completeness rule, in one place for all four checkpoints that use it
// (the HUE/TCT outer-summary readers, both single-date services, and the TCT workbook parser).
//
// Product Owner decision (2026-08-26): F4.1 completeness is "the required set is all present",
// NOT "the total row count matches a frozen number". Units that are not part of the fixed
// population -- khách vãng lai, đơn vị không cố định, a province-total line, a retired code such
// as 531120 -- legitimately come and go from day to day, and their absence is normal data, not a
// defect. Counting rows made every such day look like a broken import.
//
// This is confirmed by the real 2026-08-23 captures: HUE returned 8 outer rows and TCT 38, both
// of which were rejected by the old count rule (9 / 47) -- yet all 6 canonical BCVH codes and all
// 34 nationally-ranked province codes were present. Under this rule both days pass, and a day
// genuinely missing a required unit still fails.

const { CANONICAL_BCVH_UNITS } = require('../config/canonicalBcvhUnits');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('./nationalExcelParser');

// The 6 canonical BCVH units. Sourced from canonicalBcvhUnits.js so this list can never drift
// from the one the dashboards already treat as authoritative.
const REQUIRED_HUE_BCVH_CODES = Object.freeze(CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh));

// The 34 nationally-ranked provinces. Reuses the existing frozen list rather than restating it.
const REQUIRED_TCT_PROVINCE_CODES = NATIONAL_RANKED_PROVINCE_CODES;

// Unit codes are identifiers, never numbers: '01' must stay '01' and never become 1, so this
// only trims and stringifies.
function normalizeUnitCode(value) {
    return String(value ?? '').trim();
}

/**
 * Returns the required codes that are absent from `presentCodes`, preserving the required list's
 * own order so failure messages read predictably. An empty result means the set is complete.
 * Extra codes present but not required are deliberately ignored -- that is the whole point of the
 * rule change.
 */
function findMissingRequiredCodes(requiredCodes, presentCodes) {
    const present = new Set(
        (Array.isArray(presentCodes) ? presentCodes : [])
            .map(normalizeUnitCode)
            .filter(Boolean)
    );
    return (Array.isArray(requiredCodes) ? requiredCodes : [])
        .map(normalizeUnitCode)
        .filter((code) => code && !present.has(code));
}

module.exports = {
    REQUIRED_HUE_BCVH_CODES,
    REQUIRED_TCT_PROVINCE_CODES,
    findMissingRequiredCodes,
    normalizeUnitCode,
};
