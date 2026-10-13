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
  // TV layout: the 30-day line of each indicator lives inside its own card, no separate trend block
  assert.doesNotMatch(homeSrc, /IndicatorTrendsGrid/);
  assert.match(homeSrc, /xl:grid-cols-4/);
});

test('Review Fix 1: indicator official names come from INDICATOR_FULL_NAMES, shown on each card', () => {
  const names = readSource('./homeTableSort.js');
  assert.match(names, /Toàn trình nội tỉnh/);
  assert.match(names, /Thu gom liên tỉnh/);
  assert.match(names, /Phát liên tỉnh/);
  assert.match(names, /Phát thành công bưu cục/);
  assert.match(readSource('./components/ExecutiveIndicatorCard.jsx'), /INDICATOR_FULL_NAMES/);
});

test('TV layout: ranking table defaults to Huế and neighbours, each card keeps its own 30-day line and target', () => {
  const ranking = readSource('./components/NationalRankingBlock.jsx');
  assert.match(ranking, /useState\('hue_focus'\)/);
  const card = readSource('./components/ExecutiveIndicatorCard.jsx');
  assert.match(card, /ReferenceLine/);
  assert.match(card, /computeTrendYDomain/);
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
  assert.match(cardSrc, /rankMovement === null/);
  assert.match(cardSrc, /rateChange === null/);
  // Stacked layout: rate block over rank block, 4xl numbers, labels not abbreviated
  assert.match(cardSrc, /text-4xl/);
  assert.match(cardSrc, /Vị thứ toàn quốc/);
  assert.match(cardSrc, /Chênh mục tiêu/);
  assert.doesNotMatch(cardSrc, /Vị thứ TQ|Chênh MT/);
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
