import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// AC-09 (Design of Record docs/04_TECHNICAL_PLANNING/Feature/F13-ROUTE-RANKING-PERIOD-01_DESIGN.md
// §12.1, M-02): Sản lượng includes bưu gửi with no danh_gia_2026 verdict yet, so Đạt + Không đạt
// can legitimately be less than Sản lượng — the UI must explain this or users will report it as a
// data error. This was the one item Phase I1 remediation left outstanding.

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('AC-09: the selected-route panel carries a static caption explaining Đạt + Không đạt can be less than Sản lượng', () => {
  const pageSource = read('./RoutePerformancePage.jsx');

  assert.match(
    pageSource,
    /Sản lượng bao gồm cả bưu gửi chưa có kết quả đánh giá; vì vậy Đạt \+ Không đạt có thể không bằng Sản lượng\./
  );

  // Placed right after the Sản lượng phát / Đạt chỉ tiêu / Không đạt 3-card grid, not buried
  // elsewhere in the panel.
  const gridIndex = pageSource.indexOf('Sản lượng phát');
  const captionIndex = pageSource.indexOf('Sản lượng bao gồm cả bưu gửi chưa có kết quả đánh giá');
  assert.ok(gridIndex > -1);
  assert.ok(captionIndex > gridIndex);

  // A static caption, not a hover-only tooltip — reads identically on desktop and mobile, no
  // separate interaction state or component required.
  assert.doesNotMatch(pageSource, /onMouseEnter.*Sản lượng bao gồm/);
});

test('AC-09: the caption does not alter the underlying Sản lượng/Đạt/Không đạt formulas or values', () => {
  const pageSource = read('./RoutePerformancePage.jsx');

  // The three metrics feeding the panel are unchanged — still the day-scoped old-endpoint values,
  // rendered through the pre-existing null-safe renderDayMetric() helper.
  assert.match(pageSource, /renderDayMetric\(hasDayData \? totalBg : null\)/);
  assert.match(pageSource, /renderDayMetric\(hasDayData \? passed : null\)/);
  assert.match(pageSource, /renderDayMetric\(hasDayData \? failed : null\)/);
});
