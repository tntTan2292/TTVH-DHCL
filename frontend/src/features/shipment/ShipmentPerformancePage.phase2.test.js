import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mapEvidenceApiRow, resolveContextTotal } from './shipmentPerformanceData.js';

const source = fs.readFileSync(new URL('./ShipmentPerformancePage.jsx', import.meta.url), 'utf8');

// Phase 2 Evidence Consolidation — search-result-presentation contract (Product Owner
// finding, 2026-08-12, F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md Section 14,
// AC-15..AC-23) plus the screen-rebuild contract (Section 4/5, this same checkpoint).
// Source-level regression guards — this repository has no React rendering/jsdom harness,
// consistent with the existing test files for this component.

// AC-15: typing a keyword only filters; it never auto-selects a representative row.
test('selectedShipment is derived only from an explicit shipment_id match, never a fallback to the first row', () => {
  assert.match(source, /const selectedShipment = useMemo\(\(\) => \{/);
  assert.match(source, /if \(!shipmentId\) return null;/);
  assert.doesNotMatch(source, /sortedRows\[0\] \|\| null/);
  assert.doesNotMatch(source, /firstSelectable/);
});

// AC-16: the exact required summary line, sourced from the shared pure formatter.
test('the search result summary uses the exact required wording via formatSearchResultSummary', () => {
  assert.match(source, /formatSearchResultSummary/);
  assert.match(source, /isSearchActive \? \(/);
});

// AC-17/AC-18: grouped mode shows every matching route as its own expandable group, not
// only the first one — ShipmentEvidenceSummary is handed the full `groups` array with no
// truncation (e.g. no `.slice(0, 1)` / `[0]` narrowing before it reaches the widget).
test('every matching route group is passed through to the table widget, not just the first', () => {
  assert.match(source, /groups=\{groupedRows\}/);
  assert.doesNotMatch(source, /groupedRows\[0\]/);
  assert.doesNotMatch(source, /groupedRows\.slice\(0,\s*1\)/);
});

// AC-19 (ITR-EV-NB-02 remediation, 2026-09-07): three distinct counts — pre-search context
// total, post-search result count, and the selected shipment — must never be conflated into a
// single figure. `contextTotal` is wired to `resolveContextTotal` (real behavior asserted
// below, not just presence in source); `searchResultCount` stays sourced from
// `searchMeta.matched_items` (the real defect this fixed was `contextTotal` also reading
// `pagination.total_items`, which in the search branch of the API IS `matched_items`).
test('three distinct counts are computed and rendered: context total, search result count, selected shipment', () => {
  assert.match(source, /const contextTotal = toNumber\(resolveContextTotal\(\{/);
  assert.match(source, /const searchResultCount = isSearchActive \? \(searchMeta\.matched_items \?\? pagination\.total_items\) : null;/);
  assert.match(source, /Tổng Evidence \(bối cảnh\)/);
  assert.match(source, /Kết quả tìm kiếm/);
  assert.match(source, /Bưu gửi đang chọn/);

  // Behavioral: with a keyword active, resolveContextTotal must NOT collapse to
  // searchMeta.matched_items — it stays the keyword-independent status/reason total.
  const statusSummary = { all: 100, passed: 60, failed: 30, returned: 10, identity_ok: true };
  const violationSummary = { total_failed: 30, delayed_cash_count: 10, other_failed_count: 12, unknown_count: 8 };
  const contextTotal = resolveContextTotal({ status: 'failed', reason: 'all', statusSummary, violationSummary });
  const matchedItemsWhileSearching = 3; // e.g. only 3 of the 30 "Không đạt" rows match a keyword
  assert.equal(contextTotal, 30);
  assert.notEqual(contextTotal, matchedItemsWhileSearching);
});

// AC-20: the Tuyến dropdown remains a separate, independent filter — handleRouteChange
// only ever touches route_id/route_name, never search, and vice versa.
test('the route selector and the search box update independent URL params', () => {
  assert.match(source, /const handleRouteChange = \(value\) => \{/);
  assert.match(source, /updateParams\(\{ route_id: value, route_name: value \? \(option\?\.label \|\| ''\) : '', page: '' \}\);/);
  assert.doesNotMatch(source, /handleRouteChange[\s\S]{0,200}updateParam\('search'/);
});

// AC-21: explicit 0/1/n result states exist via the shared empty state plus the flat/
// grouped table widget itself, and a clear-keyword control is present and reused in the
// search summary region.
test('a clear-keyword control exists in both the empty state and the active search summary', () => {
  const clearMatches = source.match(/Xóa từ khóa/g) || [];
  assert.ok(clearMatches.length >= 2, 'expected the clear-keyword control in both the empty state and the search summary');
  assert.match(source, /onClick=\{handleClearSearch\}/);
});

// AC-22: reconciliation/grouping must use real ma_bg/ma_tuyen values — the row mapper
// (mapEvidenceApiRow, shipmentPerformanceData.js) keys every row on real `ma_tuyen` (routeId)
// and `ma_bg` (shipmentId), and search-result grouping (buildSearchRouteGroups,
// ITR-EV-BLOCK-01 remediation) groups by the server's real `ma_tuyen`, never by route-name
// text alone. Behavioral, not source-text: calls the real functions with real-shaped input.
test('rows carry real routeId/shipmentId identity and grouping is delegated to the real-identity grouper', () => {
  assert.match(source, /mapEvidenceApiRow\(item, \{ bcvhId, bcvhName, routeIdParam, routeName, analysisDate \}\)/);
  assert.match(source, /buildSearchRouteGroups\(\{/);

  const mapped = mapEvidenceApiRow(
    { ma_bg: 'BG-1', ma_tuyen: '531001', ten_tuyen: 'Tuyến A', danh_gia_2026: 'Không đạt', status_group: 'failed' },
    { bcvhId: '533140', bcvhName: 'BCVH X', routeIdParam: '', routeName: '', analysisDate: '2026-09-01' },
  );
  assert.equal(mapped.routeId, '531001');
  assert.equal(mapped.shipmentId, 'BG-1');
});

// AC-23: no interim patch to ShipmentExecutiveBrief — the file no longer exists at all
// (its four values are merged directly into the PageContainer header), and nothing
// imports it.
test('ShipmentExecutiveBrief.jsx no longer exists and is not imported anywhere in the shipment feature', () => {
  assert.equal(fs.existsSync(new URL('./ShipmentExecutiveBrief.jsx', import.meta.url)), false);
  assert.doesNotMatch(source, /ShipmentExecutiveBrief/);
});

// Section 5 widget disposition: Impact Overview, Recommendation, and Drilldown are
// removed entirely (files deleted, not just unrendered).
test('ShipmentImpactOverview, ShipmentRecommendation, and ShipmentDrilldown are all removed', () => {
  ['ShipmentImpactOverview', 'ShipmentRecommendation', 'ShipmentDrilldown'].forEach((name) => {
    assert.equal(fs.existsSync(new URL(`./${name}.jsx`, import.meta.url)), false, `${name}.jsx should be deleted`);
    assert.doesNotMatch(source, new RegExp(name));
  });
});

// Section 4/9: violation group tabs, server-sourced counts, reused from
// routeViolationEvidenceData.js rather than re-derived.
test('violation group tabs are built from the shared buildViolationGroupTabs helper, not reimplemented', () => {
  assert.match(source, /import \{ buildViolationGroupTabs, buildBackToRouteRankingLink, isValidReturnTo \} from '\.\.\/route\/routeViolationEvidenceData';/);
  assert.match(source, /buildViolationGroupTabs\(violationSummary\)/);
});

// Section 9: conditional Tuyến column — only shown in "Tất cả tuyến" mode.
test('the Tuyến column is conditional on "Tất cả tuyến" mode (no route_id selected)', () => {
  assert.match(source, /showRouteColumn=\{!routeIdParam\}/);
});

// AC-11 (restated, still applies to the Phase 2 rebuild): no shell/placeholder wording
// anywhere in the merged screen.
test('no shell/placeholder disclaimer text remains anywhere in the page', () => {
  assert.doesNotMatch(source, /shell/i);
  assert.doesNotMatch(source, /placeholder/i);
  assert.doesNotMatch(source, /sẽ được bổ sung ở ticket sau/);
});

// AC-12: no Recommendation content anywhere.
test('no Recommendation content appears anywhere on the page', () => {
  assert.doesNotMatch(source, /Recommendation/);
  assert.doesNotMatch(source, /Khuyến nghị/);
});

// Evidence-detail panel: never auto-selected, only rendered from the real selection.
test('the evidence-detail panel receives only the real selection, never a default/first row', () => {
  assert.match(source, /<ShipmentEvidenceDetail shipment=\{selectedShipment\} \/>/);
});
