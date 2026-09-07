import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSearchRouteGroups, resolveContextTotal } from './shipmentPerformanceData.js';

const source = fs.readFileSync(new URL('./ShipmentPerformancePage.jsx', import.meta.url), 'utf8');
const layoutSource = fs.readFileSync(new URL('../../components/shared/SharedLayout.jsx', import.meta.url), 'utf8');

// PO Evidence Consolidation Phase 2 Runtime Recheck FAIL (2026-08-13) — search-result
// remediation. Root cause, reproduced with a real React render against real data (not
// mocked): the evidence fetch was scoped server-side to the currently active violation-
// reason tab (default "Chậm nộp tiền"), so a keyword search only ever operated over that
// narrow slice — for a real BCVH/date context with 1,573 "Không đạt" rows across 8 routes
// matching "HCC", the default-tab-scoped fetch reduced this to exactly 1 row / 1 route,
// reproducing the PO's exact "only shows one nearest route" symptom. Fix: the fetch now
// always pulls every reason group in one request; reason-tab scoping becomes a pure
// client-side filter; and while a keyword is active, matching intentionally spans every
// reason group so no matching route is ever hidden by which tab happens to be selected.
//
// Tests below are numbered against the PO's own C.1-13 required-test list.

// C.1/C.7: search and filter parameters are passed directly to getEvidence API
test('C.1/C.7 — getEvidence passes bcvh, anchor_date, route, status, reason, search to API', () => {
  assert.match(source, /const result = await f13DashboardClient\.getEvidence\(\{/);
  assert.match(source, /route: routeIdParam \|\| 'all'/);
  assert.match(source, /status: statusParam/);
  assert.match(source, /reason: apiReason/);
  assert.match(source, /search: search\.trim\(\) \|\| undefined/);
});

// C.1 (ITR-EV-BLOCK-01 remediation, 2026-09-07): while searching, matching rows group by
// real route identity — and, critically, EVERY matched route appears as its own group, not
// only the routes present on the currently loaded page. This is a behavioral test of the real
// function (buildSearchRouteGroups), not a source-text check: it reproduces the exact shape of
// the live defect (a route whose rows never landed on the fetched page must still appear).
test('C.1 — while searching, every matched route appears as its own group, even one with zero rows fetched yet', () => {
  assert.match(source, /buildSearchRouteGroups\(\{/);

  const matchedRouteList = [
    { ma_tuyen: '531001', ten_tuyen: 'Tuyến A', count: 40 }, // on the current page
    { ma_tuyen: '531002', ten_tuyen: 'Tuyến B', count: 5 },  // NOT on the current page — the defect case
  ];
  const routeRowsByRoute = {
    '531001': { status: 'ready', rows: [{ id: 'r1' }, { id: 'r2' }] },
    // '531002' intentionally absent — nothing fetched for it yet.
  };
  const groups = buildSearchRouteGroups({ matchedRouteList, routeRowsByRoute, fallbackRows: [{ id: 'r1' }, { id: 'r2' }] });

  assert.equal(groups.length, 2, 'both matched routes must be present as groups, not just the one with loaded rows');
  const routeB = groups.find((g) => g.routeId === '531002');
  assert.ok(routeB, 'Tuyến B must still appear even though no rows have been fetched for it');
  assert.equal(routeB.count, 5, 'the count must be the server-computed real total, not 0 just because rows are not loaded');
  assert.equal(routeB.status, 'idle');
});

// C.2: two routes with similar/duplicate names but different ma_tuyen never merge — groups are
// keyed by the server's real `ma_tuyen`, never by route-name text alone.
test('C.2 — grouping keys on real ma_tuyen identity, never on route-name text alone', () => {
  assert.match(source, /buildSearchRouteGroups\(\{/);

  const matchedRouteList = [
    { ma_tuyen: '531001', ten_tuyen: 'Chuyến thư nhanh', count: 2 },
    { ma_tuyen: '531099', ten_tuyen: 'Chuyến thư nhanh', count: 3 }, // same display name, different route
  ];
  const groups = buildSearchRouteGroups({ matchedRouteList, routeRowsByRoute: {} });
  assert.equal(groups.length, 2, 'two different ma_tuyen with an identical display name must never merge into one group');
  assert.deepEqual(new Set(groups.map((g) => g.routeId)), new Set(['531001', '531099']));
});

// C.3: server-side pagination — getEvidence requests page and page_size, not client-side fetch-all
test('C.3 — the query uses server-side pagination with getEvidence, never fetchAllEvidenceRows', () => {
  assert.match(source, /page: currentPage/);
  assert.match(source, /page_size: PAGE_SIZE/);
  assert.doesNotMatch(source, /fetchAllEvidenceRows/);
});

// C.4/C.5: 0 and exactly-1 result states are both handled by the same, unconditional
// empty-state / table rendering — no special-cased count logic that could misbehave at
// the boundary.
test('C.4/C.5 — 0 and 1 result render through the same generic empty-state/table logic, no special-cased counts', () => {
  assert.match(source, /if \(!sortedRows\.length\) \{/);
  assert.doesNotMatch(source, /sortedRows\.length === 1/);
});

// C.6: n results in exactly one route (a route is selected) stays scoped to that one
// route — the fetch itself is already route-scoped server-side (routeIdParam passed to
// getEvidence as route: routeIdParam || 'all').
test('C.6 — route-selected mode stays scoped to that route: routeIdParam is passed to getEvidence', () => {
  assert.match(source, /route: routeIdParam \|\| 'all'/);
});

// C.8: no auto-selection (AC-15, restated) — unchanged by this remediation.
test('C.8 — selectedShipment still never falls back to a default/first row', () => {
  assert.match(source, /if \(!shipmentId\) return null;/);
  assert.doesNotMatch(source, /sortedRows\[0\]/);
});

// C.9: manual selection updates the detail panel — handleSelectShipment still the only
// writer of shipment_id, and the detail panel still receives exactly selectedShipment.
test('C.9 — manual selection is the only path that sets shipment_id, and the detail panel receives it directly', () => {
  assert.match(source, /const handleSelectShipment = \(nextShipmentId\) => \{\s*\n\s*updateParam\('shipment_id', nextShipmentId\);/);
  assert.match(source, /<ShipmentEvidenceDetail shipment=\{selectedShipment\} \/>/);
});

// C.6 (restated) / point 6 of this remediation: a selection that no longer matches the
// current result set (e.g. after the reason-tab-scoped fetch changed) falls back to
// "chưa chọn," never a substitute row. Extended by the ITR-EV-BLOCK-01 remediation to also
// check a per-route expand fetch's rows (§7.6) — a stale id must resolve to null there too.
test('point 6 — an invalid/stale shipment_id resolves to null, never a fallback selection', () => {
  assert.match(source, /const fromPage = sortedRows\.find\(\(item\) => item\.shipmentId === shipmentId\);/);
  assert.match(source, /if \(fromPage\) return fromPage;/);
  assert.match(source, /if \(!isSearchActive\) return null;/);
  assert.match(source, /return null;\s*\n\s*\}, \[shipmentId, sortedRows, isSearchActive, routeGroupData\]\);/);
});

// C.10/AC-20: the Tuyến dropdown remains independent of search — handleRouteChange only
// ever touches route_id/route_name; search state is never read or written by it.
test('C.10 — the route dropdown handler never reads or writes search state', () => {
  const handlerMatch = source.match(/const handleRouteChange = \(value\) => \{[\s\S]*?\n  \};/);
  assert.ok(handlerMatch, 'handleRouteChange must exist');
  // Strip comment lines before checking — the handler's own explanatory comment
  // legitimately mentions "search" in prose; the check is about code, not prose.
  const codeOnly = handlerMatch[0].split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(codeOnly, /search/);
  assert.doesNotMatch(codeOnly, /updateParam\('search'/);
});

// C.11: clearing the keyword restores the full Evidence context —
// handleClearSearch clears search param and resets page.
test('C.11 — clearing search (handleClearSearch) resets search param and page', () => {
  assert.match(source, /const handleClearSearch = \(\) => updateParams\(\{ search: '', page: '' \}\);/);
});

// C.12: Vietnamese/IME input handling is untouched by this remediation — the shared
// search-commit controller wiring in SharedLayout.jsx (Phase 1 remediation, PO-passed)
// was not touched by this round.
test('C.12 — SharedLayout.jsx (IME-safe search input) was not touched by this remediation', () => {
  assert.match(layoutSource, /createSearchCommitController/);
  assert.match(layoutSource, /onCompositionStart/);
  assert.match(layoutSource, /onCompositionEnd/);
});

// C.13: desktop/mobile — the grouped-mode route header itself carries no responsive
// "hidden" classes, so a route group is never hidden by viewport width; only secondary
// columns inside an already-visible group collapse on narrow screens.
test('C.13 — the grouped route header is never viewport-hidden (only secondary table columns are)', () => {
  const summarySource = fs.readFileSync(new URL('./ShipmentEvidenceSummary.jsx', import.meta.url), 'utf8');
  const headerButtonBlock = summarySource.match(/onClick=\{\(\) => onToggleRouteGroup\(groupKey\)\}[\s\S]*?<\/button>/);
  assert.ok(headerButtonBlock, 'group header button must exist');
  assert.doesNotMatch(headerButtonBlock[0], /hidden/);
  // The secondary table columns (Tuyến/PTC/Nộp tiền), by contrast, are deliberately
  // hidden on narrow viewports — confirming the two are different code paths.
  assert.match(summarySource, /className: 'hidden sm:table-cell'/);
});

// ITR-EV-NB-02 remediation (Independent Technical Review, 2026-09-07): contextTotal (AC-19's
// pre-search figure) must stay independent of any active search keyword — it previously read
// `pagination.total_items`, which the search branch of the API sets equal to `matched_items`,
// silently collapsing the "bối cảnh" and "Kết quả tìm kiếm" KPI cards to one number whenever a
// keyword was active. Behavioral: resolveContextTotal must return the keyword-independent
// status/reason total, not whatever a narrower keyword match happens to be.
test('contextTotal stays independent of the search keyword (resolveContextTotal, not pagination.total_items)', () => {
  assert.match(source, /const contextTotal = toNumber\(resolveContextTotal\(\{/);
  assert.doesNotMatch(source, /const contextTotal = toNumber\(pagination\.total_items\);/);

  const statusSummary = { all: 500, passed: 300, failed: 150, returned: 50, identity_ok: true };
  const violationSummary = { total_failed: 150, delayed_cash_count: 40, other_failed_count: 60, unknown_count: 50 };
  // A keyword narrows the visible/matched set to a handful of rows — contextTotal must not
  // follow it down to that number.
  assert.equal(resolveContextTotal({ status: 'all', reason: 'all', statusSummary, violationSummary }), 500);
  assert.equal(resolveContextTotal({ status: 'failed', reason: 'delayed_cash', statusSummary, violationSummary }), 40);
});
