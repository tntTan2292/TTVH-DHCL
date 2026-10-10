import assert from 'node:assert/strict';
import {
  countDistinctDates,
  findNewestUnfinishedMonthKey,
  formatSelectionCountLabel,
  getItemKey,
  groupItemsByDay,
  groupItemsByIndicatorAndMonth,
  resolveDaySelectionState,
  summarizeMonthDays
} from './autoBackfillUiHelpers.js';

console.log('Running UI-IMPORT-DAYVIEW-01 day-view helpers test suite...');

// ==========================================
// 1. Empty input behavior
// ==========================================
{
  const emptyDays = groupItemsByDay([]);
  assert.deepEqual(emptyDays, []);

  const emptySummary = summarizeMonthDays([]);
  assert.equal(emptySummary.totalDays, 0);
  assert.equal(emptySummary.completeDays, 0);
  assert.equal(emptySummary.missingDays, 0);
  assert.equal(emptySummary.label, '0 ngày • 0 đã xử lý • 0 còn thiếu');

  const emptyMonthKey = findNewestUnfinishedMonthKey([]);
  assert.equal(emptyMonthKey, null);

  console.log('✔ 1. Empty input tests PASSED!');
}

// ==========================================
// 2. Two lanes per day (HUE + TCT)
// ==========================================
{
  const rawItems = [
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-10-07', status: 'INCOMPLETE' },
    { indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-10-07', status: 'INCOMPLETE' },
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-10-08', status: 'COMPLETED' },
    { indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-10-08', status: 'COMPLETED' },
  ];

  const days = groupItemsByDay(rawItems);
  assert.equal(days.length, 2, 'Should group 4 items into 2 days');

  // Sorted descending by date: 2026-10-08 first, then 2026-10-07
  assert.equal(days[0].date, '2026-10-08');
  assert.equal(days[1].date, '2026-10-07');

  assert.equal(days[0].lanes.HUE.status, 'COMPLETED');
  assert.equal(days[0].lanes.TCT.status, 'COMPLETED');
  assert.deepEqual(days[0].laneOrder, ['HUE', 'TCT']);

  assert.equal(days[1].lanes.HUE.status, 'INCOMPLETE');
  assert.equal(days[1].lanes.TCT.status, 'INCOMPLETE');
  assert.deepEqual(days[1].laneOrder, ['HUE', 'TCT']);

  const summary = summarizeMonthDays(days);
  assert.equal(summary.totalDays, 2);
  assert.equal(summary.completeDays, 1);
  assert.equal(summary.missingDays, 1);
  assert.equal(summary.missingByLane.HUE, 1);
  assert.equal(summary.missingByLane.TCT, 1);
  assert.equal(summary.label, '2 ngày • 1 đã xử lý • 1 còn thiếu (HUE 1, TCT 1)');

  console.log('✔ 2. Two lanes per day tests PASSED!');
}

// ==========================================
// 3. One lane per day (single-lane input or lane-filtered)
// ==========================================
{
  const hueOnlyItems = [
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-10-05', status: 'COMPLETED' },
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-10-06', status: 'INCOMPLETE' },
  ];

  const days = groupItemsByDay(hueOnlyItems);
  assert.equal(days.length, 2);
  assert.equal(days[0].lanes.HUE.business_date, '2026-10-06');
  assert.equal(days[0].lanes.TCT, undefined);
  assert.deepEqual(days[0].laneOrder, ['HUE']);

  const summary = summarizeMonthDays(days);
  assert.equal(summary.totalDays, 2);
  assert.equal(summary.completeDays, 1);
  assert.equal(summary.missingDays, 1);
  assert.equal(summary.missingByLane.HUE, 1);
  assert.equal(summary.missingByLane.TCT, undefined);
  assert.equal(summary.label, '2 ngày • 1 đã xử lý • 1 còn thiếu (HUE 1)');

  console.log('✔ 3. One lane / lane-filtered tests PASSED!');
}

// ==========================================
// 4. Mixed day (one lane COMPLETED, one missing) & smart selection default
// ==========================================
{
  const mixedDayItems = [
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-10-04', status: 'COMPLETED' },
    { indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-10-04', status: 'INCOMPLETE' },
  ];

  const [day] = groupItemsByDay(mixedDayItems);
  assert.equal(day.date, '2026-10-04');

  // Normal mode: only TCT (INCOMPLETE) is selectable for bulk new-import/exemption
  const normalSelection = resolveDaySelectionState(day, new Set(), { isReimportMode: false });
  assert.equal(normalSelection.canSelect, true);
  assert.equal(normalSelection.isSelected, false);
  assert.equal(normalSelection.selectableItems.length, 1, 'Only TCT is selectable in normal mode');
  assert.equal(normalSelection.selectableItems[0].source_lane, 'TCT');

  // When TCT key is in selectedBulkKeys, day is fully selected for normal mode
  const tctKey = getItemKey(mixedDayItems[1]);
  const normalSelected = resolveDaySelectionState(day, new Set([tctKey]), { isReimportMode: false });
  assert.equal(normalSelected.isSelected, true);
  assert.equal(normalSelected.isPartial, false);

  // Reimport mode: BOTH COMPLETED and INCOMPLETE are reimport-selectable
  const reimportSelection = resolveDaySelectionState(day, new Set(), { isReimportMode: true });
  assert.equal(reimportSelection.canSelect, true);
  assert.equal(reimportSelection.selectableItems.length, 2, 'Both lanes selectable in reimport mode');

  // Partial selection in reimport mode (only 1 of 2 lanes selected)
  const partialReimport = resolveDaySelectionState(day, new Set([tctKey]), { isReimportMode: true });
  assert.equal(partialReimport.isSelected, false);
  assert.equal(partialReimport.isPartial, true);

  console.log('✔ 4. Mixed COMPLETED/INCOMPLETE day tests PASSED!');
}

// ==========================================
// 5. Holiday day (status EXCLUDED, holiday object present)
// ==========================================
{
  const holidayItems = [
    {
      indicator: 'F1.3',
      source_lane: 'HUE',
      business_date: '2026-09-02',
      status: 'EXCLUDED',
      holiday: { business_date: '2026-09-02', reason: 'Quốc khánh' }
    },
    {
      indicator: 'F1.3',
      source_lane: 'TCT',
      business_date: '2026-09-02',
      status: 'EXCLUDED',
      holiday: { business_date: '2026-09-02', reason: 'Quốc khánh' }
    }
  ];

  const [day] = groupItemsByDay(holidayItems);
  assert.equal(day.date, '2026-09-02');
  assert.ok(day.holiday, 'Day must retain holiday metadata');
  assert.equal(day.holiday.reason, 'Quốc khánh');

  // Holiday day is NOT selectable in normal or reimport mode
  const normalSelection = resolveDaySelectionState(day, new Set(), { isReimportMode: false });
  assert.equal(normalSelection.canSelect, false);

  const reimportSelection = resolveDaySelectionState(day, new Set(), { isReimportMode: true });
  assert.equal(reimportSelection.canSelect, false);

  const summary = summarizeMonthDays([day]);
  assert.equal(summary.totalDays, 1);
  assert.equal(summary.completeDays, 1, 'Holiday EXCLUDED counts as processed/complete');
  assert.equal(summary.missingDays, 0);

  console.log('✔ 5. Holiday day tests PASSED!');
}

// ==========================================
// 6. DATA_ERROR lane handling
// ==========================================
{
  const dataErrorItems = [
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-10-01', status: 'DATA_ERROR' },
    { indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-10-01', status: 'COMPLETED' },
  ];

  const [day] = groupItemsByDay(dataErrorItems);
  const selection = resolveDaySelectionState(day, new Set(), { isReimportMode: false });
  assert.equal(selection.canSelect, true);
  assert.equal(selection.selectableItems.length, 1);
  assert.equal(selection.selectableItems[0].status, 'DATA_ERROR');

  const summary = summarizeMonthDays([day]);
  assert.equal(summary.missingDays, 1);
  assert.equal(summary.missingByLane.HUE, 1);
  assert.equal(summary.label, '1 ngày • 0 đã xử lý • 1 còn thiếu (HUE 1, TCT 0)');

  console.log('✔ 6. DATA_ERROR lane tests PASSED!');
}

// ==========================================
// 7. Auto-open newest month group with unfinished items
// ==========================================
{
  const rawItems = [
    // Month 2026-09: All completed
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-09-01', status: 'COMPLETED' },
    { indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-09-01', status: 'COMPLETED' },
    // Month 2026-08: Has missing items
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-08-10', status: 'INCOMPLETE' },
    // Month 2026-07: Has missing items
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-07-05', status: 'DATA_ERROR' },
  ];

  const groups = groupItemsByIndicatorAndMonth(rawItems);
  assert.equal(groups.length, 3);

  const newestUnfinishedKey = findNewestUnfinishedMonthKey(groups);
  // 2026-09 is all processed, so 2026-08 is the newest unfinished month!
  assert.equal(newestUnfinishedKey, 'F1.3::2026-08');

  // If all groups are complete:
  const completeGroups = groupItemsByIndicatorAndMonth([
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-09-01', status: 'COMPLETED' }
  ]);
  assert.equal(findNewestUnfinishedMonthKey(completeGroups), null);

  console.log('✔ 7. Auto-open newest unfinished month tests PASSED!');
}

// ==========================================
// 8. Selection count wording & distinct dates
// ==========================================
{
  const keys = new Set([
    'F1.3::HUE::2026-10-01',
    'F1.3::TCT::2026-10-01',
    'F1.3::HUE::2026-10-02',
  ]);

  const distinctDates = countDistinctDates(keys);
  assert.equal(distinctDates, 2, 'Must count 2 distinct business dates');

  const label = formatSelectionCountLabel(keys);
  assert.equal(label, 'Đã chọn 2 ngày (3 nguồn)');

  const reimportLabel = formatSelectionCountLabel(keys, { suffix: '(Tái nhập)' });
  assert.equal(reimportLabel, 'Đã chọn 2 ngày (3 nguồn) (Tái nhập)');

  console.log('✔ 8. Selection count label tests PASSED!');
}

// ==========================================
// 9. Review fixes: "đã xử lý" wording and key format (Opus review F1, F3, F5)
// ==========================================
{
  // Key format is the one the coverage rows have always used: INDICATOR::LANE::DATE.
  assert.equal(getItemKey({ indicator: ' f1.3 ', source_lane: 'hue', business_date: '2026-10-01' }), 'F1.3::HUE::2026-10-01');

  // A day with an EXCLUDED source and a COMPLETED source, and a single-source day, are "đã xử lý",
  // never "đủ cả 2 nguồn".
  const summary = summarizeMonthDays([
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-10-02', status: 'EXCLUDED' },
    { indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-10-02', status: 'COMPLETED' },
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-10-01', status: 'COMPLETED' },
  ]);
  assert.equal(summary.label, '2 ngày • 2 đã xử lý • 0 còn thiếu');
  assert.ok(!summary.label.includes('đủ cả 2 nguồn'));

  console.log('✔ 9. Review-fix wording and key format tests PASSED!');
}

console.log('ALL UI-IMPORT-DAYVIEW-01 day-view helpers tests PASSED SUCCESSFULLY!');
