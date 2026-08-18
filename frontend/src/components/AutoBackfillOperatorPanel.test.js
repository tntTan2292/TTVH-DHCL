import assert from 'node:assert/strict';
import {
  aggregateReportTotals,
  resolveEffectiveRunState,
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

console.log('ALL AUTO-BACKFILL-UI behavior and contract tests PASSED SUCCESSFULLY!');
