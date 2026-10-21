import React, { useMemo, useRef, useState } from 'react';
import {
  Award,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Minus,
  SlidersHorizontal,
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
  const periodChip = periodName && rankingData?.period_end ? periodName : '';

  return (
    <IndicatorProvider indicator={indConfig}>
      <section
        ref={blockRef}
        className="h-full rounded-xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 px-3.5 py-2 bg-slate-50/70 rounded-t-xl">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-4 w-1.5 shrink-0 rounded-full ${theme.accentBar}`} />
            <h3 className="whitespace-nowrap text-sm font-black text-slate-900 tracking-tight">
              XẾP HẠNG 34 TỈNH/THÀNH
            </h3>
            <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold ${theme.chip}`}>
              {indConfig.moduleLabel} · Mục tiêu {targetRate}%
            </span>
            {periodChip && (
              <span className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-700">
                {periodChip}
              </span>
            )}
          </div>

          {/* Controls: Indicator tabs + Camera */}
          <div data-no-capture="true" className="flex shrink-0 items-center gap-2">
            {/* Indicator switcher */}
            <div className="flex items-center rounded-lg bg-slate-200/70 p-0.5 text-xs font-bold">
              {Object.keys(INDICATORS).map((key) => {
                const ind = INDICATORS[key];
                const active = selectedIndicator === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectIndicator(key)}
                    className={`rounded-md px-2 py-0.5 transition-all cursor-pointer ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ind.moduleLabel}
                  </button>
                );
              })}
            </div>

            {/* Camera */}
            <BlockCaptureButton
              targetRef={blockRef}
              blockTitle={`Xếp hạng 34 tỉnh toàn quốc - ${indConfig.moduleLabel}`}
              dateOrPeriod={`${periodLabel} (${periodRangeLabel})`}
            />
          </div>
        </div>

        {/* Strategic Executive Callout Bar */}
        <div className="px-3.5 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 via-white to-slate-50/50">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Huế Rank */}
            <div className="rounded-xl border border-rose-200/90 bg-rose-50/40 p-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-rose-800">
                    Vị thứ BĐTP Huế
                  </span>
                  <Award size={15} className="shrink-0 text-rose-500" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-rose-600 tabular-nums">
                    {hue ? hue.rank : '—'}
                  </span>
                  <span className="text-xs font-bold text-rose-400">/34</span>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-rose-200/60 pt-1 text-xs text-slate-600">
                <span>Biến động</span>
                <span className="font-bold">
                  {hue?.movement != null ? (
                    hue.movement > 0 ? (
                      <span className="text-emerald-700">+{hue.movement} bậc</span>
                    ) : hue.movement < 0 ? (
                      <span className="text-rose-600">{hue.movement} bậc</span>
                    ) : (
                      <span>Giữ hạng</span>
                    )
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            </div>

            {/* Huế Rate (Theo báo cáo toàn quốc) */}
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                    Tỷ lệ Huế (BC toàn quốc)
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900 tabular-nums">
                    {hue ? Number(hue.rate).toFixed(1) : '—'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-slate-200/70 pt-1 text-xs text-slate-600">
                <span>Chênh mục tiêu</span>
                <span className="font-black text-slate-900">{formatGap(hue?.gap_to_target)}</span>
              </div>
            </div>

            {/* Gap to province above (Crucial for leaders to overtake!) */}
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/40 p-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-amber-800">
                    Vượt tỉnh liền trên
                  </span>
                </div>
                <div className="mt-1">
                  {hue?.above ? (
                    <>
                      <div className="text-xs font-bold text-slate-900">
                        {hue.above.ten_tinh} (Hạng {hue.above.rank}) · {Number(hue.above.rate).toFixed(1)}%
                      </div>
                      <div className="text-xs font-black text-amber-700">
                        Cần thêm: +{Number(hue.above.gap).toFixed(1)}%
                      </div>
                    </>
                  ) : hue?.rank === 1 ? (
                    <div className="flex items-center gap-1 py-1 text-xs font-black text-emerald-700">
                      <Sparkles size={14} /> Đang dẫn đầu toàn quốc!
                    </div>
                  ) : (
                    <div className="py-1 text-xs text-slate-400">Chưa có thông tin</div>
                  )}
                </div>
              </div>
              <div className="mt-1 border-t border-amber-200/60 pt-1 text-xs text-slate-600">
                <span>{hue?.above ? 'Khoảng cách điểm' : 'Vị trí hiện tại'}</span>
              </div>
            </div>

            {/* National Average */}
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                    Bình quân 34 tỉnh
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800 tabular-nums">
                    {nationalRate != null ? Number(nationalRate).toFixed(1) : '—'}
                  </span>
                  <span className="text-xs font-bold text-slate-400">%</span>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-slate-200/70 pt-1 text-xs text-slate-600">
                <span>Huế so BQ</span>
                <span className="font-black text-slate-900">{formatGap(hue?.gap_to_national_rate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* View mode filter bar & note */}
        <div className="px-3.5 py-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div data-no-capture="true" className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-slate-500" />
            <span className="font-bold text-slate-700">Chế độ xem:</span>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất cả 34 tỉnh ({rawItems.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('hue_focus')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'hue_focus'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              BĐTP Huế & lân cận ({displayedItems.length})
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 italic">
            <Info size={13} className="text-blue-600 shrink-0" />
            <span>
              * Số liệu Huế trong bảng này là theo báo cáo toàn quốc TCT (cơ sở xếp hạng).
            </span>
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto min-w-full">
          {loading ? (
            <div className="flex h-56 items-center justify-center">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span>Đang tải bảng xếp hạng 34 tỉnh...</span>
              </div>
            </div>
          ) : !displayedItems.length ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-400">
              {rankingData?.message || 'Chưa có dữ liệu xếp hạng kỳ này.'}
            </div>
          ) : (
            <table className="w-full min-w-[560px] text-left text-sm border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-xs">
                <tr>
                  <SortableTh field="rank" sort={sort} onSort={handleSort} className="px-3 py-2 text-center w-14 whitespace-nowrap">
                    Hạng
                  </SortableTh>
                  <SortableTh field="ten_tinh" sort={sort} onSort={handleSort} className="px-3 py-2 text-left">
                    Tỉnh / Thành phố
                  </SortableTh>
                  <SortableTh field="rate" sort={sort} onSort={handleSort} className="px-3 py-2 text-right w-24 whitespace-nowrap">
                    Tỷ lệ (%)
                  </SortableTh>
                  <SortableTh field="volume" sort={sort} onSort={handleSort} className="px-3 py-2 text-right w-24 whitespace-nowrap">
                    Sản lượng
                  </SortableTh>
                  <SortableTh field="failed" sort={sort} onSort={handleSort} className="px-3 py-2 text-right w-24 whitespace-nowrap">
                    Không đạt
                  </SortableTh>
                  <SortableTh
                    field="movement"
                    sort={sort}
                    onSort={handleSort}
                    className="px-3 py-2 text-center w-32 whitespace-nowrap"
                    title={`Thay đổi hạng so với ${movementBasisLabel}`}
                  >
                    Biến động
                    <span className="block text-[10px] font-semibold normal-case tracking-normal text-slate-500">
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

                  return (
                    <tr
                      key={item.ma_tinh || item.rank}
                      className={`transition-colors ${
                        isHue
                          ? 'bg-blue-50/90 font-bold text-blue-950 border-y-2 border-blue-400 hover:bg-blue-100/80'
                          : 'hover:bg-slate-50/80 text-slate-800'
                      }`}
                    >
                      {/* Rank */}
                      <td className="px-3 py-2 text-center tabular-nums">
                        <span
                          className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-black text-sm ${
                            isHue
                              ? 'bg-[var(--color-vnpost-blue)] text-white shadow-2xs'
                              : isTop3
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'text-slate-600'
                          }`}
                        >
                          {item.rank}
                        </span>
                      </td>

                      {/* Province Name */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="whitespace-nowrap font-bold text-slate-900">
                            {shortProvinceName(item.ten_tinh)}
                          </span>
                          {isHue && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-[var(--color-vnpost-blue)] px-2 py-0.5 text-[11px] font-black text-white shadow-2xs">
                              ★ Huế
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rate */}
                      <td className="px-3 py-2 text-right tabular-nums">
                        {(() => {
                          const band = classifyF13HeatmapRate(item.rate, indConfig.heatmapBands);
                          const toneClass = F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable;
                          return (
                            <span
                              className={`font-black text-sm px-2.5 py-0.5 rounded-md border ${toneClass}`}
                            >
                              {itemRate != null && Number.isFinite(itemRate) ? `${itemRate.toFixed(1)}%` : '—'}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Volume */}
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700 font-semibold">
                        {Number(item.volume || 0).toLocaleString('vi-VN')}
                      </td>

                      {/* Failed */}
                      <td className="px-3 py-2 text-right tabular-nums text-rose-600 font-bold">
                        {Number(item.failed || 0).toLocaleString('vi-VN')}
                      </td>

                      {/* Rank Movement */}
                      <td className="px-3 py-2 text-center tabular-nums font-bold">
                        {item.movement != null && item.movement > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-700">
                            <ArrowUp size={14} /> +{item.movement}
                          </span>
                        ) : item.movement != null && item.movement < 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-rose-600">
                            <ArrowDown size={14} /> {item.movement}
                          </span>
                        ) : item.movement === 0 ? (
                          <span className="text-slate-500 inline-flex items-center gap-0.5">
                            <Minus size={14} /> 0
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            —
                          </span>
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
