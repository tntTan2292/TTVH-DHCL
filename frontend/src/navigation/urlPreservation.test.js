import test from 'node:test';
import assert from 'node:assert/strict';
import { translateLegacyF13DashboardSearch } from './urlPreservation.js';

test('an old F1.3 Bảng điều hành link opens Theo ngày on the same day and unit', () => {
  assert.equal(
    translateLegacyF13DashboardSearch('?from_date=2026-07-15&to_date=2026-07-16&ma_bcvh=533140'),
    '?from=2026-07-15&to=2026-07-16&bcvh=533140',
  );
  assert.equal(translateLegacyF13DashboardSearch('?bcvh_id=533140'), '?bcvh=533140');
  assert.equal(translateLegacyF13DashboardSearch('?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all'), '?from=2026-07-15&to=2026-07-15');
});

test('no date or only half a range: the page opens its latest day', () => {
  assert.equal(translateLegacyF13DashboardSearch(''), '');
  assert.equal(translateLegacyF13DashboardSearch('?from_date=2026-07-15'), '');
});
