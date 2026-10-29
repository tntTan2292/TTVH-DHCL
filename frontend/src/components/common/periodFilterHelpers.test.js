import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRecentWeeks, generateRecentMonths } from './periodFilterHelpers.js';

test('generateRecentWeeks returns valid T5-T4 weeks starting with week of anchorDate', () => {
  const weeks = generateRecentWeeks('2026-10-28', 4);
  assert.equal(weeks.length, 4);

  // 2026-10-28 is Wednesday, so current week is Thu 22/10 - Wed 28/10
  assert.equal(weeks[0].start, '2026-10-22');
  assert.equal(weeks[0].end, '2026-10-28');
  assert.equal(weeks[0].label, 'Tuần (22/10 – 28/10/2026)');

  // Previous week: Thu 15/10 - Wed 21/10
  assert.equal(weeks[1].start, '2026-10-15');
  assert.equal(weeks[1].end, '2026-10-21');
  assert.equal(weeks[1].label, 'Tuần (15/10 – 21/10/2026)');
});

test('generateRecentMonths returns valid recent calendar months', () => {
  const months = generateRecentMonths('2026-10-28', 3);
  assert.equal(months.length, 3);
  assert.equal(months[0].monthStr, '2026-10');
  assert.equal(months[0].label, 'Tháng 10/2026');
  assert.equal(months[1].monthStr, '2026-09');
  assert.equal(months[1].label, 'Tháng 09/2026');
  assert.equal(months[2].monthStr, '2026-08');
  assert.equal(months[2].label, 'Tháng 08/2026');
});

