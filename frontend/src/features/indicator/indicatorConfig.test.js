import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import baseApi from '../../api/client.js';
import { classifyF13HeatmapRate, F13_HEATMAP_BANDS } from '../../components/f13/f13HeatmapBandCatalog.js';
import { mapBcvhRankingResponse } from '../dashboard/components/unifiedBcvhAnalysisTableData.js';
import { IndicatorProvider, useIndicator } from './IndicatorContext.js';
import {
  F13_INDICATOR,
  F41_INDICATOR,
  buildMonthlyHeatmapLegend,
  indicatorEndpoint,
  indicatorLabel,
  rewriteIndicatorUrl,
} from './indicatorConfig.js';
import { createIndicatorApi, getIndicatorApi, useIndicatorApi } from './useIndicatorApi.js';

test('F1.3 is the default everywhere (defaults unchanged)', () => {
  assert.equal(classifyF13HeatmapRate(70).id, 'green');
  assert.equal(classifyF13HeatmapRate(69.9).id, 'pink');
  assert.equal(classifyF13HeatmapRate(50).id, 'yellow');
  assert.equal(classifyF13HeatmapRate(49.9).id, 'red');
  assert.equal(classifyF13HeatmapRate(null).id, 'unavailable');
  assert.equal(indicatorLabel('Chất lượng F1.3'), 'Chất lượng F1.3');
  assert.equal(rewriteIndicatorUrl('/f13/ranking/bcvh/overview'), '/f13/ranking/bcvh/overview');
  assert.deepEqual(
    F13_INDICATOR.heatmapBands.map((band) => [band.id, band.min, band.max]),
    F13_HEATMAP_BANDS.map((band) => [band.id, band.min, band.max]),
  );
});

test('F4.1 colour bands are the F1.3 colours with every threshold +10 points (PO 2026-10-08)', () => {
  assert.deepEqual(F41_INDICATOR.heatmapFloors, [80, 70, 60]);
  const bands = F41_INDICATOR.heatmapBands;
  assert.equal(classifyF13HeatmapRate(80, bands).id, 'green');
  assert.equal(classifyF13HeatmapRate(79.9, bands).id, 'pink');
  assert.equal(classifyF13HeatmapRate(70, bands).id, 'pink');
  assert.equal(classifyF13HeatmapRate(69.9, bands).id, 'yellow');
  assert.equal(classifyF13HeatmapRate(60, bands).id, 'yellow');
  assert.equal(classifyF13HeatmapRate(59.9, bands).id, 'red');
  assert.equal(classifyF13HeatmapRate(60.98, bands).tone, 'band-yellow');
  assert.equal(bands[0].tone, 'band-green');
  // the same rate under the default bands keeps its F1.3 colour
  assert.equal(classifyF13HeatmapRate(75).id, 'green');
});

test('KPI status signal of the BCVH table follows the indicator passed in the mapper context', () => {
  const row = (rate) => ({ ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', sl_bg_ptc: 100, dat_kpi_2026: rate, kpi_2026: rate, rank: 1 });
  const signalOf = (context) => mapBcvhRankingResponse({ data: [row(75)], meta: {} }, { toDate: '2026-08-01', ...context }).rows[0].current_day.signal.id;
  assert.equal(signalOf({}), 'green');
  assert.equal(signalOf({ indicator: F13_INDICATOR }), 'green');
  assert.equal(signalOf({ indicator: F41_INDICATOR }), 'pink');
});

test('rewriteIndicatorUrl maps only the shared report URLs and keeps the query string', () => {
  const to = (url) => rewriteIndicatorUrl(url, F41_INDICATOR);
  assert.equal(to('/f13/ranking/bcvh/overview'), '/f41/ranking/bcvh/overview');
  assert.equal(to('/f13/ranking/bcvh/weekly-comparison?week=2026-W32&compare_week=2026-W31'), '/f41/ranking/bcvh/weekly-comparison?week=2026-W32&compare_week=2026-W31');
  assert.equal(to('/f13/ranking/bcvh'), '/f41/ranking/bcvh');
  assert.equal(to('/f13/dashboard/meta'), '/f41/dashboard/meta');
  assert.equal(to('/f13/dashboard/daily-trend'), '/f41/dashboard/daily-trend');
  // the F4.1 KPI cards read the F1.3-shaped summary, not the raw KPI endpoint
  assert.equal(to('/f13/dashboard/kpi'), '/f41/dashboard/summary');
  for (const key of Object.keys(F41_INDICATOR.endpoints)) {
    assert.equal(to(`/f13${F13_INDICATOR.endpoints[key]}`), indicatorEndpoint(key, F41_INDICATOR));
  }
  // not part of the shared set: untouched (and hidden on F4.1 pages anyway)
  assert.equal(to('/f13/recommendations'), '/f13/recommendations');
  assert.equal(to('/f13/dashboard/quality-timeline'), '/f13/dashboard/quality-timeline');
  assert.equal(to('/network-map/service-points'), '/network-map/service-points');
  assert.equal(to(undefined), undefined);
  assert.equal(rewriteIndicatorUrl('/f13/ranking/bcvh/overview', F13_INDICATOR), '/f13/ranking/bcvh/overview');
});

test('indicator-scoped API: F1.3 gets the shared client itself, F4.1 a wrapper that rewrites the URL', async () => {
  assert.equal(getIndicatorApi(F13_INDICATOR), baseApi);
  assert.equal(createIndicatorApi(F13_INDICATOR), baseApi);
  assert.equal(getIndicatorApi(undefined), baseApi);

  const calls = [];
  const fakeClient = { get: async (...args) => { calls.push(['get', ...args]); return 'ok'; }, request: async (config) => { calls.push(['request', config]); return 'ok'; } };
  const scoped = createIndicatorApi(F41_INDICATOR, fakeClient);
  assert.notEqual(scoped, fakeClient);
  await scoped.get('/f13/dashboard/kpi', { params: { from_date: '2026-08-01' } });
  await scoped.get('/f13/recommendations', { params: {} });
  await scoped.request({ url: '/f13/ranking/bcvh/months', method: 'get' });
  assert.deepEqual(calls[0], ['get', '/f41/dashboard/summary', { params: { from_date: '2026-08-01' } }]);
  assert.deepEqual(calls[1], ['get', '/f13/recommendations', { params: {} }]);
  assert.deepEqual(calls[2], ['request', { url: '/f41/ranking/bcvh/months', method: 'get' }]);

  // stable identity across renders
  assert.equal(getIndicatorApi(F41_INDICATOR), getIndicatorApi(F41_INDICATOR));
});

test('indicatorLabel and the monthly legend use the given indicator wording', () => {
  assert.equal(indicatorLabel('BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.3 TẠI CÁC BCVH', F41_INDICATOR), 'BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F4.1 TẠI CÁC BCVH');
  assert.deepEqual(buildMonthlyHeatmapLegend(F41_INDICATOR).map((entry) => entry.description), [
    'Tỷ lệ từ 80% trở lên',
    'Từ 70% đến dưới 80%',
    'Từ 60% đến dưới 70%',
    'Dưới 60%',
    'Chưa có dữ liệu',
  ]);
  assert.deepEqual(buildMonthlyHeatmapLegend().map((entry) => entry.description).slice(0, 4), [
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

test('IndicatorProvider only carries a value: it holds no state, so a discarded render cannot leak (T8-F41-B1)', () => {
  function Probe() {
    const indicator = useIndicator();
    const api = useIndicatorApi();
    return createElement('span', null, `${indicator.id}|${classifyF13HeatmapRate(75, indicator.heatmapBands).id}|${api === baseApi ? 'shared' : 'scoped'}`);
  }
  assert.equal(
    renderToStaticMarkup(createElement(IndicatorProvider, { indicator: F41_INDICATOR }, createElement(Probe))),
    '<span>f41|pink|scoped</span>',
  );
  // a provider render that is never committed (React transition / error boundary / SSR) ...
  renderToString(createElement(IndicatorProvider, { indicator: F41_INDICATOR }, createElement(Probe)));
  // ... leaves nothing behind: a page rendered without a provider is plain F1.3
  assert.equal(renderToStaticMarkup(createElement(Probe)), '<span>f13|green|shared</span>');
  assert.equal(
    renderToStaticMarkup(createElement(IndicatorProvider, { indicator: F13_INDICATOR }, createElement(Probe))),
    '<span>f13|green|shared</span>',
  );
});
