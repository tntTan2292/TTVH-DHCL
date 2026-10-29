import { useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Users,
} from 'lucide-react';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTargetRate, indicatorTheme } from '../../indicator/indicatorConfig.js';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { waitForNextPaint } from '../../../components/common/blockCaptureHelper.js';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_TONE_CLASS,
} from '../../../components/f13/f13HeatmapBandCatalog.js';
import { formatRate, formatVolume } from '../../dashboard/components/bcvhOperationTableData.js';
import {
  formatSortCaption,
  getNextPostmanSort,
  processPostmanList,
  sliceUnitsForCapture,
} from './f42PostmanTableHelpers.js';

const CAPTURE_TOP_OPTIONS = Object.freeze([15, 20, 25, 30]);

export default function F42PostmanTableBlock({
  units = [],
  totalRow = null,
  period = 'day',
  onPeriodChange = null,
  selectedDay = '',
  onSelectDay = null,
  selectedWeek = '',
  onSelectWeek = null,
  selectedMonth = '',
  onSelectMonth = null,
  weekOptions = [],
  monthOptions = [],
  periodLabel = '',
  loading = false,
  hasData = true,
  onSelectPostman = null,
}) {
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const targetRate = indicatorTargetRate(indicator);
  const cardRef = useRef(null);

  const [search, setSearch] = useState('');
  const [belowTargetOnly, setBelowTargetOnly] = useState(false);
  const [sort, setSort] = useState(null); // { field, direction }
  const [captureTop, setCaptureTop] = useState(25);
  const [capturing, setCapturing] = useState(false);

  // Expanded units map (default: all units collapsed)
  const [expandedCodes, setExpandedCodes] = useState(() => new Set());

  const toggleExpand = (code) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCodes(new Set(units.map((u) => u.ma_bcvh)));
  };

  const collapseAll = () => {
    setExpandedCodes(new Set());
  };

  const handleSort = (field) => {
    setSort((current) => getNextPostmanSort(current, field));
  };

  // Process postmen per unit
  const processedUnits = useMemo(() => {
    return units.map((unit) => {
      const allPostmen = unit.postmen || [];
      const processed = processPostmanList(allPostmen, {
        search,
        belowTargetOnly,
        targetRate,
        sort,
      });

      return {
        ...unit,
        rawCount: allPostmen.length,
        filteredPostmen: processed,
      };
    });
  }, [units, search, belowTargetOnly, targetRate, sort]);

  // Total visible postmen count
  const totalVisiblePostmen = useMemo(() => {
    return processedUnits.reduce((sum, u) => sum + u.filteredPostmen.length, 0);
  }, [processedUnits]);

  // When capturing, slice top N postmen across the entire table
  const unitsToRender = useMemo(() => {
    if (capturing && captureTop !== 'all') {
      return sliceUnitsForCapture(processedUnits, captureTop);
    }
    return processedUnits;
  }, [capturing, captureTop, processedUnits]);

  const capturedCount = useMemo(() => {
    return unitsToRender.reduce((sum, u) => sum + u.filteredPostmen.length, 0);
  }, [unitsToRender]);

  const hasAnyPostmen = units.some((u) => Array.isArray(u.postmen) && u.postmen.length > 0);
  const blockTitle = `Bưu tá theo BCVH – ${periodLabel}`;

  // Solid header backgrounds (no /90 opacity) so scrolled rows don't show through the sticky header
  const solidHeaderBg = theme.headerBg.replace(/\/90/g, '');
  const solidSortActive = theme.sortActive.replace(/\/90/g, '');

  return (
    <div
      ref={cardRef}
      className="w-full rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all duration-200"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${theme.chip}`}>
              <Users size={12} />
              Bưu tá theo BCVH
            </span>
            <span className="text-xs font-semibold text-slate-700">{periodLabel}</span>
            <span className="inline-flex items-center text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Mục tiêu: <strong className="ml-1 text-slate-800">{targetRate} %</strong>
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Chất lượng phát giao từng bưu tá thuộc các BCVH, xếp hạng nội bộ theo tỷ lệ đạt và sản lượng.
          </p>
        </div>

        {/* Controls: Period switcher + Capture button */}
        <div data-no-capture="true" className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          {/* Period selector */}
          {onPeriodChange && (
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => onPeriodChange('day')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  period === 'day'
                    ? `${theme.button} shadow-2xs`
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Theo ngày
              </button>
              <button
                type="button"
                onClick={() => onPeriodChange('week')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  period === 'week'
                    ? `${theme.button} shadow-2xs`
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Theo tuần
              </button>
              <button
                type="button"
                onClick={() => onPeriodChange('month')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  period === 'month'
                    ? `${theme.button} shadow-2xs`
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Theo tháng
              </button>
            </div>
          )}

          {/* Dynamic Period Filter: Day, Week, or Month */}
          {period === 'day' && onSelectDay && (
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500">Ngày:</span>
              <input
                type="date"
                value={selectedDay || ''}
                onChange={(e) => onSelectDay(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              />
            </label>
          )}

          {period === 'week' && onSelectWeek && (
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500">Tuần:</span>
              <select
                value={selectedWeek || weekOptions?.[0]?.value || ''}
                onChange={(e) => onSelectWeek(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                {(weekOptions || []).map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {period === 'month' && onSelectMonth && (
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500">Tháng:</span>
              <select
                value={selectedMonth || monthOptions?.[0]?.value || ''}
                onChange={(e) => onSelectMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                {(monthOptions || []).map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Top-N camera capture selector */}
          <div className="flex items-center gap-1.5 pl-1">
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <span>Ảnh chụp</span>
              <select
                value={captureTop}
                onChange={(e) => setCaptureTop(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                title="Số bưu tá đầu bảng đưa vào ảnh chụp"
                className="rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs focus:border-slate-500 focus:outline-none cursor-pointer"
              >
                {CAPTURE_TOP_OPTIONS.map((num) => (
                  <option key={num} value={num}>Top {num}</option>
                ))}
                <option value="all">Tất cả</option>
              </select>
            </label>
            <BlockCaptureButton
              targetRef={cardRef}
              blockTitle={blockTitle}
              dateOrPeriod={periodLabel}
              beforeCapture={async () => {
                setCapturing(true);
                await waitForNextPaint();
              }}
              afterCapture={() => setCapturing(false)}
              indicatorOverride={indicator.moduleLabel}
            />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div data-no-capture="true" className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc mã bưu tá..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none shadow-2xs"
            />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs text-slate-500 hover:text-slate-800 px-1"
            >
              Xóa
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={belowTargetOnly}
              onChange={(e) => setBelowTargetOnly(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-400 cursor-pointer"
            />
            <span>Dưới mục tiêu {targetRate} %</span>
          </label>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={expandedCodes.size === units.length ? collapseAll : expandAll}
            className="text-xs font-semibold text-sky-700 hover:text-sky-900 cursor-pointer px-2 py-1 rounded hover:bg-sky-50 transition-colors"
          >
            {expandedCodes.size === units.length ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
          </button>
        </div>
      </div>

      {/* Capture info banner when in capture mode */}
      {capturing && (
        <div className="mt-2 text-xs font-semibold text-slate-500 text-center py-1 bg-slate-100/70 rounded border border-slate-200">
          Ảnh chụp: {captureTop === 'all' ? 'Toàn bộ' : `Top ${capturedCount}`} / {totalVisiblePostmen} bưu tá hiển thị ({formatSortCaption(sort)})
        </div>
      )}

      {/* Table Content with vertical & horizontal scroll */}
      <div className="mt-3.5 space-y-3 max-h-[560px] overflow-y-auto overflow-x-auto pr-1">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent mb-2" />
            <span className="text-xs font-semibold">Đang tải danh sách bưu tá theo BCVH...</span>
          </div>
        ) : !hasData || !hasAnyPostmen || units.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500">
            <span className="text-xs font-semibold">
              Không có dữ liệu bưu tá cho kỳ đã chọn.
            </span>
          </div>
        ) : (
          unitsToRender.map((unit) => {
            const isExpanded = capturing || expandedCodes.has(unit.ma_bcvh);
            const band = classifyF13HeatmapRate(unit.rate, indicator.heatmapBands);
            const toneClass = F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable;
            const displayedPostmen = unit.filteredPostmen;

            return (
              <div
                key={unit.ma_bcvh}
                className="rounded-xl border border-slate-200/90 bg-white shadow-2xs transition-all duration-150"
              >
                {/* BCVH Header Bar */}
                <div
                  onClick={() => toggleExpand(unit.ma_bcvh)}
                  className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 cursor-pointer select-none transition-colors rounded-t-xl ${
                    !isExpanded ? 'rounded-b-xl' : ''
                  } ${
                    isExpanded ? 'bg-slate-100/80 border-b border-slate-200/80' : 'bg-slate-50/70 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                      {unit.ten_bcvh}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {unit.filteredPostmen.length} bưu tá {search || belowTargetOnly ? `(lọc từ ${unit.rawCount})` : ''}
                    </span>
                  </div>

                  {/* BCVH Summary Metrics */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px]">Sản lượng:</span>
                      <span className="font-bold text-slate-800 tabular-nums">{formatVolume(unit.volume)}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5">
                      <span className="text-emerald-700 text-[11px]">Đạt:</span>
                      <span className="font-bold text-emerald-700 tabular-nums">{formatVolume(unit.passed)}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5">
                      <span className="text-rose-700 text-[11px]">Không đạt:</span>
                      <span className="font-bold text-rose-700 tabular-nums">{formatVolume(unit.failed)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px]">Tỷ lệ:</span>
                      <span className={`inline-flex items-center justify-center min-w-[54px] px-1.5 py-0.5 rounded border text-xs font-black tabular-nums ${toneClass}`}>
                        {formatRate(unit.rate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Postmen List Table with Solid Sticky Header */}
                {isExpanded && (
                  <div>
                    {displayedPostmen.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 rounded-b-xl">
                        {search || belowTargetOnly
                          ? 'Không có bưu tá nào khớp với tiêu chí tìm kiếm/lọc.'
                          : 'BCVH này không có phát sinh sản lượng phát giao trong kỳ.'}
                      </div>
                    ) : (
                      <table className="w-full min-w-[620px] text-left text-xs border-collapse rounded-b-xl">
                        <thead className={`sticky top-0 z-10 ${solidHeaderBg} ${theme.headerText} shadow-xs`}>
                          <tr className={`border-b border-slate-200 text-[11px] font-bold ${solidHeaderBg} ${theme.headerText}`}>
                            <SortableTh field="rank" sort={sort} onSort={handleSort} className="py-2 px-2 text-center w-12" activeClassName={solidSortActive}>
                              Hạng
                            </SortableTh>
                            <SortableTh field="ma_buu_ta" sort={sort} onSort={handleSort} className="py-2 px-2.5" activeClassName={solidSortActive}>
                              Mã bưu tá
                            </SortableTh>
                            <SortableTh field="ten_buu_ta" sort={sort} onSort={handleSort} className="py-2 px-2.5" activeClassName={solidSortActive}>
                              Tên bưu tá
                            </SortableTh>
                            <SortableTh field="volume" sort={sort} onSort={handleSort} className="py-2 px-2.5 text-right" activeClassName={solidSortActive}>
                              Sản lượng
                            </SortableTh>
                            <SortableTh field="passed" sort={sort} onSort={handleSort} className="py-2 px-2.5 text-right" activeClassName={solidSortActive}>
                              Đạt
                            </SortableTh>
                            <SortableTh field="failed" sort={sort} onSort={handleSort} className="py-2 px-2.5 text-right" activeClassName={solidSortActive}>
                              Không đạt
                            </SortableTh>
                            <SortableTh field="rate" sort={sort} onSort={handleSort} className="py-2 px-2.5 text-center" activeClassName={solidSortActive}>
                              Tỷ lệ (%)
                            </SortableTh>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {displayedPostmen.map((postman) => {
                            const pBand = classifyF13HeatmapRate(postman.rate, indicator.heatmapBands);
                            const pToneClass = F13_HEATMAP_TONE_CLASS[pBand.tone] || F13_HEATMAP_TONE_CLASS.unavailable;

                            return (
                              <tr
                                key={postman.ma_buu_ta}
                                className="hover:bg-slate-50/80 transition-colors last:[&>td:first-child]:rounded-bl-xl last:[&>td:last-child]:rounded-br-xl"
                              >
                                <td className="py-2 px-2 text-center tabular-nums font-bold text-slate-500">
                                  #{postman.rank}
                                </td>
                                <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600">
                                  {postman.ma_buu_ta}
                                </td>
                                <td className="py-2 px-2.5">
                                  <button
                                    type="button"
                                    onClick={() => onSelectPostman?.(postman, unit)}
                                    className="font-bold text-slate-900 hover:text-sky-700 hover:underline cursor-pointer text-left transition-colors"
                                    title={`Xem xu hướng phát giao của bưu tá ${postman.ten_buu_ta}`}
                                  >
                                    {postman.ten_buu_ta}
                                  </button>
                                </td>
                                <td className="py-2 px-2.5 text-right tabular-nums text-slate-700">
                                  {formatVolume(postman.volume)}
                                </td>
                                <td className="py-2 px-2.5 text-right tabular-nums text-emerald-700 font-semibold">
                                  {formatVolume(postman.passed)}
                                </td>
                                <td className="py-2 px-2.5 text-right tabular-nums text-rose-700 font-semibold">
                                  {formatVolume(postman.failed)}
                                  {postman.blank > 0 && (
                                    <span className="block text-[10px] text-slate-400 font-normal">
                                      (gồm {postman.blank} chưa ĐG)
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-2.5 text-center">
                                  <span
                                    className={`inline-flex items-center justify-center min-w-[54px] px-1.5 py-0.5 rounded border text-xs font-bold tabular-nums ${pToneClass}`}
                                    title={`${pBand.label}: ${formatRate(postman.rate)}`}
                                  >
                                    {formatRate(postman.rate)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Total Row (only if returned from backend, never computed on client!) */}
      {totalRow && (
        <div className="mt-3.5 rounded-xl border border-slate-300 bg-slate-100/90 p-3 flex flex-wrap items-center justify-between gap-2 shadow-2xs font-bold text-xs text-slate-900">
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-wider text-slate-700">{totalRow.label || 'TỔNG CỘNG'}</span>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500 font-normal text-[11px] mr-1">Tổng SL:</span>
              <span className="tabular-nums">{formatVolume(totalRow.volume)}</span>
            </div>
            <div>
              <span className="text-emerald-700 font-normal text-[11px] mr-1">Đạt:</span>
              <span className="text-emerald-800 tabular-nums">{formatVolume(totalRow.passed)}</span>
            </div>
            <div>
              <span className="text-rose-700 font-normal text-[11px] mr-1">Không đạt:</span>
              <span className="text-rose-800 tabular-nums">{formatVolume(totalRow.failed)}</span>
            </div>
            <div>
              <span className="text-slate-500 font-normal text-[11px] mr-1">Tỷ lệ:</span>
              <span
                className={`inline-flex items-center justify-center min-w-[58px] px-2 py-0.5 rounded border text-xs font-black tabular-nums ${
                  F13_HEATMAP_TONE_CLASS[classifyF13HeatmapRate(totalRow.rate, indicator.heatmapBands).tone] || ''
                }`}
              >
                {formatRate(totalRow.rate)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
