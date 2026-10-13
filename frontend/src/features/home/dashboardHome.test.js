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

test('HOME-BI-01: ExecutiveIndicatorCard exposes rate, national rank, gap to target, and individual data_date', () => {
  const cardSrc = readSource('./components/ExecutiveIndicatorCard.jsx');
  assert.match(cardSrc, /data\.rate/);
  assert.match(cardSrc, /gap_to_target/);
  assert.match(cardSrc, /rank_movement/);
  assert.match(cardSrc, /data_date/);
  assert.match(cardSrc, /BlockCaptureButton/);
  assert.match(cardSrc, /Chưa có dữ liệu/);
  // Decision 4: No "24h/48h" label
  assert.doesNotMatch(cardSrc, /24h\/48h/);
});

test('HOME-BI-01: NationalRankingBlock shows 34-province table, Huế row highlight, above-province gap, and sortable headers', () => {
  const rankingSrc = readSource('./components/NationalRankingBlock.jsx');
  assert.match(rankingSrc, /SortableTh/);
  assert.match(rankingSrc, /BlockCaptureButton/);
  assert.match(rankingSrc, /hue/);
  assert.match(rankingSrc, /above/);
  assert.match(rankingSrc, /BĐTP Huế/);
  assert.match(rankingSrc, /báo cáo toàn quốc/);
});

test('HOME-BI-01: IndicatorTrendsGrid provides independent charts per indicator with target line and no mixing on one axis', () => {
  const trendSrc = readSource('./components/IndicatorTrendsGrid.jsx');
  assert.match(trendSrc, /LineChart/);
  assert.match(trendSrc, /ReferenceLine/);
  assert.match(trendSrc, /targetRate/);
  assert.match(trendSrc, /BlockCaptureButton/);
  assert.match(trendSrc, /DIỄN BIẾN XU HƯỚNG TỪNG CHỈ TIÊU ĐỘC LẬP/);
});

test('HOME-BI-01: LowestUnitsBlock displays lowest-rate units and links to indicator ranking page', () => {
  const lowestSrc = readSource('./components/LowestUnitsBlock.jsx');
  assert.match(lowestSrc, /SortableTh/);
  assert.match(lowestSrc, /BlockCaptureButton/);
  assert.match(lowestSrc, /ranking/);
  assert.match(lowestSrc, /gap_to_target/);
});

test('HOME-BI-01: MonthlyRankProgressionBlock displays T1..current month rank progression', () => {
  const monthlySrc = readSource('./components/MonthlyRankProgressionBlock.jsx');
  assert.match(monthlySrc, /monthly_rank/);
  assert.match(monthlySrc, /BlockCaptureButton/);
});
