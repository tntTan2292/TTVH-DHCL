const test = require('node:test');
const assert = require('node:assert/strict');
const {
    CANONICAL_BCVH_UNITS,
    buildDashboardMeta,
    getCanonicalBcvhUnits
} = require('./src/config/canonicalBcvhUnits');

test('canonical BCVH configuration contains exactly six unique units', () => {
    assert.equal(CANONICAL_BCVH_UNITS.length, 6);
    assert.deepEqual(CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh), [
        '535790',
        '536250',
        '535470',
        '537220',
        '537015',
        '533140',
    ]);
    assert.equal(new Set(CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh)).size, 6);
});

test('dashboard metadata returns canonical BCVH units independent of fact_f13 rows', () => {
    const meta = buildDashboardMeta('2026-07-15');

    assert.equal(meta.max_date, '2026-07-15');
    assert.deepEqual(meta.bcvh_units, getCanonicalBcvhUnits());
    assert.equal(meta.bcvh_units.length, 6);
});
