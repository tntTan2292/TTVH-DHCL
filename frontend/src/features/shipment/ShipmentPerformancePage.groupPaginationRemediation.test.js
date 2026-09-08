import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSearchRouteGroups, runGuardedRouteGroupFetch } from './shipmentPerformanceData.js';

const source = fs.readFileSync(new URL('./ShipmentPerformancePage.jsx', import.meta.url), 'utf8');
const summarySource = fs.readFileSync(new URL('./ShipmentEvidenceSummary.jsx', import.meta.url), 'utf8');

// F13-ROUTE-EVIDENCE-STATUS-02 ITR2-BLOCK-01 remediation (Independent Re-Review, 2026-09-08).
// The §68 remediation of ITR-EV-BLOCK-01 fixed route-level completeness in the grouped search
// view but introduced row-level silent truncation: each expanded route rendered at most 50
// rows against a header showing the route's true (often much larger) count, with no per-group
// pagination and an inert global pagination bar that still cleared expanded groups. Tests below
// are numbered against the ticket's own 3 required-behavior list plus the folded-in ITR2-NB-01.

// Requirement 1: a route with >50 rows must be able to reach page 2 (and beyond) — never
// capped at the first page's 50 rows forever.
test('requirement 1 — a route group with >50 rows exposes page 2 and beyond via its own pagination meta', () => {
  const matchedRouteList = [{ ma_tuyen: '53314072', ten_tuyen: 'Tuyến HCC 72', count: 345 }];

  // Page 1 cached (50 rows, page_size 50, 345 total -> 7 pages).
  const page1 = buildSearchRouteGroups({
    matchedRouteList,
    routeRowsByRoute: {
      '53314072': {
        status: 'ready',
        rows: Array.from({ length: 50 }, (_, i) => ({ id: `p1-${i}` })),
        page: 1,
        pagination: { page: 1, page_size: 50, total_items: 345, total_pages: 7 },
      },
    },
  });
  assert.equal(page1[0].rows.length, 50);
  assert.equal(page1[0].pagination.total_pages, 7);
  assert.equal(page1[0].page, 1);

  // Page 2 cached after the manager clicks "Sau" on the group's own control — a real, distinct
  // page of rows, not the same 50 repeated and not the full 345 materialized at once.
  const page2 = buildSearchRouteGroups({
    matchedRouteList,
    routeRowsByRoute: {
      '53314072': {
        status: 'ready',
        rows: Array.from({ length: 50 }, (_, i) => ({ id: `p2-${i}` })),
        page: 2,
        pagination: { page: 2, page_size: 50, total_items: 345, total_pages: 7 },
      },
    },
  });
  assert.equal(page2[0].rows.length, 50);
  assert.equal(page2[0].page, 2);
  assert.notEqual(page1[0].rows[0].id, page2[0].rows[0].id, 'page 2 must be genuinely different rows from page 1');

  // The last page (7): partial, 345 - 6*50 = 45 rows — still reachable, still correctly reported.
  const lastPage = buildSearchRouteGroups({
    matchedRouteList,
    routeRowsByRoute: {
      '53314072': {
        status: 'ready',
        rows: Array.from({ length: 45 }, (_, i) => ({ id: `p7-${i}` })),
        page: 7,
        pagination: { page: 7, page_size: 50, total_items: 345, total_pages: 7 },
      },
    },
  });
  assert.equal(lastPage[0].rows.length, 45);
  assert.equal(lastPage[0].pagination.total_pages, 7);
});

// Requirement 2: no silent truncation — whenever fewer rows are rendered than the route's true
// count, the pagination meta accompanying those rows must make that explicit (never a bare
// rows array with no indication of the remainder), and the summary component must actually
// render that affordance rather than only carrying it in data.
test('requirement 2 — a partial render always carries explicit pagination meta, never a bare truncated array', () => {
  const matchedRouteList = [{ ma_tuyen: '53314071', ten_tuyen: 'Tuyến HCC 71', count: 242 }];
  const groups = buildSearchRouteGroups({
    matchedRouteList,
    routeRowsByRoute: {
      '53314071': {
        status: 'ready',
        rows: Array.from({ length: 50 }, (_, i) => ({ id: `r${i}` })),
        page: 1,
        pagination: { page: 1, page_size: 50, total_items: 242, total_pages: 5 },
      },
    },
  });
  const group = groups[0];
  assert.ok(group.rows.length < group.count, 'sanity: this is indeed a partial render');
  assert.ok(group.pagination, 'a partial render must always carry pagination meta');
  assert.equal(group.pagination.total_items, group.count, 'pagination.total_items must agree with the route header count — no drift, no hidden data');

  // The component must render this as a visible "Hiển thị X-Y / N" affordance and page
  // controls, not just carry it silently in props.
  assert.match(summarySource, /Hiển thị.*rangeStart.*rangeEnd/s);
  assert.match(summarySource, /RouteGroupPagination/);
  assert.match(summarySource, /onPageChange\(page \+ 1\)/);
  assert.match(summarySource, /onPageChange\(page - 1\)/);
});

// A route whose ENTIRE result fits on one page (<=50) must show no pagination affordance —
// nothing to page through, so no clutter and no misleading "page 1/1" control.
test('a route with <=50 rows renders no pagination affordance (RouteGroupPagination early-returns)', () => {
  assert.match(summarySource, /if \(totalItems <= pageSize && totalPages <= 1\) return null;/);
});

// Requirement 3 / ITR2-NB-01: changing context while a per-route request is in flight must
// never let that request's response reach the screen. This directly exercises the real
// generation-guard orchestration (runGuardedRouteGroupFetch), not a restatement of it.
test('requirement 3 — a context change while a per-route fetch is in flight discards that fetch\'s response', async () => {
  const generationRef = { current: 1 };
  const requestGeneration = generationRef.current; // captured at fetch start, same as fetchRouteGroupRows does

  let applied = null;
  const fetchFn = () => new Promise((resolve) => {
    // Simulate the manager changing keyword/status/reason/period/route while this request is
    // still in flight — the query-context effect bumps the generation synchronously.
    generationRef.current += 1;
    resolve({ meta: { pagination: { page: 1, page_size: 50, total_items: 345, total_pages: 7 } }, data: [{ id: 'stale-row' }] });
  });

  const result = await runGuardedRouteGroupFetch({
    generationRef,
    requestGeneration,
    fetchFn,
    onSuccess: (r) => { applied = r; },
    onError: () => { applied = 'error-should-not-happen'; },
  });

  assert.equal(result.applied, false, 'a stale-context response must never be applied');
  assert.equal(result.stale, true);
  assert.equal(applied, null, 'onSuccess must never be called for a stale-context response — no stale rows can reach state');
});

// The matching non-stale case: no context change happens while the fetch is in flight — the
// response IS applied. Proves the guard only discards genuinely stale responses, never every
// response (which would silently break the feature entirely).
test('a per-route fetch resolving under the SAME context is applied normally', async () => {
  const generationRef = { current: 3 };
  const requestGeneration = generationRef.current;
  let applied = null;

  const result = await runGuardedRouteGroupFetch({
    generationRef,
    requestGeneration,
    fetchFn: () => Promise.resolve({ meta: { pagination: { page: 2, page_size: 50, total_items: 120, total_pages: 3 } }, data: [{ id: 'fresh-row' }] }),
    onSuccess: (r) => { applied = r; },
    onError: () => { applied = 'error-should-not-happen'; },
  });

  assert.equal(result.applied, true);
  assert.ok(applied, 'onSuccess must be called when the context has not changed');
  assert.equal(applied.meta.pagination.page, 2);
});

// An error under a stale context must also be swallowed, not surfaced as a fresh-looking error
// state for a route the manager is no longer even looking at in this context.
test('a per-route fetch error under a STALE context is also discarded, never surfaced as onError', async () => {
  const generationRef = { current: 1 };
  const requestGeneration = generationRef.current;
  let errorApplied = false;

  const result = await runGuardedRouteGroupFetch({
    generationRef,
    requestGeneration,
    fetchFn: () => new Promise((_, reject) => {
      generationRef.current += 1; // context changed mid-flight
      reject(new Error('network failure'));
    }),
    onSuccess: () => {},
    onError: () => { errorApplied = true; },
  });

  assert.equal(result.applied, false);
  assert.equal(result.stale, true);
  assert.equal(errorApplied, false, 'a stale error must never be written into the current context\'s cache');
});

// --- Wiring checks (source-text, matching this suite's existing convention) ---

// The generation counter must be bumped inside the SAME effect that clears routeGroupData/
// expandedRouteKeys on a context change — otherwise a fetch started just before the clear could
// still slip through with a matching (stale) generation number.
test('wiring — contextGenerationRef is bumped in the same effect that clears the per-route cache on context change', () => {
  const effectBlock = source.match(/setRouteGroupData\(\{\}\);\s*\n\s*setExpandedRouteKeys\(new Set\(\)\);\s*\n[\s\S]*?contextGenerationRef\.current \+= 1;/);
  assert.ok(effectBlock, 'contextGenerationRef must be bumped immediately after clearing routeGroupData/expandedRouteKeys in the same effect');
});

// fetchRouteGroupRows must route through the guard, capturing the generation BEFORE starting
// the request (not after it resolves, which would defeat the guard).
test('wiring — fetchRouteGroupRows captures the generation before the request and uses runGuardedRouteGroupFetch', () => {
  assert.match(source, /const requestGeneration = contextGenerationRef\.current;/);
  assert.match(source, /await runGuardedRouteGroupFetch\(\{/);
  assert.match(source, /generationRef: contextGenerationRef/);
  assert.match(source, /requestGeneration,/);
});

// Second facet of ITR2-BLOCK-01: the global pagination bar must not render while grouped
// search mode is active, since paging it would still clear every expanded group's state for
// zero visible benefit (it never paginated grouped data in the first place).
test('wiring — the global pagination bar is hidden while a search is active (grouped mode)', () => {
  assert.match(source, /\{!isSearchActive && paginationControls\}/);
});

// Per-group page changes call the real page, never re-fetching page 1 unconditionally, and are
// wired all the way through to the summary component.
test('wiring — handleRouteGroupPageChange fetches the requested page and is passed to ShipmentEvidenceSummary', () => {
  assert.match(source, /const handleRouteGroupPageChange = \(routeId, newPage\) => \{/);
  assert.match(source, /fetchRouteGroupRows\(routeId, newPage\);/);
  assert.match(source, /onRouteGroupPageChange=\{handleRouteGroupPageChange\}/);
});

// page_size must stay pinned at the existing PAGE_SIZE constant (50) for every per-route
// request — the remediation must never widen the page to "fetch more at once" as a shortcut.
test('wiring — every per-route request still uses the fixed PAGE_SIZE, never a widened limit', () => {
  const fetchBlock = source.match(/const fetchRouteGroupRows = async \(routeId, page = 1\) => \{[\s\S]*?\n  \};/);
  assert.ok(fetchBlock, 'fetchRouteGroupRows must exist');
  assert.match(fetchBlock[0], /page_size: PAGE_SIZE,/);
  assert.doesNotMatch(fetchBlock[0], /page_size:\s*\d/, 'must never hardcode a numeric page_size literal instead of the PAGE_SIZE constant');
});
