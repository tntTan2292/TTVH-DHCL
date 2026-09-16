import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DASH,
  formatDateVN,
  formatVolume,
  formatRate,
  formatDeltaRate,
  processBcvhOperationTableData,
} from './bcvhOperationTableData.js';

test('formatDateVN formats YYYY-MM-DD to DD/MM/YYYY and falls back to dash', () => {
  assert.equal(formatDateVN('2026-09-14'), '14/09/2026');
  assert.equal(formatDateVN('2026-01-01'), '01/01/2026');
  assert.equal(formatDateVN(null), DASH);
  assert.equal(formatDateVN(undefined), DASH);
  assert.equal(formatDateVN(''), DASH);
  assert.equal(formatDateVN('invalid-date'), DASH);
});

test('formatVolume formats integers with thousand separator and handles missing values', () => {
  assert.equal(formatVolume(1133), '1.133');
  assert.equal(formatVolume(43332), '43.332');
  assert.equal(formatVolume(0), '0');
  assert.equal(formatVolume(null), DASH);
  assert.equal(formatVolume(undefined), DASH);
  assert.equal(formatVolume(''), DASH);
});

test('formatRate formats percentage with 1 decimal place and handles missing values', () => {
  assert.equal(formatRate(65.8429), '65,8%');
  assert.equal(formatRate(41.0635), '41,1%');
  assert.equal(formatRate(0), '0,0%');
  assert.equal(formatRate(null), DASH);
  assert.equal(formatRate(undefined), DASH);
});

test('formatDeltaRate formats signed rate movement in percentage points (điểm %)', () => {
  assert.equal(formatDeltaRate(1.234), '+1,2 điểm %');
  assert.equal(formatDeltaRate(-1.4376), '-1,4 điểm %');
  assert.equal(formatDeltaRate(0), '0,0 điểm %');
  assert.equal(formatDeltaRate(null), DASH);
  assert.equal(formatDeltaRate(undefined), DASH);
});

test('processBcvhOperationTableData: exact 9 columns structure and dynamic title', () => {
  const mockData = {
    meta: {
      anchor_date: '2026-09-14',
    },
    mtd: [
      { ma_bcvh: '535790', volume: 1000, passed: 700, rate: 70.0, previous_month_to_date: { volume: 800, passed: 480, rate: 60.0 } },
      { ma_bcvh: '536250', volume: 2000, passed: 1000, rate: 50.0, previous_month_to_date: { volume: 2000, passed: 1200, rate: 60.0 } },
      { ma_bcvh: '535470', volume: 1500, passed: 900, rate: 60.0, previous_month_to_date: { volume: 1500, passed: 900, rate: 60.0 } },
      { ma_bcvh: '537220', volume: 1000, passed: 400, rate: 40.0, previous_month_to_date: { volume: 1000, passed: 500, rate: 50.0 } },
      { ma_bcvh: '537015', volume: 800, passed: 600, rate: 75.0, previous_month_to_date: { volume: 800, passed: 560, rate: 70.0 } },
      { ma_bcvh: '533140', volume: 5000, passed: 3000, rate: 60.0, previous_month_to_date: { volume: 5000, passed: 2500, rate: 50.0 } },
    ],
    daily: [
      { date: '2026-09-13', ma_bcvh: '535790', volume: 100, passed: 80, rate: 80.0 },
      { date: '2026-09-13', ma_bcvh: '536250', volume: 200, passed: 120, rate: 60.0 },
      { date: '2026-09-13', ma_bcvh: '535470', volume: 150, passed: 90, rate: 60.0 },
      { date: '2026-09-13', ma_bcvh: '537220', volume: 100, passed: 50, rate: 50.0 },
      { date: '2026-09-13', ma_bcvh: '537015', volume: 80, passed: 60, rate: 75.0 },
      { date: '2026-09-13', ma_bcvh: '533140', volume: 500, passed: 300, rate: 60.0 },
      { date: '2026-09-14', ma_bcvh: '535790', volume: 110, passed: 77, rate: 70.0 },
      { date: '2026-09-14', ma_bcvh: '536250', volume: 220, passed: 110, rate: 50.0 },
      { date: '2026-09-14', ma_bcvh: '535470', volume: 160, passed: 104, rate: 65.0 },
      { date: '2026-09-14', ma_bcvh: '537220', volume: 120, passed: 48, rate: 40.0 },
      { date: '2026-09-14', ma_bcvh: '537015', volume: 90, passed: 72, rate: 80.0 },
      { date: '2026-09-14', ma_bcvh: '533140', volume: 550, passed: 330, rate: 60.0 },
    ],
  };

  const processed = processBcvhOperationTableData(mockData);

  // Title verification
  assert.equal(processed.titleLine1, 'BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.3 TẠI CÁC BCVH');
  assert.equal(processed.titleLine2, 'ĐẾN NGÀY 14/09/2026 (SỐ LIỆU GẦN NHẤT)');
  assert.equal(processed.formattedAnchorDate, '14/09/2026');
  assert.equal(processed.prevFactDate, '2026-09-13');

  // Row counts: 1 total row + 6 canonical rows = 7 rows
  assert.equal(processed.allRows.length, 7);
  assert.equal(processed.rows.length, 6);

  // Row 1 is TỔNG CỘNG placed first with STT '—'
  const totalRow = processed.totalRow;
  assert.equal(totalRow.stt, DASH);
  assert.equal(totalRow.ten_bcvh, 'TỔNG CỘNG');
  assert.equal(totalRow.is_total, true);

  // Total MTD Volume = 1000 + 2000 + 1500 + 1000 + 800 + 5000 = 11300
  // Total MTD Passed = 700 + 1000 + 900 + 400 + 600 + 3000 = 6600
  // Total MTD Rate = (6600 / 11300) * 100 = 58.4070...%
  assert.equal(totalRow.mtd_volume, 11300);
  assert.equal(Number(totalRow.mtd_rate.toFixed(1)), 58.4);

  // Total Prev MTD Volume = 800 + 2000 + 1500 + 1000 + 800 + 5000 = 11100
  // Total Prev MTD Passed = 480 + 1200 + 900 + 500 + 560 + 2500 = 6140
  // Total Prev MTD Rate = (6140 / 11100) * 100 = 55.3153...%
  // Delta MTD = 58.4070... - 55.3153... = +3.0917... điểm %
  assert.equal(Number(totalRow.mtd_delta_rate.toFixed(1)), 3.1);

  // Total Daily Volume = 110 + 220 + 160 + 120 + 90 + 550 = 1250
  // Total Daily Passed = 77 + 110 + 104 + 48 + 72 + 330 = 741
  // Total Daily Rate = (741 / 1250) * 100 = 59.28%
  assert.equal(totalRow.daily_volume, 1250);
  assert.equal(Number(totalRow.daily_rate.toFixed(1)), 59.3);

  // Total Prev Daily Volume = 100 + 200 + 150 + 100 + 80 + 500 = 1130
  // Total Prev Daily Passed = 80 + 120 + 90 + 50 + 60 + 300 = 700
  // Total Prev Daily Rate = (700 / 1130) * 100 = 61.9469...%
  // Delta Daily = 59.28 - 61.9469... = -2.6669... điểm %
  assert.equal(Number(totalRow.daily_delta_rate.toFixed(1)), -2.7);

  // Verify 6 canonical rows have STT 1 to 6
  processed.rows.forEach((row, idx) => {
    assert.equal(row.stt, idx + 1);
    assert.ok(row.ma_bcvh);
    assert.ok(row.ten_bcvh);
    assert.ok(row.mtd_volume !== undefined);
    assert.ok(row.mtd_rate !== undefined);
    assert.ok(row.mtd_delta_rate !== undefined);
    assert.ok(row.daily_volume !== undefined);
    assert.ok(row.daily_rate !== undefined);
    assert.ok(row.daily_delta_rate !== undefined);
  });

  // Check specific BCVH values (e.g. A Lưới)
  const aLuoi = processed.rows.find((r) => r.ma_bcvh === '535790');
  assert.equal(aLuoi.stt, 1);
  assert.equal(aLuoi.ten_bcvh, 'BCVH A Lưới');
  assert.equal(aLuoi.mtd_volume, 1000);
  assert.equal(aLuoi.mtd_rate, 70.0);
  assert.equal(aLuoi.mtd_delta_rate, 10.0); // 70.0 - 60.0
  assert.equal(aLuoi.daily_volume, 110);
  assert.equal(aLuoi.daily_rate, 70.0);
  assert.equal(aLuoi.daily_delta_rate, -10.0); // 70.0 - 80.0
});

test('processBcvhOperationTableData: handles missing comparison data and empty state with dashes', () => {
  const emptyData = {
    meta: {
      anchor_date: null,
    },
    mtd: [],
    daily: [],
  };

  const processed = processBcvhOperationTableData(emptyData);
  assert.equal(processed.formattedAnchorDate, DASH);
  assert.equal(processed.titleLine2, `ĐẾN NGÀY ${DASH} (SỐ LIỆU GẦN NHẤT)`);
  assert.equal(processed.totalRow.stt, DASH);
  assert.equal(processed.totalRow.mtd_volume, 0);
  assert.equal(processed.totalRow.mtd_rate, null);
  assert.equal(processed.totalRow.mtd_delta_rate, null);
  assert.equal(processed.totalRow.daily_volume, 0);
  assert.equal(processed.totalRow.daily_rate, null);
  assert.equal(processed.totalRow.daily_delta_rate, null);

  assert.equal(formatRate(processed.totalRow.mtd_rate), DASH);
  assert.equal(formatDeltaRate(processed.totalRow.mtd_delta_rate), DASH);
  assert.equal(formatRate(processed.totalRow.daily_rate), DASH);
  assert.equal(formatDeltaRate(processed.totalRow.daily_delta_rate), DASH);
});
