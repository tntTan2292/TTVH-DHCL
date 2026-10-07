import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthOptions, checkMonthsDaysMismatch, formatMonthLabel, previousMonthId } from './bcvhWeeklyComparisonData.js';
import { createMonthlyComparisonFetcher, createMonthsListFetcher } from './bcvhWeeklyComparisonFetcher.js';

const SEP = { month_id: '2026-09', year: 2026, month: 9, month_start: '2026-09-01', display_start_date: '2026-09-01', display_end_date: '2026-09-30', days_with_data: 30 };
const OCT = { month_id: '2026-10', year: 2026, month: 10, month_start: '2026-10-01', display_start_date: '2026-10-01', display_end_date: '2026-10-05', days_with_data: 5 };

test('buildMonthOptions: newest first, label carries month/year and real data range', () => {
  const options = buildMonthOptions([SEP, OCT]);
  assert.deepEqual(options.map((o) => o.value), ['2026-10', '2026-09']);
  assert.equal(options[0].label, 'Tháng 10/2026: 01/10–05/10/2026');
  assert.equal(formatMonthLabel(SEP), 'Tháng 9/2026');
  assert.deepEqual(buildMonthOptions([]), []);
});

test('checkMonthsDaysMismatch: warns with a cùng kỳ suggestion; silent once cùng kỳ is on', () => {
  const result = checkMonthsDaysMismatch(OCT, SEP, false);
  assert.equal(result.isMismatch, true);
  assert.equal(result.message, 'Lưu ý: Hai tháng có số ngày dữ liệu khác nhau');
  assert.match(result.suggestion, /So sánh cùng kỳ/);
  assert.equal(checkMonthsDaysMismatch(OCT, SEP, true).isMismatch, false);
  assert.equal(checkMonthsDaysMismatch(SEP, { ...SEP, month_id: '2026-08' }, false).isMismatch, false);
});

test('monthly fetchers: one request each, same_period only sent when ticked', async () => {
  const calls = [];
  const client = {
    get: async (url, config) => {
      calls.push({ url, params: config?.params });
      return { data: { success: true, data: url.endsWith('/months') ? { months: [SEP] } : { rows: [] } } };
    },
  };
  let listState;
  await createMonthsListFetcher(client, (u) => { listState = typeof u === 'function' ? u({}) : u; })();
  assert.equal(calls[0].url, '/f13/ranking/bcvh/months');
  assert.equal(listState.months.length, 1);

  let cmpState;
  const fetchCmp = createMonthlyComparisonFetcher(client, (u) => { cmpState = typeof u === 'function' ? u({}) : u; });
  await fetchCmp('2026-10', '2026-09', false);
  await fetchCmp('2026-10', '2026-09', true);
  assert.equal(calls[1].url, '/f13/ranking/bcvh/monthly-comparison');
  assert.deepEqual(calls[1].params, { month: '2026-10', compare_month: '2026-09' });
  assert.deepEqual(calls[2].params, { month: '2026-10', compare_month: '2026-09', same_period: 1 });
  assert.equal(cmpState.status, 'success');
});

test('previousMonthId: wraps January to December of the previous year, rejects malformed ids', () => {
  assert.equal(previousMonthId('2026-10'), '2026-09');
  assert.equal(previousMonthId('2026-01'), '2025-12');
  assert.equal(previousMonthId('2026-13'), '');
  assert.equal(previousMonthId(''), '');
});
