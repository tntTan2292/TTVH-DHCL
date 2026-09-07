import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  STATUS_FILTER_OPTIONS,
  PERIOD_FILTER_OPTIONS,
  resolveReasonParam,
  resolveStatusChangeReasonPatch,
  resolveEmptyStateStatusLabel,
} from './shipmentPerformanceData.js';
import { buildViolationEvidenceLink } from '../route/routeViolationEvidenceData.js';

const source = fs.readFileSync(new URL('./ShipmentPerformancePage.jsx', import.meta.url), 'utf8');
const summarySource = fs.readFileSync(new URL('./ShipmentEvidenceSummary.jsx', import.meta.url), 'utf8');
const detailSource = fs.readFileSync(new URL('./ShipmentEvidenceDetail.jsx', import.meta.url), 'utf8');
const routeSource = fs.readFileSync(new URL('../route/RoutePerformancePage.jsx', import.meta.url), 'utf8');

// T-F02: Trạng thái bưu gửi (All / Đạt / Không đạt / Chuyển hoàn)
test('T-F02: STATUS_FILTER_OPTIONS exports all, passed, failed, returned with exact PO labels', () => {
  assert.deepEqual(STATUS_FILTER_OPTIONS, [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'passed', label: 'Đạt' },
    { value: 'failed', label: 'Không đạt' },
    { value: 'returned', label: 'Chuyển hoàn' },
  ]);
});

test('T-F02: ShipmentPerformancePage defaults status to all and renders 4 status cards', () => {
  assert.match(source, /const statusParam = searchParams\.get\('status'\) \|\| 'all';/);
  assert.match(source, /Tất cả trạng thái/);
  assert.match(source, /Đạt/);
  assert.match(source, /Không đạt/);
  assert.match(source, /Chuyển hoàn/);
  assert.match(source, /identity_ok/);
});

// T-F03: Violation tabs bar only visible when status === 'failed'
test('T-F03: violation tabs are displayed ONLY when statusParam === failed', () => {
  assert.match(source, /const violationTabsBar = statusParam === 'failed' \?/);
});

test('T-F03: switching away from failed clears reason; switching to failed defaults reason to all', () => {
  assert.match(source, /const handleStatusChange = \(nextStatus\) => \{/);
  assert.match(source, /updateParams\(\{ status: nextStatus, reason: resolveStatusChangeReasonPatch\(nextStatus\), page: '' \}\)/);
});

// I1 integration-defect regression (2026-09-07): real E2E testing against real data found that
// switching status away from 'failed' and back (e.g. Chuyển hoàn -> Không đạt, or any status
// card click after a `reason=delayed_cash` value had ever entered the URL — including the very
// first landing from Route Ranking, whose link always seeds that value) silently narrowed the
// "Không đạt" view to only "Chậm nộp tiền", inconsistent with the status card's own displayed
// count. These tests exercise the actual pure functions the fix introduced — not source-text
// regex — so a regression here fails on real behavior, not on incidental wording.
test('T-F03 regression: resolveStatusChangeReasonPatch is deterministic per nextStatus, independent of any prior reason', () => {
  assert.equal(resolveStatusChangeReasonPatch('failed'), 'all');
  assert.equal(resolveStatusChangeReasonPatch('all'), '');
  assert.equal(resolveStatusChangeReasonPatch('passed'), '');
  assert.equal(resolveStatusChangeReasonPatch('returned'), '');
});

test('T-F03 regression: resolveReasonParam defaults to "all", never to a specific violation-reason group', () => {
  assert.equal(resolveReasonParam(null), 'all');
  assert.equal(resolveReasonParam(undefined), 'all');
  assert.equal(resolveReasonParam(''), 'all');
  // An explicit value (e.g. carried over from a reason-tab click, or a stale
  // `reason=delayed_cash` seeded by the Route Ranking link) still passes through unchanged --
  // resolveReasonParam only supplies the "nothing at all" default; the real fix is that
  // handleStatusChange no longer conditions on this value when entering 'failed'.
  assert.equal(resolveReasonParam('delayed_cash'), 'delayed_cash');
});

test('T-F03 regression: repeated status-card round-trips always land on reason=all when re-entering failed', () => {
  // Reproduces the exact real-data sequence that surfaced the defect: Route Ranking seeds
  // reason=delayed_cash in the URL (buildViolationEvidenceLink's own default) -> user clicks
  // "Chuyển hoàn" -> user clicks "Không đạt". `updateParams` deletes the URL key entirely
  // whenever the patch value is '' (an empty string), so the simulation below mirrors that:
  // an empty-string patch means the next resolveReasonParam() call sees no param at all.
  const afterReturned = resolveStatusChangeReasonPatch('returned');
  assert.equal(afterReturned, '', 'leaving failed must clear reason from the URL');
  assert.equal(resolveReasonParam(afterReturned || null), 'all', 'no reason param present must resolve to all, never a leftover group');

  const afterFailedAgain = resolveStatusChangeReasonPatch('failed');
  assert.equal(afterFailedAgain, 'all', 're-entering failed must always resolve to the full Không đạt population, not a narrowed reason group');
});

// T-F04: Route Ranking navigation maintains period and route
test('T-F04: RouteSelectedPanel in RoutePerformancePage passes period and status to buildViolationEvidenceLink', () => {
  assert.match(routeSource, /function RouteSelectedPanel\(\{[\s\S]*?period = 'day'/);
  assert.match(routeSource, /buildViolationEvidenceLink\(\{[\s\S]*?period,\s*\n\s*status: 'all',/);
});

test('T-F04: buildViolationEvidenceLink includes period and status in generated evidence URL', () => {
  const link = buildViolationEvidenceLink({
    analysisDate: '2026-06-23',
    bcvhId: 'BC_HUE01',
    bcvhName: 'BCVH TP Huế',
    routeId: 'R_HUE01_01',
    routeName: 'Tuyến 1',
    period: 'month_to_anchor',
    status: 'all',
  });

  const parsed = new URL(`http://localhost${link}`);
  assert.equal(parsed.searchParams.get('period'), 'month_to_anchor');
  assert.equal(parsed.searchParams.get('status'), 'all');
  assert.equal(parsed.searchParams.get('route_id'), 'R_HUE01_01');
  assert.equal(parsed.searchParams.get('bcvh_id'), 'BC_HUE01');
});

// T-F05: Period selector and handling
test('T-F05: PERIOD_FILTER_OPTIONS exports day and month_to_anchor', () => {
  assert.deepEqual(PERIOD_FILTER_OPTIONS, [
    { value: 'day', label: 'Ngày' },
    { value: 'month_to_anchor', label: 'Kỳ tháng đến ngày neo' },
  ]);
});

test('T-F05: ShipmentPerformancePage has periodSelector with day and month_to_anchor', () => {
  assert.match(source, /const periodSelector = \(/);
  assert.match(source, /<option value="day">Kỳ ngày/);
  assert.match(source, /<option value="month_to_anchor">/);
  assert.match(source, /handlePeriodChange/);
});

// T-F06: Server-side pagination and controls
test('T-F06: paginationControls renders server page info and Next/Prev buttons', () => {
  assert.match(source, /const paginationControls = \(/);
  assert.match(source, /pagination\.page/);
  assert.match(source, /pagination\.total_pages/);
  assert.match(source, /pagination\.total_items/);
  assert.match(source, /handlePageChange\(pagination\.page - 1\)/);
  assert.match(source, /handlePageChange\(pagination\.page \+ 1\)/);
});

test('T-F06: Filter changes (BCVH, route, period, status, reason, search) reset page', () => {
  assert.match(source, /updateParams\(\{ bcvh_id: value, bcvh_name: option\?\.label \|\| '', route_id: '', route_name: '', page: '' \}\)/);
  assert.match(source, /updateParams\(\{ route_id: value, route_name: value \? \(option\?\.label \|\| ''\) : '', page: '' \}\)/);
  assert.match(source, /updateParams\(\{ period: nextPeriod, page: '' \}\)/);
  assert.match(source, /updateParams\(\{ status: nextStatus, reason: resolveStatusChangeReasonPatch\(nextStatus\), page: '' \}\)/);
  assert.match(source, /updateParams\(\{ reason: slug, page: '' \}\)/);
});

// T-F07: Table and detail rendering: Status column and title "Chi tiết bưu gửi F1.3"
test('T-F07: ShipmentEvidenceSummary includes Status column with tones for Đạt, Không đạt, Chuyển hoàn', () => {
  assert.match(summarySource, /label: 'Trạng thái'/);
  assert.match(summarySource, /row\.status/);
  assert.match(summarySource, /tone=\{tone\}/);
});

test('T-F07: ShipmentEvidenceDetail displays status and null-safe reason/delay for non-failed shipments', () => {
  assert.match(detailSource, /isFailed/);
  assert.match(detailSource, /shipment\.status === 'Chuyển hoàn'/);
});

test('T-F07: Screen title is exact PO requirement "Chi tiết bưu gửi F1.3"', () => {
  assert.match(source, /title="Chi tiết bưu gửi F1\.3"/);
});

// I1 integration-defect regression (2026-09-07): real E2E testing found the per-route empty
// state hardcoded "không có bưu gửi vi phạm" regardless of the selected status — misleading
// when status=passed/returned, since an empty Đạt or Chuyển hoàn result is not about
// violations. Reproduced live: route with 0 "Đạt" rows, status=passed selected, title still
// read "...không có bưu gửi vi phạm".
test('T-F07 regression: resolveEmptyStateStatusLabel returns a status-appropriate phrase, not always "vi phạm"', () => {
  assert.equal(resolveEmptyStateStatusLabel('all'), 'bưu gửi');
  assert.equal(resolveEmptyStateStatusLabel('passed'), 'bưu gửi Đạt');
  assert.equal(resolveEmptyStateStatusLabel('failed'), 'bưu gửi vi phạm');
  assert.equal(resolveEmptyStateStatusLabel('returned'), 'bưu gửi Chuyển hoàn');
});

test('T-F07 regression: the per-route empty-state title uses resolveEmptyStateStatusLabel(statusParam), not a hardcoded "vi phạm" string', () => {
  assert.match(source, /không có \$\{resolveEmptyStateStatusLabel\(statusParam\)\}/);
  assert.doesNotMatch(source, /không có bưu gửi vi phạm`/, 'the hardcoded violation-only wording must be gone');
});

// T-F08: Navigation roundtrip Tuyến Ranking → Chi tiết bưu gửi F1.3 → Quay lại Tuyến Ranking
test('T-F08: Navigation roundtrip preserves period, route, and returns to exact Route Ranking state', async () => {
  const { buildBackToRouteRankingLink, isValidReturnTo } = await import('../route/routeViolationEvidenceData.js');

  const routeRankingSearch = 'from_date=2026-08-01&to_date=2026-08-02&bcvh_id=533140&period=month';
  const forwardLink = buildViolationEvidenceLink({
    analysisDate: '2026-08-02',
    bcvhId: '533140',
    bcvhName: 'BCVH Thuận Hóa',
    routeId: '53314018',
    routeName: 'Tuyến A',
    currentSearch: routeRankingSearch,
    period: 'month_to_anchor',
    status: 'all',
  });

  // Verify Forward Link from Route Ranking carries period, route, status='all', and return_to
  const parsed = new URL(`http://localhost${forwardLink}`);
  assert.equal(parsed.pathname, '/f13/evidence');
  assert.equal(parsed.searchParams.get('period'), 'month_to_anchor');
  assert.equal(parsed.searchParams.get('status'), 'all');
  assert.equal(parsed.searchParams.get('route_id'), '53314018');
  assert.equal(parsed.searchParams.get('bcvh_id'), '533140');
  assert.equal(parsed.searchParams.get('return_to'), routeRankingSearch);

  // Verify Evidence page back link extracts return_to safely and points back to Route Ranking
  const returnTo = parsed.searchParams.get('return_to');
  assert.equal(isValidReturnTo(returnTo), true);
  const backLink = buildBackToRouteRankingLink(returnTo);
  assert.equal(backLink, `/f13/ranking/route?${routeRankingSearch}`);

  // Verify Evidence page JSX contains back link element with "Quay lại Tuyến Ranking"
  assert.match(source, /<span>Quay lại Tuyến Ranking<\/span>/);
  assert.match(source, /const backToRouteRankingLink = hasValidReturnTo \? buildBackToRouteRankingLink\(returnToParam\) : null;/);
});

