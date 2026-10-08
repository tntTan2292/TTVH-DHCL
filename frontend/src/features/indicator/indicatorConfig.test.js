import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { classifyF13HeatmapRate, F13_HEATMAP_BANDS } from '../../components/f13/f13HeatmapBandCatalog.js';
import { mapBcvhRankingResponse } from '../dashboard/components/unifiedBcvhAnalysisTableData.js';
import { clearActiveIndicator, getActiveIndicator, setActiveIndicator } from './activeIndicator.js';
import { IndicatorProvider, useIndicator } from './IndicatorContext.js';
import {
  F13_INDICATOR,
  F41_INDICATOR,
  buildMonthlyHeatmapLegend,
  indicatorEndpoint,
  indicatorLabel,
  resolveIndicator,
  rewriteIndicatorUrl,
} from './indicatorConfig.js';

afterEach(() => setActiveIndicator(null));

test('without a provider every consumer behaves as F1.3 (defaults unchanged)', () => {
  assert.equal(getActiveIndicator(), null);
  assert.equal(resolveIndicator(), F13_INDICATOR);
  assert.equal(classifyF13HeatmapRate(70).id, 'green');
  assert.equal(classifyF13HeatmapRate(69.9).id, 'pink');
  assert.equal(classifyF13HeatmapRate(50).id, 'yellow');
  assert.equal(classifyF13HeatmapRate(49.9).id, 'red');
  assert.equal(classifyF13HeatmapRate(null).id, 'unavailable');
  assert.equal(indicatorLabel('Chất lượng F1.3'), 'Chất lượng F1.3');
  assert.equal(rewriteIndicatorUrl('/f13/ranking/bcvh/overview'), '/f13/ranking/bcvh/overview');
  assert.deepEqual(F13_INDICATOR.heatmapBands.map((band) => [band.id, band.min]), F13_HEATMAP_BANDS.map((band) => [band.id, band.min]));
});

test('F4.1 colour bands are the F1.3 colours with every threshold +10 points (PO 2026-10-08)', () => {
  assert.deepEqual(F41_INDICATOR.heatmapFloors, [80, 70, 60]);
  setActiveIndicator(F41_INDICATOR);
  assert.equal(classifyF13HeatmapRate(80).id, 'green');
  assert.equal(classifyF13HeatmapRate(79.9).id, 'pink');
  assert.equal(classifyF13HeatmapRate(70).id, 'pink');
  assert.equal(classifyF13HeatmapRate(69.9).id, 'yellow');
  assert.equal(classifyF13HeatmapRate(60).id, 'yellow');
  assert.equal(classifyF13HeatmapRate(59.9).id, 'red');
  assert.equal(classifyF13HeatmapRate(60.98).tone, 'band-yellow');
  // tones/colours are shared, only thresholds move
  assert.equal(F41_INDICATOR.heatmapBands[0].tone, 'band-green');
  // an explicit bands argument still wins (future admin override)
  assert.equal(classifyF13HeatmapRate(75, F13_HEATMAP_BANDS).id, 'green');
});

test('KPI status signal of the BCVH table follows the indicator floors', () => {
  const row = (rate) => ({ ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', sl_bg_ptc: 100, dat_kpi_2026: rate, kpi_2026: rate, rank: 1 });
  const signalOf = () => mapBcvhRankingResponse({ data: [row(75)], meta: {} }, { toDate: '2026-08-01' }).rows[0].current_day.signal.id;
  assert.equal(signalOf(), 'green');
  setActiveIndicator(F41_INDICATOR);
  assert.equal(signalOf(), 'pink');
});

test('rewriteIndicatorUrl maps only the shared report URLs and keeps the query string', () => {
  setActiveIndicator(F41_INDICATOR);
  assert.equal(rewriteIndicatorUrl('/f13/ranking/bcvh/overview'), '/f41/ranking/bcvh/overview');
  assert.equal(rewriteIndicatorUrl('/f13/ranking/bcvh/weekly-comparison?week=2026-W32&compare_week=2026-W31'), '/f41/ranking/bcvh/weekly-comparison?week=2026-W32&compare_week=2026-W31');
  assert.equal(rewriteIndicatorUrl('/f13/ranking/bcvh'), '/f41/ranking/bcvh');
  assert.equal(rewriteIndicatorUrl('/f13/dashboard/meta'), '/f41/dashboard/meta');
  assert.equal(rewriteIndicatorUrl('/f13/dashboard/daily-trend'), '/f41/dashboard/daily-trend');
  // the F4.1 KPI cards read the F1.3-shaped summary, not the raw KPI endpoint
  assert.equal(rewriteIndicatorUrl('/f13/dashboard/kpi'), '/f41/dashboard/summary');
  for (const key of Object.keys(F41_INDICATOR.endpoints)) {
    assert.equal(rewriteIndicatorUrl(`/f13${F13_INDICATOR.endpoints[key]}`), indicatorEndpoint(key, F41_INDICATOR));
  }
  // not part of the shared set: untouched (and hidden on F4.1 pages anyway)
  assert.equal(rewriteIndicatorUrl('/f13/recommendations'), '/f13/recommendations');
  assert.equal(rewriteIndicatorUrl('/f13/dashboard/quality-timeline'), '/f13/dashboard/quality-timeline');
  assert.equal(rewriteIndicatorUrl('/network-map/service-points'), '/network-map/service-points');
  assert.equal(rewriteIndicatorUrl(undefined), undefined);
  setActiveIndicator(F13_INDICATOR);
  assert.equal(rewriteIndicatorUrl('/f13/ranking/bcvh/overview'), '/f13/ranking/bcvh/overview');
});

test('indicatorLabel and the monthly legend use the active indicator wording', () => {
  setActiveIndicator(F41_INDICATOR);
  assert.equal(indicatorLabel('BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.3 TẠI CÁC BCVH'), 'BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F4.1 TẠI CÁC BCVH');
  assert.deepEqual(buildMonthlyHeatmapLegend().map((entry) => entry.description), [
    'Tỷ lệ từ 80% trở lên',
    'Từ 70% đến dưới 80%',
    'Từ 60% đến dưới 70%',
    'Dưới 60%',
    'Chưa có dữ liệu',
  ]);
  assert.deepEqual(buildMonthlyHeatmapLegend(F13_INDICATOR).map((entry) => entry.description).slice(0, 4), [
    'Tỷ lệ từ 70% trở lên',
    'Từ 60% đến dưới 70%',
    'Từ 50% đến dưới 60%',
    'Dưới 50%',
  ]);
});

test('F4.1 hides every block that needs data F4.1 does not have; F1.3 keeps them all', () => {
  assert.deepEqual({ ...F41_INDICATOR.features }, { routes: false, lateCash: false, operatingPattern: false, actionCenter: false });
  assert.deepEqual({ ...F13_INDICATOR.features }, { routes: true, lateCash: true, operatingPattern: true, actionCenter: true });
  assert.equal(F41_INDICATOR.routes.ranking, '/f41/ranking/bcvh');
  assert.equal(F13_INDICATOR.routes.ranking, '/f13/ranking/bcvh');
});

test('IndicatorProvider activates the indicator before children render and clears it only if still its own', () => {
  function Probe() {
    const indicator = useIndicator();
    return createElement('span', null, `${indicator.id}|${resolveIndicator().id}|${classifyF13HeatmapRate(75).id}`);
  }
  const html = renderToStaticMarkup(createElement(IndicatorProvider, { indicator: F41_INDICATOR }, createElement(Probe)));
  assert.equal(html, '<span>f41|f41|pink</span>');

  // default context value outside a provider is F1.3
  setActiveIndicator(null);
  assert.equal(renderToStaticMarkup(createElement(Probe)), '<span>f13|f13|green</span>');

  // a stale provider unmounting must not wipe a newer one
  setActiveIndicator(F41_INDICATOR);
  clearActiveIndicator(F13_INDICATOR);
  assert.equal(getActiveIndicator(), F41_INDICATOR);
  clearActiveIndicator(F41_INDICATOR);
  assert.equal(getActiveIndicator(), null);
});
