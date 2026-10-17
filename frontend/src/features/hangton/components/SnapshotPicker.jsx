import React from 'react';
import { Clock, AlertTriangle, Layers } from 'lucide-react';
import { formatSlot } from '../hangtonLevels.js';

export default function SnapshotPicker({
  snapshots = [],
  selectedId,
  onSelectSnapshot,
  disabled = false,
  label = 'Mốc dữ liệu',
}) {
  const selected = snapshots.find((s) => String(s.id) === String(selectedId)) || snapshots[0];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <Clock size={15} className="text-rose-600 shrink-0" />
        <span className="hidden sm:inline">{label}:</span>
      </div>

      <div className="relative">
        <select
          value={selected?.id || ''}
          onChange={(e) => onSelectSnapshot(e.target.value)}
          disabled={disabled || snapshots.length === 0}
          className="cursor-pointer rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors disabled:opacity-50"
        >
          {snapshots.length === 0 ? (
            <option value="">Chưa có snapshot</option>
          ) : (
            snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.business_date} — {formatSlot(s.slot)} ({s.kept_row_count ?? s.source_row_count ?? 0} bưu gửi)
                {s.is_stale ? ' [Cổng chưa cập nhật]' : ''}
              </option>
            ))
          )}
        </select>
      </div>

      {selected?.is_stale ? (
        <span
          title="Dữ liệu cổng chưa cập nhật kể từ mốc trước đó"
          className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-800"
        >
          <AlertTriangle size={12} className="text-amber-600 shrink-0" />
          <span>Dữ liệu cổng chưa cập nhật</span>
        </span>
      ) : null}

      {selected ? (
        <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-slate-500">
          <Layers size={12} className="shrink-0" />
          <span>Thời gian quét: {selected.captured_at ? new Date(selected.captured_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : formatSlot(selected.slot)}</span>
        </span>
      ) : null}
    </div>
  );
}
