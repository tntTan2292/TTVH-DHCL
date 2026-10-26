import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildScopedBcvhUnitsValue } from '../indicator/BcvhUnitsContext.js';
import { processOverviewData } from './bcvhOverviewData.js';
import { buildWeeklyTrendChartData } from './bcvhWeeklyComparisonData.js';

// RBAC-01: the "Phân tích BCVH" page shows the week/month comparison to a BCVH-scope user, for their BCVH only.

test('scoped units: only the user BCVH, six-BCVH wording, no total series, no all-units grid', () => {
  const value = buildScopedBcvhUnitsValue([{ ma_bcvh: '535470', ten_bcvh: 'BCVH Hương Trà' }]);
  assert.equal(value.scoped, true);
  assert.equal(value.dynamic, false, 'not the F1.2 accepting-unit wording');
  assert.deepEqual(value.codes, ['535470']);
  assert.equal(value.names['535470'], 'BCVH Hương Trà');
  assert.equal(value.allowSmallMultiples, false);
});

test('monthly overview rows are built for the scope only (no empty row per other BCVH)', () => {
  const data = {
    monthly: [{ month: '2026-10', ma_bcvh: '535470', ten_bcvh: 'BCVH Hương Trà', volume: 10, passed: 8, failed: 2, rate: 80, days_with_data: 5, days_in_period: 20 }],
    daily: [], routes: [],
    mtd: [{ ma_bcvh: '535470', ten_bcvh: 'BCVH Hương Trà', volume: 10, passed: 8, failed: 2, rate: 80 }],
  };
  const all = processOverviewData(data, {});
  const scoped = processOverviewData(data, {}, { onlyCodes: ['535470'] });
  assert.ok(Object.keys(all.nameMap).length >= 6);
  assert.deepEqual(Object.keys(scoped.nameMap), ['535470']);
  assert.deepEqual(scoped.monthlyTableRows.map((row) => row.ma_bcvh), ['535470']);
});

test('weekly trend without the city total and the province rank still builds chart data', () => {
  const weeks = [{
    week_id: '2026-W42', iso_year: 2026, iso_week: 42, week_start: '2026-10-15', week_end: '2026-10-21',
    display_start_date: '2026-10-15', display_end_date: '2026-10-21',
    units: { 535470: { volume: 100, passed: 80, rate: 80 } },
  }];
  const chart = buildWeeklyTrendChartData(weeks);
  assert.equal(chart.length, 1);
  assert.equal(chart[0].units['535470'].volume, 100);
  assert.equal(chart[0].total.rate, null, 'no city total in the data');
  assert.equal(chart[0].national_rank, null);
});

test('page and blocks: the comparison and monthly blocks render in BCVH mode and the unit filters start on the own BCVH', () => {
  const page = fs.readFileSync(new URL('./BcvhRankingPage.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /!isBcvhMode \? <BcvhWeeklyComparisonBlock/);
  assert.match(page, /<BcvhWeeklyComparisonBlock \/>/);
  assert.match(page, /BcvhUnitsProvider units=\{isBcvhMode \? scopedUnits : metaState\.units\} scoped=\{isBcvhMode\}/);
  const weekly = fs.readFileSync(new URL('./BcvhWeeklyTrendBlock.jsx', import.meta.url), 'utf8');
  assert.match(weekly, /useState\(units\.scoped \? units\.codes\[0\] : WEEKLY_TREND_TOTAL_KEY\)/);
  assert.match(weekly, /units\.scoped \? null : <option value=\{WEEKLY_TREND_TOTAL_KEY\}/);
  const monthly = fs.readFileSync(new URL('./BcvhRankingOverviewBlocks.jsx', import.meta.url), 'utf8');
  assert.match(monthly, /useState\(units\.scoped \? units\.codes\[0\] : MONTHLY_TREND_TOTAL_KEY\)/);
});
