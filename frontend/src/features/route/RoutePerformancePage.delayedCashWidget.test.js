import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('the 4th KPI widget is "BG CHẬM NỘP TIỀN", bound to computeDelayedCashWidget(meta.delayed_cash_handover_summary)', () => {
  const pageSource = read('./RoutePerformancePage.jsx');

  assert.match(pageSource, /label: 'BG Chậm nộp tiền'/);
  assert.match(pageSource, /computeDelayedCashWidget\(meta\?\.delayed_cash_handover_summary\)/);
  assert.doesNotMatch(pageSource, /label: 'Tổng số tuyến'/);
});

test('the widget does not sum page rows, average route rates, recompute RuleF13302, or divide by total_bg', () => {
  const pageSource = read('./RoutePerformancePage.jsx');

  // computeDelayedCashWidget is called with only the backend aggregate, not with `rows`/`filteredRows`.
  assert.doesNotMatch(pageSource, /computeDelayedCashWidget\(\s*(rows|filteredRows)/);
  assert.doesNotMatch(pageSource, /delayed_cash_handover_count\s*\/\s*total_bg/);
  assert.doesNotMatch(pageSource, /reduce\([^)]*delayed_cash_handover/);
});

test('the other 3 KPI widgets and the delayed-cash table/panel content (already PO PASS) remain unchanged', () => {
  const pageSource = read('./RoutePerformancePage.jsx');

  assert.match(pageSource, /label: 'Tổng tuyến phân tích'/);
  assert.match(pageSource, /label: 'Tỷ lệ đạt toàn BCVH'/);
  assert.match(pageSource, /label: 'Tổng BG không đạt'/);
  assert.match(pageSource, /label: 'BG Chậm nộp tiền'/);
  assert.match(pageSource, /label: 'Tỷ lệ chậm nộp'/);
  assert.match(pageSource, /Đánh giá chậm khi tiền được nộp sau thời điểm PTC trên 3\.0 giờ\./);
  assert.match(pageSource, /Chuyển hoàn/);
  assert.match(pageSource, /key: 'passed_rate', dir: 'asc'/);
});

test('no new severity, threshold, or color-tier logic was introduced for the widget', () => {
  const pageSource = read('./RoutePerformancePage.jsx');
  assert.doesNotMatch(pageSource, /sys_kpi_thresholds/);
  assert.doesNotMatch(pageSource, /(Cao|Trung bình|Thấp)['"]?\s*[,:]/);
});
