import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseF13Timestamp,
  formatDelayLabel,
  buildViolationEvidenceLink,
  translateLegacyViolationsSearch,
  buildBackToRouteRankingLink,
  isValidReturnTo,
  mapViolationRows,
  buildViolationGroupTabs,
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

// Phase 3 (F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md Section 3.1): the drill-down
// now targets the merged Evidence screen directly, with both from_date and to_date sent
// as the identical analysisDate value — Evidence never reads a bare `date` param.
test('buildViolationEvidenceLink targets /f13/evidence with both from_date and to_date set to the same analysisDate', () => {
  const link = buildViolationEvidenceLink({
    analysisDate: '2026-08-02',
    bcvhId: '533140',
    bcvhName: 'BCVH Thuận Hóa',
    routeId: '53314018',
    routeName: 'Tuyến A',
    currentSearch: '?from_date=2026-08-01&to_date=2026-08-02&bcvh_id=533140',
  });

  assert.match(link, /^\/f13\/evidence\?/);
  const params = new URLSearchParams(link.split('?')[1]);
  assert.equal(params.get('from_date'), '2026-08-02');
  assert.equal(params.get('to_date'), '2026-08-02');
  assert.equal(params.get('bcvh_id'), '533140');
  assert.equal(params.get('bcvh_name'), 'BCVH Thuận Hóa');
  assert.equal(params.get('route_id'), '53314018');
  assert.equal(params.get('route_name'), 'Tuyến A');
  assert.ok(params.get('return_to').includes('from_date=2026-08-01'));
});

test('buildViolationEvidenceLink defaults reason to delayed_cash, matching the old screen\'s default group', () => {
  const link = buildViolationEvidenceLink({ analysisDate: '2026-08-02', bcvhId: '533140', routeId: '53314018' });
  const params = new URLSearchParams(link.split('?')[1]);
  assert.equal(params.get('reason'), 'delayed_cash');
});

test('buildViolationEvidenceLink lets an explicit reason override the default', () => {
  const link = buildViolationEvidenceLink({ analysisDate: '2026-08-02', bcvhId: '533140', routeId: '53314018', reason: 'all' });
  const params = new URLSearchParams(link.split('?')[1]);
  assert.equal(params.get('reason'), 'all');
});

// Phase 3, Task 4 point 2: an old bookmark for /f13/ranking/route/violations?date=...
// must land on the exact same day after the translating redirect, not silently fall back
// to the newest imported day.
test('translateLegacyViolationsSearch converts the old `date` param into both from_date and to_date', () => {
  const translated = translateLegacyViolationsSearch('?date=2026-08-02&bcvh_id=533140&route_id=53314018');
  const params = new URLSearchParams(translated);
  assert.equal(params.get('from_date'), '2026-08-02');
  assert.equal(params.get('to_date'), '2026-08-02');
});

test('translateLegacyViolationsSearch passes bcvh_id/bcvh_name/route_id/route_name/reason/return_to through unchanged', () => {
  const translated = translateLegacyViolationsSearch(
    '?date=2026-08-02&bcvh_id=533140&bcvh_name=BCVH+Thu%E1%BA%ADn+H%C3%B3a&route_id=53314018&route_name=Tuy%E1%BA%BFn+A&reason=other&return_to=from_date%3D2026-08-01'
  );
  const params = new URLSearchParams(translated);
  assert.equal(params.get('bcvh_id'), '533140');
  assert.equal(params.get('bcvh_name'), 'BCVH Thuận Hóa');
  assert.equal(params.get('route_id'), '53314018');
  assert.equal(params.get('route_name'), 'Tuyến A');
  assert.equal(params.get('reason'), 'other');
  assert.equal(params.get('return_to'), 'from_date=2026-08-01');
});

test('translateLegacyViolationsSearch omits from_date/to_date entirely when the old link carried no date', () => {
  const translated = translateLegacyViolationsSearch('?bcvh_id=533140');
  const params = new URLSearchParams(translated);
  assert.equal(params.has('from_date'), false);
  assert.equal(params.has('to_date'), false);
});

test('buildBackToRouteRankingLink reconstructs the original Route Ranking filters', () => {
  const link = buildBackToRouteRankingLink('from_date=2026-08-01&to_date=2026-08-02&bcvh_id=533140');
  assert.equal(link, '/f13/ranking/route?from_date=2026-08-01&to_date=2026-08-02&bcvh_id=533140');
});

test('buildBackToRouteRankingLink falls back to the bare Route Ranking path when no context is preserved', () => {
  assert.equal(buildBackToRouteRankingLink(''), '/f13/ranking/route');
  assert.equal(buildBackToRouteRankingLink(null), '/f13/ranking/route');
});

// Phase 3 return-journey remediation (AC: "Invalid/external return_to is rejected safely").
test('isValidReturnTo accepts a well-formed Route Ranking query string', () => {
  assert.equal(isValidReturnTo('from_date=2026-08-01&to_date=2026-08-02&bcvh_id=533140'), true);
  assert.equal(isValidReturnTo('?search=xin+ch%C3%A0o'), true);
  assert.equal(isValidReturnTo('only_failed=1'), true);
});

test('isValidReturnTo rejects empty, missing, or context-free values', () => {
  assert.equal(isValidReturnTo(''), false);
  assert.equal(isValidReturnTo(null), false);
  assert.equal(isValidReturnTo(undefined), false);
  assert.equal(isValidReturnTo('   '), false);
  assert.equal(isValidReturnTo('unrelated_key=value'), false);
});

test('isValidReturnTo rejects external/protocol-shaped values', () => {
  assert.equal(isValidReturnTo('https://evil.com?from_date=2026-08-01'), false);
  assert.equal(isValidReturnTo('//evil.com?from_date=2026-08-01'), false);
  assert.equal(isValidReturnTo('javascript:alert(1)'), false);
});

test('buildBackToRouteRankingLink falls back to the bare path for an invalid/external return_to', () => {
  assert.equal(buildBackToRouteRankingLink('https://evil.com'), '/f13/ranking/route');
  assert.equal(buildBackToRouteRankingLink('//evil.com'), '/f13/ranking/route');
  assert.equal(buildBackToRouteRankingLink('javascript:alert(1)'), '/f13/ranking/route');
  assert.equal(buildBackToRouteRankingLink('unrelated_key=value'), '/f13/ranking/route');
});

test('mapViolationRows carries status, violation reason, and a null-safe delay label through unchanged', () => {
  const rows = mapViolationRows([
    { ma_bg: 'BG001', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '23/06/2026 12:25:46', thoi_gian_nop_tien: null, do_tre_gio: null, violation_reason: 'Chưa xác định nguyên nhân' },
    { ma_bg: 'BG002', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '23/06/2026 08:00:00', thoi_gian_nop_tien: '23/06/2026 11:30:00', do_tre_gio: 3.5, violation_reason: 'Chậm nộp tiền' },
  ]);

  assert.equal(rows[0].delayHours, null);
  assert.equal(rows[0].delayLabel, 'Chưa đủ dữ liệu');
  assert.equal(rows[0].violationReason, 'Chưa xác định nguyên nhân');
  assert.equal(rows[1].delayHours, 3.5);
  assert.equal(rows[1].delayLabel, '3.5h');
  assert.equal(rows[1].violationReason, 'Chậm nộp tiền');
});

test('buildViolationGroupTabs lists Chậm nộp tiền first and marks it highlighted', () => {
  const tabs = buildViolationGroupTabs({
    total_failed: 10,
    delayed_cash_count: 4,
    other_failed_count: 3,
    unknown_count: 3,
  });

  assert.equal(tabs[0].slug, 'delayed_cash');
  assert.equal(tabs[0].highlight, true);
  assert.equal(tabs[0].count, 4);
  assert.ok(tabs.slice(1).every((tab) => tab.highlight === false));

  const bySlug = Object.fromEntries(tabs.map((t) => [t.slug, t.count]));
  assert.equal(bySlug.other, 3);
  assert.equal(bySlug.unknown, 3);
  assert.equal(bySlug.all, 10);
});

test('buildViolationGroupTabs defaults counts to 0 when the summary is empty, without losing the "all" tab', () => {
  const tabs = buildViolationGroupTabs();
  assert.equal(tabs.find((t) => t.slug === 'all').count, 0);
  assert.equal(tabs.length, 4);
});
