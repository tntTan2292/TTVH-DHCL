import React, { useMemo, useRef, useState } from 'react';
import {
  Award,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Minus,
  Globe,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { INDICATORS, indicatorTheme } from '../../indicator/indicatorConfig.js';
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
  onPeriodChange,
  rankingData,
  loading,
}) {
  const blockRef = useRef(null);
  const indConfig = INDICATORS[selectedIndicator] || INDICATORS.f11;
  const theme = indicatorTheme(indConfig);

  const [sort, setSort] = useState({ field: 'rank', direction: 'asc' });
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'hue_focus'

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

  const periodLabel = period === 'day' ? 'Ngày' : period === 'week' ? 'Tuần' : 'Tháng';
  const periodRangeLabel = rankingData?.period_start && rankingData?.period_end
    ? `${rankingData.period_start} → ${rankingData.period_end}`
    : '';

  return (
    <IndicatorProvider indicator={indConfig}>
      <section
        ref={blockRef}
        className="rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-150"
      >
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200/80 px-5 py-4 bg-slate-50/70 rounded-t-2xl">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`h-3 w-1.5 rounded-full ${theme.accentBar}`} />
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                BẢNG XẾP HẠNG 34 TỈNH/THÀNH TOÀN QUỐC
              </h3>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${theme.chip}`}>
                {indConfig.moduleLabel} · Mục tiêu {targetRate}%
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Vị thứ và tỷ lệ chất lượng của BĐTP Huế theo báo cáo toàn quốc TCT so với 34 tỉnh/thành.
            </p>
          </div>

          {/* Controls: Indicator tabs + Period switch + Camera */}
          <div data-no-capture="true" className="flex flex-wrap items-center gap-2.5">
            {/* Indicator switcher */}
            <div className="flex items-center rounded-xl bg-slate-200/70 p-1 text-xs font-bold">
              {Object.keys(INDICATORS).map((key) => {
                const ind = INDICATORS[key];
                const active = selectedIndicator === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectIndicator(key)}
                    className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                      active
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ind.moduleLabel}
                  </button>
                );
              })}
            </div>

            {/* Period switcher */}
            <div className="flex items-center rounded-xl bg-slate-200/70 p-1 text-xs font-bold">
              {[
                { id: 'day', label: 'Ngày' },
                { id: 'week', label: 'Tuần' },
                { id: 'month', label: 'Tháng' },
              ].map((p) => {
                const active = period === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onPeriodChange(p.id)}
                    className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                      active
                        ? `${theme.button} shadow-2xs`
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p.label}
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
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 via-white to-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Huế Rank */}
            <div className="rounded-xl border border-rose-200/90 bg-rose-50/40 p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wide">
                  Vị thứ BĐTP Huế
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-rose-600 tabular-nums">
                    {hue ? hue.rank : '—'}
                  </span>
                  <span className="text-xs font-bold text-rose-400">/34</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-100/80 flex items-center justify-center text-rose-600">
                <Award size={20} />
              </div>
            </div>

            {/* Huế Rate (Theo báo cáo toàn quốc) */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Tỷ lệ Huế (theo BC toàn quốc)
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900 tabular-nums">
                    {hue ? `${Number(hue.rate).toFixed(1)}` : '—'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  Chênh mục tiêu: <span className="font-bold text-slate-700">{formatGap(hue?.gap_to_target)}</span>
                </div>
              </div>
              <div className={`h-10 w-10 rounded-xl ${theme.soft} flex items-center justify-center ${theme.text}`}>
                <Globe size={20} />
              </div>
            </div>

            {/* Gap to province above (Crucial for leaders to overtake!) */}
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/30 p-3 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                Mục tiêu vượt tỉnh xếp trên
              </span>
              <div className="mt-1">
                {hue?.above ? (
                  <>
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {hue.above.ten_tinh} (Hạng {hue.above.rank}) · {Number(hue.above.rate).toFixed(1)}%
                    </div>
                    <div className="mt-0.5 text-xs font-black text-amber-700">
                      Cần thêm: +{Number(hue.above.gap).toFixed(1)}%
                    </div>
                  </>
                ) : hue?.rank === 1 ? (
                  <div className="flex items-center gap-1 text-xs font-black text-emerald-700">
                    <Sparkles size={14} /> Đang dẫn đầu toàn quốc!
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">Chưa có thông tin</div>
                )}
              </div>
            </div>

            {/* National Average */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Bình quân 34 tỉnh
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-700 tabular-nums">
                    {nationalRate != null ? `${nationalRate.toFixed(1)}` : '—'}
                  </span>
                  <span className="text-xs font-bold text-slate-400">%</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  Huế so BQ: <span className="font-bold text-slate-700">{formatGap(hue?.gap_to_national_rate)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* View mode filter bar & note */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div data-no-capture="true" className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-slate-400" />
            <span className="font-bold text-slate-600">Chế độ xem:</span>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả 34 tỉnh ({rawItems.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('hue_focus')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'hue_focus'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              BĐTP Huế & lân cận ({displayedItems.length})
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 italic">
            <Info size={13} className="text-blue-500 shrink-0" />
            <span>
              * Số liệu Huế trong bảng này là theo báo cáo toàn quốc TCT (cơ sở xếp hạng).
            </span>
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
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
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <SortableTh field="rank" sort={sort} onSort={handleSort} className="px-4 py-3 text-center w-16">
                    Hạng
                  </SortableTh>
                  <SortableTh field="ten_tinh" sort={sort} onSort={handleSort} className="px-4 py-3 text-left">
                    Tỉnh / Thành phố
                  </SortableTh>
                  <SortableTh field="rate" sort={sort} onSort={handleSort} className="px-4 py-3 text-right w-28">
                    Tỷ lệ (%)
                  </SortableTh>
                  <SortableTh field="gap_to_target" sort={sort} onSort={handleSort} className="px-4 py-3 text-right w-28">
                    Chênh MT
                  </SortableTh>
                  <SortableTh field="volume" sort={sort} onSort={handleSort} className="px-4 py-3 text-right w-28">
                    Sản lượng
                  </SortableTh>
                  <SortableTh field="failed" sort={sort} onSort={handleSort} className="px-4 py-3 text-right w-24">
                    Không đạt
                  </SortableTh>
                  <SortableTh field="movement" sort={sort} onSort={handleSort} className="px-4 py-3 text-center w-28">
                    Biến động
                  </SortableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {displayedItems.map((item) => {
                  const isHue = Boolean(item.is_hue);
                  const isTop3 = item.rank <= 3;
                  const itemRate = Number(item.rate);
                  const metTarget = itemRate >= targetRate;

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
                      <td className="px-4 py-3 text-center tabular-nums">
                        <span
                          className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-black text-xs ${
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {item.ten_tinh}
                          </span>
                          {isHue && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-vnpost-blue)] px-2 py-0.5 text-[10px] font-black text-white shadow-2xs">
                              ★ BĐTP Huế
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({item.ma_tinh})
                          </span>
                        </div>
                      </td>

                      {/* Rate */}
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-md border ${
                            metTarget
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : itemRate >= targetRate - 10
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {itemRate.toFixed(1)}%
                        </span>
                      </td>

                      {/* Gap to target */}
                      <td className="px-4 py-3 text-right tabular-nums font-bold">
                        <span className={item.gap_to_target >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                          {formatGap(item.gap_to_target)}
                        </span>
                      </td>

                      {/* Volume */}
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600 font-semibold">
                        {Number(item.volume || 0).toLocaleString('vi-VN')}
                      </td>

                      {/* Failed */}
                      <td className="px-4 py-3 text-right tabular-nums text-rose-600 font-bold">
                        {Number(item.failed || 0).toLocaleString('vi-VN')}
                      </td>

                      {/* Rank Movement */}
                      <td className="px-4 py-3 text-center tabular-nums font-bold">
                        {item.movement > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-700">
                            <ArrowUp size={12} /> +{item.movement}
                          </span>
                        ) : item.movement < 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-rose-600">
                            <ArrowDown size={12} /> {item.movement}
                          </span>
                        ) : (
                          <span className="text-slate-400 inline-flex items-center gap-0.5">
                            <Minus size={12} />
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
