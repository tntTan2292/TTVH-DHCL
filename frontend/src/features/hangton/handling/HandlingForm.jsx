import React, { useMemo, useState } from 'react';
import {
  KINDS, KIND_LABELS, OTHER_CODE, needsDueDate, asksText, validateForm, buildInput, localToday, autoOf, applyEdit, resultMeta, formatDate,
} from './handlingModel.js';

const FIELD = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-none';

// The entry form of one review: three required questions (each with "Khác" for free text), due date when asked, note.
// onSubmit receives the API `input`. extra (optional) is rendered above the buttons (e.g. the reason of an edit request).
export default function HandlingForm({
  catalog, initial, submitLabel = 'Lưu rà soát', submitting = false, onSubmit, onCancel, extraValid = true, today = localToday(), children,
}) {
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState(false);
  const errors = useMemo(() => validateForm(catalog, form, today), [catalog, form, today]);
  const dueRequired = needsDueDate(catalog, form);
  const auto = autoOf(catalog, form);
  const set = (patch) => setForm((current) => applyEdit(catalog, current, patch, today));
  const showError = (field) => (touched && errors[field] ? <p className="mt-0.5 text-xs font-semibold text-rose-600">{errors[field]}</p> : null);

  const submit = (event) => {
    event.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length > 0 || !extraValid) return;
    onSubmit(buildInput(form, catalog));
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {KINDS.map((kind) => {
        const options = catalog?.kinds?.find((k) => k.kind === kind)?.options || [];
        const code = form[`${kind}_code`];
        if (kind === 'result' || (auto && kind === 'plan')) {
          // the result follows from the content; a settling content also locks the plan: nothing to choose
          const locked = kind === 'result'
            ? resultMeta(form.result_code)
            : { label: `${auto.plan_label}${auto.due_is_today ? ` ${formatDate(form.due_date || today)}` : ''}`, className: 'border-slate-200 bg-slate-100 text-slate-500' };
          return (
            <div key={kind}>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">{KIND_LABELS[kind]}</label>
              <div className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-semibold ${locked.className}`}>
                {locked.label} <span className="font-normal opacity-70">· tự động theo nội dung xử lý</span>
              </div>
            </div>
          );
        }
        return (
          <div key={kind}>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
              {KIND_LABELS[kind]} <span className="text-rose-600">*</span>
            </label>
            <select
              value={code}
              onChange={(e) => set({ [`${kind}_code`]: e.target.value })}
              className={FIELD}
              aria-label={KIND_LABELS[kind]}
            >
              <option value="">— Chọn —</option>
              {options.map((o) => (<option key={o.code} value={o.code}>{o.label}</option>))}
            </select>
            {showError(`${kind}_code`)}
            {code === OTHER_CODE || asksText(catalog, kind, code) ? (
              <>
                <input
                  type="text"
                  value={form[`${kind}_text`]}
                  maxLength={catalog?.text_max || 200}
                  onChange={(e) => set({ [`${kind}_text`]: e.target.value })}
                  placeholder={code === OTHER_CODE ? 'Tự nhập nội dung...' : 'Ghi rõ chi tiết (không bắt buộc)'}
                  className={`${FIELD} mt-1.5`}
                  aria-label={`${KIND_LABELS[kind]} (${code === OTHER_CODE ? 'tự nhập' : 'chi tiết'})`}
                />
                {showError(`${kind}_text`)}
              </>
            ) : null}
          </div>
        );
      })}

      {dueRequired && !auto ? (
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
          Ngày phát lại / chuyển hoàn <span className="text-rose-600">*</span>
        </label>
        <input
          type="date"
          value={form.due_date}
          min={today}
          onChange={(e) => set({ due_date: e.target.value })}
          className={FIELD}
          aria-label="Ngày hẹn xử lý"
        />
        {showError('due_date')}
      </div>
      ) : null}

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Ghi chú</label>
        <textarea
          value={form.note}
          rows={2}
          maxLength={catalog?.note_max || 500}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="Ghi chú thêm (không bắt buộc)"
          className={FIELD}
        />
      </div>

      {children}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Hủy
          </button>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded-lg border border-rose-600 bg-rose-600 px-4 py-1.5 text-sm font-bold text-white shadow-2xs hover:bg-rose-700 disabled:opacity-50"
        >
          {submitting ? 'Đang lưu...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
