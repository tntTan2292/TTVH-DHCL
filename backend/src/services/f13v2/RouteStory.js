'use strict';

// F13-WHY-NARRATIVE-02 B1: the pure assembly of the `story` object of one route row of /why/routes. No database here.
// Everything is a count taken with the same WHERE as the row; shares are failed-parcel shares (little time, causes) or parcel shares (return, stock).
// PO rules (2026-11-04 / 05): one primary cause per parcel; time left at arrival, return and stock are hints, never a cause; show, do not judge.

const { parseTime } = require('./JourneyService');

const STORY_CONFIG = Object.freeze({
    SECOND_CAUSE_MIN_SHARE: 0.2, // the second cause is shown when it holds at least 20 % of the route's failed parcels
    MAX_LOTS: 3,
});

const LOT_CAUSE = 'KHONG_TRON_LO';
const share = (part, whole) => (whole > 0 ? part / whole : null);

/** The cause lines (as built by causeMixOf) with a count, most failed parcels first; ties keep the line order. */
function rankedCauses(lines) {
    return lines
        .map((line, order) => ({ line, order }))
        .filter(({ line }) => line.count > 0)
        .sort((a, b) => b.line.count - a.line.count || a.order - b.order)
        .map(({ line }) => line);
}

function causeEntry(line, failed) {
    return { code: line.code, label: line.label, count: line.count, share: share(line.count, failed) };
}

/**
 * Lot evidence from the TMS scans of every parcel of the lot (each parcel once): the number of distinct batch times and the last one.
 * @param {{ma_bg: string, thoi_gian_bd10_quet_tms: string|null}[]} scanRows
 * @returns {{tms_batches: number, first_tms: string|null, last_tms: string|null}}
 */
function lotEvidence(scanRows) {
    const seen = new Set();
    const times = new Set();
    for (const row of scanRows) {
        if (seen.has(row.ma_bg)) continue;
        seen.add(row.ma_bg);
        if (row.thoi_gian_bd10_quet_tms) times.add(row.thoi_gian_bd10_quet_tms);
    }
    const parsed = [...times].map(parseTime).filter((value) => value !== null);
    const format = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
    return {
        tms_batches: times.size,
        first_tms: parsed.length ? format(Math.min(...parsed)) : null,
        last_tms: parsed.length ? format(Math.max(...parsed)) : null,
    };
}

/** A hint counted against the route's parcels and against its BCVH: numbers only, no threshold (decided in review). */
function hintEntry(count, parcels, bcvhCount, bcvhParcels) {
    const routeShare = share(count, parcels);
    const bcvhShare = share(bcvhCount, bcvhParcels);
    return {
        count,
        parcels,
        share: routeShare,
        bcvh_share: bcvhShare,
        ratio: routeShare !== null && bcvhShare ? routeShare / bcvhShare : null,
    };
}

/**
 * @param {object} input
 *   failed: failed parcels of the route; lines: cause lines of the route (causeMixOf().lines)
 *   lots: [{ma_lo, failed}] failed parcels of the route per incomplete lot, any order; lotEvidence: Map ma_lo -> lotEvidence()
 *   littleTime: failed parcels with DEN_BCVH_CON_IT_GIO
 *   parcels / bcvhParcels: distinct parcels of the route / of its BCVH; returned / stock: counts for the route; bcvhReturned / bcvhStock: for the BCVH
 */
function buildStory(input, config = STORY_CONFIG) {
    const failed = Number(input.failed || 0);
    const ranked = rankedCauses(input.lines || []);
    const main = ranked.length ? causeEntry(ranked[0], failed) : null;
    const second = ranked.length > 1 && ranked[1].count >= config.SECOND_CAUSE_MIN_SHARE * failed ? causeEntry(ranked[1], failed) : null;
    const story = { main, second, lot: null, little_time: { count: Number(input.littleTime || 0), share: share(Number(input.littleTime || 0), failed) } };
    if (main && main.code === LOT_CAUSE) {
        story.lot = [...(input.lots || [])]
            .sort((a, b) => b.failed - a.failed || String(a.ma_lo).localeCompare(String(b.ma_lo)))
            .slice(0, config.MAX_LOTS)
            .map((lot) => {
                const evidence = (input.lotEvidence && input.lotEvidence.get(lot.ma_lo)) || { tms_batches: null, first_tms: null, last_tms: null };
                return { ma_lo: lot.ma_lo, failed: lot.failed, share_of_failed: share(lot.failed, failed), ...evidence };
            });
    }
    story.return_hint = hintEntry(Number(input.returned || 0), Number(input.parcels || 0), Number(input.bcvhReturned || 0), Number(input.bcvhParcels || 0));
    story.stock_hint = hintEntry(Number(input.stock || 0), Number(input.parcels || 0), Number(input.bcvhStock || 0), Number(input.bcvhParcels || 0));
    return story;
}

module.exports = { STORY_CONFIG, buildStory, lotEvidence, rankedCauses };
