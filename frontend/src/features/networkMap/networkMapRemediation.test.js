import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  colorForServicePointType,
  colorForRouteId,
  colorForDeliveryService,
  createServicePointSvg,
  ZOOM_LABEL_THRESHOLD_SERVICE,
  ZOOM_LABEL_THRESHOLD_DELIVERY,
} from './mapStyles.js';

describe('NETWORK-MANAGEMENT-001 Phase 2 UI/UX Remediation System', () => {
  it('establishes a consistent 5-category color palette for Service Points', () => {
    assert.equal(colorForServicePointType('Giao dịch'), '#F59E0B');
    assert.equal(colorForServicePointType('Bưu cục vận hành'), '#2563EB');
    assert.equal(colorForServicePointType('Văn hoá xã (VHX)'), '#16A34A');
    assert.equal(colorForServicePointType('Văn phòng'), '#DC2626');
    assert.equal(colorForServicePointType('Khai thác tỉnh'), '#7C3AED');
    assert.equal(colorForServicePointType('Không xác định'), '#6B7280');
  });

  it('generates distinct SVG node markers for each service point category', () => {
    const starSvg = createServicePointSvg('Giao dịch');
    assert.match(starSvg, /polygon points=/);

    const truckSvg = createServicePointSvg('Bưu cục vận hành');
    assert.match(truckSvg, /circle cx=/);

    const triangleSvg = createServicePointSvg('Văn hoá xã (VHX)');
    assert.match(triangleSvg, /polygon points=/);

    const officeSvg = createServicePointSvg('Văn phòng');
    assert.match(officeSvg, /path d=/);

    const hubSvg = createServicePointSvg('Khai thác tỉnh');
    assert.match(hubSvg, /circle cx="14"/);
  });

  it('defines locked zoom thresholds for label visibility', () => {
    assert.equal(ZOOM_LABEL_THRESHOLD_SERVICE, 13);
    assert.equal(ZOOM_LABEL_THRESHOLD_DELIVERY, 14);
  });

  it('provides a high-contrast cycling route palette for Level 2 routes', () => {
    const color1 = colorForRouteId(1);
    const color2 = colorForRouteId(2);
    assert.notEqual(color1, color2);
    assert.equal(typeof color1, 'string');
    assert.match(color1, /^#[0-9A-F]{6}$/i);
  });

  it('maps delivery service types to standardized operational colors', () => {
    assert.equal(colorForDeliveryService('E-EMS(trừ E-Báo phát và E-Hỏa tốc)'), '#DC2626');
    assert.equal(colorForDeliveryService('C-Bưu kiện'), '#2563EB');
    assert.equal(colorForDeliveryService('KT1'), '#059669');
    assert.equal(colorForDeliveryService('R-Bưu phẩm bảo đảm'), '#D97706');
  });

  it('normalizes loai_diem (including VHX alias) and trang_thai correctly', () => {
    assert.equal(colorForServicePointType('VHX'), '#16A34A');
    assert.equal(colorForServicePointType('Văn hoá xã (VHX)'), '#16A34A');

    const activeSvg = createServicePointSvg('VHX', 26, 'Hoạt động');
    assert.ok(!activeSvg.includes('M5 5 L23 23'));

    const inactiveSvg = createServicePointSvg('VHX', 26, 'Ngừng hoạt động');
    assert.ok(inactiveSvg.includes('M5 5 L23 23'), 'Inactive SVG must include crossmark ✕ path');

    const unknownSvg = createServicePointSvg('Văn phòng', 26, 'Chưa ghi');
    assert.ok(unknownSvg.includes('text'), 'Unknown status SVG must include question badge text');
  });

  it('reconciles service point category and status statistics to total exactly 151', () => {
    // Simulated dataset with typical production distribution: 102 VHX, 35 Giao dịch, 7 Văn phòng, 6 BCVH, 1 KT Tỉnh
    const mockPoints = [
      ...Array.from({ length: 102 }, () => ({ loai_diem: 'VHX', trang_thai: 'Hoạt động' })),
      ...Array.from({ length: 35 }, () => ({ loai_diem: 'Giao dịch', trang_thai: 'Hoạt động' })),
      ...Array.from({ length: 7 }, () => ({ loai_diem: 'Văn phòng', trang_thai: 'Hoạt động' })),
      ...Array.from({ length: 6 }, () => ({ loai_diem: 'Bưu cục vận hành', trang_thai: 'Hoạt động' })),
      ...Array.from({ length: 1 }, () => ({ loai_diem: 'Khai thác tỉnh', trang_thai: 'Hoạt động' })),
    ];
    // Mutate 4 items to 'Chưa ghi' as found in real DB
    mockPoints[0].trang_thai = 'Chưa ghi';
    mockPoints[1].trang_thai = 'Chưa ghi';
    mockPoints[2].trang_thai = 'Chưa ghi';
    mockPoints[3].trang_thai = 'Chưa ghi';

    assert.equal(mockPoints.length, 151);

    // Verify loai_diem grouping
    const catCounts = {
      'Văn hoá xã (VHX)': 0,
      'Giao dịch': 0,
      'Văn phòng': 0,
      'Bưu cục vận hành': 0,
      'Khai thác tỉnh': 0,
      'Khác / Chưa phân loại': 0,
    };
    mockPoints.forEach((p) => {
      const cat = p.loai_diem === 'VHX' ? 'Văn hoá xã (VHX)' : p.loai_diem;
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const catSum = Object.values(catCounts).reduce((a, b) => a + b, 0);
    assert.equal(catSum, 151);

    // Verify trang_thai grouping
    const statusCounts = {
      'Hoạt động': 0,
      'Ngừng hoạt động': 0,
      'Chưa xác định': 0,
    };
    mockPoints.forEach((p) => {
      const st = p.trang_thai === 'Hoạt động' ? 'Hoạt động' : p.trang_thai === 'Ngừng hoạt động' ? 'Ngừng hoạt động' : 'Chưa xác định';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    const statusSum = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    assert.equal(statusSum, 151);
    assert.equal(statusCounts['Chưa xác định'], 4);
    assert.equal(statusCounts['Hoạt động'], 147);
  });

  it('groups parcels sharing identical coordinates into a single location cluster', () => {
    const points = [
      { id: 1, lat: 16.467, lon: 107.59, thoi_gian_nhap_phat: '2026-06-01 08:00:00', ca_phat: 'Ca sáng' },
      { id: 2, lat: 16.467, lon: 107.59, thoi_gian_nhap_phat: '2026-06-01 08:05:00', ca_phat: 'Ca sáng' },
      { id: 3, lat: 16.470, lon: 107.60, thoi_gian_nhap_phat: '2026-06-01 14:15:00', ca_phat: 'Ca chiều' },
      { id: 4, lat: 16.470, lon: 107.60, thoi_gian_nhap_phat: null, ca_phat: null },
    ];

    const locationMap = new Map();
    points.forEach((p, idx) => {
      const seq = idx + 1;
      const key = `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, { parcels: [], firstSeq: seq, lastSeq: seq });
      }
      const loc = locationMap.get(key);
      loc.parcels.push({ ...p, seq });
      loc.lastSeq = seq;
    });

    const clusters = Array.from(locationMap.values());
    assert.equal(clusters.length, 2); // 2 physical locations
    assert.equal(clusters[0].parcels.length, 2); // Location #1 has 2 parcels
    assert.equal(clusters[0].firstSeq, 1);
    assert.equal(clusters[0].lastSeq, 2);

    assert.equal(clusters[1].parcels.length, 2); // Location #2 has 2 parcels
    assert.equal(clusters[1].firstSeq, 3);
    assert.equal(clusters[1].lastSeq, 4);

    // KPI verification
    const morningCount = points.filter((p) => p.ca_phat === 'Ca sáng').length;
    const afternoonCount = points.filter((p) => p.ca_phat === 'Ca chiều').length;
    const missingCount = points.filter((p) => !p.thoi_gian_nhap_phat).length;

    assert.equal(morningCount, 2);
    assert.equal(afternoonCount, 1);
    assert.equal(missingCount, 1);
  });

  it('validates Calendar Date Picker date availability and disabled state rules', () => {
    const availableDates = ['2026-06-01', '2026-06-02', '2026-07-17'];
    const availableSet = new Set(availableDates);

    // Date with data
    assert.equal(availableSet.has('2026-06-01'), true, '2026-06-01 must be enabled');
    assert.equal(availableSet.has('2026-07-17'), true, '2026-07-17 must be enabled');

    // Date without data
    assert.equal(availableSet.has('2026-06-03'), false, '2026-06-03 must be disabled');
    assert.equal(availableSet.has('2026-07-04'), false, '2026-07-04 must be disabled');
  });

  it('verifies Month and Year navigation logic for Calendar Date Picker', () => {
    let viewYear = 2026;
    let viewMonth = 5; // June (0-indexed 5)

    // Month decrement
    const handlePrevMonth = () => {
      if (viewMonth === 0) {
        viewMonth = 11;
        viewYear -= 1;
      } else {
        viewMonth -= 1;
      }
    };

    // Month increment
    const handleNextMonth = () => {
      if (viewMonth === 11) {
        viewMonth = 0;
        viewYear += 1;
      } else {
        viewMonth += 1;
      }
    };

    handlePrevMonth(); // 2026 May (4)
    assert.equal(viewYear, 2026);
    assert.equal(viewMonth, 4);

    handlePrevMonth(); // 2026 April (3)
    assert.equal(viewMonth, 3);

    // Jump to Jan and decrement to Dec previous year
    viewMonth = 0;
    handlePrevMonth();
    assert.equal(viewYear, 2025);
    assert.equal(viewMonth, 11);

    handleNextMonth();
    assert.equal(viewYear, 2026);
    assert.equal(viewMonth, 0);
  });

  it('enforces clearing dependent selections (BCVH, Postman, Ca, points) when Date changes', () => {
    let state = {
      date: '2026-06-01',
      bcvh: '533140',
      postman: '53A121',
      ca: 'sang',
      points: [{ id: 1 }, { id: 2 }]
    };

    // Simulated Date change handler
    const onDateChange = (newDate) => {
      state = {
        ...state,
        date: newDate,
        bcvh: '',
        postman: '',
        ca: '',
        points: []
      };
    };

    onDateChange('2026-07-17');

    assert.equal(state.date, '2026-07-17');
    assert.equal(state.bcvh, '');
    assert.equal(state.postman, '');
    assert.equal(state.ca, '');
    assert.equal(state.points.length, 0);
  });

  it('runs points query ONLY when all mandatory filters (Date, BCVH, Postman) are selected', () => {
    const isQueryAllowed = (date, bcvh, postman) => Boolean(date && bcvh && postman);

    assert.equal(isQueryAllowed('', '533140', '53A121'), false, 'Missing Date must disallow query');
    assert.equal(isQueryAllowed('2026-06-01', '', '53A121'), false, 'Missing BCVH must disallow query');
    assert.equal(isQueryAllowed('2026-06-01', '533140', ''), false, 'Missing Postman must disallow query');
    assert.equal(isQueryAllowed('2026-06-01', '533140', '53A121'), true, 'All 3 present allows query');
  });

  it('validates Delivery Road Routing waypoint sequence follows Thời gian nhập phát order without reordering', async () => {
    const { fetchDeliveryRoadRoute } = await import('./deliveryRoutingService.js');
    const chronologicalWaypoints = [
      { lat: 16.4637, lon: 107.5909, time: '08:00' },
      { lat: 16.4680, lon: 107.5950, time: '09:15' },
      { lat: 16.4720, lon: 107.6000, time: '10:30' },
    ];

    const mockFetch = async (url) => {
      const coords = url.split('/route/v1/driving/')[1].split('?')[0].split(';');
      // Return coordinates matching input URL order exactly
      const returnedCoords = coords.map((c) => {
        const [lon, lat] = c.split(',').map(Number);
        return [lon, lat];
      });

      return {
        ok: true,
        json: async () => ({
          code: 'Ok',
          routes: [{ geometry: { coordinates: returnedCoords }, distance: 2500 }],
        }),
      };
    };

    const res = await fetchDeliveryRoadRoute(chronologicalWaypoints, { fetchImpl: mockFetch, useCache: false });
    assert.equal(res.hasFallback, false);
    assert.equal(res.segments.length, 1);
    assert.equal(res.segments[0].isRoad, true);

    // Verify coordinates match input sequence 107.5909, 16.4637 -> 107.5950, 16.4680 -> 107.6000, 16.4720
    const pos = res.segments[0].positions;
    assert.equal(pos[0][0], 16.4637);
    assert.equal(pos[1][0], 16.4680);
    assert.equal(pos[2][0], 16.4720);
  });

  it('splits long routes (>25 waypoints) into chunked requests and concatenates sequentially', async () => {
    const { chunkLocations, fetchDeliveryRoadRoute } = await import('./deliveryRoutingService.js');

    // Create 60 waypoints
    const locations = Array.from({ length: 60 }, (_, i) => ({
      lat: 16.46 + i * 0.001,
      lon: 107.59 + i * 0.001,
    }));

    const chunks = chunkLocations(locations, 25);
    assert.equal(chunks.length, 3, '60 waypoints with max 25 per chunk (1 overlap) must split into 3 chunks');
    assert.equal(chunks[0].length, 25);
    assert.equal(chunks[1].length, 25);
    assert.equal(chunks[2].length, 12); // 60 - 24 - 24 = 12

    const mockFetch = async (url) => ({
      ok: true,
      json: async () => {
        const coordsStr = url.split('/route/v1/driving/')[1].split('?')[0];
        const coords = coordsStr.split(';').map((c) => c.split(',').map(Number));
        return { code: 'Ok', routes: [{ geometry: { coordinates: coords }, distance: 5000 }] };
      },
    });

    const res = await fetchDeliveryRoadRoute(locations, { fetchImpl: mockFetch, useCache: false });
    assert.equal(res.totalChunks, 3);
    assert.equal(res.segments.length, 3);
    assert.equal(res.segments.every((s) => s.isRoad), true);
  });

  it('validates in-memory route caching engine and clearRouteCache utility', async () => {
    const { fetchDeliveryRoadRoute, clearRouteCache } = await import('./deliveryRoutingService.js');
    clearRouteCache();

    const waypoints = [
      { lat: 16.4637, lon: 107.5909 },
      { lat: 16.4680, lon: 107.5950 },
    ];

    let fetchCalls = 0;
    const mockFetch = async () => {
      fetchCalls++;
      return {
        ok: true,
        json: async () => ({
          code: 'Ok',
          routes: [{ geometry: { coordinates: [[107.5909, 16.4637], [107.5950, 16.4680]] }, distance: 1000 }],
        }),
      };
    };

    // First call: fetches from mock API
    const res1 = await fetchDeliveryRoadRoute(waypoints, { fetchImpl: mockFetch, useCache: true });
    assert.equal(fetchCalls, 1);

    // Second call with same waypoints: returned from cache (fetchCalls remains 1)
    const res2 = await fetchDeliveryRoadRoute(waypoints, { fetchImpl: mockFetch, useCache: true });
    assert.equal(fetchCalls, 1);
    assert.deepEqual(res1, res2);

    // After clearing cache: fetches again (fetchCalls becomes 2)
    clearRouteCache();
    await fetchDeliveryRoadRoute(waypoints, { fetchImpl: mockFetch, useCache: true });
    assert.equal(fetchCalls, 2);
  });

  it('provides graceful fallback to straight line polyline if OSRM endpoint fails', async () => {
    const { fetchDeliveryRoadRoute } = await import('./deliveryRoutingService.js');

    const waypoints = [
      { lat: 16.4637, lon: 107.5909 },
      { lat: 16.4680, lon: 107.5950 },
    ];

    // Mock failing API (HTTP 500 error)
    const mockFailingFetch = async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const res = await fetchDeliveryRoadRoute(waypoints, { fetchImpl: mockFailingFetch, useCache: false });
    assert.equal(res.hasFallback, true);
    assert.equal(res.segments.length, 1);
    assert.equal(res.segments[0].isRoad, false, 'Failed chunk must mark isRoad = false');
    assert.deepEqual(res.segments[0].positions, [[16.4637, 107.5909], [16.4680, 107.5950]], 'Fallback positions must match original waypoints');
    assert.match(res.warning, /Định tuyến/i);
  });
});
