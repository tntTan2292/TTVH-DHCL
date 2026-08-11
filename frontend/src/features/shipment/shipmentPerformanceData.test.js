import test from 'node:test';
import assert from 'node:assert/strict';
import { parseF13Timestamp, calculateDelayHours, fetchAllEvidenceRows } from './shipmentPerformanceData.js';

// P0-05: fact_f13 timestamps are 'dd/MM/yyyy HH:mm:ss' TEXT, which `new Date(string)`
// cannot parse (returns Invalid Date in this runtime).
test('parseF13Timestamp parses dd/MM/yyyy HH:mm:ss into a valid Date', () => {
  const date = parseF13Timestamp('14/06/2026 09:05:16');
  assert.ok(date instanceof Date);
  assert.equal(Number.isNaN(date.getTime()), false);
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 5); // 0-indexed: June
  assert.equal(date.getDate(), 14);
  assert.equal(date.getHours(), 9);
  assert.equal(date.getMinutes(), 5);
  assert.equal(date.getSeconds(), 16);
});

test('parseF13Timestamp returns null for unparseable input', () => {
  assert.equal(parseF13Timestamp('not-a-date'), null);
  assert.equal(parseF13Timestamp(null), null);
  assert.equal(parseF13Timestamp(undefined), null);
  assert.equal(parseF13Timestamp('2026-06-14 09:05:16'), null); // ISO, not dd/MM/yyyy
});

test('calculateDelayHours computes a real number for well-formed dd/MM/yyyy timestamps', () => {
  const hours = calculateDelayHours('14/06/2026 09:00:00', '14/06/2026 12:30:00', null);
  assert.equal(hours, 3.5);
});

test('calculateDelayHours returns null (not NaN) when timestamps are unparseable', () => {
  const hours = calculateDelayHours('invalid', '14/06/2026 12:30:00', null);
  assert.equal(hours, null);
});

test('calculateDelayHours prefers extended_data delay when present', () => {
  const hours = calculateDelayHours('14/06/2026 09:00:00', '14/06/2026 12:30:00', { do_tre_gio: 7.2 });
  assert.equal(hours, 7.2);
});

// --- fetchAllEvidenceRows: fixes the "silently capped at 1000 rows" Evidence defect ------

function makePagedFetcher(allRows, { pageSize = 200 } = {}) {
  const calls = [];
  const fetchPage = async (page, requestedPageSize) => {
    calls.push({ page, pageSize: requestedPageSize });
    const size = requestedPageSize || pageSize;
    const start = (page - 1) * size;
    const data = allRows.slice(start, start + size);
    const totalPages = Math.max(1, Math.ceil(allRows.length / size));
    return { data, meta: { pagination: { page, page_size: size, total_items: allRows.length, total_pages: totalPages } } };
  };
  return { fetchPage, calls };
}

test('fetchAllEvidenceRows returns every row in a single page when the set fits in one page', async () => {
  const rows = Array.from({ length: 5 }, (_, i) => ({ ma_bg: `BG${i}` }));
  const { fetchPage, calls } = makePagedFetcher(rows);

  const result = await fetchAllEvidenceRows(fetchPage, { pageSize: 200 });

  assert.equal(result.rows.length, 5);
  assert.equal(result.truncated, false);
  assert.equal(calls.length, 1);
});

test('fetchAllEvidenceRows walks every backend page and concatenates all rows, never stopping at the first page', async () => {
  const rows = Array.from({ length: 2350 }, (_, i) => ({ ma_bg: `BG${i}` }));
  const { fetchPage, calls } = makePagedFetcher(rows, { pageSize: 200 });

  const result = await fetchAllEvidenceRows(fetchPage, { pageSize: 200 });

  assert.equal(result.rows.length, 2350, 'must not silently drop rows beyond the first 1000/first page');
  assert.equal(result.truncated, false);
  assert.equal(calls.length, 12); // ceil(2350 / 200)
  assert.deepEqual(result.rows[2349], { ma_bg: 'BG2349' });
});

test('fetchAllEvidenceRows reports truncated:true instead of silently dropping rows past the safety ceiling', async () => {
  const rows = Array.from({ length: 10000 }, (_, i) => ({ ma_bg: `BG${i}` }));
  const { fetchPage } = makePagedFetcher(rows, { pageSize: 100 });

  const result = await fetchAllEvidenceRows(fetchPage, { pageSize: 100, maxPages: 5 });

  assert.equal(result.rows.length, 500); // 5 pages * 100
  assert.equal(result.truncated, true);
});

test('fetchAllEvidenceRows stops cleanly on an empty result without requesting further pages', async () => {
  const fetchPage = async () => ({ data: [], meta: { pagination: { page: 1, page_size: 200, total_items: 0, total_pages: 0 } } });

  const result = await fetchAllEvidenceRows(fetchPage);

  assert.deepEqual(result.rows, []);
  assert.equal(result.truncated, false);
});

test('fetchAllEvidenceRows falls back to a page-size heuristic when meta.pagination.total_pages is missing', async () => {
  const rows = Array.from({ length: 3 }, (_, i) => ({ ma_bg: `BG${i}` }));
  const fetchPage = async (page, pageSize) => {
    const start = (page - 1) * pageSize;
    return { data: rows.slice(start, start + pageSize), meta: {} };
  };

  const result = await fetchAllEvidenceRows(fetchPage, { pageSize: 2 });

  assert.equal(result.rows.length, 3);
  assert.equal(result.truncated, false);
});
