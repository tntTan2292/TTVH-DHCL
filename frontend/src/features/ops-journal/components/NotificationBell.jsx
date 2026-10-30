import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ClipboardList, MessageSquareText, BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import opsJournalAdapter from '../api/opsJournalApi.js';
import { timeAgoText } from '../opsJournalHelpers.js';

const POLL_MS = 60 * 1000;

const KIND_STYLE = {
  ASSIGNED: { Icon: ClipboardList, tone: 'bg-blue-50 text-blue-700', label: 'Giao việc' },
  REPORTED: { Icon: MessageSquareText, tone: 'bg-amber-50 text-amber-700', label: 'Báo cáo' },
  DONE: { Icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-700', label: 'Hoàn thành' },
};

/**
 * The bell above the signed-in user (PO 2026-10-30): new task, a report came in, a row accepted. It stays hidden until the module
 * ever notified this user, so people outside the journal see nothing. Click an item: it is marked read and the right screen opens.
 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const [state, setState] = useState({ items: [], unread: 0, hasAny: false });
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await opsJournalAdapter.getNotifications();
      if (res?.success && res.data) setState(res.data);
    } catch {
      /* a failed poll keeps what is shown */
    }
  }, []);

  useEffect(() => {
    load();
    const timer = globalThis.setInterval(load, POLL_MS);
    const onFocus = () => load();
    globalThis.addEventListener?.('focus', onFocus);
    return () => {
      globalThis.clearInterval(timer);
      globalThis.removeEventListener?.('focus', onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    globalThis.document.addEventListener('mousedown', onDown);
    return () => globalThis.document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!state.hasAny) return null;

  const markAll = async () => {
    await opsJournalAdapter.markNotificationsRead({ all: true });
    load();
  };

  const openItem = async (item) => {
    setOpen(false);
    if (!item.read) {
      await opsJournalAdapter.markNotificationsRead({ ids: [item.id] });
      load();
    }
    if (item.target === 'MANAGER') navigate(`/ops-journal?tab=composer&date=${encodeURIComponent(item.day || '')}`);
    else navigate('/ops-journal/my-tasks');
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); if (!open) load(); }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/70 text-slate-700 shadow-2xs backdrop-blur-xs transition-all hover:bg-slate-100 active:scale-95 cursor-pointer"
        title="Thông báo"
        aria-label={state.unread ? `Thông báo, ${state.unread} chưa đọc` : 'Thông báo'}
        aria-expanded={open}
      >
        <Bell size={17} />
        {state.unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-600 px-1 text-center text-[10px] font-extrabold leading-[18px] text-white ring-2 ring-white">
            {state.unread > 99 ? '99+' : state.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[22rem] max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" role="dialog" aria-label="Danh sách thông báo">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
            <span className="text-xs font-extrabold text-slate-800">Thông báo{state.unread ? ` (${state.unread} chưa đọc)` : ''}</span>
            <button
              type="button"
              onClick={markAll}
              disabled={!state.unread}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-50 cursor-pointer disabled:cursor-not-allowed disabled:text-slate-300"
            >
              <CheckCheck size={13} />
              Đánh dấu đã đọc
            </button>
          </div>
          <ul className="max-h-[26rem] divide-y divide-slate-100 overflow-y-auto">
            {state.items.map((item) => {
              const style = KIND_STYLE[item.kind] || KIND_STYLE.ASSIGNED;
              const Icon = style.Icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 cursor-pointer ${item.read ? '' : 'bg-blue-50/40'}`}
                  >
                    <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.tone}`}>
                      <Icon size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`text-xs leading-snug break-words ${item.read ? 'font-semibold text-slate-700' : 'font-extrabold text-slate-900'}`}>{item.title}</span>
                        {!item.read && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="Chưa đọc" />}
                      </span>
                      <span className="mt-0.5 block whitespace-pre-line text-[11px] leading-snug text-slate-600">{item.body}</span>
                      <span className="mt-1 block text-[10px] font-medium text-slate-400">
                        {timeAgoText(item.createdAt)} • {new Date(item.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
