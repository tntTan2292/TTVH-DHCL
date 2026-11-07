import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JOURNEY_MILESTONES,
  JOURNEY_ROUTE_STAGES,
  coveragePercent,
  formatJourneyDate,
  formatLegHours,
  formatMilestone,
  formatPostmen,
  formatPostmenWithVolume,
  groupJourneyRoutesByBcvh,
  journeyRouteValue,
  formatPeriodDisplay,
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

test('F13-JOURNEY-ROUTE-02: JOURNEY_ROUTE_STAGES contains the 4 route stages', () => {
  assert.deepEqual(
    JOURNEY_ROUTE_STAGES.map((s) => s.key),
    ['tms_arrive', 'arrive_gbt', 'gbt_ptc', 'tms_ptc']
  );
});

test('F13-JOURNEY-ROUTE-02: formatPostmenWithVolume formats postmen with volume for each person', () => {
  assert.equal(formatPostmenWithVolume([]), '—');
  assert.equal(
    formatPostmenWithVolume([{ ten_buu_ta: 'Nguyễn Văn A', volume: 150 }]),
    'Nguyễn Văn A (150)'
  );
  assert.equal(
    formatPostmenWithVolume([
      { ten_buu_ta: 'Nguyễn Văn A', volume: 150 },
      { ma_buu_ta: 'BT02', volume: 80 },
    ]),
    'Nguyễn Văn A (150), BT02 (80)'
  );
});

test('F13-JOURNEY-ROUTE-02: groupJourneyRoutesByBcvh groups routes into postman, non-postman and other while preserving API order', () => {
  const routes = [
    { ma_bcvh: '530000', ten_bcvh: 'BCVH Thủy Xuân', route_scope: 'POSTMAN', ma_tuyen: 'TX01', volume: 100 },
    { ma_bcvh: '530000', ten_bcvh: 'BCVH Thủy Xuân', route_scope: 'NON_POSTMAN', ma_tuyen: null, volume: 50 },
    { ma_bcvh: '530000', ten_bcvh: 'BCVH Thủy Xuân', route_scope: 'OTHER', ma_tuyen: null, volume: 10 },
    { ma_bcvh: '535000', ten_bcvh: 'BCVH Hương Thủy', route_scope: 'POSTMAN', ma_tuyen: 'HT01', volume: 200 },
  ];

  const groups = groupJourneyRoutesByBcvh(routes);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].ma_bcvh, '530000');
  assert.equal(groups[0].postmanRoutes.length, 1);
  assert.equal(groups[0].nonPostmanRoutes.length, 1);
  assert.equal(groups[0].otherRoutes.length, 1);

  assert.equal(groups[1].ma_bcvh, '535000');
  assert.equal(groups[1].postmanRoutes.length, 1);
  assert.equal(groups[1].nonPostmanRoutes.length, 0);
  assert.equal(groups[1].otherRoutes.length, 0);
});

test('F13-JOURNEY-ROUTE-02: journeyRouteValue resolves legs_failed and legs_passed fields', () => {
  const row = {
    volume: 50,
    legs_failed: { tms_arrive: 4.5, arrive_gbt: 2.1 },
    legs_passed: { tms_arrive: 1.2, arrive_gbt: 0.8 },
  };

  assert.equal(journeyRouteValue(row, 'legs_failed.tms_arrive'), 4.5);
  assert.equal(journeyRouteValue(row, 'legs_passed.tms_arrive'), 1.2);
  assert.equal(journeyRouteValue(row, 'legs_failed.arrive_gbt'), 2.1);
  assert.equal(journeyRouteValue(row, 'legs_passed.gbt_ptc'), null);
});

test('F13-JOURNEY-ROUTE-02: formatPeriodDisplay formats day, week, and month displays', () => {
  assert.equal(
    formatPeriodDisplay({ periodMode: 'day', fromDate: '2026-10-28', toDate: '2026-10-28' }),
    'Ngày 28/10/2026'
  );
  assert.equal(
    formatPeriodDisplay({ periodMode: 'day', fromDate: '2026-10-01', toDate: '2026-10-28' }),
    '01/10/2026 đến 28/10/2026'
  );
  assert.equal(
    formatPeriodDisplay({
      periodMode: 'week',
      weekId: '2026-W42',
      availableWeeks: [{ week_id: '2026-W42', label: 'Tuần 42 (12/10 - 18/10/2026)' }],
    }),
    'Tuần 42 (12/10 - 18/10/2026)'
  );
  assert.equal(
    formatPeriodDisplay({
      periodMode: 'month',
      monthId: '2026-10',
      availableMonths: [{ month_id: '2026-10', label: 'Tháng 10/2026' }],
    }),
    'Tháng 10/2026'
  );
});
