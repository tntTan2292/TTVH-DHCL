import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Grid, Search } from 'lucide-react';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { useIndicatorApi } from '../../indicator/useIndicatorApi.js';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_TONE_CLASS,
  F13_HEATMAP_DOT_CLASS,
} from '../../../components/f13/f13HeatmapBandCatalog.js';
import { buildMonthlyHeatmapLegend, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { cellFieldValue, nextSortState, sortRowsBy } from '../../../components/common/tableSort.js';
import { describePairSort, orderPairColumns, pairRowValue } from './f11PairTableSort.js';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { waitForNextPaint } from '../../../components/common/blockCaptureHelper.js';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { generateRecentWeeks, generateRecentMonths } from '../../../components/common/periodFilterHelpers.js';

function MiniSort({ field, label, sort, onSort, activeClassName }) {
  const active = sort?.field === field;
  return (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); onSort(field); }}
      title={`Sắp xếp các bưu cục theo ${label === 'SL' ? 'sản lượng' : 'tỷ lệ đạt'} cột này (bấm lại để đảo chiều)`}
      className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold normal-case tracking-normal transition-colors cursor-pointer ${active ? activeClassName : 'text-slate-500 hover:bg-slate-200/80'}`}
    >
      {label}
      {active ? (sort.direction === 'asc' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />) : <ArrowUpDown className="h-2 w-2 opacity-40" />}
    </button>
  );
}

// While the picture is taken the block is laid out for reading in a chat window (PO 2026-10-10): text about twice
// as large, columns of one even width that fit their content, rows only as high as needed, the frame as narrow as
// the table. Selectors use the pair-* markers below; the screen layout is untouched the rest of the time.
export const PAIR_CAPTURE_CSS = `
.pair-capturing { width: fit-content !important; max-width: none !important; }
.pair-capturing .pair-table { table-layout: fixed; width: auto; border-collapse: collapse; }
.pair-capturing .pair-table th, .pair-capturing .pair-table td { padding: 7px 6px; }
.pair-capturing .pair-table thead th { width: 150px; min-width: 0; padding-top: 10px; padding-bottom: 10px; }
.pair-capturing .pair-table thead th.pair-th-first { width: 410px; text-align: left; padding-left: 16px; font-size: 18px; }
.pair-capturing .pair-table td:first-child { padding-left: 16px; white-space: nowrap; }
.pair-capturing .pair-th-name { font-size: 18px; line-height: 1.15; white-space: nowrap; }
.pair-capturing .pair-th-code { font-size: 13px; }
.pair-capturing .pair-th-total { font-size: 18px; white-space: nowrap; }
.pair-capturing thead svg { display: none; }
.pair-capturing tfoot td:first-child { font-size: 21px; }
/* office name and code on one line, rate and volume of a cell on one line: low rows, wide columns */
.pair-capturing .pair-name { display: inline-block; font-size: 21px; line-height: 1.2; font-weight: 700; white-space: nowrap; }
.pair-capturing .pair-code { display: inline-block; font-size: 13px; margin: 0 0 0 10px; }
.pair-capturing .pair-cell { flex-direction: row; align-items: center; justify-content: center; gap: 9px; white-space: nowrap; }
.pair-capturing .pair-rate { font-size: 21px; line-height: 1.2; padding: 2px 9px; border-radius: 8px; }
.pair-capturing .pair-vol { font-size: 15px; margin-top: 0; }
.pair-capturing .pair-title { font-size: 28px; }
.pair-capturing .pair-subtitle { font-size: 16px; }
.pair-capturing .pair-chip { font-size: 15px; }
.pair-capturing .pair-legend { font-size: 15px; margin-top: 0; padding-top: 0; border-top: 0; }
.pair-capturing .pair-controls { padding-top: 6px; padding-bottom: 10px; }
/* the controls are not in the picture, so they must not take room while the frame is measured either */
.pair-capturing [data-no-capture="true"] { display: none !important; }
.pair-capturing .pair-foot { font-size: 14px; gap: 8px; }
/* long one-line texts must not widen the frame: they wrap inside the width of the table */
.pair-capturing .pair-legend, .pair-capturing .pair-foot { width: 0; min-width: 100%; }
`;

export default function F11PairTableBlock({ anchorDate, toDate }) {
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const api = useIndicatorApi();
  const effectiveAnchor = anchorDate || toDate;

  const [period, setPeriod] = useState('day');
  const [selectedDay, setSelectedDay] = useState(effectiveAnchor || '');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    if (effectiveAnchor) {
      setSelectedDay(effectiveAnchor);
    }
  }, [effectiveAnchor]);

  const weekOptions = useMemo(() => generateRecentWeeks(effectiveAnchor, 12), [effectiveAnchor]);
  const monthOptions = useMemo(() => generateRecentMonths(effectiveAnchor, 12), [effectiveAnchor]);

  const activeAnchorDate = useMemo(() => {
    if (period === 'day') return selectedDay || effectiveAnchor;
    if (period === 'week') return selectedWeek || weekOptions[0]?.value || effectiveAnchor;
    if (period === 'month') return selectedMonth || monthOptions[0]?.value || effectiveAnchor;
    return effectiveAnchor;
  }, [period, selectedDay, selectedWeek, selectedMonth, weekOptions, monthOptions, effectiveAnchor]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState({ field: 'total:volume', direction: 'desc' });
  const [colOrder, setColOrder] = useState(null); // null = the server's column order
  const handleSort = (field) => setSort((current) => nextSortState(current, field, { textFields: ['name'] }));
  const handleColOrder = (metric) => setColOrder((current) => (
    current && current.metric === metric
      ? { metric, direction: current.direction === 'desc' ? 'asc' : 'desc' }
      : { metric, direction: 'desc' }
  ));
  const [highlightedCol, setHighlightedCol] = useState(null);
  // The picture of this table (PO 2026-10-10): 60+ offices make a tall, tiny image, so the camera takes only the
  // top N rows in the order the user chose (default 25), without the controls, plus the total row.
  const [captureTop, setCaptureTop] = useState(20); // number | 'all'
  const [capturing, setCapturing] = useState(false);

  const [state, setState] = useState({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!activeAnchorDate) return undefined;

    let active = true;
    queueMicrotask(() => {
      if (active) {
        setState((prev) => (prev.status === 'loading' ? prev : { ...prev, status: 'loading', error: null }));
      }
    });

    api.get('/f11/dashboard/pair-table', {
      params: { period, anchor_date: activeAnchorDate },
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
  }, [api, activeAnchorDate, period]);

  const rows = state.data?.rows;
  const columns = useMemo(() => state.data?.columns || [], [state.data]);
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

    result = sortRowsBy(result, sort.field, sort.direction, pairRowValue);

    return result;
  }, [rows, searchTerm, sort]);

  const visibleRows = capturing && captureTop !== 'all' ? filteredAndSortedRows.slice(0, captureTop) : filteredAndSortedRows;
  const sortedColumns = useMemo(() => orderPairColumns(columns, totalRow, colOrder), [columns, totalRow, colOrder]);
  // in the picture a delivering-unit column with no parcel at all is left out (it would only be an empty strip)
  const orderedColumns = capturing
    ? sortedColumns.filter((col) => cellFieldValue(totalRow?.cells?.[col.ma_bcvh], 'volume') !== null
      || visibleRows.some((row) => cellFieldValue(row.cells?.[col.ma_bcvh], 'volume') !== null))
    : sortedColumns;

  const toggleColumnHighlight = (colCode) => {
    setHighlightedCol((prev) => (prev === colCode ? null : colCode));
  };

  const periodLabel = period === 'day'
    ? `Ngày ${meta.from_date || activeAnchorDate}`
    : period === 'week'
      ? `Tuần T5–T4 (${meta.from_date || ''} đến ${meta.to_date || ''})`
      : `Tháng (${meta.from_date || ''} đến ${meta.to_date || ''})`;

  const sectionRef = useRef(null);

  return (
    <section ref={sectionRef} className={`rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-150 ${capturing ? 'pair-capturing' : ''}`}>
      {capturing ? <style>{PAIR_CAPTURE_CSS}</style> : null}
      <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme.button} shadow-2xs`}>
            <Grid size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="pair-title text-base font-bold text-slate-900">Bưu cục chấp nhận × BCVH phát</h2>
              {meta.office_count ? (
                <span className="pair-chip inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {meta.office_count} bưu cục chấp nhận
                </span>
              ) : null}
            </div>
            <p className="pair-subtitle mt-0.5 text-xs font-medium text-slate-500">
              Ma trận chất lượng phát nội tỉnh theo từng cặp tuyến chấp nhận và phát trả ({periodLabel})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period switcher */}
          <div data-no-capture="true" className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setPeriod('day')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all duration-150 cursor-pointer ${
                period === 'day'
                  ? `${theme.button} shadow-2xs`
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
                  ? `${theme.button} shadow-2xs`
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
                  ? `${theme.button} shadow-2xs`
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Theo tháng
            </button>
          </div>

          {/* Dynamic Period Filter: Day, Week, or Month */}
          <div data-no-capture="true" className="flex items-center">
            {period === 'day' && (
              <label className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500">Ngày:</span>
                <input
                  type="date"
                  value={selectedDay || effectiveAnchor || ''}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                />
              </label>
            )}

            {period === 'week' && (
              <label className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500">Tuần:</span>
                <select
                  value={selectedWeek || weekOptions[0]?.value || ''}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  {weekOptions.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {period === 'month' && (
              <label className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500">Tháng:</span>
                <select
                  value={selectedMonth || monthOptions[0]?.value || ''}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div data-no-capture="true" className="flex items-center gap-1.5">
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <span>Ảnh chụp lấy</span>
              <select
                value={captureTop}
                onChange={(event) => setCaptureTop(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                title="Số bưu cục chấp nhận đầu bảng (theo thứ tự đang sắp) đưa vào ảnh chụp"
                className="rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs focus:border-slate-500 focus:outline-none cursor-pointer"
              >
                {[15, 20, 25, 30].map((count) => (
                  <option key={count} value={count}>Top {count}</option>
                ))}
                <option value="all">Tất cả</option>
              </select>
            </label>
            <BlockCaptureButton
              targetRef={sectionRef}
              blockTitle="Bưu cục chấp nhận × BCVH phát"
              dateOrPeriod={activeAnchorDate}
              beforeCapture={async () => { setCapturing(true); await waitForNextPaint(); }}
              afterCapture={() => setCapturing(false)}
              captionFontSize={17}
            />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="pair-controls border-b border-slate-200/70 bg-white px-4 py-2.5">
        <div data-no-capture="true" className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm bưu cục chấp nhận (tên hoặc mã)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <ArrowUpDown size={14} className="text-slate-500" />
              <span className="font-medium text-slate-600">Hàng đang sắp theo:</span>
              <span className={`rounded-md px-2 py-0.5 font-semibold ${theme.headerBg} ${theme.headerText}`}>{describePairSort(sort, columns)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sắp xếp cột bưu cục phát">
              <span className="font-medium text-slate-600">Cột bưu cục phát:</span>
              <button
                type="button"
                onClick={() => setColOrder(null)}
                aria-pressed={!colOrder}
                className={`rounded-md border px-2 py-0.5 font-semibold cursor-pointer ${!colOrder ? `border-transparent ${theme.button}` : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                Mặc định
              </button>
              {[['volume', 'Sản lượng'], ['rate', 'Tỷ lệ đạt']].map(([metric, text]) => {
                const active = colOrder?.metric === metric;
                return (
                  <button
                    key={metric}
                    type="button"
                    onClick={() => handleColOrder(metric)}
                    aria-pressed={active}
                    title={`Sắp các cột BCVH phát theo ${text.toLowerCase()} (bấm lại để đảo chiều)`}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-semibold cursor-pointer ${active ? `border-transparent ${theme.button}` : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
                  >
                    {text}
                    {active ? (colOrder.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="pair-legend mt-2.5 flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
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
          <span data-no-capture="true" className="text-slate-400 italic ml-auto">Bấm tiêu đề BCVH để làm nổi bật cột</span>
        </div>
      </div>

      <div className="p-4">
        {state.status === 'loading' ? (
          <div className="flex h-40 items-center justify-center">
            <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
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
            <div className="max-h-[660px] overflow-x-auto overflow-y-auto">
              <table className="pair-table w-full border-collapse text-left text-xs text-slate-700">
                <thead className="sticky top-0 z-20 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-700 shadow-2xs">
                  <tr>
                    <SortableTh
                      field="name"
                      sort={sort}
                      onSort={handleSort}
                      activeClassName={theme.sortActive}
                      className="pair-th-first sticky left-0 z-30 bg-slate-100 px-3 py-2 border-r border-b border-slate-200 min-w-[200px] text-left"
                    >
                      Bưu cục chấp nhận
                    </SortableTh>
                    {orderedColumns.map((col) => {
                      const isHighlighted = highlightedCol === col.ma_bcvh;
                      return (
                        <th
                          key={col.ma_bcvh}
                          scope="col"
                          onClick={() => toggleColumnHighlight(col.ma_bcvh)}
                          title="Bấm để làm nổi bật cột này"
                          className={`cursor-pointer px-2 py-1.5 text-center border-b border-r border-slate-200 min-w-[105px] transition-colors select-none ${
                            isHighlighted
                              ? `${theme.sortActive} font-black ring-2 ring-inset ${theme.ring}`
                              : 'hover:bg-slate-200/70'
                          }`}
                        >
                          <div className="pair-th-name text-[11px] leading-tight font-bold">{capturing ? String(col.ten_bcvh).replace(/^BCVH\s+/i, '') : col.ten_bcvh}</div>
                          {col.ma_bcvh !== 'OTHER' ? (
                            <div className="pair-th-code text-[10px] font-normal opacity-75">{col.ma_bcvh}</div>
                          ) : null}
                          <div data-no-capture="true" className="mt-0.5 flex items-center justify-center gap-1">
                            <MiniSort field={`${col.ma_bcvh}:volume`} label="SL" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} />
                            <MiniSort field={`${col.ma_bcvh}:rate`} label="TL" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} />
                          </div>
                        </th>
                      );
                    })}
                    <th
                      scope="col"
                      className="px-2 py-1.5 text-center border-b border-slate-200 min-w-[105px] bg-slate-200/80 font-black text-slate-900"
                    >
                      <div className="pair-th-total">Tổng cộng</div>
                      <div data-no-capture="true" className="mt-1 flex items-center justify-center gap-1">
                        <MiniSort field="total:volume" label="SL" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} />
                        <MiniSort field="total:rate" label="TL" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 bg-white">
                  {visibleRows.map((row) => (
                    <tr
                      key={row.ma_chap_nhan || row.ten_chap_nhan}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="sticky left-0 z-10 bg-white px-2.5 py-1 font-medium border-r border-slate-200 whitespace-nowrap shadow-xs">
                        <div className="flex items-center gap-1.5 leading-tight">
                          <span className="pair-name text-slate-900 font-semibold text-xs">{row.ten_chap_nhan}</span>
                          {row.ma_chap_nhan ? (
                            <span className="pair-code text-[10px] text-slate-400 font-mono">({row.ma_chap_nhan})</span>
                          ) : null}
                        </div>
                      </td>

                      {orderedColumns.map((col) => {
                        const cellData = row.cells?.[col.ma_bcvh];
                        const isHighlighted = highlightedCol === col.ma_bcvh;
                        const hasVolume = cellData && cellData.volume > 0;
                        const band = hasVolume ? classifyF13HeatmapRate(cellData.rate, indicator.heatmapBands) : null;
                        const toneClass = band ? (F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable) : '';

                        return (
                          <td
                            key={col.ma_bcvh}
                            className={`px-2 py-1 text-center border-r border-slate-200/80 whitespace-nowrap ${
                              isHighlighted ? theme.soft : ''
                            }`}
                          >
                            {hasVolume ? (
                              <div
                                title={`Đạt ${cellData.passed}/${cellData.volume} (${cellData.rate}%)${cellData.blank ? ` · Trống: ${cellData.blank}` : ''}`}
                                className="pair-cell flex items-center justify-center gap-1.5 leading-none"
                              >
                                <span className={`pair-rate inline-block rounded border px-1.5 py-0.5 text-xs font-bold tabular-nums ${toneClass}`}>
                                  {cellData.rate !== null ? `${Number(cellData.rate).toFixed(1)}%` : '—'}
                                </span>
                                <span className="pair-vol text-[10px] font-medium text-slate-500 tabular-nums">
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
                      <td className="px-2 py-1 text-center bg-slate-50/60 font-semibold whitespace-nowrap">
                        {row.total && row.total.volume > 0 ? (
                          (() => {
                            const totalBand = classifyF13HeatmapRate(row.total.rate, indicator.heatmapBands);
                            const totalToneClass = F13_HEATMAP_TONE_CLASS[totalBand.tone] || F13_HEATMAP_TONE_CLASS.unavailable;
                            return (
                              <div className="pair-cell flex items-center justify-center gap-1.5 leading-none">
                                <span className={`pair-rate inline-block rounded border px-1.5 py-0.5 text-xs font-black tabular-nums ${totalToneClass}`}>
                                  {row.total.rate !== null ? `${Number(row.total.rate).toFixed(1)}%` : '—'}
                                </span>
                                <span className="pair-vol text-[10px] font-bold text-slate-700 tabular-nums">
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
                      <td className="sticky left-0 z-30 bg-slate-100 px-2.5 py-1.5 border-r border-slate-300 text-slate-900 font-black whitespace-nowrap shadow-xs">
                        {totalRow.ten_chap_nhan || 'TỔNG CỘNG'}
                      </td>

                      {orderedColumns.map((col) => {
                        const cellData = totalRow.cells?.[col.ma_bcvh];
                        const isHighlighted = highlightedCol === col.ma_bcvh;
                        const hasVolume = cellData && cellData.volume > 0;
                        const band = hasVolume ? classifyF13HeatmapRate(cellData.rate, indicator.heatmapBands) : null;
                        const toneClass = band ? (F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable) : '';

                        return (
                          <td
                            key={col.ma_bcvh}
                            className={`px-2 py-1.5 text-center border-r border-slate-300 whitespace-nowrap ${
                              isHighlighted ? theme.headerBg : 'bg-slate-100'
                            }`}
                          >
                            {hasVolume ? (
                              <div
                                title={`Tổng cột: Đạt ${cellData.passed}/${cellData.volume} (${cellData.rate}%)`}
                                className="pair-cell flex items-center justify-center gap-1.5 leading-none"
                              >
                                <span className={`pair-rate inline-block rounded border px-2 py-0.5 text-xs font-black tabular-nums ${toneClass}`}>
                                  {cellData.rate !== null ? `${Number(cellData.rate).toFixed(1)}%` : '—'}
                                </span>
                                <span className="pair-vol text-[10px] font-black text-slate-800 tabular-nums">
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
                      <td className="px-2 py-1.5 text-center bg-slate-200 font-black whitespace-nowrap">
                        {totalRow.total && totalRow.total.volume > 0 ? (
                          (() => {
                            const grandBand = classifyF13HeatmapRate(totalRow.total.rate, indicator.heatmapBands);
                            const grandToneClass = F13_HEATMAP_TONE_CLASS[grandBand.tone] || F13_HEATMAP_TONE_CLASS.unavailable;
                            return (
                              <div className="pair-cell flex items-center justify-center gap-1.5 leading-none">
                                <span className={`pair-rate inline-block rounded border px-2 py-0.5 text-xs font-black tabular-nums ${grandToneClass}`}>
                                  {totalRow.total.rate !== null ? `${Number(totalRow.total.rate).toFixed(1)}%` : '—'}
                                </span>
                                <span className="pair-vol text-[10px] font-black text-slate-900 tabular-nums">
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

            <div className="pair-foot flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3.5 py-2 text-[11px] text-slate-500 border-t border-slate-200">
              <span>
                {capturing && captureTop !== 'all' && filteredAndSortedRows.length > visibleRows.length
                  ? `Ảnh chụp: top ${visibleRows.length} / ${filteredAndSortedRows.length} bưu cục chấp nhận, sắp theo ${describePairSort(sort, columns)}.`
                  : `Hiển thị ${filteredAndSortedRows.length} / ${totalRowCount} bưu cục chấp nhận có dữ liệu phát sinh.`}
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
