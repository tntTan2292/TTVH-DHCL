'use strict';

/**
 * Monotonic "something that coverage depends on changed" counter.
 *
 * AutoBackfillCoverageService caches a scan result and drops it as soon as this number moves. It is bumped by every
 * writer whose result changes what a coverage scan reports: import_log rows, a finished import, a finished queue job,
 * coverage exceptions and the holiday calendar. A write that bypasses these (direct SQL) is bounded by the cache TTL.
 */

let version = 0;

function bumpCoverageVersion() {
    version += 1;
    return version;
}

function currentCoverageVersion() {
    return version;
}

module.exports = { bumpCoverageVersion, currentCoverageVersion };
