import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  getApprovedWeekdayBand,
  HEATMAP_BAND_TONE_CLASS,
  HEATMAP_BAND_DOT_CLASS,
} from '../dashboard/components/operatingPatternTabsData.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

// PO SSOT decision (2026-08-28): the BCVH Ranking monthly heatmap ("Chi tiết số liệu
// theo tháng") reuses Operation Dashboard's absolute band classification
// (APPROVED_WEEKDAY_BANDS / getApprovedWeekdayBand) — never the relative-to-monthly-average
// classification (HEATMAP_RELATIVE_BANDS). This file verifies the shared helper's exact
// boundaries and that Ranking never re-declares the thresholds or falls back to relative bands.

test('rate 70 classifies as band-green', () => {
  assert.equal(getApprovedWeekdayBand(70).tone, 'band-green');
});

test('rate 69.99 classifies as band-pink', () => {
  assert.equal(getApprovedWeekdayBand(69.99).tone, 'band-pink');
});

test('rate 60 classifies as band-pink', () => {
  assert.equal(getApprovedWeekdayBand(60).tone, 'band-pink');
});

test('rate 59.99 classifies as band-yellow', () => {
  assert.equal(getApprovedWeekdayBand(59.99).tone, 'band-yellow');
});

test('rate 50 classifies as band-yellow', () => {
  assert.equal(getApprovedWeekdayBand(50).tone, 'band-yellow');
});

test('rate 49.99 classifies as band-red', () => {
  assert.equal(getApprovedWeekdayBand(49.99).tone, 'band-red');
});

test('null rate classifies as unavailable', () => {
  assert.equal(getApprovedWeekdayBand(null).tone, 'unavailable');
});

test('BCVH Ranking imports the exact same getApprovedWeekdayBand/HEATMAP_BAND_TONE_CLASS/HEATMAP_BAND_DOT_CLASS helper as Operation Dashboard', () => {
  const rankingSource = read('./BcvhRankingOverviewBlocks.jsx');
  const dashboardSource = read('../dashboard/components/OperatingPatternTabsCard.jsx');

  assert.match(
    rankingSource,
    /import\s*\{\s*\n?\s*getApprovedWeekdayBand,\s*\n?\s*HEATMAP_BAND_TONE_CLASS,\s*\n?\s*HEATMAP_BAND_DOT_CLASS,?\s*\n?\s*\}\s*from\s*'\.\.\/dashboard\/components\/operatingPatternTabsData'/,
  );
  assert.match(dashboardSource, /HEATMAP_BAND_TONE_CLASS/);
  assert.match(dashboardSource, /HEATMAP_BAND_DOT_CLASS/);

  // Both components' imports resolve to the one module that ultimately defines the catalog.
  // As of the F1.3 Heatmap Absolute Color SSOT ticket (2026-08-28), the real threshold/color
  // definitions live in components/f13/f13HeatmapBandCatalog.js; operatingPatternTabsData.js
  // now re-exports getApprovedWeekdayBand/HEATMAP_BAND_TONE_CLASS/HEATMAP_BAND_DOT_CLASS as
  // deprecated aliases of that one real source, not a second independent definition.
  const mapperSource = read('../dashboard/components/operatingPatternTabsData.js');
  assert.match(mapperSource, /getApprovedWeekdayBand,?\s*\n?\s*\}\s*from\s*'\.\.\/\.\.\/\.\.\/components\/f13\/f13HeatmapBandCatalog\.js'/);
  assert.doesNotMatch(mapperSource, /export function getApprovedWeekdayBand/);

  const catalogSource = read('../../components/f13/f13HeatmapBandCatalog.js');
  assert.match(catalogSource, /export function getApprovedWeekdayBand/);
  assert.match(catalogSource, /export const F13_HEATMAP_TONE_CLASS/);
  assert.match(catalogSource, /export const F13_HEATMAP_DOT_CLASS/);
});

test('HEATMAP_RELATIVE_BANDS does not appear anywhere in BCVH Ranking', () => {
  const rankingSource = read('./BcvhRankingOverviewBlocks.jsx');
  assert.doesNotMatch(rankingSource, /HEATMAP_RELATIVE_BANDS/);
  assert.doesNotMatch(rankingSource, /so với trung bình tháng/i);
  assert.doesNotMatch(rankingSource, /getHeatmapRelativeBand/);
});

test('BCVH Ranking monthly heatmap does not re-declare the >=70/>=60/>=50 thresholds locally', () => {
  const rankingSource = read('./BcvhRankingOverviewBlocks.jsx');
  assert.doesNotMatch(rankingSource, /m\.rate\s*>=\s*70/);
  assert.doesNotMatch(rankingSource, /m\.rate\s*>=\s*60/);
  assert.doesNotMatch(rankingSource, /m\.rate\s*>=\s*50/);
});

test('BCVH Ranking monthly heatmap cell renders the em dash for a null rate, not 0', () => {
  const rankingSource = read('./BcvhRankingOverviewBlocks.jsx');
  assert.match(rankingSource, /m\.rate !== null \? formatOverviewRate\(m\.rate\) : '—'/);
});

test('BCVH Ranking monthly heatmap legend uses the required Vietnamese band descriptions', () => {
  const rankingSource = read('./BcvhRankingOverviewBlocks.jsx');
  assert.match(rankingSource, /label: 'Xanh', description: 'Tỷ lệ từ 70% trở lên'/);
  assert.match(rankingSource, /label: 'Hồng', description: 'Từ 60% đến dưới 70%'/);
  assert.match(rankingSource, /label: 'Vàng', description: 'Từ 50% đến dưới 60%'/);
  assert.match(rankingSource, /label: 'Đỏ', description: 'Dưới 50%'/);
  assert.match(rankingSource, /label: 'Xám', description: 'Chưa có dữ liệu'/);
});

test('BCVH Ranking monthly heatmap still keeps rate, volume, coverage badge, and the current-month label', () => {
  const rankingSource = read('./BcvhRankingOverviewBlocks.jsx');
  // Tỷ lệ tháng
  assert.match(rankingSource, /formatOverviewRate\(m\.rate\)/);
  // Sản lượng tháng
  assert.match(rankingSource, /formatOverviewNumber\(m\.volume\)/);
  // Độ phủ ngày nếu thiếu
  assert.match(rankingSource, /m\.days_with_data\}\/\{m\.days_in_period\} ngày/);
  // Nhãn Lũy kế của tháng hiện tại
  assert.match(rankingSource, /Lũy kế/);
});

test('the 6-BCVH trend-line color palette (BCVH_COLORS) is untouched by the heatmap SSOT change', () => {
  const rankingSource = read('./BcvhRankingOverviewBlocks.jsx');
  assert.match(rankingSource, /BCVH_COLORS\[row\.ma_bcvh\]/);
  const dataSource = read('./bcvhOverviewData.js');
  assert.match(dataSource, /export const BCVH_COLORS = Object\.freeze\(\{/);
});

test('Operation Dashboard TONE_CLASS/TONE_BAR render the exact same class strings as before extraction', () => {
  const expectedToneClass = {
    'on-target': 'border-emerald-300 bg-emerald-100 text-emerald-950 font-bold shadow-2xs hover:bg-emerald-200',
    'below-target': 'border-amber-300 bg-amber-100 text-amber-950 font-bold shadow-2xs hover:bg-amber-200',
    'band-green': 'border-emerald-300 bg-emerald-100 text-emerald-950 font-bold shadow-2xs hover:bg-emerald-200',
    'band-pink': 'border-pink-300 bg-pink-100 text-pink-950 font-bold shadow-2xs hover:bg-pink-200',
    'band-yellow': 'border-amber-300 bg-amber-100 text-amber-950 font-bold shadow-2xs hover:bg-amber-200',
    'band-red': 'border-red-300 bg-red-100 text-red-950 font-bold shadow-2xs hover:bg-red-200',
    'relative-high': 'border-emerald-300 bg-emerald-100 text-emerald-950 font-bold shadow-2xs hover:bg-emerald-200',
    'relative-above': 'border-green-300 bg-green-100 text-green-950 font-bold shadow-2xs hover:bg-green-200',
    'relative-average': 'border-slate-300 bg-slate-100 text-slate-900 font-semibold shadow-2xs hover:bg-slate-200',
    'relative-below': 'border-amber-300 bg-amber-100 text-amber-950 font-bold shadow-2xs hover:bg-amber-200',
    'relative-low': 'border-red-300 bg-red-100 text-red-950 font-bold shadow-2xs hover:bg-red-200',
    unavailable: 'border-slate-200 bg-slate-50 text-slate-400 font-medium',
  };
  const expectedToneBar = {
    'on-target': 'bg-emerald-600',
    'below-target': 'bg-amber-500',
    'band-green': 'bg-emerald-600',
    'band-pink': 'bg-pink-500',
    'band-yellow': 'bg-amber-500',
    'band-red': 'bg-red-600',
    'relative-high': 'bg-emerald-700',
    'relative-above': 'bg-green-600',
    'relative-average': 'bg-slate-500',
    'relative-below': 'bg-amber-500',
    'relative-low': 'bg-red-600',
    unavailable: 'bg-slate-300',
  };

  for (const [tone, expected] of Object.entries(expectedToneClass)) {
    if (tone in HEATMAP_BAND_TONE_CLASS) {
      assert.equal(HEATMAP_BAND_TONE_CLASS[tone], expected, `HEATMAP_BAND_TONE_CLASS.${tone}`);
    }
  }
  for (const [tone, expected] of Object.entries(expectedToneBar)) {
    if (tone in HEATMAP_BAND_DOT_CLASS) {
      assert.equal(HEATMAP_BAND_DOT_CLASS[tone], expected, `HEATMAP_BAND_DOT_CLASS.${tone}`);
    }
  }
});

test('BCVH Ranking monthly heatmap cell applies the shared HEATMAP_BAND_TONE_CLASS lookup, not a hand-written color map', () => {
  const rankingSource = read('./BcvhRankingOverviewBlocks.jsx');
  assert.match(rankingSource, /const band = getApprovedWeekdayBand\(m\.rate\);/);
  assert.match(rankingSource, /HEATMAP_BAND_TONE_CLASS\[band\.tone\] \|\| HEATMAP_BAND_TONE_CLASS\.unavailable/);
});
