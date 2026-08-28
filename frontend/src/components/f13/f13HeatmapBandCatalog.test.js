import test from 'node:test';
import assert from 'node:assert/strict';
import {
  F13_HEATMAP_BANDS,
  F13_HEATMAP_UNAVAILABLE_BAND,
  F13_HEATMAP_TONE_CLASS,
  F13_HEATMAP_DOT_CLASS,
  F13_HEATMAP_HEX_COLOR,
  F13_HEATMAP_LEGEND,
  classifyF13HeatmapRate,
  APPROVED_WEEKDAY_BANDS,
  getApprovedWeekdayBand,
} from './f13HeatmapBandCatalog.js';

// PO decision (2026-08-28): every F1.3 Heatmap — BCVH Ranking's monthly heatmap and both
// Operation Dashboard Heatmap-color surfaces (day-level Heatmap tab, "Theo thứ" tab) —
// classifies color from the rate itself, absolute thresholds only, never from a delta
// against any average. This file is the catalog's own unit test.

test('rate 100 classifies as band-green', () => {
  assert.equal(classifyF13HeatmapRate(100).tone, 'band-green');
});

test('rate 70 classifies as band-green', () => {
  assert.equal(classifyF13HeatmapRate(70).tone, 'band-green');
});

test('rate 69.99 classifies as band-pink', () => {
  assert.equal(classifyF13HeatmapRate(69.99).tone, 'band-pink');
});

test('rate 60 classifies as band-pink', () => {
  assert.equal(classifyF13HeatmapRate(60).tone, 'band-pink');
});

test('rate 59.99 classifies as band-yellow', () => {
  assert.equal(classifyF13HeatmapRate(59.99).tone, 'band-yellow');
});

test('rate 50 classifies as band-yellow', () => {
  assert.equal(classifyF13HeatmapRate(50).tone, 'band-yellow');
});

test('rate 49.99 classifies as band-red', () => {
  assert.equal(classifyF13HeatmapRate(49.99).tone, 'band-red');
});

test('rate 0 classifies as band-red', () => {
  assert.equal(classifyF13HeatmapRate(0).tone, 'band-red');
});

test('null classifies as unavailable', () => {
  assert.equal(classifyF13HeatmapRate(null).tone, 'unavailable');
});

test('undefined classifies as unavailable', () => {
  assert.equal(classifyF13HeatmapRate(undefined).tone, 'unavailable');
});

test('NaN classifies as unavailable', () => {
  assert.equal(classifyF13HeatmapRate(NaN).tone, 'unavailable');
});

test('a numeric string rate is still classified correctly (not silently unavailable)', () => {
  assert.equal(classifyF13HeatmapRate('72').tone, 'band-green');
});

test('classifyF13HeatmapRate returns the F13_HEATMAP_UNAVAILABLE_BAND object for unavailable rates', () => {
  assert.equal(classifyF13HeatmapRate(null), F13_HEATMAP_UNAVAILABLE_BAND);
  assert.equal(F13_HEATMAP_UNAVAILABLE_BAND.tone, 'unavailable');
  assert.equal(F13_HEATMAP_UNAVAILABLE_BAND.label, 'Xám');
});

test('F13_HEATMAP_BANDS is ordered green/pink/yellow/red with no gap or overlap at the boundaries', () => {
  assert.deepEqual(F13_HEATMAP_BANDS.map((band) => band.id), ['green', 'pink', 'yellow', 'red']);
  assert.deepEqual(F13_HEATMAP_BANDS.map((band) => band.label), ['Xanh', 'Hồng', 'Vàng', 'Đỏ']);
  assert.equal(F13_HEATMAP_BANDS[0].min, 70);
  assert.equal(F13_HEATMAP_BANDS[1].min, 60);
  assert.equal(F13_HEATMAP_BANDS[1].max, 70);
  assert.equal(F13_HEATMAP_BANDS[2].min, 50);
  assert.equal(F13_HEATMAP_BANDS[2].max, 60);
  assert.equal(F13_HEATMAP_BANDS[3].max, 50);
  // pink and yellow must never map to the same tone/color.
  assert.notEqual(F13_HEATMAP_BANDS[1].tone, F13_HEATMAP_BANDS[2].tone);
  assert.notEqual(F13_HEATMAP_TONE_CLASS[F13_HEATMAP_BANDS[1].tone], F13_HEATMAP_TONE_CLASS[F13_HEATMAP_BANDS[2].tone]);
  assert.notEqual(F13_HEATMAP_DOT_CLASS[F13_HEATMAP_BANDS[1].tone], F13_HEATMAP_DOT_CLASS[F13_HEATMAP_BANDS[2].tone]);
});

test('every band and the unavailable state has a tone class, dot class, and hex color', () => {
  const tones = [...F13_HEATMAP_BANDS.map((band) => band.tone), 'unavailable'];
  for (const tone of tones) {
    assert.ok(F13_HEATMAP_TONE_CLASS[tone], `F13_HEATMAP_TONE_CLASS.${tone}`);
    assert.ok(F13_HEATMAP_DOT_CLASS[tone], `F13_HEATMAP_DOT_CLASS.${tone}`);
    assert.ok(F13_HEATMAP_HEX_COLOR[tone], `F13_HEATMAP_HEX_COLOR.${tone}`);
  }
});

test('F13_HEATMAP_LEGEND carries the exact Product Owner-approved Vietnamese wording', () => {
  const byTone = Object.fromEntries(F13_HEATMAP_LEGEND.map((entry) => [entry.tone, entry]));
  assert.equal(byTone['band-green'].label, 'Xanh');
  assert.equal(byTone['band-green'].description, 'KPI từ 70% trở lên');
  assert.equal(byTone['band-pink'].label, 'Hồng');
  assert.equal(byTone['band-pink'].description, 'KPI từ 60% đến dưới 70%');
  assert.equal(byTone['band-yellow'].label, 'Vàng');
  assert.equal(byTone['band-yellow'].description, 'KPI từ 50% đến dưới 60%');
  assert.equal(byTone['band-red'].label, 'Đỏ');
  assert.equal(byTone['band-red'].description, 'KPI dưới 50%');
  assert.equal(byTone.unavailable.label, 'Xám');
  assert.equal(byTone.unavailable.description, 'Chưa có dữ liệu');
});

test('classifyF13HeatmapRate accepts a custom bands override (Admin-readiness), leaving the default catalog untouched', () => {
  const wideGreenBands = [
    { id: 'green', label: 'Xanh', min: 50, max: Infinity, tone: 'band-green' },
    { id: 'red', label: 'Đỏ', min: -Infinity, max: 50, tone: 'band-red' },
  ];

  // Under the custom bands, 55 is green (it would be yellow under the default catalog).
  assert.equal(classifyF13HeatmapRate(55, wideGreenBands).tone, 'band-green');
  assert.equal(classifyF13HeatmapRate(45, wideGreenBands).tone, 'band-red');

  // The default catalog is unaffected by having passed an override on another call.
  assert.equal(classifyF13HeatmapRate(55).tone, 'band-yellow');
  assert.deepEqual(F13_HEATMAP_BANDS.map((band) => band.min), [70, 60, 50, -Infinity]);
});

test('classifyF13HeatmapRate falls back to unavailable when a custom bands array does not cover the rate', () => {
  const partialBands = [{ id: 'green', label: 'Xanh', min: 90, max: Infinity, tone: 'band-green' }];
  assert.equal(classifyF13HeatmapRate(50, partialBands).tone, 'unavailable');
});

test('the catalog itself is not a localStorage/config-persisted object — it is plain, frozen data', () => {
  assert.ok(Object.isFrozen(F13_HEATMAP_BANDS));
  assert.ok(Object.isFrozen(F13_HEATMAP_TONE_CLASS));
  assert.ok(Object.isFrozen(F13_HEATMAP_DOT_CLASS));
  assert.equal(typeof globalThis.localStorage, 'undefined');
});

// --- Deprecated-alias compatibility -------------------------------------------------------

test('APPROVED_WEEKDAY_BANDS/getApprovedWeekdayBand (deprecated) stay consistent with the new catalog — one real source', () => {
  assert.equal(APPROVED_WEEKDAY_BANDS.length, 4);
  assert.equal(getApprovedWeekdayBand(75).id, 'green');
  assert.equal(getApprovedWeekdayBand(65).id, 'pink');
  assert.equal(getApprovedWeekdayBand(55).id, 'yellow');
  assert.equal(getApprovedWeekdayBand(45).id, 'red');
  assert.equal(getApprovedWeekdayBand(null).tone, 'unavailable');

  for (const legacyBand of APPROVED_WEEKDAY_BANDS) {
    const modernBand = F13_HEATMAP_BANDS.find((band) => band.tone === legacyBand.tone);
    assert.equal(legacyBand.min, modernBand.min, `${legacyBand.id}.min`);
    assert.equal(legacyBand.id, modernBand.id, `${legacyBand.id}.id`);
  }
});
