import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readSource = (relPath) => fs.readFileSync(path.resolve(__dirname, relPath), 'utf8');

test('HOME-BI-01: DashboardHome mounts executive and national-ranking endpoints', () => {
  const homeSrc = readSource('../../pages/DashboardHome.jsx');
  assert.match(homeSrc, /\/home\/executive/);
  assert.match(homeSrc, /\/home\/national-ranking/);
  assert.match(homeSrc, /ExecutiveIndicatorCard/);
  assert.match(homeSrc, /NationalRankingBlock/);
  assert.match(homeSrc, /MonthlyRankProgressionBlock/);
  assert.match(homeSrc, /LowestUnitsBlock/);
  assert.match(homeSrc, /IndicatorTrendsGrid/);
});

test('Review Fix 1: ExecutiveDateBar has correct indicator official names in subtitle', () => {
  const barSrc = readSource('./components/ExecutiveDateBar.jsx');
  assert.match(barSrc, /F1\.1 \(Toàn trình nội tỉnh\)/);
  assert.match(barSrc, /F1\.2 \(Thu gom liên tỉnh\)/);
  assert.match(barSrc, /F1\.3 \(Phát liên tỉnh\)/);
  assert.match(barSrc, /F4\.1 \(Phát thành công bưu cục\)/);
});

test('Review Fix 2: IndicatorTrendsGrid uses dynamic computeTrendYDomain and does not clip data below 40%', () => {
  const trendSrc = readSource('./components/IndicatorTrendsGrid.jsx');
  assert.match(trendSrc, /computeTrendYDomain/);
  assert.match(trendSrc, /domain=\{yDomain\}/);
  assert.doesNotMatch(trendSrc, /domain=\{\[40,\s*100\]\}/);
});

test('Review Fix 3: NationalRankingBlock uses shared classifyF13HeatmapRate catalog for rate colours', () => {
  const rankingSrc = readSource('./components/NationalRankingBlock.jsx');
  assert.match(rankingSrc, /classifyF13HeatmapRate/);
  assert.match(rankingSrc, /F13_HEATMAP_TONE_CLASS/);
  assert.doesNotMatch(rankingSrc, /targetRate\s*-\s*10/);
});

test('Review Fix 4 & 5: ExecutiveIndicatorCard handles nulls cleanly and provides spacious layout', () => {
  const cardSrc = readSource('./components/ExecutiveIndicatorCard.jsx');
  assert.match(cardSrc, /data\.rate/);
  assert.match(cardSrc, /gap_to_target/);
  assert.match(cardSrc, /rank_movement/);
  assert.match(cardSrc, /data_date/);
  assert.match(cardSrc, /BlockCaptureButton/);
  assert.match(cardSrc, /Chưa có dữ liệu/);
  assert.doesNotMatch(cardSrc, /24h\/48h/);
  // Null movement or change renders "—"
  assert.match(cardSrc, /rankMovement === null \|\| rankMovement === undefined/);
  assert.match(cardSrc, /rateChange === null \|\| rateChange === undefined/);
});

test('Review Also items: province above not truncated, monthly progression labelled hạng lũy kế tháng', () => {
  const rankingSrc = readSource('./components/NationalRankingBlock.jsx');
  assert.doesNotMatch(rankingSrc, /hue\.above\.ten_tinh.*truncate/);

  const monthlySrc = readSource('./components/MonthlyRankProgressionBlock.jsx');
  assert.match(monthlySrc, /hạng lũy kế tháng/i);
});

test('HOME-BI-01: LowestUnitsBlock displays lowest-rate units and links to indicator ranking page', () => {
  const lowestSrc = readSource('./components/LowestUnitsBlock.jsx');
  assert.match(lowestSrc, /SortableTh/);
  assert.match(lowestSrc, /BlockCaptureButton/);
  assert.match(lowestSrc, /ranking/);
  assert.match(lowestSrc, /gap_to_target/);
});
