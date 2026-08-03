import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('Route Ranking table exposes the "Chậm nộp tiền" column group with the two PO-mandated sub-columns', () => {
  const pageSource = read('./RoutePerformancePage.jsx');

  assert.match(pageSource, /Chậm nộp tiền/);
  assert.match(pageSource, /label: 'Số BG chậm nộp tiền'/);
  assert.match(pageSource, /label: 'Tỷ lệ chậm nộp tiền'/);
  // "Kết quả ngày đánh giá" group precedes "Chậm nộp tiền" in the header markup.
  const evalGroupIndex = pageSource.indexOf('Kết quả ngày đánh giá');
  const delayedGroupIndex = pageSource.indexOf('Chậm nộp tiền');
  assert.ok(evalGroupIndex > -1);
  assert.ok(delayedGroupIndex > evalGroupIndex);
});

test('Route Ranking table binds delayed-cash cells to backend fields only, no browser-side fallback formula', () => {
  const pageSource = read('./RoutePerformancePage.jsx');

  assert.match(pageSource, /row\.delayed_cash_handover_count/);
  assert.match(pageSource, /formatDelayedCashRate\(row\.f13_303_rate\)/);
  // No client-computed delayed-cash formula (e.g. dividing counts in JSX) is introduced.
  assert.doesNotMatch(pageSource, /delayed_cash_handover_count\s*\/\s*delayed_cash_handover_eligible_count/);
});

test('selected-route panel shows delayed-cash count, eligible sample size, rate, and the exact >3h caption, with no new severity/threshold UI', () => {
  const pageSource = read('./RoutePerformancePage.jsx');

  assert.match(pageSource, /route\.delayed_cash_handover_count/);
  assert.match(pageSource, /route\.delayed_cash_handover_eligible_count/);
  assert.match(pageSource, /formatDelayedCashRate\(route\.f13_303_rate\)/);
  assert.match(pageSource, /Chậm khi thời gian nộp tiền sau thời gian PTC trên 3 giờ\./);
});

test('no new priority/severity/color-tier or recommendation logic was introduced for delayed-cash', () => {
  const pageSource = read('./RoutePerformancePage.jsx');

  assert.doesNotMatch(pageSource, /(Cao|Trung bình|Thấp)['"]?\s*[,:]/);
  assert.doesNotMatch(pageSource, /sys_kpi_thresholds/);
  assert.doesNotMatch(pageSource, /khuyến nghị/i);
  assert.doesNotMatch(pageSource, /nguyên nhân/i);
});

test('PO-PASS scope is preserved alongside the new delayed-cash columns', () => {
  const pageSource = read('./RoutePerformancePage.jsx');

  assert.match(pageSource, /Chuyển hoàn/);
  assert.match(pageSource, /key: 'passed_rate', dir: 'desc'/);
  assert.match(pageSource, /Chỉ tuyến có bưu gửi không đạt/);
  assert.match(pageSource, /data-testid="route-ranking-table"/);
  assert.doesNotMatch(pageSource, /Chưa đánh giá/);
});
