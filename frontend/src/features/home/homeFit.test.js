import test from 'node:test';
import assert from 'node:assert/strict';
import { computeHomeZoom, isAutoTv } from './homeFit.js';

test('normal mode: reduced a little on a laptop, never enlarged on a desktop', () => {
  assert.equal(computeHomeZoom({ width: 1230 }), 0.88); // 1366 px laptop with the menu rail
  assert.equal(computeHomeZoom({ width: 1400 }), 1);
  assert.equal(computeHomeZoom({ width: 1840 }), 1);
  assert.equal(computeHomeZoom({ width: 1038 }), 0.74); // 1366 px laptop with the menu open: still reaches the design width
  assert.equal(computeHomeZoom({ width: 600 }), 0.7); // never smaller than the floor
});

test('TV mode: the whole dashboard fits both width and height', () => {
  // 1080p TV (16:9): the height decides
  assert.equal(computeHomeZoom({ width: 1920, height: 1080, tv: true }), 0.98);
  // 4K TV opened at 100 %: 3840 x 2160 CSS px
  assert.equal(computeHomeZoom({ width: 3840, height: 2160, tv: true }), 1.96);
  // a very tall / narrow screen: the width decides
  assert.equal(computeHomeZoom({ width: 1500, height: 3000, tv: true }), 1);
});

test('TV mode is bounded and tolerates a missing size', () => {
  assert.equal(computeHomeZoom({ width: 640, height: 480, tv: true }), 0.8);
  assert.equal(computeHomeZoom({ width: 20000, height: 20000, tv: true }), 4);
  assert.equal(computeHomeZoom({ width: 0 }), 1);
  assert.equal(computeHomeZoom({}), 1);
  assert.equal(computeHomeZoom({ width: 3000, tv: true }), 2); // no height known: width only
});

test('a very wide screen switches to TV mode by itself', () => {
  assert.equal(isAutoTv(3840), true);
  assert.equal(isAutoTv(3000), true);
  assert.equal(isAutoTv(2560), false);
  assert.equal(isAutoTv(1920), false);
  assert.equal(isAutoTv(undefined), false);
});
