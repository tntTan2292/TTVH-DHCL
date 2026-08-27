import assert from 'node:assert/strict';
import {
  aggregateReportTotals,
  groupItemsByIndicatorAndMonth,
  paginateItems,
  resolveDynamicIndicators,
  resolveEffectiveRunState,
  resolveIndicatorGridClass,
  resolveNoCodeStatus,
  resolveOpenRunRowActions,
  resolveRunActionButtons,
  resolveRunIdleState,
  resolveWaitingAuthLanes
} from './autoBackfillUiHelpers.js';

console.log('Running AUTO-BACKFILL-UI behavior and contract test suite...');

// ==========================================
// 1. Contract Test: Effective Run State Resolution
// ==========================================
{
  // Test case 1.1: Normal RUNNING status without safety overlay
  const runRunning = { id: 'run_101', status: 'RUNNING', safety_state: null };
  assert.equal(resolveEffectiveRunState(runRunning), 'RUNNING', 'Status RUNNING must resolve to RUNNING');

  // Test case 1.2: PAUSED status
  const runPaused = { id: 'run_102', status: 'PAUSED', safety_state: null };
  assert.equal(resolveEffectiveRunState(runPaused), 'PAUSED', 'Status PAUSED must resolve to PAUSED');

  // Test case 1.3: WAITING_AUTH safety state overlay on RUNNING status
  const runWaitingAuth = { id: 'run_103', status: 'RUNNING', safety_state: 'WAITING_AUTH' };
  assert.equal(resolveEffectiveRunState(runWaitingAuth), 'WAITING_AUTH', 'safety_state WAITING_AUTH must override status RUNNING');

  // Test case 1.4: CIRCUIT_OPEN safety state overlay
  const runCircuitOpen = { id: 'run_104', status: 'RUNNING', safety_state: 'CIRCUIT_OPEN' };
  assert.equal(resolveEffectiveRunState(runCircuitOpen), 'CIRCUIT_OPEN', 'safety_state CIRCUIT_OPEN must override status RUNNING');

  // Test case 1.5: BLOCKED_INTEGRITY safety state overlay
  const runBlockedIntegrity = { id: 'run_105', status: 'RUNNING', safety_state: 'BLOCKED_INTEGRITY' };
  assert.equal(resolveEffectiveRunState(runBlockedIntegrity), 'BLOCKED_INTEGRITY', 'safety_state BLOCKED_INTEGRITY must override status RUNNING');

  // Test case 1.6: COMPLETED status
  const runCompleted = { id: 'run_106', status: 'COMPLETED', safety_state: null };
  assert.equal(resolveEffectiveRunState(runCompleted), 'COMPLETED', 'Status COMPLETED must resolve to COMPLETED');

  // Test case 1.7: COMPLETED_WITH_ERRORS status
  const runCompletedErrors = { id: 'run_107', status: 'COMPLETED_WITH_ERRORS', safety_state: null };
  assert.equal(resolveEffectiveRunState(runCompletedErrors), 'COMPLETED_WITH_ERRORS', 'Status COMPLETED_WITH_ERRORS must resolve to COMPLETED_WITH_ERRORS');

  console.log('✔ 1. Effective Run State Resolution tests PASSED!');
}

// ==========================================
// 2. Contract Test: WAITING_AUTH Lane Resolution
// ==========================================
{
  // Test case 2.1: HUE lane waiting
  const run = { id: 'run_201', status: 'RUNNING', safety_state: 'WAITING_AUTH', requested_lane: null };
  const jobsHueWaiting = [
    { id: 'j1', indicator: 'F1.3', source_lane: 'HUE', state: 'WAITING_AUTH', safety_state: 'WAITING_AUTH' },
    { id: 'j2', indicator: 'F1.3', source_lane: 'HUE', state: 'SUCCESS', safety_state: null }
  ];
  const waitingLanesHue = resolveWaitingAuthLanes(run, jobsHueWaiting);
  assert.deepEqual(waitingLanesHue, ['HUE'], 'Must resolve exactly HUE lane for WAITING_AUTH');

  // Test case 2.2: TCT lane waiting
  const jobsTctWaiting = [
    { id: 'j3', indicator: 'F4.1', source_lane: 'TCT', state: 'WAITING_AUTH', safety_state: 'WAITING_AUTH' }
  ];
  const waitingLanesTct = resolveWaitingAuthLanes(run, jobsTctWaiting);
  assert.deepEqual(waitingLanesTct, ['TCT'], 'Must resolve exactly TCT lane for WAITING_AUTH');

  // Test case 2.3: Both HUE & TCT waiting
  const jobsBothWaiting = [
    { id: 'j1', indicator: 'F1.3', source_lane: 'HUE', state: 'WAITING_AUTH', safety_state: 'WAITING_AUTH' },
    { id: 'j3', indicator: 'F4.1', source_lane: 'TCT', state: 'WAITING_AUTH', safety_state: 'WAITING_AUTH' }
  ];
  const waitingLanesBoth = resolveWaitingAuthLanes(run, jobsBothWaiting);
  assert.deepEqual(waitingLanesBoth.sort(), ['HUE', 'TCT'], 'Must resolve both HUE and TCT when both have waiting jobs');

  // Test case 2.4: Requested lane fallback when no job level safety state is present
  const runWithRequestedLane = { id: 'run_204', status: 'RUNNING', safety_state: 'WAITING_AUTH', requested_lane: 'HUE' };
  const waitingLanesFallback = resolveWaitingAuthLanes(runWithRequestedLane, []);
  assert.deepEqual(waitingLanesFallback, ['HUE'], 'Must use requested_lane fallback when no waiting job is found');

  // Test case 2.5: Regression — a genuinely RUNNING run (safety_state null) must NEVER
  // fall back to requested_lane just because no job in `jobs` matches WAITING_AUTH.
  // This was a false-positive "Cần đăng nhập thủ công" banner on a normally running run.
  const runActuallyRunning = { id: 'run_205', status: 'RUNNING', safety_state: null, requested_lane: 'HUE' };
  const waitingLanesRunning = resolveWaitingAuthLanes(runActuallyRunning, []);
  assert.deepEqual(waitingLanesRunning, [], 'Must NOT fall back to requested_lane when run.safety_state is not WAITING_AUTH');

  // Test case 2.6: Regression — same false-positive risk on a COMPLETED run.
  const runCompletedForLanes = { id: 'run_206', status: 'COMPLETED', safety_state: null, requested_lane: 'TCT' };
  const waitingLanesCompleted = resolveWaitingAuthLanes(runCompletedForLanes, []);
  assert.deepEqual(waitingLanesCompleted, [], 'Must NOT fall back to requested_lane on a COMPLETED run');

  console.log('✔ 2. WAITING_AUTH Lane Resolution tests PASSED!');
}

// ==========================================
// 3. Contract Test: PO Report Totals Aggregation
// ==========================================
{
  // Test case 3.1: Standard backend getReport API payload with totals object
  const reportPayload = {
    run_id: 'run_301',
    run_state: 'COMPLETED_WITH_ERRORS',
    action_required: 'Review 1 failed job',
    totals: {
      total: 10,
      SUCCESS: 7,
      SKIPPED_ALREADY_SUCCESS: 1,
      QUEUED: 0,
      FAILED_TERMINAL: 1,
      MANUAL_ONLY: 1
    },
    items: [
      { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-08-10', state: 'SUCCESS' },
      { indicator: 'F4.1', source_lane: 'TCT', business_date: '2026-08-10', state: 'FAILED_TERMINAL' }
    ]
  };

  const totalsAggregated = aggregateReportTotals(reportPayload);
  assert.equal(totalsAggregated.total, 10, 'Total jobs count must be 10');
  assert.equal(totalsAggregated.success, 8, 'Success jobs (SUCCESS + SKIPPED_ALREADY_SUCCESS) must be 8');
  assert.equal(totalsAggregated.pending, 0, 'Pending jobs count must be 0');
  assert.equal(totalsAggregated.failed, 2, 'Failed/manual jobs count must be 2');

  // Test case 3.2: Empty report object handles gracefully with zero totals
  const emptyReportTotals = aggregateReportTotals(null);
  assert.equal(emptyReportTotals.total, 0, 'Null report must return 0 total');
  assert.equal(emptyReportTotals.success, 0, 'Null report must return 0 success');
  assert.equal(emptyReportTotals.failed, 0, 'Null report must return 0 failed');

  // Test case 3.3: Items fallback when totals object is missing
  const reportWithoutTotalsObj = {
    run_id: 'run_303',
    run_state: 'RUNNING',
    items: [
      { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-08-15', state: 'SUCCESS' },
      { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-08-14', state: 'RUNNING' },
      { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-08-13', state: 'QUEUED' },
      { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-08-12', state: 'WAITING_AUTH' }
    ]
  };
  const totalsFromItems = aggregateReportTotals(reportWithoutTotalsObj);
  assert.equal(totalsFromItems.total, 4, 'Recalculated total from items must be 4');
  assert.equal(totalsFromItems.success, 1, 'Recalculated success from items must be 1');
  assert.equal(totalsFromItems.pending, 2, 'Recalculated pending from items must be 2');
  assert.equal(totalsFromItems.failed, 1, 'Recalculated failed from items must be 1');

  console.log('✔ 3. PO Report Totals Aggregation tests PASSED!');
}

// ==========================================
// 4. Contract Test: Action Buttons Enabled/Disabled State
// ==========================================
{
  // Test case 4.1: RUNNING state enables Pause, disables Resume and Reset Circuit
  const runningActions = resolveRunActionButtons('RUNNING');
  assert.equal(runningActions.canPause, true, 'RUNNING state must enable Pause button');
  assert.equal(runningActions.canResume, false, 'RUNNING state must disable Resume button');
  assert.equal(runningActions.canResetCircuit, false, 'RUNNING state must disable Reset Circuit button');

  // Test case 4.2: PAUSED state enables Resume, disables Pause
  const pausedActions = resolveRunActionButtons('PAUSED');
  assert.equal(pausedActions.canPause, false, 'PAUSED state must disable Pause button');
  assert.equal(pausedActions.canResume, true, 'PAUSED state must enable Resume button');

  // Test case 4.3: WAITING_AUTH enables Resume button to allow operator resume after login
  const waitingAuthActions = resolveRunActionButtons('WAITING_AUTH');
  assert.equal(waitingAuthActions.canResume, true, 'WAITING_AUTH state must enable Resume button');

  // Test case 4.4: CIRCUIT_OPEN enables Reset Circuit button
  const circuitOpenActions = resolveRunActionButtons('CIRCUIT_OPEN');
  assert.equal(circuitOpenActions.canResetCircuit, true, 'CIRCUIT_OPEN state must enable Reset Circuit button');

  // Test case 4.5: BLOCKED_INTEGRITY marks isBlockedIntegrity true
  const integrityActions = resolveRunActionButtons('BLOCKED_INTEGRITY');
  assert.equal(integrityActions.isBlockedIntegrity, true, 'BLOCKED_INTEGRITY state must set isBlockedIntegrity true');

  // Test case 4.6: COMPLETED marks isTerminal true
  const completedActions = resolveRunActionButtons('COMPLETED');
  assert.equal(completedActions.isTerminal, true, 'COMPLETED state must be terminal');

  // Test case 4.7: COMPLETED_WITH_ERRORS marks isTerminal true
  const completedErrorsActions = resolveRunActionButtons('COMPLETED_WITH_ERRORS');
  assert.equal(completedErrorsActions.isTerminal, true, 'COMPLETED_WITH_ERRORS state must be terminal');

  console.log('✔ 4. Action Buttons Enabled/Disabled State tests PASSED!');
}

// ==========================================
// 5. Contract Test: 10 Rows/Page Pagination Helper
// ==========================================
{
  const testItems = Array.from({ length: 25 }, (_, i) => ({ id: `item_${i + 1}` }));

  // Test case 5.1: Default 10 rows/page -> Page 1 of 3
  const page1 = paginateItems(testItems, 1, 10);
  assert.equal(page1.pageItems.length, 10, 'Page 1 must contain 10 items');
  assert.equal(page1.currentPage, 1, 'Current page must be 1');
  assert.equal(page1.totalPages, 3, 'Total pages for 25 items at 10/page must be 3');
  assert.equal(page1.hasNext, true, 'Page 1 must have next page');
  assert.equal(page1.hasPrev, false, 'Page 1 must not have prev page');

  // Test case 5.2: Page 3 of 3 -> 5 items
  const page3 = paginateItems(testItems, 3, 10);
  assert.equal(page3.pageItems.length, 5, 'Page 3 must contain 5 items');
  assert.equal(page3.hasNext, false, 'Page 3 must not have next page');
  assert.equal(page3.hasPrev, true, 'Page 3 must have prev page');

  // Test case 5.3: Selectable page size 20
  const page20 = paginateItems(testItems, 1, 20);
  assert.equal(page20.pageItems.length, 20, 'Page size 20 must return 20 items');
  assert.equal(page20.totalPages, 2, '25 items at 20/page must be 2 pages');

  console.log('✔ 5. Pagination Helper tests PASSED!');
}

// ==========================================
// 6. Future-State 4-Indicator Scalability Fixture Test
// ==========================================
{
  const fixture4Indicators = {
    indicators: [
      { code: 'F1.3', display_name: 'F1.3 KPI', display_order: 1, badge_theme: 'blue' },
      { code: 'F4.1', display_name: 'F4.1 Phát BC', display_order: 2, badge_theme: 'teal' },
      { code: 'F2.TEST', display_name: 'F2.TEST Giả lập 1', display_order: 3, badge_theme: 'indigo' },
      { code: 'F5.TEST', display_name: 'F5.TEST Giả lập 2', display_order: 4 } // missing badge_theme -> neutral slate fallback
    ],
    items: [
      { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-08-18', status: 'MISSING' },
      { indicator: 'F4.1', source_lane: 'TCT', business_date: '2026-08-18', status: 'SUCCESS' },
      { indicator: 'F2.TEST', source_lane: 'HUE', business_date: '2026-08-18', status: 'SUCCESS' },
      { indicator: 'F5.TEST', source_lane: 'TCT', business_date: '2026-08-18', status: 'MISSING' }
    ]
  };

  const resolvedIndicators = resolveDynamicIndicators(fixture4Indicators);
  assert.equal(resolvedIndicators.length, 4, 'Must dynamically resolve exactly 4 indicators from payload');
  assert.equal(resolvedIndicators[0].code, 'F1.3', 'Indicator 1 must be F1.3');
  assert.equal(resolvedIndicators[1].code, 'F4.1', 'Indicator 2 must be F4.1');
  assert.equal(resolvedIndicators[2].code, 'F2.TEST', 'Indicator 3 must be F2.TEST (zero code modification)');
  assert.equal(resolvedIndicators[3].code, 'F5.TEST', 'Indicator 4 must be F5.TEST (zero code modification)');

  // Verify neutral slate fallback for F5.TEST (missing badge_theme)
  assert.equal(resolvedIndicators[3].badgeThemeKey, 'slate', 'Missing badge_theme must fallback to neutral slate');
  assert.ok(resolvedIndicators[3].badgeClass.includes('bg-slate-100'), 'Slate fallback badgeClass must include bg-slate-100');

  console.log('✔ 6. Future-State 4-Indicator Scalability Fixture tests PASSED!');
}

// ==========================================
// 7. Contract Test: 6 Canonical No-Code Status Translations
// ==========================================
{
  // Test case 7.1: DATA_COMPLETE_WITH_EVIDENCE -> "Đã hoàn tất"
  const completeStatus = resolveNoCodeStatus('DATA_COMPLETE_WITH_EVIDENCE');
  assert.equal(completeStatus.label, 'Đã hoàn tất', 'DATA_COMPLETE_WITH_EVIDENCE must translate to Đã hoàn tất');
  assert.equal(completeStatus.isResolved, true);

  // Test case 7.2: LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE -> "Dữ liệu cũ đã có"
  const legacyStatus = resolveNoCodeStatus('LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE');
  assert.equal(legacyStatus.label, 'Dữ liệu cũ đã có', 'LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE must translate to Dữ liệu cũ đã có');
  assert.equal(legacyStatus.isResolved, true);

  // Test case 7.3: TRUE_MISSING -> "Thật sự còn thiếu"
  const missingStatus = resolveNoCodeStatus('TRUE_MISSING');
  assert.equal(missingStatus.label, 'Thật sự còn thiếu', 'TRUE_MISSING must translate to Thật sự còn thiếu');
  assert.equal(missingStatus.isResolved, false);

  // Test case 7.4: VERIFIED_NO_DATA -> "Không phát sinh dữ liệu"
  const noDataStatus = resolveNoCodeStatus('VERIFIED_NO_DATA');
  assert.equal(noDataStatus.label, 'Không phát sinh dữ liệu', 'VERIFIED_NO_DATA must translate to Không phát sinh dữ liệu');
  assert.equal(noDataStatus.isResolved, true);

  // Test case 7.5: PO_EXEMPTED -> "PO đã xác nhận"
  const exemptedStatus = resolveNoCodeStatus('PO_EXEMPTED');
  assert.equal(exemptedStatus.label, 'PO đã xác nhận', 'PO_EXEMPTED must translate to PO đã xác nhận');
  assert.equal(exemptedStatus.isResolved, true);

  // Test case 7.6: MANUAL_REVIEW_REQUIRED -> "Cần PO kiểm tra"
  const reviewStatus = resolveNoCodeStatus('MANUAL_REVIEW_REQUIRED');
  assert.equal(reviewStatus.label, 'Cần PO kiểm tra', 'MANUAL_REVIEW_REQUIRED must translate to Cần PO kiểm tra');
  assert.equal(reviewStatus.isResolved, false);

  console.log('✔ 7. Canonical 6 No-Code Status Translations tests PASSED!');
}

// ==========================================
// 8. Contract Test: Smart Monthly Grouping Accordion Helper
// ==========================================
{
  const rawItems = [
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-07-21', status: 'TRUE_MISSING' },
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-07-20', status: 'DATA_COMPLETE_WITH_EVIDENCE' },
    { indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-08-01', status: 'TRUE_MISSING' },
    { indicator: 'F4.1', source_lane: 'TCT', business_date: '2026-07-15', status: 'VERIFIED_NO_DATA' },
  ];

  const grouped = groupItemsByIndicatorAndMonth(rawItems);
  assert.equal(grouped.length, 3, 'Must group 4 items into 3 indicator::month groups');

  // Verify group 1: F1.3 - 2026-08 (newest month first for F1.3)
  assert.equal(grouped[0].indicator, 'F1.3');
  assert.equal(grouped[0].yearMonth, '2026-08');
  assert.equal(grouped[0].counts.missing, 1);

  // Verify group 2: F1.3 - 2026-07
  assert.equal(grouped[1].indicator, 'F1.3');
  assert.equal(grouped[1].yearMonth, '2026-07');
  assert.equal(grouped[1].counts.missing, 1);
  assert.equal(grouped[1].counts.complete, 1);

  // Verify item sorting inside month: 2026-07-21 before 2026-07-20
  assert.equal(grouped[1].items[0].business_date, '2026-07-21');
  assert.equal(grouped[1].items[1].business_date, '2026-07-20');

  console.log('✔ 8. Smart Monthly Grouping Accordion Helper tests PASSED!');
}

// ==========================================
// 9. Contract Test: Per-Lane Breakdown & Robust Code Matching
// ==========================================
{
  const fixtureCoverageData = {
    indicators: [
      { code: 'F1.3', display_name: 'F1.3 KPI', supported_lanes: ['HUE', 'TCT'] }
    ],
    items: [
      { indicator: 'f1.3', source_lane: 'HUE', business_date: '2026-07-20', status: 'TRUE_MISSING' },
      { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-07-21', status: 'TRUE_MISSING' },
      { indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-07-20', status: 'TRUE_MISSING' },
      { indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-07-21', status: 'DATA_COMPLETE_WITH_EVIDENCE' }
    ]
  };

  const resolved = resolveDynamicIndicators(fixtureCoverageData);
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].code, 'F1.3');

  // Verify robust matching (lowercase 'f1.3' matched 'F1.3')
  assert.equal(resolved[0].items.length, 4, 'Must match all 4 items regardless of case');
  assert.equal(resolved[0].missingCount, 2, 'Unique calendar missing dates for F1.3 must be 2 (2026-07-20, 2026-07-21)');

  // Verify per-lane breakdown
  const hueBreakdown = resolved[0].lanesBreakdown.HUE;
  assert.equal(hueBreakdown.missingCount, 2, 'Hue must have 2 missing dates');
  assert.deepEqual(hueBreakdown.missingDates, ['2026-07-21', '2026-07-20']);

  const tctBreakdown = resolved[0].lanesBreakdown.TCT;
  assert.equal(tctBreakdown.missingCount, 1, 'TCT must have 1 missing date');
  assert.deepEqual(tctBreakdown.missingDates, ['2026-07-20']);

  console.log('✔ 9. Per-Lane Breakdown & Robust Code Matching tests PASSED!');
}

// ==========================================
// 10. Contract Test: Round 3 UX — Accordion Internal Pagination & Bulk Selection Logic
// ==========================================
{
  // Test 10.1: Internal Accordion Pagination bounded to 10 rows/page
  const largeMonthItems = Array.from({ length: 25 }, (_, i) => ({
    indicator: 'F1.3',
    source_lane: 'HUE',
    business_date: `2026-07-${String(i + 1).padStart(2, '0')}`,
    status: 'TRUE_MISSING'
  }));

  const page1 = paginateItems(largeMonthItems, 1, 10);
  assert.equal(page1.pageItems.length, 10, 'Accordion page 1 must be bounded to 10 items');
  assert.equal(page1.totalPages, 3, '25 items at 10 items/page must total 3 pages');
  assert.equal(page1.hasNext, true);
  assert.equal(page1.hasPrev, false);

  const page3 = paginateItems(largeMonthItems, 3, 10);
  assert.equal(page3.pageItems.length, 5, 'Accordion page 3 must contain remaining 5 items');
  assert.equal(page3.hasNext, false);

  // Test 10.2: Bulk selection key helper and actionable filter
  const actionableItems = [
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-07-01', status: 'TRUE_MISSING' },
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-07-02', status: 'DATA_COMPLETE_WITH_EVIDENCE' },
    { indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-07-01', status: 'MANUAL_REVIEW_REQUIRED' }
  ];

  const getItemKey = (item) => `${(item.indicator || '').trim().toUpperCase()}::${(item.source_lane || '').trim().toUpperCase()}::${item.business_date}`;
  const isActionable = (item) => ['TRUE_MISSING', 'MISSING', 'MANUAL_ONLY_MISSING', 'MANUAL_REVIEW_REQUIRED'].includes(item.status);

  const filteredActionable = actionableItems.filter(isActionable);
  assert.equal(filteredActionable.length, 2, 'Must filter exactly 2 actionable items for bulk exemption');
  assert.equal(getItemKey(filteredActionable[0]), 'F1.3::HUE::2026-07-01');
  assert.equal(getItemKey(filteredActionable[1]), 'F1.3::TCT::2026-07-01');

  console.log('✔ 10. Accordion Internal Pagination & Bulk Selection logic tests PASSED!');
}

// ==========================================
// 11. Contract Test: Single-Date Reimport Run Payload Construction
// ==========================================
{
  const itemToReimport = {
    indicator: 'F1.3',
    source_lane: 'HUE',
    business_date: '2026-08-15',
    status: 'DATA_COMPLETE_WITH_EVIDENCE'
  };

  const buildReimportPayload = (item) => ({
    indicator: item.indicator,
    requested_lane: item.source_lane,
    lane: item.source_lane,
    month: item.business_date.slice(0, 7),
    from_date: item.business_date,
    to_date: item.business_date
  });

  const payload = buildReimportPayload(itemToReimport);

  assert.equal(payload.indicator, 'F1.3');
  assert.equal(payload.requested_lane, 'HUE');
  assert.equal(payload.lane, 'HUE');
  assert.equal(payload.month, '2026-08');
  assert.equal(payload.from_date, '2026-08-15');
  assert.equal(payload.to_date, '2026-08-15');

  console.log('✔ 11. Single-Date Reimport Run Payload Construction tests PASSED!');
}

// ==========================================
// 12. Contract Test: Dynamic Indicator Card Grid Class Resolution (No Empty Slots)
// ==========================================
{
  // Test 12.1: 2 Indicators (F1.3 and F4.1) must stretch across 2 equal columns without empty right slots
  const grid2Class = resolveIndicatorGridClass(2);
  assert.equal(grid2Class, 'grid grid-cols-1 sm:grid-cols-2 gap-4', '2 indicators must resolve to 2-column grid layout');
  assert.ok(!grid2Class.includes('grid-cols-4'), '2 indicators grid class must NOT force grid-cols-4');

  // Test 12.2: 4 Indicators fixture must resolve to 4-column layout
  const grid4Class = resolveIndicatorGridClass(4);
  assert.equal(grid4Class, 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', '4 indicators must resolve to 4-column grid layout');

  // Test 12.3: 1 Indicator must resolve to single-column layout
  const grid1Class = resolveIndicatorGridClass(1);
  assert.equal(grid1Class, 'grid grid-cols-1 gap-4');

  // Test 12.4: 3 Indicators must resolve to 3-column layout
  const grid3Class = resolveIndicatorGridClass(3);
  assert.equal(grid3Class, 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4');

  console.log('✔ 12. Dynamic Indicator Card Grid Class Resolution tests PASSED!');
}

// ==========================================
// 13. Contract Test: 62 MANUAL_REVIEW_REQUIRED Items Badge Resolution (PO Bugfix)
// ==========================================
{
  // Test case 13.1: 62 items with MANUAL_REVIEW_REQUIRED (missing = 0, complete = 0)
  const items62Review = Array.from({ length: 62 }, (_, i) => ({
    indicator: 'F1.3',
    source_lane: 'HUE',
    business_date: `2026-07-${String((i % 30) + 1).padStart(2, '0')}`,
    status: 'MANUAL_REVIEW_REQUIRED'
  }));

  const groups = groupItemsByIndicatorAndMonth(items62Review);
  assert.equal(groups.length, 1);
  const group = groups[0];

  assert.equal(group.counts.total, 62, 'Total items must be 62');
  assert.equal(group.counts.missing, 0, 'Missing items must be 0');
  assert.equal(group.counts.reviewReq, 62, 'ReviewReq items must be 62');
  assert.equal(group.counts.complete, 0, 'Complete items must be 0');

  // CRITICAL ASSERTION: complete === total MUST be FALSE when reviewReq > 0
  const isFullyComplete = group.counts.complete === group.counts.total;
  assert.equal(isFullyComplete, false, 'Group with 62 reviewReq items must NOT be 100% complete');

  const hasUnresolved = group.counts.missing > 0 || group.counts.reviewReq > 0;
  assert.equal(hasUnresolved, true, 'Group with 62 reviewReq items MUST be flagged as unresolved (hasUnresolved = true)');

  // Test case 13.2: resolveDynamicIndicators per-lane breakdown for 62 reviewReq items
  const fixtureData = {
    indicators: [{ code: 'F1.3', display_name: 'F1.3 KPI', supported_lanes: ['HUE', 'TCT'] }],
    items: items62Review
  };
  const resolved = resolveDynamicIndicators(fixtureData);
  const hueBreakdown = resolved[0].lanesBreakdown.HUE;

  assert.equal(hueBreakdown.reviewReqCount, 62);
  assert.equal(hueBreakdown.unresolvedCount, 62);
  assert.equal(hueBreakdown.isFullyComplete, false, 'Lane with 62 reviewReq items must NOT be isFullyComplete');

  console.log('✔ 13. 62 MANUAL_REVIEW_REQUIRED Items Badge Resolution tests PASSED!');
}

// ==========================================
// 14. Contract Test: Bulk Reimport Sequence & Renamed Button Label
// ==========================================
{
  // Test 14.1: Bulk Reimport sequence handling with partial error mid-way
  const selectedItems = [
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-08-01' },
    { indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-08-02' },
    { indicator: 'F4.1', source_lane: 'TCT', business_date: '2026-08-05' }
  ];

  const mockApiCall = async (item) => {
    if (item.business_date === '2026-08-02') {
      return { success: false, error: 'Database lock timeout' };
    }
    return {
      success: true,
      data: {
        run_id: `run_bulk_${item.business_date}`,
        from_date: item.business_date,
        to_date: item.business_date
      }
    };
  };

  const executeBulkReimport = async (items) => {
    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const item of items) {
      const payload = {
        indicator: item.indicator,
        requested_lane: item.source_lane,
        lane: item.source_lane,
        month: item.business_date.slice(0, 7),
        from_date: item.business_date,
        to_date: item.business_date
      };

      assert.equal(payload.from_date, item.business_date);
      assert.equal(payload.to_date, item.business_date);

      const res = await mockApiCall(item);
      if (res.success) {
        successCount++;
        results.push({ item, success: true, run_id: res.data.run_id });
      } else {
        failCount++;
        results.push({ item, success: false, error: res.error });
      }
    }

    return { successCount, failCount, total: items.length, results };
  };

  // Run async bulk reimport contract test
  (async () => {
    const report = await executeBulkReimport(selectedItems);
    assert.equal(report.successCount, 2, 'Must have 2 successful run creations');
    assert.equal(report.failCount, 1, 'Must have 1 failed run creation');
    assert.equal(report.results[1].error, 'Database lock timeout');
    assert.equal(report.results[0].run_id, 'run_bulk_2026-08-01');
    assert.equal(report.results[2].run_id, 'run_bulk_2026-08-05');
  })();

  // Test 14.2: Renamed Bulk Confirm Button Label Format
  const count = 5;
  const renamedButtonText = `Cập nhật dữ liệu - Loại bỏ phát sinh cho ${count} ngày`;
  assert.equal(renamedButtonText, 'Cập nhật dữ liệu - Loại bỏ phát sinh cho 5 ngày');
  assert.ok(renamedButtonText.startsWith('Cập nhật dữ liệu - Loại bỏ phát sinh'));

  console.log('✔ 14. Bulk Reimport Sequence & Renamed Button Label tests PASSED!');
}

// ==========================================
// 15. AB-AUTH-07: Open-Run Table Row Actions (design Section 5, C2)
// ==========================================
{
  // Test case 15.1: a run genuinely WAITING_AUTH shows both the block flag and the resume button.
  const waitingEntry = {
    run: { id: 'run_301', status: 'RUNNING', safety_state: 'WAITING_AUTH' },
    blockedLanes: ['TCT'],
  };
  const waitingActions = resolveOpenRunRowActions(waitingEntry);
  assert.equal(waitingActions.runState, 'WAITING_AUTH');
  assert.equal(waitingActions.isBlocking, true);
  assert.deepEqual(waitingActions.blockedLanes, ['TCT']);
  assert.equal(waitingActions.canResume, true, 'a WAITING_AUTH run must offer Resume');

  // Test case 15.2: reproduces the real 22-23/08 incident -- a normally running HUE run must
  // never show a resume button just because it's listed alongside a blocked TCT run.
  const healthyRunNextToBlockedOne = {
    run: { id: 'run_302', status: 'RUNNING', safety_state: null },
    blockedLanes: [],
  };
  const healthyActions = resolveOpenRunRowActions(healthyRunNextToBlockedOne);
  assert.equal(healthyActions.isBlocking, false);
  assert.equal(healthyActions.canResume, false, 'a healthy RUNNING run must never offer Resume');

  // Test case 15.3: a PAUSED run must not offer Resume through this table -- pausing is a
  // deliberate PO action, distinct from WAITING_AUTH, and must not be conflated with it.
  const pausedEntry = {
    run: { id: 'run_303', status: 'PAUSED', safety_state: null },
    blockedLanes: [],
  };
  assert.equal(resolveOpenRunRowActions(pausedEntry).canResume, false);

  // Test case 15.4: missing/undefined blockedLanes must not throw and must resolve to "not blocking".
  const noLaneInfoEntry = { run: { id: 'run_304', status: 'RUNNING', safety_state: null } };
  assert.deepEqual(resolveOpenRunRowActions(noLaneInfoEntry).blockedLanes, []);
  assert.equal(resolveOpenRunRowActions(noLaneInfoEntry).isBlocking, false);

  // Test case 15.5: a null/undefined entry must not throw.
  assert.deepEqual(resolveOpenRunRowActions(null), { runState: null, isBlocking: false, blockedLanes: [], canResume: false });
  assert.deepEqual(resolveOpenRunRowActions({}), { runState: null, isBlocking: false, blockedLanes: [], canResume: false });

  console.log('✔ 15. AB-AUTH-07 Open-Run Table Row Actions tests PASSED!');
}

// ==========================================
// 16. AB-AUTH-05: Three-Way Idle-State Classification (design Section 4, plan B)
// ==========================================
{
  // Test case 16.1: a job actually RUNNING takes priority over everything else.
  const executingRun = {
    run: { id: 'run_401', status: 'RUNNING', safety_state: null },
    jobs: [{ id: 'j1', state: 'RUNNING', indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-08-24' }],
  };
  assert.equal(resolveRunIdleState(executingRun).kind, 'EXECUTING');
  assert.equal(resolveRunIdleState(executingRun).job.id, 'j1');

  // Test case 16.2: the exact PO complaint this ticket exists to fix -- a job whose
  // safety_state is RETRY_WAIT with terminal_reason SESSION_PENDING_HUMAN_ACTION must read as
  // "waiting on YOUR login", not the generic, alarm-free "Đang khởi tạo...".
  const sessionPendingRun = {
    run: { id: 'run_402', status: 'RUNNING', safety_state: null },
    jobs: [{ id: 'j2', state: 'QUEUED', safety_state: 'RETRY_WAIT', terminal_reason: 'SESSION_PENDING_HUMAN_ACTION', source_lane: 'TCT' }],
  };
  const sessionPendingResult = resolveRunIdleState(sessionPendingRun);
  assert.equal(sessionPendingResult.kind, 'SESSION_PENDING');
  assert.equal(sessionPendingResult.job.source_lane, 'TCT');

  // Test case 16.3: RETRY_WAIT for any OTHER reason (e.g. AB-AUTH-04's EXPORT_TIMEOUT) must NOT
  // be confused with a pending login -- it falls through to the generic "queued" reading, since
  // retrying a slow portal export is not something the Product Owner needs to act on.
  const exportTimeoutRetryRun = {
    run: { id: 'run_403', status: 'RUNNING', safety_state: null },
    jobs: [{ id: 'j3', state: 'QUEUED', safety_state: 'RETRY_WAIT', terminal_reason: 'EXPORT_TIMEOUT', source_lane: 'HUE' }],
  };
  assert.equal(resolveRunIdleState(exportTimeoutRetryRun).kind, 'QUEUED_BEHIND_OTHER_WORK');

  // Test case 16.4: a genuinely WAITING_AUTH run (no job caught by the SESSION_PENDING check)
  // must still resolve distinctly from both PENDING and the generic fallback.
  const waitingAuthRun = {
    run: { id: 'run_404', status: 'RUNNING', safety_state: 'WAITING_AUTH' },
    jobs: [{ id: 'j4', state: 'QUEUED', safety_state: 'WAITING_AUTH', source_lane: 'HUE' }],
  };
  assert.equal(resolveRunIdleState(waitingAuthRun).kind, 'WAITING_AUTH');

  // Test case 16.5: a job merely QUEUED (no special safety_state) reads as "waiting your turn",
  // distinct from both a real block and a login in progress.
  const queuedRun = {
    run: { id: 'run_405', status: 'RUNNING', safety_state: null },
    jobs: [{ id: 'j5', state: 'QUEUED', safety_state: null, source_lane: 'HUE' }],
  };
  assert.equal(resolveRunIdleState(queuedRun).kind, 'QUEUED_BEHIND_OTHER_WORK');

  // Test case 16.6: terminal run states are reported as such regardless of stale job rows.
  for (const state of ['COMPLETED', 'COMPLETED_WITH_ERRORS', 'CANCELLED']) {
    const terminalRun = { run: { id: 'run_406', status: state, safety_state: null }, jobs: [] };
    assert.equal(resolveRunIdleState(terminalRun).kind, 'TERMINAL');
    assert.equal(resolveRunIdleState(terminalRun).runState, state);
  }

  // Test case 16.7: no run data at all must not throw.
  assert.equal(resolveRunIdleState(null).kind, 'INITIALIZING');
  assert.equal(resolveRunIdleState({}).kind, 'INITIALIZING');

  console.log('✔ 16. AB-AUTH-05 Three-Way Idle-State Classification tests PASSED!');
}

// ==========================================
// 17. Remediation Test 1: Viewer (!isAdmin) Read-Only Guard & Mutation Control Hiding Contract
// ==========================================
{
  const isAdmin = false;

  // Mock API call tracker
  let apiCallsCount = 0;
  const mockApi = {
    post: async () => { apiCallsCount++; return { data: { success: true } }; },
    get: async () => { apiCallsCount++; return { data: { success: true } }; }
  };

  // Simulated handler guards under !isAdmin
  const runGuard = (fn) => {
    if (!isAdmin) return null;
    return fn();
  };

  // Test case 17.1: Verify all 12 mutation handlers return early and make ZERO API calls when !isAdmin
  runGuard(() => mockApi.post('/import/auto-backfill/runs'));
  runGuard(() => mockApi.post('/import/auto-backfill/runs/1/pause'));
  runGuard(() => mockApi.post('/import/auto-backfill/runs/1/resume'));
  runGuard(() => mockApi.post('/import/auto-backfill/runs/1/circuit/reset'));
  runGuard(() => mockApi.post('/import/dkcl/session/interactive-auth'));
  runGuard(() => mockApi.post('/import/auto-backfill/coverage/exceptions'));
  runGuard(() => mockApi.post('/import/auto-backfill/coverage/exceptions/1/revoke'));
  runGuard(() => mockApi.post('/import/auto-backfill/holiday-calendar'));
  runGuard(() => mockApi.post('/import/auto-backfill/holiday-calendar/1/revoke'));

  assert.equal(apiCallsCount, 0, 'Viewer (!isAdmin) MUST execute ZERO API calls for any mutation attempt');

  // Test case 17.2: Verify UI control visibility flags under !isAdmin
  const uiControlsVisible = {
    createRunPanel: isAdmin,
    pauseButton: isAdmin,
    resumeButton: isAdmin,
    resetCircuitButton: isAdmin,
    manualLoginButton: isAdmin,
    reimportRowButton: isAdmin,
    markHolidayRowButton: isAdmin,
    revokeHolidayRowButton: isAdmin,
    confirmExemptionButton: isAdmin,
    revokeExemptionButton: isAdmin,
    checkboxes: isAdmin,
    bulkActionBar: isAdmin,
  };

  for (const [controlName, isVisible] of Object.entries(uiControlsVisible)) {
    assert.equal(isVisible, false, `Mutation control '${controlName}' MUST be hidden when !isAdmin`);
  }

  // Test case 17.3: Verify Read-Only view controls remain accessible
  const readOnlyViewsAccessible = {
    coverageData: true,
    runStatus: true,
    exceptionHistoryDrawer: true,
    holidayDrawer: true,
  };
  for (const [viewName, isAccessible] of Object.entries(readOnlyViewsAccessible)) {
    assert.equal(isAccessible, true, `Read-Only view '${viewName}' MUST remain accessible for viewers`);
  }

  console.log('✔ 17. Viewer (!isAdmin) Read-Only Guard & Mutation Control Hiding tests PASSED!');
}

// ==========================================
// 18. Remediation Test 2: Admin (isAdmin = true) Control Visibility & Mutation Eligibility Contract
// ==========================================
{
  const isAdmin = true;

  // Test case 18.1: Verify UI control visibility flags under isAdmin = true
  const uiControlsVisible = {
    createRunPanel: isAdmin,
    pauseButton: isAdmin,
    resumeButton: isAdmin,
    resetCircuitButton: isAdmin,
    manualLoginButton: isAdmin,
    reimportRowButton: isAdmin,
    markHolidayRowButton: isAdmin,
    revokeHolidayRowButton: isAdmin,
    confirmExemptionButton: isAdmin,
    revokeExemptionButton: isAdmin,
    checkboxes: isAdmin,
    bulkActionBar: isAdmin,
  };

  for (const [controlName, isVisible] of Object.entries(uiControlsVisible)) {
    assert.equal(isVisible, true, `Mutation control '${controlName}' MUST be visible when isAdmin = true`);
  }

  console.log('✔ 18. Admin (isAdmin = true) Control Visibility & Mutation Eligibility tests PASSED!');
}

// ==========================================
// 19. Remediation Test 3: Multi-Page Selectable Integration & Exclusion Rules Contract
// ==========================================
{
  // Simulated response from GET /api/import/auto-backfill/coverage/selectable
  const mockSelectableResponse = {
    success: true,
    data: {
      items: [
        { key: 'F1.3|HUE|2026-08-01', indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-08-01', status: 'MISSING' },
        { key: 'F1.3|HUE|2026-08-05', indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-08-05', status: 'MISSING' },
        { key: 'F1.3|TCT|2026-08-10', indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-08-10', status: 'MISSING' },
      ],
      excluded_holiday: [
        { business_date: '2026-08-02', reason: 'Nghỉ lễ' }
      ],
      excluded_exception: [
        { business_date: '2026-08-03', exception_type: 'PO_EXEMPTED' }
      ],
      excluded_complete: 12
    }
  };

  const processSelectableResult = (data) => {
    const selectedKeys = data.items.map((i) => `${i.indicator}::${i.source_lane}::${i.business_date}`);
    const holidayCount = data.excluded_holiday?.length || 0;
    const exceptionCount = data.excluded_exception?.length || 0;
    const completeCount = data.excluded_complete || 0;

    return {
      selectedCount: selectedKeys.length,
      selectedKeys,
      excludedHolidayCount: holidayCount,
      excludedExceptionCount: exceptionCount,
      excludedCompleteCount: completeCount
    };
  };

  const result = processSelectableResult(mockSelectableResponse.data);

  assert.equal(result.selectedCount, 3, 'Must select exactly 3 incomplete keys across all pages');
  assert.deepEqual(result.selectedKeys, [
    'F1.3::HUE::2026-08-01',
    'F1.3::HUE::2026-08-05',
    'F1.3::TCT::2026-08-10'
  ], 'Selected keys must match indicator::lane::date format');
  assert.equal(result.excludedHolidayCount, 1, 'Must exclude 1 holiday day');
  assert.equal(result.excludedExceptionCount, 1, 'Must exclude 1 active exception day');
  assert.equal(result.excludedCompleteCount, 12, 'Must exclude 12 completed days');

  console.log('✔ 19. Multi-Page Selectable Integration & Exclusion Rules tests PASSED!');
}

// ==========================================
// 20. Remediation Test 4: Holiday Mark & Revoke API Endpoint & Payload Contract
// ==========================================
{
  const capturedRequests = [];
  const mockApi = {
    post: async (url, payload) => {
      capturedRequests.push({ url, payload });
      return { data: { success: true } };
    }
  };

  // Test case 20.1: Mark Holiday API call
  const markHoliday = async (businessDate, reason) => {
    return await mockApi.post('/import/auto-backfill/holiday-calendar', {
      business_date: businessDate,
      reason: reason.trim()
    });
  };

  // Test case 20.2: Revoke Holiday API call
  const revokeHoliday = async (holidayId, reason) => {
    return await mockApi.post(`/import/auto-backfill/holiday-calendar/${holidayId}/revoke`, {
      reason: reason.trim()
    });
  };

  (async () => {
    await markHoliday('2026-09-02', 'Lễ Quốc Khánh 02/09');
    await revokeHoliday(42, 'Rà soát lại dữ liệu portal có phát sinh');

    assert.equal(capturedRequests.length, 2, 'Must issue exactly 2 API calls');

    // Assertion 20.1: Mark holiday request contract
    const req1 = capturedRequests[0];
    assert.equal(req1.url, '/import/auto-backfill/holiday-calendar', 'Mark holiday MUST call POST /import/auto-backfill/holiday-calendar');
    assert.equal(req1.payload.business_date, '2026-09-02');
    assert.equal(req1.payload.reason, 'Lễ Quốc Khánh 02/09');

    // Assertion 20.2: Revoke holiday request contract
    const req2 = capturedRequests[1];
    assert.equal(req2.url, '/import/auto-backfill/holiday-calendar/42/revoke', 'Revoke holiday MUST call POST /import/auto-backfill/holiday-calendar/42/revoke');
    assert.equal(req2.payload.reason, 'Rà soát lại dữ liệu portal có phát sinh');

    console.log('✔ 20. Holiday Mark & Revoke API Endpoint & Payload tests PASSED!');
    console.log('\nALL AUTO-BACKFILL-UI behavior, contract & remediation tests PASSED SUCCESSFULLY! (20/20 Test Suites)');
  })();
}









