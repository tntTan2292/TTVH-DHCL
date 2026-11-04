import test from 'node:test';
import assert from 'node:assert/strict';
import { attentionTitle, weekdayName } from './homeAttention.js';

const attention = { rate: 24.1, baseline: 33, shortfall: 8.9 };

test('weekdayName names the day of an ISO date', () => {
  assert.equal(weekdayName('2026-11-02'), 'thứ Hai');
  assert.equal(weekdayName('2026-11-08'), 'Chủ nhật');
  assert.equal(weekdayName('bad'), '');
});

test('attentionTitle compares the day with the same weekday, the week with weeks, the month with months', () => {
  assert.equal(
    attentionTitle(attention, 'day', '2026-11-02'),
    'Thứ Hai: 24,1%. Thường các thứ Hai: 33,0%. Thấp hơn 8,9 điểm, vượt mức dao động bình thường của đơn vị.'
  );
  assert.match(attentionTitle(attention, 'week', '2026-11-02'), /^Tuần này: 24,1%\. Thường các tuần trước: 33,0%/);
  assert.match(attentionTitle(attention, 'month', '2026-11-02'), /^Tháng này: 24,1%\. Thường các tháng trước: 33,0%/);
  assert.equal(attentionTitle(null, 'day', '2026-11-02'), '');
});
