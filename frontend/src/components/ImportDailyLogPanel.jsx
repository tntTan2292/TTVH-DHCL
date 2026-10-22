import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ClipboardList, RefreshCw } from 'lucide-react';
import api from '../api/client';
import {
  SEVERITY_META,
  attentionTarget,
  cellMeta,
  cellTitle,
  dayHeading,
  formatVnTime,
  schedulerLine,
  shortDate,
  verdictMeta
} from './importDailyLogModel';

const POLL_MS = 30000;

const SESSION_TEXT = {
  SESSION_VALID: 'đã đăng nhập',
  LOGIN_IN_PROGRESS: 'đang chờ đăng nhập',
  DISCONNECTED: 'đã ngắt',
  AUTHENTICATION_REQUIRED: 'cần đăng nhập',
  LOGIN_TIMEOUT: 'hết thời gian chờ',
  SESSION_CHECK_FAILED: 'không kiểm tra được',
  NOT_CHECKED: 'chưa xác nhận'
};

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

/**
 * IMPORT-DAILYLOG-01: "Log ngày mới" -- whether the day's automatic import (new day + refresh days, every indicator and
 * both sources) has finished, and which failed / waiting items need the PO.
 */
export default function ImportDailyLogPanel({ onOpenTab = null }) {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/import/daily-log', { params: { date } });
      setData(res.data?.data || null);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Không tải được Log ngày mới.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const verdict = verdictMeta(data?.summary?.verdict);

  return (
    <div className="space-y-4" data-testid="import-daily-log">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-[var(--color-vnpost-blue)]"><ClipboardList size={20} /></span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Log ngày mới</h2>
              <p className="text-xs text-slate-500">Lần nhập tự động của ngày chọn: ngày mới và các ngày làm mới, mọi chỉ tiêu, cả Huế và TCT.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600" htmlFor="daily-log-date">Ngày chạy</label>
            <input
              id="daily-log-date"
              type="date"
              value={date}
              max={today()}
              onChange={(event) => event.target.value && setDate(event.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Làm mới
            </button>
          </div>
        </div>
        {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}
      </div>

      {data && (
        <>
          <div className={`rounded-2xl border px-5 py-4 ${verdict.cls}`} data-testid="daily-log-verdict">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider opacity-80">{verdict.title}</div>
                <div className="text-lg font-bold">{data.summary.verdict_text}</div>
              </div>
              <div className="text-xs opacity-80">Cập nhật {formatVnTime(data.generated_at)} · ngày mới = {shortDate(data.window.new_day)}</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
              {['OK', 'FAILED', 'WAITING_AUTH', 'RUNNING', 'QUEUED', 'MISSING'].map((state) => (
                data.summary[state] > 0 && (
                  <span key={state} className={`rounded-md border px-2 py-0.5 ${cellMeta(state).cls}`}>{cellMeta(state).label}: {data.summary[state]}</span>
                )
              ))}
            </div>
          </div>

          {data.attention.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="daily-log-attention">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><AlertTriangle size={16} className="text-red-600" /> Việc cần PO xem</h3>
              <ul className="space-y-2">
                {data.attention.map((item, index) => {
                  const target = attentionTarget(item);
                  return (
                    <li key={`${item.code}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm text-slate-800">
                        <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${SEVERITY_META[item.severity].cls}`}>{SEVERITY_META[item.severity].label}</span>
                        <span>{item.message}</span>
                      </div>
                      {target && onOpenTab && (
                        <button type="button" onClick={() => onOpenTab(target)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50">
                          {target === 'PLATFORM' ? 'Mở Bù dữ liệu tự động' : 'Mở Nạp thủ công'}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="daily-log-grid">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Chỉ tiêu</th>
                  <th className="px-4 py-3 text-left">Nguồn</th>
                  {data.window.days.map((day, index) => <th key={day} className="px-4 py-3 text-center">{dayHeading(index, day)}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.grid.map((row) => (
                  <tr key={`${row.indicator}-${row.lane}`} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-bold text-slate-900" title={row.label}>{row.indicator}</td>
                    <td className="px-4 py-2 font-semibold text-slate-700">{row.lane === 'HUE' ? 'Huế' : row.lane}</td>
                    {row.days.map((cell) => (
                      <td key={cell.date} className="px-3 py-2 text-center">
                        <span
                          title={cellTitle(cell)}
                          className={`inline-block min-w-[96px] rounded-md border px-2 py-1 text-xs font-bold ${cellMeta(cell.state).cls}`}
                          data-testid={`daily-cell-${cell.indicator}-${cell.lane}-${cell.date}`}
                        >
                          {cellMeta(cell.state).label}
                        </span>
                        {(cell.state === 'FAILED' && cell.reason) && <div className="mt-0.5 max-w-[160px] truncate text-[11px] text-red-700" title={cell.reason}>{cell.reason}</div>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="daily-log-scheduler">
              <h3 className="mb-2 text-sm font-bold text-slate-900">Lịch tự động và phiên đăng nhập</h3>
              <p className="text-sm text-slate-700">{schedulerLine(data.scheduler)}</p>
              {data.scheduler.cycle?.summary && <p className="mt-1 text-xs text-slate-500">{data.scheduler.cycle.summary}</p>}
              <ul className="mt-3 space-y-1 text-sm">
                {Object.entries(data.sessions).map(([source, session]) => (
                  <li key={source} className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{source === 'HUE' ? 'Huế' : source}</span>
                    <span className={session.status === 'SESSION_VALID' ? 'text-emerald-700' : 'font-semibold text-red-700'}>{SESSION_TEXT[session.status] || session.status}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="daily-log-runs">
              <h3 className="mb-2 text-sm font-bold text-slate-900">Các lượt chạy của ngày ({data.runs.length})</h3>
              {data.runs.length === 0 ? <p className="text-sm text-slate-500">Chưa có lượt chạy nào.</p> : (
                <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                  {data.runs.map((run) => (
                    <li key={run.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1">
                      <span className="font-semibold text-slate-800">{formatVnTime(run.created_at)} · {run.requested_by}</span>
                      <span className="text-slate-600">{run.status}{run.job_counts.FAILED_TERMINAL ? ` · ${run.job_counts.FAILED_TERMINAL} lỗi` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {data.old_failures.length > 0 && (
            <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="daily-log-old-failures">
              <summary className="cursor-pointer text-sm font-bold text-slate-900">Ngày cũ còn lỗi ({data.old_failures.reduce((sum, group) => sum + group.count, 0)}) — lịch tự động bỏ qua, PO xử lý khi cần</summary>
              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                {data.old_failures.map((group) => (
                  <li key={`${group.indicator}-${group.lane}-${group.reason}`}>
                    <span className="font-bold">{group.indicator} {group.lane === 'HUE' ? 'Huế' : group.lane}</span>: {group.count} ngày ({shortDate(group.first_date)} … {shortDate(group.last_date)})
                    {group.reason && <span className="text-slate-500"> · {group.reason}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="daily-log-imports">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-slate-900">Nhập tay và nhập lỗi trong ngày ({data.manual_imports.length})</div>
            {data.manual_imports.length === 0 ? <p className="px-5 py-4 text-sm text-slate-500">Không có.</p> : (
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Giờ</th>
                    <th className="px-3 py-2 text-left">File</th>
                    <th className="px-3 py-2 text-left">Chỉ tiêu / nguồn</th>
                    <th className="px-3 py-2 text-left">Ngày dữ liệu</th>
                    <th className="px-3 py-2 text-left">Người nhập</th>
                    <th className="px-3 py-2 text-left">Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {data.manual_imports.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{formatVnTime(row.created_at)}</td>
                      <td className="px-3 py-2">{row.file_name}</td>
                      <td className="px-3 py-2">{row.indicator} {row.lane === 'HUE' ? 'Huế' : (row.lane || '')}</td>
                      <td className="px-3 py-2">{shortDate(row.business_date)}</td>
                      <td className="px-3 py-2">{row.actor || 'chưa ghi nhận'}</td>
                      <td className={`px-3 py-2 font-semibold ${row.status === 'FAILED' && !row.resolved ? 'text-red-700' : 'text-slate-700'}`}>
                        {row.status === 'FAILED' ? (row.resolved ? 'Lỗi (đã nhập lại xong)' : `Lỗi${row.error_records ? ` · ${row.error_records} dòng` : ''}`) : 'Thành công'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
