import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRankSummary } from './homeSummary.js';

const card = (id, rank_movement, extra = {}) => ({ id, label: id.toUpperCase(), available: true, rank_movement, ...extra });

test('counts the cards that rose, kept and lost places, and names the one that lost the most', () => {
  const out = buildRankSummary([card('f11', 9), card('f12', 0), card('f13', -1), card('f41', -3), card('f42', 2)], 'day');
  assert.deepEqual(out, {
    basis: 'hôm trước', up: 2, same: 1, down: 2, counted: 5, total: 5,
    worst: { id: 'f41', label: 'F41', places: 3 },
  });
});

test('no card lost a place: no worst indicator', () => {
  const out = buildRankSummary([card('f11', 1), card('f12', 0)], 'week');
  assert.equal(out.worst, null);
  assert.equal(out.basis, 'tuần trước');
  assert.equal(out.down, 0);
});

test('a card without a previous rank or without data is not counted as "giữ hạng"', () => {
  const out = buildRankSummary([card('f11', null), card('f12', undefined), card('f13', 0, { available: false }), card('f41', -2), card('f42', 1)], 'month');
  assert.equal(out.counted, 2);
  assert.equal(out.total, 5);
  assert.equal(out.same, 0);
  assert.equal(out.up, 1);
  assert.equal(out.down, 1);
  assert.equal(out.basis, 'tháng trước');
});

test('nothing to summarise gives null', () => {
  assert.equal(buildRankSummary([], 'day'), null);
  assert.equal(buildRankSummary(null, 'day'), null);
  assert.equal(buildRankSummary([card('f11', null)], 'day').counted, 0);
});
