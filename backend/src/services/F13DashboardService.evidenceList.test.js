const test = require('node:test');
const assert = require('node:assert/strict');

const service = require('./F13DashboardService');
const repo = require('../repositories/FactBuuGuiRepository');

function withMockedFacts(facts, fn) {
    return async () => {
        const original = repo.getEvidenceListFacts;
        repo.getEvidenceListFacts = async () => facts;
        try {
            await fn();
        } finally {
            repo.getEvidenceListFacts = original;
        }
    };
}

// P0-02: getEvidenceList must pass through the authoritative danh_gia_2026 field.
// P0-05: fact_f13 timestamps are 'dd/MM/yyyy HH:mm:ss' TEXT, which `new Date(string)`
// cannot parse — do_tre_gio must be computed via an explicit dd/MM/yyyy parser.
test('getEvidenceList passes through danh_gia_2026 and computes do_tre_gio from dd/MM/yyyy timestamps', withMockedFacts(
    [{ ma_bg: 'BG001', thoi_gian_ptc: '14/06/2026 09:00:00', thoi_gian_nop_tien: '14/06/2026 12:30:00', danh_gia_2026: 'Không đạt' }],
    async () => {
        const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20);
        const [row] = result.data;

        assert.equal(row.danh_gia_2026, 'Không đạt');
        assert.equal(row.do_tre_gio, 3.5);
    }
));

// Route Ranking drill-down requirement: a missing/unparseable handover timestamp must
// report null (unavailable), never a fabricated "0 hours delay".
test('getEvidenceList reports null delay (not 0, not NaN) when a timestamp is unparseable', withMockedFacts(
    [{ ma_bg: 'BG002', thoi_gian_ptc: 'not-a-date', thoi_gian_nop_tien: '14/06/2026 12:30:00', danh_gia_2026: 'Không đạt' }],
    async () => {
        const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20);
        const [row] = result.data;

        assert.equal(row.do_tre_gio, null);
    }
));

test('getEvidenceList reports null delay when the handover timestamp is missing entirely', withMockedFacts(
    [{ ma_bg: 'BG003', thoi_gian_ptc: '14/06/2026 09:00:00', thoi_gian_nop_tien: null, danh_gia_2026: 'Không đạt' }],
    async () => {
        const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20);
        const [row] = result.data;

        assert.equal(row.do_tre_gio, null);
    }
));

// --- Violation reason classification -----------------------------------------------

const MIXED_FACTS = [
    // Delayed: > 3h gap, both timestamps present and parseable.
    { ma_bg: 'BG-DELAYED-1', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 12:00:01' },
    { ma_bg: 'BG-DELAYED-2', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '15/06/2026 08:00:00' },
    // Not delayed: both timestamps present and parseable, gap <= 3h.
    { ma_bg: 'BG-OTHER-1', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 09:30:00' },
    // Unknown: handover timestamp missing entirely.
    { ma_bg: 'BG-UNKNOWN-1', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: null },
    // Unknown: handover timestamp present but unparseable.
    { ma_bg: 'BG-UNKNOWN-2', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: 'garbage' },
];

test('getEvidenceList classifies each row into exactly one of the three violation groups', withMockedFacts(MIXED_FACTS, async () => {
    const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20);
    const byId = Object.fromEntries(result.data.map((r) => [r.ma_bg, r.violation_reason]));

    assert.equal(byId['BG-DELAYED-1'], 'Chậm nộp tiền');
    assert.equal(byId['BG-DELAYED-2'], 'Chậm nộp tiền');
    assert.equal(byId['BG-OTHER-1'], 'Không đạt khác');
    assert.equal(byId['BG-UNKNOWN-1'], 'Chưa xác định nguyên nhân');
    assert.equal(byId['BG-UNKNOWN-2'], 'Chưa xác định nguyên nhân');
}));

test('getEvidenceList does not fabricate "delayed 0h": missing handover data is never classified as Chậm nộp tiền', withMockedFacts(MIXED_FACTS, async () => {
    const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20);
    const unknownRows = result.data.filter((r) => r.ma_bg === 'BG-UNKNOWN-1' || r.ma_bg === 'BG-UNKNOWN-2');

    unknownRows.forEach((row) => {
        assert.notEqual(row.violation_reason, 'Chậm nộp tiền');
        assert.equal(row.do_tre_gio, null);
    });
}));

test('getEvidenceList never merges every Không đạt row into Chậm nộp tiền', withMockedFacts(MIXED_FACTS, async () => {
    const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20);
    const delayedCount = result.data.filter((r) => r.violation_reason === 'Chậm nộp tiền').length;

    assert.equal(delayedCount, 2);
    assert.ok(delayedCount < result.data.length, 'not every Không đạt row must be Chậm nộp tiền');
}));

// --- Group counts (violation_summary) -----------------------------------------------

test('getEvidenceList reports accurate group counts in meta.violation_summary, independent of pagination', withMockedFacts(MIXED_FACTS, async () => {
    // page_size smaller than the full set, to prove counts are not derived from the page.
    const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 2);

    assert.equal(result.data.length, 2);
    assert.deepEqual(result.meta.violation_summary, {
        total_failed: 5,
        delayed_cash_count: 2,
        other_failed_count: 1,
        unknown_count: 2,
    });
}));

// --- Per-group filtering -------------------------------------------------------------

test('getEvidenceList filters to only Chậm nộp tiền when reason=delayed_cash', withMockedFacts(MIXED_FACTS, async () => {
    const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20, 'delayed_cash');

    assert.equal(result.data.length, 2);
    result.data.forEach((row) => assert.equal(row.violation_reason, 'Chậm nộp tiền'));
    assert.equal(result.meta.pagination.total_items, 2);
    assert.equal(result.meta.violation_filter.selected, 'delayed_cash');
}));

test('getEvidenceList filters to only Không đạt khác when reason=other', withMockedFacts(MIXED_FACTS, async () => {
    const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20, 'other');

    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].ma_bg, 'BG-OTHER-1');
}));

test('getEvidenceList filters to only Chưa xác định nguyên nhân when reason=unknown', withMockedFacts(MIXED_FACTS, async () => {
    const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20, 'unknown');

    assert.equal(result.data.length, 2);
    result.data.forEach((row) => assert.equal(row.violation_reason, 'Chưa xác định nguyên nhân'));
}));

// --- "Tất cả không đạt" must remain available ----------------------------------------

test('getEvidenceList returns the full Không đạt population when no reason filter is given', withMockedFacts(MIXED_FACTS, async () => {
    const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20);

    assert.equal(result.data.length, MIXED_FACTS.length);
    assert.equal(result.meta.pagination.total_items, MIXED_FACTS.length);
    assert.equal(result.meta.violation_filter.selected, 'all');
}));

test('getEvidenceList treats an unrecognized reason value as "all" rather than dropping data', withMockedFacts(MIXED_FACTS, async () => {
    const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20, 'not-a-real-reason');

    assert.equal(result.data.length, MIXED_FACTS.length);
    assert.equal(result.meta.violation_filter.selected, 'all');
}));

// --- F-1 fix (Evidence Consolidation plan Phase 1): route/BCVH identity pass-through ---
// The repository's SELECT * already returns ma_tuyen/ten_tuyen/ma_bcvh/ten_bcvh; the
// mapper was discarding all four, so "Tất cả tuyến" mode could not attribute any row to
// its real route (every row silently fell back to the caller's own route_id param).

const ROUTE_IDENTITY_FACTS = [
    { ma_bg: 'BG-R1', danh_gia_2026: 'Không đạt', ma_tuyen: '53001', ten_tuyen: 'Tuyến A', ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 09:00:00' },
    { ma_bg: 'BG-R2', danh_gia_2026: 'Không đạt', ma_tuyen: '53002', ten_tuyen: 'Tuyến B', ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 09:00:00' },
];

test('getEvidenceList passes through the real route (ma_tuyen/ten_tuyen) and BCVH (ma_bcvh/ten_bcvh) for a single-route request', withMockedFacts(
    [ROUTE_IDENTITY_FACTS[0]],
    async () => {
        const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20);
        const [row] = result.data;

        assert.equal(row.ma_tuyen, '53001');
        assert.equal(row.ten_tuyen, 'Tuyến A');
        assert.equal(row.ma_bcvh, '533140');
        assert.equal(row.ten_bcvh, 'BCVH Thuận Hóa');
    }
));

test('getEvidenceList passes through each row\'s own real route in "Tất cả tuyến" mode (route omitted) — never a single fallback value for every row', withMockedFacts(
    ROUTE_IDENTITY_FACTS,
    async () => {
        // route intentionally omitted (undefined) — "Tất cả tuyến" contract.
        const result = await service.getEvidenceList('2026-06-14', '533140', undefined, 1, 20);

        assert.equal(result.data.length, 2);
        const routesById = Object.fromEntries(result.data.map((r) => [r.ma_bg, r.ma_tuyen]));
        assert.equal(routesById['BG-R1'], '53001');
        assert.equal(routesById['BG-R2'], '53002');
        // Regression guard for the exact reported defect: rows must not collapse onto one
        // shared route value.
        assert.notEqual(routesById['BG-R1'], routesById['BG-R2']);

        const namesById = Object.fromEntries(result.data.map((r) => [r.ma_bg, r.ten_tuyen]));
        assert.equal(namesById['BG-R1'], 'Tuyến A');
        assert.equal(namesById['BG-R2'], 'Tuyến B');
    }
));

// --- Reconciliation requirement (PO instruction): only assert the three violation
// groups sum to the total after proving the classification is mutually exclusive
// (no ma_bg in more than one group) and exhaustive (every ma_bg in exactly one group) —
// otherwise reconcile via the set of unique ma_bg, not via arithmetic sum alone. -------

test('violation_reason classification is a true partition of the failed set: mutually exclusive and exhaustive over ma_bg, for every row shape', withMockedFacts(MIXED_FACTS, async () => {
    const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20);

    const groups = {
        delayed_cash: new Set(),
        other: new Set(),
        unknown: new Set(),
    };
    const slugByLabel = {
        'Chậm nộp tiền': 'delayed_cash',
        'Không đạt khác': 'other',
        'Chưa xác định nguyên nhân': 'unknown',
    };

    result.data.forEach((row) => {
        const slug = slugByLabel[row.violation_reason];
        assert.ok(slug, `row ${row.ma_bg} produced an unrecognized violation_reason: ${row.violation_reason}`);
        groups[slug].add(row.ma_bg);
    });

    // Exhaustive: every failed ma_bg appears in exactly one group.
    const allMaBg = new Set(result.data.map((r) => r.ma_bg));
    const unionOfGroups = new Set([...groups.delayed_cash, ...groups.other, ...groups.unknown]);
    assert.deepEqual([...unionOfGroups].sort(), [...allMaBg].sort(), 'union of the three groups must equal the full failed ma_bg set');

    // Mutually exclusive: no ma_bg appears in more than one group.
    const totalAcrossGroups = groups.delayed_cash.size + groups.other.size + groups.unknown.size;
    assert.equal(totalAcrossGroups, unionOfGroups.size, 'a ma_bg was counted in more than one violation group');

    // Only now — with mutual exclusion and exhaustiveness both proven on the actual
    // unique-ma_bg sets — is it safe to also assert the numeric summary sums correctly.
    assert.equal(result.meta.violation_summary.delayed_cash_count, groups.delayed_cash.size);
    assert.equal(result.meta.violation_summary.other_failed_count, groups.other.size);
    assert.equal(result.meta.violation_summary.unknown_count, groups.unknown.size);
    assert.equal(
        result.meta.violation_summary.delayed_cash_count + result.meta.violation_summary.other_failed_count + result.meta.violation_summary.unknown_count,
        result.meta.violation_summary.total_failed
    );
}));

test('violation_reason classification always returns exactly one of the three known labels, never null/undefined/other', withMockedFacts(
    [
        // Every timestamp-presence/parseability combination the classifier can see.
        { ma_bg: 'BOTH-VALID-DELAYED', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 12:00:01' },
        { ma_bg: 'BOTH-VALID-NOT-DELAYED', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: '14/06/2026 09:00:00' },
        { ma_bg: 'PTC-MISSING', danh_gia_2026: 'Không đạt', thoi_gian_ptc: null, thoi_gian_nop_tien: '14/06/2026 09:00:00' },
        { ma_bg: 'PTC-UNPARSEABLE', danh_gia_2026: 'Không đạt', thoi_gian_ptc: 'garbage', thoi_gian_nop_tien: '14/06/2026 09:00:00' },
        { ma_bg: 'NOP-MISSING', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: null },
        { ma_bg: 'NOP-UNPARSEABLE', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: 'garbage' },
        { ma_bg: 'BOTH-MISSING', danh_gia_2026: 'Không đạt', thoi_gian_ptc: null, thoi_gian_nop_tien: null },
    ],
    async () => {
        const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20);
        const knownLabels = new Set(['Chậm nộp tiền', 'Không đạt khác', 'Chưa xác định nguyên nhân']);

        assert.equal(result.data.length, 7);
        result.data.forEach((row) => {
            assert.ok(knownLabels.has(row.violation_reason), `row ${row.ma_bg} has an unknown violation_reason: ${row.violation_reason}`);
        });
    }
));
