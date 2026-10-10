import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, Grid, Search } from 'lucide-react';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { useIndicatorApi } from '../../indicator/useIndicatorApi.js';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_TONE_CLASS,
  F13_HEATMAP_DOT_CLASS,
} from '../../../components/f13/f13HeatmapBandCatalog.js';
import { buildMonthlyHeatmapLegend } from '../../indicator/indicatorConfig.js';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';

export default function F11PairTableBlock({ anchorDate, toDate }) {
  const indicator = useIndicator();
  const api = useIndicatorApi();
  const effectiveAnchor = anchorDate || toDate;

  const [period, setPeriod] = useState('day');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState('volume_desc');
  const [highlightedCol, setHighlightedCol] = useState(null);

  const [state, setState] = useState({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!effectiveAnchor) return undefined;

    let active = true;
    queueMicrotask(() => {
      if (active) {
        setState((prev) => (prev.status === 'loading' ? prev : { ...prev, status: 'loading', error: null }));
      }
    });

    api.get('/f11/dashboard/pair-table', {
      params: { period, anchor_date: effectiveAnchor },
    })
      .then((res) => {
        if (!active) return;
        if (res.data && res.data.success) {
          setState({
            status: 'success',
            data: res.data.data,
            error: null,
          });
        } else {
          setState({
            status: 'error',
            data: null,
            error: res.data?.error?.message || 'Không thể tải bảng cặp bưu cục chấp nhận × BCVH.',
          });
        }
      })
      .catch((err) => {
        if (!active) return;
        setState({
          status: 'error',
          data: null,
          error: err?.response?.data?.error?.message || err?.message || 'Lỗi khi tải bảng cặp chấp nhận × BCVH.',
        });
      });

    return () => {
      active = false;
    };
  }, [api, effectiveAnchor, period]);

  const rows = state.data?.rows;
  const columns = state.data?.columns || [];
  const totalRow = state.data?.total_row || null;
  const meta = state.data?.meta || {};
  const totalRowCount = rows ? rows.length : 0;

  const filteredAndSortedRows = useMemo(() => {
    if (!rows || !rows.length) return [];
    let result = [...rows];

    if (searchTerm.trim()) {
      const lower = searchTerm.trim().toLowerCase();
      result = result.filter((row) => {
        const name = String(row.ten_chap_nhan || '').toLowerCase();
        const code = String(row.ma_chap_nhan || '').toLowerCase();
        return name.includes(lower) || code.includes(lower);
      });
    }

    result.sort((a, b) => {
      if (sortMode === 'volume_desc') {
        return (Number(b.total?.volume) || 0) - (Number(a.total?.volume) || 0);
      }
      if (sortMode === 'rate_asc') {
        const ra = a.total?.rate !== null && a.total?.rate !== undefined ? Number(a.total.rate) : 9999;
        const rb = b.total?.rate !== null && b.total?.rate !== undefined ? Number(b.total.rate) : 9999;
        if (ra !== rb) return ra - rb;
        return (Number(b.total?.volume) || 0) - (Number(a.total?.volume) || 0);
      }
      if (sortMode === 'rate_desc') {
        const ra = a.total?.rate !== null && a.total?.rate !== undefined ? Number(a.total.rate) : -1;
        const rb = b.total?.rate !== null && b.total?.rate !== undefined ? Number(b.total.rate) : -1;
        if (ra !== rb) return rb - ra;
        return (Number(b.total?.volume) || 0) - (Number(a.total?.volume) || 0);
      }
      if (sortMode === 'name_asc') {
        return String(a.ten_chap_nhan || '').localeCompare(String(b.ten_chap_nhan || ''));
      }
      return 0;
    });

    return result;
  }, [rows, searchTerm, sortMode]);

  const toggleColumnHighlight = (colCode) => {
    setHighlightedCol((prev) => (prev === colCode ? null : colCode));
  };

  const periodLabel = period === 'day'
    ? `Ngày ${meta.from_date || effectiveAnchor}`
    : period === 'week'
      ? `Tuần T5–T4 (${meta.from_date} đến ${meta.to_date})`
      : `Tháng (${meta.from_date} đến ${meta.to_date})`;

  const sectionRef = useRef(null);

  return (
    <section ref={sectionRef} className="rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-150">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#003E7E] text-white shadow-2xs">
            <Grid size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Bưu cục chấp nhận × BCVH phát</h2>
              {meta.office_count ? (
                <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {meta.office_count} bưu cục chấp nhận
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Ma trận chất lượng phát nội tỉnh theo từng cặp tuyến chấp nhận và phát trả ({periodLabel})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period switcher */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setPeriod('day')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all duration-150 cursor-pointer ${
                period === 'day'
                  ? 'bg-[#003E7E] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Theo ngày
            </button>
            <button
              type="button"
              onClick={() => setPeriod('week')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all duration-150 cursor-pointer ${
                period === 'week'
                  ? 'bg-[#003E7E] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Tuần (T5–T4)
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all duration-150 cursor-pointer ${
                period === 'month'
                  ? 'bg-[#003E7E] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Theo tháng
            </button>
          </div>

          <BlockCaptureButton
            targetRef={sectionRef}
            blockTitle="Bưu cục chấp nhận × BCVH phát"
            dateOrPeriod={effectiveAnchor}
          />
        </div>
      </div>

      {/* Controls Bar */}
      <div className="border-b border-slate-200/70 bg-white px-4 py-2.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm bưu cục chấp nhận (tên hoặc mã)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#003E7E] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown size={14} className="text-slate-500" />
              <span className="font-medium text-slate-600">Sắp xếp:</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs focus:border-[#003E7E] focus:outline-none cursor-pointer"
              >
                <option value="volume_desc">Sản lượng cao nhất</option>
                <option value="rate_asc">Tỷ lệ thấp nhất (bưu cục yếu)</option>
                <option value="rate_desc">Tỷ lệ cao nhất</option>
                <option value="name_asc">Tên bưu cục (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-2.5 flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
          <span className="font-bold text-slate-700">Quy tắc màu:</span>
          {buildMonthlyHeatmapLegend(indicator).map((entry) => (
            <div key={entry.tone} className="flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded-full ${F13_HEATMAP_DOT_CLASS[entry.tone] || F13_HEATMAP_DOT_CLASS.unavailable}`} />
              <span>{entry.label} ({entry.description})</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-bold">—</span>
            <span>Không có sản lượng</span>
          </div>
          <span className="text-slate-400 italic ml-auto">Bấm tiêu đề BCVH để làm nổi bật cột</span>
        </div>
      </div>

      <div className="p-4">
        {state.status === 'loading' ? (
          <div className="flex h-40 items-center justify-center">
            <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#003E7E] border-t-transparent" />
              <span>Đang tải ma trận bưu cục chấp nhận × BCVH...</span>
            </div>
          </div>
        ) : state.status === 'error' ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
            {state.error}
          </div>
        ) : !totalRowCount ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
            Không có dữ liệu bưu cục chấp nhận trong kỳ {periodLabel}.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-2xs">
            <div className="max-h-[560px] overflow-x-auto overflow-y-auto">
              <table className="w-full border-collapse text-left text-xs text-slate-700">
                <thead className="sticky top-0 z-20 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-700 shadow-2xs">
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 z-30 bg-slate-100 px-3.5 py-3 border-r border-b border-slate-200 min-w-[200px]"
                    >
                      Bưu cục chấp nhận
                    </th>
                    {columns.map((col) => {
                      const isHighlighted = highlightedCol === col.ma_bcvh;
                      return (
                        <th
                          key={col.ma_bcvh}
                          scope="col"
                          onClick={() => toggleColumnHighlight(col.ma_bcvh)}
                          title="Bấm để làm nổi bật cột này"
                          className={`cursor-pointer px-3 py-2.5 text-center border-b border-r border-slate-200 min-w-[110px] transition-colors select-none ${
                            isHighlighted
                              ? 'bg-blue-100 text-[#003E7E] font-black ring-2 ring-inset ring-[#003E7E]'
                              : 'hover:bg-slate-200/70'
                          }`}
                        >
                          <div className="text-[11px] leading-tight font-bold">{col.ten_bcvh}</div>
                          {col.ma_bcvh !== 'OTHER' ? (
                            <div className="text-[10px] font-normal opacity-75">{col.ma_bcvh}</div>
                          ) : null}
                        </th>
                      );
                    })}
                    <th
                      scope="col"
                      className="px-3.5 py-3 text-center border-b border-slate-200 min-w-[110px] bg-slate-200/80 font-black text-slate-900"
                    >
                      Tổng cộng
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 bg-white">
                  {filteredAndSortedRows.map((row) => (
                    <tr
                      key={row.ma_chap_nhan || row.ten_chap_nhan}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="sticky left-0 z-10 bg-white px-3.5 py-2.5 font-medium border-r border-slate-200 whitespace-nowrap shadow-xs">
                        <div className="text-slate-900 font-semibold">{row.ten_chap_nhan}</div>
                        {row.ma_chap_nhan ? (
                          <div className="text-[10px] text-slate-400">{row.ma_chap_nhan}</div>
                        ) : null}
                      </td>

                      {columns.map((col) => {
                        const cellData = row.cells?.[col.ma_bcvh];
                        const isHighlighted = highlightedCol === col.ma_bcvh;
                        const hasVolume = cellData && cellData.volume > 0;
                        const band = hasVolume ? classifyF13HeatmapRate(cellData.rate, indicator.heatmapBands) : null;
                        const toneClass = band ? (F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable) : '';

                        return (
                          <td
                            key={col.ma_bcvh}
                            className={`px-2.5 py-2 text-center border-r border-slate-200/80 whitespace-nowrap ${
                              isHighlighted ? 'bg-blue-50/40' : ''
                            }`}
                          >
                            {hasVolume ? (
                              <div
                                title={`Đạt ${cellData.passed}/${cellData.volume} (${cellData.rate}%)${cellData.blank ? ` · Trống: ${cellData.blank}` : ''}`}
                                className="flex flex-col items-center"
                              >
                                <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-bold tabular-nums ${toneClass}`}>
                                  {cellData.rate !== null ? `${Number(cellData.rate).toFixed(1)}%` : '—'}
                                </span>
                                <span className="mt-0.5 text-[10px] font-medium text-slate-500 tabular-nums">
                                  {Number(cellData.volume).toLocaleString('vi-VN')} BG
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-bold">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Row Total */}
                      <td className="px-2.5 py-2 text-center bg-slate-50/60 font-semibold whitespace-nowrap">
                        {row.total && row.total.volume > 0 ? (
                          (() => {
                            const totalBand = classifyF13HeatmapRate(row.total.rate, indicator.heatmapBands);
                            const totalToneClass = F13_HEATMAP_TONE_CLASS[totalBand.tone] || F13_HEATMAP_TONE_CLASS.unavailable;
                            return (
                              <div className="flex flex-col items-center">
                                <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-black tabular-nums ${totalToneClass}`}>
                                  {row.total.rate !== null ? `${Number(row.total.rate).toFixed(1)}%` : '—'}
                                </span>
                                <span className="mt-0.5 text-[10px] font-bold text-slate-700 tabular-nums">
                                  {Number(row.total.volume).toLocaleString('vi-VN')} BG
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Grand Total Row */}
                {totalRow ? (
                  <tfoot className="sticky bottom-0 z-20 border-t-2 border-slate-300 bg-slate-100 font-bold shadow-md">
                    <tr>
                      <td className="sticky left-0 z-30 bg-slate-100 px-3.5 py-3 border-r border-slate-300 text-slate-900 font-black whitespace-nowrap shadow-xs">
                        {totalRow.ten_chap_nhan || 'TỔNG CỘNG'}
                      </td>

                      {columns.map((col) => {
                        const cellData = totalRow.cells?.[col.ma_bcvh];
                        const isHighlighted = highlightedCol === col.ma_bcvh;
                        const hasVolume = cellData && cellData.volume > 0;
                        const band = hasVolume ? classifyF13HeatmapRate(cellData.rate, indicator.heatmapBands) : null;
                        const toneClass = band ? (F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable) : '';

                        return (
                          <td
                            key={col.ma_bcvh}
                            className={`px-2.5 py-2.5 text-center border-r border-slate-300 whitespace-nowrap ${
                              isHighlighted ? 'bg-blue-100/70' : 'bg-slate-100'
                            }`}
                          >
                            {hasVolume ? (
                              <div
                                title={`Tổng cột: Đạt ${cellData.passed}/${cellData.volume} (${cellData.rate}%)`}
                                className="flex flex-col items-center"
                              >
                                <span className={`inline-block rounded border px-2 py-0.5 text-xs font-black tabular-nums ${toneClass}`}>
                                  {cellData.rate !== null ? `${Number(cellData.rate).toFixed(1)}%` : '—'}
                                </span>
                                <span className="mt-0.5 text-[10px] font-black text-slate-800 tabular-nums">
                                  {Number(cellData.volume).toLocaleString('vi-VN')} BG
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-bold">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Grand Total */}
                      <td className="px-2.5 py-2.5 text-center bg-slate-200 font-black whitespace-nowrap">
                        {totalRow.total && totalRow.total.volume > 0 ? (
                          (() => {
                            const grandBand = classifyF13HeatmapRate(totalRow.total.rate, indicator.heatmapBands);
                            const grandToneClass = F13_HEATMAP_TONE_CLASS[grandBand.tone] || F13_HEATMAP_TONE_CLASS.unavailable;
                            return (
                              <div className="flex flex-col items-center">
                                <span className={`inline-block rounded border px-2 py-0.5 text-xs font-black tabular-nums ${grandToneClass}`}>
                                  {totalRow.total.rate !== null ? `${Number(totalRow.total.rate).toFixed(1)}%` : '—'}
                                </span>
                                <span className="mt-0.5 text-[10px] font-black text-slate-900 tabular-nums">
                                  {Number(totalRow.total.volume).toLocaleString('vi-VN')} BG
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-slate-400 font-bold">—</span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3.5 py-2 text-[11px] text-slate-500 border-t border-slate-200">
              <span>
                Hiển thị {filteredAndSortedRows.length} / {totalRowCount} bưu cục chấp nhận có dữ liệu phát sinh.
              </span>
              <span>
                Cột &quot;Khác&quot; bao gồm các mã bưu cục phát ngoài 6 BCVH chính để khớp 100% với sản lượng toàn trình nội tỉnh.
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
