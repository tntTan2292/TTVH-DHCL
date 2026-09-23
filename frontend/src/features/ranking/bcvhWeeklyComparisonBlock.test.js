import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('Bảng mới độc lập: BcvhWeeklyComparisonBlock is completely decoupled from UnifiedBcvhAnalysisTable', () => {
  const pageSource = read('./BcvhRankingPage.jsx');
  const tableSource = read('../dashboard/components/UnifiedBcvhAnalysisTable.jsx');
  const blockSource = read('./BcvhWeeklyComparisonBlock.jsx');

  // 1. UnifiedBcvhAnalysisTable does not contain weekly comparison columns or components
  assert.doesNotMatch(tableSource, /BcvhWeeklyComparison/);
  assert.doesNotMatch(tableSource, /Tuần kỳ này/);
  assert.doesNotMatch(tableSource, /Tuần so sánh/);

  // 2. BcvhWeeklyComparisonBlock is placed independently after overview blocks in BcvhRankingPage
  const posUnifiedTable = pageSource.indexOf('<UnifiedBcvhAnalysisTable');
  const posWeeklyBlock = pageSource.indexOf('<BcvhWeeklyComparisonBlock />');
  assert.ok(posUnifiedTable > 0, 'UnifiedBcvhAnalysisTable exists');
  assert.ok(posWeeklyBlock > posUnifiedTable, 'BcvhWeeklyComparisonBlock is outside and after UnifiedBcvhAnalysisTable');

  // 3. Has capture-ready title, grouped headers, 06 canonical rows, and TỔNG CỘNG row
  assert.match(blockSource, /BẢNG TỔNG HỢP SO SÁNH CHẤT LƯỢNG F1\.3 THEO TUẦN TẠI CÁC BCVH/);
  assert.match(blockSource, /06 BƯU CỤC VẬN HÀNH/);
  assert.match(blockSource, /TUẦN KỲ NÀY/);
  assert.match(blockSource, /TUẦN SO SÁNH/);
  assert.match(blockSource, /CHÊNH LỆCH/);
  assert.match(blockSource, /totalRow\.ten_bcvh/);
});

test('Bộ lọc tuần riêng: independent from BcvhRankingPage GlobalFilterBar and URL params', () => {
  const blockSource = read('./BcvhWeeklyComparisonBlock.jsx');

  // Must not bind to searchParams or GlobalFilterBar
  assert.doesNotMatch(blockSource, /useSearchParams/);
  assert.doesNotMatch(blockSource, /GlobalFilterBar/);

  // Dedicated filter toolbar section
  assert.match(blockSource, /Bộ lọc so sánh tuần độc lập/);
  assert.match(blockSource, /label="Tuần kỳ này"/);
  assert.match(blockSource, /label="Tuần so sánh"/);
});

test('Chọn tuần kỳ này và tuần so sánh: independent selection states', () => {
  const blockSource = read('./BcvhWeeklyComparisonBlock.jsx');

  // Selection state manages current and compare independently
  assert.match(blockSource, /const \[selection, setSelection\] = useState\(\{ current: '', compare: '' \}\)/);
  assert.match(blockSource, /selection\.current/);
  assert.match(blockSource, /selection\.compare/);
  assert.match(blockSource, /fetchComparisonRef\.current\(selection\.current, selection\.compare\)/);
});

test('Hiển thị ghi chú dữ liệu chưa đủ: shows clear note e.g. "Dữ liệu đến ngày 21/09/2026"', () => {
  const blockSource = read('./BcvhWeeklyComparisonBlock.jsx');

  // Uses formatWeekDataNote and displays WeekNoteBadge
  assert.match(blockSource, /WeekNoteBadge/);
  assert.match(blockSource, /formatWeekDataNote/);
  assert.match(blockSource, /Dữ liệu đến ngày/);
});

test('Cảnh báo khác số ngày dữ liệu: renders visual warning "Lưu ý: Hai tuần có số ngày dữ liệu khác nhau"', () => {
  const blockSource = read('./BcvhWeeklyComparisonBlock.jsx');

  // Mismatch logic checked
  assert.match(blockSource, /checkWeeksDaysMismatch/);
  assert.match(blockSource, /daysMismatch\.isMismatch/);
  assert.match(blockSource, /Lưu ý: Hai tuần có số ngày dữ liệu khác nhau/);
});

test('Nhãn tuần có năm và khoảng ngày: week options comply with PO requirements', () => {
  const blockSource = read('./BcvhWeeklyComparisonBlock.jsx');

  // Uses buildWeekOptions which formats with week, year, and range
  assert.match(blockSource, /buildWeekOptions/);
  assert.match(blockSource, /formatWeekDateRange/);
});

test('B1, B2, B3: Điều chỉnh mốc tuần tự động căn về Thứ Năm và không sinh tuần giả / mất tuần', () => {
  const blockSource = read('./BcvhWeeklyComparisonBlock.jsx');

  // UI mechanism to adjust current week anchor date
  assert.match(blockSource, /Điều chỉnh mốc tuần hiện tại/);
  assert.match(blockSource, /type="date"/);
  assert.match(blockSource, /handleAnchorDateChange/);
  assert.match(blockSource, /resolveWeeksListWithAnchor/);

  // Must not have hardcoded fallback string '2026-09-17'
  assert.doesNotMatch(blockSource, /'2026-09-17'/);
  assert.doesNotMatch(blockSource, /"2026-09-17"/);
});

test('Item 6: Headers avoid whitespace-nowrap overflow on long text', () => {
  const blockSource = read('./BcvhWeeklyComparisonBlock.jsx');

  // Group headers must not force whitespace-nowrap on the entire composite title/range line
  assert.doesNotMatch(blockSource, /whitespace-nowrap">\s*\{currentWeekRange\}/);
  assert.doesNotMatch(blockSource, /whitespace-nowrap">\s*\{compareWeekRange\}/);
});
