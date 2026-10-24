'use strict';

// RBAC-01: the six canonical BCVH (code = ma_bc_phat / ma_bcvh in the fact tables).
const BCVH_BY_CODE = Object.freeze({
    '533140': 'BCVH Thuận Hóa',
    '536250': 'BCVH Hương Thủy',
    '535470': 'BCVH Hương Trà',
    '537220': 'BCVH Phú Lộc',
    '537015': 'BCVH Thuận An',
    '535790': 'BCVH A Lưới',
});

const BCVH_CODES = Object.freeze(Object.keys(BCVH_BY_CODE));

// Hàng tồn office codes owned by each BCVH. 535710 (KT A Lưới) counts for A Lưới (PO 2026-10-24).
const HANGTON_OFFICES_BY_BCVH = Object.freeze({
    '533140': ['533140'],
    '536250': ['536250'],
    '535470': ['535470'],
    '537220': ['537220'],
    '537015': ['537015'],
    '535790': ['535790', '535710'],
});

// Hàng tồn offices granted by an indicator specialty: F1.2 specialist sees KTC1.
const HANGTON_OFFICES_BY_INDICATOR = Object.freeze({
    'F1.2': ['530100'],
});

function normalizeBcvhName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function bcvhCodeFromName(name) {
    const wanted = normalizeBcvhName(name);
    const entry = Object.entries(BCVH_BY_CODE).find(([, label]) => normalizeBcvhName(label) === wanted);
    return entry ? entry[0] : null;
}

module.exports = {
    BCVH_BY_CODE,
    BCVH_CODES,
    HANGTON_OFFICES_BY_BCVH,
    HANGTON_OFFICES_BY_INDICATOR,
    bcvhCodeFromName,
};
