const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');

// F13-ROUTE-EVIDENCE-STATUS-02 Phase B1 (Design of Record R0 §10.1). Same in-memory harness as
// FactBuuGuiRepository.overview.test.js / .routePeriod.test.js: replaces `../config/db` with a
// callback shim backed by node:sqlite, then reloads the repository so it binds to the shim.
// Runs the REAL SQL (julianday/GLOB classification included) against a real, isolated
// in-memory database — not mocked responses. Extends the existing shim with `.get()` (used by
// the new Evidence aggregate methods), which prior Evidence-adjacent test harnesses in this
// repository did not need.
function loadRepositoryWithInMemoryDb() {
    const database = new DatabaseSync(':memory:');
    const callbackDb = {
        all(sql, params, callback) {
            try {
                callback(null, database.prepare(sql).all(...params));
            } catch (error) {
                callback(error);
            }
        },
        get(sql, params, callback) {
            try {
                callback(null, database.prepare(sql).get(...params));
            } catch (error) {
                callback(error);
            }
        },
    };
    const dbConfigPath = require.resolve('../config/db');
    require.cache[dbConfigPath] = {
        id: dbConfigPath,
        filename: dbConfigPath,
        loaded: true,
        exports: { db: callbackDb },
        children: [],
        paths: [],
    };
    const repositoryPath = require.resolve('./FactBuuGuiRepository');
    delete require.cache[repositoryPath];
    return { database, repository: require('./FactBuuGuiRepository') };
}

function seedSchema(database) {
    database.exec(`
        CREATE TABLE fact_f13 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ngay_do_kiem TEXT NOT NULL,
            ma_bg TEXT NOT NULL,
            ma_bcvh TEXT NOT NULL,
            ten_bcvh TEXT,
            ma_tuyen TEXT,
            ten_tuyen TEXT,
            danh_gia_2026 TEXT,
            thoi_gian_ptc TEXT,
            thoi_gian_nop_tien TEXT
        );
    `);
}

function insertRow(database, row) {
    database.prepare(`
        INSERT INTO fact_f13
            (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, danh_gia_2026, thoi_gian_ptc, thoi_gian_nop_tien)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        row.ngay_do_kiem, row.ma_bg, row.ma_bcvh, row.ten_bcvh ?? 'BCVH Thuận Hóa',
        row.ma_tuyen ?? '53314001', row.ten_tuyen ?? 'Tuyến A', row.danh_gia_2026 ?? null,
        row.thoi_gian_ptc ?? null, row.thoi_gian_nop_tien ?? null,
    );
}

// ============================================================================================
// T-B01 — Tương đương phân loại (cổng chặn SSOT). The SQL CASE expression in
// evidenceReasonSql.js must classify every real "Không đạt" row identically to
// F13DashboardService's `_classifyViolationReason`, which is built on the real
// RuleF13302 (>3h SSOT). This is the load-bearing proof the whole server-side architecture
// depends on (Design of Record §5.2) — not asserted, executed against real SQLite.
// ============================================================================================

test('T-B01: SQL violation_reason classification matches F13DashboardService._classifyViolationReason on every row shape', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    seedSchema(database);
    const f13DashboardService = require('../services/F13DashboardService');

    const FIXTURES = [
        // Delayed: > 3h gap.
        { ma_bg: 'DELAYED-1', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 12:00:01' },
        { ma_bg: 'DELAYED-2', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '15/06/2026 08:00:00' },
        // Exact 3h00m00s boundary -> NOT delayed (rule is strictly > 3h) -- T-B02 overlaps here.
        { ma_bg: 'BOUNDARY-EXACT', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 11:00:00' },
        // 3h00m01s -> delayed.
        { ma_bg: 'BOUNDARY-OVER', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 11:00:01' },
        // Not delayed: gap <= 3h.
        { ma_bg: 'OTHER-1', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 09:30:00' },
        // Unknown: various missing/unparseable shapes.
        { ma_bg: 'UNKNOWN-PTC-MISSING', danh_gia_2026: 'Không đạt', thoi_gian_ptc: null, thoi_gian_nop_tien: '14/06/2026 09:00:00' },
        { ma_bg: 'UNKNOWN-PTC-GARBAGE', danh_gia_2026: 'Không đạt', thoi_gian_ptc: 'garbage', thoi_gian_nop_tien: '14/06/2026 09:00:00' },
        { ma_bg: 'UNKNOWN-NOP-MISSING', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: null },
        { ma_bg: 'UNKNOWN-NOP-GARBAGE', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: 'garbage' },
        { ma_bg: 'UNKNOWN-BOTH-MISSING', danh_gia_2026: 'Không đạt', thoi_gian_ptc: null, thoi_gian_nop_tien: null },
        // Not "Không đạt" at all -- must not appear in the failed scope, so excluded below by
        // status='failed', but included in the insert set for realism.
        { ma_bg: 'PASSED-1', danh_gia_2026: 'Đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 09:00:00' },
        { ma_bg: 'RETURNED-1', danh_gia_2026: null, thoi_gian_ptc: null, thoi_gian_nop_tien: null },
    ];
    FIXTURES.forEach((row) => insertRow(database, { ...row, ngay_do_kiem: '2026-06-14', ma_bcvh: '533140' }));

    const rows = await repository.getEvidencePage({
        bcvh: '533140', route: 'all', fromDate: '2026-06-14', toDate: '2026-06-14',
        status: 'failed', reason: 'all', sort: 'ma_bg', order: 'asc', limit: 100, offset: 0,
    });

    assert.equal(rows.length, 10, 'exactly the 10 "Không đạt" fixture rows must be returned');
    rows.forEach((row) => {
        const jsReason = f13DashboardService._classifyViolationReason({
            danh_gia_2026: row.danh_gia_2026,
            thoi_gian_ptc: row.thoi_gian_ptc,
            thoi_gian_nop_tien: row.thoi_gian_nop_tien,
        });
        assert.equal(row.violation_reason, jsReason, `SQL/JS classification diverged for ${row.ma_bg}`);
    });
});

test('T-B02: exact 3h00m00s is NOT delayed, 3h00m01s IS delayed (strict > 3h boundary)', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    seedSchema(database);
    insertRow(database, { ngay_do_kiem: '2026-06-14', ma_bg: 'EXACT', ma_bcvh: '533140', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 11:00:00' });
    insertRow(database, { ngay_do_kiem: '2026-06-14', ma_bg: 'OVER', ma_bcvh: '533140', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 11:00:01' });

    const rows = await repository.getEvidencePage({
        bcvh: '533140', route: 'all', fromDate: '2026-06-14', toDate: '2026-06-14',
        status: 'failed', reason: 'all', sort: 'ma_bg', order: 'asc', limit: 10, offset: 0,
    });
    const byId = Object.fromEntries(rows.map((r) => [r.ma_bg, r.violation_reason]));
    assert.equal(byId.EXACT, 'Không đạt khác');
    assert.equal(byId.OVER, 'Chậm nộp tiền');
});

// ============================================================================================
// C-04 — violation_reason is NULL for every row whose danh_gia_2026 is not exactly 'Không đạt'.
// ============================================================================================

test('T-B03: violation_reason is null for every Đạt and Chuyển hoàn row', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    seedSchema(database);
    insertRow(database, { ngay_do_kiem: '2026-06-14', ma_bg: 'P1', ma_bcvh: '533140', danh_gia_2026: 'Đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 09:00:00' });
    insertRow(database, { ngay_do_kiem: '2026-06-14', ma_bg: 'R1', ma_bcvh: '533140', danh_gia_2026: null });
    insertRow(database, { ngay_do_kiem: '2026-06-14', ma_bg: 'R2', ma_bcvh: '533140', danh_gia_2026: '' });

    const rows = await repository.getEvidencePage({
        bcvh: '533140', route: 'all', fromDate: '2026-06-14', toDate: '2026-06-14',
        status: 'all', reason: 'all', sort: 'ma_bg', order: 'asc', limit: 10, offset: 0,
    });
    assert.equal(rows.length, 3);
    rows.forEach((row) => assert.equal(row.violation_reason, null, `${row.ma_bg} must have violation_reason=null`));

    const statusById = Object.fromEntries(rows.map((r) => [r.ma_bg, r.status_group]));
    assert.equal(statusById.P1, 'passed');
    // D-OPEN-01 (PO decision): NULL and blank danh_gia_2026 both classify as Chuyển hoàn.
    assert.equal(statusById.R1, 'returned');
    assert.equal(statusById.R2, 'returned');
});

// ============================================================================================
// C-02 — real LIMIT/OFFSET pagination: total is independent of page, union of all pages ==
// the full filtered set, pages are disjoint (never overlapping, never a gap from unstable
// ordering on tied sort keys).
// ============================================================================================

test('T-B06: paging through getEvidencePage with page_size=3 covers the full filtered set exactly once per row', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    seedSchema(database);
    // 10 "Không đạt" rows, several sharing the exact same do_tre_gio (including several with
    // NULL do_tre_gio) to stress the ma_bg tiebreaker.
    for (let i = 1; i <= 10; i += 1) {
        const ptc = i <= 6 ? '14/06/2026 08:00:00' : null;
        const nop = i <= 6 ? '14/06/2026 09:00:00' : null; // 6 rows tie at exactly 1h delay
        insertRow(database, {
            ngay_do_kiem: '2026-06-14', ma_bg: `BG-${String(i).padStart(2, '0')}`, ma_bcvh: '533140',
            danh_gia_2026: 'Không đạt', thoi_gian_ptc: ptc, thoi_gian_nop_tien: nop,
        });
    }

    const seen = [];
    for (let page = 0; page < 4; page += 1) {
        // eslint-disable-next-line no-await-in-loop
        const rows = await repository.getEvidencePage({
            bcvh: '533140', route: 'all', fromDate: '2026-06-14', toDate: '2026-06-14',
            status: 'failed', reason: 'all', sort: 'delay_hours', order: 'desc', limit: 3, offset: page * 3,
        });
        seen.push(...rows.map((r) => r.ma_bg));
    }

    assert.equal(seen.length, 10, 'every row must appear exactly once across all pages');
    assert.deepEqual([...seen].sort(), Array.from({ length: 10 }, (_, i) => `BG-${String(i + 1).padStart(2, '0')}`).sort());
    assert.equal(new Set(seen).size, 10, 'no row may appear on more than one page');
});

// ============================================================================================
// C-01 — status/reason facet counts are independent of page_size, never derived from the
// returned page.
// ============================================================================================

test('T-B07: getEvidenceStatusSummary/getEvidenceReasonSummary reflect the full scope, unaffected by any page_size', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    seedSchema(database);
    for (let i = 1; i <= 5; i += 1) insertRow(database, { ngay_do_kiem: '2026-06-14', ma_bg: `D-${i}`, ma_bcvh: '533140', danh_gia_2026: 'Đạt' });
    for (let i = 1; i <= 4; i += 1) insertRow(database, { ngay_do_kiem: '2026-06-14', ma_bg: `F-${i}`, ma_bcvh: '533140', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 13:00:00' });
    for (let i = 1; i <= 2; i += 1) insertRow(database, { ngay_do_kiem: '2026-06-14', ma_bg: `R-${i}`, ma_bcvh: '533140', danh_gia_2026: null });

    const status = await repository.getEvidenceStatusSummary({ bcvh: '533140', route: 'all', fromDate: '2026-06-14', toDate: '2026-06-14' });
    assert.deepEqual(status, { all: 11, passed: 5, failed: 4, returned: 2 });

    const reasonRows = await repository.getEvidenceReasonSummary({ bcvh: '533140', route: 'all', fromDate: '2026-06-14', toDate: '2026-06-14' });
    const total = reasonRows.reduce((sum, r) => sum + r.n, 0);
    assert.equal(total, 4, 'reason facet total must equal the full Không đạt count, not any page size');

    // page_size=1 must not change any facet total above.
    const onePage = await repository.getEvidencePage({ bcvh: '533140', route: 'all', fromDate: '2026-06-14', toDate: '2026-06-14', status: 'all', reason: 'all', sort: 'ma_bg', order: 'asc', limit: 1, offset: 0 });
    assert.equal(onePage.length, 1);
});

// ============================================================================================
// C-03 — do_tre_gio is null (never a fabricated 0) whenever either timestamp is missing or
// does not match the dd/MM/yyyy HH:mm:ss format.
// ============================================================================================

test('T-B10: do_tre_gio is null for missing/unparseable timestamps, a real number otherwise', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    seedSchema(database);
    insertRow(database, { ngay_do_kiem: '2026-06-14', ma_bg: 'OK', ma_bcvh: '533140', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 12:30:00' });
    insertRow(database, { ngay_do_kiem: '2026-06-14', ma_bg: 'MISSING', ma_bcvh: '533140', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: null });
    insertRow(database, { ngay_do_kiem: '2026-06-14', ma_bg: 'GARBAGE', ma_bcvh: '533140', danh_gia_2026: 'Không đạt', thoi_gian_ptc: 'not-a-date', thoi_gian_nop_tien: '14/06/2026 12:30:00' });
    insertRow(database, { ngay_do_kiem: '2026-06-14', ma_bg: 'PASSED', ma_bcvh: '533140', danh_gia_2026: 'Đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 09:00:00' });

    const rows = await repository.getEvidencePage({ bcvh: '533140', route: 'all', fromDate: '2026-06-14', toDate: '2026-06-14', status: 'all', reason: 'all', sort: 'ma_bg', order: 'asc', limit: 10, offset: 0 });
    const byId = Object.fromEntries(rows.map((r) => [r.ma_bg, r.do_tre_gio]));
    assert.equal(byId.OK, 4.5);
    assert.equal(byId.MISSING, null);
    assert.equal(byId.GARBAGE, null);
    // A Đạt row's delay is not a defined concept at all -- still null, never 0.
    assert.equal(byId.PASSED, null);
});

// ============================================================================================
// reason is ignored whenever status <> 'failed' (Design of Record §6.3, T-B12).
// ============================================================================================

test('T-B12: passing reason=delayed_cash together with status=passed does not filter out any row', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    seedSchema(database);
    for (let i = 1; i <= 3; i += 1) insertRow(database, { ngay_do_kiem: '2026-06-14', ma_bg: `P-${i}`, ma_bcvh: '533140', danh_gia_2026: 'Đạt' });

    const withoutReason = await repository.getEvidencePage({ bcvh: '533140', route: 'all', fromDate: '2026-06-14', toDate: '2026-06-14', status: 'passed', reason: 'all', sort: 'ma_bg', order: 'asc', limit: 10, offset: 0 });
    const withReason = await repository.getEvidencePage({ bcvh: '533140', route: 'all', fromDate: '2026-06-14', toDate: '2026-06-14', status: 'passed', reason: 'delayed_cash', sort: 'ma_bg', order: 'asc', limit: 10, offset: 0 });

    assert.equal(withoutReason.length, 3);
    assert.equal(withReason.length, 3, 'reason must be silently ignored when status is not failed');
});

// ============================================================================================
// C-05 — anchor_date / period scoping happens one level up in evidenceQueryService, but the
// repository's date-range filter itself must be a plain inclusive BETWEEN so the service's
// per-BCVH anchor resolution is not undermined by the repository silently widening/narrowing
// the range.
// ============================================================================================

test('date-range filter is a plain inclusive BETWEEN fromDate/toDate, scoped by BCVH', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    seedSchema(database);
    insertRow(database, { ngay_do_kiem: '2026-07-31', ma_bg: 'JUL31', ma_bcvh: '533140', danh_gia_2026: 'Đạt' });
    insertRow(database, { ngay_do_kiem: '2026-08-01', ma_bg: 'AUG01', ma_bcvh: '533140', danh_gia_2026: 'Đạt' });
    insertRow(database, { ngay_do_kiem: '2026-08-15', ma_bg: 'AUG15', ma_bcvh: '533140', danh_gia_2026: 'Đạt' });
    insertRow(database, { ngay_do_kiem: '2026-08-15', ma_bg: 'OTHER-BCVH', ma_bcvh: '999999', danh_gia_2026: 'Đạt' });

    const rows = await repository.getEvidencePage({ bcvh: '533140', route: 'all', fromDate: '2026-08-01', toDate: '2026-08-15', status: 'all', reason: 'all', sort: 'ma_bg', order: 'asc', limit: 10, offset: 0 });
    assert.deepEqual(rows.map((r) => r.ma_bg).sort(), ['AUG01', 'AUG15']);
});

// ============================================================================================
// Search-path repository methods: narrow projection + scope count + id-based final fetch.
// ============================================================================================

test('getEvidenceScopeCount / getEvidenceSearchProjection / getEvidenceRowsByIds compose correctly', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    seedSchema(database);
    insertRow(database, { ngay_do_kiem: '2026-08-10', ma_bg: 'A1', ma_bcvh: '533140', ma_tuyen: '53314001', ten_tuyen: 'Hương Phong', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '10/08/2026 08:00:00', thoi_gian_nop_tien: '10/08/2026 13:00:00' });
    insertRow(database, { ngay_do_kiem: '2026-08-10', ma_bg: 'A2', ma_bcvh: '533140', ma_tuyen: '53314002', ten_tuyen: 'Thủy Vân', danh_gia_2026: 'Đạt' });

    const count = await repository.getEvidenceScopeCount({ bcvh: '533140', route: 'all', fromDate: '2026-08-10', toDate: '2026-08-10', status: 'all', reason: 'all' });
    assert.equal(count, 2);

    const projection = await repository.getEvidenceSearchProjection({ bcvh: '533140', route: 'all', fromDate: '2026-08-10', toDate: '2026-08-10', status: 'all', reason: 'all' });
    assert.equal(projection.length, 2);
    assert.ok(projection.every((r) => typeof r.id === 'number'), 'projection rows must carry a real id for the id-based final fetch');
    const byName = Object.fromEntries(projection.map((r) => [r.ma_bg, r]));
    assert.equal(byName.A1.status_group, 'failed');
    assert.equal(byName.A2.status_group, 'passed');

    const ids = projection.map((r) => r.id);
    const finalRows = await repository.getEvidenceRowsByIds({ ids, sort: 'ma_bg', order: 'asc' });
    assert.deepEqual(finalRows.map((r) => r.ma_bg), ['A1', 'A2']);

    const empty = await repository.getEvidenceRowsByIds({ ids: [], sort: 'ma_bg', order: 'asc' });
    assert.deepEqual(empty, []);
});
