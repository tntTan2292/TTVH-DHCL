import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import {
  DASH,
  formatDeltaIndicator,
  formatRate,
  formatVolume,
  processBcvhOperationTableData,
} from '../../features/dashboard/components/bcvhOperationTableData';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_TONE_CLASS,
} from './f13HeatmapBandCatalog';

function renderDeltaBadge(deltaValue) {
  const { display, toneClass } = formatDeltaIndicator(deltaValue);
  return <span className={toneClass}>{display}</span>;
}

function renderRateBadge(rate) {
  if (rate === null || rate === undefined || rate === '') {
    return <span className="text-slate-400 font-medium">{DASH}</span>;
  }
  const num = Number(rate);
  if (!Number.isFinite(num)) {
    return <span className="text-slate-400 font-medium">{DASH}</span>;
  }
  const band = classifyF13HeatmapRate(num);
  const toneClass = F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable;
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[64px] px-2 py-0.5 rounded-md border text-base sm:text-lg font-bold tabular-nums ${toneClass}`}
      title={`${band.label}: ${formatRate(num)}`}
    >
      {formatRate(num)}
    </span>
  );
}

export default function BcvhOperationTable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableModel, setTableModel] = useState(null);
  const [fitMode, setFitMode] = useState(true);
  const containerRef = useRef(null);
  const tableRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState(null);

  useEffect(() => {
    if (!fitMode || !containerRef.current || !tableRef.current) {
      setScaledHeight(null);
      return;
    }
    const updateScale = () => {
      if (!containerRef.current || !tableRef.current) return;
      const cWidth = containerRef.current.clientWidth;
      const tWidth = tableRef.current.scrollWidth || 1400;
      if (tWidth > 0 && cWidth > 0) {
        const scale = Math.min(1, cWidth / tWidth);
        setFitScale(scale);
        const tHeight = tableRef.current.scrollHeight;
        setScaledHeight(tHeight * scale);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [fitMode, tableModel]);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Table anchor is always the latest system-wide fact date ("SỐ LIỆU GẦN NHẤT")
        const response = await api.get('/f13/ranking/bcvh/overview');
        if (!active) return;

        if (response.data && response.data.success) {
          const model = processBcvhOperationTableData(response.data.data);
          setTableModel(model);
        } else {
          throw new Error(response.data?.error?.message || 'Không thể tải dữ liệu bảng BCVH.');
        }
      } catch (err) {
        if (!active) return;
        console.error('[BcvhOperationTable] fetch error:', err);
        setError(err.message || 'Lỗi khi tải bảng BCVH.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <span className="text-base font-bold">Đang tải bảng tổng hợp số liệu chỉ số F1.3 tại các BCVH...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-2xl border border-rose-200 bg-rose-50/60 p-6 shadow-sm">
        <div className="text-center text-rose-800">
          <p className="text-base font-bold">Không thể tải bảng tổng hợp BCVH</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded-lg bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    );
  }

  const {
    titleLine1,
    titleLine2,
    mtdHeaderContext,
    dailyHeaderContext,
    totalRow,
    rows,
  } = tableModel || processBcvhOperationTableData({});

  return (
    <section className="bcvh-operation-card w-full rounded-2xl border border-slate-300 bg-white p-3 sm:p-5 shadow-sm">
      {/* Centered Capture-Ready Title (2 Lines) + Mobile View Controls */}
      <div className="mb-4 text-center border-b border-slate-200 pb-3 relative">
        <h2 className="text-base sm:text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 leading-snug whitespace-normal sm:whitespace-nowrap">
          {titleLine1}
        </h2>
        <p className="mt-1 text-xs sm:text-base md:text-lg font-black uppercase tracking-wide text-blue-900 whitespace-normal sm:whitespace-nowrap">
          {titleLine2}
        </p>
        <div className="mt-2 flex justify-center items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setFitMode(!fitMode)}
            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors shadow-xs"
          >
            {fitMode ? '🔍 Chế độ cuộn chi tiết' : '📱 Xem trọn bảng (Fit màn hình)'}
          </button>
        </div>
      </div>

      {/* 10-Column Table with 2-Level Header */}
      <div
        ref={containerRef}
        className={`w-full ${
          fitMode
            ? 'overflow-hidden transition-all'
            : 'overflow-x-auto lg:overflow-x-visible'
        }`}
        style={fitMode && scaledHeight ? { height: `${scaledHeight}px` } : undefined}
      >
        <div
          style={
            fitMode
              ? {
                  transform: `scale(${fitScale})`,
                  transformOrigin: 'top left',
                  width: `${(100 / fitScale).toFixed(2)}%`,
                }
              : undefined
          }
        >
          <table ref={tableRef} className="w-full text-left border-collapse table-fixed min-w-[960px] lg:min-w-full">
          {/* 10-column locked colgroup (PO amendment 2026-09-22): Đơn vị (30%), Lũy kế tháng (30% = 3 * 10%), Điều hành ngày (40% = 4 * 10%) */}
          <colgroup>
            {/* ĐƠN VỊ (30%) */}
            <col style={{ width: '5%' }} className="w-[5%]" />
            <col style={{ width: '8%' }} className="w-[8%]" />
            <col style={{ width: '17%' }} className="w-[17%]" />
            {/* LŨY KẾ THÁNG (30%) */}
            <col style={{ width: '10%' }} className="w-[10%]" />
            <col style={{ width: '10%' }} className="w-[10%]" />
            <col style={{ width: '10%' }} className="w-[10%]" />
            {/* ĐIỀU HÀNH NGÀY (40%) */}
            <col style={{ width: '10%' }} className="w-[10%]" />
            <col style={{ width: '10%' }} className="w-[10%]" />
            <col style={{ width: '10%' }} className="w-[10%]" />
            <col style={{ width: '10%' }} className="w-[10%]" />
          </colgroup>

          {/* Level 1: Grouped Headers */}
          <thead>
            <tr className="border-b border-slate-300">
              <th
                colSpan={3}
                className="bg-slate-100/90 text-slate-800 font-black uppercase tracking-wider text-center align-middle py-2 px-1.5 border-r border-slate-300 text-xs sm:text-sm md:text-base whitespace-nowrap"
              >
                <div>ĐƠN VỊ</div>
                <div className="text-[11px] sm:text-xs font-bold text-slate-500 tracking-normal mt-0.5">6 BƯU CỤC VẬN HÀNH</div>
              </th>
              <th
                colSpan={3}
                className="bg-blue-100/90 text-blue-950 font-black uppercase tracking-wider text-center align-middle py-2.5 px-2 border-r border-blue-300 text-sm md:text-base whitespace-nowrap"
              >
                <div>LŨY KẾ THÁNG</div>
                <div className="text-xs sm:text-sm font-black text-rose-600 tracking-wide mt-0.5 whitespace-nowrap">
                  {mtdHeaderContext}
                </div>
              </th>
              <th
                colSpan={4}
                className="bg-emerald-100/90 text-emerald-950 font-black uppercase tracking-wider text-center align-middle py-2.5 px-2 text-sm md:text-base whitespace-nowrap"
              >
                <div>ĐIỀU HÀNH NGÀY</div>
                <div className="text-xs sm:text-sm font-black text-rose-600 tracking-wide mt-0.5 whitespace-nowrap">
                  {dailyHeaderContext}
                </div>
              </th>
            </tr>

            {/* Level 2: Exact Column Headers (All 10 horizontally and vertically centered, 16-18px) */}
            <tr className="border-b-2 border-slate-300 bg-slate-50/95 text-slate-800 text-base sm:text-lg font-extrabold">
              {/* Identity (30%) */}
              <th className="py-2 px-1 text-center align-middle w-[5%] border-r border-slate-200 whitespace-nowrap">
                STT
              </th>
              <th className="py-2 px-1 text-center align-middle w-[8%] border-r border-slate-200 whitespace-nowrap">
                Mã bưu cục
              </th>
              <th className="py-2 px-2 text-center align-middle w-[17%] border-r border-slate-300 whitespace-nowrap">
                Tên bưu cục
              </th>

              {/* Lũy kế tháng (30% = 3 * 10%) */}
              <th className="py-2 px-1 text-center align-middle w-[10%] border-r border-slate-200 leading-snug">
                Sản lượng đo kiểm
              </th>
              <th className="py-2 px-1 text-center align-middle w-[10%] border-r border-slate-200 leading-snug">
                Tỷ lệ đạt KPI 2026
              </th>
              <th className="py-2 px-1 text-center align-middle w-[10%] border-r border-slate-300 leading-snug">
                <span className="block">Tăng/giảm so với</span>
                <span className="block">cùng kỳ tháng trước</span>
              </th>

              {/* Điều hành ngày (40% = 4 * 10%) */}
              <th className="py-2 px-1 text-center align-middle w-[10%] border-r border-slate-200 leading-snug">
                Sản lượng đo kiểm
              </th>
              <th className="py-2 px-1 text-center align-middle w-[10%] border-r border-slate-200 leading-snug">
                Tỷ lệ đạt KPI 2026
              </th>
              <th className="py-2 px-1 text-center align-middle w-[10%] border-r border-slate-200 leading-snug">
                <span className="block">Tăng/Giảm so với</span>
                <span className="block">ngày trước</span>
              </th>
              <th className="py-2 px-1 text-center align-middle w-[10%] leading-snug">
                <span className="block">Tăng/giảm so với</span>
                <span className="block">cùng kỳ (tuần trước)</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-base sm:text-lg">
            {/* Row 1: TỔNG CỘNG (First Row) */}
            <tr className="bg-blue-50/90 text-slate-950 font-black border-b-2 border-blue-300 hover:bg-blue-100/70 transition-colors">
              <td className="py-2.5 px-1 text-center text-slate-500 font-extrabold border-r border-blue-200 whitespace-nowrap">
                {totalRow.stt}
              </td>
              <td className="py-2.5 px-1 text-center text-slate-500 font-extrabold border-r border-blue-200 whitespace-nowrap">
                {totalRow.ma_bcvh}
              </td>
              <td className="py-2.5 px-2 text-left font-black text-blue-950 border-r border-slate-300 whitespace-nowrap">
                {totalRow.ten_bcvh}
              </td>

              {/* Lũy kế tháng (30%) */}
              <td className="py-2.5 px-2 text-right font-black tabular-nums border-r border-blue-200 whitespace-nowrap">
                {formatVolume(totalRow.mtd_volume)}
              </td>
              <td className="py-2.5 px-1 sm:px-2 text-center tabular-nums border-r border-blue-200 whitespace-nowrap">
                {renderRateBadge(totalRow.mtd_rate)}
              </td>
              <td className="py-2.5 px-2 text-right tabular-nums border-r border-slate-300 whitespace-nowrap">
                {renderDeltaBadge(totalRow.mtd_delta_rate)}
              </td>

              {/* Điều hành ngày (40%) */}
              <td className="py-2.5 px-2 text-right font-black tabular-nums border-r border-emerald-200 whitespace-nowrap">
                {formatVolume(totalRow.daily_volume)}
              </td>
              <td className="py-2.5 px-1 sm:px-2 text-center tabular-nums border-r border-emerald-200 whitespace-nowrap">
                {renderRateBadge(totalRow.daily_rate)}
              </td>
              <td className="py-2.5 px-2 text-right tabular-nums border-r border-emerald-200 whitespace-nowrap">
                {renderDeltaBadge(totalRow.daily_delta_rate)}
              </td>
              <td className="py-2.5 px-2 text-right tabular-nums whitespace-nowrap">
                {renderDeltaBadge(totalRow.daily_week_delta_rate)}
              </td>
            </tr>

            {/* Rows 2..7: The 6 Canonical BCVH (STT 1..6 sorted by daily_rate DESC) */}
            {rows.map((row) => (
              <tr key={row.ma_bcvh} className="hover:bg-slate-50/90 transition-colors font-bold text-slate-800">
                <td className="py-2.5 px-1 text-center font-extrabold text-slate-600 border-r border-slate-200 whitespace-nowrap">
                  {row.stt}
                </td>
                <td className="py-2.5 px-1 text-center font-bold text-slate-700 border-r border-slate-200 tabular-nums whitespace-nowrap">
                  {row.ma_bcvh}
                </td>
                <td className="py-2.5 px-2 text-left font-black text-slate-900 border-r border-slate-300 whitespace-nowrap">
                  {row.ten_bcvh}
                </td>

                {/* Lũy kế tháng (30%) */}
                <td className="py-2.5 px-2 text-right font-bold text-slate-800 tabular-nums border-r border-slate-200 whitespace-nowrap">
                  {formatVolume(row.mtd_volume)}
                </td>
                <td className="py-2.5 px-1 sm:px-2 text-center tabular-nums border-r border-slate-200 whitespace-nowrap">
                  {renderRateBadge(row.mtd_rate)}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums border-r border-slate-300 whitespace-nowrap">
                  {renderDeltaBadge(row.mtd_delta_rate)}
                </td>

                {/* Điều hành ngày (40%) */}
                <td className="py-2.5 px-2 text-right font-bold text-slate-800 tabular-nums border-r border-slate-200 whitespace-nowrap">
                  {formatVolume(row.daily_volume)}
                </td>
                <td className="py-2.5 px-1 sm:px-2 text-center tabular-nums border-r border-slate-200 whitespace-nowrap">
                  {renderRateBadge(row.daily_rate)}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums border-r border-slate-200 whitespace-nowrap">
                  {renderDeltaBadge(row.daily_delta_rate)}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums whitespace-nowrap">
                  {renderDeltaBadge(row.daily_week_delta_rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
}
