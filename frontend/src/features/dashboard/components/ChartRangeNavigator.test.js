import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePresetWindow,
  defaultGetPointLabel,
  isFullWindow,
  panWindow,
  resolveNavigatorPresets,
} from './chartRangeNav.js';

test('defaultGetPointLabel handles week and day labels correctly', () => {
  // Weekly rows
  assert.equal(defaultGetPointLabel({ label: 'Tuần 40 (01/10–07/10/2026)' }, 39, 'tuần'), 'Tuần 40 (01/10–07/10/2026)');

  // Daily rows with dayLabel and current_date
  assert.equal(
    defaultGetPointLabel({ dayLabel: 'Thứ 2', current_date: '2026-10-05' }, 4, 'ngày'),
    'Thứ 2 (2026-10-05)',
  );

  // Daily rows with only current_date
  assert.equal(
    defaultGetPointLabel({ current_date: '2026-10-05' }, 4, 'ngày'),
    '2026-10-05',
  );

  // Daily rows with only date
  assert.equal(
    defaultGetPointLabel({ date: '2026-09-30' }, 29, 'ngày'),
    '2026-09-30',
  );

  // By-BCVH mode row with date_label
  assert.equal(
    defaultGetPointLabel({ date_label: '09-30' }, 29, 'ngày'),
    '09-30',
  );

  // Fallback when empty or null
  assert.equal(defaultGetPointLabel(null, 0, 'ngày'), 'Ngày 1');
  assert.equal(defaultGetPointLabel({}, 11, 'tuần'), 'Tuần 12');
  assert.equal(defaultGetPointLabel(undefined, 5, ''), 'Mốc 6');
});

test('preset window calculations pin correctly to the latest point', () => {
  const totalDays = 30;

  // Preset 14 days on 30-day view
  const preset14 = calculatePresetWindow(14, totalDays);
  assert.equal(preset14.start, 16);
  assert.equal(preset14.end, 29);
  assert.equal(preset14.end - preset14.start + 1, 14);
  assert.ok(!isFullWindow(preset14, totalDays));

  // Preset 7 days on 30-day view
  const preset7 = calculatePresetWindow(7, totalDays);
  assert.equal(preset7.start, 23);
  assert.equal(preset7.end, 29);
  assert.equal(preset7.end - preset7.start + 1, 7);
  assert.ok(!isFullWindow(preset7, totalDays));

  // Weekly preset 12 weeks on 40-week view
  const totalWeeks = 40;
  const preset12 = calculatePresetWindow(12, totalWeeks);
  assert.equal(preset12.start, 28);
  assert.equal(preset12.end, 39);
  assert.equal(preset12.end - preset12.start + 1, 12);

  // Preset larger than total resets to full
  const presetAll = calculatePresetWindow(50, 40);
  assert.equal(presetAll.start, 0);
  assert.equal(presetAll.end, 39);

  // resolveNavigatorPresets
  assert.deepEqual(resolveNavigatorPresets('ngày'), [
    { count: 14, label: '14 ngày gần nhất' },
    { count: 7, label: '7 ngày gần nhất' },
  ]);
  assert.deepEqual(resolveNavigatorPresets('tuần'), [
    { count: 12, label: '12 tuần gần nhất' },
    { count: 6, label: '6 tuần gần nhất' },
  ]);
});

test('panStep moves window without exceeding bounds', () => {
  const total = 30;
  const initialWindow = { start: 16, end: 29 }; // 14 days ending at latest

  // Pan back by 7 days
  const pannedBack = panWindow(initialWindow, total, -7);
  assert.equal(pannedBack.start, 9);
  assert.equal(pannedBack.end, 22);

  // Pan back further beyond start=0 clamps to 0
  const clampedStart = panWindow(pannedBack, total, -20);
  assert.equal(clampedStart.start, 0);
  assert.equal(clampedStart.end, 13);

  // Pan forward beyond end=29 clamps to latest (29)
  const clampedEnd = panWindow(clampedStart, total, 40);
  assert.equal(clampedEnd.start, 16);
  assert.equal(clampedEnd.end, 29);
});
