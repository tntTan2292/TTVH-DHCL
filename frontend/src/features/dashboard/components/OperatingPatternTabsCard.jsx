import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, CalendarDays, Grid3X3, RefreshCw } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../../../api/client';
import { CardContainer, EmptyState, ErrorState, LoadingState, StatusBadge } from '../../../components/shared/SharedComponents';
import { formatNumber, formatRate, getVolumeAxisMax } from './comboTrendlineData';
import {
  DEFAULT_OPERATING_PATTERN_TAB,
  APPROVED_WEEKDAY_BANDS,
  HEATMAP_RELATIVE_BANDS,
  HEATMAP_WEEKDAY_LABELS,
  OPERATING_PATTERN_TABS,
  buildHeatmapCellLines,
  buildHeatmapDayDetailText,
  buildHeatmapDetailLayerModel,
  buildGroundedOperatingPatternSummary,
  hasUsableModeData,
  mapOperatingPatternResponse,
} from './operatingPatternTabsData';

const TONE_CLASS = {
  'on-target': 'border-emerald-300 bg-emerald-100 text-emerald-950 font-bold shadow-2xs hover:bg-emerald-200',
  'below-target': 'border-amber-300 bg-amber-100 text-amber-950 font-bold shadow-2xs hover:bg-amber-200',
  'band-green': 'border-emerald-300 bg-emerald-100 text-emerald-950 font-bold shadow-2xs hover:bg-emerald-200',
  'band-pink': 'border-pink-300 bg-pink-100 text-pink-950 font-bold shadow-2xs hover:bg-pink-200',
  'band-yellow': 'border-amber-300 bg-amber-100 text-amber-950 font-bold shadow-2xs hover:bg-amber-200',
  'band-red': 'border-red-300 bg-red-100 text-red-950 font-bold shadow-2xs hover:bg-red-200',
  'relative-high': 'border-emerald-300 bg-emerald-100 text-emerald-950 font-bold shadow-2xs hover:bg-emerald-200',
  'relative-above': 'border-green-300 bg-green-100 text-green-950 font-bold shadow-2xs hover:bg-green-200',
  'relative-average': 'border-slate-300 bg-slate-100 text-slate-900 font-semibold shadow-2xs hover:bg-slate-200',
  'relative-below': 'border-amber-300 bg-amber-100 text-amber-950 font-bold shadow-2xs hover:bg-amber-200',
  'relative-low': 'border-red-300 bg-red-100 text-red-950 font-bold shadow-2xs hover:bg-red-200',
  unavailable: 'border-slate-200 bg-slate-50 text-slate-400 font-medium',
};

const TONE_BAR = {
  'on-target': 'bg-emerald-600',
  'below-target': 'bg-amber-500',
  'band-green': 'bg-emerald-600',
  'band-pink': 'bg-pink-500',
  'band-yellow': 'bg-amber-500',
  'band-red': 'bg-red-600',
  'relative-high': 'bg-emerald-700',
  'relative-above': 'bg-green-600',
  'relative-average': 'bg-slate-500',
  'relative-below': 'bg-amber-500',
  'relative-low': 'bg-red-600',
  unavailable: 'bg-slate-300',
};

const TAB_ICON = {
  month: CalendarDays,
  weekday: BarChart3,
  heatmap: Grid3X3,
};

function getApiErrorMessage(error) {
  const code = error?.response?.data?.error?.code;
  const message = error?.response?.data?.error?.message || error?.message;
  if (code && message) return `${code}: ${message}`;
  return message || 'Không thể tải dữ liệu quy luật vận hành.';
}

function LegendDot({ tone }) {
  return <span className={`h-2.5 w-2.5 rounded-full shadow-2xs ${TONE_BAR[tone] || TONE_BAR.unavailable}`} />;
}

function PatternLegend({ activeTab }) {
  if (activeTab === 'weekday') {
    return (
      <div className="space-y-2 text-xs text-slate-600 font-medium">
        <div className="font-bold text-slate-900">Chú giải màu theo ngưỡng cảnh báo đã phê duyệt</div>
        <div className="flex flex-wrap items-center gap-4">
          {APPROVED_WEEKDAY_BANDS.map((band) => (
            <span key={band.id} className="inline-flex items-center gap-2">
              <LegendDot tone={band.tone} />
              {band.label}: {band.description}
            </span>
          ))}
          <span className="inline-flex items-center gap-2">
            <LegendDot tone="unavailable" />
            Chưa có dữ liệu
          </span>
        </div>
      </div>
    );
  }

  if (activeTab === 'heatmap') {
    return (
      <div className="space-y-2 text-xs text-slate-600 font-medium">
        <div className="font-bold text-slate-900">So sánh với KPI trung bình tháng</div>
        <div className="flex flex-wrap items-center gap-4">
          {HEATMAP_RELATIVE_BANDS.map((band) => (
            <span key={band.id} className="inline-flex items-center gap-2">
              <LegendDot tone={band.tone} />
              {band.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-2">
            <LegendDot tone="unavailable" />
            Chưa có dữ liệu
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium">
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-3.5 rounded-sm bg-[#003E7E] shadow-2xs" />
        Cột: sản lượng
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#059669] shadow-2xs" />
        Đường: tỷ lệ đạt
      </span>
    </div>
  );
}

function ComboTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload.find((item) => item?.payload)?.payload || {};

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 px-3.5 py-2.5 text-xs font-medium text-white shadow-xl backdrop-blur-xs">
      <div className="font-bold text-white mb-1">{label}</div>
      <div className="text-slate-300">Sản lượng: <span className="font-bold tabular-nums text-white">{formatNumber(point.totalVolume)}</span></div>
      <div className="text-slate-300">Tỷ lệ đạt: <span className="font-bold tabular-nums text-emerald-400">{formatRate(point.rate)}</span></div>
      {point.cumulativeLabel ? <div className="mt-1 text-slate-400 text-[11px] border-t border-slate-800 pt-1">{point.cumulativeLabel}</div> : null}
    </div>
  );
}

function ComboChartPanel({ rows, mode }) {
  const volumeAxisMax = getVolumeAxisMax(rows.map((row) => ({ total_volume: row.totalVolume })));

  return (
    <div className="w-full">
      <div className="h-[260px] lg:h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 16, right: 18, bottom: 8, left: 0 }} barCategoryGap="32%">
            <defs>
              <linearGradient id="patternVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#003E7E" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} />
            <YAxis
              yAxisId="volume"
              domain={[0, volumeAxisMax]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }}
              tickFormatter={(value) => Number(value).toLocaleString('vi-VN')}
              width={78}
            />
            <YAxis
              yAxisId="rate"
              orientation="right"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }}
              tickFormatter={(value) => `${value}%`}
              width={70}
            />
            <Tooltip content={<ComboTooltip />} />
            <Bar yAxisId="volume" dataKey="totalVolume" name="Sản lượng" fill="url(#patternVolumeGradient)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            <Line yAxisId="rate" type="linear" dataKey="rate" name="Tỷ lệ đạt" stroke="#059669" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#059669' }} connectNulls={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {mode === 'month' ? (
        <div className="mt-2 text-[11px] text-slate-500 font-medium italic text-right">
          * Lũy kế tháng hiện tại theo ngày mới nhất trong tháng
        </div>
      ) : null}
    </div>
  );
}

function MonthlySummary({ summary }) {
  if (!summary) return null;
  const items = [
    ['SL cao nhất', `${summary.highestVolumeMonth.label}: ${summary.highestVolumeMonth.volumeLabel}`],
    ['SL thấp nhất', `${summary.lowestVolumeMonth.label}: ${summary.lowestVolumeMonth.volumeLabel}`],
    ['Tỷ lệ tốt nhất', `${summary.bestPassRateMonth.label}: ${summary.bestPassRateMonth.valueLabel}`],
    ['Tỷ lệ thấp nhất', `${summary.lowestPassRateMonth.label}: ${summary.lowestPassRateMonth.valueLabel}`],
    ['Tháng hiện tại', `${summary.currentMonth.volumeLabel} (${summary.currentMonth.valueLabel})`],
  ];

  return (
    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-slate-200 bg-white p-2 shadow-2xs border-t-2 border-t-[#003E7E]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
          <div className="mt-0.5 text-xs font-bold text-slate-900 truncate" title={value}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function HeatmapManagementSummary({ stats }) {
  if (!stats) return null;

  return (
    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">TB tháng</div>
        <div className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{stats.average.toFixed(2)}%</div>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-2.5 text-emerald-950 shadow-2xs">
        <div className="text-[10px] font-bold uppercase tracking-wider">Tốt nhất</div>
        <div className="mt-0.5 text-xs font-bold">{stats.best.date}</div>
        <div className="text-[10px] font-bold tabular-nums">{stats.best.rate.toFixed(2)}%</div>
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50/90 p-2.5 text-red-950 shadow-2xs">
        <div className="text-[10px] font-bold uppercase tracking-wider">Thấp nhất</div>
        <div className="mt-0.5 text-xs font-bold">{stats.worst.date}</div>
        <div className="text-[10px] font-bold tabular-nums">{stats.worst.rate.toFixed(2)}%</div>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-2.5 text-emerald-950 shadow-2xs">
        <div className="text-[10px] font-bold uppercase tracking-wider">&gt; TB</div>
        <div className="mt-0.5 text-sm font-bold tabular-nums">{stats.aboveAverageCount}</div>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-2.5 text-amber-950 shadow-2xs">
        <div className="text-[10px] font-bold uppercase tracking-wider">&lt; TB</div>
        <div className="mt-0.5 text-sm font-bold tabular-nums">{stats.belowAverageCount}</div>
      </div>
    </div>
  );
}

function HeatmapMonthSection({ month }) {
  const [activeDetail, setActiveDetail] = useState(null);

  const showDayDetail = (day, event) => {
    const detail = buildHeatmapDetailLayerModel(day, event.currentTarget.getBoundingClientRect());
    setActiveDetail(detail);
  };

  const hideDayDetail = () => {
    setActiveDetail(null);
  };

  const handleDayKeyDown = (event) => {
    if (event.key === 'Escape') {
      hideDayDetail();
      event.currentTarget.blur();
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:shadow-md transition-all duration-150 motion-reduce:transition-none">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900">{month.label}</h4>
          <p className="text-xs font-medium text-slate-500">{month.rangeLabel}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {month.nationalRankLabel ? (
            <StatusBadge label={`Lũy kế: ${month.nationalRankLabel}`} tone="info" />
          ) : null}
          {month.stats ? <StatusBadge label={`TB ${month.stats.average.toFixed(2)}%`} tone="neutral" /> : null}
        </div>
      </div>
      <HeatmapManagementSummary stats={month.stats} />
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[420px] grid-cols-7 gap-1.5">
          {HEATMAP_WEEKDAY_LABELS.map((label) => (
            <div
              key={`${month.month}-${label}`}
              className="rounded-md bg-slate-100 px-1.5 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-600"
            >
              {label}
            </div>
          ))}
          {month.days.map((day) => {
            const dayTitle = buildHeatmapDayDetailText(day);
            const cellLines = buildHeatmapCellLines(day);

            return (
              <div
                key={day.id}
                className={`relative flex h-14 flex-col justify-center items-center rounded-md border px-0.5 py-0.5 text-center transition-all duration-150 motion-reduce:transition-none ${day.empty ? 'invisible' : ''} ${TONE_CLASS[day.targetTone] || TONE_CLASS.unavailable}`}
                title={dayTitle}
                aria-label={dayTitle || undefined}
                tabIndex={day.empty ? undefined : 0}
                onMouseEnter={(event) => showDayDetail(day, event)}
                onMouseLeave={hideDayDetail}
                onFocus={(event) => showDayDetail(day, event)}
                onBlur={hideDayDetail}
                onClick={(event) => showDayDetail(day, event)}
                onKeyDown={handleDayKeyDown}
              >
                {cellLines.map((line) => (
                  <span
                    key={line.id}
                    className={line.id === 'rank'
                      ? 'text-[9px] font-bold leading-none opacity-90 tabular-nums'
                      : line.id === 'date'
                        ? 'text-[10px] font-black leading-tight tracking-tight'
                        : 'text-[10px] font-bold leading-tight tabular-nums'}
                  >
                    {line.label}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {activeDetail ? (
        <div
          id={`heatmap-rank-detail-${activeDetail.id}`}
          role="tooltip"
          data-testid="heatmap-rank-detail-layer"
          className="pointer-events-none fixed max-w-[280px] -translate-x-1/2 -translate-y-full rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-left text-xs font-semibold leading-5 text-white shadow-xl backdrop-blur-xs z-50"
          style={{
            left: activeDetail.left,
            top: activeDetail.top,
            zIndex: activeDetail.zIndex,
          }}
        >
          {activeDetail.label}
        </div>
      ) : null}
    </section>
  );
}

function MonthlyRankStrip({ rows }) {
  const rankedRows = rows.filter((row) => row.nationalRank);
  if (!rankedRows.length) return null;

  return (
    <div className="mb-2.5 overflow-x-auto border-y border-slate-200/80 py-1.5">
      <div className="flex min-w-max items-center gap-2">
        {rankedRows.map((row) => (
          <div
            key={`${row.id}-national-rank`}
            className="flex min-w-[90px] flex-col rounded-md border border-slate-200/80 bg-slate-50/80 px-2 py-1 text-xs font-semibold text-slate-900 shadow-2xs"
            title={row.monthlyRankDetail || undefined}
            aria-label={row.monthlyRankDetail || undefined}
            tabIndex={0}
          >
            <span className="font-bold text-slate-900 text-[11px]">{row.label}</span>
            <span className="font-bold text-emerald-700 text-xs">{row.nationalRankLabel}</span>
            <span className="text-[10px] font-medium text-slate-500">{row.rankMovementLabel || 'Chưa có so sánh'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapPanel({ months }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {months.map((month) => (
        <HeatmapMonthSection key={month.month} month={month} />
      ))}
    </div>
  );
}

function ModePanel({ activeTab, model }) {
  const rows = activeTab === 'month' ? model.month : activeTab === 'heatmap' ? model.heatmap : model.weekday;

  if (!hasUsableModeData(activeTab, rows)) {
    return (
      <EmptyState
        title="Chưa có dữ liệu quy luật vận hành"
        description="Nguồn dữ liệu đã phản hồi nhưng chế độ đang chọn chưa có giá trị khả dụng."
        className="min-h-[260px]"
      />
    );
  }

  if (activeTab === 'heatmap') return <HeatmapPanel months={model.heatmapMonths} />;
  if (activeTab === 'month') {
    return (
      <div>
        <MonthlySummary summary={model.monthlySummary} />
        <MonthlyRankStrip rows={rows} />
        <ComboChartPanel rows={rows} mode="month" />
      </div>
    );
  }
  return <ComboChartPanel rows={rows} mode="weekday" />;
}

export default function OperatingPatternTabsCard({ fromDate, toDate, maBcvh }) {
  const [activeTab, setActiveTab] = useState(DEFAULT_OPERATING_PATTERN_TAB);
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const requestSeqRef = useRef(0);

  const loadTimeline = useCallback(() => {
    if (!toDate) {
      setState({ loading: false, error: 'Chưa có ngày kết thúc để tải quy luật vận hành.', data: null });
      return undefined;
    }

    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    const controller = new AbortController();

    setState({ loading: true, error: null, data: null });

    api.get('/f13/dashboard/quality-timeline', {
      params: {
        toDate,
        ma_bcvh: maBcvh,
        mode: activeTab,
        include_national_rank: ['month', 'heatmap'].includes(activeTab) && maBcvh === 'all' ? '1' : undefined,
      },
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted || requestSeqRef.current !== requestSeq) return;
        if (!response?.data?.success) {
          setState({ loading: false, error: 'API không trả về dữ liệu quy luật vận hành hợp lệ.', data: null });
          return;
        }
        setState({
          loading: false,
          error: null,
          data: mapOperatingPatternResponse(response.data?.data || {}, { toDate }),
        });
      })
      .catch((error) => {
        if (controller.signal.aborted || requestSeqRef.current !== requestSeq) return;
        setState({ loading: false, error: getApiErrorMessage(error), data: null });
      });

    return () => {
      controller.abort();
    };
  }, [activeTab, maBcvh, toDate]);

  useEffect(() => loadTimeline(), [loadTimeline]);

  const summary = useMemo(
    () => buildGroundedOperatingPatternSummary({
      activeTab,
      model: state.data,
      fromDate,
      toDate,
      maBcvh,
    }),
    [activeTab, fromDate, maBcvh, state.data, toDate],
  );

  const action = (
    <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/80" role="tablist" aria-label="Chọn quy luật vận hành">
      {OPERATING_PATTERN_TABS.map((tab) => {
        const Icon = TAB_ICON[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 motion-reduce:transition-none ${
              activeTab === tab.id
                ? 'bg-[#003E7E] text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <Icon size={14} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <CardContainer
      title="Quy luật vận hành"
      subtitle="Một thẻ quy luật theo thứ, theo tháng hoặc heatmap, dùng dữ liệu hệ thống hiện có."
      action={action}
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all duration-150 motion-reduce:transition-none"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
        <StatusBadge label={OPERATING_PATTERN_TABS.find((tab) => tab.id === activeTab)?.label} tone="info" />
        <StatusBadge label={maBcvh === 'all' ? 'Toàn mạng' : `BCVH ${maBcvh}`} tone="neutral" />
        <span>Bối cảnh bộ lọc: {fromDate || 'Chưa chọn'} đến {toDate || 'Chưa chọn'}</span>
      </div>

      {state.loading ? (
        <LoadingState label="Đang tải quy luật vận hành..." className="min-h-[300px]" />
      ) : state.error ? (
        <ErrorState
          title="Không thể tải quy luật vận hành"
          description={state.error}
          action={(
            <button
              type="button"
              onClick={loadTimeline}
              className="inline-flex items-center gap-2 rounded-lg bg-[#003E7E] px-3 py-2 text-xs font-bold text-white hover:bg-blue-900 transition-all duration-150"
            >
              <RefreshCw size={14} />
              Thử lại
            </button>
          )}
          className="min-h-[300px]"
        />
      ) : !state.data?.hasAnyData ? (
        <EmptyState
          title="Chưa có dữ liệu quy luật vận hành"
          description="API đã phản hồi nhưng chưa có dữ liệu tuần, tháng hoặc heatmap để hiển thị."
          className="min-h-[300px]"
        />
      ) : (
        <div role="tabpanel" aria-label={OPERATING_PATTERN_TABS.find((tab) => tab.id === activeTab)?.label}>
          <div className="mb-4 rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-900 shadow-2xs">
            {summary}
            {state.data?.pulse?.text ? (
              <div className="mt-1 text-xs font-semibold text-slate-500">Nhịp chất lượng: {state.data.pulse.text}</div>
            ) : null}
          </div>
          <ModePanel activeTab={activeTab} model={state.data} />
          <div className="mt-4">
            <PatternLegend activeTab={activeTab} />
          </div>
        </div>
      )}
    </CardContainer>
  );
}
