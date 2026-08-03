import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('Route Ranking labels the BLACK/returned-shipment group as Chuyển hoàn, not as missing/unevaluated data', () => {
  const pageSource = read('./RoutePerformancePage.jsx');

  assert.match(pageSource, /Chuyển hoàn/);
  assert.match(pageSource, /row\.returned/);
  assert.match(pageSource, /route\.returned/);
  assert.match(pageSource, /được ghi nhận BLACK trong Đánh giá KPI 2026/);

  assert.doesNotMatch(pageSource, /Chưa đánh giá/);
  assert.doesNotMatch(pageSource, /unevaluated/i);
  assert.doesNotMatch(pageSource, /chưa được đánh giá/);
  assert.doesNotMatch(pageSource, /chưa có kết quả/);
  assert.doesNotMatch(pageSource, /chưa đủ dữ liệu/);
});

test('PO-PASS items are preserved: Tổng BG / Đạt / Không đạt columns, default sort key, and the only-failed filter remain intact', () => {
  const pageSource = read('./RoutePerformancePage.jsx');

  assert.match(pageSource, /label: 'Tổng BG'/);
  assert.match(pageSource, /label: 'Đạt'/);
  assert.match(pageSource, /label: 'Không đạt'/);
  assert.match(pageSource, /key: 'passed_rate', dir: 'desc'/);
  assert.match(pageSource, /only_failed/);
  assert.match(pageSource, /Chỉ tuyến có bưu gửi không đạt/);
});
