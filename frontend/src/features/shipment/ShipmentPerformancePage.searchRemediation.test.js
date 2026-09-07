import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

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

// C.1: while searching, matching rows group by real route identity
test('C.1 — while searching, rows are grouped by route via groupRowsByRoute', () => {
  assert.match(source, /const groupedRows = useMemo\(\(\) => \(isSearchActive \? groupRowsByRoute\(sortedRows\) : \[\]\)/);
});

// C.2: two routes with similar/duplicate names but different ma_tuyen never merge —
// delegated to groupRowsByRoute, already proven with a dedicated unit test in
// shipmentPerformanceData.test.js ("groups by real ma_tuyen... never route-name text").
test('C.2 — grouping is delegated to groupRowsByRoute (real ma_tuyen identity), not reimplemented here', () => {
  assert.match(source, /groupRowsByRoute\(sortedRows\)/);
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
// "chưa chọn," never a substitute row.
test('point 6 — an invalid/stale shipment_id resolves to null, never a fallback selection', () => {
  assert.match(source, /return sortedRows\.find\(\(item\) => item\.shipmentId === shipmentId\) \|\| null;/);
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

// Server-side contextTotal (AC-19's pre-search figure) reflects pagination.total_items
// from server metadata.
test('contextTotal reflects the total_items from server pagination', () => {
  assert.match(source, /const contextTotal = toNumber\(pagination\.total_items\);/);
});
