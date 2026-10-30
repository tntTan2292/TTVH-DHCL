import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, ChevronDown, ChevronRight, Clock, Lock, MessageSquareText, Paperclip, RefreshCw, Users } from 'lucide-react';
import opsJournalAdapter from './api/opsJournalApi.js';
import { filterAssigned, getIndicatorChipStyle, getVietnamToday, shiftDay, summarizeAssigned, timeAgoText } from './opsJournalHelpers.js';
import OpsJournalSpotCard from './components/OpsJournalSpotCard.jsx';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'waiting', label: 'Chờ xác nhận' },
  { key: 'open', label: 'Chưa báo cáo' },
  { key: 'done', label: 'Hoàn thành' },
];
const PRESETS = [{ days: 7, label: '7 ngày' }, { days: 14, label: '14 ngày' }, { days: 30, label: '30 ngày' }];
const dmy = (day) => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;
const noop = () => {};

/**
 * Step 3 of the Nhật ký điều hành: the finalized spots as ONE LINE each (grouped by day, newest first), so ten days of work stay
 * readable. A line says how the work stands; the full table (rows, reports, files, closing, Word / PDF) opens only on click.
 */
export default function OpsJournalAssignedPage({ initialDate = getVietnamToday(), flash = null, onNavigateToTab }) {
  const [to, setTo] = useState(initialDate);
  const [from, setFrom] = useState(shiftDay(initialDate, -13));
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ days: [], items: [] });
  const [alert, setAlert] = useState(flash ? { type: 'success', message: flash } : null);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState({}); // spot id -> the full manager spot, loaded on demand
  const [detailLoading, setDetailLoading] = useState(null);
  const [reopeningSpotId, setReopeningSpotId] = useState(null);
  const [markingDoneActionId, setMarkingDoneActionId] = useState(null);
  const [savingClosingSpotId, setSavingClosingSpotId] = useState(null);
  const [closingDay, setClosingDay] = useState(null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const res = await opsJournalAdapter.getAssigned(from, to);
      if (res.success) setData({ days: res.data?.days || [], items: res.data?.items || [] });
      else setAlert({ type: 'error', message: res.error?.message || 'Không thể tải danh sách giao việc.' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Lỗi kết nối khi tải danh sách giao việc.' });
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    setOpenId(null);
    setDetail({});
    load();
  }, [load]);

  const loadDetail = useCallback(async (id) => {
    const res = await opsJournalAdapter.getSpotForAssignee(id);
    if (res.success) setDetail((prev) => ({ ...prev, [id]: res.data }));
    else setAlert({ type: 'error', message: res.error?.message || 'Không thể tải chi tiết điểm đen.' });
    return res;
  }, []);

  const toggle = async (item) => {
    if (openId === item.id) {
      setOpenId(null);
      return;
    }
    setOpenId(item.id);
    if (!detail[item.id]) {
      setDetailLoading(item.id);
      try { await loadDetail(item.id); } finally { setDetailLoading(null); }
    }
  };

  // after any change: the open spot and the one-line summaries are re-read
  const refreshAfterChange = async (id) => {
    await Promise.all([loadDetail(id), load({ quiet: true })]);
  };

  const handleMarkDone = async (actionId) => {
    setMarkingDoneActionId(actionId);
    setAlert(null);
    try {
      const res = await opsJournalAdapter.markActionDone(actionId);
      if (res.success) {
        setAlert({ type: 'success', message: 'Đã xác nhận hoàn thành công việc.' });
        if (openId) await refreshAfterChange(openId);
      } else {
        setAlert({ type: 'error', message: res.error?.message || 'Không thể xác nhận hoàn thành.' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Lỗi khi xác nhận hoàn thành.' });
    } finally {
      setMarkingDoneActionId(null);
    }
  };

  const handleSaveClosing = async (spotId, closing) => {
    setSavingClosingSpotId(spotId);
    setAlert(null);
    try {
      const res = await opsJournalAdapter.saveClosing(spotId, closing);
      if (res.success) {
        setAlert({ type: 'success', message: 'Đã lưu kết quả cuối ngày.' });
        await refreshAfterChange(spotId);
      } else {
        setAlert({ type: 'error', message: res.error?.message || 'Không thể lưu kết quả cuối ngày.' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Lỗi khi lưu kết quả cuối ngày.' });
    } finally {
      setSavingClosingSpotId(null);
    }
  };

  const handleReopen = async (spotId, reason) => {
    setReopeningSpotId(spotId);
    setAlert(null);
    try {
      const res = await opsJournalAdapter.reopenSpot(spotId, { reason });
      if (res.success) {
        setOpenId(null);
        setDetail((prev) => { const next = { ...prev }; delete next[spotId]; return next; });
        setAlert({ type: 'success', message: 'Đã mở lại điểm đen về bản nháp. Chỉnh sửa tại bước 2 (Soạn nhật ký & Giao việc), rồi chốt lại.', link: true });
        await load({ quiet: true });
        return true;
      }
      setAlert({ type: 'error', message: res.error?.message || 'Không thể mở lại điểm đen.' });
      return false;
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Lỗi khi mở lại điểm đen.' });
      return false;
    } finally {
      setReopeningSpotId(null);
    }
  };

  const handleCloseDay = async (day) => {
    if (!globalThis.confirm?.(`Đóng nhật ký ngày ${dmy(day)}? Sau khi đóng, các điểm đen của ngày này không thể mở lại.`)) return;
    setClosingDay(day);
    setAlert(null);
    try {
      const res = await opsJournalAdapter.closeDay(day);
      if (res.success) {
        setAlert({ type: 'success', message: `Đã đóng nhật ký ngày ${dmy(day)}.` });
        setDetail({});
        await load({ quiet: true });
        if (openId) await loadDetail(openId);
      } else {
        setAlert({ type: 'error', message: res.error?.message || `Không thể đóng nhật ký ngày ${dmy(day)}.` });
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Lỗi khi đóng ngày.' });
    } finally {
      setClosingDay(null);
    }
  };

  const shown = useMemo(() => filterAssigned(data.items, filter), [data.items, filter]);
  const counts = useMemo(() => {
    const out = { all: data.items.length, waiting: 0, open: 0, done: 0 };
    for (const item of data.items) out[summarizeAssigned(item).state] += 1;
    return out;
  }, [data.items]);
  const byDay = useMemo(() => {
    const groups = [];
    for (const item of shown) {
      let group = groups.find((g) => g.day === item.day);
      if (!group) {
        group = { day: item.day, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }
    return groups;
  }, [shown]);
  const dayStatus = (day) => data.days.find((d) => d.day === day)?.status || 'ASSIGNED';

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-black tracking-tight text-slate-900">Nhật ký điều hành (PL06)</h1>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Bước 3: Danh sách giao việc</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Mỗi dòng là một điểm đen đã chốt: xem tiến độ ngay trên dòng, bấm vào để mở bảng chi tiết, báo cáo, file minh chứng và tải Word / PDF.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 shadow-2xs">
              <Calendar size={15} className="text-slate-500" />
              <label htmlFor="assigned-from" className="text-xs font-semibold text-slate-700">Từ</label>
              <input id="assigned-from" type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="cursor-pointer text-xs font-bold text-slate-900 focus:outline-none" />
              <label htmlFor="assigned-to" className="text-xs font-semibold text-slate-700">đến</label>
              <input id="assigned-to" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className="cursor-pointer text-xs font-bold text-slate-900 focus:outline-none" />
            </div>
            {PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                onClick={() => { const end = getVietnamToday(); setTo(end); setFrom(shiftDay(end, -(preset.days - 1))); }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
            <button type="button" onClick={() => load()} disabled={loading} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 shadow-2xs cursor-pointer disabled:opacity-50" title="Tải lại">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {alert && (
        <div role="alert" className={`flex items-center gap-3 rounded-xl border p-4 text-xs font-bold shadow-xs ${alert.type === 'success' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-rose-300 bg-rose-50 text-rose-900'}`}>
          {alert.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />}
          <div className="flex-1">{alert.message}</div>
          {alert.link && onNavigateToTab && (
            <button type="button" onClick={() => onNavigateToTab('composer')} className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-amber-800 hover:bg-amber-50 cursor-pointer">Sang bước 2 →</button>
          )}
          <button type="button" onClick={() => setAlert(null)} className="font-extrabold text-slate-400 hover:text-slate-600 cursor-pointer">×</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-slate-800">Lọc:</span>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 font-bold cursor-pointer ${filter === f.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {f.label} <span className="opacity-70">({counts[f.key]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-[var(--color-vnpost-orange)]" />
            <span className="text-xs font-semibold">Đang tải danh sách giao việc...</span>
          </div>
        </div>
      ) : byDay.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Calendar className="mb-3 h-10 w-10 text-slate-400" />
          <h3 className="text-base font-bold text-slate-800">{data.items.length ? 'Không có điểm đen nào khớp bộ lọc' : `Chưa có việc nào đã chốt từ ${dmy(from)} đến ${dmy(to)}`}</h3>
          <p className="mt-1 max-w-md text-xs text-slate-500">Các điểm đen sau khi chốt và giao việc ở bước 2 sẽ hiện ở đây.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {byDay.map((group) => (
            <section key={group.day} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-black text-slate-800">
                  Ngày {dmy(group.day)} <span className="ml-1 text-xs font-semibold text-slate-500">• {group.items.length} điểm đen</span>
                  {dayStatus(group.day) === 'CLOSED' && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700"><Lock size={11} />Đã đóng ngày</span>
                  )}
                </h2>
                {dayStatus(group.day) !== 'CLOSED' && (
                  <button
                    type="button"
                    onClick={() => handleCloseDay(group.day)}
                    disabled={closingDay === group.day}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                    title="Đóng nhật ký của ngày này (cần mọi điểm đen đã chốt)"
                  >
                    <Lock size={13} />
                    <span>{closingDay === group.day ? 'Đang đóng...' : 'Đóng ngày'}</span>
                  </button>
                )}
              </div>

              {group.items.map((item) => {
                const sum = summarizeAssigned(item);
                const chip = getIndicatorChipStyle(item.indicator);
                const isOpen = openId === item.id;
                const spot = detail[item.id];
                return (
                  <div key={item.id} className={`overflow-hidden rounded-2xl border bg-white shadow-xs ${isOpen ? 'border-blue-300 ring-2 ring-blue-200/50' : 'border-slate-200'}`} data-testid="assigned-item">
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      aria-expanded={isOpen}
                      className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-left hover:bg-slate-50/70 cursor-pointer"
                    >
                      {isOpen ? <ChevronDown size={16} className="shrink-0 text-slate-500" /> : <ChevronRight size={16} className="shrink-0 text-slate-500" />}
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold ${chip.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${chip.dotClass}`} />
                        {chip.shortLabel}
                      </span>
                      <span className="min-w-0 flex-1 basis-56 truncate text-sm font-extrabold text-slate-900">{item.title}</span>

                      <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 ${sum.enough ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-700'}`}
                          title="Chỉ cần báo cáo của 2 dòng cuối (Chuyên quản báo cáo thì dòng 1, 2 đã được làm) là coi như hoàn thành nhiệm vụ"
                        >
                          <CheckCircle2 size={11} />{sum.reportedCount}/{sum.needed} báo cáo cuối{sum.enough ? ' - đủ' : ''}
                        </span>
                        {sum.done > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-emerald-800">{sum.done} đã xác nhận</span>
                        )}
                        {sum.reported > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-800"><MessageSquareText size={11} />{sum.reported} chờ xác nhận</span>
                        )}
                        {sum.open > 0 && !sum.enough && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-slate-700"><Clock size={11} />{sum.open} chưa báo cáo</span>
                        )}
                        {item.fileCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-800" title="File minh chứng đính kèm"><Paperclip size={11} />{item.fileCount} file</span>
                        )}
                      </span>

                      <span className="flex w-full flex-wrap items-center gap-x-4 gap-y-0.5 pl-7 text-[11px] font-medium text-slate-500">
                        {item.assignees.length > 0 && (
                          <span className="inline-flex items-center gap-1"><Users size={11} />{item.assignees.slice(0, 3).join(', ')}{item.assignees.length > 3 ? ` +${item.assignees.length - 3}` : ''}</span>
                        )}
                        <span>{sum.total} dòng việc</span>
                        {item.lastReportedAt && <span>Báo cáo gần nhất: {timeAgoText(item.lastReportedAt)}</span>}
                      </span>
                      {(item.pending || []).length > 0 && (
                        <span className="flex w-full flex-wrap items-center gap-x-1.5 pl-7 text-[11px] font-semibold text-slate-600" data-testid="pending-line">
                          <Clock size={11} className="text-slate-400" />
                          Chờ báo cáo:
                          {item.pending.map((p) => (
                            <span key={p.name} className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                              {p.name} (dòng {p.seqs.join(', ')})
                            </span>
                          ))}
                        </span>
                      )}
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50/40 p-3 sm:p-4">
                        {detailLoading === item.id || !spot ? (
                          <div className="flex h-24 items-center justify-center text-xs font-semibold text-slate-500"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Đang tải chi tiết...</div>
                        ) : (
                          <OpsJournalSpotCard
                            key={`${spot.id}_${spot.status}`}
                            spot={spot}
                            onToggleSelectForAssign={noop}
                            onSaveActions={noop}
                            onDirtyChange={noop}
                            onReopenSpot={handleReopen}
                            reopeningSpotId={reopeningSpotId}
                            onMarkActionDone={handleMarkDone}
                            markingDoneActionId={markingDoneActionId}
                            onLoadAllUsers={noop}
                            isDayClosed={dayStatus(item.day) === 'CLOSED'}
                            onSaveClosing={handleSaveClosing}
                            savingClosingSpotId={savingClosingSpotId}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
