// HANGTON-HANDLING-01: pure helpers of the stock-handling follow-up (no React): the form, review states, labels and the
// readable outcome of a save. The rules mirror backend/src/services/hangtonInventory/handling/catalog.js; the backend
// has the last word.

export const OTHER_CODE = 'OTHER';
export const KINDS = Object.freeze(['cause', 'plan', 'result']);
export const KIND_LABELS = Object.freeze({ cause: 'Nguyên nhân tồn', plan: 'Hướng xử lý', result: 'Kết quả xử lý' });

export const STATE_META = Object.freeze({
  DONE: { label: 'Đã rà soát', badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  STALE: { label: 'Chờ xác nhận lại', badgeClass: 'border-amber-200 bg-amber-50 text-amber-800' },
  NONE: { label: 'Chưa rà soát', badgeClass: 'border-rose-200 bg-rose-50 text-rose-800' },
});

// Still in stock although it was marked "Đã xử lý" on an earlier day: the cause has to be looked at again.
export const RECHECK_META = Object.freeze({
  label: 'Đã xử lý nhưng còn tồn',
  note: 'Trạng thái Đã xử lý chỉ đúng khi Chuyển hoàn vào ngày hiện tại',
  hint: 'Bưu gửi từng được ghi "Đã xử lý" nhưng vẫn còn trong danh sách tồn. Kiểm tra lại nguyên nhân và nhập lại. Trạng thái Đã xử lý chỉ đúng khi Chuyển hoàn vào ngày hiện tại.',
  badgeClass: 'border-orange-400 bg-orange-100 text-orange-900',
});

// Colours of the result, the same on the table and in the Excel file: Đã xử lý green, Chưa xử lý orange, not reviewed rose.
export const RESULT_META = Object.freeze({
  DA_XU_LY: { label: 'Đã xử lý', className: 'border-emerald-400 bg-emerald-100 text-emerald-900' },
  CHUA_XU_LY: { label: 'Chưa xử lý', className: 'border-orange-400 bg-orange-100 text-orange-900' },
  NONE: { label: 'Chưa rà soát', className: 'border-rose-300 bg-rose-50 text-rose-800' },
});

export function resultMeta(code) {
  return RESULT_META[code] || RESULT_META.NONE;
}

/** The parcel was settled on an earlier day ("Đã xử lý") yet is still listed: show the warning (backend: handling.recheck). */
export function needsRecheck(row) {
  return Boolean(row?.handling?.recheck);
}

// Filter of the parcel list by review state (value = backend ?review=).
export const REVIEW_FILTER_OPTIONS = Object.freeze([
  { value: '', label: 'Mọi trạng thái rà soát' },
  { value: 'pending', label: 'Chưa rà soát hôm nay' },
  { value: 'done', label: 'Đã rà soát hôm nay' },
  { value: 'never', label: 'Chưa từng rà soát' },
  { value: 'stale', label: 'Đã có thông tin cũ, chờ xác nhận' },
]);

export const ACTION_LABELS = Object.freeze({
  REVIEW: 'Rà soát',
  KEEP: 'Giữ nguyên',
  EDIT: 'Sửa trong ngày',
  EDIT_APPROVED: 'Sửa sau phê duyệt',
});

const SKIP_REASONS = Object.freeze({
  NOT_IN_STOCK: 'không còn trong mốc hàng tồn mới nhất',
  OUT_OF_SCOPE: 'thuộc bưu cục ngoài phạm vi của bạn',
  INVALID: 'nội dung chưa đầy đủ',
  NO_PREVIOUS: 'chưa có thông tin cũ để giữ nguyên',
  ALREADY_REVIEWED_TODAY: 'hôm nay đã rà soát',
  DUE_DATE_PASSED: 'ngày hẹn cũ đã qua, cần đặt ngày hẹn mới',
  NO_CODE: 'thiếu mã bưu gửi',
  UNCHANGED: 'dòng không đổi so với lần nhập trước (dùng "Giữ nguyên" nếu muốn giữ)',
  DUPLICATE_IN_BATCH: 'mã bưu gửi xuất hiện nhiều lần, chỉ dòng đầu được lưu',
  RECHECK_REQUIRED: 'đã xử lý nhưng vẫn còn tồn: kiểm tra lại nguyên nhân rồi nhập lại, không dùng "Giữ nguyên"',
});

export function localToday(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function emptyForm() {
  return {
    cause_code: '', cause_text: '', plan_code: '', plan_text: '', result_code: '', result_text: '', due_date: '', note: '',
  };
}

/** Form values from a stored entry (the last one, to carry it over). */
export function formFromEntry(entry) {
  if (!entry) return emptyForm();
  return {
    cause_code: entry.cause_code || '', cause_text: entry.cause_text || '',
    plan_code: entry.plan_code || '', plan_text: entry.plan_text || '',
    result_code: entry.result_code || '', result_text: entry.result_text || '',
    due_date: entry.due_date || '', note: entry.note || '',
  };
}

export function optionOf(catalog, kind, code) {
  return catalog?.kinds?.find((k) => k.kind === kind)?.options?.find((o) => o.code === code) || null;
}

/** True when the chosen answer takes an optional detail of its own ("Liên hệ Bưu cục gốc ..."). */
export function asksText(catalog, kind, code) {
  return Boolean(optionOf(catalog, kind, code)?.askText);
}

/** The cause settles the parcel by itself ("Phát thành công", "Chuyển hoàn"): { plan_code, plan_label, result_code, ... } or null. */
export function autoOf(catalog, form) {
  return optionOf(catalog, 'cause', form?.cause_code)?.auto || null;
}

/** True when the chosen plan or result asks for a due date ("ngày hẹn"). */
export function needsDueDate(catalog, form) {
  const auto = autoOf(catalog, form);
  if (auto) return Boolean(auto.needs_due);
  return ['plan', 'result'].some((kind) => optionOf(catalog, kind, form[`${kind}_code`])?.needsDue);
}

/** Errors by field; empty object = complete. Mirrors the backend so the person is told before saving. */
export function validateForm(catalog, form, today = localToday()) {
  const errors = {};
  const auto = autoOf(catalog, form);
  for (const kind of KINDS) {
    if (auto && kind !== 'cause') continue; // the cause answers the plan and the result
    const code = form[`${kind}_code`];
    if (!code || !optionOf(catalog, kind, code)) errors[`${kind}_code`] = `Chọn ${KIND_LABELS[kind].toLowerCase()}`;
    else if (code === OTHER_CODE && String(form[`${kind}_text`] || '').trim().length < 2) errors[`${kind}_text`] = 'Nhập nội dung "Khác"';
  }
  if (needsDueDate(catalog, form) && !form.due_date && !auto?.due_defaults_to_today) errors.due_date = 'Nhập ngày hẹn xử lý';
  else if (form.due_date && form.due_date < today) errors.due_date = 'Ngày hẹn không được trước hôm nay';
  return errors;
}

/** Payload `input` of the API: the text only travels with "Khác". */
export function buildInput(form, catalog = null) {
  const input = { due_date: form.due_date || '', note: form.note || '' };
  for (const kind of KINDS) {
    const code = form[`${kind}_code`];
    input[`${kind}_code`] = code;
    const takesText = code === OTHER_CODE || asksText(catalog, kind, code);
    input[`${kind}_text`] = takesText ? String(form[`${kind}_text`] || '').trim() : '';
  }
  return input;
}

/** The plan as written: "Phát lại ngày 29/10/2026", "Liên hệ Bưu cục gốc (BC Phú Bài)". */
export function planSummary(entry) {
  if (!entry) return '';
  let plan = entry.plan_label || '';
  const dated = Boolean(entry.due_date) && /ngày$/i.test(plan);
  if (dated) plan = `${plan} ${formatDate(entry.due_date)}`;
  const detail = entry.plan_code && entry.plan_code !== OTHER_CODE ? String(entry.plan_text || '').trim() : '';
  if (detail) plan = `${plan} (${detail})`;
  return plan;
}

/** One line for an entry: "Hướng xử lý → Kết quả" (a date that is not part of the plan wording is added as "hẹn dd/mm"). */
export function summarizeEntry(entry) {
  if (!entry) return '';
  const parts = [planSummary(entry), entry.result_label].filter(Boolean);
  const dated = Boolean(entry.due_date) && /ngày$/i.test(entry.plan_label || '');
  const due = entry.due_date && !dated ? ` (hẹn ${formatDate(entry.due_date)})` : '';
  return `${parts.join(' → ')}${due}`;
}

export function formatDate(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || '');
}

export function formatDateTime(ms) {
  if (!Number.isFinite(Number(ms))) return '';
  const d = new Date(Number(ms));
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function percent(rate, digits = 1) {
  if (rate === null || rate === undefined || !Number.isFinite(Number(rate))) return '—';
  return `${(Number(rate) * 100).toFixed(digits).replace('.', ',')}%`;
}

/** Readable outcome of a save: { tone, lines }. */
export function describeSaveResult(result) {
  if (!result) return { tone: 'error', lines: ['Không lưu được.'] };
  const lines = [`Đã lưu ${result.saved} bưu gửi.`];
  const skipped = (result.results || []).filter((r) => r.status === 'SKIPPED');
  if (skipped.length > 0) {
    const byReason = new Map();
    for (const r of skipped) byReason.set(r.reason, (byReason.get(r.reason) || 0) + 1);
    for (const [reason, n] of byReason) lines.push(`${n} bưu gửi bỏ qua: ${SKIP_REASONS[reason] || reason}.`);
    // what is missing, parcel by parcel (the first few), so the person knows which cell to fill
    const invalid = skipped.filter((r) => r.reason === 'INVALID' && Array.isArray(r.errors) && r.errors.length > 0);
    for (const r of invalid.slice(0, 5)) lines.push(`${r.item_code}: ${[...new Set(r.errors.map((e) => e.message))].join('; ')}.`);
    if (invalid.length > 5) lines.push(`... và ${invalid.length - 5} bưu gửi khác chưa đủ nội dung.`);
  }
  if (result.ignored_rows) lines.push(`${result.ignored_rows} dòng trong file không có nội dung xử lý nên được bỏ qua.`);
  return { tone: result.saved > 0 ? (skipped.length > 0 ? 'warning' : 'success') : 'error', lines };
}

/** Entry of today (a correction is allowed in place) vs older (a request to the chuyên quản is needed). */
export function isEditableToday(entry, today = localToday()) {
  return Boolean(entry) && entry.business_date === today;
}

/** The entry of each day that counts (highest id of a business_date): the only ones an edit request can target. */
export function effectiveEntries(entries = []) {
  const byDay = new Map();
  for (const e of entries) if (!byDay.has(e.business_date) || e.id > byDay.get(e.business_date).id) byDay.set(e.business_date, e);
  return new Set([...byDay.values()].map((e) => e.id));
}

/** Selection helpers for the checkbox column of the parcel list. */
export function toggleSelected(selected, code) {
  return selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code];
}

export function togglePage(selected, pageCodes) {
  const all = pageCodes.every((c) => selected.includes(c));
  if (all) return selected.filter((c) => !pageCodes.includes(c));
  return [...new Set([...selected, ...pageCodes])];
}

/** Which rows of a page may be ticked: reviewable (>= 5 days is the target, but any listed parcel can be entered). */
export function selectableCodes(rows = [], canWrite = false) {
  return canWrite ? rows.map((r) => r.item_code) : [];
}

/** Rows of the by-office statistics table in the chosen order (rate and counts as numbers). */
export function sortStatsRows(rows = [], sort = { field: 'needed', direction: 'desc' }) {
  const dir = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[sort.field];
    const y = b[sort.field];
    if (typeof x === 'string' || typeof y === 'string') return dir * String(x ?? '').localeCompare(String(y ?? ''), 'vi');
    return dir * ((Number(x) || 0) - (Number(y) || 0));
  });
}

// A save of more parcels than the server takes at once goes in several calls; this merges their answers.
export const SAVE_CHUNK = 2000;

export function chunkCodes(codes = [], size = SAVE_CHUNK) {
  const out = [];
  for (let i = 0; i < codes.length; i += size) out.push(codes.slice(i, i + size));
  return out;
}

export function mergeSaveResults(parts = []) {
  return parts.reduce((all, part) => ({
    saved: all.saved + (part?.saved || 0),
    skipped: all.skipped + (part?.skipped || 0),
    results: all.results.concat(part?.results || []),
    ignored_rows: all.ignored_rows + (part?.ignored_rows || 0),
  }), { saved: 0, skipped: 0, results: [], ignored_rows: 0 });
}

// ---- direct entry in the parcel table (the web way of filling what the Excel file holds) ------------------------------

/** Values shown in the row's cells: what the person typed (a draft), else the last entry of the parcel. */
export function rowForm(row, drafts = {}) {
  return drafts[row.item_code] || formFromEntry(row?.handling?.last);
}

/** A change in one cell: merges it, and drops the date when the plan no longer asks for one. */
export function applyEdit(catalog, form, patch, today = localToday()) {
  const next = { ...form, ...patch };
  if (patch.cause_code !== undefined) {
    const auto = autoOf(catalog, next);
    if (auto) {
      // "Phát thành công" / "Chuyển hoàn": the plan is locked and the result is Đã xử lý; Chuyển hoàn takes today as its date
      Object.assign(next, { plan_code: auto.plan_code, plan_text: '', result_code: auto.result_code, result_text: '' });
      if (auto.needs_due && !next.due_date && auto.due_defaults_to_today) next.due_date = today;
    } else if (autoOf(catalog, form)) {
      Object.assign(next, { plan_code: '', plan_text: '', result_code: '', result_text: '', due_date: '' });
    }
  }
  if (!needsDueDate(catalog, next)) next.due_date = '';
  return next;
}

/** Drafts split into the complete ones (ready to confirm) and the codes still missing something. */
export function splitDrafts(catalog, drafts = {}, today = localToday()) {
  const ready = [];
  const incomplete = [];
  for (const [code, form] of Object.entries(drafts)) {
    if (Object.keys(validateForm(catalog, form, today)).length === 0) ready.push({ item_code: code, input: buildInput(form, catalog) });
    else incomplete.push(code);
  }
  return { ready, incomplete };
}

// A draft the server refused for a reason that typing cannot fix is dropped, so it does not stay in the unsaved count.
const UNSAVABLE = Object.freeze(['NOT_IN_STOCK', 'OUT_OF_SCOPE', 'NO_CODE']);

/** Drafts left after a save: the parcels the server saved are done, the skipped ones stay to be fixed (unless they cannot be). */
export function remainingDrafts(drafts = {}, result = null) {
  const saved = new Set((result?.results || [])
    .filter((r) => r.status === 'SAVED' || (r.status === 'SKIPPED' && UNSAVABLE.includes(r.reason)))
    .map((r) => r.item_code));
  return Object.fromEntries(Object.entries(drafts).filter(([code]) => !saved.has(code)));
}
