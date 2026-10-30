import test from 'node:test';
import assert from 'node:assert/strict';
import { USE_MOCK_OPS_JOURNAL, opsJournalAdapter } from './opsJournalApi.js';
import { opsJournalMockAdapter } from './opsJournalMockAdapter.js';
import { opsJournalRealAdapter } from './opsJournalRealAdapter.js';
import { MOCK_CANDIDATES, MOCK_UNAVAILABLE } from './opsJournalMockData.js';

test('Phase C: the single constant selects the REAL adapter by default; the mock still works when used directly', async () => {
  assert.equal(USE_MOCK_OPS_JOURNAL, false, 'Phase C: the real backend is the default; only a developer flips this constant');
  const { opsJournalMockAdapter } = await import('./opsJournalMockAdapter.js');
  const res = await opsJournalMockAdapter.getCandidates('2026-10-30');
  assert.equal(res.success, true);
  assert.equal(res.data.items.length, 12);
});

test('both mock and real adapters expose identical API surface methods', () => {
  const expectedMethods = [
    'getCandidates',
    'getDay',
    'saveSpots',
    'saveActions',
    'assignWork',
    'reopenSpot',
    'saveClosing',
    'markActionDone',
    'closeDay',
    'getAssignableUsers',
    'getMyTasks',
    'getSpotForAssignee',
    'reportAction',
    'exportSpot',
  ];

  for (const method of expectedMethods) {
    assert.equal(typeof opsJournalMockAdapter[method], 'function', `Mock adapter must implement ${method}`);
    assert.equal(typeof opsJournalRealAdapter[method], 'function', `Real adapter must implement ${method}`);
  }
});

test('mock candidates list satisfies all 12 candidate requirements', () => {
  assert.equal(MOCK_CANDIDATES.length, 12, 'Must provide exactly 12 mock candidates');

  // Verify all 5 indicators are represented: F1.1, F1.2, F1.3, F4.1, HANGTON
  const indicators = new Set(MOCK_CANDIDATES.map((c) => c.indicator));
  assert.ok(indicators.has('F1.1'), 'Must include F1.1');
  assert.ok(indicators.has('F1.2'), 'Must include F1.2');
  assert.ok(indicators.has('F1.3'), 'Must include F1.3');
  assert.ok(indicators.has('F4.1'), 'Must include F4.1');
  assert.ok(indicators.has('HANGTON'), 'Must include HANGTON');

  // Verify PAIR is represented
  const pairItems = MOCK_CANDIDATES.filter((c) => c.scopeType === 'PAIR');
  assert.ok(pairItems.length > 0, 'Must include PAIR scope type');

  // Verify preselected items exist (top 8)
  const preselected = MOCK_CANDIDATES.filter((c) => c.preselected);
  assert.equal(preselected.length, 8, 'Must preselect exactly 8 candidates (within 5-10)');

  // Verify unavailable warnings
  assert.ok(Array.isArray(MOCK_UNAVAILABLE) && MOCK_UNAVAILABLE.length > 0);
});

test('mock adapter getCandidates returns envelope with unavailable warnings', async () => {
  const res = await opsJournalMockAdapter.getCandidates('2026-10-30');
  assert.equal(res.success, true);
  assert.ok(res.data);
  assert.equal(res.data.items.length, 12);
  assert.ok(Array.isArray(res.data.unavailable));
  assert.ok(res.data.unavailable.length > 0);
});

test('mock adapter saveSpots rejects outside 5-10 and accepts within 5-10', async () => {
  const testDate = '2026-10-30';

  // 1. Reject when < 5 spots
  const tooFew = await opsJournalMockAdapter.saveSpots(testDate, {
    candidateIds: ['cand_f11_pair_531120_536250', 'cand_f11_bcvh_533140'],
    manual: [],
  });
  assert.equal(tooFew.success, false);
  assert.equal(tooFew.error?.code, 'OUT_OF_RANGE');
  assert.match(tooFew.error?.message, /từ 5 đến 10/i);

  // 2. Reject when > 10 spots
  const tooMany = await opsJournalMockAdapter.saveSpots(testDate, {
    candidateIds: MOCK_CANDIDATES.slice(0, 10).map((c) => c.candidateId),
    manual: [{ indicator: 'F1.1', officeCode: '530000', title: 'Thêm 1', headline: 'Thủ công 1' }],
  });
  assert.equal(tooMany.success, false);
  assert.equal(tooMany.error?.code, 'OUT_OF_RANGE');

  // 3. Accept when between 5 and 10 (e.g. 7 candidates + 1 manual = 8)
  const validSave = await opsJournalMockAdapter.saveSpots(testDate, {
    candidateIds: MOCK_CANDIDATES.slice(0, 7).map((c) => c.candidateId),
    manual: [{ indicator: 'F1.1', officeCode: '530000', title: 'Thêm thủ công', headline: 'Thủ công' }],
  });
  assert.equal(validSave.success, true);
  assert.ok(validSave.data);
  assert.equal(validSave.data.spots.length, 8);
  assert.equal(validSave.data.date, testDate);
});

test('mock adapter saveActions, assignWork with SPOT_INCOMPLETE, reopenSpot and markActionDone', async () => {
  const testDate = '2026-10-31';

  // 1. Initialize day
  const dayRes = await opsJournalMockAdapter.getDay(testDate);
  assert.equal(dayRes.success, true);
  const spots = dayRes.data.spots;
  assert.ok(spots.length > 0);

  const draftSpot = spots.find((s) => s.status === 'DRAFT');
  assert.ok(draftSpot, 'Must have draft spots');

  // 2. saveActions on draft spot
  const updatedActions = [
    {
      seq: 1,
      whoText: 'Giám đốc BCVH',
      what: 'Rà soát nguyên nhân',
      where: 'Bưu cục',
      due: 'Trong ngày',
      how: 'Đối soát chi tiết',
      expectedResult: 'Báo cáo nguyên nhân',
      assigneeUserIds: ['usr_03'],
    },
  ];
  const saveActionRes = await opsJournalMockAdapter.saveActions(draftSpot.id, { actions: updatedActions });
  assert.equal(saveActionRes.success, true);

  // 3. assignWork failure when spot has incomplete row
  const incompleteActions = [
    {
      seq: 1,
      whoText: '',
      what: '', // missing what
      assigneeUserIds: [],
    },
  ];
  await opsJournalMockAdapter.saveActions(draftSpot.id, { actions: incompleteActions });
  const failedAssign = await opsJournalMockAdapter.assignWork(testDate, { spotIds: [draftSpot.id] });
  assert.equal(failedAssign.success, false);
  assert.equal(failedAssign.error?.code, 'SPOT_INCOMPLETE');
  assert.match(failedAssign.error?.message, /chưa có nội dung "Làm gì"/i);

  // 4. assignWork success when spot is complete
  await opsJournalMockAdapter.saveActions(draftSpot.id, { actions: updatedActions });
  const successAssign = await opsJournalMockAdapter.assignWork(testDate, { spotIds: [draftSpot.id] });
  assert.equal(successAssign.success, true);
  const assignedSpot = successAssign.data.spots.find((s) => s.id === draftSpot.id);
  assert.equal(assignedSpot.status, 'FINALIZED');

  // 5. reopenSpot requires reason and reopens spot to DRAFT
  const failedReopen = await opsJournalMockAdapter.reopenSpot(draftSpot.id, { reason: '' });
  assert.equal(failedReopen.success, false);
  assert.equal(failedReopen.error?.code, 'REASON_REQUIRED');

  const validReopen = await opsJournalMockAdapter.reopenSpot(draftSpot.id, { reason: 'Cần bổ sung nhân sự' });
  assert.equal(validReopen.success, true);
  const reopenedSpot = validReopen.data.spots.find((s) => s.id === draftSpot.id);
  assert.equal(reopenedSpot.status, 'DRAFT');

  // 6. markActionDone requires REPORTED, rejects already DONE with ROW_DONE
  const refreshedDay = await opsJournalMockAdapter.getDay(testDate);
  const currentSpot = refreshedDay.data.spots.find((s) => s.id === draftSpot.id);
  const act = currentSpot?.actions[0];
  if (act) {
    // Should fail when not REPORTED
    const notReportedRes = await opsJournalMockAdapter.markActionDone(act.id);
    assert.equal(notReportedRes.success, false);
    assert.equal(notReportedRes.error?.code, 'NOT_REPORTED');

    // Set to REPORTED via reportAction then mark done
    await opsJournalMockAdapter.reportAction(act.id, {
      status: 'REPORTED',
      reportText: 'Báo cáo hoàn thành nhiệm vụ',
    });
    const doneRes = await opsJournalMockAdapter.markActionDone(act.id);
    assert.equal(doneRes.success, true);
    assert.equal(doneRes.data.status, 'DONE');

    // Marking done again should return ROW_DONE
    const alreadyDoneRes = await opsJournalMockAdapter.markActionDone(act.id);
    assert.equal(alreadyDoneRes.success, false);
    assert.equal(alreadyDoneRes.error?.code, 'ROW_DONE');
  }

  // 7. getAssignableUsers filters
  const filteredUsers = await opsJournalMockAdapter.getAssignableUsers({ officeCode: '533140' });
  assert.equal(filteredUsers.success, true);
  assert.ok(filteredUsers.data.length > 0);

  const allUsersRes = await opsJournalMockAdapter.getAssignableUsers({ all: 1 });
  assert.equal(allUsersRes.success, true);
  assert.equal(allUsersRes.data.length, 7);
});

test('mock adapter getMyTasks, reportAction, saveClosing, closeDay with DAY_NOT_READY', async () => {
  // 1. getMyTasks returns tasks
  const myTasksRes = await opsJournalMockAdapter.getMyTasks();
  assert.equal(myTasksRes.success, true);
  assert.ok(Array.isArray(myTasksRes.data.tasks));
  assert.ok(myTasksRes.data.tasks.length > 0);

  const firstTask = myTasksRes.data.tasks[0];
  assert.ok(firstTask.spotId);
  assert.ok(firstTask.myRows?.length > 0);

  // 2. reportAction requires reportText when status is REPORTED
  const rowId = firstTask.myRows[0].id;
  const failReport = await opsJournalMockAdapter.reportAction(rowId, {
    status: 'REPORTED',
    causeText: 'Nguyên nhân test',
    reportText: '  ',
  });
  assert.equal(failReport.success, false);
  assert.equal(failReport.error?.code, 'REPORT_REQUIRED');

  // Valid report
  const successReport = await opsJournalMockAdapter.reportAction(rowId, {
    status: 'REPORTED',
    causeText: 'Nguyên nhân xe trễ',
    reportText: 'Đã hoàn tất xử lý giải tỏa bưu gửi tồn đọng',
  });
  assert.equal(successReport.success, true);
  assert.equal(successReport.data.status, 'REPORTED');
  assert.equal(successReport.data.reportCause, 'Nguyên nhân xe trễ');

  // 3. saveClosing saves closing data
  const testDate = '2026-11-01';
  const dayRes = await opsJournalMockAdapter.getDay(testDate);
  const spot = dayRes.data.spots[0];

  const closingRes = await opsJournalMockAdapter.saveClosing(spot.id, {
    resolved: true,
    recovered: true,
    handlingTimeText: '2 giờ',
    lesson: 'Cần chủ động điều phối bưu tá',
    processUpdate: 'Cập nhật quy trình kiểm tra trước 08:00',
    doneTime: '2026-11-01T17:00:00Z',
  });
  assert.equal(closingRes.success, true);
  const updatedSpot = closingRes.data.spots.find((s) => s.id === spot.id);
  assert.equal(updatedSpot.closing.resolved, true);
  assert.equal(updatedSpot.closing.handlingTimeText, '2 giờ');

  // 4. closeDay fails with DAY_NOT_READY if spots are in DRAFT
  const closeFailRes = await opsJournalMockAdapter.closeDay(testDate);
  assert.equal(closeFailRes.success, false);
  assert.equal(closeFailRes.error?.code, 'DAY_NOT_READY');

  // Finalize all spots in day
  const allSpotIds = dayRes.data.spots.map((s) => s.id);
  for (const s of dayRes.data.spots) {
    if (!s.actions || s.actions.length === 0) {
      s.actions = [{ what: 'Hành động', whoText: 'Người làm' }];
    }
  }
  await opsJournalMockAdapter.assignWork(testDate, { spotIds: allSpotIds });

  // Now closeDay should succeed
  const closeSuccessRes = await opsJournalMockAdapter.closeDay(testDate);
  assert.equal(closeSuccessRes.success, true);
  assert.equal(closeSuccessRes.data.status, 'CLOSED');
});

test('mock adapter exportSpot validates format, checks finalized status, and returns blob', async () => {
  const testDate = '2026-11-02';
  const dayRes = await opsJournalMockAdapter.getDay(testDate);
  const draftSpot = dayRes.data.spots.find((s) => s.status === 'DRAFT');
  assert.ok(draftSpot);

  // 1. Export fails on bad format
  const badFormatRes = await opsJournalMockAdapter.exportSpot(draftSpot.id, 'xlsx');
  assert.equal(badFormatRes.success, false);
  assert.equal(badFormatRes.error?.code, 'BAD_FORMAT');

  // 2. Export fails on DRAFT spot
  const draftExportRes = await opsJournalMockAdapter.exportSpot(draftSpot.id, 'docx');
  assert.equal(draftExportRes.success, false);
  assert.equal(draftExportRes.error?.code, 'NOT_FINALIZED');

  // 3. Finalize spot then export docx and pdf
  await opsJournalMockAdapter.assignWork(testDate, { spotIds: [draftSpot.id] });

  const docxRes = await opsJournalMockAdapter.exportSpot(draftSpot.id, 'docx');
  assert.equal(docxRes.success, true);
  assert.ok(docxRes.data);

  const pdfRes = await opsJournalMockAdapter.exportSpot(draftSpot.id, 'pdf');
  assert.equal(pdfRes.success, true);
  assert.ok(pdfRes.data);
});

