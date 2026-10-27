import React, { useMemo, useRef, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { nextSortState } from '../../../components/common/tableSort.js';
import { formatNumber } from '../hangtonLevels.js';
import { KIND_LABELS, KINDS, percent, sortStatsRows, formatDate } from './handlingModel.js';

// Light colour family of the review rate (green = reviewed, rose = still open); the target is 100 % every day.
const TARGET = 1;

function Card({ label, value, hint, tone }) {
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
      {hint ? <p className="mt-0.5 text-xs opacity-80">{hint}</p> : null}
    </div>
  );
}

function RateBar({ rate }) {
  const width = `${Math.min(100, Math.round((Number(rate) || 0) * 100))}%`;
  return (
    <div className="relative h-2.5 w-full min-w-[90px] rounded-full bg-rose-100" title={`Mục tiêu ${percent(TARGET, 0)}`}>
      <div className="h-2.5 rounded-full bg-emerald-400" style={{ width }} />
      <div className="absolute inset-y-[-3px] right-0 w-0.5 bg-slate-500" aria-hidden="true" />
    </div>
  );
}

function AnswerBars({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-2 text-sm font-bold text-slate-800">{title}</h4>
      {rows.length === 0 ? <p className="text-sm text-slate-400">Chưa có dữ liệu.</p> : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.code} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-slate-700" title={r.label}>{r.label}</span>
                <span className="font-bold text-slate-900">{formatNumber(r.n)}</span>
              </div>
              <div className="mt-0.5 h-1.5 rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full bg-sky-300" style={{ width: `${(r.n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Review statistics of the chosen mốc: how many parcels of >= 5 days must be reviewed, how many were (complete entry
// that day), by BCVH, and the answers given (free texts already grouped by the backend).
export default function HandlingStatsPanel({ stats, snapshotLabel, onOpenList, loading }) {
  const blockRef = useRef(null);
  const [sort, setSort] = useState({ field: 'needed', direction: 'desc' });
  const rows = useMemo(() => sortStatsRows(stats?.by_office || [], sort), [stats, sort]);
  if (loading && !stats) return <p className="py-10 text-center text-slate-400">Đang tải thống kê rà soát...</p>;
  if (!stats) return <p className="py-10 text-center text-slate-400">Chưa có dữ liệu thống kê.</p>;
  const { total } = stats;
  const handleSort = (field) => setSort((current) => nextSortState(current, field, { textFields: ['office'] }));
  const th = 'py-2 px-3 text-right';

  return (
    <div className="space-y-4">
      <div ref={blockRef} className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <ClipboardCheck size={18} className="text-rose-600" />
              Thống kê rà soát hàng tồn ≥{stats.min_rank} ngày ({snapshotLabel})
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              “Đã rà soát” = ngày {formatDate(stats.business_date)} có ít nhất một lần nhập đủ các trường bắt buộc. Mục tiêu: {percent(TARGET, 0)} bưu gửi cần rà soát mỗi ngày.
            </p>
          </div>
          <div data-no-capture="true">
            <BlockCaptureButton targetRef={blockRef} blockTitle="Thống kê rà soát hàng tồn" dateOrPeriod={snapshotLabel} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card label="Cần rà soát" value={formatNumber(total.needed)} hint={`bưu gửi tồn ≥${stats.min_rank} ngày`} tone="border-slate-200 bg-slate-50 text-slate-800" />
          <Card label="Đã rà soát" value={formatNumber(total.done)} hint={`${percent(total.rate)} so với mục tiêu ${percent(TARGET, 0)}`} tone="border-emerald-200 bg-emerald-50 text-emerald-900" />
          <Card label="Chưa rà soát" value={formatNumber(total.pending)} hint={`${formatNumber(total.never)} chưa từng · ${formatNumber(total.stale)} chờ xác nhận lại`} tone="border-rose-200 bg-rose-50 text-rose-900" />
          <Card label="Tỷ lệ đã rà soát" value={percent(total.rate)} hint="trong ngày của mốc đang xem" tone="border-sky-200 bg-sky-50 text-sky-900" />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[13px] font-bold uppercase tracking-wider text-slate-700">
                <SortableTh field="office" sort={sort} onSort={handleSort} className="py-2 px-3" activeClassName="bg-rose-100 text-rose-950 font-bold">Bưu cục</SortableTh>
                <SortableTh field="needed" sort={sort} onSort={handleSort} className={th} activeClassName="bg-rose-100 text-rose-950 font-bold">Cần rà soát</SortableTh>
                <SortableTh field="done" sort={sort} onSort={handleSort} className={th} activeClassName="bg-rose-100 text-rose-950 font-bold">Đã rà soát</SortableTh>
                <SortableTh field="pending" sort={sort} onSort={handleSort} className={th} activeClassName="bg-rose-100 text-rose-950 font-bold">Chưa rà soát</SortableTh>
                <SortableTh field="never" sort={sort} onSort={handleSort} className={th} activeClassName="bg-rose-100 text-rose-950 font-bold">Chưa từng</SortableTh>
                <SortableTh field="stale" sort={sort} onSort={handleSort} className={th} activeClassName="bg-rose-100 text-rose-950 font-bold">Chờ xác nhận lại</SortableTh>
                <SortableTh field="rate" sort={sort} onSort={handleSort} className="py-2 px-3 min-w-[170px]" activeClassName="bg-rose-100 text-rose-950 font-bold">Tỷ lệ đã rà soát</SortableTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Không có bưu gửi nào cần rà soát.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.office_code || r.office} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 font-semibold text-slate-900">{r.office}</td>
                  <td className="py-2 px-3 text-right">
                    <button type="button" className="cursor-pointer underline-offset-2 hover:underline" onClick={() => onOpenList({ office: r.office, review: '' })} title="Xem danh sách bưu gửi">{formatNumber(r.needed)}</button>
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                    {r.done > 0 ? <button type="button" className="cursor-pointer underline-offset-2 hover:underline" onClick={() => onOpenList({ office: r.office, review: 'done' })}>{formatNumber(r.done)}</button> : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-rose-700">
                    {r.pending > 0 ? <button type="button" className="cursor-pointer underline-offset-2 hover:underline" onClick={() => onOpenList({ office: r.office, review: 'pending' })}>{formatNumber(r.pending)}</button> : '0'}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700">{r.never > 0 ? formatNumber(r.never) : '—'}</td>
                  <td className="py-2 px-3 text-right text-amber-700">{r.stale > 0 ? formatNumber(r.stale) : '—'}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <RateBar rate={r.rate} />
                      <span className="w-14 shrink-0 text-right font-bold text-slate-800">{percent(r.rate, 0)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-100/90 font-black text-slate-900">
                <td className="py-2.5 px-3 uppercase">Tổng cộng</td>
                <td className="py-2.5 px-3 text-right">{formatNumber(total.needed)}</td>
                <td className="py-2.5 px-3 text-right text-emerald-800">{formatNumber(total.done)}</td>
                <td className="py-2.5 px-3 text-right text-rose-800">{formatNumber(total.pending)}</td>
                <td className="py-2.5 px-3 text-right">{formatNumber(total.never)}</td>
                <td className="py-2.5 px-3 text-right">{formatNumber(total.stale)}</td>
                <td className="py-2.5 px-3 text-right">{percent(total.rate)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {KINDS.map((kind) => (
            <AnswerBars key={kind} title={`${KIND_LABELS[kind]} (đã rà soát hôm nay)`} rows={stats[`by_${kind}`] || []} />
          ))}
        </div>
      </div>
    </div>
  );
}
