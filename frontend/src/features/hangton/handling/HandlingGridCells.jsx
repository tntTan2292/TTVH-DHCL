import React from 'react';
import {
  KINDS, KIND_LABELS, OTHER_CODE, asksText, needsDueDate, validateForm, localToday, planSummary, autoOf, resultMeta,
} from './handlingModel.js';

const INPUT = 'w-full min-w-[8rem] rounded-md border bg-white px-1 py-0.5 text-[12.5px] text-slate-800 focus:border-rose-500 focus:outline-none';
const BAD = 'border-rose-400 bg-rose-50/60';
const OK = 'border-slate-300';
const LOCKED = 'w-full min-w-[8rem] cursor-not-allowed rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[12.5px] text-slate-500';
const RESULT_BASE = 'w-full min-w-[8rem] rounded-md border px-1 py-0.5 text-[12.5px] font-semibold focus:border-rose-500 focus:outline-none';

// The cells of one parcel row that hold the handling: Nguyên nhân, Hướng xử lý (with its date), Kết quả, Ghi chú and,
// when editable, the "Lưu" cell. With `editable` they are the entry fields (the web way of filling what the Excel file
// holds); otherwise the last entry is shown as text. `form` = values shown, `dirty` = the person changed them and has
// not confirmed yet, `flagged` = a save was tried while something was missing (the empty cells turn red).
export default function HandlingGridCells({
  row, catalog, form, editable = false, dirty = false, flagged = false, saving = false, today = localToday(), onChange, onSave, onDiscard,
}) {
  const last = row.handling?.last;
  if (!editable) {
    return (
      <>
        <td className="py-1.5 px-2 whitespace-nowrap text-slate-700">{last?.cause_label || <span className="text-slate-400">—</span>}</td>
        <td className="py-1.5 px-2 whitespace-nowrap text-slate-700">{last ? planSummary(last) : <span className="text-slate-400">—</span>}</td>
        <td className="py-1.5 px-2 whitespace-nowrap">
          <span className={`inline-block rounded-md border px-2 py-0.5 text-[12.5px] font-semibold ${resultMeta(last?.result_code).className}`}>{resultMeta(last?.result_code).label}</span>
        </td>
        <td className="max-w-[220px] truncate py-1.5 px-2 text-slate-600" title={last?.note || ''}>{last?.note || <span className="text-slate-400">—</span>}</td>
      </>
    );
  }

  const errors = flagged && dirty ? validateForm(catalog, form, today) : {};
  const cls = (field) => `${INPUT} ${errors[field] ? BAD : OK}`;
  const tint = dirty ? 'bg-amber-50/70' : '';
  const dueRequired = needsDueDate(catalog, form);
  const auto = autoOf(catalog, form);
  const optionsOf = (kind) => catalog?.kinds?.find((k) => k.kind === kind)?.options || [];

  const select = (kind) => (
    <select
      value={form[`${kind}_code`]}
      onChange={(e) => onChange({ [`${kind}_code`]: e.target.value })}
      disabled={saving}
      className={cls(`${kind}_code`)}
      aria-label={`${KIND_LABELS[kind]} của ${row.item_code}`}
    >
      <option value="">— Chọn —</option>
      {optionsOf(kind).map((o) => (<option key={o.code} value={o.code}>{o.label}</option>))}
    </select>
  );
  const detail = (kind) => {
    const code = form[`${kind}_code`];
    if (code !== OTHER_CODE && !asksText(catalog, kind, code)) return null;
    return (
      <input
        type="text"
        value={form[`${kind}_text`]}
        maxLength={catalog?.text_max || 200}
        onChange={(e) => onChange({ [`${kind}_text`]: e.target.value })}
        disabled={saving}
        placeholder={code === OTHER_CODE ? 'Gõ nội dung khác...' : 'Ghi rõ (không bắt buộc)'}
        className={`${cls(`${kind}_text`)} mt-1`}
        aria-label={`${KIND_LABELS[kind]} (chi tiết) của ${row.item_code}`}
      />
    );
  };

  const missing = Object.keys(errors).length > 0
    ? KINDS.filter((k) => errors[`${k}_code`] || errors[`${k}_text`]).map((k) => KIND_LABELS[k].toLowerCase()).concat(errors.due_date ? ['ngày'] : [])
    : [];

  return (
    <>
      <td className={`py-1 px-1 align-top ${tint}`}>{select('cause')}{detail('cause')}</td>
      <td className={`py-1 px-1 align-top ${tint}`}>
        {auto ? (<div className={LOCKED} title="Tự động theo nguyên nhân, không cần chọn">{auto.needs_due ? auto.plan_label : '— (tự động)'}</div>) : select('plan')}
        {auto ? null : detail('plan')}
        {dueRequired ? (
          <input
            type="date"
            value={form.due_date}
            min={today}
            onChange={(e) => onChange({ due_date: e.target.value })}
            disabled={saving}
            className={`${cls('due_date')} mt-1`}
            title="Chọn ngày phát lại / chuyển hoàn (bắt buộc)"
            aria-label={`Ngày phát lại hoặc chuyển hoàn của ${row.item_code}`}
          />
        ) : null}
      </td>
      <td className={`py-1 px-1 align-top ${tint}`}>
        {auto ? (
          <div className={`${RESULT_BASE} ${resultMeta(auto.result_code).className}`} title="Tự động theo nguyên nhân">{auto.result_label}</div>
        ) : (
          <select
            value={form.result_code}
            onChange={(e) => onChange({ result_code: e.target.value })}
            disabled={saving}
            className={`${RESULT_BASE} ${errors.result_code ? BAD : resultMeta(form.result_code).className}`}
            aria-label={`Kết quả xử lý của ${row.item_code}`}
          >
            <option value="">Chưa rà soát</option>
            {optionsOf('result').map((o) => (<option key={o.code} value={o.code}>{o.label}</option>))}
          </select>
        )}
      </td>
      <td className={`py-1 px-1 align-top ${tint}`}>
        <input
          type="text"
          value={form.note}
          maxLength={catalog?.note_max || 500}
          onChange={(e) => onChange({ note: e.target.value })}
          disabled={saving}
          placeholder="Ghi chú"
          className={`${INPUT} ${OK}`}
          aria-label={`Ghi chú của ${row.item_code}`}
        />
      </td>
      <td className={`py-1 px-1 align-top ${tint}`} data-no-capture="true">
        {dirty ? (
          <div className="flex min-w-[4rem] flex-col items-start gap-0.5">
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="cursor-pointer rounded-md border border-emerald-700 bg-emerald-700 px-2.5 py-0.5 text-[12.5px] font-bold text-white shadow-2xs hover:bg-emerald-800 disabled:opacity-40"
              title="Lưu riêng bưu gửi này"
            >
              Lưu
            </button>
            <button type="button" disabled={saving} onClick={onDiscard} className="cursor-pointer text-xs font-semibold text-slate-500 hover:underline">Bỏ nhập</button>
            {missing.length > 0 ? (<p className="text-xs font-semibold text-rose-600">Thiếu: {missing.join(', ')}</p>) : null}
          </div>
        ) : (<span className="text-slate-300">—</span>)}
      </td>
    </>
  );
}
