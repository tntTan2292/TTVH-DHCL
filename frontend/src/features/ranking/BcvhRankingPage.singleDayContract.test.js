import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

// 5. PO date-filter remediation (2026-08-12): now that the shared /f13/ranking/bcvh
// endpoint genuinely honours a real from_date..to_date range for Operation Dashboard,
// BCVH Ranking must keep sending an explicit single-evaluation-day request regardless
// of what the two date pickers hold — from_date === to_date === toDate.

test('BCVH Ranking always sends from_date === to_date in the /f13/ranking/bcvh request', () => {
  const pageSource = read('./BcvhRankingPage.jsx');
  assert.match(pageSource, /from_date:\s*toDate,\s*\n\s*to_date:\s*toDate,/);
});

test('BCVH Ranking no longer sends the independently-derived fromDate as from_date to the API', () => {
  const pageSource = read('./BcvhRankingPage.jsx');
  // The old defect pattern: from_date: fromDate (the two-picker value, which the
  // backend now genuinely honours as a range, unlike before this fix).
  assert.doesNotMatch(pageSource, /from_date:\s*fromDate,/);
});

test('the two date pickers (fromDate/toDate props, updateParam wiring) are unchanged by this fix', () => {
  const pageSource = read('./BcvhRankingPage.jsx');
  assert.match(pageSource, /onFromDateChange=\{\(value\) => updateParam\('from_date', value\)\}/);
  assert.match(pageSource, /onToDateChange=\{\(value\) => updateParam\('to_date', value\)\}/);
});
