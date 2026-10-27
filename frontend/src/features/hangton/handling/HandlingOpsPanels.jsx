import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchHandlingEditRequests, decideHandlingEditRequest, fetchUngroupedReasons, fetchReasonGroups, mapHandlingReason,
  fetchHandlingLog, handlingErrorMessage,
} from '../api/hangtonClient.js';
import { ACTION_LABELS, KIND_LABELS, formatDate, formatDateTime, summarizeEntry } from './handlingModel.js';
import { formatNumber } from '../hangtonLevels.js';

const BOX = 'rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4';
const BTN = 'cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-bold shadow-2xs disabled:opacity-50';

function Notice({ notice }) {
  if (!notice) return null;
  const cls = notice.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900';
  return <p className={`rounded-lg border px-3 py-2 text-sm font-semibold ${cls}`}>{notice.text}</p>;
}

function Entry({ entry, title }) {
  if (!entry) return null;
  return (
    <div className="rounded-lg bg-slate-50 p-2.5 text-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-0.5 text-slate-800"><strong>{entry.cause_label}</strong> · {summarizeEntry(entry)}</p>
      {entry.note ? <p className="text-xs text-slate-500">Ghi chú: {entry.note}</p> : null}
    </div>
  );
}

// Requests to correct an entry of a past day. A chuyên quản / admin of the office decides; others only look.
export function ApprovalsPanel({ onChanged }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchHandlingEditRequests({ status: status || undefined }));
    } catch (err) {
      setNotice({ tone: 'error', text: handlingErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const decide = async (row, approve) => {
    const note = approve ? '' : (window.prompt('Lý do từ chối (không bắt buộc):') ?? '');
    setBusy(row.id);
    try {
      await decideHandlingEditRequest(row.id, { approve, note });
      setNotice({ tone: 'ok', text: approve ? 'Đã phê duyệt: nội dung của ngày đó đã được sửa (bản cũ vẫn trong lịch sử).' : 'Đã từ chối yêu cầu sửa.' });
      await load();
      onChanged?.();
    } catch (err) {
      setNotice({ tone: 'error', text: handlingErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={BOX}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Yêu cầu sửa nội dung đã nhập</h3>
          <p className="text-sm text-slate-500">Nội dung của ngày đã qua chỉ được sửa khi Chuyên quản BCVH phê duyệt.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm" aria-label="Lọc theo trạng thái">
          <option value="PENDING">Chờ phê duyệt</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="REJECTED">Đã từ chối</option>
          <option value="">Tất cả</option>
        </select>
      </div>
      <Notice notice={notice} />
      {loading ? <p className="py-6 text-center text-slate-400">Đang tải...</p> : null}
      {!loading && rows.length === 0 ? <p className="py-6 text-center text-slate-400">Không có yêu cầu nào.</p> : null}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-700"><span className="font-mono font-black text-slate-900">{row.item_code}</span> · ngày {formatDate(row.business_date)} · {row.requested_by_name} · {formatDateTime(row.requested_at)}</p>
              <span className="text-xs font-bold text-slate-500">{row.status === 'PENDING' ? 'Chờ phê duyệt' : row.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">Lý do xin sửa: <strong>{row.reason}</strong></p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <Entry entry={row.current} title="Nội dung hiện tại" />
              <div className="rounded-lg bg-emerald-50 p-2.5 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Đề nghị sửa thành</p>
                <p className="mt-0.5 text-slate-800">
                  <strong>{row.proposed?.cause_code === 'OTHER' ? row.proposed.cause_text : row.proposed?.cause_code}</strong>
                  {' · '}{row.proposed?.plan_code === 'OTHER' ? row.proposed.plan_text : row.proposed?.plan_code}
                  {' → '}{row.proposed?.result_code === 'OTHER' ? row.proposed.result_text : row.proposed?.result_code}
                  {row.proposed?.due_date ? ` (hẹn ${formatDate(row.proposed.due_date)})` : ''}
                </p>
                {row.proposed?.note ? <p className="text-xs text-slate-500">Ghi chú: {row.proposed.note}</p> : null}
              </div>
            </div>
            {row.status === 'PENDING' && row.can_decide ? (
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" disabled={busy === row.id} onClick={() => decide(row, false)} className={`${BTN} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>Từ chối</button>
                <button type="button" disabled={busy === row.id} onClick={() => decide(row, true)} className={`${BTN} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700`}>Phê duyệt</button>
              </div>
            ) : null}
            {row.status === 'PENDING' && !row.can_decide ? <p className="mt-2 text-xs text-slate-400">Bạn không có quyền phê duyệt yêu cầu này.</p> : null}
            {row.decided_by_name ? <p className="mt-2 text-xs text-slate-500">{row.decided_by_name} · {formatDateTime(row.decided_at)}{row.decision_note ? ` · ${row.decision_note}` : ''}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

// "Gom nhóm lý do": wordings typed under "Khác" that no rule groups yet; one choice regroups old and new entries.
export function ReasonsPanel({ onChanged }) {
  const [kind, setKind] = useState('cause');
  const [rows, setRows] = useState([]);
  const [groups, setGroups] = useState([]);
  const [choice, setChoice] = useState({});
  const [newLabel, setNewLabel] = useState({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, groupList] = await Promise.all([fetchUngroupedReasons(kind), fetchReasonGroups(kind)]);
      setRows(list);
      setGroups(groupList);
    } catch (err) {
      setNotice({ tone: 'error', text: handlingErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [kind]);
  useEffect(() => { load(); }, [load]);

  const apply = async (row) => {
    const key = row.norm_text;
    const label = (newLabel[key] || '').trim();
    try {
      await mapHandlingReason({ kind, text: row.sample_text, groupCode: label ? undefined : choice[key], newGroupLabel: label || undefined });
      setNotice({ tone: 'ok', text: `Đã gom “${row.sample_text}” — áp dụng cho cả dữ liệu cũ và mới.` });
      await load();
      onChanged?.();
    } catch (err) {
      setNotice({ tone: 'error', text: handlingErrorMessage(err) });
    }
  };

  return (
    <div className={BOX}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Gom nhóm lý do</h3>
          <p className="text-sm text-slate-500">Nội dung người dùng tự gõ ở mục “Khác” mà hệ thống chưa tự gom được. Chọn một nhóm để thống kê không bị loãng; nội dung gốc vẫn được giữ nguyên.</p>
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm" aria-label="Loại nội dung">
          {Object.entries(KIND_LABELS).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
        </select>
      </div>
      <Notice notice={notice} />
      {loading ? <p className="py-6 text-center text-slate-400">Đang tải...</p> : null}
      {!loading && rows.length === 0 ? <p className="py-6 text-center text-slate-400">Không còn nội dung nào cần gom nhóm.</p> : null}
      <ul className="divide-y divide-slate-100">
        {rows.map((row) => (
          <li key={row.norm_text} className="flex flex-col gap-2 py-3 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900" title={row.sample_text}>“{row.sample_text}”</p>
              <p className="text-xs text-slate-500">{formatNumber(row.n)} lần nhập</p>
            </div>
            <select
              value={choice[row.norm_text] || ''}
              onChange={(e) => setChoice((c) => ({ ...c, [row.norm_text]: e.target.value }))}
              disabled={Boolean(newLabel[row.norm_text])}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm md:w-64"
              aria-label="Gom vào nhóm"
            >
              <option value="">— Gom vào nhóm có sẵn —</option>
              {groups.map((g) => (<option key={g.code} value={g.code}>{g.label}</option>))}
            </select>
            <input
              type="text"
              value={newLabel[row.norm_text] || ''}
              onChange={(e) => setNewLabel((c) => ({ ...c, [row.norm_text]: e.target.value }))}
              placeholder="hoặc tạo nhóm mới..."
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm md:w-52"
              aria-label="Tên nhóm mới"
            />
            <button
              type="button"
              disabled={!choice[row.norm_text] && !(newLabel[row.norm_text] || '').trim()}
              onClick={() => apply(row)}
              className={`${BTN} border-rose-600 bg-rose-600 text-white hover:bg-rose-700`}
            >
              Gom nhóm
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Everything entered, newest first, by day (audit view).
export function LogPanel({ defaultDate }) {
  const [date, setDate] = useState(defaultDate || '');
  const [data, setData] = useState({ total: 0, rows: [] });
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchHandlingLog({ date: date || undefined, limit });
        if (active) setData(res);
      } catch (err) {
        if (active) setError(handlingErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [date, limit]);

  return (
    <div className={BOX}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Nhật ký nhập xử lý</h3>
          <p className="text-sm text-slate-500">Mọi lần nhập, theo từng ngày; không xóa, không ghi đè.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Ngày
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm" />
          {date ? <button type="button" onClick={() => setDate('')} className="cursor-pointer text-xs font-bold text-rose-600 hover:underline">Tất cả ngày</button> : null}
        </label>
      </div>
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[13px] font-bold uppercase tracking-wider text-slate-700">
              <th className="py-2 px-3">Thời điểm</th><th className="py-2 px-3">Ngày</th><th className="py-2 px-3">Bưu gửi</th><th className="py-2 px-3">Bưu cục</th>
              <th className="py-2 px-3">Nội dung</th><th className="py-2 px-3">Hành động</th><th className="py-2 px-3">Người nhập</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">Đang tải...</td></tr>
            ) : data.rows.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">Chưa có lần nhập nào.</td></tr>
            ) : data.rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70">
                <td className="py-2 px-3 whitespace-nowrap text-slate-600">{formatDateTime(r.created_at)}</td>
                <td className="py-2 px-3 whitespace-nowrap">{formatDate(r.business_date)}</td>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.item_code}</td>
                <td className="py-2 px-3">{r.office || '—'}</td>
                <td className="py-2 px-3 text-slate-700"><strong>{r.cause_label}</strong> · {summarizeEntry(r)}</td>
                <td className="py-2 px-3 whitespace-nowrap">{ACTION_LABELS[r.action] || r.action}</td>
                <td className="py-2 px-3 whitespace-nowrap">{r.actor_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Hiển thị <strong>{formatNumber(data.rows.length)}</strong> / <strong>{formatNumber(data.total)}</strong> lần nhập</span>
        {data.rows.length < data.total ? (
          <button type="button" onClick={() => setLimit((n) => n + 200)} className={`${BTN} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>Xem thêm</button>
        ) : null}
      </div>
    </div>
  );
}
