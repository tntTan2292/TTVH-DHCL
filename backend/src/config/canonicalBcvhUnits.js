const CANONICAL_BCVH_UNITS = Object.freeze([
    Object.freeze({ ma_bcvh: '535790', ten_bcvh: 'BCVH A Lưới' }),
    Object.freeze({ ma_bcvh: '536250', ten_bcvh: 'BCVH Hương Thủy' }),
    Object.freeze({ ma_bcvh: '535470', ten_bcvh: 'BCVH Hương Trà' }),
    Object.freeze({ ma_bcvh: '537220', ten_bcvh: 'BCVH Phú Lộc' }),
    Object.freeze({ ma_bcvh: '537015', ten_bcvh: 'BCVH Thuận An' }),
    Object.freeze({ ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa' }),
]);

function getCanonicalBcvhUnits() {
    return CANONICAL_BCVH_UNITS.map((unit) => ({ ...unit }));
}

function buildDashboardMeta(maxDate, minDate = null) {
    return {
        min_date: minDate || null,
        max_date: maxDate || null,
        bcvh_units: getCanonicalBcvhUnits()
    };
}

module.exports = {
    CANONICAL_BCVH_UNITS,
    getCanonicalBcvhUnits,
    buildDashboardMeta
};
