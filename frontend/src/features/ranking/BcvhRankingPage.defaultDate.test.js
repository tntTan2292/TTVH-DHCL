import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('BCVH Ranking no longer hardcodes a stale default date', () => {
  const pageSource = read('./BcvhRankingPage.jsx');
  assert.doesNotMatch(pageSource, /2026-07-28/);
});

test('BCVH Ranking default date resolves from /f13/dashboard/meta (metaState.maxDate), URL param still wins', () => {
  const pageSource = read('./BcvhRankingPage.jsx');

  assert.match(pageSource, /const fromDate = fromDateParam \|\| metaState\.maxDate \|\| '';/);
  assert.match(pageSource, /const toDate = toDateParam \|\| metaState\.maxDate \|\| '';/);
  // The meta fetch itself is unchanged: still reads max_date from /f13/dashboard/meta.
  assert.match(pageSource, /maxDate: res\.data\?\.data\?\.max_date \|\| null,/);
});

test('the ranking fetch never calls the API with an empty from_date/to_date while metadata is still loading', () => {
  const pageSource = read('./BcvhRankingPage.jsx');
  assert.match(pageSource, /if \(!fromDate \|\| !toDate\) \{/);
});

test('users can still pick an older date: the date inputs remain bound to fromDate/toDate via updateParam, unchanged', () => {
  const pageSource = read('./BcvhRankingPage.jsx');
  assert.match(pageSource, /onFromDateChange=\{\(value\) => updateParam\('from_date', value\)\}/);
  assert.match(pageSource, /onToDateChange=\{\(value\) => updateParam\('to_date', value\)\}/);
});
