import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  F12_INDICATOR,
  F13_INDICATOR,
  F41_INDICATOR,
  INDICATORS,
  INDICATOR_THEMES,
  indicatorEndpoint,
  indicatorLabel,
  indicatorTargetRate,
  indicatorTheme,
} from '../indicator/indicatorConfig.js';
import {
  classifyF13HeatmapRate,
} from '../../components/f13/f13HeatmapBandCatalog.js';

test('F12_INDICATOR has correct configuration, target 95%, teal theme, and colour bands matching F1.3', () => {
  assert.equal(F12_INDICATOR.id, 'f12');
  assert.equal(F12_INDICATOR.moduleLabel, 'F1.2');
  assert.equal(F12_INDICATOR.unitLabel, 'Đơn vị chấp nhận');
  assert.equal(F12_INDICATOR.apiBase, '/f12');
  assert.equal(F12_INDICATOR.routes.dashboard, '/f12/dashboard');
  assert.equal(F12_INDICATOR.routes.ranking, '/f12/ranking/bcvh');

  // Target rate = 95 %
  assert.equal(F12_INDICATOR.targetRate, 95);
  assert.equal(indicatorTargetRate(F12_INDICATOR), 95);

  // Colour theme: light teal / cyan
  assert.equal(F12_INDICATOR.theme, INDICATOR_THEMES.teal);
  assert.equal(indicatorTheme(F12_INDICATOR), INDICATOR_THEMES.teal);
  assert.equal(F12_INDICATOR.theme.primary, '#0D9488');

  // Colour bands = F1.3 floors 70 / 60 / 50
  assert.deepEqual(F12_INDICATOR.heatmapFloors, [70, 60, 50]);
  assert.deepEqual(F12_INDICATOR.heatmapFloors, F13_INDICATOR.heatmapFloors);
  assert.notDeepEqual(F12_INDICATOR.heatmapFloors, F41_INDICATOR.heatmapFloors);

  // Features: routes off, lateCash off, operatingPattern off, actionCenter off; cumulative12 on (no office / whole-BĐTP block: PO 2026-10-12)
  assert.equal(F12_INDICATOR.features.routes, false);
  assert.equal(F12_INDICATOR.features.lateCash, false);
  assert.equal(F12_INDICATOR.features.operatingPattern, false);
  assert.equal(F12_INDICATOR.features.actionCenter, false);
  assert.equal(F12_INDICATOR.features.officeTable, undefined);
  assert.equal(F12_INDICATOR.features.cumulative12, true);

  // Endpoints
  assert.equal(indicatorEndpoint('kpi', F12_INDICATOR), '/f12/dashboard/summary');
  assert.equal(indicatorEndpoint('cumulative12', F12_INDICATOR), '/f12/dashboard/cumulative-12');
  assert.equal(indicatorEndpoint('nationalRanking', F12_INDICATOR), '/f12/dashboard/national-ranking');

  // Registered in INDICATORS
  assert.equal(INDICATORS.f12, F12_INDICATOR);
});

test('indicatorLabel with F12_INDICATOR replaces F1.3 and uses "Đơn vị chấp nhận" instead of BCVH', () => {
  assert.equal(
    indicatorLabel('BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.3 TẠI CÁC BCVH', F12_INDICATOR),
    'BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.2 TẠI CÁC ĐƠN VỊ CHẤP NHẬN',
  );
  assert.equal(
    indicatorLabel('Mở xếp hạng BCVH', F12_INDICATOR),
    'Mở xếp hạng đơn vị chấp nhận',
  );
  assert.equal(
    indicatorLabel('Phân tích chất lượng BCVH', F12_INDICATOR),
    'Phân tích chất lượng đơn vị chấp nhận',
  );

  // Unaffected for F1.3 and F4.1
  assert.equal(
    indicatorLabel('BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.3 TẠI CÁC BCVH', F13_INDICATOR),
    'BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.3 TẠI CÁC BCVH',
  );
  assert.equal(
    indicatorLabel('BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.3 TẠI CÁC BCVH', F41_INDICATOR),
    'BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F4.1 TẠI CÁC BCVH',
  );
});

test('F12DashboardPage wraps DashboardPage in IndicatorProvider with F12_INDICATOR', () => {
  const source = fs.readFileSync(new URL('./F12DashboardPage.jsx', import.meta.url), 'utf8');
  assert.match(source, /import DashboardPage from '\.\.\/dashboard\/DashboardPage/);
  assert.match(source, /IndicatorProvider indicator=\{F12_INDICATOR\}/);
  assert.match(source, /<DashboardPage \/>/);
});

test('F12BcvhRankingPage wraps BcvhRankingPage in IndicatorProvider with F12_INDICATOR', () => {
  const source = fs.readFileSync(new URL('./F12BcvhRankingPage.jsx', import.meta.url), 'utf8');
  assert.match(source, /import BcvhRankingPage from '\.\.\/ranking\/BcvhRankingPage/);
  assert.match(source, /IndicatorProvider indicator=\{F12_INDICATOR\}/);
  assert.match(source, /<BcvhRankingPage \/>/);
});

test('App.jsx registers /f12 redirect and /f12/dashboard, /f12/ranking/bcvh for admin and viewer', () => {
  const appSource = fs.readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
  assert.match(appSource, /import F12DashboardPage from '\.\/features\/f12\/F12DashboardPage'/);
  assert.match(appSource, /import F12BcvhRankingPage from '\.\/features\/f12\/F12BcvhRankingPage'/);
  assert.doesNotMatch(appSource, /import F12Quality/);

  assert.match(appSource, /<Route path="f12" element=\{<Navigate to="\/f12\/dashboard" replace \/>\} \/>/);
  assert.match(appSource, /<Route path="f12\/dashboard" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><F12DashboardPage \/><\/ProtectedRoute>\} \/>/);
  assert.match(appSource, /<Route path="f12\/ranking\/bcvh" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><F12BcvhRankingPage \/><\/ProtectedRoute>\} \/>/);
});

test('DashboardPage mounts only the F12Cumulative12Block (no whole-BĐTP / office block)', () => {
  const source = fs.readFileSync(new URL('../dashboard/DashboardPage.jsx', import.meta.url), 'utf8');
  assert.match(source, /import F12Cumulative12Block from '\.\.\/f12\/components\/F12Cumulative12Block/);
  assert.match(source, /indicator\.features\.cumulative12 \? \(\s*<F12Cumulative12Block/);
  assert.doesNotMatch(source, /F12OfficeTableBlock/);
});

test('Block B: F12Cumulative12Block is city level only: camera, 95% target line, monthly rank, no unit table', () => {
  const source = fs.readFileSync(new URL('./components/F12Cumulative12Block.jsx', import.meta.url), 'utf8');
  assert.match(source, /BlockCaptureButton/);
  // the request goes to the indicator's full path (/f12/dashboard/cumulative-12), not a bare relative path
  assert.match(source, /indicatorEndpoint\('cumulative12', indicator\)/);
  assert.doesNotMatch(source, /SortableTh|rawUnits|data\?\.units/);
  assert.match(source, /ComposedChart/);
  assert.match(source, /ReferenceLine/);
  assert.match(source, /Mục tiêu/);
  assert.match(source, /national_rank/);
  assert.match(source, /indicatorTheme\(indicator\)/);
  assert.doesNotMatch(source, /#003E7E/i);
});

test('Rate band classification under F12: floors 70 / 60 / 50 matching F1.3 and F1.1', () => {
  const bands = F12_INDICATOR.heatmapBands;
  assert.equal(classifyF13HeatmapRate(null, bands).tone, 'unavailable');
  assert.equal(classifyF13HeatmapRate(0, bands).tone, 'band-red');
  assert.equal(classifyF13HeatmapRate(49.9, bands).tone, 'band-red');
  assert.equal(classifyF13HeatmapRate(50, bands).tone, 'band-yellow');
  assert.equal(classifyF13HeatmapRate(59.9, bands).tone, 'band-yellow');
  assert.equal(classifyF13HeatmapRate(60, bands).tone, 'band-pink');
  assert.equal(classifyF13HeatmapRate(69.9, bands).tone, 'band-pink');
  assert.equal(classifyF13HeatmapRate(70, bands).tone, 'band-green');
  assert.equal(classifyF13HeatmapRate(95, bands).tone, 'band-green');
  assert.equal(classifyF13HeatmapRate(100, bands).tone, 'band-green');
});
