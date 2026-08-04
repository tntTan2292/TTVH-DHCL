import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./RouteViolationEvidencePage.jsx', import.meta.url), 'utf8');

test('violation evidence page defaults to the Chậm nộp tiền group and exposes all four tabs', () => {
  assert.match(source, /DEFAULT_REASON_TAB = 'delayed_cash'/);
  assert.match(source, /buildViolationGroupTabs/);
});

test('violation evidence page still allows viewing "Tất cả không đạt" and preserves the back link', () => {
  assert.match(source, /buildBackToRouteRankingLink/);
  assert.doesNotMatch(source, /tabs\.filter\(.*all.*\)/);
});

test('violation evidence page requests each group via the reason query parameter', () => {
  assert.match(source, /getEvidenceList\(date, bcvhId, routeId, 1, 1000, reasonFilter\)/);
  assert.match(source, /activeReason === 'all' \? undefined : activeReason/);
});

test('violation evidence page surfaces violation_reason as a table column', () => {
  assert.match(source, /violationReason/);
  assert.match(source, /Lý do vi phạm/);
});
