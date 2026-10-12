import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_TONE_CLASS,
} from '../../../components/f13/f13HeatmapBandCatalog.js';
import { formatNumber, formatRate } from '../../dashboard/components/comboTrendlineData.js';
import { DASH } from '../../dashboard/components/bcvhOperationTableData.js';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTargetRate, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { useIndicatorApi } from '../../indicator/useIndicatorApi.js';
import { filterOfficeTableRows, nextSortState, sortOfficeUnits } from './f12OfficeTableSort.js';

function RateBadge({ rate, bands, targetRate = 95 }) {
  if (rate === null || rate === undefined || rate === '') {
    return <span className="text-slate-400 font-medium">{DASH}</span>;
  }
  const num = Number(rate);
  if (!Number.isFinite(num)) {
    return <span className="text-slate-400 font-medium">{DASH}</span>;
  }
  const band = classifyF13HeatmapRate(num, bands);
  const toneClass = F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable;
  const isTargetMet = num >= targetRate;

  return (
    <span
      className={`inline-flex items-center justify-center gap-1 min-w-[62px] px-2 py-0.5 rounded-md border text-xs sm:text-sm font-bold tabular-nums ${toneClass}`}
      title={`${band.label}: ${formatRate(num)}${isTargetMet ? ` (Đạt mục tiêu ≥ ${targetRate}%)` : ''}`}
    >
      <span>{formatRate(num)}</span>
      {isTargetMet ? (
        <Sparkles size={11} className="text-emerald-700 shrink-0" aria-label="Đạt mục tiêu" />
      ) : null}
    </span>
  );
}

export default function F12OfficeTableBlock({ anchorDate = null }) {
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const targetRate = indicatorTargetRate(indicator);
  const api = useIndicatorApi();
  const cardRef = useRef(null);
  const requestSeqRef = useRef(0);

  const [period, setPeriod] = useState('day');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [userExpandedAll, setUserExpandedAll] = useState(false);

  const endpoint = indicator.endpoints?.officeTable || '/dashboard/office-table';

  const fetchData = useCallback(() => {
    // A slower, older response must never overwrite the answer of the period chosen last.
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    api.get(endpoint, {
      params: {
        period,
        anchor_date: anchorDate || undefined,
        _ts: Date.now(),
      },
    })
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        if (!res.data?.success) {
          throw new Error(res.data?.error?.message || 'Không thể tải bảng đơn vị/bưu cục chấp nhận.');
        }
        setData(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        setError(err.response?.data?.error?.message || err.message || 'Lỗi kết nối khi tải bảng đơn vị/bưu cục chấp nhận.');
        setLoading(false);
      });
  }, [api, endpoint, period, anchorDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rawRows = data?.rows;
  const rawUnranked = data?.unranked;
  const meta = data?.meta || {};
  const totalRow = data?.total_row || null;

  const { filteredRows, filteredUnranked, autoExpandedKeys } = useMemo(() => {
    return filterOfficeTableRows(rawRows || [], rawUnranked || [], search);
  }, [rawRows, rawUnranked, search]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    return sortOfficeUnits(filteredRows, sort.field, sort.direction);
  }, [filteredRows, sort]);

  const handleSort = (field) => {
    setSort((current) => nextSortState(current, field));
  };

  const toggleExpand = (unitCode) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(unitCode)) next.delete(unitCode);
      else next.add(unitCode);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (userExpandedAll) {
      setExpandedKeys(new Set());
      setUserExpandedAll(false);
    } else {
      const allKeys = new Set([...(rawRows || []).map((r) => r.ma_huyen), ...(rawUnranked || []).map((r) => r.ma_huyen)]);
      setExpandedKeys(allKeys);
      setUserExpandedAll(true);
    }
  };

  const isUnitExpanded = (unitCode) => {
    if (search.trim()) {
      return autoExpandedKeys.has(unitCode) || expandedKeys.has(unitCode);
    }
    return expandedKeys.has(unitCode);
  };

  const periodLabel = period === 'day' ? 'Ngày' : period === 'week' ? 'Tuần' : 'Tháng';
  const formattedPeriod = meta.from_date && meta.to_date
    ? meta.from_date === meta.to_date
      ? `${periodLabel} ${meta.from_date}`
      : `${periodLabel} ${meta.from_date} đến ${meta.to_date}`
    : `${periodLabel} ${anchorDate || ''}`;

  return (
    <section
      ref={cardRef}
      className="w-full rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-150 motion-reduce:transition-none"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4 bg-slate-50 rounded-t-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-3 w-1.5 rounded-full ${theme.accentBar}`} />
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              ĐƠN VỊ / BƯU CỤC CHẤP NHẬN
            </h3>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${theme.chip}`}>
              Mục tiêu {targetRate}%
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Đơn vị chấp nhận kèm bưu cục trực thuộc. Phân loại theo dải ngưỡng chất lượng, không xếp hạng bưu cục.
          </p>
          <p className="text-xs font-bold text-slate-700">
            {meta.from_date && meta.to_date
              ? (meta.from_date === meta.to_date
                ? `${periodLabel} ${meta.from_date.split('-').reverse().join('/')}`
                : `${periodLabel} ${meta.from_date.split('-').reverse().join('/')} – ${meta.to_date.split('-').reverse().join('/')}`)
              : ''}
          </p>
        </div>

        {/* Controls */}
        <div data-no-capture="true" className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div role="group" aria-label="Chọn kỳ báo cáo" className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
            {[
              ['day', 'Theo ngày'],
              ['week', 'Theo tuần'],
              ['month', 'Theo tháng'],
            ].map(([p, text]) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                  period === p ? `${theme.button} shadow-2xs` : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {text}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm đơn vị, bưu cục..."
              className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Expand/Collapse All */}
          <button
            type="button"
            onClick={toggleExpandAll}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100"
            title={userExpandedAll ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
          >
            {userExpandedAll ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
            <span className="hidden sm:inline">{userExpandedAll ? 'Thu gọn' : 'Mở rộng'}</span>
          </button>

          {/* Camera button */}
          <BlockCaptureButton
            targetRef={cardRef}
            blockTitle="Đơn vị / Bưu cục chấp nhận"
            dateOrPeriod={formattedPeriod}
          />
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="flex h-44 items-center justify-center">
            <div className="flex items-center gap-2.5 text-sm text-slate-500 font-medium">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              <span>Đang tải bảng đơn vị/bưu cục chấp nhận...</span>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-center">
            <div className="text-sm font-bold text-red-800">Không thể tải dữ liệu bảng đơn vị</div>
            <p className="mt-1 text-xs text-red-600">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="mt-3 rounded-lg bg-red-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-red-800"
            >
              Thử lại
            </button>
          </div>
        ) : !meta.has_data || (sortedRows.length === 0 && filteredUnranked.length === 0) ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-8 text-center text-slate-500">
            <Target size={32} className="mx-auto mb-2 text-slate-400" />
            <div className="text-sm font-bold text-slate-700">Chưa có số liệu đơn vị chấp nhận</div>
            <p className="mt-1 text-xs text-slate-500">
              Không tìm thấy dữ liệu cho kỳ {formattedPeriod}. Vui lòng chọn một ngày hoặc kỳ khác có dữ liệu.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[760px] text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[12%]" />
                <col className="w-[36%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
              </colgroup>
              <thead>
                <tr className={`border-b-2 ${theme.headerBorder} ${theme.headerBg} ${theme.headerText} text-xs sm:text-sm font-extrabold uppercase tracking-wide`}>
                  <SortableTh field="rank" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} className="py-2.5 px-2 text-center align-middle border-r border-slate-200">
                    Hạng
                  </SortableTh>
                  <SortableTh field="ma_huyen" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} className="py-2.5 px-2 text-center align-middle border-r border-slate-200">
                    Mã đơn vị
                  </SortableTh>
                  <SortableTh field="ten_huyen" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} className="py-2.5 px-3 text-left align-middle border-r border-slate-200">
                    Tên đơn vị / Bưu cục
                  </SortableTh>
                  <SortableTh field="volume" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} className="py-2.5 px-2 text-right align-middle border-r border-slate-200">
                    Sản lượng
                  </SortableTh>
                  <SortableTh field="passed" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} className="py-2.5 px-2 text-right align-middle border-r border-slate-200">
                    Đạt
                  </SortableTh>
                  <SortableTh field="failed" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} className="py-2.5 px-2 text-right align-middle border-r border-slate-200">
                    Không đạt
                  </SortableTh>
                  <SortableTh field="rate" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} className="py-2.5 px-2 text-center align-middle">
                    Tỷ lệ
                  </SortableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                {/* Ranked Unit Rows */}
                {sortedRows.map((unit) => {
                  const expanded = isUnitExpanded(unit.ma_huyen);
                  const officeCount = unit.offices?.length || 0;

                  return (
                    <UnitRowGroup
                      key={unit.ma_huyen}
                      unit={unit}
                      expanded={expanded}
                      officeCount={officeCount}
                      onToggle={() => toggleExpand(unit.ma_huyen)}
                      heatmapBands={indicator.heatmapBands}
                      targetRate={targetRate}
                    />
                  );
                })}

                {/* Unranked Section: Large Customer (Khách hàng lớn) */}
                {filteredUnranked.map((unit) => {
                  const expanded = isUnitExpanded(unit.ma_huyen);
                  const officeCount = unit.offices?.length || 0;

                  return (
                    <UnrankedUnitRowGroup
                      key={`unranked_${unit.ma_huyen}`}
                      unit={unit}
                      expanded={expanded}
                      officeCount={officeCount}
                      onToggle={() => toggleExpand(unit.ma_huyen)}
                      heatmapBands={indicator.heatmapBands}
                      targetRate={targetRate}
                    />
                  );
                })}

                {/* Total Row (Sticky Bottom) */}
                {totalRow ? (
                  <tr className={`${theme.soft} font-black text-slate-950 border-t-2 ${theme.headerBorder}`}>
                    <td className="py-3 px-2 text-center text-slate-500 border-r border-slate-200 tabular-nums">
                      {DASH}
                    </td>
                    <td className="py-3 px-2 text-center text-slate-500 border-r border-slate-200">
                      {DASH}
                    </td>
                    <td className="py-3 px-3 text-left font-black tracking-wide border-r border-slate-200">
                      {totalRow.ten_huyen || 'TỔNG CỘNG'}
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums font-black border-r border-slate-200">
                      {formatNumber(totalRow.volume)}
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums font-black text-emerald-700 border-r border-slate-200">
                      {formatNumber(totalRow.passed)}
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums font-black text-red-600 border-r border-slate-200">
                      {formatNumber(totalRow.failed)}
                    </td>
                    <td className="py-3 px-2 text-center tabular-nums">
                      <RateBadge rate={totalRow.rate} bands={indicator.heatmapBands} targetRate={targetRate} />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function UnitRowGroup({ unit, expanded, officeCount, onToggle, heatmapBands, targetRate }) {
  return (
    <>
      <tr className="hover:bg-teal-50/40 transition-colors font-bold text-slate-800 bg-white">
        <td className="py-2.5 px-2 text-center font-black text-slate-700 border-r border-slate-200 tabular-nums">
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-slate-700 text-xs font-black">
            {unit.rank ?? DASH}
          </span>
        </td>
        <td className="py-2.5 px-2 text-center font-semibold text-slate-600 border-r border-slate-200 tabular-nums">
          {unit.ma_huyen}
        </td>
        <td className="py-2.5 px-3 text-left border-r border-slate-200">
          <div className="flex items-center gap-1.5">
            {officeCount > 0 ? (
              <button
                type="button"
                onClick={onToggle}
                className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                title={expanded ? 'Thu gọn bưu cục' : `Mở rộng ${officeCount} bưu cục`}
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className="font-extrabold text-slate-900">{unit.ten_huyen}</span>
            {officeCount > 0 ? (
              <span className="text-[11px] font-medium text-slate-400">({officeCount} bưu cục)</span>
            ) : null}
          </div>
        </td>
        <td className="py-2.5 px-2 text-right tabular-nums font-bold border-r border-slate-200">
          {formatNumber(unit.volume)}
        </td>
        <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-emerald-700 border-r border-slate-200">
          {formatNumber(unit.passed)}
        </td>
        <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-red-600 border-r border-slate-200">
          {formatNumber(unit.failed)}
        </td>
        <td className="py-2.5 px-2 text-center tabular-nums">
          <RateBadge rate={unit.rate} bands={heatmapBands} targetRate={targetRate} />
        </td>
      </tr>

      {/* Expanded Office Sub-rows */}
      {expanded && (unit.offices || []).map((office) => (
        <tr
          key={office.ma_chap_nhan}
          className="bg-slate-50/80 hover:bg-slate-100/90 transition-colors text-slate-700 text-xs"
        >
          <td className="py-2 px-2 text-center text-slate-400 border-r border-slate-200 font-medium">
            {/* NO RANK FOR OFFICES (PO standard) */}
            –
          </td>
          <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
            {office.ma_chap_nhan}
          </td>
          <td className="py-2 px-3 text-left pl-8 border-r border-slate-200">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-mono text-xs">└─</span>
              <span className="font-medium text-slate-800">{office.ten_chap_nhan}</span>
            </div>
          </td>
          <td className="py-2 px-2 text-right tabular-nums font-medium text-slate-700 border-r border-slate-200">
            {formatNumber(office.volume)}
          </td>
          <td className="py-2 px-2 text-right tabular-nums text-emerald-700 border-r border-slate-200">
            {formatNumber(office.passed)}
          </td>
          <td className="py-2 px-2 text-right tabular-nums text-red-600 border-r border-slate-200">
            {formatNumber(office.failed)}
          </td>
          <td className="py-2 px-2 text-center tabular-nums">
            <RateBadge rate={office.rate} bands={heatmapBands} targetRate={targetRate} />
          </td>
        </tr>
      ))}
    </>
  );
}

function UnrankedUnitRowGroup({ unit, expanded, officeCount, onToggle, heatmapBands, targetRate }) {
  return (
    <>
      <tr className="bg-amber-50 hover:bg-amber-100 transition-colors font-bold text-amber-950 border-t border-amber-200/80">
        <td className="py-2.5 px-2 text-center font-bold text-amber-700 border-r border-slate-200 tabular-nums">
          <span className="text-xs text-amber-600 font-medium">KHL</span>
        </td>
        <td className="py-2.5 px-2 text-center font-mono text-amber-900 border-r border-slate-200">
          {unit.ma_huyen}
        </td>
        <td className="py-2.5 px-3 text-left border-r border-slate-200">
          <div className="flex items-center gap-1.5">
            {officeCount > 0 ? (
              <button
                type="button"
                onClick={onToggle}
                className="p-1 rounded hover:bg-amber-200/80 text-amber-800 cursor-pointer"
                title={expanded ? 'Thu gọn' : 'Mở rộng'}
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className="font-extrabold text-amber-900">{unit.ten_huyen}</span>
            <span className="rounded bg-amber-200/80 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold">
              Khách hàng lớn (không xếp hạng)
            </span>
          </div>
        </td>
        <td className="py-2.5 px-2 text-right tabular-nums font-bold text-amber-900 border-r border-slate-200">
          {formatNumber(unit.volume)}
        </td>
        <td className="py-2.5 px-2 text-right tabular-nums text-emerald-800 font-semibold border-r border-slate-200">
          {formatNumber(unit.passed)}
        </td>
        <td className="py-2.5 px-2 text-right tabular-nums text-red-700 font-semibold border-r border-slate-200">
          {formatNumber(unit.failed)}
        </td>
        <td className="py-2.5 px-2 text-center tabular-nums">
          <RateBadge rate={unit.rate} bands={heatmapBands} targetRate={targetRate} />
        </td>
      </tr>

      {/* Expanded Office for Unranked */}
      {expanded && (unit.offices || []).map((office) => (
        <tr
          key={office.ma_chap_nhan}
          className="bg-amber-50 hover:bg-amber-100 transition-colors text-amber-900 text-xs"
        >
          <td className="py-2 px-2 text-center text-slate-400 border-r border-slate-200 font-medium">
            –
          </td>
          <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
            {office.ma_chap_nhan}
          </td>
          <td className="py-2 px-3 text-left pl-8 border-r border-slate-200">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-mono text-xs">└─</span>
              <span className="font-medium text-slate-800">{office.ten_chap_nhan}</span>
              <span className="text-[10px] text-amber-700 italic">(Khách hàng lớn)</span>
            </div>
          </td>
          <td className="py-2 px-2 text-right tabular-nums font-medium text-slate-700 border-r border-slate-200">
            {formatNumber(office.volume)}
          </td>
          <td className="py-2 px-2 text-right tabular-nums text-emerald-700 border-r border-slate-200">
            {formatNumber(office.passed)}
          </td>
          <td className="py-2 px-2 text-right tabular-nums text-red-600 border-r border-slate-200">
            {formatNumber(office.failed)}
          </td>
          <td className="py-2 px-2 text-center tabular-nums">
            <RateBadge rate={office.rate} bands={heatmapBands} targetRate={targetRate} />
          </td>
        </tr>
      ))}
    </>
  );
}
