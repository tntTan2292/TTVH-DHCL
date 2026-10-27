import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyForm, formFromEntry, needsDueDate, validateForm, buildInput, summarizeEntry, formatDate, percent, describeSaveResult,
  effectiveEntries, toggleSelected, togglePage, sortStatsRows, chunkCodes, mergeSaveResults, localToday, isEditableToday,
  STATE_META, REVIEW_FILTER_OPTIONS, OTHER_CODE, asksText, planSummary, rowForm, applyEdit, splitDrafts, remainingDrafts,
  resultMeta, RESULT_META, needsRecheck,
} from './handlingModel.js';
import { positionLabel, hasCapability, POSITIONS_BY_TIER, CAPABILITIES } from '../../../auth/accessModel.js';
import { buildItemsParams } from '../hangtonExport.js';

const catalog = {
  kinds: [
    {
      kind: 'cause',
      options: [
        { code: 'PHAT_THANH_CONG', label: 'Phát thành công', auto: { plan_code: 'DA_PHAT', plan_label: 'Đã phát thành công', result_code: 'DA_XU_LY', result_label: 'Đã xử lý', needs_due: false, due_is_today: false } },
        { code: 'MAT', label: 'Mất', auto: { plan_code: 'DA_MAT', plan_label: 'Ghi nhận mất', result_code: 'DA_XU_LY', result_label: 'Đã xử lý', needs_due: false, due_is_today: false } },
        { code: 'CHUYEN_HOAN', label: 'Chuyển hoàn', auto: { plan_code: 'CHUYEN_HOAN', plan_label: 'Chuyển hoàn ngày', result_code: 'DA_XU_LY', result_label: 'Đã xử lý', needs_due: true, due_is_today: true } },
        { code: 'KH_HEN_PHAT_LAI', label: 'Khách hàng hẹn phát lại' },
        { code: OTHER_CODE, label: 'Nguyên nhân khác' },
      ],
    },
    {
      kind: 'plan',
      options: [
        { code: 'PHAT_LAI', label: 'Phát lại ngày', needsDue: true },
        { code: 'CHUYEN_HOAN', label: 'Chuyển hoàn ngày', needsDue: true },
        { code: 'LIEN_HE_BC_GOC', label: 'Liên hệ Bưu cục gốc', askText: true },
        { code: OTHER_CODE, label: 'Hướng xử lý khác' },
      ],
    },
    { kind: 'result', options: [{ code: 'DA_XU_LY', label: 'Đã xử lý' }, { code: 'CHUA_XU_LY', label: 'Chưa xử lý' }] },
  ],
};
const TODAY = '2026-10-27';

test('form: three answers are required, "Khác" needs its text, a date is asked only when the plan needs one', () => {
  assert.deepEqual(Object.keys(validateForm(catalog, emptyForm(), TODAY)).sort(), ['cause_code', 'plan_code'], 'the result is never asked');
  const ok = { ...emptyForm(), cause_code: 'KH_HEN_PHAT_LAI', plan_code: 'LIEN_HE_BC_GOC' };
  assert.deepEqual(validateForm(catalog, ok, TODAY), {}, 'the detail of "Liên hệ Bưu cục gốc" is optional');
  assert.equal(needsDueDate(catalog, ok), false);
  const due = { ...ok, plan_code: 'PHAT_LAI' };
  assert.equal(needsDueDate(catalog, due), true);
  assert.deepEqual(Object.keys(validateForm(catalog, due, TODAY)), ['due_date']);
  assert.deepEqual(validateForm(catalog, { ...due, due_date: '2026-10-28' }, TODAY), {});
  assert.equal(validateForm(catalog, { ...due, due_date: '2026-10-20' }, TODAY).due_date, 'Ngày hẹn không được trước hôm nay');
  assert.equal(needsDueDate(catalog, { ...ok, plan_code: 'CHUYEN_HOAN' }), true, 'Chuyển hoàn ngày asks for the date too');
  const other = { ...ok, cause_code: OTHER_CODE, cause_text: ' ' };
  assert.deepEqual(Object.keys(validateForm(catalog, other, TODAY)), ['cause_text']);
  assert.deepEqual(validateForm(catalog, { ...other, cause_text: 'Cổng khóa' }, TODAY), {});
  assert.equal(validateForm(catalog, { ...ok, cause_code: 'KHONG_CO' }, TODAY).cause_code, 'Chọn nội dung xử lý');
});

test('input: text travels with "Khác" and with an answer that asks a detail; an old entry fills the form again', () => {
  const form = { ...emptyForm(), cause_code: OTHER_CODE, cause_text: '  Cổng khóa ', plan_code: 'LIEN_HE_BC_GOC', plan_text: ' BC Phú Bài ', result_code: 'DA_XU_LY', note: 'n' };
  assert.deepEqual(buildInput(form, catalog), {
    due_date: '', note: 'n', cause_code: OTHER_CODE, cause_text: 'Cổng khóa', plan_code: 'LIEN_HE_BC_GOC', plan_text: 'BC Phú Bài', result_code: 'DA_XU_LY', result_text: '',
  });
  assert.equal(buildInput({ ...form, plan_code: 'PHAT_LAI' }, catalog).plan_text, '', 'no text where the answer takes none');
  const entry = { cause_code: 'KH_HEN_PHAT_LAI', plan_code: 'PHAT_LAI', plan_text: null, result_code: 'DA_XU_LY', due_date: '2026-10-29', note: null };
  assert.deepEqual(formFromEntry(entry), { cause_code: 'KH_HEN_PHAT_LAI', cause_text: '', plan_code: 'PHAT_LAI', plan_text: '', result_code: 'DA_XU_LY', result_text: '', due_date: '2026-10-29', note: '' });
  assert.deepEqual(formFromEntry(null), emptyForm());
  assert.equal(asksText(catalog, 'plan', 'LIEN_HE_BC_GOC'), true);
  assert.equal(asksText(catalog, 'plan', 'PHAT_LAI'), false);
});

test('display helpers: plan wording, summary line, dates, rates, states and review filter', () => {
  assert.equal(planSummary({ plan_code: 'PHAT_LAI', plan_label: 'Phát lại ngày', due_date: '2026-10-29' }), 'Phát lại ngày 29/10/2026');
  assert.equal(planSummary({ plan_code: 'LIEN_HE_BC_GOC', plan_label: 'Liên hệ Bưu cục gốc', plan_text: 'BC Phú Bài' }), 'Liên hệ Bưu cục gốc (BC Phú Bài)');
  assert.equal(planSummary({ plan_code: 'OTHER', plan_label: 'Gọi lại sau', plan_text: 'Gọi lại sau' }), 'Gọi lại sau', 'the own wording is not repeated');
  assert.equal(summarizeEntry({ plan_code: 'PHAT_LAI', plan_label: 'Phát lại ngày', result_label: 'Chưa xử lý', due_date: '2026-10-29' }), 'Phát lại ngày 29/10/2026 → Chưa xử lý');
  assert.equal(summarizeEntry({ plan_label: 'Hẹn lại khách', result_label: 'Đã xử lý', due_date: '2026-10-29' }), 'Hẹn lại khách → Đã xử lý (hẹn 29/10/2026)', 'an older plan wording keeps the date after it');
  assert.equal(summarizeEntry(null), '');
  assert.equal(formatDate('2026-10-05'), '05/10/2026');
  assert.equal(percent(0.5), '50,0%');
  assert.equal(percent(1, 0), '100%');
  assert.equal(percent(null), '—');
  assert.deepEqual(Object.keys(STATE_META), ['DONE', 'STALE', 'NONE']);
  assert.deepEqual(REVIEW_FILTER_OPTIONS.map((o) => o.value), ['', 'pending', 'done', 'never', 'stale']);
  assert.equal(localToday(new Date(2026, 9, 5)), '2026-10-05');
  assert.equal(isEditableToday({ business_date: '2026-10-27' }, TODAY), true);
  assert.equal(isEditableToday({ business_date: '2026-10-26' }, TODAY), false);
});

test('direct entry in the table: cells show the draft or the last entry; incomplete rows are held back; saved ones leave the drafts', () => {
  const row = { item_code: 'A1', handling: { last: { cause_code: 'KH_HEN_PHAT_LAI', plan_code: 'PHAT_LAI', result_code: 'DA_XU_LY', due_date: '2026-10-29' } } };
  assert.equal(rowForm(row, {}).cause_code, 'KH_HEN_PHAT_LAI', 'the last entry fills the cells');
  assert.equal(rowForm({ item_code: 'A2' }, {}).cause_code, '', 'a parcel never reviewed starts empty');
  const typed = applyEdit(catalog, rowForm(row, {}), { plan_code: 'LIEN_HE_BC_GOC' });
  assert.equal(typed.due_date, '', 'the date goes when the plan no longer asks for it');
  assert.equal(applyEdit(catalog, typed, { plan_code: 'CHUYEN_HOAN', due_date: '2026-10-30' }).due_date, '2026-10-30');

  const drafts = {
    A1: typed,
    A2: { ...emptyForm(), cause_code: OTHER_CODE, cause_text: 'Cổng khóa', plan_code: 'PHAT_LAI', due_date: '2026-10-30', result_code: 'CHUA_XU_LY' },
    A3: { ...emptyForm(), cause_code: 'KH_HEN_PHAT_LAI' },
  };
  const { ready, incomplete } = splitDrafts(catalog, drafts, TODAY);
  assert.deepEqual(ready.map((r) => r.item_code), ['A1', 'A2']);
  assert.deepEqual(incomplete, ['A3']);
  assert.equal(ready[1].input.cause_text, 'Cổng khóa');
  assert.deepEqual(Object.keys(remainingDrafts(drafts, { results: [{ item_code: 'A1', status: 'SAVED' }, { item_code: 'A2', status: 'SKIPPED', reason: 'INVALID' }] })).sort(), ['A2', 'A3']);
});

test('save result is described in words (saved, skipped by reason, ignored Excel rows)', () => {
  assert.deepEqual(describeSaveResult({ saved: 3, skipped: 0, results: [] }), { tone: 'success', lines: ['Đã lưu 3 bưu gửi.'] });
  const partial = describeSaveResult({ saved: 2, skipped: 3, results: [
    { status: 'SKIPPED', reason: 'OUT_OF_SCOPE' }, { status: 'SKIPPED', reason: 'OUT_OF_SCOPE' }, { status: 'SKIPPED', reason: 'NO_PREVIOUS' }, { status: 'SAVED' },
  ], ignored_rows: 4 });
  assert.equal(partial.tone, 'warning');
  assert.ok(partial.lines.some((l) => l.startsWith('2 bưu gửi bỏ qua: thuộc bưu cục ngoài phạm vi')));
  assert.ok(partial.lines.some((l) => l.includes('chưa có thông tin cũ')));
  assert.ok(partial.lines.some((l) => l.startsWith('4 dòng trong file')));
  assert.equal(describeSaveResult({ saved: 0, skipped: 1, results: [{ status: 'SKIPPED', reason: 'INVALID' }] }).tone, 'error');
  assert.equal(describeSaveResult(null).tone, 'error');
});

test('history: only the last entry of a past day can be corrected; selection and chunking helpers', () => {
  const entries = [{ id: 1, business_date: '2026-10-26' }, { id: 2, business_date: '2026-10-26' }, { id: 3, business_date: '2026-10-27' }];
  assert.deepEqual([...effectiveEntries(entries)].sort(), [2, 3]);
  assert.deepEqual(toggleSelected(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(toggleSelected(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(togglePage(['x'], ['a', 'b']), ['x', 'a', 'b']);
  assert.deepEqual(togglePage(['x', 'a', 'b'], ['a', 'b']), ['x']);
  assert.deepEqual(chunkCodes(['a', 'b', 'c'], 2), [['a', 'b'], ['c']]);
  const merged = mergeSaveResults([{ saved: 1, skipped: 1, results: [{ item_code: 'a' }] }, { saved: 2, skipped: 0, results: [{ item_code: 'b' }], ignored_rows: 3 }]);
  assert.deepEqual([merged.saved, merged.skipped, merged.results.length, merged.ignored_rows], [3, 1, 2, 3]);
});

test('statistics table orders by any column, text and numbers', () => {
  const rows = [{ office: 'B', needed: 5, rate: 0.2 }, { office: 'A', needed: 9, rate: 0.9 }, { office: 'C', needed: 1, rate: null }];
  assert.deepEqual(sortStatsRows(rows, { field: 'needed', direction: 'desc' }).map((r) => r.office), ['A', 'B', 'C']);
  assert.deepEqual(sortStatsRows(rows, { field: 'rate', direction: 'asc' }).map((r) => r.office), ['C', 'B', 'A']);
  assert.deepEqual(sortStatsRows(rows, { field: 'office', direction: 'asc' }).map((r) => r.office), ['A', 'B', 'C']);
});

test('access model: positions, labels and capabilities mirror the backend registry', () => {
  assert.equal(positionLabel('GD_BCVH'), 'Giám đốc BCVH');
  assert.equal(positionLabel('LD_BDTP'), 'Lãnh đạo BĐTP');
  assert.equal(positionLabel('nope'), '');
  assert.deepEqual(POSITIONS_BY_TIER.LEADER, ['LD_TTVH', 'IT_BDTP', 'LD_BDTP']);
  assert.ok(hasCapability({ capabilities: ['hangton.handling.write'] }, CAPABILITIES.HANGTON_HANDLING_WRITE));
  assert.ok(!hasCapability({ capabilities: [] }, CAPABILITIES.HANGTON_HANDLING_WRITE));
  assert.ok(!hasCapability(null, CAPABILITIES.HANGTON_HANDLING_VIEW));
});

test('parcel list parameters carry the review filter', () => {
  assert.equal(buildItemsParams({ snapshotId: 1, review: 'pending' }).review, 'pending');
  assert.equal(buildItemsParams({ snapshotId: 1, review: '' }).review, undefined);
});

test('settling contents: the plan is locked, the result follows from the content (never chosen); Chuyển hoàn is dated today', () => {
  const done = applyEdit(catalog, emptyForm(), { cause_code: 'PHAT_THANH_CONG' }, TODAY);
  assert.deepEqual([done.plan_code, done.result_code, done.due_date], ['DA_PHAT', 'DA_XU_LY', '']);
  assert.deepEqual(validateForm(catalog, done, TODAY), {}, 'nothing else is required');
  assert.equal(applyEdit(catalog, emptyForm(), { cause_code: 'MAT' }, TODAY).plan_code, 'DA_MAT');
  const back = applyEdit(catalog, emptyForm(), { cause_code: 'CHUYEN_HOAN' }, TODAY);
  assert.deepEqual([back.plan_code, back.result_code, back.due_date], ['CHUYEN_HOAN', 'DA_XU_LY', TODAY], 'the date is today');
  assert.deepEqual(validateForm(catalog, back, TODAY), {});
  assert.equal(applyEdit(catalog, { ...back, due_date: '2026-10-20' }, { note: 'x' }, TODAY).due_date, TODAY, 'an older date is replaced by today');
  assert.equal(applyEdit(catalog, back, { due_date: '2026-10-30' }, TODAY).due_date, TODAY, 'the date cannot be moved');
  // any other content: the plan is asked, the result is Chưa xử lý
  const open = applyEdit(catalog, back, { cause_code: 'KH_HEN_PHAT_LAI' }, TODAY);
  assert.deepEqual([open.plan_code, open.result_code, open.due_date], ['', 'CHUA_XU_LY', ''], 'back to a normal content: the plan is asked again, the result is Chưa xử lý');
  assert.deepEqual(Object.keys(validateForm(catalog, open, TODAY)), ['plan_code']);
  const other = applyEdit(catalog, emptyForm(), { cause_code: OTHER_CODE, cause_text: 'x y' }, TODAY);
  assert.equal(other.result_code, 'CHUA_XU_LY');
  assert.equal(applyEdit(catalog, { ...other, result_code: 'DA_XU_LY' }, { note: 'n' }, TODAY).result_code, 'CHUA_XU_LY', 'a result typed by hand is overwritten');
  assert.equal(applyEdit(catalog, emptyForm(), { note: 'n' }, TODAY).result_code, '', 'no content, no result');
  // the same content kept: the other cells are left alone
  const kept = applyEdit(catalog, { ...emptyForm(), cause_code: 'KH_HEN_PHAT_LAI', plan_code: 'LIEN_HE_BC_GOC' }, { note: 'x' }, TODAY);
  assert.equal(kept.plan_code, 'LIEN_HE_BC_GOC');
});

test('result colours, the "still in stock after Đã xử lý" warning and the readable reasons of a refused row', () => {
  assert.equal(resultMeta('DA_XU_LY').label, 'Đã xử lý');
  assert.notEqual(resultMeta('DA_XU_LY').className, resultMeta('CHUA_XU_LY').className);
  assert.equal(resultMeta('').label, 'Chưa rà soát');
  assert.equal(resultMeta(undefined).className, RESULT_META.NONE.className);
  assert.equal(needsRecheck({ handling: { recheck: true } }), true);
  assert.equal(needsRecheck({ handling: { recheck: false } }), false);
  assert.equal(needsRecheck({}), false);
  const described = describeSaveResult({
    saved: 1,
    results: [
      { item_code: 'A1', status: 'SAVED' },
      { item_code: 'A2', status: 'SKIPPED', reason: 'INVALID', errors: [{ field: 'cause_text', message: 'Nhập nội dung "Khác" cho nội dung xử lý' }] },
      { item_code: 'A3', status: 'SKIPPED', reason: 'RECHECK_REQUIRED' },
    ],
  });
  assert.ok(described.lines.some((line) => line.startsWith('A2: Nhập nội dung "Khác"')), 'the missing field is named per parcel');
  assert.ok(described.lines.some((line) => line.includes('đã xử lý nhưng vẫn còn tồn')));
});

test('a draft the server cannot ever save is dropped from the unsaved count; fixable ones stay', () => {
  const drafts = { A1: emptyForm(), A2: emptyForm(), A3: emptyForm(), A4: emptyForm() };
  const left = remainingDrafts(drafts, { results: [
    { item_code: 'A1', status: 'SAVED' },
    { item_code: 'A2', status: 'SKIPPED', reason: 'NOT_IN_STOCK' },
    { item_code: 'A3', status: 'SKIPPED', reason: 'INVALID' },
    { item_code: 'A4', status: 'SKIPPED', reason: 'OUT_OF_SCOPE' },
  ] });
  assert.deepEqual(Object.keys(left), ['A3']);
  const described = describeSaveResult({ saved: 0, results: [{ item_code: 'A1', status: 'SKIPPED', reason: 'UNCHANGED' }] });
  assert.ok(described.lines.some((line) => line.includes('không đổi so với lần nhập trước')));
});
