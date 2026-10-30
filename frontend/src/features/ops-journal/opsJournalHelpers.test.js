import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_SELECTED_SPOTS,
  MAX_SELECTED_SPOTS,
  MAX_ACTIONS_PER_SPOT,
  DEFAULT_DUE_TEXT,
  INDICATOR_CHIP_CONFIG,
  getIndicatorChipStyle,
  getSpotReasons,
  formatFileSize,
  timeAgoText,
  normalizeIndicator,
  validateSpotCount,
  validateSpotsSelection,
  canSaveSpots,
  getCounterBadgeStyle,
  formatDeltaRate,
  buildDefaultActions,
  validateSpotCompleteness,
  canAssignSpot,
  validateSpotsForAssign,
  groupTasksByDay,
  isRowLocked,
  validateReportInput,
  validateClosingInput,
  generatePl06FileName,
  buildPl06PrintModel,
} from './opsJournalHelpers.js';

test('spot count constants and boundaries follow the PO rule (at least 1, manager decides)', () => {
  assert.equal(MIN_SELECTED_SPOTS, 1);
  assert.equal(MAX_SELECTED_SPOTS, 50);
});

test('validateSpotCount blocks an empty choice and allows 1 or more', () => {
  // Low boundary violations
  const low0 = validateSpotCount(0);
  assert.equal(low0.valid, false);
  assert.equal(low0.code, 'OUT_OF_RANGE_LOW');
  assert.match(low0.message, /ít nhất 1/i);

  const one = validateSpotCount(1);
  assert.equal(one.valid, true);
  assert.equal(one.code, null);

  // Valid window: exactly 5 to 10
  const valid5 = validateSpotCount(5);
  assert.equal(valid5.valid, true);
  assert.equal(valid5.code, null);
  assert.equal(valid5.count, 5);

  const valid8 = validateSpotCount(8);
  assert.equal(valid8.valid, true);
  assert.equal(valid8.code, null);
  assert.equal(valid8.count, 8);

  const valid10 = validateSpotCount(10);
  assert.equal(valid10.valid, true);
  assert.equal(valid10.code, null);
  assert.equal(valid10.count, 10);

  // High boundary violations
  const high20 = validateSpotCount(20);
  assert.equal(high20.valid, true);

  const high51 = validateSpotCount(51);
  assert.equal(high51.valid, false);
  assert.equal(high51.code, 'OUT_OF_RANGE_HIGH');

  // Edge cases
  assert.equal(validateSpotCount(null).valid, false);
  assert.equal(validateSpotCount(undefined).valid, false);
  assert.equal(validateSpotCount('invalid').valid, false);
});

test('validateSpotsSelection combines candidates and manual spots', () => {
  assert.equal(validateSpotsSelection({ candidateIds: [], manual: [] }).valid, false);
  assert.equal(validateSpotsSelection({ candidateIds: ['c1'], manual: [] }).valid, true);
  assert.equal(validateSpotsSelection({ candidateIds: [], manual: [{ title: 'm1' }] }).valid, true);
  assert.equal(validateSpotsSelection({ candidateIds: ['c1', 'c2', 'c3', 'c4'], manual: [{ title: 'm1' }] }).valid, true);
});

test('canSaveSpots helper: one or more is saveable, zero is not', () => {
  assert.equal(canSaveSpots(0), false);
  for (let i = 1; i <= 20; i++) {
    assert.equal(canSaveSpots(i), true, `Count ${i} must be saveable`);
  }
  assert.equal(canSaveSpots(51), false);
});

test('getCounterBadgeStyle reflects valid/invalid state', () => {
  assert.equal(getCounterBadgeStyle(0).inRange, false);
  assert.equal(getCounterBadgeStyle(1).inRange, true);
  assert.equal(getCounterBadgeStyle(7).inRange, true);
  assert.equal(getCounterBadgeStyle(51).inRange, false);
});

test('normalizeIndicator normalizes standard variations', () => {
  assert.equal(normalizeIndicator('f1.1'), 'F1.1');
  assert.equal(normalizeIndicator('F11'), 'F1.1');
  assert.equal(normalizeIndicator('f1.2'), 'F1.2');
  assert.equal(normalizeIndicator('f1.3'), 'F1.3');
  assert.equal(normalizeIndicator('f4.1'), 'F4.1');
  assert.equal(normalizeIndicator('hang_ton'), 'HANGTON');
  assert.equal(normalizeIndicator('HT'), 'HANGTON');
});

test('indicator chips respect required color families and prohibit purple and dark tones', () => {
  // Requirement 4: Chip chỉ tiêu theo họ màu:
  // F1.1 xanh lá (green), F1.3 xanh dương (blue), F4.1 cam (orange/amber), F1.2 trung tính nhạt (neutral light); không tím/tối.
  const f11 = getIndicatorChipStyle('F1.1');
  assert.equal(f11.family, 'green');
  assert.match(f11.badgeClass, /emerald|green/);

  const f13 = getIndicatorChipStyle('F1.3');
  assert.equal(f13.family, 'blue');
  assert.match(f13.badgeClass, /blue|sky/);

  const f41 = getIndicatorChipStyle('F4.1');
  assert.equal(f41.family, 'orange');
  assert.match(f41.badgeClass, /amber|orange/);

  const f12 = getIndicatorChipStyle('F1.2');
  assert.equal(f12.family, 'neutral');
  assert.match(f12.badgeClass, /slate|gray/);

  const ht = getIndicatorChipStyle('HANGTON');
  assert.equal(ht.family, 'red');
  assert.match(ht.badgeClass, /rose|red/);

  // Prohibit purple / dark across all configurations
  const forbiddenPatterns = [/purple/i, /violet/i, /indigo/i, /black/i, /bg-gray-900/i, /bg-slate-900/i, /bg-zinc-900/i];

  Object.values(INDICATOR_CHIP_CONFIG).forEach((cfg) => {
    const classStr = `${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass} ${cfg.dotClass} ${cfg.badgeClass}`;
    forbiddenPatterns.forEach((regex) => {
      assert.equal(
        regex.test(classStr),
        false,
        `Chip style for ${cfg.indicator} must not contain forbidden color: ${regex} (got "${classStr}")`,
      );
    });
  });

  // Unknown fallback
  const fallback = getIndicatorChipStyle('UNKNOWN_XYZ');
  assert.equal(fallback.family, 'neutral');
  forbiddenPatterns.forEach((regex) => {
    assert.equal(regex.test(fallback.badgeClass), false);
  });
});

test('formatDeltaRate formats decrease and increase clearly', () => {
  assert.equal(formatDeltaRate(-11.2), 'giảm 11.2%');
  assert.equal(formatDeltaRate(5.4), 'tăng 5.4%');
  assert.equal(formatDeltaRate(0), 'không đổi (0.0%)');
  assert.equal(formatDeltaRate(null), null);
});

test('buildDefaultActions generates correct 6-ro rows from template per indicator', () => {
  assert.equal(MAX_ACTIONS_PER_SPOT, 12);
  assert.equal(DEFAULT_DUE_TEXT, 'Trong ngày');

  // 1. F1.x / F4.1 pattern: (1) rà soát nguyên nhân -> (2) giải pháp từ N+1 -> (3) theo dõi tỷ lệ
  const f13Actions = buildDefaultActions('F1.3', '535470', 'BCVH Hương Trà', 'BCVH Hương Trà (535470)');
  assert.equal(f13Actions.length, 3);
  assert.equal(f13Actions[0].seq, 1);
  assert.match(f13Actions[0].what, /rà soát và báo cáo nguyên nhân/i);
  assert.equal(f13Actions[0].due, 'Trong ngày');

  assert.equal(f13Actions[1].seq, 2);
  assert.match(f13Actions[1].what, /giải pháp khắc phục.*áp dụng từ N\+1/i);
  assert.equal(f13Actions[1].due, 'Trong ngày');

  assert.equal(f13Actions[2].seq, 3);
  assert.match(f13Actions[2].what, /theo dõi tỷ lệ hằng ngày/i);

  // 2. HANGTON pattern: (1) rà soát -> (2) xử lý dứt điểm về 0 -> (3) theo dõi
  const htActions = buildDefaultActions('HANGTON', '533140', 'BCVH Thuận Hóa', 'BCVH Thuận Hóa (533140)');
  assert.equal(htActions.length, 3);
  assert.equal(htActions[0].seq, 1);
  assert.match(htActions[0].what, /rà soát.*bưu gửi tồn đọng/i);
  assert.equal(htActions[0].due, 'Trong ngày');

  assert.equal(htActions[1].seq, 2);
  assert.match(htActions[1].what, /xử lý dứt điểm.*về 0/i);
  assert.equal(htActions[1].due, 'Trong ngày');

  assert.equal(htActions[2].seq, 3);
  assert.match(htActions[2].what, /theo dõi tiến độ giải tỏa tồn đọng/i);
});

test('validateSpotCompleteness and canAssignSpot enforce completeness rules', () => {
  const completeSpot = {
    id: 'spot_1',
    title: 'BCVH Hương Thủy',
    actions: [
      {
        seq: 1,
        whoText: 'Giám đốc BCVH',
        what: 'Rà soát nguyên nhân',
        where: 'BCVH Hương Thủy',
        due: 'Trong ngày',
        assigneeUserIds: ['usr_04'],
      },
      {
        seq: 2,
        whoText: 'Chuyên quản TTVH',
        what: 'Theo dõi xử lý',
        where: 'TTVH',
        due: 'Trong ngày',
        assigneeUserIds: ['usr_02'],
      },
    ],
  };

  assert.equal(validateSpotCompleteness(completeSpot).valid, true);
  assert.equal(canAssignSpot(completeSpot), true);

  // Incomplete: empty actions
  const emptySpot = { id: 'spot_empty', title: 'Điểm trống', actions: [] };
  const resEmpty = validateSpotCompleteness(emptySpot);
  assert.equal(resEmpty.valid, false);
  assert.equal(resEmpty.code, 'SPOT_INCOMPLETE');
  assert.match(resEmpty.message, /chưa có dòng 6-rõ/i);
  assert.equal(canAssignSpot(emptySpot), false);

  // Incomplete: row missing "Làm gì"
  const missingWhatSpot = {
    id: 'spot_missing_what',
    title: 'BCVH Thuận An',
    actions: [
      {
        seq: 1,
        whoText: 'Giám đốc BCVH',
        what: '   ', // whitespace only
        where: 'Thuận An',
        assigneeUserIds: ['usr_07'],
      },
    ],
  };
  const resWhat = validateSpotCompleteness(missingWhatSpot);
  assert.equal(resWhat.valid, false);
  assert.equal(resWhat.code, 'SPOT_INCOMPLETE');
  assert.equal(resWhat.rowSeq, 1);
  assert.match(resWhat.message, /dòng số 1.*Làm gì/i);

  // Incomplete: row missing assignee
  const missingAssigneeSpot = {
    id: 'spot_missing_assignee',
    title: 'BCVH Phú Lộc',
    actions: [
      {
        seq: 2,
        whoText: '',
        what: 'Kiểm tra bưu tá',
        where: 'Phú Lộc',
        assigneeUserIds: [],
      },
    ],
  };
  const resAssignee = validateSpotCompleteness(missingAssigneeSpot);
  assert.equal(resAssignee.valid, true, 'a row without a named person can be finalized (the Word is the deliverable)');
});

test('validateSpotsForAssign checks all target spots for batch assign', () => {
  const spotValid = {
    id: 's1',
    title: 'Điểm 1',
    actions: [{ seq: 1, whoText: 'Người A', what: 'Việc A', assigneeUserIds: ['u1'] }],
  };
  const spotInvalid = {
    id: 's2',
    title: 'Điểm 2',
    actions: [{ seq: 1, whoText: '', what: '', assigneeUserIds: [] }],
  };

  // When all valid
  assert.equal(validateSpotsForAssign([spotValid]).valid, true);

  // When at least one invalid
  const checkInvalid = validateSpotsForAssign([spotValid, spotInvalid]);
  assert.equal(checkInvalid.valid, false);
  assert.equal(checkInvalid.code, 'SPOT_INCOMPLETE');
  assert.match(checkInvalid.message, /Điểm 2/i);

  // Empty list
  assert.equal(validateSpotsForAssign([]).valid, false);
});

test('groupTasksByDay groups tasks correctly and sorts days descending', () => {
  assert.deepEqual(groupTasksByDay([]), []);
  assert.deepEqual(groupTasksByDay(null), []);

  const rawTasks = [
    { id: 't1', day: '2026-10-28', title: 'Task 1' },
    { id: 't2', day: '2026-10-30', title: 'Task 2' },
    { id: 't3', day: '2026-10-28', title: 'Task 3' },
    { id: 't4', day: '2026-10-29', title: 'Task 4' },
  ];

  const grouped = groupTasksByDay(rawTasks);
  assert.equal(grouped.length, 3);
  assert.equal(grouped[0].day, '2026-10-30');
  assert.equal(grouped[0].tasks.length, 1);
  assert.equal(grouped[1].day, '2026-10-29');
  assert.equal(grouped[1].tasks.length, 1);
  assert.equal(grouped[2].day, '2026-10-28');
  assert.equal(grouped[2].tasks.length, 2);
});

test('isRowLocked returns true only when status is DONE', () => {
  assert.equal(isRowLocked('DONE'), true);
  assert.equal(isRowLocked('done'), true);
  assert.equal(isRowLocked('  DONE  '), true);

  assert.equal(isRowLocked('DRAFT'), false);
  assert.equal(isRowLocked('ASSIGNED'), false);
  assert.equal(isRowLocked('IN_PROGRESS'), false);
  assert.equal(isRowLocked('REPORTED'), false);
  assert.equal(isRowLocked(null), false);
  assert.equal(isRowLocked(undefined), false);
});

test('validateReportInput enforces reportText when status is REPORTED', () => {
  const emptyReport = validateReportInput({ status: 'REPORTED', reportText: '' });
  assert.equal(emptyReport.valid, false);
  assert.match(emptyReport.message, /nội dung chi tiết/i);

  const whitespaceReport = validateReportInput({ status: 'REPORTED', reportText: '   ' });
  assert.equal(whitespaceReport.valid, false);

  const validReport = validateReportInput({ status: 'REPORTED', reportText: 'Đã xử lý xong các bưu gửi' });
  assert.equal(validReport.valid, true);

  const inProgress = validateReportInput({ status: 'IN_PROGRESS', reportText: '' });
  assert.equal(inProgress.valid, true);
});

test('validateClosingInput validates resolved and recovered flags', () => {
  const missingResolved = validateClosingInput({ recovered: true });
  assert.equal(missingResolved.valid, false);
  assert.match(missingResolved.message, /tiến độ giải quyết/i);

  const missingRecovered = validateClosingInput({ resolved: true });
  assert.equal(missingRecovered.valid, false);
  assert.match(missingRecovered.message, /phục hồi chỉ tiêu/i);

  const validClosing = validateClosingInput({ resolved: true, recovered: false });
  assert.equal(validClosing.valid, true);
});

test('generatePl06FileName formats filenames per PO convention and handles extensions', () => {
  // Edge cases
  assert.equal(generatePl06FileName(null), 'PL06 - Nhat ky dieu hanh');
  assert.equal(generatePl06FileName({}), 'PL06 - Nhat ky dieu hanh dd.mm.yyyy -');

  // Standard F1.3 spot
  const spotF13 = {
    day: '2026-10-30',
    indicator: 'F1.3',
    officeName: 'BCVH Hương Trà',
    title: 'BCVH Hương Trà (535470)',
  };
  assert.equal(
    generatePl06FileName(spotF13),
    'PL06 - Nhat ky dieu hanh 30.10.2026 - F1.3 BCVH Huong Tra'
  );
  assert.equal(
    generatePl06FileName(spotF13, 'docx'),
    'PL06 - Nhat ky dieu hanh 30.10.2026 - F1.3 BCVH Huong Tra.docx'
  );
  assert.equal(
    generatePl06FileName(spotF13, '.pdf'),
    'PL06 - Nhat ky dieu hanh 30.10.2026 - F1.3 BCVH Huong Tra.pdf'
  );

  // HANGTON spot
  const spotHt = {
    day: '2026-10-30',
    indicator: 'HANGTON',
    officeName: 'BCVH Thuận Hóa',
    title: 'BCVH Thuận Hóa (533140)',
  };
  assert.equal(
    generatePl06FileName(spotHt),
    'PL06 - Nhat ky dieu hanh 30.10.2026 - Hang ton BCVH Thuan Hoa'
  );
  assert.equal(
    generatePl06FileName(spotHt, 'docx'),
    'PL06 - Nhat ky dieu hanh 30.10.2026 - Hang ton BCVH Thuan Hoa.docx'
  );
});

test('buildPl06PrintModel creates renderer-neutral data model matching PL06 structure', () => {
  assert.equal(buildPl06PrintModel(null), null);

  const mockSpot = {
    id: 'spot_test_1',
    day: '2026-10-30',
    indicator: 'F1.1',
    title: 'KHL 531120 -> Hương Thủy',
    headline: 'Chỉ tiêu F1.1 ngày N-1 đạt 82.5%',
    finalizedAt: '2026-10-30T09:30:00Z',
    channel: 'Dashboard',
    detectedAt: '2026-10-30 07:30:00',
    actions: [
      {
        seq: 1,
        whoText: 'Giám đốc BCVH',
        what: 'Rà soát nguyên nhân',
        where: 'Hương Thủy',
        due: 'Trong ngày',
        how: 'Kiểm tra hệ thống',
        expectedResult: 'Báo cáo nguyên nhân',
        status: 'DONE',
      },
    ],
    closing: {
      resolved: true,
      recovered: false,
      handlingTimeText: '2 giờ',
      lesson: 'Kiểm soát giờ xuất phát',
      processUpdate: 'Cập nhật lịch xe',
      doneTime: '17:00',
    },
  };

  const model = buildPl06PrintModel(mockSpot);
  assert.ok(model);
  assert.equal(model.title, 'NHẬT KÝ ĐIỀU HÀNH HÀNG NGÀY');
  assert.equal(model.dateText, '30/10/2026');
  assert.equal(model.signerName, 'Mai Văn Mười'); // the recorder is always the Giám đốc TTVH, whoever pressed chốt
  assert.equal(model.signerPosition, 'PGĐ BĐTP, GĐ TTVH');
  assert.equal(model.channel, 'Dashboard');
  assert.equal(model.actions.length, 1);
  assert.equal(model.actions[0].stt, 1);
  assert.equal(model.actions[0].what, 'Rà soát nguyên nhân');
  assert.equal(model.closing.resolved, true);
  assert.equal(model.closing.recovered, false);
  assert.equal(model.closing.handlingTimeText, '2 giờ');

  // When signedBy is provided in closing
  const modelWithSigner = buildPl06PrintModel({
    ...mockSpot,
    closing: { ...mockSpot.closing, signedBy: 'Lê Văn Trưởng' },
  });
  assert.equal(modelWithSigner.signerName, 'Mai Văn Mười', 'an account name in the data never replaces the recorder');
});




test('getSpotReasons gives comparisons (standing, fall vs yesterday and last week) and never mentions the target', () => {
  const reasons = getSpotReasons('F4.1', {
    rate: 42.3, fail: 337, delta: -15.4, deltaDay: -3.2, mtdRate: 50.5,
    rank: { lowRate: { pos: 1, of: 6 }, mostFailed: { pos: 1, of: 6 }, dropDay: { pos: 2, of: 6 }, dropWeek: { pos: 1, of: 6 } },
  });
  const texts = reasons.map((r) => r.text);
  assert.deepEqual(texts, [
    'Tỷ lệ 42,3%',
    'Thấp nhất trong các BCVH',
    'Nhiều bưu gửi không đạt nhất (337 BG)',
    'Giảm 3,2 điểm so với hôm trước — mạnh thứ 2',
    'Giảm 15,4 điểm so với cùng kỳ tuần trước — mạnh nhất',
    'Lũy kế tháng 50,5%',
  ]);
  assert.ok(!texts.some((t) => /chỉ tiêu|chưa đạt/.test(t)), 'no target wording');
  assert.equal(getSpotReasons('F1.1', { rate: 10, rank: { lowRate: { pos: 1, of: 8 } } }, 'PAIR')[1].text, 'Thấp nhất trong các cặp');
  assert.equal(getSpotReasons('F1.3', { rate: 60, rank: { lowRate: { pos: 1, of: 1 } } }).length, 1, 'a unit alone is not "the lowest"');
  const stock = getSpotReasons('HANGTON', { stockGe5: 174, stockGe7: 93, stockGe14: 4, deltaStock: 37, cod: 41208649, rank: { mostStock: { pos: 1, of: 6 }, mostStock14: { pos: 2, of: 6 }, mostRise: { pos: 1, of: 6 } } });
  assert.deepEqual(stock.map((r) => r.text), [
    'Tồn nhiều nhất trong các BCVH (174 bưu gửi ≥5 ngày)',
    '4 bưu gửi tồn ≥14 ngày — nhiều thứ 2',
    'Tăng 37 bưu gửi so với hôm trước — tăng nhiều nhất',
    'COD 41.208.649 đ',
  ]);
  assert.deepEqual(getSpotReasons('F1.3', { rate: 55 }).map((r) => r.text), ['Tỷ lệ 55%'], 'older saved spots without ranks still render');
});

test('formatFileSize and timeAgoText read well for attachments and notifications', () => {
  assert.equal(formatFileSize(300), '1 KB');
  assert.equal(formatFileSize(340 * 1024), '340 KB');
  assert.equal(formatFileSize(1.5 * 1024 * 1024), '1,5 MB');
  const now = 1_700_000_000_000;
  assert.equal(timeAgoText(now - 20 * 1000, now), 'vừa xong');
  assert.equal(timeAgoText(now - 5 * 60000, now), '5 phút trước');
  assert.equal(timeAgoText(now - 3 * 3600000, now), '3 giờ trước');
});
