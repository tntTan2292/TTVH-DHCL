import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseF13Timestamp,
  formatDelayLabel,
  buildViolationEvidenceLink,
  buildBackToRouteRankingLink,
  mapViolationRows,
} from './routeViolationEvidenceData.js';

test('parseF13Timestamp parses dd/MM/yyyy HH:mm:ss into a valid Date', () => {
  const date = parseF13Timestamp('23/06/2026 12:25:46');
  assert.ok(date instanceof Date);
  assert.equal(Number.isNaN(date.getTime()), false);
});

test('parseF13Timestamp returns null for unparseable input', () => {
  assert.equal(parseF13Timestamp('not-a-date'), null);
  assert.equal(parseF13Timestamp(null), null);
});

test('formatDelayLabel renders an explicit unavailable label, never "0h", for null delay', () => {
  assert.equal(formatDelayLabel(null), 'Chưa đủ dữ liệu');
  assert.equal(formatDelayLabel(undefined), 'Chưa đủ dữ liệu');
});

test('formatDelayLabel renders a real numeric delay, including a genuine 0h', () => {
  assert.equal(formatDelayLabel(3.5), '3.5h');
  assert.equal(formatDelayLabel(0), '0.0h');
});

test('buildViolationEvidenceLink preserves date, BCVH, route context and the return path', () => {
  const link = buildViolationEvidenceLink({
    analysisDate: '2026-08-02',
    bcvhId: '533140',
    bcvhName: 'BCVH Thuận Hóa',
    routeId: '53314018',
    routeName: 'Tuyến A',
    currentSearch: '?from_date=2026-08-01&to_date=2026-08-02&bcvh_id=533140',
  });

  assert.match(link, /^\/f13\/ranking\/route\/violations\?/);
  const params = new URLSearchParams(link.split('?')[1]);
  assert.equal(params.get('date'), '2026-08-02');
  assert.equal(params.get('bcvh_id'), '533140');
  assert.equal(params.get('route_id'), '53314018');
  assert.ok(params.get('return_to').includes('from_date=2026-08-01'));
});

test('buildBackToRouteRankingLink reconstructs the original Route Ranking filters', () => {
  const link = buildBackToRouteRankingLink('from_date=2026-08-01&to_date=2026-08-02&bcvh_id=533140');
  assert.equal(link, '/f13/ranking/route?from_date=2026-08-01&to_date=2026-08-02&bcvh_id=533140');
});

test('buildBackToRouteRankingLink falls back to the bare Route Ranking path when no context is preserved', () => {
  assert.equal(buildBackToRouteRankingLink(''), '/f13/ranking/route');
  assert.equal(buildBackToRouteRankingLink(null), '/f13/ranking/route');
});

test('mapViolationRows carries status and a null-safe delay label through unchanged', () => {
  const rows = mapViolationRows([
    { ma_bg: 'BG001', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '23/06/2026 12:25:46', thoi_gian_nop_tien: null, do_tre_gio: null },
    { ma_bg: 'BG002', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '23/06/2026 08:00:00', thoi_gian_nop_tien: '23/06/2026 11:30:00', do_tre_gio: 3.5 },
  ]);

  assert.equal(rows[0].delayHours, null);
  assert.equal(rows[0].delayLabel, 'Chưa đủ dữ liệu');
  assert.equal(rows[1].delayHours, 3.5);
  assert.equal(rows[1].delayLabel, '3.5h');
});
