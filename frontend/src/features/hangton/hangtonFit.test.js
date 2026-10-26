import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  computeFitZoom,
  HANGTON_DESIGN_WIDTH,
  HANGTON_MIN_ZOOM,
  HANGTON_MAX_ZOOM,
} from './hangtonFit.js';

test('fit zoom: shrinks when narrow, grows when wide, one step per 2 %, never outside the limits', () => {
  assert.equal(computeFitZoom({ width: HANGTON_DESIGN_WIDTH }), 1, 'exactly the design width: no change');
  // menu open: about 953 px of content (the PO screenshot) -> smaller, so nothing wraps
  assert.equal(computeFitZoom({ width: 953 }), 0.74);
  // menu closed on a laptop
  assert.equal(computeFitZoom({ width: 1230 }), 0.96);
  // wide monitor: enlarged
  assert.equal(computeFitZoom({ width: 1780 }), 1.38);
  assert.ok(computeFitZoom({ width: 2000 }) > computeFitZoom({ width: 1780 }));
  // limits
  assert.equal(computeFitZoom({ width: 300 }), HANGTON_MIN_ZOOM);
  assert.equal(computeFitZoom({ width: 5000 }), HANGTON_MAX_ZOOM);
});

test('fit zoom never lays the content out narrower than the design width (it rounds down)', () => {
  for (let width = 900; width <= 1900; width += 7) {
    const zoom = computeFitZoom({ width });
    const raw = Math.min(HANGTON_MAX_ZOOM, Math.max(HANGTON_MIN_ZOOM, width / HANGTON_DESIGN_WIDTH));
    assert.ok(zoom <= raw + 1e-9, `width ${width}: zoom ${zoom} must not exceed ${raw}`);
    assert.ok(raw - zoom < 0.0201, `width ${width}: at most one step below the exact fit`);
  }
});

test('fit zoom is stable and safe on unknown widths', () => {
  assert.equal(computeFitZoom({ width: 0 }), 1);
  assert.equal(computeFitZoom({ width: NaN }), 1);
  assert.equal(computeFitZoom({}), 1);
  assert.equal(computeFitZoom({ width: 1000 }), computeFitZoom({ width: 1000 }));
  assert.equal(computeFitZoom({ width: 1000, design: 1000 }), 1, 'custom design width');
});

test('HangTonPage wraps its content in the fit-zoom wrapper (zoom on an inner element, measured on the outer one)', () => {
  const page = fs.readFileSync(new URL('./HangTonPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /useFitZoom\(fitRef\)/);
  assert.match(page, /<div ref=\{fitRef\}>\s*<div style=\{\{ zoom: fitZoom \}\}/, 'the measured wrapper is outside the zoomed one');
});
