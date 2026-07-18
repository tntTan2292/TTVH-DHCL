import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildExecutiveInsight, buildUnifiedCommandCards } from './dashboardKpiCards.js';

const source = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('unified command summary builds four leadership cards without standalone failed-rate KPI', () => {
  const cards = buildUnifiedCommandCards({
    total_bg: 3677,
    total_failed: 1037,
    total_unknown: 3,
    passed_rate: 67.2,
    failed_rate: 28.2,
    national_rank: {
      available: true,
      rank: 14,
      total: 34,
      period: '2026-06-28',
      metric_label: 'Tỷ lệ PTC/nộp tiền đúng QĐ theo chỉ tiêu 2026',
    },
  }, {
    fromDate: '2026-07-15',
    toDate: '2026-07-15',
    bcvhLabel: 'Tất cả BCVH',
  });

  assert.deepEqual(cards.map((card) => card.label), ['Tỷ lệ đạt', 'Xếp hạng toàn quốc', 'Sản lượng', 'Bưu gửi cần xử lý']);
  assert.equal(cards.length, 4);
  assert.equal(cards[1].value, '14/34');
  assert.match(cards[1].support, /Kỳ đang chọn: 2026-07-15/);
  assert.match(cards[1].support, /dữ liệu toàn quốc gần nhất: 2026-06-28/);
  assert.equal(cards[3].value, '1.037');
  assert.deepEqual(cards.map((card) => card.question), ['Chất lượng', 'Vị thế toàn quốc', 'Quy mô', 'Cần xử lý']);
  assert.match(cards[3].support, /Tỷ lệ không đạt: 28\.20%/);
  assert.equal(cards.filter((card) => card.label === 'Tỷ lệ không đạt').length, 0);
  assert.equal(cards[3].tone, 'danger');
});

test('failed action card does not fabricate zero when API omits total_failed', () => {
  const cards = buildUnifiedCommandCards({
    total_bg: 3677,
    passed_rate: 67.2,
    failed_rate: 28.2,
  });
  const insight = buildExecutiveInsight({
    total_bg: 3677,
    passed_rate: 67.2,
    failed_rate: 28.2,
  }, {
    fromDate: '2026-07-15',
    toDate: '2026-07-15',
    bcvhLabel: 'Toàn mạng',
  });

  assert.equal(cards[3].value, '--');
  assert.match(cards[3].support, /Tỷ lệ không đạt: 28\.20%/);
  assert.match(insight, /chưa xác định số bưu gửi cần xử lý/);
  assert.doesNotMatch(insight, /0 bưu gửi cần xử lý/);
});

test('unified command summary exposes missing nationwide rank without fabricating rank or total', () => {
  const cards = buildUnifiedCommandCards({
    total_bg: 100,
    total_failed: 9,
    passed_rate: 91,
    failed_rate: 9,
    national_rank: { available: false, message: 'Chưa có dữ liệu xếp hạng toàn quốc' },
  });

  assert.equal(cards[1].label, 'Xếp hạng toàn quốc');
  assert.equal(cards[1].value, '--');
  assert.match(cards[1].support, /Chưa có dữ liệu xếp hạng toàn quốc/);
  assert.doesNotMatch(JSON.stringify(cards), /0\/|#0|rank 0/i);
});

test('executive insight is grounded, compact and keeps unknown data distinct', () => {
  const insight = buildExecutiveInsight({
    total_bg: 100,
    total_failed: 9,
    total_unknown: 2,
    passed_rate: 89,
    national_rank: { available: true, rank: 14, total: 34, period: '2026-06-28' },
  }, {
    fromDate: '2026-07-15',
    toDate: '2026-07-15',
    bcvhLabel: 'Toàn mạng',
  });

  assert.match(insight, /Toàn phạm vi đang chọn đạt tỷ lệ 89\.00%/);
  assert.match(insight, /9 bưu gửi cần xử lý/);
  assert.match(insight, /Xếp hạng toàn quốc 14\/34/);
  assert.match(insight, /2 bưu gửi thiếu dữ liệu phân loại/);
  assert.doesNotMatch(insight, /nguyên nhân|chủ sở hữu|thời hạn|runtime/i);
});

test('aggregate filter wording uses selected scope language instead of treating all BCVH as a unit', () => {
  const insight = buildExecutiveInsight({
    total_bg: 3677,
    total_failed: 1037,
    passed_rate: 67.2,
    national_rank: { available: true, rank: 14, total: 34, period: '2026-06-28' },
  }, {
    fromDate: '2026-07-15',
    toDate: '2026-07-15',
    bcvhLabel: 'Tất cả BCVH',
  });

  assert.match(insight, /Toàn phạm vi đang chọn đạt tỷ lệ 67\.20%/);
  assert.match(insight, /có 1\.037 bưu gửi cần xử lý/);
  assert.doesNotMatch(insight, /Tất cả BCVH đang chọn đạt/);
});

test('dashboard page removes duplicate KPI grid and executive summary presentation', () => {
  const dashboardSource = source('../DashboardPage.jsx');
  const commandSource = source('./UnifiedCommandSummary.jsx');
  const dataSource = source('./dashboardKpiCards.js');

  assert.match(dashboardSource, /UnifiedCommandSummary/);
  assert.doesNotMatch(dashboardSource, /ExecutiveSummaryAdapter/);
  assert.doesNotMatch(dashboardSource, /<KPICard/);
  assert.match(dataSource, /Bưu gửi cần xử lý/);
  assert.match(commandSource, /Dữ liệu thiếu\/chưa xác định/);
  assert.match(commandSource, /nationalRank\.period/);
});
