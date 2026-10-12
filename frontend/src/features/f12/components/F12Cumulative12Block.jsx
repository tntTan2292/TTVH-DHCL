import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Award,
  Calendar,
  Layers,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_HEX_COLOR,
  F13_HEATMAP_TONE_CLASS,
} from '../../../components/f13/f13HeatmapBandCatalog.js';
import { formatNumber, formatRate, formatVariance } from '../../dashboard/components/comboTrendlineData.js';
import { DASH } from '../../dashboard/components/bcvhOperationTableData.js';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTargetRate, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { useIndicatorApi } from '../../indicator/useIndicatorApi.js';
import {
  filterCumulativeUnits,
  formatMonthShort,
  nextSortState,
  sortCumulativeUnits,
} from './f12Cumulative12Sort.js';

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
      className={`inline-flex items-center justify-center gap-1 min-w-[54px] px-1.5 py-0.5 rounded-md border text-xs font-bold tabular-nums ${toneClass}`}
      title={`${band.label}: ${formatRate(num)}${isTargetMet ? ` (Đạt mục tiêu ≥ ${targetRate}%)` : ''}`}
    >
      <span>{formatRate(num)}</span>
      {isTargetMet ? <Sparkles size={10} className="text-emerald-700 shrink-0" /> : null}
    </span>
  );
}

function CumulativeTooltip({ active, payload, label, targetRate, heatmapBands }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload.find((item) => item?.payload)?.payload || {};
  const hasData = point.volume !== null && point.volume !== undefined && point.data_available;
  const band = classifyF13HeatmapRate(point.rate, heatmapBands);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs shadow-xl max-w-[280px]">
      <div className="border-b border-slate-100 pb-2">
        <div className="font-bold text-slate-800 text-sm">
          Tháng {point.month ? `${point.month.slice(5)}/${point.month.slice(0, 4)}` : label}
        </div>
        {point.national_rank ? (
          <div className="mt-0.5 text-xs font-bold text-rose-600">
            Vị thứ toàn quốc: {point.national_rank.rank}/{point.national_rank.total}
          </div>
        ) : null}
      </div>

      {!hasData ? (
        <div className="pt-2 text-slate-500 italic">Chưa có dữ liệu tháng này.</div>
      ) : (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Sản lượng:</span>
            <span className="font-bold tabular-nums text-slate-900">{formatNumber(point.volume)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Đạt:</span>
            <span className="font-bold tabular-nums text-emerald-700">{formatNumber(point.passed)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Không đạt:</span>
            <span className="font-bold tabular-nums text-red-600">{formatNumber(point.failed)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-1.5">
            <span className="text-slate-500">Tỷ lệ đạt:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: F13_HEATMAP_HEX_COLOR[band.tone] }} />
              <span className="font-black tabular-nums text-slate-900">{formatRate(point.rate)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Mục tiêu:</span>
            <span className="font-semibold tabular-nums text-teal-700">{targetRate}%</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Chênh lệch:</span>
            <span className={`font-bold tabular-nums ${point.rate >= targetRate ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatVariance(point.rate !== null ? point.rate - targetRate : null)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function F12Cumulative12Block({ anchorDate = null }) {
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const targetRate = indicatorTargetRate(indicator);
  const api = useIndicatorApi();
  const cardRef = useRef(null);
  const gradId = useId().replace(/:/g, '_');

  const defaultMonth = anchorDate ? anchorDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(null);

  // Sync selectedMonth when anchorDate changes
  useEffect(() => {
    if (anchorDate && anchorDate.length >= 7) {
      setSelectedMonth(anchorDate.slice(0, 7));
    }
  }, [anchorDate]);

  const endpoint = indicator.endpoints?.cumulative12 || '/dashboard/cumulative-12';
  const requestSeqRef = useRef(0);

  const fetchData = useCallback(() => {
    // A slower, older response must never overwrite the answer of the month chosen last.
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    api.get(endpoint, {
      params: {
        month: selectedMonth,
        _ts: Date.now(),
      },
    })
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        if (!res.data?.success) {
          throw new Error(res.data?.error?.message || 'Không thể tải số liệu lũy kế 12 tháng.');
        }
        setData(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        setError(err.response?.data?.error?.message || err.message || 'Lỗi khi tải số liệu lũy kế 12 tháng.');
        setLoading(false);
      });
  }, [api, endpoint, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const meta = data?.meta || {};
  const rawMonths = data?.months;
  const cumulative = data?.cumulative || {};
  const rawUnits = data?.units;
  const monthsList = meta.months || (rawMonths || []).map((m) => m.month);

  // Chart series mapping
  const chartSeries = useMemo(() => {
    return (rawMonths || []).map((m) => {
      const monthLabel = formatMonthShort(m.month);
      return {
        ...m,
        label: monthLabel,
        isCurrentMonth: m.month === selectedMonth,
      };
    });
  }, [rawMonths, selectedMonth]);

  // Volume max for chart axis
  const maxVolume = useMemo(() => {
    const vols = chartSeries.map((s) => Number(s.volume || 0));
    const max = Math.max(0, ...vols);
    return max > 0 ? Math.ceil(max * 1.15) : 100;
  }, [chartSeries]);

  // Filter & sort units
  const filteredUnits = useMemo(() => {
    return filterCumulativeUnits(rawUnits || [], search);
  }, [rawUnits, search]);

  const sortedUnits = useMemo(() => {
    return sortCumulativeUnits(filteredUnits, sort?.field, sort?.direction);
  }, [filteredUnits, sort]);

  const handleSort = (field) => {
    setSort((current) => nextSortState(current, field));
  };

  const periodLabel = `Lũy kế 12 tháng đến ${selectedMonth}`;

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
              LŨY KẾ 12 THÁNG
            </h3>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${theme.chip}`}>
              Mục tiêu {targetRate}%
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Diễn biến sản lượng, tỷ lệ đạt, vị thứ toàn quốc và bảng chi tiết các đơn vị chấp nhận 12 tháng gần nhất.
          </p>
        </div>

        {/* Controls */}
        <div data-no-capture="true" className="flex flex-wrap items-center gap-2">
          {/* Month selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs shadow-2xs">
            <Calendar size={14} className="text-slate-500" />
            <label htmlFor="cum12MonthInput" className="font-bold text-slate-600">Tháng:</label>
            <input
              id="cum12MonthInput"
              type="month"
              value={selectedMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
              className="font-bold text-slate-800 outline-none cursor-pointer bg-transparent"
            />
          </div>

          {/* Camera button */}
          <BlockCaptureButton
            targetRef={cardRef}
            blockTitle="Lũy kế 12 tháng"
            dateOrPeriod={periodLabel}
          />
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 space-y-6">
        {loading ? (
          <div className="flex h-52 items-center justify-center">
            <div className="flex items-center gap-2.5 text-sm text-slate-500 font-medium">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              <span>Đang tải số liệu lũy kế 12 tháng...</span>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-center">
            <div className="text-sm font-bold text-red-800">Không thể tải dữ liệu lũy kế 12 tháng</div>
            <p className="mt-1 text-xs text-red-600">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="mt-3 rounded-lg bg-red-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-red-800"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <>
            {/* Cumulative Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <span>Tổng sản lượng 12T</span>
                  <Layers size={14} className="text-slate-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
                  {formatNumber(cumulative.volume)}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 font-medium">
                  Đạt: <span className="font-bold text-emerald-700">{formatNumber(cumulative.passed)}</span> · Không đạt: <span className="font-bold text-red-600">{formatNumber(cumulative.failed)}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <span>Tỷ lệ đạt lũy kế</span>
                  <TrendingUp size={14} className="text-slate-400" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl font-black text-slate-900 tabular-nums">
                    {formatRate(cumulative.rate)}
                  </span>
                  <RateBadge rate={cumulative.rate} bands={indicator.heatmapBands} targetRate={targetRate} />
                </div>
                <div className="mt-1 text-[11px] text-slate-500 font-medium">
                  Chênh mục tiêu {targetRate}%: <span className={`font-bold ${cumulative.rate >= targetRate ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatVariance(cumulative.rate !== null ? cumulative.rate - targetRate : null)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <span>Vị thứ toàn quốc</span>
                  <Award size={14} className="text-rose-500" />
                </div>
                <div className="mt-2 text-2xl font-black text-rose-600 tabular-nums">
                  {cumulative.national_rank?.rank ? `${cumulative.national_rank.rank}/${cumulative.national_rank.total || 34}` : DASH}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 font-medium">
                  Xếp hạng theo tỉnh chấp nhận
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <span>Số đơn vị theo dõi</span>
                  <Sparkles size={14} className="text-teal-600" />
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
                  {meta.unit_count || rawUnits.length}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 font-medium">
                  Đơn vị chấp nhận toàn tỉnh
                </div>
              </div>
            </div>

            {/* 12-Month Combo Column + Line Chart */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Biểu đồ diễn biến sản lượng & tỷ lệ đạt 12 tháng
                </div>
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block h-2.5 w-2.5 rounded-sm ${theme.legendBar}`} />
                    <span>Sản lượng</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-4 rounded-full" style={{ backgroundColor: theme.line }} />
                    <span>Tỷ lệ đạt (%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-red-500" />
                    <span>Mục tiêu ({targetRate}%)</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartSeries}
                    margin={{ top: 20, right: 30, bottom: 8, left: 6 }}
                    barCategoryGap="28%"
                  >
                    <defs>
                      <linearGradient id={`cum12VolGrad_${gradId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={theme.primary} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={theme.primary} stopOpacity={0.65} />
                      </linearGradient>
                      <linearGradient id={`cum12VolGradCurrent_${gradId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={theme.primaryLight} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={theme.primaryLight} stopOpacity={0.7} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />

                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tick={{ fontSize: 11, fill: '#475569', fontWeight: 700 }}
                    />

                    <YAxis
                      yAxisId="volume"
                      domain={[0, maxVolume]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                      tickFormatter={(val) => Number(val).toLocaleString('vi-VN')}
                      width={64}
                    />

                    <YAxis
                      yAxisId="rate"
                      orientation="right"
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                      tickFormatter={(val) => `${val}%`}
                      width={44}
                    />

                    <Tooltip
                      content={
                        <CumulativeTooltip
                          targetRate={targetRate}
                          heatmapBands={indicator.heatmapBands}
                        />
                      }
                    />

                    {/* Reference target line 95% */}
                    <ReferenceLine
                      yAxisId="rate"
                      y={targetRate}
                      stroke="#EF4444"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Mục tiêu ${targetRate}%`,
                        position: 'insideTopRight',
                        fill: '#EF4444',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />

                    {/* Bars */}
                    <Bar
                      yAxisId="volume"
                      dataKey="volume"
                      radius={[4, 4, 0, 0]}
                    >
                      {chartSeries.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isCurrentMonth ? `url(#cum12VolGradCurrent_${gradId})` : `url(#cum12VolGrad_${gradId})`}
                        />
                      ))}
                    </Bar>

                    {/* Rate Line */}
                    <Line
                      yAxisId="rate"
                      type="monotone"
                      dataKey="rate"
                      stroke={theme.line}
                      strokeWidth={2.5}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        if (!payload?.rate) return null;
                        const band = classifyF13HeatmapRate(payload.rate, indicator.heatmapBands);
                        return (
                          <circle
                            key={`dot-${payload.month}`}
                            cx={cx}
                            cy={cy}
                            r={3.5}
                            fill="#FFFFFF"
                            stroke={F13_HEATMAP_HEX_COLOR[band.tone] || '#059669'}
                            strokeWidth={2}
                          />
                        );
                      }}
                      activeDot={{ r: 5.5, fill: theme.line, stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* National Rank Under Each Month */}
              <div className="mt-2 border-t border-slate-100 pt-2.5">
                <div className="grid grid-cols-12 gap-1 text-center text-[11px]">
                  {chartSeries.map((s) => (
                    <div key={`rank_${s.month}`} className="flex flex-col items-center">
                      <span className="font-medium text-slate-400 text-[10px]">{s.label}</span>
                      <span className="font-bold text-rose-600 mt-0.5">
                        {s.national_rank?.rank ? `VT ${s.national_rank.rank}/${s.national_rank.total || 34}` : DASH}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Unit 12-Month Table */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Bảng chi tiết các đơn vị chấp nhận qua 12 tháng
                </div>

                {/* Search */}
                <div data-no-capture="true" className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm đơn vị..."
                    className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[960px] text-left border-collapse table-fixed">
                  <thead>
                    <tr className={`border-b-2 ${theme.headerBorder} ${theme.headerBg} ${theme.headerText} text-xs font-extrabold uppercase tracking-wide`}>
                      <SortableTh field="rank" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} className="py-2.5 px-1.5 text-center align-middle w-[50px] border-r border-slate-200">
                        Hạng
                      </SortableTh>
                      <SortableTh field="ma_bcvh" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} className="py-2.5 px-2 text-center align-middle w-[75px] border-r border-slate-200">
                        Mã ĐV
                      </SortableTh>
                      <SortableTh field="ten_bcvh" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} className="py-2.5 px-3 text-left align-middle w-[190px] border-r border-slate-200">
                        Đơn vị chấp nhận
                      </SortableTh>
                      <SortableTh field="volume" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} className="py-2.5 px-2 text-right align-middle w-[80px] border-r border-slate-200">
                        SL 12T
                      </SortableTh>
                      <SortableTh field="rate" sort={sort} onSort={handleSort} activeClassName={theme.sortActive} className="py-2.5 px-2 text-center align-middle w-[80px] border-r border-slate-300">
                        Tỷ lệ 12T
                      </SortableTh>

                      {/* 12 Months Columns */}
                      {monthsList.map((monthKey) => (
                        <SortableTh
                          key={monthKey}
                          field={`month_${monthKey}`}
                          sort={sort}
                          onSort={handleSort}
                          activeClassName={theme.sortActive}
                          className="py-2.5 px-1 text-center align-middle min-w-[62px] border-r border-slate-200 text-[11px]"
                        >
                          {formatMonthShort(monthKey)}
                        </SortableTh>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs font-semibold text-slate-800">
                    {sortedUnits.length === 0 ? (
                      <tr>
                        <td colSpan={5 + monthsList.length} className="py-6 text-center text-slate-400 italic">
                          Không có đơn vị nào khớp với tìm kiếm.
                        </td>
                      </tr>
                    ) : (
                      sortedUnits.map((unit) => (
                        <tr key={unit.ma_bcvh} className="hover:bg-teal-50/30 transition-colors">
                          <td className="py-2 px-1.5 text-center font-black text-slate-700 border-r border-slate-200 tabular-nums">
                            {unit.rank ?? DASH}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                            {unit.ma_bcvh}
                          </td>
                          <td className="py-2 px-3 text-left font-bold text-slate-900 border-r border-slate-200 truncate" title={unit.ten_bcvh}>
                            {unit.ten_bcvh}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums font-bold border-r border-slate-200">
                            {formatNumber(unit.volume)}
                          </td>
                          <td className="py-2 px-2 text-center tabular-nums border-r border-slate-300">
                            <RateBadge rate={unit.rate} bands={indicator.heatmapBands} targetRate={targetRate} />
                          </td>

                          {/* Month cells */}
                          {monthsList.map((monthKey) => {
                            const monthData = unit.months?.[monthKey];
                            return (
                              <td key={monthKey} className="py-2 px-1 text-center tabular-nums border-r border-slate-200">
                                <RateBadge
                                  rate={monthData?.rate ?? null}
                                  bands={indicator.heatmapBands}
                                  targetRate={targetRate}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
