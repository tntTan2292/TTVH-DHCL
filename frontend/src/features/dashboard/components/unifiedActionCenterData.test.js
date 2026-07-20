import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  formatNationalRank,
  mapUnifiedActionCenter,
  normalizeRecommendationItem,
  UNAVAILABLE_TEXT,
} from './unifiedActionCenterData.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('maps recommendation fields without inventing unavailable values', () => {
  const item = normalizeRecommendationItem({
    id: 'rec-1',
    priority: 'P1',
    level: 'Cao',
    category: 'BCVH thấp',
    ten_bcvh: 'BCVH A Lưới',
    condition: 'Tỷ lệ đạt thấp',
    impact: '24 bưu gửi không đạt',
    action: 'Kiểm tra tuyến phát',
  });

  assert.equal(item.id, 'rule:rec-1');
  assert.equal(item.priority, 'P1');
  assert.equal(item.issue, 'BCVH thấp - Tỷ lệ đạt thấp');
  assert.equal(item.unit.ten_bcvh, 'BCVH A Lưới');
  assert.equal(item.confirmed_cause, UNAVAILABLE_TEXT);
  assert.equal(item.owner, UNAVAILABLE_TEXT);
  assert.equal(item.status, UNAVAILABLE_TEXT);
  assert.equal(item.confidence, UNAVAILABLE_TEXT);
  assert.equal(item.follow_up.href, '/f13/ranking/bcvh');
});

test('deduplicates each operational issue and keeps backend priority ordering', () => {
  const model = mapUnifiedActionCenter({
    recommendations: [
      { id: 'same', priority: 'P3', category: 'A', condition: 'Một', action: 'Làm A' },
      { id: 'same', priority: 'P1', category: 'A', condition: 'Trùng', action: 'Làm B' },
      { id: 'other', priority: 'P1', category: 'B', condition: 'Hai', action: 'Làm C' },
    ],
    kpiData: { total_bg: 100, passed_rate: 70, failed_rate: 20, national_rank: '19/34' },
    fromDate: '2026-07-18',
    toDate: '2026-07-19',
    maBcvh: 'all',
    bcvhLabel: 'Toàn mạng',
  });

  assert.equal(model.items.length, 2);
  assert.deepEqual(model.items.map((item) => item.priority), ['P1', 'P3']);
  assert.equal(model.message_templates, undefined);
  assert.equal(model.kpi_context.total_volume, 100);
  assert.equal(model.meta.source_period_label, '2026-07-18 đến 2026-07-19');
});

test('marks partial-data states without hiding available sources', () => {
  const model = mapUnifiedActionCenter({
    recommendations: [{ id: 'rec-1', priority: 'P2', condition: 'Có khuyến nghị' }],
    kpiData: null,
    errors: { kpi_context: 'kpi failed' },
  });

  assert.equal(model.items.length, 1);
  assert.equal(model.states.recommendations, 'success');
  assert.equal(model.states.kpi_context, 'error');
  assert.equal(model.message_templates, undefined);
});

test('formats malformed or object KPI context without rendering raw objects', () => {
  const nationalRankObject = {
    available: true,
    status: 'success',
    rank: 24,
    total: 34,
    period: '2026-07-18..2026-07-19',
    requested_period: '2026-07-18..2026-07-19',
    from_date: '2026-07-18',
    to_date: '2026-07-19',
    source: 'TCT',
    source_role: 'nationwide-ranking',
    province_code: '46',
    province_name: 'Huế',
    metric: 'tl_ptc_dung_qd_ct',
    metric_label: 'Tỷ lệ đạt',
    metric_value: 52.56,
    cumulative_volume: 100,
    cumulative_pass: 52,
    direction: 'desc',
    tie_behavior: 'none',
    missing_dates: [],
    incomplete_dates: [],
  };

  assert.equal(formatNationalRank(nationalRankObject), '24/34');
  assert.equal(formatNationalRank({ available: false, missing_dates: ['2026-07-18'] }), UNAVAILABLE_TEXT);

  const model = mapUnifiedActionCenter({
    kpiData: {
      total_bg: { malformed: true },
      passed_rate: 70,
      failed_rate: 30,
      national_rank: nationalRankObject,
    },
  });

  assert.equal(model.kpi_context.total_volume, UNAVAILABLE_TEXT);
  assert.equal(model.kpi_context.pass_rate, 70);
  assert.equal(model.kpi_context.national_rank, '24/34');
  assert.equal(typeof model.kpi_context.national_rank, 'string');
});

test('Dashboard renders Action Center without TopList or message draft surfaces', () => {
  const componentSource = read('./UnifiedActionCenter.jsx');
  const dataSource = read('./unifiedActionCenterData.js');
  const dashboardSource = read('../DashboardPage.jsx');

  assert.match(componentSource, /api\.get\('\/f13\/recommendations'/);
  assert.match(componentSource, /params:\s*\{\s*fromDate,\s*toDate\s*\}/);
  assert.doesNotMatch(componentSource, /api\.get\('\/f13\/dashboard\/message'/);
  assert.doesNotMatch(componentSource, /Tin điều hành|Tin báo cáo|MessageDraft|message_templates/);
  assert.doesNotMatch(dataSource, /message_templates/);
  assert.match(componentSource, /Chưa có dữ liệu/);
  assert.match(componentSource, /Bản tin nhanh/);
  assert.match(componentSource, /ActionCenterBoundary/);
  assert.match(componentSource, /Không thể hiển thị Trung tâm hành động/);
  assert.match(componentSource, /Không tự suy diễn owner, nguyên nhân, trạng thái, deadline hoặc confidence/);
  assert.match(dashboardSource, /<UnifiedActionCenter/);
  assert.doesNotMatch(dashboardSource, /<RuleRecommendationAdapter/);
  assert.doesNotMatch(dashboardSource, /<ExecutiveDailyBriefAdapter/);
  assert.doesNotMatch(dashboardSource, /<MessageGenerationAdapter/);
  assert.doesNotMatch(dashboardSource, /TopListAdapter/);
  assert.doesNotMatch(dashboardSource, /BCVH nổi bật và cần cải thiện|Top 2 BCVH/);
});
