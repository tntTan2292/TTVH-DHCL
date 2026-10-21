import test from 'node:test';
import assert from 'node:assert/strict';
import { navState, periodChipTitle, periodShortTitle, periodTitle, previousBasisLabel, sparkCaption } from './homePeriod.js';

test('previousBasisLabel names what the change is read against', () => {
  assert.equal(previousBasisLabel('day'), 'hôm trước');
  assert.equal(previousBasisLabel('week'), 'tuần trước');
  assert.equal(previousBasisLabel('month'), 'tháng trước');
  assert.equal(previousBasisLabel(undefined), 'hôm trước');
});

test('periodTitle: day, running week, full week, running and full month', () => {
  assert.equal(periodTitle({ period: 'day', period_to: '2026-10-20', period_from: '2026-10-20' }), '20/10/2026');
  assert.equal(periodTitle({ period: 'week', period_week: 42, period_from: '2026-10-15', period_to: '2026-10-20', period_partial: true }), 'Tuần 42 · đến 20/10');
  assert.equal(periodTitle({ period: 'week', period_week: 41, period_from: '2026-10-08', period_to: '2026-10-14', period_partial: false }), 'Tuần 41 · 08/10 → 14/10');
  assert.equal(periodTitle({ period: 'month', period_from: '2026-10-01', period_to: '2026-10-20', period_partial: true }), 'Tháng 10/2026 · đến 20/10');
  assert.equal(periodTitle({ period: 'month', period_from: '2026-09-01', period_to: '2026-09-30', period_partial: false }), 'Tháng 9/2026');
  assert.equal(periodTitle(null), 'Chưa có dữ liệu');
});

test('periodShortTitle is the card chip form', () => {
  assert.equal(periodShortTitle({ period: 'week', period_week: 42, period_from: '2026-10-15', period_to: '2026-10-20', period_partial: true }), 'Tuần 42 · đến 20/10');
  assert.equal(periodShortTitle({ period: 'month', period_from: '2026-10-01', period_to: '2026-10-20', period_partial: true }), 'T10 · đến 20/10');
  assert.equal(periodShortTitle({ period: 'day', period_from: '2026-10-20', period_to: '2026-10-20' }), '20/10/2026');
});

test('sparkCaption follows the series kind', () => {
  assert.equal(sparkCaption('week'), '12 tuần gần nhất');
  assert.equal(sparkCaption('month'), 'các tháng từ T1');
  assert.equal(sparkCaption('day'), '30 ngày gần nhất');
});

test('navState: back needs earlier data and a free request, forward only when not at the latest', () => {
  const info = { has_previous: true, max_back: 120 };
  assert.deepEqual(navState({ periodInfo: info, offset: 0, loading: false }), { canGoBack: true, canGoForward: false });
  assert.deepEqual(navState({ periodInfo: info, offset: -3, loading: false }), { canGoBack: true, canGoForward: true });
  assert.deepEqual(navState({ periodInfo: info, offset: -3, loading: true }), { canGoBack: false, canGoForward: false });
  assert.equal(navState({ periodInfo: info, offset: -120, loading: false }).canGoBack, false);
  assert.equal(navState({ periodInfo: { has_previous: false }, offset: 0, loading: false }).canGoBack, false);
  assert.equal(navState({ periodInfo: null, offset: 0, loading: false }).canGoBack, false);
});

test('periodChipTitle is the shortest name of the period', () => {
  assert.equal(periodChipTitle({ period: 'day', period_to: '2026-10-20' }), '20/10');
  assert.equal(periodChipTitle({ period: 'week', period_week: 42, period_to: '2026-10-20' }), 'Tuần 42');
  assert.equal(periodChipTitle({ period: 'month', period_from: '2026-10-01', period_to: '2026-10-20' }), 'T10');
  assert.equal(periodChipTitle(null), '—');
});
