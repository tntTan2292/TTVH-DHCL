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
