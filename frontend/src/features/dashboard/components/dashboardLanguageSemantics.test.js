import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DASHBOARD_LABELS, DASHBOARD_SEMANTIC_COLORS, DASHBOARD_STATUS } from './dashboardSemantics.js';
import { mapDashboardKpiToCards } from './dashboardKpiCards.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('dashboard semantic foundation exposes approved labels and color roles', () => {
  assert.equal(DASHBOARD_LABELS.volume, 'Sản lượng');
  assert.equal(DASHBOARD_LABELS.passRate, 'Tỷ lệ đạt');
  assert.equal(DASHBOARD_LABELS.failedRate, 'Tỷ lệ không đạt');
  assert.equal(DASHBOARD_STATUS.highRisk, 'Rủi ro cao');
  assert.equal(DASHBOARD_STATUS.noData, 'Không có dữ liệu');
  assert.equal(DASHBOARD_SEMANTIC_COLORS.target, '#7c3aed');
  assert.notEqual(DASHBOARD_SEMANTIC_COLORS.target, DASHBOARD_SEMANTIC_COLORS.failed);
});

test('dashboard KPI cards use business wording and no runtime contract wording', () => {
  const cards = mapDashboardKpiToCards({
    total_bg: 100,
    total_failed: 20,
    total_unknown: 5,
    passed_rate: 80,
    failed_rate: 20,
  });

  assert.deepEqual(cards.map((card) => card.label), ['Tỷ lệ đạt', 'Xếp hạng toàn quốc', 'Sản lượng', 'Bưu gửi cần xử lý']);
  assert.equal(cards[3].tone, 'danger');
  assert.match(cards[2].support, /bưu gửi chuyển hoàn/);
  assert.doesNotMatch(cards[3].support, /Tỷ lệ không đạt/);
  assert.doesNotMatch(JSON.stringify(cards), /contract|runtime/i);
});

test('dashboard page removes shell and placeholder wording from visible surfaces', () => {
  const dashboardSource = read('../DashboardPage.jsx');
  const commandSource = read('./UnifiedCommandSummary.jsx');

  assert.match(dashboardSource, /Dashboard điều hành chất lượng F1\.3/);
  assert.match(commandSource, /Tổng quan điều hành/);
  assert.match(dashboardSource, /BCVH nổi bật và cần cải thiện/);
  assert.match(dashboardSource, /Chi tiết điều hành BCVH/);
  assert.doesNotMatch(dashboardSource, /Dashboard Shell|Executive Header|Navigation Integration Table|Ranking Surface|Widget Placeholder|Executive first view|Recommendation surface|Message \/ integration surface/);
});

test('chart and table surfaces use semantic target accent and Vietnamese vocabulary', () => {
  const comboSource = read('./QualityVolumeComboTrendlineAdapter.jsx');
  const comparisonSource = read('./SamePeriodComparisonTrendlineAdapter.jsx');
  const timelineSource = read('../../../components/f13/QualityTimelinePanel.jsx');
  const tableSource = read('../../../components/f13/BcvhOperationTable.jsx');

  assert.match(comboSource, /DASHBOARD_SEMANTIC_COLORS\.target/);
  assert.match(comparisonSource, /Tỷ lệ đạt - Kỳ so sánh/);
  assert.match(timelineSource, /Diễn biến và quy luật chất lượng/);
  assert.match(timelineSource, /Mục tiêu \/ tham chiếu/);
  assert.match(tableSource, /Hiển thị tất cả/);
  assert.match(tableSource, /DASHBOARD_STATUS\.highRisk/);
  assert.doesNotMatch(timelineSource, /Quality Timeline|Quality Pulse|Daily Timeline|Threshold|Critical|No Data/);
  assert.doesNotMatch(tableSource, /SHOW ALL|Operation Table|>Status<|XANH|VÀNG|HỒNG|ĐỎ/);
});
