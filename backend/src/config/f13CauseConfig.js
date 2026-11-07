'use strict';

// F13-WHY-DATA-02 (rules v5, decision E6): the one place for the reference thresholds of "time left at arrival at the BCVH".
// They never change a cause: the hint DEN_BCVH_CON_IT_GIO and the distribution of Hành trình / the aggregation layer use them.
// The file is part of the classifier version (a change here marks every built day stale).

const HOUR_MS = 3600000;

module.exports = Object.freeze({
    // Hint DEN_BCVH_CON_IT_GIO: the parcel reached the BCVH with at least 0 and less than this time left before the limit.
    REMAINING_HINT_MS: 6 * HOUR_MS,
    // Distribution buckets of the time left: over the limit (< 0), then these upper bounds: [0, 3 h), [3 h, 6 h), 6 h and more.
    REMAINING_BUCKET_MS: Object.freeze([3 * HOUR_MS, 6 * HOUR_MS]),
    // F13-WHY-DATA-03 (PO 2026-11-07): BCVH that receive directly from ĐTC1. A parcel scanned in TMS to such a BCVH counts as scanned at KTC1,
    // so an arrival A earlier than T by at most DIRECT_HANDOVER_MAX_EARLY_MS is read as A = T (technical guard against an F4.1 row of an earlier trip).
    DIRECT_HANDOVER_BCVH: Object.freeze(['535470']),
    DIRECT_HANDOVER_MAX_EARLY_MS: 24 * HOUR_MS,
});
