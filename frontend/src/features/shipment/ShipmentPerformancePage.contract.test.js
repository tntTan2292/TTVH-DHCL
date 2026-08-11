import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./ShipmentPerformancePage.jsx', import.meta.url), 'utf8');

// Product Owner decision (2026-08-11), point 5/6: no fabricated fallback context. The old
// hardcoded '2026-06-23' / 'BC_HUE01' / 'R_HUE01_01' / 'BCVH TP Huế' / 'Tuyến Phường Phú Hội'
// defaults must be gone entirely — every default must come from real data (meta/route API).
test('Evidence page no longer hardcodes a fake default date, BCVH, or route', () => {
  assert.doesNotMatch(source, /2026-06-23/);
  assert.doesNotMatch(source, /BC_HUE01/);
  assert.doesNotMatch(source, /R_HUE01_01/);
  assert.doesNotMatch(source, /BCVH TP Huế/);
  assert.doesNotMatch(source, /Tuyến Phường Phú Hội/);
});

// Point 6: must open usefully from the Sidebar with zero query params — real API-derived
// defaults (meta max_date + first real BCVH), not fabricated context.
test('Evidence page resolves date and BCVH from real meta data, not literals', () => {
  assert.match(source, /getDashboardMeta/);
  assert.match(source, /resolveDefaultRouteDate/);
  assert.match(source, /bcvhOptions\[0\]\?\.value/);
});

// Point 5: real, BCVH-dependent Tuyến selector with "Tất cả tuyến" support.
test('Evidence page offers a real, BCVH-dependent Tuyến selector including "Tất cả tuyến"', () => {
  assert.match(source, /getRouteRanking\(analysisDate, bcvhId, 1, 1000, 'ten_tuyen', 'asc', 'all'\)/);
  assert.match(source, /ALL_ROUTES_OPTION/);
  assert.match(source, /Tất cả tuyến/);
});

// Point 5: BCVH change must not keep a now-invalid route_id.
test('Evidence page resets route_id when the selected BCVH changes or the route becomes invalid', () => {
  assert.match(source, /handleBcvhChange/);
  assert.match(source, /route_id: '', route_name: ''/);
});

// Point 7: single-day analysis contract only — never a from_date–to_date range filter.
test('Evidence page keeps the single-day analysis contract shared with Route Ranking', () => {
  assert.match(source, /toDateParam \|\| fromDateParam/);
  assert.match(source, /resolveDefaultRouteDate\(\{ param: toDateParam \|\| fromDateParam, metaMaxDate \}\)/);
});

// Point 8: no silent 1000-row cap — must walk every backend page.
test('Evidence page fetches the complete matching Evidence set via fetchAllEvidenceRows, not a single fixed page', () => {
  assert.match(source, /fetchAllEvidenceRows/);
  assert.doesNotMatch(source, /getShipmentEvidenceList\(fromDate, bcvhId, routeId, 1, 1000\)/);
  assert.doesNotMatch(source, /getEvidenceList\([^)]*,\s*1000\s*\)/);
});

// Point 9: full drill-down context preserved across param names.
test('Evidence page reads and preserves the full drill-down context contract', () => {
  ['from_date', 'bcvh_id', 'bcvh_name', 'route_id', 'route_name', 'shipment_id'].forEach((key) => {
    assert.match(source, new RegExp(`searchParams\\.get\\('${key}'\\)`));
  });
});
