import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('Route Ranking labels the BLACK/returned-shipment group as Chuyển hoàn, not as missing/unevaluated data', () => {
  const pageSource = read('./RoutePerformancePage.jsx');

  assert.match(pageSource, /Chuyển hoàn/);
  assert.match(pageSource, /row\.returned/);
  assert.match(pageSource, /route\.returned/);
  assert.match(pageSource, /Được ghi nhận phân loại BLACK theo quy chuẩn KPI 2026\./);

  // Scoped to the "Bưu gửi chuyển hoàn" caption block itself, not the whole file — AC-09
  // (F13-ROUTE-RANKING-PERIOD-01 remediation) legitimately introduces "chưa có kết quả đánh giá"
  // elsewhere in the file, in the unrelated Sản lượng/Đạt/Không đạt reconciliation caption.
  const returnedBlockMatch = pageSource.match(/Bưu gửi chuyển hoàn:[\s\S]{0,400}/);
  assert.ok(returnedBlockMatch, 'expected a "Bưu gửi chuyển hoàn" caption block');
  const returnedBlock = returnedBlockMatch[0];

  assert.doesNotMatch(returnedBlock, /Chưa đánh giá/);
  assert.doesNotMatch(returnedBlock, /unevaluated/i);
  assert.doesNotMatch(returnedBlock, /chưa được đánh giá/);
  assert.doesNotMatch(returnedBlock, /chưa có kết quả/);
  assert.doesNotMatch(returnedBlock, /chưa đủ dữ liệu/);
});

test('PO-PASS items are preserved: Tổng BG / Đạt / Không đạt columns, default sort key, and the only-failed filter remain intact', () => {
  const pageSource = read('./RoutePerformancePage.jsx');

  assert.match(pageSource, /label: 'Tổng BG'/);
  assert.match(pageSource, /label: 'Đạt'/);
  assert.match(pageSource, /label: 'Không đạt'/);
  assert.match(pageSource, /key: 'passed_rate', dir: 'asc'/);
  assert.match(pageSource, /only_failed/);
  assert.match(pageSource, /Chỉ hiện tuyến phát sinh lỗi/);
});
