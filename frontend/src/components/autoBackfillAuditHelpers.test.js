import assert from 'node:assert/strict';
import {
  ANCHOR_TARGET_INDICATORS,
  ANCHOR_TARGET_LANES,
  computeAnchorDates,
  calculateAnchorOverwrites,
  buildAnchorRunPayload,
  expandWithPreviousDays,
  resolveDaySelectionState,
  formatAnchorSkippedSummary,
  formatAuditValue,
  buildLatestImportLogMap,
  formatLastImportTooltip,
  buildImportLogQueryParams
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
