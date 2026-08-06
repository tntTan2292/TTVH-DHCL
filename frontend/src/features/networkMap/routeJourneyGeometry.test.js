import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineKm,
  bearingDeg,
  computeTurnaroundIndex,
  classifyStopDirections,
  groupStopIndicesByCoordinate,
  fanAngles,
  fanAngleToOffset,
  offsetPixelPolyline,
  pickArrowSamplePositions,
  computePolylineLengthKm,
  computeArrowCount,
} from './routeJourneyGeometry.js';

describe('ĐTC2 journey visual remediation — routeJourneyGeometry', () => {
  it('haversineKm returns 0 for identical points and a plausible distance for known points', () => {
    assert.equal(haversineKm(16.46, 107.59, 16.46, 107.59), 0);
    // Huế city center to Lăng Cô is roughly 60-70km as the crow flies.
    const d = haversineKm(16.4637, 107.5909, 16.23602194, 108.0817791);
    assert.ok(d > 40 && d < 80, `expected ~40-80km, got ${d}`);
  });

  it('computeTurnaroundIndex identifies the farthest-from-start stop, matching the PO Route 6 example (Lăng Cô)', () => {
    // Exact live-DB shape of Route 6: BCVH Phú Lộc → Lộc Thủy → Thừa Lưu → Lăng Cô → Thừa Lưu → BCVH Phú Lộc
    const route6Stops = [
      { seq: 1, ma_diem: '537220', lat: 16.2803428466448, lon: 107.860034879957 }, // BCVH Phú Lộc (start)
      { seq: 2, ma_diem: '537330', lat: 16.2725688, lon: 107.9370636 }, // Lộc Thủy
      { seq: 3, ma_diem: '537340', lat: 16.27156693, lon: 107.9909899 }, // Thừa Lưu
      { seq: 4, ma_diem: '537360', lat: 16.23602194, lon: 108.0817791 }, // Lăng Cô (turnaround)
      { seq: 5, ma_diem: '537340', lat: 16.27156693, lon: 107.9909899 }, // Thừa Lưu (return)
      { seq: 6, ma_diem: '537220', lat: 16.2803428466448, lon: 107.860034879957 }, // BCVH Phú Lộc (end)
    ];
    const idx = computeTurnaroundIndex(route6Stops);
    assert.equal(idx, 3, 'Lăng Cô (index 3) must be identified as the turnaround stop');
    assert.equal(route6Stops[idx].ma_diem, '537360');
  });

  it('classifyStopDirections labels stops before/at/after the turnaround as outbound/turnaround/return', () => {
    const route6Stops = [
      { lat: 16.2803428466448, lon: 107.860034879957 },
      { lat: 16.2725688, lon: 107.9370636 },
      { lat: 16.27156693, lon: 107.9909899 },
      { lat: 16.23602194, lon: 108.0817791 },
      { lat: 16.27156693, lon: 107.9909899 },
      { lat: 16.2803428466448, lon: 107.860034879957 },
    ];
    const { turnaroundIndex, directions } = classifyStopDirections(route6Stops);
    assert.equal(turnaroundIndex, 3);
    assert.deepEqual(directions, ['outbound', 'outbound', 'outbound', 'turnaround', 'return', 'return']);
  });

  it('classifyStopDirections treats a route with no detectable turnaround as fully outbound (one-way journey)', () => {
    // Monotonically increasing distance from start — no return leg.
    const oneWayStops = [
      { lat: 16.46, lon: 107.59 },
      { lat: 16.50, lon: 107.65 },
      { lat: 16.55, lon: 107.75 },
    ];
    const { turnaroundIndex, directions } = classifyStopDirections(oneWayStops);
    assert.equal(turnaroundIndex, null);
    assert.deepEqual(directions, ['outbound', 'outbound', 'outbound']);
  });

  it('classifyStopDirections handles a simple 3-stop A→B→A round trip (turnaround in the middle)', () => {
    const stops = [
      { lat: 16.46, lon: 107.59 },
      { lat: 16.50, lon: 107.70 },
      { lat: 16.46, lon: 107.59 },
    ];
    const { turnaroundIndex, directions } = classifyStopDirections(stops);
    assert.equal(turnaroundIndex, 1);
    assert.deepEqual(directions, ['outbound', 'turnaround', 'return']);
  });

  it('groupStopIndicesByCoordinate groups revisited stops (same ma_diem/coordinate) together, preserving seq order, without altering coordinates', () => {
    const route6Stops = [
      { lat: 16.2803428466448, lon: 107.860034879957 }, // BCVH Phú Lộc #1
      { lat: 16.2725688, lon: 107.9370636 }, // Lộc Thủy #2
      { lat: 16.27156693, lon: 107.9909899 }, // Thừa Lưu #3
      { lat: 16.23602194, lon: 108.0817791 }, // Lăng Cô #4
      { lat: 16.27156693, lon: 107.9909899 }, // Thừa Lưu #5
      { lat: 16.2803428466448, lon: 107.860034879957 }, // BCVH Phú Lộc #6
    ];
    const grouped = groupStopIndicesByCoordinate(route6Stops);
    assert.equal(grouped.size, 4, 'BCVH Phú Lộc, Lộc Thủy, Thừa Lưu, Lăng Cô — 4 distinct coordinates');
    const bcvhKey = '16.280343,107.860035';
    assert.deepEqual(grouped.get(bcvhKey), [0, 5], 'BCVH Phú Lộc visited at stop 1 and stop 6');
    const thuaLuuKey = '16.271567,107.990990';
    assert.deepEqual(grouped.get(thuaLuuKey), [2, 4], 'Thừa Lưu visited at stop 3 and stop 5');
  });

  it('fanAngles evenly spreads N markers around a full circle, and returns [0] for a single-item group', () => {
    assert.deepEqual(fanAngles(1), [0]);
    assert.deepEqual(fanAngles(0), [0]);
    const two = fanAngles(2);
    assert.equal(two.length, 2);
    assert.equal(two[1] - two[0], 180);
    const four = fanAngles(4);
    assert.deepEqual(four, [0, 90, 180, 270]);
  });

  it('fanAngleToOffset converts angle+radius into a pixel offset with y-down (Leaflet layer point) convention', () => {
    const up = fanAngleToOffset(0, 10);
    assert.ok(Math.abs(up.x) < 1e-9);
    assert.ok(up.y < 0, 'angle 0 (up) must be negative y in a y-down coordinate system');

    const right = fanAngleToOffset(90, 10);
    assert.ok(right.x > 9.9, 'angle 90 (right) must be positive x');
    assert.ok(Math.abs(right.y) < 1e-9);
  });

  it('offsetPixelPolyline shifts a straight horizontal line perpendicular (vertically) by the requested pixel amount', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }];
    const offset = offsetPixelPolyline(points, 5);
    offset.forEach((p, i) => {
      assert.equal(p.x, points[i].x, 'a horizontal line offset perpendicular must not move in x');
      assert.ok(Math.abs(Math.abs(p.y) - 5) < 1e-6, `expected |y| offset of 5, got ${p.y}`);
    });
    // A negative offset must go the opposite (other side) direction.
    const negOffset = offsetPixelPolyline(points, -5);
    assert.ok(Math.sign(negOffset[0].y) !== Math.sign(offset[0].y) || offset[0].y === 0);
  });

  it('offsetPixelPolyline returns the input unchanged when offsetPx is 0/falsy', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
    assert.deepEqual(offsetPixelPolyline(points, 0), points);
  });

  it('pickArrowSamplePositions returns evenly-distance-spaced points with a bearing pointing along the travel direction', () => {
    // A straight line due east: bearing should be ~90° at every sample.
    const positions = [
      [16.46, 107.59],
      [16.46, 107.60],
      [16.46, 107.61],
      [16.46, 107.62],
    ];
    const samples = pickArrowSamplePositions(positions, 3);
    assert.equal(samples.length, 3);
    samples.forEach((s) => {
      assert.ok(Math.abs(s.bearing - 90) < 5, `expected bearing ~90° (due east), got ${s.bearing}`);
    });
    // Samples must be strictly increasing in longitude (moving toward the end of the line).
    for (let i = 1; i < samples.length; i++) {
      assert.ok(samples[i].position[1] > samples[i - 1].position[1]);
    }
  });

  it('bearingDeg computes 90° due east and 270° due west', () => {
    assert.ok(Math.abs(bearingDeg(16.46, 107.59, 16.46, 107.60) - 90) < 1);
    assert.ok(Math.abs(bearingDeg(16.46, 107.60, 16.46, 107.59) - 270) < 1);
  });

  it('computePolylineLengthKm sums consecutive haversine distances and returns 0 for a degenerate line', () => {
    assert.equal(computePolylineLengthKm([]), 0);
    assert.equal(computePolylineLengthKm([[16.46, 107.59]]), 0);
    const straightLine = [
      [16.46, 107.59],
      [16.46, 107.60],
      [16.46, 107.61],
    ];
    const total = computePolylineLengthKm(straightLine);
    const expected = haversineKm(16.46, 107.59, 16.46, 107.60) + haversineKm(16.46, 107.60, 16.46, 107.61);
    assert.ok(Math.abs(total - expected) < 1e-9);
  });

  it('computeArrowCount scales arrow density with route length, clamped to a sane min/max (PO arrow-visibility remediation)', () => {
    assert.equal(computeArrowCount(0), 2, 'a degenerate/zero-length leg still gets the minimum');
    assert.equal(computeArrowCount(8), 2, 'a short ~8km leg (e.g. Tuyến 2) clamps to the minimum, not 0-1');
    assert.equal(computeArrowCount(60), 4, 'a ~60km leg (Tuyến 6 outbound) gets a proportionate count');
    assert.equal(computeArrowCount(171), 8, 'a long ~171km leg (Tuyến 8) clamps to the maximum, never unboundedly dense');
    // Custom options are honored.
    assert.equal(computeArrowCount(30, { minCount: 1, maxCount: 3, kmPerArrow: 10 }), 3);
  });
});
