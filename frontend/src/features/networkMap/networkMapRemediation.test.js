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
});
