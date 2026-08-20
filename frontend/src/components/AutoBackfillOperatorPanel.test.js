import assert from 'node:assert/strict';
import {
  aggregateReportTotals,
  groupItemsByIndicatorAndMonth,
  paginateItems,
  resolveDynamicIndicators,
  resolveEffectiveRunState,
  resolveNoCodeStatus,
  resolveRunActionButtons,
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

console.log('ALL AUTO-BACKFILL-UI behavior and contract tests PASSED SUCCESSFULLY!');



