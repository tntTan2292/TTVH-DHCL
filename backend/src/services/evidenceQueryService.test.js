const test = require('node:test');
const assert = require('node:assert/strict');
const { EvidenceQueryService, SEARCH_SCOPE_MAX_ROWS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('./evidenceQueryService');

// F13-ROUTE-EVIDENCE-STATUS-02 Phase B1 (Design of Record R0 §10.1). Same fake-repository
// pattern as routePeriodService.test.js: exercises evidenceQueryService's orchestration logic
// (period resolution, status/reason accounting, search flow, scope guard) without touching any
// real database, with per-call counts assertable precisely.

function buildFixture({
    anchorDate = null,
    tenBcvh = 'BCVH Thuận Hóa',
    statusCounts = { all: 0, passed: 0, failed: 0, returned: 0 },
    reasonRows = [],
    page = [],
    scopeCount = 0,
    searchProjection = [],
    idRows = [],
} = {}) {
    const calls = { queryAnchor: 0, statusSummary: 0, reasonSummary: 0, page: 0, scopeCount: 0, projection: 0, byIds: 0 };
    const queryAnchor = async () => {
        calls.queryAnchor += 1;
        return anchorDate ? [{ anchor_date: anchorDate, ten_bcvh: tenBcvh }] : [{ anchor_date: null, ten_bcvh: null }];
    };
    const repository = {
        async getEvidenceStatusSummary() { calls.statusSummary += 1; return statusCounts; },
        async getEvidenceReasonSummary() { calls.reasonSummary += 1; return reasonRows; },
        async getEvidencePage() { calls.page += 1; return page; },
        async getEvidenceScopeCount() { calls.scopeCount += 1; return scopeCount; },
        async getEvidenceSearchProjection() { calls.projection += 1; return searchProjection; },
        async getEvidenceRowsByIds({ ids }) { calls.byIds += 1; return idRows.filter((r) => ids.includes(r.id)); },
    };
    return { service: new EvidenceQueryService({ repository, queryAnchor }), calls };
}

// ============================================================================================
// Validation and defaults.
// ============================================================================================

test('bcvh is required — throws MISSING_PARAM', async () => {
    const { service } = buildFixture();
    await assert.rejects(() => service.getEvidence({}), (err) => err.code === 'MISSING_PARAM');
});

test('an invalid anchor_date throws INVALID_DATE', async () => {
    const { service } = buildFixture();
    await assert.rejects(() => service.getEvidence({ bcvh: '533140', anchor_date: '31/12/2026' }), (err) => err.code === 'INVALID_DATE');
});

test('§4.2: a BCVH with no data at or before the ceiling returns the explicit empty payload, no fallback', async () => {
    const { service, calls } = buildFixture({ anchorDate: null });
    const result = await service.getEvidence({ bcvh: '999999' });
    assert.equal(result.meta.anchor_date, null);
    assert.deepEqual(result.data, []);
    assert.equal(result.meta.status_summary.identity_ok, true);
    assert.equal(calls.statusSummary, 0, 'no facet query should run once the anchor lookup is empty');
    assert.equal(calls.page, 0);
});

test('D-OPEN-02 (PO decision): default status is "all" when the param is omitted, not "failed"', async () => {
    const { service, calls } = buildFixture({
        anchorDate: '2026-08-31',
        statusCounts: { all: 10, passed: 6, failed: 3, returned: 1 },
        page: [{ ma_bg: 'X' }],
    });
    const result = await service.getEvidence({ bcvh: '533140' });
    assert.equal(result.meta.pagination.total_items, 10, 'default scope must be the whole "all" bucket, not just failed');
    assert.equal(calls.page, 1);
});

test('unrecognized status/period/sort/order values fall back to their defaults rather than erroring', async () => {
    const { service } = buildFixture({ anchorDate: '2026-08-31', statusCounts: { all: 1, passed: 1, failed: 0, returned: 0 } });
    const result = await service.getEvidence({ bcvh: '533140', status: 'not-a-real-status', period: 'not-a-real-period', sort: 'nope', order: 'sideways' });
    assert.equal(result.meta.period.key, 'day');
    assert.equal(result.meta.pagination.total_items, 1); // fell back to status='all'
});

test('page and page_size are clamped to sane bounds', async () => {
    const { service } = buildFixture({ anchorDate: '2026-08-31', statusCounts: { all: 500, passed: 500, failed: 0, returned: 0 } });
    const r1 = await service.getEvidence({ bcvh: '533140', page: '0', page_size: '99999' });
    assert.equal(r1.meta.pagination.page, 1);
    assert.equal(r1.meta.pagination.page_size, MAX_PAGE_SIZE);

    const r2 = await service.getEvidence({ bcvh: '533140', page_size: 'not-a-number' });
    assert.equal(r2.meta.pagination.page_size, DEFAULT_PAGE_SIZE);
});

// ============================================================================================
// T-B11 — period resolution: `day` is exactly [anchor,anchor]; `month_to_anchor` is
// [<month>-01, anchor] with days_in_period = day-of-month of anchor.
// ============================================================================================

test('T-B11: period=day resolves to a single-day window', async () => {
    const { service } = buildFixture({ anchorDate: '2026-08-18', statusCounts: { all: 0, passed: 0, failed: 0, returned: 0 } });
    const result = await service.getEvidence({ bcvh: '533140', period: 'day' });
    assert.deepEqual(result.meta.period, { key: 'day', start: '2026-08-18', end: '2026-08-18', days_in_period: 1 });
});

test('T-B11: period=month_to_anchor resolves to [month-01, anchor] with the correct days_in_period', async () => {
    const { service } = buildFixture({ anchorDate: '2026-08-18', statusCounts: { all: 0, passed: 0, failed: 0, returned: 0 } });
    const result = await service.getEvidence({ bcvh: '533140', period: 'month_to_anchor' });
    assert.deepEqual(result.meta.period, { key: 'month_to_anchor', start: '2026-08-01', end: '2026-08-18', days_in_period: 18 });
});

// ============================================================================================
// T-B05 — anchor_date resolves per BCVH (never system-wide). Regression guard for the
// ITR3-BLOCK-01 defect class caught on the Tuyến Ranking side.
// ============================================================================================

test('T-B05: two BCVH with different MAX(ngay_do_kiem) each receive their own anchor_date', async () => {
    const calls = [];
    const queryAnchorFactory = (anchorByBcvh) => async (bcvh) => {
        calls.push(bcvh);
        return [{ anchor_date: anchorByBcvh[bcvh], ten_bcvh: `BCVH ${bcvh}` }];
    };
    const repository = {
        async getEvidenceStatusSummary() { return { all: 0, passed: 0, failed: 0, returned: 0 }; },
        async getEvidenceReasonSummary() { return []; },
        async getEvidencePage() { return []; },
    };
    const service = new EvidenceQueryService({
        repository,
        queryAnchor: queryAnchorFactory({ 533140: '2026-09-05', 531600: '2026-07-28' }),
    });

    const r1 = await service.getEvidence({ bcvh: '533140' });
    const r2 = await service.getEvidence({ bcvh: '531600' });
    assert.equal(r1.meta.anchor_date, '2026-09-05');
    assert.equal(r2.meta.anchor_date, '2026-07-28');
    assert.notEqual(r1.meta.anchor_date, r2.meta.anchor_date, 'must never collapse to one system-wide anchor');
});

// ============================================================================================
// C-07 / T-B04 — status_summary.identity_ok correctly flips false on a real inconsistency,
// never silently assumed true.
// ============================================================================================

test('T-B04: identity_ok is true when all = passed+failed+returned', async () => {
    const { service } = buildFixture({ anchorDate: '2026-08-31', statusCounts: { all: 10, passed: 6, failed: 3, returned: 1 } });
    const result = await service.getEvidence({ bcvh: '533140' });
    assert.equal(result.meta.status_summary.identity_ok, true);
});

test('T-B04: identity_ok flips to false when the repository returns an inconsistent set (deliberately broken fixture)', async () => {
    const { service } = buildFixture({ anchorDate: '2026-08-31', statusCounts: { all: 10, passed: 6, failed: 3, returned: 0 } }); // 6+3+0=9 != 10
    const result = await service.getEvidence({ bcvh: '533140' });
    assert.equal(result.meta.status_summary.identity_ok, false);
});

// ============================================================================================
// violation_summary derivation from reason facet rows.
// ============================================================================================

test('violation_summary sums the three reason groups from getEvidenceReasonSummary rows', async () => {
    const { service } = buildFixture({
        anchorDate: '2026-08-31',
        statusCounts: { all: 20, passed: 10, failed: 8, returned: 2 },
        reasonRows: [
            { reason: 'Chậm nộp tiền', n: 3 },
            { reason: 'Không đạt khác', n: 4 },
            { reason: 'Chưa xác định nguyên nhân', n: 1 },
        ],
    });
    const result = await service.getEvidence({ bcvh: '533140' });
    assert.deepEqual(result.meta.violation_summary, {
        total_failed: 8, delayed_cash_count: 3, other_failed_count: 4, unknown_count: 1,
    });
});

// ============================================================================================
// _resolveNonSearchTotalItems: total_items tracks the currently selected status/reason without
// a separate COUNT query (asserted indirectly via call counts staying at exactly 1 page call).
// ============================================================================================

test('total_items for status=failed + a specific reason uses the matching reason facet count, not the whole failed bucket', async () => {
    const { service, calls } = buildFixture({
        anchorDate: '2026-08-31',
        statusCounts: { all: 20, passed: 10, failed: 8, returned: 2 },
        reasonRows: [
            { reason: 'Chậm nộp tiền', n: 3 },
            { reason: 'Không đạt khác', n: 4 },
            { reason: 'Chưa xác định nguyên nhân', n: 1 },
        ],
        page: [{ ma_bg: 'A' }, { ma_bg: 'B' }, { ma_bg: 'C' }],
    });
    const result = await service.getEvidence({ bcvh: '533140', status: 'failed', reason: 'delayed_cash' });
    assert.equal(result.meta.pagination.total_items, 3);
    assert.equal(calls.page, 1, 'exactly one page query, no separate count query');
});

test('total_items for status=returned uses the returned bucket', async () => {
    const { service } = buildFixture({ anchorDate: '2026-08-31', statusCounts: { all: 20, passed: 10, failed: 8, returned: 2 }, page: [{}, {}] });
    const result = await service.getEvidence({ bcvh: '533140', status: 'returned' });
    assert.equal(result.meta.pagination.total_items, 2);
});

test('an empty non-search bucket (total_items=0) does not issue a page query at all', async () => {
    const { service, calls } = buildFixture({ anchorDate: '2026-08-31', statusCounts: { all: 0, passed: 0, failed: 0, returned: 0 } });
    const result = await service.getEvidence({ bcvh: '533140', status: 'passed' });
    assert.equal(result.meta.pagination.total_items, 0);
    assert.equal(result.meta.pagination.total_pages, 0);
    assert.deepEqual(result.data, []);
    assert.equal(calls.page, 0);
});

// ============================================================================================
// T-B09 — scope_guard: over-limit scope reports exceeded=true and materializes nothing.
// ============================================================================================

test('T-B09: search scope over SEARCH_SCOPE_MAX_ROWS reports scope_guard.exceeded=true and never runs the projection query', async () => {
    const { service, calls } = buildFixture({
        anchorDate: '2026-08-31',
        statusCounts: { all: SEARCH_SCOPE_MAX_ROWS + 1, passed: SEARCH_SCOPE_MAX_ROWS + 1, failed: 0, returned: 0 },
        scopeCount: SEARCH_SCOPE_MAX_ROWS + 1,
    });
    const result = await service.getEvidence({ bcvh: '533140', search: 'hcc' });
    assert.equal(result.meta.scope_guard.exceeded, true);
    assert.equal(result.meta.scope_guard.scope_rows, SEARCH_SCOPE_MAX_ROWS + 1);
    assert.deepEqual(result.data, []);
    assert.equal(result.meta.pagination.total_items, 0);
    assert.equal(calls.scopeCount, 1);
    assert.equal(calls.projection, 0, 'must never materialize the projection once the guard trips');
    assert.equal(calls.byIds, 0);
});

test('search scope at or under the limit proceeds normally', async () => {
    const { service } = buildFixture({
        anchorDate: '2026-08-31',
        statusCounts: { all: 2, passed: 0, failed: 2, returned: 0 },
        scopeCount: 2,
        searchProjection: [
            { id: 1, ma_bg: 'HCC-1', ma_tuyen: '53001', ten_tuyen: 'Tuyến HCC', ten_bcvh: 'BCVH A', do_tre_gio: 5 },
            { id: 2, ma_bg: 'X', ma_tuyen: '53002', ten_tuyen: 'Tuyến khác', ten_bcvh: 'BCVH A', do_tre_gio: 1 },
        ],
        idRows: [{ id: 1, ma_bg: 'HCC-1', do_tre_gio: 5 }],
    });
    const result = await service.getEvidence({ bcvh: '533140', search: 'hcc' });
    assert.equal(result.meta.scope_guard.exceeded, false);
    assert.equal(result.meta.search.active, true);
    assert.equal(result.meta.search.matched_items, 1, 'only the HCC row must match the keyword');
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].ma_bg, 'HCC-1');
});

// ============================================================================================
// T-B08 — search matches across the WHOLE filtered scope, not only what would have been "the
// last page" under the old fetchAllEvidenceRows() model. Reproduces the shape of the real
// PO-reported 2026-08-13 defect (search scoped to a narrow slice hid the majority of matches).
// ============================================================================================

test('T-B08: a keyword match buried deep in the scope (well past one page) is still found and counted', async () => {
    // 250 rows, only the very last one (offset 249) matches the keyword -- larger than any
    // single page (default page_size=50), reproducing "search only sees the first page" if the
    // search path were ever wired to run over a single SQL page instead of the full projection.
    const projection = Array.from({ length: 250 }, (_, i) => ({
        id: i + 1,
        ma_bg: i === 249 ? 'FINDME-HCC' : `BG-${i}`,
        ma_tuyen: '53001',
        ten_tuyen: 'Tuyến A',
        ten_bcvh: 'BCVH A',
        do_tre_gio: null,
    }));
    const { service } = buildFixture({
        anchorDate: '2026-08-31',
        statusCounts: { all: 250, passed: 0, failed: 250, returned: 0 },
        scopeCount: 250,
        searchProjection: projection,
        idRows: [{ id: 250, ma_bg: 'FINDME-HCC' }],
    });
    const result = await service.getEvidence({ bcvh: '533140', search: 'hcc', page_size: 50 });
    assert.equal(result.meta.search.matched_items, 1);
    assert.equal(result.meta.pagination.total_items, 1);
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].ma_bg, 'FINDME-HCC');
});

test('T-B08: matched_routes counts distinct real routes among the matched set, not raw row count', async () => {
    const projection = [
        { id: 1, ma_bg: 'A1', ma_tuyen: '53001', ten_tuyen: 'HCC Route', ten_bcvh: 'BCVH A', do_tre_gio: null },
        { id: 2, ma_bg: 'A2', ma_tuyen: '53001', ten_tuyen: 'HCC Route', ten_bcvh: 'BCVH A', do_tre_gio: null },
        { id: 3, ma_bg: 'A3', ma_tuyen: '53002', ten_tuyen: 'HCC Route B', ten_bcvh: 'BCVH A', do_tre_gio: null },
    ];
    const { service } = buildFixture({
        anchorDate: '2026-08-31',
        statusCounts: { all: 3, passed: 0, failed: 3, returned: 0 },
        scopeCount: 3,
        searchProjection: projection,
        idRows: projection,
    });
    const result = await service.getEvidence({ bcvh: '533140', search: 'hcc' });
    assert.equal(result.meta.search.matched_items, 3);
    assert.equal(result.meta.search.matched_routes, 2);
});

// ============================================================================================
// Search pagination: page 2 of a matched set returns the second slice, and total_items/
// total_pages stay based on the full matched set regardless of which page is requested.
// ============================================================================================

test('search results paginate correctly across multiple pages', async () => {
    const projection = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1, ma_bg: `HCC-${i}`, ma_tuyen: '53001', ten_tuyen: 'Tuyến', ten_bcvh: 'BCVH A', do_tre_gio: i,
    }));
    const { service } = buildFixture({
        anchorDate: '2026-08-31',
        statusCounts: { all: 5, passed: 0, failed: 5, returned: 0 },
        scopeCount: 5,
        searchProjection: projection,
        idRows: projection,
    });
    const page1 = await service.getEvidence({ bcvh: '533140', search: 'hcc', page_size: 2, page: 1, sort: 'ma_bg', order: 'asc' });
    const page2 = await service.getEvidence({ bcvh: '533140', search: 'hcc', page_size: 2, page: 2, sort: 'ma_bg', order: 'asc' });
    assert.equal(page1.meta.pagination.total_items, 5);
    assert.equal(page2.meta.pagination.total_items, 5);
    assert.equal(page1.meta.pagination.total_pages, 3);
    assert.equal(page1.data.length, 2);
    assert.equal(page2.data.length, 2);
    assert.notDeepEqual(page1.data.map((r) => r.ma_bg), page2.data.map((r) => r.ma_bg));
});

// ============================================================================================
// ITR-EV-BLOCK-01 remediation (Independent Technical Review, 2026-09-07): `meta.search` must
// carry the full matched-route breakdown (`matched_route_list`), not just a count, so a client
// can render every route the search matched even when most of them fall on pages the browser
// never requests. This is the direct regression test for the reproduced defect: a route whose
// rows only exist beyond the current page must still appear in the list, with its true count.
// ============================================================================================

test('ITR-EV-BLOCK-01: matched_route_list carries every matched route with its full count, not just the routes on the requested page', async () => {
    // Route A: 3 matched rows, all sorted after route B's single row (so with page_size=1,
    // page 1 only contains a route-B row) — this is exactly the shape of the reproduced live
    // defect (a route with a real matched count that never appears on the rendered page).
    const projection = [
        { id: 1, ma_bg: 'HCC-A1', ma_tuyen: '53001', ten_tuyen: 'Tuyến A', ten_bcvh: 'BCVH A', do_tre_gio: null },
        { id: 2, ma_bg: 'HCC-A2', ma_tuyen: '53001', ten_tuyen: 'Tuyến A', ten_bcvh: 'BCVH A', do_tre_gio: null },
        { id: 3, ma_bg: 'HCC-A3', ma_tuyen: '53001', ten_tuyen: 'Tuyến A', ten_bcvh: 'BCVH A', do_tre_gio: null },
        { id: 4, ma_bg: 'HCC-B1', ma_tuyen: '53002', ten_tuyen: 'Tuyến B', ten_bcvh: 'BCVH A', do_tre_gio: null },
    ];
    const { service } = buildFixture({
        anchorDate: '2026-08-31',
        statusCounts: { all: 4, passed: 0, failed: 4, returned: 0 },
        scopeCount: 4,
        searchProjection: projection,
        idRows: projection,
    });

    // page_size=1, ma_bg ASC → page 1 renders only "A1" (Tuyến A). Page 4 (the last page)
    // renders only "B1" (Tuyến B) — either request must still report BOTH routes below.
    const page1 = await service.getEvidence({
        bcvh: '533140', search: 'hcc', page_size: 1, page: 1, sort: 'ma_bg', order: 'asc',
    });

    // The rendered page only contains a Tuyến A row ...
    assert.equal(page1.data.length, 1);
    assert.equal(page1.data[0].ma_tuyen, '53001');

    // ... but matched_route_list must still report BOTH routes, with each route's TRUE count
    // across the whole matched scope — not the count visible on this one page.
    assert.equal(page1.meta.search.matched_routes, 2);
    assert.equal(page1.meta.search.matched_route_list.length, 2);
    const byRoute = Object.fromEntries(page1.meta.search.matched_route_list.map((r) => [r.ma_tuyen, r]));
    assert.equal(byRoute['53001'].count, 3);
    assert.equal(byRoute['53001'].ten_tuyen, 'Tuyến A');
    assert.equal(byRoute['53002'].count, 1);
    assert.equal(byRoute['53002'].ten_tuyen, 'Tuyến B');
});

test('matched_route_list is null when no search is active, and null when scope_guard.exceeded blocks materialization', async () => {
    const { service: noSearchService } = buildFixture({
        anchorDate: '2026-08-31',
        statusCounts: { all: 2, passed: 2, failed: 0, returned: 0 },
        page: [],
    });
    const noSearch = await noSearchService.getEvidence({ bcvh: '533140' });
    assert.equal(noSearch.meta.search.matched_route_list, null);

    const { service: exceededService } = buildFixture({
        anchorDate: '2026-08-31',
        statusCounts: { all: 999999, passed: 0, failed: 999999, returned: 0 },
        scopeCount: SEARCH_SCOPE_MAX_ROWS + 1,
    });
    const exceeded = await exceededService.getEvidence({ bcvh: '533140', search: 'hcc' });
    assert.equal(exceeded.meta.scope_guard.exceeded, true);
    assert.equal(exceeded.meta.search.matched_route_list, null);
});
