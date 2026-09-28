import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWeekOptions,
  checkWeeksDaysMismatch,
  formatDateVN,
  formatShortDate,
  formatSignedRateDelta,
  formatSignedVolumeDelta,
  formatWeekDataNote,
  formatWeekDateRange,
  formatWeekRangeLabel,
  resolveWeekFromAnchorDate,
  resolveWeeksListWithAnchor,
  shiftIsoDate,
  snapToThursday,
  sortBcvhWeeklyRows,
} from './bcvhWeeklyComparisonData.js';

const mockBackendWeeks = [
  {
    week_id: '2026-W38',
    iso_year: 2026,
    iso_week: 38,
    label: 'Tuần 38',
    week_start: '2026-09-17',
    week_end: '2026-09-23',
    display_start_date: '2026-09-17',
    display_end_date: '2026-09-21',
    first_data_date: '2026-09-17',
    last_data_date: '2026-09-21',
    days_with_data: 5,
    days_in_period: 5,
    is_in_progress: true,
    data_through_note: '2026-09-21',
  },
  {
    week_id: '2026-W37',
    iso_year: 2026,
    iso_week: 37,
    label: 'Tuần 37',
    week_start: '2026-09-10',
    week_end: '2026-09-16',
    display_start_date: '2026-09-10',
    display_end_date: '2026-09-16',
    first_data_date: '2026-09-10',
    last_data_date: '2026-09-16',
    days_with_data: 7,
    days_in_period: 7,
    is_in_progress: false,
    data_through_note: null,
  },
  {
    week_id: '2026-W36',
    iso_year: 2026,
    iso_week: 36,
    label: 'Tuần 36',
    week_start: '2026-09-03',
    week_end: '2026-09-09',
    display_start_date: '2026-09-03',
    display_end_date: '2026-09-09',
    first_data_date: '2026-09-03',
    last_data_date: '2026-09-09',
    days_with_data: 7,
    days_in_period: 7,
    is_in_progress: false,
    data_through_note: null,
  },
];

test('B1: snapToThursday snaps Monday 14/09/2026 to Thursday 10/09/2026', () => {
  // Monday 14/09/2026 must snap to Thursday 10/09/2026 (Tuần 37)
  const snapped = snapToThursday('2026-09-14');
  assert.equal(snapped, '2026-09-10');

  // Thursday 17/09/2026 remains 17/09/2026
  assert.equal(snapToThursday('2026-09-17'), '2026-09-17');

  // Wednesday 23/09/2026 snaps back to opening Thursday 17/09/2026
  assert.equal(snapToThursday('2026-09-23'), '2026-09-17');
});

test('B1: resolveWeekFromAnchorDate correctly resolves Monday 14/09/2026 to Tuần 37 (10/09–16/09/2026), never 14/09–20/09', () => {
  const result = resolveWeekFromAnchorDate('2026-09-14', mockBackendWeeks);
  assert.equal(result.snappedThursday, '2026-09-10');
  assert.equal(result.resolvedWeek?.week_id, '2026-W37');
  assert.equal(result.resolvedWeek?.label, 'Tuần 37');

  const range = formatWeekDateRange(result.resolvedWeek.display_start_date, result.resolvedWeek.display_end_date);
  assert.equal(range, '10/09–16/09/2026');
  assert.notEqual(range, '14/09–20/09/2026');
});

test('B2: future date 01/10/2026 does not invent fake W40/W39; clamps to latest real week W38 with notice', () => {
  const result = resolveWeekFromAnchorDate('2026-10-01', mockBackendWeeks);
  assert.equal(result.isFutureClamped, true);
  // Clamps to W38 (the latest real week in backend data)
  assert.equal(result.resolvedWeek?.week_id, '2026-W38');
  assert.match(result.message, /chưa có dữ liệu tuần/);
  assert.match(result.message, /Tuần 38/);
});

test('B2 & B3: resolveWeeksListWithAnchor returns empty array when backend has no data, no hardcoded fallback', () => {
  const emptyRes = resolveWeeksListWithAnchor([], '2026-09-17');
  assert.deepEqual(emptyRes.weeks, []);
  assert.equal(emptyRes.selectedWeekId, '');
  assert.equal(emptyRes.resolvedWeek, null);
  assert.equal(emptyRes.message, 'Chưa có dữ liệu tuần');

  const nullRes = resolveWeeksListWithAnchor(null);
  assert.deepEqual(nullRes.weeks, []);
  assert.equal(nullRes.message, 'Chưa có dữ liệu tuần');
});

test('B3: changing anchor to 10/09/2026 retains W38 in list and does not generate fake 2025/future weeks', () => {
  const result = resolveWeeksListWithAnchor(mockBackendWeeks, '2026-09-10');
  assert.equal(result.selectedWeekId, '2026-W37');
  assert.equal(result.resolvedWeek?.week_id, '2026-W37');

  // W38 must still be in the list, positioned at index 0 (newest first)
  assert.equal(result.weeks.length, 3);
  assert.equal(result.weeks[0].week_id, '2026-W38');
  assert.equal(result.weeks[1].week_id, '2026-W37');
  assert.equal(result.weeks[2].week_id, '2026-W36');

  // No fake 2025 weeks generated
  assert.ok(result.weeks.every((w) => w.iso_year === 2026));
  // No fake future weeks (W39, W40) generated
  assert.ok(result.weeks.every((w) => w.iso_week <= 38));
});

test('B4: Tuần 38 with data up to 21/09 displays "17/09–21/09/2026" and note "Dữ liệu đến ngày 21/09/2026"', () => {
  const week38 = mockBackendWeeks[0];
  const label = formatWeekRangeLabel(week38);
  // B4 requirement: Must show 17/09–21/09/2026, NOT 17/09–23/09/2026
  assert.equal(label, 'Tuần 38 (2026): 17/09–21/09/2026');
  assert.notEqual(label, 'Tuần 38 (2026): 17/09–23/09/2026');

  const note = formatWeekDataNote(week38);
  assert.equal(note, 'Dữ liệu đến ngày 21/09/2026');
});

test('B4: Fully-elapsed weeks (Tuần 37, Tuần 36) show full Thu-Wed range without in-progress note', () => {
  const week37 = mockBackendWeeks[1];
  assert.equal(formatWeekRangeLabel(week37), 'Tuần 37 (2026): 10/09–16/09/2026');
  assert.equal(formatWeekDataNote(week37), null);

  const week36 = mockBackendWeeks[2];
  assert.equal(formatWeekRangeLabel(week36), 'Tuần 36 (2026): 03/09–09/09/2026');
  assert.equal(formatWeekDataNote(week36), null);
});

test('checkWeeksDaysMismatch: flags visual warning when two weeks have different days with data', () => {
  const week38 = mockBackendWeeks[0]; // 5 days
  const week37 = mockBackendWeeks[1]; // 7 days

  const mismatch = checkWeeksDaysMismatch(week38, week37);
  assert.equal(mismatch.isMismatch, true);
  assert.equal(mismatch.message, 'Lưu ý: Hai tuần có số ngày dữ liệu khác nhau');
  assert.equal(mismatch.daysA, 5);
  assert.equal(mismatch.daysB, 7);

  // Equal days has no mismatch
  const equalMismatch = checkWeeksDaysMismatch(mockBackendWeeks[1], mockBackendWeeks[2]);
  assert.equal(equalMismatch.isMismatch, false);
});

test('buildWeekOptions: maps weeks to select options newest first with real display range', () => {
  const options = buildWeekOptions(mockBackendWeeks);
  assert.equal(options.length, 3);
  assert.equal(options[0].value, '2026-W38');
  assert.equal(options[0].label, 'Tuần 38 (2026): 17/09–21/09/2026');
  assert.equal(options[1].value, '2026-W37');
  assert.equal(options[1].label, 'Tuần 37 (2026): 10/09–16/09/2026');
  assert.equal(options[2].value, '2026-W36');
  assert.equal(options[2].label, 'Tuần 36 (2026): 03/09–09/09/2026');
});

test('shiftIsoDate, formatDateVN, formatShortDate: utility helpers', () => {
  assert.equal(shiftIsoDate('2026-09-17', 6), '2026-09-23');
  assert.equal(shiftIsoDate('2026-09-17', -7), '2026-09-10');
  assert.equal(formatDateVN('2026-09-21'), '21/09/2026');
  assert.equal(formatShortDate('2026-09-17'), '17/09');
});

test('formatSignedRateDelta and formatSignedVolumeDelta: formatting helpers', () => {
  assert.equal(formatSignedRateDelta(1.234), '+1,2 điểm %');
  assert.equal(formatSignedRateDelta(-0.5), '-0,5 điểm %');
  assert.equal(formatSignedRateDelta(0), '0,0 điểm %');
  assert.equal(formatSignedRateDelta(null), null);

  assert.equal(formatSignedVolumeDelta(1234), '+1.234');
  assert.equal(formatSignedVolumeDelta(-50), '-50');
  assert.equal(formatSignedVolumeDelta(0), '0');
  assert.equal(formatSignedVolumeDelta(null), null);
});

test('sortBcvhWeeklyRows: orders BCVHs by current week KPI rate (current.rate) descending by default', () => {
  const rows = [
    { ma_bcvh: '535790', ten_bcvh: 'BCVH A Lưới', current: { volume: 393, rate: 0.702 } },
    { ma_bcvh: '536250', ten_bcvh: 'BCVH Hương Thủy', current: { volume: 1859, rate: 0.484 } },
    { ma_bcvh: '535470', ten_bcvh: 'BCVH Hương Trà', current: { volume: 2003, rate: 0.597 } },
    { ma_bcvh: '536390', ten_bcvh: 'BCVH Nam Đông', current: { volume: 500, rate: 0.851 } },
    { ma_bcvh: '535170', ten_bcvh: 'BCVH Phong Điền', current: { volume: 1200, rate: null } },
  ];

  const sortedDesc = sortBcvhWeeklyRows(rows, { direction: 'desc' });
  assert.equal(sortedDesc[0].ma_bcvh, '536390', '#1 is highest rate (85.1%)');
  assert.equal(sortedDesc[1].ma_bcvh, '535790', '#2 is second highest (70.2%)');
  assert.equal(sortedDesc[2].ma_bcvh, '535470', '#3 is third highest (59.7%)');
  assert.equal(sortedDesc[3].ma_bcvh, '536250', '#4 is fourth (48.4%)');
  assert.equal(sortedDesc[4].ma_bcvh, '535170', 'null rate goes to the bottom');
});

test('sortBcvhWeeklyRows: supports ascending direction when toggled', () => {
  const rows = [
    { ma_bcvh: '535790', current: { volume: 393, rate: 0.702 } },
    { ma_bcvh: '536250', current: { volume: 1859, rate: 0.484 } },
    { ma_bcvh: '535470', current: { volume: 2003, rate: 0.597 } },
    { ma_bcvh: '535170', current: { volume: 100, rate: null } },
  ];

  const sortedAsc = sortBcvhWeeklyRows(rows, { direction: 'asc' });
  assert.equal(sortedAsc[0].ma_bcvh, '536250', 'lowest rate first (48.4%)');
  assert.equal(sortedAsc[1].ma_bcvh, '535470', 'second lowest (59.7%)');
  assert.equal(sortedAsc[2].ma_bcvh, '535790', 'highest rate (70.2%)');
  assert.equal(sortedAsc[3].ma_bcvh, '535170', 'null rate remains at the bottom');
});

test('sortBcvhWeeklyRows: breaks ties by higher volume', () => {
  const rows = [
    { ma_bcvh: 'BCVH_A', current: { volume: 500, rate: 0.6 } },
    { ma_bcvh: 'BCVH_B', current: { volume: 1500, rate: 0.6 } },
  ];

  const sorted = sortBcvhWeeklyRows(rows, { direction: 'desc' });
  assert.equal(sorted[0].ma_bcvh, 'BCVH_B', 'higher volume breaks tie');
  assert.equal(sorted[1].ma_bcvh, 'BCVH_A');
});

test('sortBcvhWeeklyRows: handles empty or non-array rows safely', () => {
  assert.deepEqual(sortBcvhWeeklyRows([]), []);
  assert.deepEqual(sortBcvhWeeklyRows(null), []);
  assert.deepEqual(sortBcvhWeeklyRows(undefined), []);
});

test('sortBcvhWeeklyRows: supports sorting by ten_bcvh, volume, and rate_delta', () => {
  const rows = [
    { ma_bcvh: '535790', ten_bcvh: 'BCVH A Lưới', current: { volume: 393 }, rate_delta: 0.057 },
    { ma_bcvh: '536250', ten_bcvh: 'BCVH Hương Thủy', current: { volume: 1859 }, rate_delta: 0.108 },
    { ma_bcvh: '535470', ten_bcvh: 'BCVH Hương Trà', current: { volume: 2003 }, rate_delta: 0.071 },
  ];

  const sortedByName = sortBcvhWeeklyRows(rows, { sortField: 'ten_bcvh', direction: 'asc' });
  assert.equal(sortedByName[0].ten_bcvh, 'BCVH A Lưới');
  assert.equal(sortedByName[1].ten_bcvh, 'BCVH Hương Thủy');
  assert.equal(sortedByName[2].ten_bcvh, 'BCVH Hương Trà');

  const sortedByVolume = sortBcvhWeeklyRows(rows, { sortField: 'current_volume', direction: 'desc' });
  assert.equal(sortedByVolume[0].ten_bcvh, 'BCVH Hương Trà', '2003 is highest volume');

  const sortedByDelta = sortBcvhWeeklyRows(rows, { sortField: 'rate_delta', direction: 'desc' });
  assert.equal(sortedByDelta[0].ten_bcvh, 'BCVH Hương Thủy', '+10.8% is highest delta');
});
