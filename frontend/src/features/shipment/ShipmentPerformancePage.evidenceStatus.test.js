import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  STATUS_FILTER_OPTIONS,
  PERIOD_FILTER_OPTIONS,
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
  assert.match(source, /if \(nextStatus !== 'failed'\) \{\s*\n\s*patch\.reason = '';/);
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
  assert.match(source, /const patch = \{ status: nextStatus, page: '' \};/);
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

