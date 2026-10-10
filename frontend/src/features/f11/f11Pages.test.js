import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  F11_INDICATOR,
  F13_INDICATOR,
  F41_INDICATOR,
  INDICATORS,
  indicatorEndpoint,
  buildMonthlyHeatmapLegend,
} from '../indicator/indicatorConfig.js';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_TONE_CLASS,
} from '../../components/f13/f13HeatmapBandCatalog.js';
import { mapBcvhRankingResponse } from '../dashboard/components/unifiedBcvhAnalysisTableData.js';
import { buildUnifiedCommandCards } from '../dashboard/components/dashboardKpiCards.js';

test('F11_INDICATOR has correct configuration and colour bands matching F1.3', () => {
  assert.equal(F11_INDICATOR.id, 'f11');
  assert.equal(F11_INDICATOR.moduleLabel, 'F1.1');
  assert.equal(F11_INDICATOR.apiBase, '/f11');
  assert.equal(F11_INDICATOR.routes.dashboard, '/f11/dashboard');
  assert.equal(F11_INDICATOR.routes.ranking, '/f11/ranking/bcvh');

  // Colour bands = F1.3 floors 70 / 60 / 50
  assert.deepEqual(F11_INDICATOR.heatmapFloors, [70, 60, 50]);
  assert.deepEqual(F11_INDICATOR.heatmapFloors, F13_INDICATOR.heatmapFloors);
  assert.notDeepEqual(F11_INDICATOR.heatmapFloors, F41_INDICATOR.heatmapFloors);

  // Features: provinceRanking removed per PO Delta 2026-10-10, pairTable true
  assert.equal(F11_INDICATOR.features.routes, false);
  assert.equal(F11_INDICATOR.features.lateCash, false);
  assert.equal(F11_INDICATOR.features.operatingPattern, false);
  assert.equal(F11_INDICATOR.features.actionCenter, false);
  assert.equal(F11_INDICATOR.features.provinceRanking, undefined);
  assert.equal(F11_INDICATOR.features.pairTable, true);

  // Endpoints: nationalRanking kept on server for future Home page feed
  assert.equal(indicatorEndpoint('kpi', F11_INDICATOR), '/f11/dashboard/summary');
  assert.equal(indicatorEndpoint('nationalRanking', F11_INDICATOR), '/f11/dashboard/national-ranking');
  assert.equal(indicatorEndpoint('pairTable', F11_INDICATOR), '/f11/dashboard/pair-table');

  // Registered in INDICATORS
  assert.equal(INDICATORS.f11, F11_INDICATOR);
});

test('F11DashboardPage wraps DashboardPage in IndicatorProvider with F11_INDICATOR', () => {
  const source = fs.readFileSync(new URL('./F11DashboardPage.jsx', import.meta.url), 'utf8');
  assert.match(source, /import DashboardPage from '\.\.\/dashboard\/DashboardPage/);
  assert.match(source, /IndicatorProvider indicator=\{F11_INDICATOR\}/);
  assert.match(source, /<DashboardPage \/>/);
});

test('F11BcvhRankingPage wraps BcvhRankingPage in IndicatorProvider with F11_INDICATOR', () => {
  const source = fs.readFileSync(new URL('./F11BcvhRankingPage.jsx', import.meta.url), 'utf8');
  assert.match(source, /import BcvhRankingPage from '\.\.\/ranking\/BcvhRankingPage/);
  assert.match(source, /IndicatorProvider indicator=\{F11_INDICATOR\}/);
  assert.match(source, /<BcvhRankingPage \/>/);
});

test('App.jsx registers f11/dashboard and f11/ranking/bcvh for admin and viewer, /f11 redirects', () => {
  const appSource = fs.readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
  assert.match(appSource, /import F11DashboardPage from '\.\/features\/f11\/F11DashboardPage'/);
  assert.match(appSource, /import F11BcvhRankingPage from '\.\/features\/f11\/F11BcvhRankingPage'/);
  assert.doesNotMatch(appSource, /import F11Quality/);

  assert.match(appSource, /<Route path="f11" element=\{<Navigate to="\/f11\/dashboard" replace \/>\} \/>/);
  assert.match(appSource, /<Route path="f11\/dashboard" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><F11DashboardPage \/><\/ProtectedRoute>\} \/>/);
  assert.match(appSource, /<Route path="f11\/ranking\/bcvh" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><F11BcvhRankingPage \/><\/ProtectedRoute>\} \/>/);
});

test('PO Delta 2026-10-10: 34-province table removed from F1.1 and unmounted from DashboardPage', () => {
  // Component files removed
  assert.equal(fs.existsSync(new URL('./components/F11ProvinceRankingBlock.jsx', import.meta.url)), false);
  assert.equal(fs.existsSync(new URL('./components/f11ProvinceRankingData.js', import.meta.url)), false);

  // DashboardPage unmounted and unimported F11ProvinceRankingBlock
  const dashboardSource = fs.readFileSync(new URL('../dashboard/DashboardPage.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(dashboardSource, /F11ProvinceRankingBlock/);

  // Server endpoint kept in F11_INDICATOR.endpoints
  assert.equal(F11_INDICATOR.endpoints.nationalRanking, '/dashboard/national-ranking');
});

test('Block B: Pair table cell classification, legend, and camera button use dynamic indicator config', () => {
  // classifyF13HeatmapRate with F11_INDICATOR bands
  assert.equal(classifyF13HeatmapRate(null, F11_INDICATOR.heatmapBands).tone, 'unavailable');
  assert.equal(classifyF13HeatmapRate(undefined, F11_INDICATOR.heatmapBands).tone, 'unavailable');
  assert.equal(classifyF13HeatmapRate(0, F11_INDICATOR.heatmapBands).tone, 'band-red');
  assert.equal(classifyF13HeatmapRate(45.5, F11_INDICATOR.heatmapBands).tone, 'band-red');
  assert.equal(classifyF13HeatmapRate(55, F11_INDICATOR.heatmapBands).tone, 'band-yellow');
  assert.equal(classifyF13HeatmapRate(65, F11_INDICATOR.heatmapBands).tone, 'band-pink');
  assert.equal(classifyF13HeatmapRate(85, F11_INDICATOR.heatmapBands).tone, 'band-green');

  // Tone class lookup works as expected
  assert.ok(F13_HEATMAP_TONE_CLASS['band-green']);
  assert.ok(F13_HEATMAP_TONE_CLASS['band-pink']);
  assert.ok(F13_HEATMAP_TONE_CLASS['band-yellow']);
  assert.ok(F13_HEATMAP_TONE_CLASS['band-red']);

  // buildMonthlyHeatmapLegend dynamically uses indicator floors (70, 60, 50)
  const legend = buildMonthlyHeatmapLegend(F11_INDICATOR);
  assert.equal(legend.length, 5);
  assert.deepEqual(legend.map((entry) => entry.description), [
    'Tỷ lệ từ 70% trở lên',
    'Từ 60% đến dưới 70%',
    'Từ 50% đến dưới 60%',
    'Dưới 50%',
    'Chưa có dữ liệu',
  ]);

  // Pair table block has no unused icons, uses buildMonthlyHeatmapLegend, and renders BlockCaptureButton
  const pairSource = fs.readFileSync(new URL('./components/F11PairTableBlock.jsx', import.meta.url), 'utf8');
  assert.match(pairSource, /buildMonthlyHeatmapLegend\(indicator\)/);
  assert.match(pairSource, /BlockCaptureButton/);
  assert.doesNotMatch(pairSource, /import\s*\{[^}]*\bCalendar\b/);
  assert.doesNotMatch(pairSource, /import\s*\{[^}]*\bFilter\b/);
  assert.doesNotMatch(pairSource, /import\s*\{[^}]*\bInfo\b/);
  assert.doesNotMatch(pairSource, /classifyPairCellTone/);
});

test('Item A: Unevaluated parcels are treated as Không đạt without separate blank notes in KPI cards', () => {
  // Case with blank evaluations: all counted in total_failed, no separate note
  const cards = buildUnifiedCommandCards({
    total_bg: 2621,
    total_passed: 2348,
    total_failed: 273,
    total_blank: 33,
    passed_rate: 89.58,
    national_rank: {
      available: true,
      rank: 4,
      total: 34,
      period_start: '2026-10-07',
      period_end: '2026-10-07',
    },
  }, {
    fromDate: '2026-10-07',
    toDate: '2026-10-07',
    bcvhLabel: 'Toàn mạng',
  });

  assert.equal(cards[0].value, '89.58%');
  assert.equal(cards[1].value, '4/34');
  assert.equal(cards[2].value, '2.621');
  assert.equal(cards[3].value, '273');
  assert.equal(cards[3].support, 'Số bưu gửi không đạt cần xử lý');
  assert.doesNotMatch(cards[3].support, /chưa có đánh giá/);
});

test('F1.1 ranking mapping produces F1.1-aware labels and suppresses route and late-cash text', () => {
  const samplePayload = {
    data: [
      {
        ma_bcvh: '533140',
        ten_bcvh: 'BCVH Thuận Hóa',
        rank: 1,
        total_bg: 1801,
        dat_kpi_2026: 1713,
        total_failed: 88,
        kpi_2026: 95.11,
        kpi_2026_dod: 1.5,
        kpi_2026_swc: -0.5,
        delayed_cash_handover_count: null,
        f13_303_rate: null,
        route_distribution: null,
        comparisons: {
          d1: { volume: 1700, kpi_2026: 93.5, kpi_2026_dod: 1.5, comparison_rank: 1, rank_movement: { direction: 'unchanged', delta: 0, signal: { label: 'Không đổi' } } },
          d7: { volume: 1750, kpi_2026: 94.0, kpi_2026_swc: -0.5, comparison_rank: 1, rank_movement: { direction: 'unchanged', delta: 0, signal: { label: 'Không đổi' } } },
        },
      },
    ],
  };

  const f11Mapped = mapBcvhRankingResponse(samplePayload, {
    fromDate: '2026-10-07',
    toDate: '2026-10-07',
    indicator: F11_INDICATOR,
  });

  const f11Row = f11Mapped.rows[0];
  assert.ok(f11Row.analysis);
  assert.match(f11Row.analysis, /Tỷ lệ F1\.1 ngày 95,1%/);
  assert.doesNotMatch(f11Row.analysis, /Chậm nộp tiền/);
  assert.doesNotMatch(f11Row.analysis, /Tuyến tham gia/);
  assert.equal(f11Row.action, null);

  // 95.11% is green in F1.1 (>= 70)
  assert.equal(f11Row.current_day.signal.id, 'green');
});
