const test = require('node:test');
const assert = require('node:assert/strict');
const { stripVietnameseDiacritics, matchesSearchQuery } = require('./evidenceSearchMatch');

// F13-ROUTE-EVIDENCE-STATUS-02 Phase B1 (Design of Record R0 §5.4/§5.5). Confirms this
// server-side copy behaves exactly like the PO-accepted DEFECT A remediation
// (frontend/src/features/shipment/shipmentPerformanceData.js) it mirrors: exact match first,
// diacritic-insensitive fallback second, never narrower than exact match.

test('stripVietnameseDiacritics removes combining marks and normalizes đ/Đ', () => {
    assert.equal(stripVietnameseDiacritics('Hương Phong'), 'Huong Phong');
    assert.equal(stripVietnameseDiacritics('Đạt'), 'Dat');
    assert.equal(stripVietnameseDiacritics('TMĐT'), 'TMDT');
    assert.equal(stripVietnameseDiacritics('533140'), '533140', 'plain digits must be a no-op');
});

test('matchesSearchQuery: exact substring match (case-insensitive) always matches', () => {
    assert.equal(matchesSearchQuery(['533140 TMĐT 05'], 'tmđt'), true);
    assert.equal(matchesSearchQuery(['EG543052658VN'], 'EG5430'), true);
});

test('matchesSearchQuery: diacritic-insensitive fallback finds a no-diacritics query against accented text', () => {
    assert.equal(matchesSearchQuery(['Hương Phong'], 'Huong Phong'), true);
    assert.equal(matchesSearchQuery(['Thủy Vân_01'], 'thuy van'), true);
});

test('matchesSearchQuery: an empty/blank query matches everything (no filter)', () => {
    assert.equal(matchesSearchQuery(['anything'], ''), true);
    assert.equal(matchesSearchQuery(['anything'], '   '), true);
});

test('matchesSearchQuery: null/undefined/empty fields are skipped, never crash', () => {
    assert.equal(matchesSearchQuery([null, undefined, '', 'Hương Phong'], 'huong'), true);
    assert.equal(matchesSearchQuery([null, undefined, ''], 'huong'), false);
});

test('matchesSearchQuery: a genuinely non-matching keyword returns false', () => {
    assert.equal(matchesSearchQuery(['Hương Phong', '53314001'], 'khong-ton-tai'), false);
});
