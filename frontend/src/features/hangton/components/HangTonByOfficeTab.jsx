import React, { useMemo, useRef, useState } from 'react';
import { Building2, ExternalLink } from 'lucide-react';
import SortableTh from '../../../components/common/SortableTh.jsx';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { nextSortState } from '../../../components/common/tableSort.js';
import LevelPicker from './LevelPicker.jsx';
import { useStoredHiddenLevels } from '../hangtonLevelState.js';
import {
  hasCompareBase,
  visibleLevels,
  getLevelConfig,
  formatNumber,
  formatCurrency,
  formatSnapshotLabel,
} from '../hangtonLevels.js';
import {
  OFFICE_TABLE_TEXT_FIELDS,
  buildOfficeTableRows,
  calculateOfficeTotals,
  applyVisibleLevels,
  compareColumnsHeader,
  officeTableColumnCount,
  sortAfterHide,
  drillDownFilter,
  sortOfficeRows,
} from '../hangtonOfficeTableData.js';
import HangTonItemsModal from './HangTonItemsModal.jsx';

export default function HangTonByOfficeTab({
  overview,
  compare,
  currentSnapshot,
  selectedCustomers = [],
  onDrillDownToOffice,
}) {
  const tableBlockRef = useRef(null);
  const snapshotLabel = formatSnapshotLabel(currentSnapshot);

  const [sort, setSort] = useState({ field: 'total', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [drill, setDrill] = useState(null); // { office, levels, title } -> parcel list modal
  const [hiddenLevels, setStoredHidden] = useStoredHiddenLevels('qis.hangton.hiddenLevels', []);
  const shownLevels = visibleLevels(hiddenLevels);

  const applyHidden = (next) => {
    setStoredHidden(next);
    setSort((current) => sortAfterHide(current, next));
  };

  const rawRows = useMemo(() => {
    return buildOfficeTableRows(
      overview?.by_office || [],
      overview?.by_office_level || [],
      compare?.by_office || [],
    );
  }, [overview, compare]);

  // Hidden levels change the figures, not only the columns: Tổng tồn / ≥5 / COD follow the shown levels.
  const visibleRows = useMemo(() => applyVisibleLevels(rawRows, shownLevels), [rawRows, shownLevels]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return visibleRows;
    const q = searchTerm.trim().toLowerCase();
    return visibleRows.filter((r) => r.office.toLowerCase().includes(q));
  }, [visibleRows, searchTerm]);

  const sortedRows = useMemo(() => {
    return sortOfficeRows(filteredRows, sort);
  }, [filteredRows, sort]);

  const hasBase = hasCompareBase(compare);
  const compareHeader = compareColumnsHeader(compare);
  const totals = useMemo(() => {
    return calculateOfficeTotals(visibleRows);
  }, [visibleRows]);

  const openDrill = (office, kind, level) => setDrill(drillDownFilter({ office, kind, level, shownLevels }));

  const handleSort = (field) => {
    setSort((current) => nextSortState(current, field, { textFields: OFFICE_TABLE_TEXT_FIELDS }));
  };

  return (
    <div
      ref={tableBlockRef}
      className="rounded-2xl border border-slate-200/80 bg-white shadow-xs p-6 space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={18} className="text-rose-600" />
            Bảng theo dõi Hàng tồn theo Bưu cục ({snapshotLabel})
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Chỉ hiển thị các bưu cục đang phát sinh hàng tồn (Quyết định D5). Bấm tiêu đề cột để sắp xếp; bấm tên bưu cục để sang tab Chi tiết; bấm vào một con số để xem ngay danh sách bưu gửi tạo nên con số đó.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2" data-no-capture="true">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm bưu cục..."
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none shadow-2xs"
          />
          <BlockCaptureButton
            targetRef={tableBlockRef}
            blockTitle="Bảng theo dõi Hàng tồn theo Bưu cục"
            dateOrPeriod={snapshotLabel}
          />
        </div>
      </div>

      {/* Column picker: hide the low-age levels (not part of the captured picture) */}
      <LevelPicker
        hiddenLevels={hiddenLevels}
        onChange={applyHidden}
        label="Cột mức tồn:"
        note="Tổng tồn, Tồn ≥5 ngày, Tiền COD và dòng TỔNG CỘNG chỉ tính các mức đang hiển thị; bưu cục không còn tồn ở các mức này được ẩn. Cột biến động không chia theo mức nên giữ nguyên."
      />

      {/* Main Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            {/* Group Header Row */}
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[13px] uppercase tracking-wider">
              <SortableTh
                field="office"
                sort={sort}
                onSort={handleSort}
                rowSpan={2}
                className="py-2.5 px-3 min-w-[160px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200 text-left"
                activeClassName="bg-rose-100 text-rose-950 font-bold"
              >
                Bưu cục phát
              </SortableTh>
              {shownLevels.length > 0 ? (
                <th colSpan={shownLevels.length} className="py-1.5 px-2 text-center border-r border-slate-200 bg-red-50/50 text-red-900">
                  Phân loại theo tuổi bưu gửi (Loại Tồn)
                </th>
              ) : null}
              <th colSpan={3} className="py-1.5 px-2 text-center border-r border-slate-200 bg-slate-100 text-slate-800">
                Tổng hợp hiện tại
              </th>
              <th colSpan={3} className="py-1.5 px-2 text-center bg-blue-50/50 text-blue-900">
                {compareHeader.title}{' '}
                <span className="font-medium normal-case tracking-normal text-blue-800">{compareHeader.note}</span>
              </th>
            </tr>

            {/* Sub Columns Header Row */}
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-[13px]">
              {shownLevels.map((lvl) => {
                const cfg = getLevelConfig(lvl);
                return (
                  <SortableTh
                    key={lvl}
                    field={lvl}
                    sort={sort}
                    onSort={handleSort}
                    className={`py-2 px-2 text-right whitespace-nowrap ${cfg.isAlert ? 'bg-red-50/70 text-red-900' : ''}`}
                    activeClassName="bg-rose-100 text-rose-950 font-bold"
                  >
                    {lvl}
                  </SortableTh>
                );
              })}

              {/* Total & GE5 & COD */}
              <SortableTh
                field="total"
                sort={sort}
                onSort={handleSort}
                className="py-2 px-2.5 text-right font-bold text-slate-900 bg-slate-100/70"
                activeClassName="bg-rose-100 text-rose-950 font-bold"
              >
                Tổng tồn
              </SortableTh>

              <SortableTh
                field="ge5"
                sort={sort}
                onSort={handleSort}
                className="py-2 px-2.5 text-right font-bold text-red-700 bg-red-100/50"
                activeClassName="bg-rose-100 text-rose-950 font-bold"
              >
                Tồn ≥5 ngày
              </SortableTh>

              <SortableTh
                field="cod"
                sort={sort}
                onSort={handleSort}
                className="py-2 px-2.5 text-right text-slate-700 border-r border-slate-200"
                activeClassName="bg-rose-100 text-rose-950 font-bold"
              >
                Tiền COD
              </SortableTh>

              {/* Compare Columns */}
              <SortableTh
                field="resolved"
                sort={sort}
                onSort={handleSort}
                className="py-2 px-2 text-right text-emerald-700"
                activeClassName="bg-rose-100 text-rose-950 font-bold"
              >
                Đã xử lý
              </SortableTh>

              <SortableTh
                field="aged_up"
                sort={sort}
                onSort={handleSort}
                className="py-2 px-2 text-right text-amber-700"
                activeClassName="bg-rose-100 text-rose-950 font-bold"
              >
                Tăng loại
              </SortableTh>

              <SortableTh
                field="new"
                sort={sort}
                onSort={handleSort}
                className="py-2 px-2 text-right text-indigo-700"
                activeClassName="bg-rose-100 text-rose-950 font-bold"
              >
                Mới vào
              </SortableTh>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={officeTableColumnCount(shownLevels.length)} className="py-8 text-center text-slate-400">
                  Không có bưu cục nào có tồn theo điều kiện lọc
                </td>
              </tr>
            ) : (
              sortedRows.map((r, idx) => (
                <tr
                  key={r.office || idx}
                  className="hover:bg-rose-50/30 transition-colors group"
                >
                  {/* Office name with drilldown button */}
                  <td className="py-2 px-3 font-semibold text-slate-900 sticky left-0 bg-white group-hover:bg-rose-50/40 z-10 border-r border-slate-100">
                    <button
                      type="button"
                      onClick={() => onDrillDownToOffice?.(r.office)}
                      className="text-left font-bold text-slate-900 hover:text-rose-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title={`Bấm để xem danh sách chi tiết bưu gửi của bưu cục ${r.office}`}
                    >
                      <span className="whitespace-nowrap">{r.office}</span>
                      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-rose-600 shrink-0 transition-opacity" />
                    </button>
                  </td>

                  {/* 9 Level columns */}
                  {shownLevels.map((lvl) => {
                    const count = r[lvl] || 0;
                    const cfg = getLevelConfig(lvl);
                    return (
                      <td
                        key={lvl}
                        className={`py-2 px-2 text-right font-medium ${
                          count > 0 && cfg.isAlert
                            ? `${cfg.badgeClass} font-bold rounded-xs`
                            : count > 0
                              ? 'text-slate-800'
                              : 'text-slate-300'
                        }`}
                      >
                        {count > 0 ? (<button type="button" onClick={() => openDrill(r.office, 'level', lvl)} className="w-full cursor-pointer text-right underline-offset-2 hover:underline" title="Bấm để xem danh sách bưu gửi">{formatNumber(count)}</button>) : '—'}
                      </td>
                    );
                  })}

                  {/* Tổng tồn */}
                  <td className="py-2 px-2.5 text-right font-bold text-slate-900 bg-slate-50/50">
                    {r.total > 0 ? <button type="button" onClick={() => openDrill(r.office, 'total')} className="w-full cursor-pointer text-right underline-offset-2 hover:underline" title="Bấm để xem danh sách bưu gửi">{formatNumber(r.total)}</button> : '0'}
                  </td>

                  {/* Tồn >=5 ngày */}
                  <td className={`py-2 px-2.5 text-right font-black ${
                    r.ge5 > 0 ? 'bg-red-100/80 text-red-800' : 'text-slate-300'
                  }`}>
                    {r.ge5 > 0 ? <button type="button" onClick={() => openDrill(r.office, 'ge5')} className="w-full cursor-pointer text-right underline-offset-2 hover:underline" title="Bấm để xem danh sách bưu gửi">{formatNumber(r.ge5)}</button> : '0'}
                  </td>

                  {/* Tiền COD */}
                  <td className="whitespace-nowrap py-2 px-2.5 text-right font-medium text-slate-700 border-r border-slate-200">
                    {r.cod > 0 ? formatCurrency(r.cod) : '—'}
                  </td>

                  {/* Compare columns */}
                  <td className="py-2 px-2 text-right font-semibold text-emerald-700">
                    {r.resolved > 0 ? formatNumber(r.resolved) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right font-semibold text-amber-700">
                    {r.aged_up > 0 ? formatNumber(r.aged_up) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right font-semibold text-indigo-700">
                    {r.new > 0 ? formatNumber(r.new) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Fixed TỔNG CỘNG row */}
          <tfoot>
            <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
              <td className="py-2.5 px-3 sticky left-0 bg-slate-100 z-10 border-r border-slate-300 uppercase">
                {totals.office}
              </td>
              {shownLevels.map((lvl) => {
                const count = totals[lvl] || 0;
                const cfg = getLevelConfig(lvl);
                return (
                  <td
                    key={lvl}
                    className={`py-2.5 px-2 text-right ${
                      cfg.isAlert && count > 0 ? 'text-red-800 font-black' : 'text-slate-900'
                    }`}
                  >
                    {count > 0 ? <button type="button" onClick={() => openDrill(null, 'level', lvl)} className="w-full cursor-pointer text-right underline-offset-2 hover:underline" title="Bấm để xem danh sách bưu gửi">{formatNumber(count)}</button> : '0'}
                  </td>
                );
              })}
              <td className="py-2.5 px-2.5 text-right bg-slate-200/60 font-black">
                {totals.total > 0 ? <button type="button" onClick={() => openDrill(null, 'total')} className="w-full cursor-pointer text-right underline-offset-2 hover:underline" title="Bấm để xem danh sách bưu gửi">{formatNumber(totals.total)}</button> : '0'}
              </td>
              <td className="py-2.5 px-2.5 text-right bg-red-200/80 text-red-900 font-black">
                {totals.ge5 > 0 ? <button type="button" onClick={() => openDrill(null, 'ge5')} className="w-full cursor-pointer text-right underline-offset-2 hover:underline" title="Bấm để xem danh sách bưu gửi">{formatNumber(totals.ge5)}</button> : '0'}
              </td>
              <td className="whitespace-nowrap py-2.5 px-2.5 text-right border-r border-slate-300">
                {formatCurrency(totals.cod)}
              </td>
              <td className="py-2.5 px-2 text-right text-emerald-800">
                {hasBase ? formatNumber(totals.resolved) : '—'}
              </td>
              <td className="py-2.5 px-2 text-right text-amber-800">
                {hasBase ? formatNumber(totals.aged_up) : '—'}
              </td>
              <td className="py-2.5 px-2 text-right text-indigo-800">
                {hasBase ? formatNumber(totals.new) : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <HangTonItemsModal
        isOpen={Boolean(drill)}
        onClose={() => setDrill(null)}
        snapshot={currentSnapshot}
        office={drill?.office || undefined}
        levels={drill?.levels || []}
        customers={selectedCustomers}
        title={drill?.title ? `${drill.title}${selectedCustomers.length > 0 ? ` · ${selectedCustomers.join(', ')}` : ''}` : ''}
      />
    </div>
  );
}
