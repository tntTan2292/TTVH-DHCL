import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWeekOptions,
  formatWeekRangeLabel,
  formatSignedRateDelta,
  formatSignedVolumeDelta,
} from './bcvhWeeklyComparisonData.js';

test('formatWeekRangeLabel: shows the real display range, not the planned Wed end, when truncated', () => {
  const week = {
    label: 'Tuần 38',
    display_start_date: '2026-09-17',
    display_end_date: '2026-09-21',
  };
  assert.equal(formatWeekRangeLabel(week), 'Tuần 38: 17/09/2026–21/09/2026');
});

test('formatWeekRangeLabel: a fully-elapsed week shows the full Thu-Wed range', () => {
  const week = { label: 'Tuần 36', display_start_date: '2026-09-03', display_end_date: '2026-09-09' };
  assert.equal(formatWeekRangeLabel(week), 'Tuần 36: 03/09/2026–09/09/2026');
});

test('formatWeekRangeLabel: null week returns an empty string', () => {
  assert.equal(formatWeekRangeLabel(null), '');
});

test('buildWeekOptions: maps each week to a { value, label, week } option, one per entry', () => {
  const weeks = [
    { week_id: '2026-W36', label: 'Tuần 36', display_start_date: '2026-09-03', display_end_date: '2026-09-09' },
    { week_id: '2026-W38', label: 'Tuần 38', display_start_date: '2026-09-17', display_end_date: '2026-09-21' },
  ];
  const options = buildWeekOptions(weeks);
  assert.equal(options.length, 2);
  assert.equal(options[0].value, '2026-W36');
  assert.equal(options[1].label, 'Tuần 38: 17/09/2026–21/09/2026');
  assert.equal(options[1].week, weeks[1]);
});

test('buildWeekOptions: empty/undefined input returns an empty array', () => {
  assert.deepEqual(buildWeekOptions(undefined), []);
  assert.deepEqual(buildWeekOptions([]), []);
});

test('formatSignedRateDelta: signed, 1-decimal, absolute percentage points', () => {
  assert.equal(formatSignedRateDelta(15), '+15,0 điểm %');
  assert.equal(formatSignedRateDelta(-3.456), '-3,5 điểm %');
  assert.equal(formatSignedRateDelta(0), '0,0 điểm %');
});

test('formatSignedRateDelta: null/undefined/non-numeric return null (caller renders a dash)', () => {
  assert.equal(formatSignedRateDelta(null), null);
  assert.equal(formatSignedRateDelta(undefined), null);
  assert.equal(formatSignedRateDelta('abc'), null);
});

test('formatSignedVolumeDelta: signed, locale-grouped integer', () => {
  assert.equal(formatSignedVolumeDelta(1234), '+1.234');
  assert.equal(formatSignedVolumeDelta(-500), '-500');
  assert.equal(formatSignedVolumeDelta(0), '0');
});
