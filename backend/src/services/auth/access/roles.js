'use strict';

// HANGTON-HANDLING-01: the one place that names the positions (chức vụ) of QIS and what each may do.
// `tier` (ADMIN / LEADER / STAFF) stays the coarse data-scope switch of RBAC-01; the position refines it and carries
// the capabilities. A later feature that needs a new permission adds a capability here and lists the positions that
// hold it: no other file has to learn who is a director or a leader.

const TIERS = Object.freeze({ ADMIN: 'ADMIN', LEADER: 'LEADER', STAFF: 'STAFF' });

// Leader groups: the BĐTP leaders stand above the TTVH / IT group (rank decides who outranks whom).
const GROUPS = Object.freeze({
    SYSTEM: 'SYSTEM',
    LEADER_BDTP: 'LEADER_BDTP',
    LEADER_TTVH_IT: 'LEADER_TTVH_IT',
    BCVH: 'BCVH',
});

const CAPABILITIES = Object.freeze({
    HANGTON_HANDLING_VIEW: 'hangton.handling.view',
    HANGTON_HANDLING_WRITE: 'hangton.handling.write',
    HANGTON_HANDLING_APPROVE: 'hangton.handling.approve',
    HANGTON_HANDLING_REASONS: 'hangton.handling.reasons',
});
const C = CAPABILITIES;

const POSITIONS = Object.freeze({
    ADMIN: { code: 'ADMIN', label: 'Quản trị hệ thống', tier: TIERS.ADMIN, group: GROUPS.SYSTEM, rank: 100, capabilities: [C.HANGTON_HANDLING_VIEW, C.HANGTON_HANDLING_WRITE, C.HANGTON_HANDLING_APPROVE, C.HANGTON_HANDLING_REASONS] },
    LD_BDTP: { code: 'LD_BDTP', label: 'Lãnh đạo BĐTP', tier: TIERS.LEADER, group: GROUPS.LEADER_BDTP, rank: 90, capabilities: [C.HANGTON_HANDLING_VIEW] },
    LD_TTVH: { code: 'LD_TTVH', label: 'Lãnh đạo TTVH', tier: TIERS.LEADER, group: GROUPS.LEADER_TTVH_IT, rank: 80, capabilities: [C.HANGTON_HANDLING_VIEW] },
    IT_BDTP: { code: 'IT_BDTP', label: 'IT BĐTP', tier: TIERS.LEADER, group: GROUPS.LEADER_TTVH_IT, rank: 80, capabilities: [C.HANGTON_HANDLING_VIEW] },
    CHUYEN_QUAN: { code: 'CHUYEN_QUAN', label: 'Chuyên quản BCVH', tier: TIERS.STAFF, group: GROUPS.BCVH, rank: 50, capabilities: [C.HANGTON_HANDLING_VIEW, C.HANGTON_HANDLING_WRITE, C.HANGTON_HANDLING_APPROVE, C.HANGTON_HANDLING_REASONS] },
    GD_BCVH: { code: 'GD_BCVH', label: 'Giám đốc BCVH', tier: TIERS.STAFF, group: GROUPS.BCVH, rank: 40, capabilities: [C.HANGTON_HANDLING_VIEW, C.HANGTON_HANDLING_WRITE] },
    STAFF: { code: 'STAFF', label: 'Chuyên viên', tier: TIERS.STAFF, group: GROUPS.BCVH, rank: 10, capabilities: [] },
});

// An account with no stored position gets the least-privileged position of its tier.
const DEFAULT_POSITION_BY_TIER = Object.freeze({ ADMIN: 'ADMIN', LEADER: 'LD_TTVH', STAFF: 'STAFF' });

// "Chức vụ" text of the PO's user file -> position code (compared without case and with NFC text).
const POSITION_BY_TITLE = Object.freeze({
    'lãnh đạo bđtp': 'LD_BDTP',
    'lãnh đạo ttvh': 'LD_TTVH',
    'it bđtp': 'IT_BDTP',
    'giám đốc bcvh': 'GD_BCVH',
    'chuyên quản': 'CHUYEN_QUAN',
});

function positionFromTitle(title) {
    return POSITION_BY_TITLE[String(title ?? '').normalize('NFC').trim().toLowerCase()] || null;
}

/** Position of an account: the stored one when it is valid for the tier, else the tier default. */
function resolvePosition(tier, position) {
    const normalizedTier = String(tier || '').trim().toUpperCase();
    const stored = POSITIONS[String(position || '').trim().toUpperCase()];
    if (stored && stored.tier === normalizedTier) return stored;
    return POSITIONS[DEFAULT_POSITION_BY_TIER[normalizedTier]] || null;
}

function isValidPositionForTier(tier, position) {
    if (position === null || position === undefined || position === '') return true;
    const entry = POSITIONS[String(position).trim().toUpperCase()];
    return Boolean(entry) && entry.tier === String(tier || '').trim().toUpperCase();
}

function capabilitiesOf(position) {
    return [...(position?.capabilities || [])];
}

/** True when `access.capabilities` (the object /api/auth/me sends) holds the capability. */
function can(access, capability) {
    return Array.isArray(access?.capabilities) && access.capabilities.includes(capability);
}

/** True when position `a` stands strictly above position `b` (codes or access objects). */
function outranks(a, b) {
    const rank = (value) => (typeof value === 'object' && value !== null ? value.rank : POSITIONS[value]?.rank) ?? 0;
    return rank(a) > rank(b);
}

module.exports = {
    TIERS, GROUPS, CAPABILITIES, POSITIONS, DEFAULT_POSITION_BY_TIER,
    positionFromTitle, resolvePosition, isValidPositionForTier, capabilitiesOf, can, outranks,
};
