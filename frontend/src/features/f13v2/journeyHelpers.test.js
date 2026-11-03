import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JOURNEY_MILESTONES,
  coveragePercent,
  formatJourneyDate,
  formatLegHours,
  formatMilestone,
  formatPostmen,
  journeyRouteValue,
} from './journeyHelpers.js';

test('the five F1.3 milestones, in measuring order', () => {
  assert.deepEqual(JOURNEY_MILESTONES.map((m) => m.key), ['tms', 'depart', 'arrive', 'gbt', 'ptc']);
});

test('hours and times: a missing value is a dash, a real zero stays', () => {
  assert.equal(formatLegHours(5.69), '5,7');
  assert.equal(formatLegHours(0), '0,0');
  assert.equal(formatLegHours(null), '—');
  assert.equal(formatMilestone('2026-10-28 13:35:51'), '28/10 13:35:51');
  assert.equal(formatMilestone(null), '—');
  assert.equal(formatJourneyDate('2026-10-28'), '28/10/2026');
});

test('postmen: one name alone, several with their parcel counts', () => {
  assert.equal(formatPostmen([]), '—');
  assert.equal(formatPostmen([{ ten_buu_ta: 'Một', volume: 5 }]), 'Một');
  assert.equal(formatPostmen([{ ten_buu_ta: 'Một', volume: 5 }, { ma_buu_ta: 'BT2', volume: 1 }]), 'Một (5), BT2 (1)');
});

test('coverage percent and the sort value of a route column', () => {
  assert.equal(coveragePercent(1, 3), '33%');
  assert.equal(coveragePercent(0, 0), '0%');
  const row = { volume: 3, legs: { gbt_ptc: 2.5, tms_ptc: null }, postmen: [{ ten_buu_ta: 'Một' }] };
  assert.equal(journeyRouteValue(row, 'volume'), 3);
  assert.equal(journeyRouteValue(row, 'legs.gbt_ptc'), 2.5);
  assert.equal(journeyRouteValue(row, 'legs.tms_ptc'), null);
  assert.equal(journeyRouteValue(row, 'postmen'), 'Một');
});
