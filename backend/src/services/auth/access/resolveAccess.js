'use strict';

const { HANGTON_OFFICES_BY_BCVH, HANGTON_OFFICES_BY_INDICATOR } = require('./officeMap');

const TIERS = Object.freeze({ ADMIN: 'ADMIN', LEADER: 'LEADER', STAFF: 'STAFF' });
const MODULES = Object.freeze({ f11: 'F1.1', f12: 'F1.2', f13: 'F1.3', f41: 'F4.1' });
const HANGTON_SCREENS = Object.freeze(['overview', 'office', 'compare', 'items']);
const STAFF_HANGTON_SCREENS = Object.freeze(['office', 'compare']);

function sortedUnique(values) {
    return [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))].sort();
}

/**
 * Single place where the RBAC-01 rules live (DEC-022). Pure function.
 * Returns the access object that /api/auth/me sends and the middleware enforces.
 * Cross-BCVH blocks (summary table "tai cac BCVH", reconciliation, national rank) are shown for a
 * module only when modules[m].mode === 'all'.
 */
function resolveAccess({ tier, bcvh = [], indicators = [] } = {}) {
    const normalizedTier = String(tier || '').trim().toUpperCase();
    const bcvhList = sortedUnique(bcvh);
    const indicatorSet = new Set(sortedUnique(indicators));

    if (normalizedTier === TIERS.ADMIN || normalizedTier === TIERS.LEADER) {
        const modules = {};
        for (const key of Object.keys(MODULES)) modules[key] = { mode: 'all', bcvh: [] };
        return {
            tier: normalizedTier,
            modules,
            hangton: { screens: [...HANGTON_SCREENS], offices: 'all' },
            network: true,
            admin: normalizedTier === TIERS.ADMIN,
            home: true,
        };
    }

    if (normalizedTier !== TIERS.STAFF) {
        return {
            tier: normalizedTier,
            modules: Object.fromEntries(Object.keys(MODULES).map((key) => [key, { mode: 'none', bcvh: [] }])),
            hangton: { screens: [], offices: [] },
            network: false,
            admin: false,
            home: false,
        };
    }

    const modules = {};
    for (const [key, indicator] of Object.entries(MODULES)) {
        if (indicatorSet.has(indicator)) {
            modules[key] = { mode: 'all', bcvh: [] };
        } else if (key !== 'f12' && bcvhList.length > 0) {
            modules[key] = { mode: 'bcvh', bcvh: bcvhList };
        } else {
            modules[key] = { mode: 'none', bcvh: [] };
        }
    }

    const offices = new Set();
    for (const code of bcvhList) (HANGTON_OFFICES_BY_BCVH[code] || []).forEach((office) => offices.add(office));
    for (const indicator of indicatorSet) (HANGTON_OFFICES_BY_INDICATOR[indicator] || []).forEach((office) => offices.add(office));
    const hasHangton = offices.size > 0;
    // The HANGTON indicator specialist sees the whole Hang ton module (PO 2026-10-25): all four screens, every office.
    const hangton = indicatorSet.has('HANGTON')
        ? { screens: [...HANGTON_SCREENS], offices: 'all' }
        : { screens: hasHangton ? [...STAFF_HANGTON_SCREENS] : [], offices: [...offices].sort() };

    return {
        tier: normalizedTier,
        modules,
        hangton,
        network: false,
        admin: false,
        home: true,
    };
}

module.exports = { resolveAccess, TIERS, MODULES, HANGTON_SCREENS, STAFF_HANGTON_SCREENS };
