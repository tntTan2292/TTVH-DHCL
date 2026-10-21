import React, { useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
} from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_TONE_CLASS,
} from '../../../components/f13/f13HeatmapBandCatalog.js';
import { shortProvinceName } from '../homeNames.js';
import { INDICATORS, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { previousBasisLabel } from '../homePeriod.js';
import { IndicatorProvider } from '../../indicator/IndicatorContext.js';
import {
  filterProvincesByMode,
  formatGap,
  nextSortState,
  RANKING_TEXT_FIELDS,
  sortNationalRanking,
} from '../homeTableSort.js';

/**
 * 34-province ranking of the Home page. Compact on purpose (PO 2026-10-21: numbers must be readable at a
 * glance at 100 % zoom): a one-line header, one strip of the figures that matter for Huế, a one-line view
 * switch and a dense table. The period is named once, in the top bar, and in the camera caption.
 */
export default function NationalRankingBlock({
  selectedIndicator = 'f11',
  onSelectIndicator,
  period = 'day',
  periodName = '',
  rankingData,
  loading,
}) {
  const blockRef = useRef(null);
  const indConfig = INDICATORS[selectedIndicator] || INDICATORS.f11;
  const theme = indicatorTheme(indConfig);

  const [sort, setSort] = useState({ field: 'rank', direction: 'asc' });
  const [viewMode, setViewMode] = useState('hue_focus'); // 'hue_focus' (default: top 3, Huế ±2, bottom 3) | 'all'

  const handleSort = (field) => {
    setSort((current) => nextSortState(current, field, { textFields: RANKING_TEXT_FIELDS }));
  };

  const targetRate = rankingData?.target_rate ?? indConfig.targetRate;
  const rawItems = rankingData?.items || [];
  const hue = rankingData?.hue;
  const nationalRate = rankingData?.national_rate;

  const sortedItems = useMemo(() => {
    return sortNationalRanking(rawItems, sort);
  }, [rawItems, sort]);

  const displayedItems = useMemo(() => {
    return filterProvincesByMode(sortedItems, viewMode);
  }, [sortedItems, viewMode]);

  const movementBasisLabel = rankingData?.movement_basis ? previousBasisLabel(rankingData.movement_basis).replace('hôm', 'ngày') : 'kỳ trước';
  const periodLabel = period === 'day' ? 'Ngày' : period === 'week' ? 'Tuần' : 'Tháng';
  const periodRangeLabel = rankingData?.period_start && rankingData?.period_end
    ? `${rankingData.period_start} → ${rankingData.period_end}`
    : '';
  // named by the page from the card of the same indicator (same range, with the week number)
  const captureTitle = periodName || `${periodLabel} (${periodRangeLabel})`;

  return (
    <IndicatorProvider indicator={indConfig}>
      <section
        ref={blockRef}
        className="flex h-full flex-col rounded-xl border border-slate-300 bg-white shadow-sm"
      >
        {/* Header: one line */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-t-xl border-b border-slate-200 bg-slate-50 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <span className={`h-4 w-1.5 rounded-full ${theme.accentBar}`} />
            <h3 className="whitespace-nowrap text-sm font-black tracking-tight text-slate-900">
              XẾP HẠNG 34 TỈNH/THÀNH
            </h3>
            <span className={`whitespace-nowrap rounded-full border px-2 py-px text-xs font-bold ${theme.chip}`}>
              {indConfig.moduleLabel} · Mục tiêu {targetRate}%
            </span>
          </div>

          <div data-no-capture="true" className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-slate-200/80 p-0.5 text-xs font-bold">
              {Object.keys(INDICATORS).map((key) => {
                const ind = INDICATORS[key];
                const active = selectedIndicator === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectIndicator(key)}
                    className={`cursor-pointer rounded-md px-2.5 py-0.5 transition-all ${
                      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ind.moduleLabel}
                  </button>
                );
              })}
            </div>
            <BlockCaptureButton
              targetRef={blockRef}
              blockTitle={`Xếp hạng 34 tỉnh toàn quốc - ${indConfig.moduleLabel}`}
              dateOrPeriod={captureTitle}
            />
          </div>
        </div>

        {/* Huế strip: the figures that matter, on one line */}
        <div className="flex flex-wrap items-stretch gap-1.5 border-b border-slate-200 px-3 py-1 text-sm">
          <div className="flex items-baseline gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-0.5">
            <span className="text-[11px] font-bold uppercase text-slate-700" title="Theo báo cáo toàn quốc TCT (cơ sở xếp hạng)">Huế</span>
            <span className="text-lg font-black leading-tight text-slate-900 tabular-nums">
              {hue ? `${Number(hue.rate).toFixed(1)}%` : '—'}
            </span>
            <span className="text-xs font-bold text-slate-700" title="Chênh mục tiêu">MT {formatGap(hue?.gap_to_target)}</span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] font-bold uppercase text-slate-700" title="Bình quân 34 tỉnh">BQ</span>
            <span className="text-lg font-black leading-tight text-slate-800 tabular-nums">
              {nationalRate != null ? `${nationalRate.toFixed(1)}%` : '—'}
            </span>
            <span className="text-xs font-bold text-slate-700" title="Huế so với bình quân">{formatGap(hue?.gap_to_national_rate)}</span>
          </div>
          <div className="flex items-baseline gap-1.5 whitespace-nowrap rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-0.5">
            <span className="text-[11px] font-bold uppercase text-amber-800">Vượt</span>
            {hue?.above ? (
              <>
                <span className="font-bold text-slate-900">
                  {shortProvinceName(hue.above.ten_tinh)} (Hạng {hue.above.rank}) {Number(hue.above.rate).toFixed(1)}%
                </span>
                <span className="font-black text-amber-700">cần +{Number(hue.above.gap).toFixed(1)}%</span>
              </>
            ) : hue?.rank === 1 ? (
              <span className="inline-flex items-center gap-1 font-black text-emerald-700">
                <Sparkles size={14} /> Đang dẫn đầu toàn quốc!
              </span>
            ) : (
              <span className="text-slate-500">Chưa có thông tin</span>
            )}
          </div>
        </div>

        {/* View switch + source note: one line */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-1 text-xs">
          <div data-no-capture="true" className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">Xem:</span>
            <button
              type="button"
              onClick={() => setViewMode('hue_focus')}
              className={`cursor-pointer rounded-md px-2 py-px font-bold transition-all ${
                viewMode === 'hue_focus' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Huế & lân cận ({viewMode === 'hue_focus' ? displayedItems.length : filterProvincesByMode(sortedItems, 'hue_focus').length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`cursor-pointer rounded-md px-2 py-px font-bold transition-all ${
                viewMode === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất cả 34 tỉnh ({rawItems.length})
            </button>
          </div>
          <div className="flex items-center gap-1 text-[11px] italic text-slate-600">
            <Info size={12} className="shrink-0 text-blue-600" />
            <span>Số liệu theo báo cáo toàn quốc TCT (cơ sở xếp hạng)</span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-600">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span>Đang tải bảng xếp hạng 34 tỉnh...</span>
              </div>
            </div>
          ) : !displayedItems.length ? (
            <div className="py-10 text-center text-sm font-semibold text-slate-500">
              {rankingData?.message || 'Chưa có dữ liệu xếp hạng kỳ này.'}
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-100 text-xs font-bold uppercase tracking-wide text-slate-700">
                <tr>
                  <SortableTh field="rank" sort={sort} onSort={handleSort} className="w-12 whitespace-nowrap px-2 py-1 text-center">
                    Hạng
                  </SortableTh>
                  <SortableTh field="ten_tinh" sort={sort} onSort={handleSort} className="px-2 py-1 text-left">
                    Tỉnh / Thành phố
                  </SortableTh>
                  <SortableTh field="rate" sort={sort} onSort={handleSort} className="w-24 whitespace-nowrap px-2 py-1 text-right">
                    Tỷ lệ (%)
                  </SortableTh>
                  <SortableTh field="volume" sort={sort} onSort={handleSort} className="w-24 whitespace-nowrap px-2 py-1 text-right">
                    Sản lượng
                  </SortableTh>
                  <SortableTh field="failed" sort={sort} onSort={handleSort} className="w-24 whitespace-nowrap px-2 py-1 text-right">
                    Không đạt
                  </SortableTh>
                  <SortableTh
                    field="movement"
                    sort={sort}
                    onSort={handleSort}
                    className="w-28 whitespace-nowrap px-2 py-1 text-center"
                    title={`Thay đổi hạng so với ${movementBasisLabel}`}
                  >
                    Biến động
                    <span className="block text-[10px] font-semibold normal-case tracking-normal text-slate-600">
                      so với {movementBasisLabel}
                    </span>
                  </SortableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {displayedItems.map((item) => {
                  const isHue = Boolean(item.is_hue);
                  const isTop3 = item.rank <= 3;
                  const itemRate = Number(item.rate);
                  const band = classifyF13HeatmapRate(item.rate, indConfig.heatmapBands);
                  const toneClass = F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable;

                  return (
                    <tr
                      key={item.ma_tinh || item.rank}
                      className={`transition-colors ${
                        isHue
                          ? 'border-y-2 border-blue-400 bg-blue-50 font-bold text-blue-950'
                          : 'text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-2 py-px text-center tabular-nums">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-black ${
                            isHue
                              ? 'bg-[var(--color-vnpost-blue)] text-white'
                              : isTop3
                              ? 'border border-amber-300 bg-amber-100 text-amber-900'
                              : 'text-slate-700'
                          }`}
                        >
                          {item.rank}
                        </span>
                      </td>

                      <td className="px-2 py-px">
                        <div className="flex items-center gap-2">
                          <span className="whitespace-nowrap font-bold text-slate-900">
                            {shortProvinceName(item.ten_tinh)}
                          </span>
                          {isHue && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-[var(--color-vnpost-blue)] px-2 py-px text-[11px] font-black text-white">
                              ★ Huế
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-2 py-px text-right tabular-nums">
                        <span className={`rounded-md border px-2 py-0 text-sm font-black leading-5 ${toneClass}`}>
                          {Number.isFinite(itemRate) ? `${itemRate.toFixed(1)}%` : '—'}
                        </span>
                      </td>

                      <td className="px-2 py-px text-right font-semibold tabular-nums text-slate-700">
                        {Number(item.volume || 0).toLocaleString('vi-VN')}
                      </td>

                      <td className="px-2 py-px text-right font-bold tabular-nums text-rose-600">
                        {Number(item.failed || 0).toLocaleString('vi-VN')}
                      </td>

                      <td className="px-2 py-px text-center font-bold tabular-nums">
                        {item.movement != null && item.movement > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-700">
                            <ArrowUp size={14} /> +{item.movement}
                          </span>
                        ) : item.movement != null && item.movement < 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-rose-600">
                            <ArrowDown size={14} /> {item.movement}
                          </span>
                        ) : item.movement === 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-slate-600">
                            <Minus size={14} /> 0
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </IndicatorProvider>
  );
}
