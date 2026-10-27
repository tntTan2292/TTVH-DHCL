import React, { useCallback, useEffect, useState } from 'react';
import { X, History, ClipboardEdit } from 'lucide-react';
import HandlingForm from './HandlingForm.jsx';
import {
  ACTION_LABELS, STATE_META, RECHECK_META, needsRecheck, formFromEntry, emptyForm, summarizeEntry, planSummary, formatDate, formatDateTime,
  describeSaveResult, effectiveEntries, localToday,
} from './handlingModel.js';
import {
  fetchHandlingHistory, saveHandlingEntries, createHandlingEditRequest, handlingErrorMessage,
} from '../api/hangtonClient.js';

const REQUEST_STATUS = Object.freeze({
  PENDING: { label: 'Chờ phê duyệt', cls: 'border-amber-200 bg-amber-50 text-amber-800' },
  APPROVED: { label: 'Đã duyệt', cls: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  REJECTED: { label: 'Từ chối', cls: 'border-rose-200 bg-rose-50 text-rose-800' },
});

function EntryCard({ entry, children }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="font-bold text-slate-800">{formatDate(entry.business_date)}</span>
        <span>{formatDateTime(entry.created_at)} · {ACTION_LABELS[entry.action] || entry.action}</span>
      </div>
      <dl className="mt-2 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-slate-500">Nguyên nhân</dt><dd className="font-semibold text-slate-800">{entry.cause_label}</dd>
        <dt className="text-slate-500">Hướng xử lý</dt><dd className="font-semibold text-slate-800">{planSummary(entry)}</dd>
        <dt className="text-slate-500">Kết quả</dt><dd className="font-semibold text-slate-800">{entry.result_label}</dd>
        {entry.due_date && !/ngày$/i.test(entry.plan_label || '') ? (<><dt className="text-slate-500">Ngày hẹn</dt><dd className="text-slate-800">{formatDate(entry.due_date)}</dd></>) : null}
        {entry.note ? (<><dt className="text-slate-500">Ghi chú</dt><dd className="text-slate-700">{entry.note}</dd></>) : null}
      </dl>
      <p className="mt-2 text-xs text-slate-500">
        Người nhập: <strong className="text-slate-700">{entry.actor_name}</strong>
        {entry.slot ? ` · mốc ${entry.slot}` : ''}
        {entry.approved_by_name ? ` · phê duyệt: ${entry.approved_by_name}` : ''}
      </p>
      {children}
    </li>
  );
}

// Right-hand panel for one parcel: enter / correct today's review, and the full history (with edit requests).
export default function HandlingDrawer({ row, catalog, canWrite, onClose, onSaved }) {
  const [tab, setTab] = useState(canWrite ? 'enter' : 'history');
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [editing, setEditing] = useState(null); // entry of a past day being corrected
  const [reason, setReason] = useState('');
  const today = localToday();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHistory(await fetchHandlingHistory(row.item_code));
    } catch (err) {
      setMessage({ tone: 'error', lines: [handlingErrorMessage(err)] });
    } finally {
      setLoading(false);
    }
  }, [row.item_code]);

  useEffect(() => { load(); }, [load]);

  const entries = history?.entries || [];
  const requests = history?.edit_requests || [];
  const todayEntry = [...entries].reverse().find((e) => e.business_date === today) || null;
  const last = entries.length ? [...entries].sort((a, b) => (a.business_date === b.business_date ? a.id - b.id : (a.business_date < b.business_date ? -1 : 1))).at(-1) : null;
  const effective = effectiveEntries(entries);
  const state = row.handling?.state || 'NONE';

  const save = async (mode, input) => {
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await saveHandlingEntries({ mode, itemCodes: [row.item_code], input });
      setMessage(describeSaveResult(result));
      await load();
      onSaved?.();
    } catch (err) {
      setMessage({ tone: 'error', lines: [handlingErrorMessage(err)] });
    } finally {
      setSubmitting(false);
    }
  };

  const sendRequest = async (input) => {
    setSubmitting(true);
    setMessage(null);
    try {
      await createHandlingEditRequest({ logId: editing.id, input, reason });
      setMessage({ tone: 'success', lines: ['Đã gửi yêu cầu sửa. Nội dung chỉ thay đổi sau khi Chuyên quản BCVH phê duyệt.'] });
      setEditing(null);
      setReason('');
      await load();
    } catch (err) {
      setMessage({ tone: 'error', lines: [handlingErrorMessage(err)] });
    } finally {
      setSubmitting(false);
    }
  };

  const tone = { success: 'border-emerald-200 bg-emerald-50 text-emerald-900', warning: 'border-amber-200 bg-amber-50 text-amber-900', error: 'border-rose-200 bg-rose-50 text-rose-900' };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" role="dialog" aria-modal="true" aria-label={`Xử lý bưu gửi ${row.item_code}`}>
      <div className="flex h-full w-full max-w-xl flex-col bg-slate-50 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Xử lý hàng tồn</p>
            <h3 className="truncate font-mono text-lg font-black text-slate-900">{row.item_code}</h3>
            <p className="mt-0.5 text-sm text-slate-600">
              {row.office || '—'} · {row.ton_level} · {row.customer_class || '—'}
              {row.postman_name ? ` · ${row.postman_name}` : ''}
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              {row.status_name ? `Trạng thái TMS: ${row.status_name}` : ''}
              {row.cod ? ` · COD: ${new Intl.NumberFormat('vi-VN').format(row.cod)} đ` : ''}
            </p>
            {row.reason ? <p className="mt-0.5 text-sm text-slate-500">Lý do: {row.reason}</p> : null}
            <span className={`mt-1.5 inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${STATE_META[state].badgeClass}`}>{STATE_META[state].label}</span>
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X size={18} /></button>
        </div>

        <div className="flex gap-1 border-b border-slate-200 bg-white px-5">
          {canWrite ? (
            <button type="button" onClick={() => setTab('enter')} className={`inline-flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-bold ${tab === 'enter' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-500'}`}>
              <ClipboardEdit size={14} /> Nhập xử lý
            </button>
          ) : null}
          <button type="button" onClick={() => setTab('history')} className={`inline-flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-bold ${tab === 'history' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-500'}`}>
            <History size={14} /> Lịch sử xử lý ({entries.length})
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {message ? (
            <div className={`rounded-lg border px-3 py-2 text-sm font-semibold ${tone[message.tone] || tone.error}`}>
              {message.lines.map((line) => (<p key={line}>{line}</p>))}
            </div>
          ) : null}

          {loading ? <p className="py-8 text-center text-slate-400">Đang tải...</p> : null}

          {!loading && tab === 'enter' && canWrite ? (
            <>
              {needsRecheck(row) ? (
                <div className="rounded-xl border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">
                  <p className="font-bold">⚠ {RECHECK_META.label}</p>
                  <p className="mt-0.5">{RECHECK_META.hint}</p>
                </div>
              ) : null}
              {state === 'STALE' && last && !needsRecheck(row) ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-bold">Đã có thông tin của {formatDate(last.business_date)}: {summarizeEntry(last)}</p>
                  <p className="mt-0.5">Bưu gửi vẫn còn tồn. Bấm “Giữ nguyên” nếu không có gì thay đổi, hoặc cập nhật bên dưới.</p>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => save('KEEP')}
                    className="mt-2 cursor-pointer rounded-lg border border-amber-600 bg-amber-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    Giữ nguyên như {formatDate(last.business_date)}
                  </button>
                </div>
              ) : null}
              {todayEntry ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  Hôm nay đã rà soát. Sửa nội dung bên dưới sẽ lưu thành một bản mới trong ngày; bản cũ vẫn xem được trong lịch sử.
                </p>
              ) : null}
              <HandlingForm
                key={`${row.item_code}-${todayEntry?.id || last?.id || 'new'}`}
                catalog={catalog}
                initial={todayEntry ? formFromEntry(todayEntry) : (last ? formFromEntry(last) : emptyForm())}
                submitLabel={todayEntry ? 'Cập nhật hôm nay' : 'Lưu rà soát'}
                submitting={submitting}
                onSubmit={(input) => save('REVIEW', input)}
              />
            </>
          ) : null}

          {!loading && tab === 'history' ? (
            <>
              {entries.length === 0 ? <p className="py-6 text-center text-slate-400">Chưa có nhật ký xử lý nào cho bưu gửi này.</p> : null}
              <ul className="space-y-3">
                {[...entries].reverse().map((entry) => {
                  const pending = requests.some((r) => r.log_id === entry.id && r.status === 'PENDING');
                  const canRequest = canWrite && entry.business_date < today && effective.has(entry.id) && !pending;
                  return (
                    <EntryCard key={entry.id} entry={entry}>
                      {canRequest ? (
                        <button type="button" onClick={() => { setEditing(entry); setReason(''); setMessage(null); }} className="mt-2 cursor-pointer text-xs font-bold text-rose-600 hover:underline">
                          Xin sửa nội dung ngày này
                        </button>
                      ) : null}
                      {pending ? <p className="mt-2 text-xs font-bold text-amber-700">Đang có yêu cầu sửa chờ Chuyên quản phê duyệt.</p> : null}
                    </EntryCard>
                  );
                })}
              </ul>

              {requests.length > 0 ? (
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Yêu cầu sửa</h4>
                  <ul className="space-y-2">
                    {requests.map((r) => (
                      <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800">Ngày {formatDate(r.business_date)} · {r.requested_by_name}</span>
                          <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${REQUEST_STATUS[r.status]?.cls}`}>{REQUEST_STATUS[r.status]?.label}</span>
                        </div>
                        <p className="mt-1 text-slate-600">Lý do: {r.reason}</p>
                        {r.decided_by_name ? <p className="mt-0.5 text-xs text-slate-500">{r.decided_by_name} · {formatDateTime(r.decided_at)}{r.decision_note ? ` · ${r.decision_note}` : ''}</p> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {editing ? (
                <div className="rounded-xl border-2 border-rose-200 bg-white p-4">
                  <h4 className="mb-2 text-sm font-bold text-slate-900">Xin sửa nội dung ngày {formatDate(editing.business_date)}</h4>
                  <p className="mb-3 text-xs text-slate-500">Nội dung cũ vẫn được giữ trong lịch sử. Chỉ thay đổi khi Chuyên quản BCVH phê duyệt.</p>
                  <HandlingForm
                    catalog={catalog}
                    initial={formFromEntry(editing)}
                    submitLabel="Gửi yêu cầu sửa"
                    submitting={submitting}
                    extraValid={reason.trim().length >= 5}
                    today={editing.business_date}
                    onSubmit={sendRequest}
                    onCancel={() => setEditing(null)}
                  >
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Lý do xin sửa <span className="text-rose-600">*</span></label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ví dụ: nhập nhầm nguyên nhân"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-2xs focus:border-rose-500 focus:outline-none"
                      />
                      <p className={`mt-0.5 text-xs ${reason.trim().length >= 5 ? 'text-slate-400' : 'font-semibold text-rose-600'}`}>Tối thiểu 5 ký tự</p>
                    </div>
                  </HandlingForm>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
