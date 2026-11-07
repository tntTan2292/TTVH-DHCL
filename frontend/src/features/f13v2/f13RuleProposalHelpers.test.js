import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS_TABS,
  formatCause,
  formatReason,
  formatPhatDetail,
  formatSystemConclusion,
  formatChosenCause,
  formatProposalStatus,
  proposalStatusBadgeClass,
  decisionBadgeClass,
  formatStillRatio,
  formatDateSpan,
  validateDecisionInput,
  sortRuleProposals,
} from './f13RuleProposalHelpers.js';

test('f13RuleProposalHelpers: STATUS_TABS contains 4 required statuses in order', () => {
  assert.equal(STATUS_TABS.length, 4);
  assert.deepEqual(STATUS_TABS.map((t) => t.key), ['PENDING', 'APPROVED', 'REJECTED', 'APPLIED']);
  assert.equal(STATUS_TABS[0].label, 'Chờ duyệt');
  assert.equal(STATUS_TABS[1].label, 'Đã duyệt - chờ chuyển thành quy tắc');
  assert.equal(STATUS_TABS[2].label, 'Không duyệt');
  assert.equal(STATUS_TABS[3].label, 'Đã áp dụng');
});

test('f13RuleProposalHelpers: formatCause, formatReason, formatPhatDetail handle known codes and fallback', () => {
  assert.equal(formatCause('KHONG_TRON_LO'), 'Không trọn lô');
  assert.equal(formatCause('KHAI_THAC'), 'Khai thác (đến BCVH quá hạn)');
  assert.equal(formatCause('VAN_CHUYEN'), 'Vận chuyển (đến BCVH quá hạn)');
  assert.equal(formatCause('KHAC'), 'Khác');
  assert.equal(formatCause('CUSTOM_UNKNOWN'), 'CUSTOM_UNKNOWN');
  assert.equal(formatCause('~'), '—');
  assert.equal(formatCause(null), '—');

  assert.equal(formatReason('THIEU_PTC'), 'Chưa có giờ phát');
  assert.equal(formatReason('TCT_DAI_HON_MOC'), 'Giờ TCT dài hơn mốc thực tế');
  assert.equal(formatReason('~'), '—');
  assert.equal(formatReason(null), '—');

  assert.equal(formatPhatDetail('CHAM_GIAO_BUU_TA'), 'Chậm giao bưu tá');
  assert.equal(formatPhatDetail('PHAT_CHAM_SAU_GIAO'), 'Phát chậm sau khi giao');
  assert.equal(formatPhatDetail('~'), '—');
  assert.equal(formatPhatDetail(null), '—');
});

test('f13RuleProposalHelpers: formatSystemConclusion formats Vietnamese labels cleanly', () => {
  // CHO_CHUYEN_QUAN with reason
  assert.equal(
    formatSystemConclusion({ status: 'CHO_CHUYEN_QUAN', cause_or_reason: 'THIEU_PTC', detail: null }),
    'Chờ CQ: Chưa có giờ phát'
  );

  // CAUSE with detail
  assert.equal(
    formatSystemConclusion({ status: 'CAUSE', cause_or_reason: 'GIAO_BUU_TA_QUA_GIO', detail: 'CHAM_GIAO_BUU_TA' }),
    'Chậm giao bưu tá'
  );

  assert.equal(
    formatSystemConclusion({ status: 'CAUSE', cause_or_reason: 'KHAI_THAC', detail: null }),
    'Khai thác (đến BCVH quá hạn)'
  );

  // Special statuses
  assert.equal(formatSystemConclusion({ status: 'CHUA_DU_CAN_CU' }), 'Chưa đủ căn cứ');
  assert.equal(formatSystemConclusion({ status: 'KHONG_PHAN_TICH' }), 'Không phân tích');

  // Null or missing
  assert.equal(formatSystemConclusion(null), 'Chưa có kết luận');
  assert.equal(formatSystemConclusion({ status: '~', cause_or_reason: '~', detail: '~' }), 'Chưa có kết luận');
});

test('f13RuleProposalHelpers: formatChosenCause formats analyst choices cleanly', () => {
  assert.equal(
    formatChosenCause({ cause: 'KHAI_THAC', phat_detail: null }),
    'Khai thác (đến BCVH quá hạn)'
  );

  assert.equal(
    formatChosenCause({ cause: 'PHAT_MUON', phat_detail: 'PHAT_CHAM_SAU_GIAO' }),
    'Phát chậm sau khi giao'
  );

  assert.equal(formatChosenCause(null), '—');
  assert.equal(formatChosenCause({ cause: '~' }), '—');
});

test('f13RuleProposalHelpers: formatStillRatio formats Vietnamese label exactly', () => {
  assert.equal(formatStillRatio(12, 15), 'còn giữ kết luận hệ thống 12 / 15');
  assert.equal(formatStillRatio(0, 0), 'còn giữ kết luận hệ thống 0 / 0');
  assert.equal(formatStillRatio(5, 5), 'còn giữ kết luận hệ thống 5 / 5');
});

test('f13RuleProposalHelpers: formatDateSpan formats date ranges', () => {
  assert.equal(formatDateSpan('2026-10-01', '2026-10-25'), '2026-10-01 → 2026-10-25');
  assert.equal(formatDateSpan('2026-10-01', '2026-10-01'), '2026-10-01');
  assert.equal(formatDateSpan(null, null), '—');
});

test('f13RuleProposalHelpers: validateDecisionInput enforces PO decision rules', () => {
  // APPROVE: note mandatory
  assert.equal(validateDecisionInput({ decision: 'APPROVE', note: 'Đã họp thống nhất' }).valid, true);
  assert.equal(validateDecisionInput({ decision: 'APPROVE', note: '' }).valid, false);
  assert.equal(validateDecisionInput({ decision: 'APPROVE', note: '   ' }).valid, false);

  // REJECT: note mandatory
  assert.equal(validateDecisionInput({ decision: 'REJECT', note: 'Không đủ căn cứ sửa quy tắc' }).valid, true);
  assert.equal(validateDecisionInput({ decision: 'REJECT', note: '' }).valid, false);

  // Note length limit
  const longNote = 'a'.repeat(1001);
  assert.equal(validateDecisionInput({ decision: 'APPROVE', note: longNote }).valid, false);

  // APPLIED: ticketId mandatory, status must be APPROVED
  assert.equal(
    validateDecisionInput({ decision: 'APPLIED', ticketId: 'F13-WHY-DATA-03', currentStatus: 'APPROVED' }).valid,
    true
  );
  assert.equal(
    validateDecisionInput({ decision: 'APPLIED', ticketId: '', currentStatus: 'APPROVED' }).valid,
    false
  );
  assert.equal(
    validateDecisionInput({ decision: 'APPLIED', ticketId: 'F13-WHY-DATA-03', currentStatus: 'PENDING' }).valid,
    false
  );

  // Invalid decision action
  assert.equal(validateDecisionInput({ decision: 'UNKNOWN' }).valid, false);
});

test('f13RuleProposalHelpers: sortRuleProposals orders rows accurately', () => {
  const items = [
    { key: 'a', parcels: 10, bcvh: 2, analysts: 3, still_system_conclusion: 8, last_date: '2026-10-05', system: { cause_or_reason: 'B' }, chosen: { cause: 'B' } },
    { key: 'b', parcels: 50, bcvh: 5, analysts: 1, still_system_conclusion: 45, last_date: '2026-10-20', system: { cause_or_reason: 'A' }, chosen: { cause: 'A' } },
    { key: 'c', parcels: 25, bcvh: 1, analysts: 4, still_system_conclusion: 10, last_date: '2026-10-15', system: { cause_or_reason: 'C' }, chosen: { cause: 'C' } },
  ];

  // Parcels descending
  const sortedParcelsDesc = sortRuleProposals(items, 'parcels', 'desc');
  assert.deepEqual(sortedParcelsDesc.map((i) => i.key), ['b', 'c', 'a']);

  // Parcels ascending
  const sortedParcelsAsc = sortRuleProposals(items, 'parcels', 'asc');
  assert.deepEqual(sortedParcelsAsc.map((i) => i.key), ['a', 'c', 'b']);

  // BCVH descending
  const sortedBcvhDesc = sortRuleProposals(items, 'bcvh', 'desc');
  assert.deepEqual(sortedBcvhDesc.map((i) => i.key), ['b', 'a', 'c']);

  // Last date descending
  const sortedDateDesc = sortRuleProposals(items, 'last_date', 'desc');
  assert.deepEqual(sortedDateDesc.map((i) => i.key), ['b', 'c', 'a']);

  // Empty or invalid input
  assert.deepEqual(sortRuleProposals([], 'parcels'), []);
  assert.deepEqual(sortRuleProposals(null, 'parcels'), []);
});

test('f13RuleProposalHelpers: formatProposalStatus, proposalStatusBadgeClass, decisionBadgeClass', () => {
  assert.equal(formatProposalStatus('PENDING'), 'Chờ duyệt');
  assert.equal(formatProposalStatus('APPROVED'), 'Đã duyệt - chờ chuyển thành quy tắc');
  assert.equal(formatProposalStatus('REJECTED'), 'Không duyệt');
  assert.equal(formatProposalStatus('APPLIED'), 'Đã áp dụng');

  assert.ok(proposalStatusBadgeClass('PENDING').includes('amber'));
  assert.ok(proposalStatusBadgeClass('APPROVED').includes('blue'));
  assert.ok(proposalStatusBadgeClass('REJECTED').includes('red'));
  assert.ok(proposalStatusBadgeClass('APPLIED').includes('emerald'));

  assert.ok(decisionBadgeClass('APPROVE').includes('blue'));
  assert.ok(decisionBadgeClass('REJECT').includes('red'));
  assert.ok(decisionBadgeClass('APPLIED').includes('emerald'));
});

test('F13-RULE-PROPOSAL-01 review: decision time on the Vietnam clock and BCVH names', async () => {
  const { formatDecisionTime, formatBcvhName } = await import('./f13RuleProposalHelpers.js');
  assert.equal(formatDecisionTime('2026-11-07T02:24:26.136Z'), '07/11/2026 09:24');
  assert.equal(formatDecisionTime('2026-11-07T18:30:00.000Z'), '08/11/2026 01:30');
  assert.equal(formatDecisionTime(''), '');
  assert.equal(formatDecisionTime('not a date'), '');
  assert.equal(formatBcvhName('537015'), 'BCVH Thuận An');
  assert.equal(formatBcvhName('999999'), '999999');
  assert.equal(formatBcvhName(null), '—');
});
