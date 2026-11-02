import { useMemo, useRef, useState } from 'react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { nextSortState } from '../../../components/common/tableSort.js';
import { classifyF13HeatmapRate, F13_HEATMAP_TONE_CLASS } from '../../../components/f13/f13HeatmapBandCatalog.js';
import {
  DASH,
  formatDeltaIndicator,
  formatRate,
  formatVolume,
} from '../../dashboard/components/bcvhOperationTableData.js';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorLabel, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { HEADER_VOLUME, rateHeader, buildRangeCompareModel } from '../f13v2Helpers.js';

function formatDate(isoDate) {
  if (!isoDate) return DASH;
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function periodText(fromDate, toDate) {
  return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
}

// The range comparison table of Theo ngày (PO 2026-11-02): looks like the daily operation table, but a range is compared
// with its same period in the earlier month(s) instead of N-1 / N-7.
export default function F13V2RangeCompareTable({ data, loading = false, error = null, fromDate, toDate }) {
  const cardRef = useRef(null);
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const [sort, setSort] = useState(null);
  const headerSort = sort || { field: 'rate', direction: 'desc' };
  const handleSort = (field) => setSort((current) => nextSortState(current || headerSort, field, { textFields: ['ma_bcvh', 'ten_bcvh'] }));

  const { rows, totalRow, samePeriod } = useMemo(() => buildRangeCompareModel(data, sort), [data, sort]);
  const currentLabel = periodText(fromDate, toDate);
  const samePeriodLabel = samePeriod ? periodText(samePeriod.from_date, samePeriod.to_date) : DASH;

  const renderRate = (rate) => {
    if (rate === null || rate === undefined) return <span className="font-medium text-slate-400">{DASH}</span>;
    const band = classifyF13HeatmapRate(Number(rate), indicator.heatmapBands);
    return (
      <span
        className={`inline-flex min-w-[64px] items-center justify-center rounded-md border px-2 py-0.5 text-base font-bold tabular-nums sm:text-lg ${F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable}`}
        title={`${band.label}: ${formatRate(rate)}`}
      >
        {formatRate(rate)}
      </span>
    );
  };
  const renderDelta = (delta) => {
    const { display, toneClass } = formatDeltaIndicator(delta);
    return <span className={toneClass}>{display}</span>;
  };
  const renderCells = (row) => (
    <>
      <td className="whitespace-nowrap border-r border-slate-200 px-2 py-2 text-right font-bold tabular-nums">{formatVolume(row.volume)}</td>
      <td className="whitespace-nowrap border-r border-slate-300 px-2 py-2 text-center">{renderRate(row.rate)}</td>
      <td className="whitespace-nowrap border-r border-slate-200 px-2 py-2 text-right font-bold tabular-nums">{formatVolume(row.same_period_volume)}</td>
      <td className="whitespace-nowrap border-r border-slate-200 px-2 py-2 text-center">{renderRate(row.same_period_rate)}</td>
      <td className="whitespace-nowrap px-2 py-2 text-center font-bold tabular-nums">{renderDelta(row.same_period_delta)}</td>
    </>
  );
  const titleCell = (field, label, extraClass = '') => (
    <SortableTh field={field} sort={headerSort} onSort={handleSort} activeClassName={theme.sortActive} className={`px-1 py-2 text-center align-middle leading-snug ${extraClass}`}>
      {label}
    </SortableTh>
  );

  return (
    <section ref={cardRef} className="w-full rounded-2xl border border-slate-300 bg-white p-3 shadow-sm sm:p-5">
      <div className="relative mb-4 border-b border-slate-200 pb-3 text-center">
        <div className="absolute right-0 top-0">
          <BlockCaptureButton targetRef={cardRef} blockTitle="Bảng so sánh khoảng ngày" dateOrPeriod={currentLabel} />
        </div>
        <h2 className="text-base font-black uppercase leading-snug tracking-tight text-slate-900 sm:text-xl md:text-2xl">
          {indicatorLabel('BẢNG SO SÁNH SỐ LIỆU CHỈ SỐ F1.3 TẠI CÁC BCVH', indicator)}
        </h2>
        <p className={`mt-1 text-xs font-black uppercase tracking-wide sm:text-base md:text-lg ${theme.text}`}>
          TỪ {formatDate(fromDate)} ĐẾN {formatDate(toDate)}
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 flex-col items-center justify-center gap-3 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-base font-bold">Đang tải bảng so sánh khoảng ngày...</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-center text-rose-800">
          <p className="text-base font-bold">Không thể tải bảng so sánh khoảng ngày</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
          Không có dữ liệu BCVH trong khoảng ngày đã chọn.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-300">
                <th colSpan={3} className="whitespace-nowrap border-r border-slate-300 bg-slate-100/90 px-1.5 py-2.5 text-center align-middle text-xs font-black uppercase tracking-wider text-slate-800 sm:text-sm md:text-base">
                  <div>ĐƠN VỊ</div>
                  <div className="mt-0.5 text-[11px] font-bold tracking-normal text-slate-500 sm:text-xs">6 BƯU CỤC VẬN HÀNH</div>
                </th>
                <th colSpan={2} className={`whitespace-nowrap border-r px-2 py-2.5 text-center align-middle text-sm font-black uppercase tracking-wider md:text-base ${theme.headerBg} ${theme.headerText} ${theme.headerBorder}`}>
                  <div>KHOẢNG ĐANG CHỌN</div>
                  <div className="mt-0.5 text-xs font-black tracking-wide text-rose-600 sm:text-sm">{currentLabel}</div>
                </th>
                <th colSpan={3} className={`whitespace-nowrap px-2 py-2.5 text-center align-middle text-sm font-black uppercase tracking-wider md:text-base ${theme.header2Bg} ${theme.header2Text}`}>
                  <div>CÙNG KỲ</div>
                  <div className="mt-0.5 text-xs font-black tracking-wide text-rose-600 sm:text-sm">{samePeriodLabel}</div>
                </th>
              </tr>
              <tr className="border-b-2 border-slate-300 bg-slate-50/95 text-base font-extrabold text-slate-800 sm:text-lg">
                <th className="whitespace-nowrap border-r border-slate-200 px-1 py-2 text-center align-middle">STT</th>
                {titleCell('ma_bcvh', 'Mã bưu cục', 'whitespace-nowrap border-r border-slate-200')}
                {titleCell('ten_bcvh', 'Tên bưu cục', 'whitespace-nowrap border-r border-slate-300')}
                {titleCell('volume', HEADER_VOLUME, 'border-r border-slate-200')}
                {titleCell('rate', rateHeader(indicator), 'border-r border-slate-300')}
                {titleCell('same_period_volume', HEADER_VOLUME, 'border-r border-slate-200')}
                {titleCell('same_period_rate', rateHeader(indicator), 'border-r border-slate-200')}
                {titleCell('same_period_delta', 'So sánh cùng kỳ')}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-base sm:text-lg">
              {totalRow ? (
                <tr className={`${theme.soft} border-b-2 font-black text-slate-950 ${theme.headerBorder}`}>
                  <td colSpan={3} className="whitespace-nowrap border-r border-slate-300 px-2 py-2 text-left font-black">TỔNG CỘNG</td>
                  {renderCells(totalRow)}
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr key={row.ma_bcvh} className="font-semibold text-slate-800 transition-colors hover:bg-slate-50">
                  <td className="whitespace-nowrap border-r border-slate-200 px-1 py-2 text-center text-slate-500">{row.stt}</td>
                  <td className="whitespace-nowrap border-r border-slate-200 px-1 py-2 text-center text-slate-500">{row.ma_bcvh}</td>
                  <td className="whitespace-nowrap border-r border-slate-300 px-2 py-2 text-left font-bold">{row.ten_bcvh}</td>
                  {renderCells(row)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
