import test from 'node:test';
import assert from 'node:assert/strict';
import { parseF13Timestamp, calculateDelayHours } from './shipmentPerformanceData.js';

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
