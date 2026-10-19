import assert from 'node:assert/strict';
import {
  ANCHOR_TARGET_INDICATORS,
  ANCHOR_TARGET_LANES,
  computeAnchorDates,
  calculateAnchorOverwrites,
  buildAnchorRunPayload,
  expandWithPreviousDays,
  resolveDaySelectionState,
  mergeDayCellsIntoSelection,
  formatAnchorSkippedSummary,
  formatAuditValue,
  buildLatestImportLogMap,
  formatLastImportTooltip,
  buildImportLogQueryParams,
  DEFAULT_DAY_VIEW_INDICATORS,
  groupItemsByCalendarDay,
  resolveCalendarDaySelectionState,
  resolveIndicatorColumnSelectionState,
  filterCalendarDaysByMissingOnly,
  summarizeCalendarDayGroups
} from './autoBackfillUiHelpers.js';

console.log('Running IMPORT-LOG-AUDIT-01 anchor & audit helpers test suite...');

// ==========================================
// 1. computeAnchorDates: 3-day window [D, D-1, D-2]
// ==========================================
{
  // Test case 1.1: Standard mid-month anchor date
  const window1 = computeAnchorDates('2026-04-10', 3);
  assert.deepEqual(window1, ['2026-04-10', '2026-04-09', '2026-04-08']);

  // Test case 1.2: Month rollover (beginning of month March -> February 2026 non-leap year)
  const window2 = computeAnchorDates('2026-03-01', 3);
  assert.deepEqual(window2, ['2026-03-01', '2026-02-28', '2026-02-27']);

  // Test case 1.3: Year rollover (beginning of year 2026 -> end of 2025)
  const window3 = computeAnchorDates('2026-01-01', 3);
  assert.deepEqual(window3, ['2026-01-01', '2025-12-31', '2025-12-30']);

  // Test case 1.4: Invalid date input returns empty array
  assert.deepEqual(computeAnchorDates('invalid-date'), []);
  assert.deepEqual(computeAnchorDates(null), []);
  assert.deepEqual(computeAnchorDates(''), []);

  console.log('✔ 1. computeAnchorDates window calculation tests PASSED!');
}

// ==========================================
// 2. calculateAnchorOverwrites: Completed cells overwrite count
// ==========================================
{
  const mockCoverageItems = [
    // 2026-04-10: 2 completed, 1 incomplete
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-04-10', status: 'COMPLETED' },
    { indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-04-10', status: 'INCOMPLETE' },
    { indicator: 'F1.1', source_lane: 'HUE', business_date: '2026-04-10', status: 'COMPLETED' },
    // 2026-04-09: 1 completed
    { indicator: 'F4.1', source_lane: 'HUE', business_date: '2026-04-09', status: 'COMPLETED' },
    // 2026-04-08: 0 completed, 1 data error
    { indicator: 'F1.2', source_lane: 'HUE', business_date: '2026-04-08', status: 'DATA_ERROR' },
    // 2026-04-07 (outside window): 1 completed
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-04-07', status: 'COMPLETED' },
    // Non-targeted indicator (e.g. F9.9): completed inside window but not targeted
    { indicator: 'F9.9', source_lane: 'HUE', business_date: '2026-04-10', status: 'COMPLETED' }
  ];

  const result = calculateAnchorOverwrites(mockCoverageItems, '2026-04-10');
  assert.equal(result.anchorDate, '2026-04-10');
  assert.deepEqual(result.windowDates, ['2026-04-10', '2026-04-09', '2026-04-08']);
  assert.equal(result.overwriteCount, 3, 'Must count exactly 3 COMPLETED cells in the 3-day window for target indicators/lanes');
  assert.equal(result.completedItems.length, 3);
  assert.deepEqual(result.targetIndicators, ANCHOR_TARGET_INDICATORS);
  assert.deepEqual(result.targetLanes, ANCHOR_TARGET_LANES);

  // When no completed items exist in window
  const emptyResult = calculateAnchorOverwrites([], '2026-04-10');
  assert.equal(emptyResult.overwriteCount, 0);
  assert.deepEqual(emptyResult.completedItems, []);

  console.log('✔ 2. calculateAnchorOverwrites completed cells calculation tests PASSED!');
}

// ==========================================
// 3. buildAnchorRunPayload: Strictly anchor_date only
// ==========================================
{
  const payload = buildAnchorRunPayload('2026-04-10');
  assert.deepEqual(payload, { anchor_date: '2026-04-10', confirm_replace_completed: true });
  assert.equal(Object.keys(payload).length, 2, 'Payload must contain only anchor_date and the replace confirmation');

  console.log('✔ 3. buildAnchorRunPayload payload exclusivity tests PASSED!');
}

// ==========================================
// 4. formatAnchorSkippedSummary: Formats skipped list
// ==========================================
{
  const skippedList = [
    { indicator: 'F1.1', source_lane: 'TCT', business_date: '2026-04-10', reason: 'NOT_AUTOMATED_OR_NOT_ACTIVE' },
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-04-09', reason: 'EXCLUDED' }
  ];

  const summary = formatAnchorSkippedSummary(skippedList);
  assert.equal(summary.length, 2);
  assert.ok(summary[0].includes('F1.1 (TCT) ngày 2026-04-10'));
  assert.ok(summary[0].includes('thủ công'));
  assert.ok(summary[1].includes('F1.3 (HUE) ngày 2026-04-09'));
  assert.ok(summary[1].includes('loại trừ'));

  assert.equal(formatAnchorSkippedSummary([]), null);
  assert.equal(formatAnchorSkippedSummary(null), null);

  console.log('✔ 4. formatAnchorSkippedSummary tests PASSED!');
}

// ==========================================
// 5. formatAuditValue: "chưa ghi nhận" fallback for blank/null values
// ==========================================
{
  assert.equal(formatAuditValue(null), 'chưa ghi nhận');
  assert.equal(formatAuditValue(undefined), 'chưa ghi nhận');
  assert.equal(formatAuditValue(''), 'chưa ghi nhận');
  assert.equal(formatAuditValue('admin'), 'admin');
  assert.equal(formatAuditValue('REFRESH_DAY'), 'REFRESH_DAY');
  assert.equal(formatAuditValue(0), '0');
  assert.equal(formatAuditValue(120), '120');

  console.log('✔ 5. formatAuditValue historical non-inference tests PASSED!');
}

// ==========================================
// 6. buildLatestImportLogMap & formatLastImportTooltip
// ==========================================
{
  const mockLogItems = [
    {
      id: 10,
      ngay_do_kiem: '2026-04-10',
      indicator: 'F1.3',
      source_lane: 'HUE',
      status: 'COMPLETED',
      created_at_vn: '2026-04-10 14:35:00',
      actor: 'admin',
      import_mode: 'REFRESH_DAY',
      replaced_row_count: 50
    },
    {
      id: 9,
      ngay_do_kiem: '2026-04-10',
      indicator: 'F1.3',
      source_lane: 'TCT',
      status: 'FAILED',
      created_at_vn: '2026-04-10 14:30:00',
      actor: null, // old row
      import_mode: null, // old row
      replaced_row_count: null
    }
  ];

  const map = buildLatestImportLogMap(mockLogItems);
  assert.ok(map.has('F1.3::HUE::2026-04-10'));
  assert.ok(map.has('F1.3::TCT::2026-04-10'));
  assert.ok(map.has('F1.3::2026-04-10'));

  // Test tooltip with all audit fields present
  const hueLog = map.get('F1.3::HUE::2026-04-10');
  const tooltipHue = formatLastImportTooltip(hueLog);
  assert.equal(
    tooltipHue,
    'Lần import cuối: 2026-04-10 14:35:00, người dùng: admin, chế độ: REFRESH_DAY'
  );

  // Test tooltip with old row (actor and mode null -> "chưa ghi nhận")
  const tctLog = map.get('F1.3::TCT::2026-04-10');
  const tooltipTct = formatLastImportTooltip(tctLog);
  assert.equal(
    tooltipTct,
    'Lần import cuối: 2026-04-10 14:30:00, người dùng: chưa ghi nhận, chế độ: chưa ghi nhận'
  );

  // Test tooltip when no log entry exists
  const tooltipNull = formatLastImportTooltip(null);
  assert.equal(tooltipNull, 'Lần import cuối: chưa ghi nhận');

  console.log('✔ 6. buildLatestImportLogMap & formatLastImportTooltip tests PASSED!');
}

// ==========================================
// 7. buildImportLogQueryParams: Filter parameter formatting
// ==========================================
{
  const params = buildImportLogQueryParams({
    date_from: '2026-04-01',
    date_to: '2026-04-10',
    indicator: 'F1.3',
    lane: 'ALL',
    actor: 'admin',
    import_mode: 'REFRESH_DAY',
    status: 'ALL',
    page: 2,
    pageSize: 50
  });

  assert.deepEqual(params, {
    date_from: '2026-04-01',
    date_to: '2026-04-10',
    indicator: 'F1.3',
    actor: 'admin',
    import_mode: 'REFRESH_DAY',
    page: 2,
    pageSize: 50
  });
  assert.equal(params.lane, undefined, 'Lane ALL must be omitted');
  assert.equal(params.status, undefined, 'Status ALL must be omitted');

  console.log('✔ 7. buildImportLogQueryParams filter formatting tests PASSED!');
}

console.log('ALL IMPORT-LOG-AUDIT-01 helper tests PASSED SUCCESSFULLY! (7/7 Suites)');

// ==========================================
// 8. expandWithPreviousDays: picked day plus D-1, D-2 of the same indicator and lane
// ==========================================
{
  const cell = (indicator, lane, date, status = 'COMPLETED', extra = {}) => ({ indicator, source_lane: lane, business_date: date, status, ...extra });
  const all = [
    cell('F4.1', 'HUE', '2026-10-18'), cell('F4.1', 'HUE', '2026-10-17'), cell('F4.1', 'HUE', '2026-10-16'), cell('F4.1', 'HUE', '2026-10-15'),
    cell('F4.1', 'TCT', '2026-10-18'), cell('F4.1', 'TCT', '2026-10-17', 'EXCLUDED'), cell('F4.1', 'TCT', '2026-10-16'),
    cell('F1.1', 'HUE', '2026-10-17'),
  ];
  const result = expandWithPreviousDays([all[0], all[4]], all);
  assert.deepEqual(result.keys.sort(), [
    'F4.1::HUE::2026-10-16', 'F4.1::HUE::2026-10-17', 'F4.1::HUE::2026-10-18',
    'F4.1::TCT::2026-10-16', 'F4.1::TCT::2026-10-18',
  ]);
  assert.equal(result.extraKeys.length, 3, 'D-1, D-2 of HUE and D-2 of TCT; the excluded TCT D-1 and other indicators are not added');
  assert.ok(!result.keys.includes('F4.1::HUE::2026-10-15'), 'only 2 days before');
  assert.deepEqual(expandWithPreviousDays([], all), { keys: [], extraKeys: [] });
  assert.deepEqual(expandWithPreviousDays([all[3]], [all[3]]).keys, ['F4.1::HUE::2026-10-15'], 'no neighbours loaded: only the picked cell');
  console.log('✔ 8. expandWithPreviousDays tests PASSED!');
}

// ==========================================
// 9. expandWithPreviousDays allLanes + a finished day can start Nhập lại
// ==========================================
{
  const cell = (lane, date) => ({ indicator: 'F4.1', source_lane: lane, business_date: date, status: 'COMPLETED' });
  const all = [cell('HUE', '2026-10-18'), cell('TCT', '2026-10-18'), cell('HUE', '2026-10-17'), cell('TCT', '2026-10-17'), cell('HUE', '2026-10-16'), cell('TCT', '2026-10-16')];
  const lanesOnly = expandWithPreviousDays([all[0]], all);
  assert.deepEqual(lanesOnly.keys.sort(), ['F4.1::HUE::2026-10-16', 'F4.1::HUE::2026-10-17', 'F4.1::HUE::2026-10-18']);
  const everyLane = expandWithPreviousDays([all[0]], all, { allLanes: true });
  assert.equal(everyLane.keys.length, 5, 'HUE on the picked day plus HUE and TCT on D-1 and D-2');
  assert.ok(everyLane.keys.includes('F4.1::TCT::2026-10-17') && everyLane.keys.includes('F4.1::TCT::2026-10-16'));

  const doneDay = { date: '2026-10-18', items: [all[0], all[1]] };
  const selection = resolveDaySelectionState(doneDay, new Set(), { isReimportMode: false });
  assert.equal(selection.canSelect, true);
  assert.equal(selection.viaReimport, true);
  assert.equal(selection.selectableItems.length, 2);
  const holiday = { date: '2026-10-19', items: [{ ...cell('HUE', '2026-10-19'), holiday: { reason: 'x' } }] };
  assert.equal(resolveDaySelectionState(holiday, new Set(), { isReimportMode: false }).canSelect, false);
  console.log('✔ 9. allLanes expansion and finished-day selection tests PASSED!');
}

// ==========================================
// 10. mergeDayCellsIntoSelection: another day is added, never replaces; same day again unticks
// ==========================================
{
  const day = (date, status = 'COMPLETED') => ['F1.1', 'F1.2', 'F1.3', 'F4.1'].flatMap((indicator) => ['HUE', 'TCT'].map((lane) => ({ indicator, source_lane: lane, business_date: date, status })));
  const d18 = day('2026-10-18');
  const d17 = day('2026-10-17');
  const first = mergeDayCellsIntoSelection({ dayCells: d18 });
  assert.equal(first.reimportKeys.size, 8);
  assert.equal(first.bulkKeys.size, 0);

  const second = mergeDayCellsIntoSelection({ selectedReimportKeys: first.reimportKeys, dayCells: d17, knownItems: d18 });
  assert.equal(second.reimportKeys.size, 16, 'the earlier day is kept');

  const off = mergeDayCellsIntoSelection({ selectedReimportKeys: second.reimportKeys, dayCells: d18, knownItems: [...d18, ...d17] });
  assert.equal(off.removed, true);
  assert.equal(off.reimportKeys.size, 8);
  assert.ok([...off.reimportKeys].every((key) => key.endsWith('2026-10-17')));

  // new (not imported) days stay a Nhập mới selection; a completed day turns the whole thing into Nhập lại
  const fresh = day('2026-10-19', 'INCOMPLETE');
  const newOnly = mergeDayCellsIntoSelection({ dayCells: fresh });
  assert.equal(newOnly.bulkKeys.size, 8);
  assert.equal(newOnly.reimportKeys.size, 0);
  const mixed = mergeDayCellsIntoSelection({ selectedBulkKeys: newOnly.bulkKeys, dayCells: d18, knownItems: fresh });
  assert.equal(mixed.reimportKeys.size, 16);
  assert.equal(mixed.bulkKeys.size, 0);

  // holiday / excluded cells are never picked
  const holidayDay = day('2026-10-20', 'EXCLUDED');
  const none = mergeDayCellsIntoSelection({ dayCells: holidayDay });
  assert.equal(none.dayKeys.length, 0);
  assert.equal(none.reimportKeys.size + none.bulkKeys.size, 0);
  console.log('✔ 10. mergeDayCellsIntoSelection tests PASSED!');
}

// ==========================================
// 11. groupItemsByCalendarDay: exactly 1 row per calendar date, 4 indicators side-by-side
// ==========================================
{
  assert.deepEqual(DEFAULT_DAY_VIEW_INDICATORS, ['F1.1', 'F1.2', 'F1.3', 'F4.1']);
  const rawItems = [
    { indicator: 'F1.1', source_lane: 'HUE', business_date: '2026-10-18', status: 'COMPLETED' },
    { indicator: 'F1.1', source_lane: 'TCT', business_date: '2026-10-18', status: 'COMPLETED' },
    { indicator: 'F1.2', source_lane: 'HUE', business_date: '2026-10-18', status: 'INCOMPLETE' },
    { indicator: 'F1.2', source_lane: 'TCT', business_date: '2026-10-18', status: 'INCOMPLETE' },
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-10-18', status: 'COMPLETED' },
    { indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-10-18', status: 'COMPLETED' },
    { indicator: 'F4.1', source_lane: 'HUE', business_date: '2026-10-18', status: 'COMPLETED' },
    { indicator: 'F4.1', source_lane: 'TCT', business_date: '2026-10-18', status: 'COMPLETED' },
    // Earlier day: all complete
    { indicator: 'F1.1', source_lane: 'HUE', business_date: '2026-10-17', status: 'COMPLETED' },
    { indicator: 'F1.1', source_lane: 'TCT', business_date: '2026-10-17', status: 'COMPLETED' },
    { indicator: 'F1.2', source_lane: 'HUE', business_date: '2026-10-17', status: 'COMPLETED' },
    { indicator: 'F1.2', source_lane: 'TCT', business_date: '2026-10-17', status: 'COMPLETED' },
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-10-17', status: 'COMPLETED' },
    { indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-10-17', status: 'COMPLETED' },
    { indicator: 'F4.1', source_lane: 'HUE', business_date: '2026-10-17', status: 'COMPLETED' },
    { indicator: 'F4.1', source_lane: 'TCT', business_date: '2026-10-17', status: 'COMPLETED' },
  ];

  const calendarDays = groupItemsByCalendarDay(rawItems);
  assert.equal(calendarDays.length, 2, '2 distinct calendar dates -> 2 rows, not 8 rows');
  assert.equal(calendarDays[0].date, '2026-10-18', 'newest date first');
  assert.equal(calendarDays[1].date, '2026-10-17');

  const d18 = calendarDays[0];
  assert.equal(d18.items.length, 8, '8 items inside day 2026-10-18');
  assert.ok(d18.indicators['F1.1'], 'F1.1 indicator slot exists');
  assert.ok(d18.indicators['F1.2'], 'F1.2 indicator slot exists');
  assert.ok(d18.indicators['F1.3'], 'F1.3 indicator slot exists');
  assert.ok(d18.indicators['F4.1'], 'F4.1 indicator slot exists');
  assert.equal(d18.indicators['F1.1'].lanes.HUE.status, 'COMPLETED');
  assert.equal(d18.indicators['F1.1'].lanes.TCT.status, 'COMPLETED');
  assert.equal(d18.indicators['F1.2'].lanes.HUE.status, 'INCOMPLETE');
  assert.equal(d18.hasMissing, true, 'd18 has F1.2 incomplete so hasMissing is true');
  assert.equal(d18.isFullyComplete, false);

  const d17 = calendarDays[1];
  assert.equal(d17.hasMissing, false);
  assert.equal(d17.isFullyComplete, true);

  // Empty and null inputs
  assert.deepEqual(groupItemsByCalendarDay([]), []);
  assert.deepEqual(groupItemsByCalendarDay(null), []);
  console.log('✔ 11. groupItemsByCalendarDay day-per-row grouping tests PASSED!');
}

// ==========================================
// 12. resolveCalendarDaySelectionState: full, partial, none, or excluded
// ==========================================
{
  const makeDay = (date, status = 'COMPLETED') => {
    const items = ['F1.1', 'F1.2', 'F1.3', 'F4.1'].flatMap((indicator) =>
      ['HUE', 'TCT'].map((lane) => ({ indicator, source_lane: lane, business_date: date, status }))
    );
    return groupItemsByCalendarDay(items)[0];
  };

  const day18 = makeDay('2026-10-18', 'COMPLETED');
  const d18Keys = day18.items.map((i) => `${i.indicator}::${i.source_lane}::${i.business_date}`);

  // None selected
  const none = resolveCalendarDaySelectionState(day18, new Set(), new Set());
  assert.equal(none.canSelect, true);
  assert.equal(none.isSelected, false);
  assert.equal(none.isPartial, false);
  assert.equal(none.selectedCount, 0);
  assert.equal(none.totalSelectable, 8);

  // Partial selected (2 of 8 cells picked)
  const partialKeys = new Set([d18Keys[0], d18Keys[1]]);
  const partial = resolveCalendarDaySelectionState(day18, new Set(), partialKeys);
  assert.equal(partial.canSelect, true);
  assert.equal(partial.isSelected, false);
  assert.equal(partial.isPartial, true);
  assert.equal(partial.selectedCount, 2);

  // All 8 cells selected
  const allKeys = new Set(d18Keys);
  const full = resolveCalendarDaySelectionState(day18, new Set(), allKeys);
  assert.equal(full.canSelect, true);
  assert.equal(full.isSelected, true);
  assert.equal(full.isPartial, false);
  assert.equal(full.selectedCount, 8);

  // Excluded/holiday day: cannot select
  const holidayItems = ['F1.1', 'F1.2'].flatMap((indicator) =>
    ['HUE'].map((lane) => ({ indicator, source_lane: lane, business_date: '2026-10-19', status: 'EXCLUDED', holiday: { reason: 'Nghỉ lễ' } }))
  );
  const holidayDay = groupItemsByCalendarDay(holidayItems)[0];
  const holidayState = resolveCalendarDaySelectionState(holidayDay, new Set(), new Set());
  assert.equal(holidayState.canSelect, false);
  assert.equal(holidayState.isSelected, false);
  assert.equal(holidayState.isPartial, false);
  console.log('✔ 12. resolveCalendarDaySelectionState tests PASSED!');
}

// ==========================================
// 13. resolveIndicatorColumnSelectionState: column header multi-day toggle
// ==========================================
{
  const makeDay = (date, status = 'INCOMPLETE') => {
    const items = ['F1.1', 'F1.2', 'F1.3', 'F4.1'].flatMap((indicator) =>
      ['HUE', 'TCT'].map((lane) => ({ indicator, source_lane: lane, business_date: date, status }))
    );
    return groupItemsByCalendarDay(items)[0];
  };

  const days = [makeDay('2026-10-18'), makeDay('2026-10-17')];
  // Indicator F1.1 across 2 days has 4 items total (2 days x 2 lanes)
  const f11Items = days.flatMap((d) => d.indicators['F1.1'].items);
  assert.equal(f11Items.length, 4);

  // None selected
  const colNone = resolveIndicatorColumnSelectionState(days, 'F1.1', new Set(), new Set());
  assert.equal(colNone.canSelect, true);
  assert.equal(colNone.isSelected, false);
  assert.equal(colNone.isPartial, false);
  assert.equal(colNone.selectableItems.length, 4);
  assert.equal(colNone.selectedCount, 0);

  // Partial selected
  const bulkPartial = new Set([`F1.1::HUE::2026-10-18`]);
  const colPartial = resolveIndicatorColumnSelectionState(days, 'F1.1', bulkPartial, new Set());
  assert.equal(colPartial.isSelected, false);
  assert.equal(colPartial.isPartial, true);
  assert.equal(colPartial.selectedCount, 1);

  // All selected
  const bulkAll = new Set([
    `F1.1::HUE::2026-10-18`,
    `F1.1::TCT::2026-10-18`,
    `F1.1::HUE::2026-10-17`,
    `F1.1::TCT::2026-10-17`
  ]);
  const colFull = resolveIndicatorColumnSelectionState(days, 'F1.1', bulkAll, new Set());
  assert.equal(colFull.isSelected, true);
  assert.equal(colFull.isPartial, false);
  assert.equal(colFull.selectedCount, 4);
  console.log('✔ 13. resolveIndicatorColumnSelectionState tests PASSED!');
}

// ==========================================
// 14. filterCalendarDaysByMissingOnly & summarizeCalendarDayGroups
// ==========================================
{
  const makeDay = (date, hasMissing) => {
    const status = hasMissing ? 'INCOMPLETE' : 'COMPLETED';
    const items = ['F1.1'].map((indicator) => ({ indicator, source_lane: 'HUE', business_date: date, status }));
    return groupItemsByCalendarDay(items)[0];
  };

  const days = [makeDay('2026-10-18', true), makeDay('2026-10-17', false), makeDay('2026-10-16', true)];
  const missingOnly = filterCalendarDaysByMissingOnly(days);
  assert.equal(missingOnly.length, 2);
  assert.deepEqual(missingOnly.map((d) => d.date), ['2026-10-18', '2026-10-16']);

  const summary = summarizeCalendarDayGroups(days);
  assert.equal(summary.totalDays, 3);
  assert.equal(summary.completeDays, 1);
  assert.equal(summary.missingDays, 2);
  assert.equal(summary.label, '3 ngày • 1 đã xử lý • 2 còn thiếu');

  console.log('✔ 14. filter & summarizeCalendarDayGroups tests PASSED!');
}

// ==========================================
// 14. Column header tick on a mixed column reaches "full", picks completed cells and unticks again
// ==========================================
{
  const cell = (date, status) => ({ indicator: 'F1.1', source_lane: 'HUE', business_date: date, status });
  const days = [
    { indicators: { 'F1.1': { items: [cell('2026-10-18', 'COMPLETED')] } } },
    { indicators: { 'F1.1': { items: [cell('2026-10-17', 'INCOMPLETE')] } } },
  ];
  const all = days.flatMap((d) => d.indicators['F1.1'].items);

  let bulk = new Set();
  let reimport = new Set();
  const state0 = resolveIndicatorColumnSelectionState(days, 'F1.1', bulk, reimport);
  assert.equal(state0.canSelect, true);
  assert.equal(state0.selectableItems.length, 2, 'completed and missing cells are both pickable');

  const on = mergeDayCellsIntoSelection({ selectedBulkKeys: bulk, selectedReimportKeys: reimport, dayCells: state0.selectableItems, knownItems: all });
  bulk = on.bulkKeys; reimport = on.reimportKeys;
  assert.equal(reimport.size, 2, 'a completed cell makes it a Nhập lại selection holding both cells');
  const state1 = resolveIndicatorColumnSelectionState(days, 'F1.1', bulk, reimport);
  assert.equal(state1.isSelected, true);
  assert.equal(state1.isPartial, false);

  const off = mergeDayCellsIntoSelection({ selectedBulkKeys: bulk, selectedReimportKeys: reimport, dayCells: state1.selectableItems, knownItems: all });
  assert.equal(off.reimportKeys.size + off.bulkKeys.size, 0);

  // a column of finished cells only is no longer dead
  const doneOnly = [{ indicators: { 'F1.1': { items: [cell('2026-10-18', 'COMPLETED')] } } }];
  const done = resolveIndicatorColumnSelectionState(doneOnly, 'F1.1', new Set(), new Set());
  assert.equal(done.canSelect, true);
  const picked = mergeDayCellsIntoSelection({ dayCells: done.selectableItems, knownItems: doneOnly[0].indicators['F1.1'].items });
  assert.equal(picked.reimportKeys.size, 1);
  console.log('✔ 14. column header tick (mixed and finished columns) tests PASSED!');
}

