/**
 * Phase R2.1 targeted tests: Hue COMPLETE-date re-update selection logic.
 *
 * These tests exercise the pure selection helper functions directly.
 * They do NOT render React components. They do NOT exercise browser interaction.
 * They verify the selection state machine contract only.
 *
 * Contract (AUTO-IMPORT-006 R2.1):
 * - COMPLETE rows MUST be selectable regardless of session readiness.
 * - isCheckboxDisabled() must return false when: selectable=true, no queue active.
 * - toggleDateSelection() must add COMPLETE date to both selectedDates and refreshDates.
 * - isSubmitDisabled() must return true when session is NOT ready (even with dates selected).
 * - isSubmitDisabled() must return false when session IS ready and dates are selected.
 * - Deselecting COMPLETE date removes from both selectedDates and refreshDates.
 */

import assert from 'node:assert/strict';
import {
  toggleDateSelection,
  toggleAllDates,
  isCheckboxDisabled,
  isSubmitDisabled,
} from './hueSelectionHelpers.js';

// ─── isCheckboxDisabled contract ────────────────────────────────────────────

// COMPLETE row, no active queue, no submitting → must NOT be disabled
assert.strictEqual(
  isCheckboxDisabled(true, false, false),
  false,
  'COMPLETE row (selectable=true) must not be disabled when no queue is active'
);

// session=false must NOT affect checkbox disabled
// (session readiness only gates submit button per contract)
assert.strictEqual(
  isCheckboxDisabled(true, false, false),
  false,
  'Checkbox must not be disabled when session is not ready (session has no role in isCheckboxDisabled)'
);

// selectable=false → must be disabled
assert.strictEqual(
  isCheckboxDisabled(false, false, false),
  true,
  'Row with selectable=false must be disabled'
);

// queue active → must be disabled even if selectable
assert.strictEqual(
  isCheckboxDisabled(true, true, false),
  true,
  'Checkbox must be disabled when queue is active'
);

// submitting → must be disabled
assert.strictEqual(
  isCheckboxDisabled(true, false, true),
  true,
  'Checkbox must be disabled while queue is submitting'
);

// ─── toggleDateSelection — COMPLETE rows ────────────────────────────────────

// Selecting a COMPLETE date adds to both selectedDates and refreshDates
{
  const result = toggleDateSelection([], [], '2025-07-01', 'COMPLETE');
  assert.deepEqual(result.selectedDates, ['2025-07-01'], 'Selecting COMPLETE date adds to selectedDates');
  assert.deepEqual(result.refreshDates, ['2025-07-01'], 'Selecting COMPLETE date adds to refreshDates');
}

// Selecting a MISSING date adds to selectedDates but not refreshDates
{
  const result = toggleDateSelection([], [], '2025-07-02', 'MISSING');
  assert.deepEqual(result.selectedDates, ['2025-07-02'], 'Selecting MISSING date adds to selectedDates');
  assert.deepEqual(result.refreshDates, [], 'Selecting MISSING date must NOT add to refreshDates');
}

// Deselecting a COMPLETE date removes from both selectedDates and refreshDates
{
  const result = toggleDateSelection(['2025-07-01'], ['2025-07-01'], '2025-07-01', 'COMPLETE');
  assert.deepEqual(result.selectedDates, [], 'Deselecting COMPLETE date removes from selectedDates');
  assert.deepEqual(result.refreshDates, [], 'Deselecting COMPLETE date removes from refreshDates');
}

// Deselecting a MISSING date removes from selectedDates only
{
  const result = toggleDateSelection(['2025-07-02'], ['2025-07-01'], '2025-07-02', 'MISSING');
  assert.deepEqual(result.selectedDates, [], 'Deselecting MISSING date removes from selectedDates');
  assert.deepEqual(result.refreshDates, ['2025-07-01'], 'Deselecting MISSING date must NOT affect refreshDates');
}

// Selecting multiple COMPLETE rows accumulates both arrays
{
  let state = { selectedDates: [], refreshDates: [] };
  state = toggleDateSelection(state.selectedDates, state.refreshDates, '2025-07-01', 'COMPLETE');
  state = toggleDateSelection(state.selectedDates, state.refreshDates, '2025-07-02', 'COMPLETE');
  assert.deepEqual(state.selectedDates, ['2025-07-01', '2025-07-02'], 'Multiple COMPLETE selections accumulate in selectedDates');
  assert.deepEqual(state.refreshDates, ['2025-07-01', '2025-07-02'], 'Multiple COMPLETE selections accumulate in refreshDates');
}

// ─── isSubmitDisabled contract ────────────────────────────────────────────────

// session not ready, dates selected → submit disabled (prevents unauthorized submit)
assert.strictEqual(
  isSubmitDisabled(false, 1, false, false),
  true,
  'Submit must be disabled when session is not ready even if dates are selected'
);

// session ready, dates selected → submit enabled
assert.strictEqual(
  isSubmitDisabled(true, 1, false, false),
  false,
  'Submit must be enabled when session is ready and at least one date is selected'
);

// session ready, no dates selected → submit disabled
assert.strictEqual(
  isSubmitDisabled(true, 0, false, false),
  true,
  'Submit must be disabled when no dates are selected'
);

// submitting in-flight → submit disabled
assert.strictEqual(
  isSubmitDisabled(true, 1, true, false),
  true,
  'Submit must be disabled while a submit request is in-flight'
);

// queue active → submit disabled
assert.strictEqual(
  isSubmitDisabled(true, 1, false, true),
  true,
  'Submit must be disabled when a queue is active'
);

// ─── toggleAllDates ───────────────────────────────────────────────────────────

// Select-all: adds all selectable dates and puts COMPLETE ones in refreshDates
{
  const rows = [
    { measurement_date: '2025-07-01', status: 'COMPLETE', selectable: true },
    { measurement_date: '2025-07-02', status: 'MISSING', selectable: true },
    { measurement_date: '2025-07-03', status: 'COMPLETE', selectable: true },
  ];
  const allDates = rows.map((r) => r.measurement_date);
  const result = toggleAllDates(false, allDates, rows);
  assert.deepEqual(result.selectedDates, ['2025-07-01', '2025-07-02', '2025-07-03'], 'Select-all adds all selectable dates');
  assert.deepEqual(result.refreshDates, ['2025-07-01', '2025-07-03'], 'Select-all puts only COMPLETE dates in refreshDates');
}

// Deselect-all: clears both arrays
{
  const result = toggleAllDates(true, ['2025-07-01', '2025-07-02'], []);
  assert.deepEqual(result.selectedDates, [], 'Deselect-all clears selectedDates');
  assert.deepEqual(result.refreshDates, [], 'Deselect-all clears refreshDates');
}

// ─── Source-contract checks for DataImportCenter.jsx ─────────────────────────
// These regex checks verify that the JSX wires up the correct helper contracts.

import fs from 'node:fs';
const src = fs.readFileSync(new URL('./DataImportCenter.jsx', import.meta.url), 'utf8');

assert.match(
  src,
  /from '\.\/hueSelectionHelpers'/,
  'DataImportCenter must import the Hue selection helper module'
);

assert.match(
  src,
  /toggleDateSelection\(current, refreshDates, date, status\)/,
  'Production single-date selection must use toggleDateSelection helper'
);

assert.match(
  src,
  /toggleAllDates\(allSelectableChosen, allSelectableDates, selectableScanRows\)/,
  'Production select-all must use toggleAllDates helper'
);

assert.doesNotMatch(
  src,
  /const isSelected = current\.includes\(date\);[\s\S]*setRefreshDates\(\(refCurrent\)/,
  'DataImportCenter must not retain the old inline Hue selection implementation'
);

// Checkbox must NOT be disabled by session readiness alone
assert.doesNotMatch(
  src,
  /disabled=\{!hueSessionReady \|\|.*!item\.selectable/,
  'Checkbox disabled must NOT include !hueSessionReady'
);

// Checkbox must be disabled only by !item.selectable, queueIsActive, queueSubmitting
assert.match(
  src,
  /disabled=\{isCheckboxDisabled\(item\.selectable, queueIsActive, queueSubmitting\)\}/,
  'Checkbox must use the contract-correct helper'
);

// Submit button must still gate on session readiness
assert.match(
  src,
  /const updateDisabled = isSubmitDisabled\(hueSessionReady, selectedDates\.length, queueSubmitting, queueIsActive\)/,
  'Submit button must be disabled through the helper when session is not ready'
);

assert.match(
  src,
  /useState\('CHECKING'\)/,
  'Hue session status must start in neutral CHECKING state, not auth-required'
);

assert.match(
  src,
  /setHueSessionStatus\(\(current\) => current === 'SESSION_VALID' \? current : 'CHECKING'\)/,
  'Hue preflight polling must not replace a valid session with a transient warning state'
);

assert.match(
  src,
  /const hueLoginRequired = \['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'\]\.includes\(hueSessionStatus\)/,
  'Hue login warning must render only for confirmed invalid or expired session states'
);

assert.doesNotMatch(
  src,
  /\{!hueSessionReady && \(\s*<div[^>]+data-testid="hue-not-ready"/,
  'Hue login warning must not render for every non-valid or pending status'
);

assert.match(
  src,
  /data-testid="hue-session-checking"/,
  'Hue pending preflight must use a neutral checking state'
);

// New scan must clear refreshDates to prevent stale Re-Update state
assert.match(
  src,
  /setRefreshDates\(\[\]\)/,
  'handleScanMissingDates must clear refreshDates on new scan to prevent stale Re-Update state'
);

// Re-Update button label must show count when refreshDates selected
assert.match(
  src,
  /Re-Update \(\$\{selectedDates\.length\}\)/,
  'Button label must show Re-Update with count when complete dates are selected'
);

// Update label must show count separately from re-update
assert.match(
  src,
  /Update \(\$\{selectedDates\.length\}\)/,
  'Button label must show Update with count when missing dates are selected'
);

assert.match(
  src,
  /api\.post\('\/import\/dkcl\/hue\/f13\/backfill-queue',\s*\{\s*dates: selectedDates,\s*refresh_dates: refreshDates\s*\}\)/,
  'Hue queue submit must send selected COMPLETE dates in refresh_dates'
);

const nonResetFunctionPatterns = [
  /const preflightHueSession = useCallback\(async \(\) => \{[\s\S]*?\n  \}, \[\]\);/,
  /const fetchStatus = useCallback\(async \(\{[\s\S]*?\n  \}, \[page, pageSize\]\);/,
  /const fetchQueue = useCallback\(async \(queueId\) => \{[\s\S]*?\n  \}, \[\]\);/,
  /const fetchActiveQueue = useCallback\(async \(\) => \{[\s\S]*?\n  \}, \[\]\);/
];

for (const pattern of nonResetFunctionPatterns) {
  const match = src.match(pattern);
  assert.ok(match, 'Expected polling/preflight function source to be present');
  assert.doesNotMatch(
    match[0],
    /setSelectedDates\(\[\]\)|setRefreshDates\(\[\]\)/,
    'Preflight/status/queue polling must not clear Hue selection'
  );
}

const scanFunction = src.match(/const handleScanMissingDates = async \(\) => \{[\s\S]*?\n  \};/);
assert.ok(scanFunction, 'Expected handleScanMissingDates source to be present');
assert.match(scanFunction[0], /setSelectedDates\(\[\]\)/, 'Explicit Hue scan must clear selectedDates');
assert.match(scanFunction[0], /setRefreshDates\(\[\]\)/, 'Explicit Hue scan must clear refreshDates');

console.log('Hue complete-date re-update selection — ALL targeted logic tests PASSED.');
