import React, { useMemo, useRef, useState } from 'react';
import {
  GitCompare,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  Filter,
  ArrowRight,
  Download,
} from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import {
  formatNumber,
  formatCurrency,
  formatSlot,
  formatSnapshotLabel,
  getLevelConfig,
  compareValue,
  hasCompareBase,
  NO_BASE_NOTE,
} from '../hangtonLevels.js';
import { downloadCsv } from '../hangtonExport.js';

export default function HangTonCompareTab({
  snapshots = [],
  compare,
  toSnapshotId,
  baseSnapshotId,
  onChangeToSnapshot,
  onChangeBaseSnapshot,
}) {
  const compareBlockRef = useRef(null);
  const [selectedSubList, setSelectedSubList] = useState('resolved'); // 'resolved' | 'aged_up' | 'new'
  const [selectedOffice, setSelectedOffice] = useState('');

  const toSnapshot = snapshots.find((s) => String(s.id) === String(toSnapshotId)) || snapshots[0];
  const fromSnapshot = snapshots.find((s) => String(s.id) === String(baseSnapshotId)) || null;
  const hasBase = hasCompareBase(compare);

  // Get unique office list from the 3 detail sets
  const officeOptions = useMemo(() => {
    const offices = new Set();
    const resolved = compare?.resolved || [];
    const agedUp = compare?.aged_up || [];
    const nw = compare?.new || [];
    [...resolved, ...agedUp, ...nw].forEach((item) => {
      if (item.office) offices.add(item.office);
    });
    return Array.from(offices).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [compare]);

  const activeList = useMemo(() => {
    const list = selectedSubList === 'resolved'
      ? (compare?.resolved || [])
      : selectedSubList === 'aged_up'
        ? (compare?.aged_up || [])
        : (compare?.new || []);

    if (!selectedOffice) return list;
    return list.filter((item) => item.office === selectedOffice);
  }, [compare, selectedSubList, selectedOffice]);

  const handleExportActiveList = () => {
    const listName = selectedSubList === 'resolved' ? 'Da_xu_ly' : selectedSubList === 'aged_up' ? 'Tang_loai_ton' : 'Moi_vao_ton';
    const filename = `So_sanh_Hang_ton_${listName}_${toSnapshot?.business_date || ''}_${toSnapshot?.slot || ''}`;

    const headers = [
      { key: 'item_code', label: 'Số hiệu bưu gửi' },
      { key: 'office', label: 'Bưu cục phát' },
      { key: 'customer_class', label: 'Nhóm KH' },
      { key: 'from_level', label: 'Loại tồn mốc trước' },
      { key: 'to_level', label: 'Loại tồn mốc sau' },
      { key: 'from_status', label: 'Trạng thái trước' },
      { key: 'to_status', label: 'Trạng thái sau' },
      { key: 'cod', label: 'Tiền COD' },
      { key: 'postman_name', label: 'Bưu tá' },
    ];

    downloadCsv(filename, headers, activeList);
  };

  return (
    <div
      ref={compareBlockRef}
      className="rounded-2xl border border-slate-200/80 bg-white shadow-xs p-6 space-y-6"
    >
      {/* Header and Snapshot Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <GitCompare size={18} className="text-rose-600" />
            So sánh biến động giữa hai mốc Snapshot
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi đường đi của từng bưu gửi: đã ra khỏi tồn, tăng loại tồn (chuyển mức lâu hơn), hoặc mới phát sinh.
          </p>
        </div>

        <div className="flex items-center gap-2" data-no-capture="true">
          <BlockCaptureButton
            targetRef={compareBlockRef}
            blockTitle="So sánh biến động hai mốc hàng tồn"
            dateOrPeriod={`${formatSnapshotLabel(toSnapshot)} vs ${fromSnapshot ? formatSnapshotLabel(fromSnapshot) : 'chưa có mốc so sánh'}`}
          />
        </div>
      </div>

      {/* Snapshot Pickers: To & From */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/70" data-no-capture="true">
        {/* Mốc xem xét (To / Later) */}
        <div>
          <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
            Mốc xem xét (sau):
          </label>
          <select
            value={toSnapshotId || ''}
            onChange={(e) => onChangeToSnapshot(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm font-semibold text-slate-900 shadow-2xs hover:border-slate-400 focus:border-rose-500 focus:outline-none"
          >
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.business_date} — {formatSlot(s.slot)} ({s.kept_row_count ?? 0} bưu gửi)
                {s.is_stale ? ' [Cổng chưa cập nhật]' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Mốc cơ sở (From / Base) */}
        <div>
          <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
            Mốc cơ sở (trước / so sánh):
          </label>
          <select
            value={baseSnapshotId || ''}
            onChange={(e) => onChangeBaseSnapshot(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm font-semibold text-slate-900 shadow-2xs hover:border-slate-400 focus:border-rose-500 focus:outline-none"
          >
            {!baseSnapshotId ? <option value="" disabled>— Chưa có mốc so sánh —</option> : null}
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.business_date} — {formatSlot(s.slot)} ({s.kept_row_count ?? 0} bưu gửi)
                {s.is_stale ? ' [Cổng chưa cập nhật]' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!hasBase ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-sm text-amber-900" data-no-capture="true">
          {NO_BASE_NOTE} Có thể chọn một mốc cơ sở khác ở ô bên trên.
        </div>
      ) : null}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Resolved */}
        <button
          type="button"
          onClick={() => setSelectedSubList('resolved')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedSubList === 'resolved'
              ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-2 ring-emerald-500/20'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[13px] font-bold uppercase tracking-wider">Đã xử lý khỏi tồn</span>
            <CheckCircle2 size={16} />
          </div>
          <div className="text-2xl font-black text-emerald-700">{compareValue(compare, 'resolved')}</div>
          <p className="text-[13px] text-emerald-800 mt-1">Trong mốc trước, đã ra khỏi tồn</p>
        </button>

        {/* Aged Up */}
        <button
          type="button"
          onClick={() => setSelectedSubList('aged_up')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedSubList === 'aged_up'
              ? 'border-amber-500 bg-amber-50 shadow-sm ring-2 ring-amber-500/20'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[13px] font-bold uppercase tracking-wider">Tăng loại tồn</span>
            <TrendingUp size={16} />
          </div>
          <div className="text-2xl font-black text-amber-700">{compareValue(compare, 'aged_up')}</div>
          <p className="text-[13px] text-amber-800 mt-1">Chuyển sang mức tồn lâu hơn</p>
        </button>

        {/* New */}
        <button
          type="button"
          onClick={() => setSelectedSubList('new')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedSubList === 'new'
              ? 'border-indigo-500 bg-indigo-50 shadow-sm ring-2 ring-indigo-500/20'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-700 mb-1">
            <span className="text-[13px] font-bold uppercase tracking-wider">Mới vào tồn</span>
            <PlusCircle size={16} />
          </div>
          <div className="text-2xl font-black text-indigo-700">{compareValue(compare, 'new')}</div>
          <p className="text-[13px] text-indigo-800 mt-1">Chưa có ở mốc trước</p>
        </button>

        {/* Unchanged */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="text-[13px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Không đổi mức
          </div>
          <div className="text-2xl font-black text-slate-800">{compareValue(compare, 'unchanged')}</div>
          <p className="text-[13px] text-slate-500 mt-1">Giữ nguyên mức tồn</p>
        </div>

        {/* Aged Down (if any) */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="text-[13px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Giảm mức tồn
          </div>
          <div className="text-2xl font-black text-slate-800">{compareValue(compare, 'aged_down')}</div>
          <p className="text-[13px] text-slate-500 mt-1">Điều chỉnh TMS</p>
        </div>
      </div>

      {/* Filter and Table Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-no-capture="true">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              Danh sách: {selectedSubList === 'resolved' ? 'Đã xử lý khỏi tồn' : selectedSubList === 'aged_up' ? 'Tăng loại tồn' : 'Mới vào tồn'} ({formatNumber(activeList.length)})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-slate-400 shrink-0" />
              <select
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white py-1.5 px-3 text-sm text-slate-800 focus:border-rose-500 focus:outline-none shadow-2xs"
              >
                <option value="">Tất cả bưu cục ({officeOptions.length})</option>
                {officeOptions.map((off) => (
                  <option key={off} value={off}>{off}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportActiveList}
              disabled={activeList.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Download size={13} />
              <span>Xuất CSV</span>
            </button>
          </div>
        </div>

        {/* Table of the active list */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[13px] uppercase tracking-wider">
                <th className="py-2.5 px-3">STT</th>
                <th className="py-2.5 px-3">Số hiệu bưu gửi</th>
                <th className="py-2.5 px-3">Bưu cục phát</th>
                <th className="py-2.5 px-3">Nhóm KH</th>
                {selectedSubList === 'resolved' ? (
                  <>
                    <th className="py-2.5 px-3">Loại tồn mốc trước</th>
                    <th className="py-2.5 px-3">Trạng thái mốc trước</th>
                  </>
                ) : selectedSubList === 'aged_up' ? (
                  <>
                    <th className="py-2.5 px-3">Loại tồn: Trước → Sau</th>
                    <th className="py-2.5 px-3">Trạng thái hiện tại</th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-3">Loại tồn hiện tại</th>
                    <th className="py-2.5 px-3">Trạng thái hiện tại</th>
                  </>
                )}
                <th className="py-2.5 px-3 text-right">Tiền COD</th>
                <th className="py-2.5 px-3">Bưu tá phụ trách</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không có bưu gửi nào trong danh sách này
                  </td>
                </tr>
              ) : (
                activeList.slice(0, 200).map((item, idx) => {
                  const cfgBefore = item.from_level ? getLevelConfig(item.from_level) : null;
                  const cfgAfter = item.to_level ? getLevelConfig(item.to_level) : null;
                  return (
                    <tr key={`${item.item_code}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[13px]">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{item.item_code}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{item.office || '—'}</td>
                      <td className="py-2 px-3 text-slate-700">{item.customer_class || '—'}</td>

                      {/* Level changes */}
                      {selectedSubList === 'resolved' ? (
                        <>
                          <td className="py-2 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[13px] font-semibold border ${cfgBefore?.badgeClass}`}>
                              {item.from_level}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{item.from_status || '—'}</td>
                        </>
                      ) : selectedSubList === 'aged_up' ? (
                        <>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-xs border ${cfgBefore?.badgeClass}`}>
                                {item.from_level}
                              </span>
                              <ArrowRight size={11} className="text-slate-400" />
                              <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${cfgAfter?.badgeClass}`}>
                                {item.to_level}
                              </span>
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{item.to_status || item.from_status || '—'}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[13px] font-semibold border ${cfgAfter?.badgeClass}`}>
                              {item.to_level}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{item.to_status || '—'}</td>
                        </>
                      )}

                      <td className="py-2 px-3 text-right font-medium text-slate-700">
                        {item.cod ? formatCurrency(item.cod) : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {item.postman_name || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {activeList.length > 200 ? (
            <div className="py-2 px-4 bg-slate-50 border-t border-slate-200 text-center text-sm text-slate-500">
              Đang hiển thị 200 / {formatNumber(activeList.length)} bưu gửi. Bấm <strong>Xuất CSV</strong> để tải toàn bộ danh sách.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
