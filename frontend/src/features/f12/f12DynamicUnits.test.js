import test from 'node:test';
import assert from 'node:assert/strict';

import { validateBcvhUnits, buildBcvhOptions } from '../dashboard/components/dashboardFilterOptions.js';
import { processBcvhOperationTableData } from '../dashboard/components/bcvhOperationTableData.js';
import { mapBcvhRankingResponse } from '../dashboard/components/unifiedBcvhAnalysisTableData.js';
import { processOverviewData } from '../ranking/bcvhOverviewData.js';
import { buildBcvhUnitsValue, SMALL_MULTIPLES_MAX_UNITS } from '../indicator/BcvhUnitsContext.js';
import { isCanonicalBcvhCode } from '../dashboard/components/dashboardFilterOptions.js';
import { indicatorEndpoint } from '../indicator/indicatorConfig.js';
import { F11_INDICATOR, F12_INDICATOR, F13_INDICATOR, F41_INDICATOR } from '../indicator/indicatorConfig.js';

// F12-DASHBOARD-UI-01 review fix (Opus C1/C2): the shared BCVH screens must work with the ~36 accepting
// units of F1.2 and stay exactly as they were for the six canonical BCVH of F1.1 / F1.3 / F4.1.

const UNITS = Array.from({ length: 37 }, (_, index) => ({
  ma_bcvh: String(5300 + index),
  ten_bcvh: `Bưu điện phường ${String.fromCharCode(65 + (index % 26))}${index}`,
}));

test('only F1.2 declares dynamic units', () => {
  assert.equal(F12_INDICATOR.dynamicUnits, true);
  for (const indicator of [F11_INDICATOR, F13_INDICATOR, F41_INDICATOR]) {
    assert.equal(indicator.dynamicUnits, undefined);
  }
});

test('metadata validation: 37 accepting units are valid for F1.2 only', () => {
  assert.equal(validateBcvhUnits(UNITS).ok, false); // the six-BCVH rule is unchanged
  assert.equal(validateBcvhUnits(UNITS, { anyUnits: true }).ok, true);
  assert.equal(validateBcvhUnits([], { anyUnits: true }).ok, false);
  assert.equal(validateBcvhUnits([UNITS[0], UNITS[0]], { anyUnits: true }).ok, false);
  assert.equal(validateBcvhUnits([{ ma_bcvh: '1', ten_bcvh: '' }], { anyUnits: true }).ok, false);
  const options = buildBcvhOptions(UNITS, { anyUnits: true });
  assert.equal(options.length, 38); // "Tất cả" + 37
  assert.deepEqual(buildBcvhOptions(UNITS), []);
});

test('units value: names, colours, labels; small multiples only up to six units', () => {
  const value = buildBcvhUnitsValue(UNITS);
  assert.equal(value.dynamic, true);
  assert.equal(value.codes.length, 37);
  assert.equal(value.names['5300'], UNITS[0].ten_bcvh);
  assert.ok(value.colors['5336']);
  assert.equal(value.totalLabel, 'Tổng cộng');
  assert.equal(value.allowSmallMultiples, false);
  assert.equal(buildBcvhUnitsValue(UNITS.slice(0, SMALL_MULTIPLES_MAX_UNITS)).allowSmallMultiples, true);
});

test('operations table lists the units the API returned for F1.2, the six canonical BCVH otherwise', () => {
  const data = {
    meta: { anchor_date: '2026-10-10' },
    mtd: UNITS.slice(0, 3).map((unit, index) => ({ ...unit, volume: 100 + index, passed: 90, rate: 90, previous_month_to_date: { volume: 80, passed: 70, rate: 87.5 } })),
    daily: [],
  };
  const f12 = processBcvhOperationTableData(data, { indicator: F12_INDICATOR });
  assert.equal(f12.rows.length, 3);
  assert.deepEqual(f12.rows.map((row) => row.ma_bcvh).sort(), ['5300', '5301', '5302']);
  const f13 = processBcvhOperationTableData(data, { indicator: F13_INDICATOR });
  assert.equal(f13.rows.length, 6);
});

test('ranking mapping keeps every accepting unit for F1.2 and filters to the six BCVH for the others', () => {
  const response = {
    success: true,
    data: UNITS.slice(0, 5).map((unit, index) => ({ ...unit, rank: index + 1, sl_bg_ptc: 10, dat_kpi_2026: 9, khong_dat_kpi_2026: 1 })),
    meta: {},
  };
  assert.equal(mapBcvhRankingResponse(response, { indicator: F12_INDICATOR }).rows.length, 5);
  assert.equal(mapBcvhRankingResponse(response, { indicator: F13_INDICATOR }).rows.length, 0);
});

test('overview processing uses the units of the data for F1.2 and the six BCVH by default', () => {
  const monthly = UNITS.slice(0, 4).map((unit) => ({ month: '2026-10', ma_bcvh: unit.ma_bcvh, ten_bcvh: unit.ten_bcvh, volume: 50, passed: 45, rate: 90 }));
  const raw = { monthly, daily: [], mtd: UNITS.slice(0, 4).map((unit) => ({ ...unit, volume: 50, passed: 45, rate: 90 })), routes: [] };
  const dynamic = processOverviewData(raw, {}, { dynamicUnits: true });
  assert.equal(dynamic.unitCodes.length, 4);
  assert.equal(dynamic.monthlyTableRows.length, 4);
  assert.equal(dynamic.nameMap['5300'], UNITS[0].ten_bcvh);
  assert.equal(dynamic.monthlyChartData[0]['5301'], 90);
  const canonical = processOverviewData(raw, {});
  assert.equal(canonical.unitCodes.length, 6);
  assert.equal(canonical.monthlyTableRows.length, 6);
});

test('F1.2 operations table is office level: every accepting office, own headers, top-N picture choices', () => {
  const table = F12_INDICATOR.operationTable;
  assert.equal(table.groupTitle, 'BƯU CỤC CHẤP NHẬN');
  assert.equal(table.codeHeader, 'Mã bưu cục chấp nhận');
  assert.equal(table.nameHeader, 'Tên bưu cục chấp nhận');
  assert.deepEqual([...table.captureTops], [15, 20, 25, 30]);
  assert.equal(table.captureTopDefault, 20);
  assert.equal(indicatorEndpoint('operationOverview', F12_INDICATOR), '/f12/ranking/offices/overview');
  for (const indicator of [F11_INDICATOR, F13_INDICATOR, F41_INDICATOR]) {
    assert.equal(indicator.operationTable, undefined);
  }
  const offices = Array.from({ length: 73 }, (_, index) => ({ ma_bcvh: String(530000 + index), ten_bcvh: `Bưu cục ${index}`, volume: 10 + index, passed: 9, rate: 90 }));
  const model = processBcvhOperationTableData({ meta: { anchor_date: '2026-10-10' }, mtd: offices, daily: [] }, { indicator: F12_INDICATOR });
  assert.equal(model.rows.length, 73); // every office, not 6, not a top N
  assert.equal(model.titleLine1, 'BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.2 TẠI CÁC BƯU CỤC CHẤP NHẬN');
  assert.ok(!/6 BCVH|BCVH/.test(model.titleLine1));
  const f11 = processBcvhOperationTableData({ meta: { anchor_date: '2026-10-10' }, mtd: [], daily: [] }, { indicator: F11_INDICATOR });
  assert.equal(f11.titleLine1, 'BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.1 TẠI CÁC BCVH');
});

test('unit filter codes and the "all" option follow the indicator metadata', () => {
  assert.equal(isCanonicalBcvhCode('5304', ['5304', '5340']), true);
  assert.equal(isCanonicalBcvhCode('all', ['5304']), true);
  assert.equal(isCanonicalBcvhCode('5375', ['5304']), false);
  assert.equal(isCanonicalBcvhCode('5304'), false); // default: the six canonical BCVH
  assert.equal(buildBcvhOptions(UNITS, { anyUnits: true, unitLabel: 'Đơn vị chấp nhận' })[0].label, 'Tất cả đơn vị chấp nhận');
});
