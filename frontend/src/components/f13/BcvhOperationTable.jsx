import { useEffect, useState } from 'react';
import api from '../../api/client';
import {
  DASH,
  formatDeltaRate,
  formatRate,
  formatVolume,
  processBcvhOperationTableData,
} from '../../features/dashboard/components/bcvhOperationTableData';

function renderDeltaBadge(deltaValue) {
  if (deltaValue === null || deltaValue === undefined || deltaValue === '') {
    return <span className="text-slate-400 font-medium">{DASH}</span>;
  }
  const num = Number(deltaValue);
  if (!Number.isFinite(num)) {
    return <span className="text-slate-400 font-medium">{DASH}</span>;
  }

  const text = formatDeltaRate(num);
  let toneColor = 'text-slate-600 font-semibold';
  if (num > 0) {
    toneColor = 'text-emerald-700 font-bold';
  } else if (num < 0) {
    toneColor = 'text-rose-700 font-bold';
  }

  return <span className={toneColor}>{text}</span>;
}

export default function BcvhOperationTable({ globalFilter }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableModel, setTableModel] = useState(null);

  const anchorFromFilter = globalFilter?.dateRange?.[1] || null;

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = {};
        if (anchorFromFilter) {
          params.anchor_date = anchorFromFilter;
        }

        const response = await api.get('/f13/ranking/bcvh/overview', { params });
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
  }, [anchorFromFilter]);

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <span className="text-sm font-semibold">Đang tải bảng tổng hợp số liệu chỉ số F1.3 tại các BCVH...</span>
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

  const { titleLine1, titleLine2, totalRow, rows } = tableModel || processBcvhOperationTableData({});

  return (
    <section className="bcvh-operation-card w-full overflow-hidden rounded-2xl border border-slate-300 bg-white p-4 sm:p-5 shadow-sm">
      {/* Centered Capture-Ready Title (2 Lines) */}
      <div className="mb-4 text-center border-b border-slate-200 pb-3.5">
        <h2 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-tight text-slate-900 leading-snug">
          {titleLine1}
        </h2>
        <p className="mt-1 text-xs sm:text-sm md:text-base font-extrabold uppercase tracking-wide text-blue-900">
          {titleLine2}
        </p>
      </div>

      {/* 9-Column Table with 2-Level Header */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {/* Level 1: Grouped Headers */}
          <thead>
            <tr className="border-b border-slate-300 text-xs sm:text-sm">
              <th
                colSpan={3}
                className="bg-slate-100/90 text-slate-800 font-extrabold uppercase tracking-wider text-center py-2.5 px-3 border-r border-slate-200"
              >
                ĐƠN VỊ
              </th>
              <th
                colSpan={3}
                className="bg-blue-100/90 text-blue-950 font-black uppercase tracking-wider text-center py-2.5 px-3 border-r border-blue-200"
              >
                LŨY KẾ THÁNG
              </th>
              <th
                colSpan={3}
                className="bg-emerald-100/90 text-emerald-950 font-black uppercase tracking-wider text-center py-2.5 px-3"
              >
                ĐIỀU HÀNH NGÀY
              </th>
            </tr>

            {/* Level 2: Exact Column Headers */}
            <tr className="border-b-2 border-slate-300 bg-slate-50/90 text-slate-700 text-xs sm:text-sm font-bold">
              {/* Identity */}
              <th className="py-2.5 px-2 text-center w-12 min-w-[48px] border-r border-slate-200">
                STT
              </th>
              <th className="py-2.5 px-2 text-center w-28 min-w-[96px] border-r border-slate-200">
                Mã bưu cục
              </th>
              <th className="py-2.5 px-3 text-left min-w-[160px] border-r border-slate-300">
                Tên bưu cục
              </th>

              {/* Lũy kế tháng */}
              <th className="py-2.5 px-3 text-right min-w-[125px] border-r border-slate-200">
                Sản lượng đo kiểm
              </th>
              <th className="py-2.5 px-3 text-right min-w-[125px] border-r border-slate-200">
                Tỷ lệ đạt KPI 2026
              </th>
              <th className="py-2.5 px-3 text-right min-w-[185px] border-r border-slate-300">
                Tăng/giảm so với cùng kỳ tháng trước
              </th>

              {/* Điều hành ngày */}
              <th className="py-2.5 px-3 text-right min-w-[125px] border-r border-slate-200">
                Sản lượng đo kiểm
              </th>
              <th className="py-2.5 px-3 text-right min-w-[125px] border-r border-slate-200">
                Tỷ lệ đạt KPI 2026
              </th>
              <th className="py-2.5 px-3 text-right min-w-[200px]">
                Tăng/giảm so với ngày có dữ liệu gần nhất trước đó
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-sm sm:text-base">
            {/* Row 1: TỔNG CỘNG (First Row) */}
            <tr className="bg-blue-50/90 text-slate-900 font-black border-b-2 border-blue-300 hover:bg-blue-100/70 transition-colors">
              <td className="py-3 px-2 text-center text-slate-500 font-bold border-r border-blue-200">
                {totalRow.stt}
              </td>
              <td className="py-3 px-2 text-center text-slate-500 font-bold border-r border-blue-200">
                {totalRow.ma_bcvh}
              </td>
              <td className="py-3 px-3 text-left font-black text-blue-950 border-r border-slate-300">
                {totalRow.ten_bcvh}
              </td>

              {/* Lũy kế tháng */}
              <td className="py-3 px-3 text-right font-black tabular-nums border-r border-blue-200">
                {formatVolume(totalRow.mtd_volume)}
              </td>
              <td className="py-3 px-3 text-right font-black tabular-nums text-blue-950 border-r border-blue-200">
                {formatRate(totalRow.mtd_rate)}
              </td>
              <td className="py-3 px-3 text-right tabular-nums border-r border-slate-300">
                {renderDeltaBadge(totalRow.mtd_delta_rate)}
              </td>

              {/* Điều hành ngày */}
              <td className="py-3 px-3 text-right font-black tabular-nums border-r border-emerald-200">
                {formatVolume(totalRow.daily_volume)}
              </td>
              <td className="py-3 px-3 text-right font-black tabular-nums text-emerald-950 border-r border-emerald-200">
                {formatRate(totalRow.daily_rate)}
              </td>
              <td className="py-3 px-3 text-right tabular-nums">
                {renderDeltaBadge(totalRow.daily_delta_rate)}
              </td>
            </tr>

            {/* Rows 2..7: The 6 Canonical BCVH (STT 1..6) */}
            {rows.map((row) => (
              <tr key={row.ma_bcvh} className="hover:bg-slate-50/90 transition-colors font-medium text-slate-800">
                <td className="py-2.5 px-2 text-center font-bold text-slate-600 border-r border-slate-200">
                  {row.stt}
                </td>
                <td className="py-2.5 px-2 text-center font-semibold text-slate-700 border-r border-slate-200 tabular-nums">
                  {row.ma_bcvh}
                </td>
                <td className="py-2.5 px-3 text-left font-bold text-slate-900 border-r border-slate-300">
                  {row.ten_bcvh}
                </td>

                {/* Lũy kế tháng */}
                <td className="py-2.5 px-3 text-right font-semibold text-slate-800 tabular-nums border-r border-slate-200">
                  {formatVolume(row.mtd_volume)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums border-r border-slate-200">
                  {formatRate(row.mtd_rate)}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-slate-300">
                  {renderDeltaBadge(row.mtd_delta_rate)}
                </td>

                {/* Điều hành ngày */}
                <td className="py-2.5 px-3 text-right font-semibold text-slate-800 tabular-nums border-r border-slate-200">
                  {formatVolume(row.daily_volume)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums border-r border-slate-200">
                  {formatRate(row.daily_rate)}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums">
                  {renderDeltaBadge(row.daily_delta_rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
