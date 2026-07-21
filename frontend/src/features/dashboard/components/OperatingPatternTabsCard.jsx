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
  OPERATING_PATTERN_TABS,
  buildGroundedOperatingPatternSummary,
  hasUsableModeData,
  mapOperatingPatternResponse,
} from './operatingPatternTabsData';

const TONE_CLASS = {
  'on-target': 'border-green-200 bg-green-50 text-green-800',
  'below-target': 'border-amber-200 bg-amber-50 text-amber-800',
  'band-green': 'border-green-200 bg-green-50 text-green-800',
  'band-pink': 'border-pink-200 bg-pink-50 text-pink-800',
  'band-yellow': 'border-yellow-200 bg-yellow-50 text-yellow-800',
  'band-red': 'border-red-200 bg-red-50 text-red-800',
  'relative-high': 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'relative-above': 'border-green-200 bg-green-50 text-green-800',
  'relative-average': 'border-slate-200 bg-slate-50 text-slate-800',
  'relative-below': 'border-yellow-200 bg-yellow-50 text-yellow-800',
  'relative-low': 'border-red-200 bg-red-50 text-red-800',
  unavailable: 'border-[var(--color-surface-200)] bg-[var(--color-surface-50)] text-[var(--color-text-muted)]',
};

const TONE_BAR = {
  'on-target': 'bg-green-600',
  'below-target': 'bg-amber-500',
  'band-green': 'bg-green-600',
  'band-pink': 'bg-pink-500',
  'band-yellow': 'bg-yellow-500',
  'band-red': 'bg-red-600',
  'relative-high': 'bg-emerald-700',
  'relative-above': 'bg-green-600',
  'relative-average': 'bg-slate-500',
  'relative-below': 'bg-yellow-500',
  'relative-low': 'bg-red-600',
  unavailable: 'bg-[var(--color-surface-200)]',
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
  return <span className={`h-2 w-2 rounded-full ${TONE_BAR[tone] || TONE_BAR.unavailable}`} />;
}

function PatternLegend({ activeTab }) {
  if (activeTab === 'weekday') {
    return (
      <div className="space-y-2 text-xs text-[var(--color-text-muted)]">
        <div className="font-semibold text-[var(--color-text-main)]">Chú giải màu theo ngưỡng cảnh báo đã phê duyệt</div>
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
      <div className="space-y-2 text-xs text-[var(--color-text-muted)]">
        <div className="font-semibold text-[var(--color-text-main)]">So sánh với KPI trung bình tháng</div>
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
    <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
      <span className="inline-flex items-center gap-2">
        <span className="h-2 w-3 rounded-sm bg-[#174ea6]" />
        Cột: sản lượng tháng
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
        Đường: tỷ lệ đạt
      </span>
    </div>
  );
}

function ComboTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload.find((item) => item?.payload)?.payload || {};

  return (
    <div className="rounded-lg border border-[var(--color-surface-200)] bg-white px-3 py-2 text-xs shadow-lg">
      <div className="font-bold text-[var(--color-text-main)]">{label}</div>
      <div className="mt-1 text-[var(--color-text-muted)]">Sản lượng: <span className="font-semibold text-[var(--color-text-main)]">{formatNumber(point.totalVolume)}</span></div>
      <div className="text-[var(--color-text-muted)]">Tỷ lệ đạt: <span className="font-semibold text-[var(--color-text-main)]">{formatRate(point.rate)}</span></div>
      {point.cumulativeLabel ? <div className="mt-1 text-[var(--color-text-muted)]">{point.cumulativeLabel}</div> : null}
    </div>
  );
}

function ComboChartPanel({ rows, mode }) {
  const volumeAxisMax = getVolumeAxisMax(rows.map((row) => ({ total_volume: row.totalVolume })));

  return (
    <div className="w-full">
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 16, right: 18, bottom: 8, left: 0 }} barCategoryGap="32%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-200)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
            <YAxis
              yAxisId="volume"
              domain={[0, volumeAxisMax]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              tickFormatter={(value) => Number(value).toLocaleString('vi-VN')}
              width={78}
            />
            <YAxis
              yAxisId="rate"
              orientation="right"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              tickFormatter={(value) => `${value}%`}
              width={70}
            />
            <Tooltip content={<ComboTooltip />} />
            <Bar yAxisId="volume" dataKey="totalVolume" name="Sản lượng" fill="#174ea6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Line yAxisId="rate" type="linear" dataKey="rate" name="Tỷ lệ đạt" stroke="#16a34a" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} connectNulls={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-col gap-1.5 pb-2">
        <div className="flex flex-wrap gap-4 text-xs text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-2"><span className="h-2 w-3 rounded-sm bg-[#174ea6]" />Cột: sản lượng</span>
          <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#16a34a]" />Đường: tỷ lệ đạt</span>
        </div>
        {mode === 'month' ? (
          <div className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
            Lũy kế tháng hiện tại dùng ngày dữ liệu mới nhất trong tháng.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MonthlySummary({ summary }) {
  if (!summary) return null;
  const items = [
    ['Sản lượng cao nhất', `${summary.highestVolumeMonth.label} - ${summary.highestVolumeMonth.volumeLabel}`],
    ['Sản lượng thấp nhất', `${summary.lowestVolumeMonth.label} - ${summary.lowestVolumeMonth.volumeLabel}`],
    ['Tỷ lệ đạt tốt nhất', `${summary.bestPassRateMonth.label} - ${summary.bestPassRateMonth.valueLabel}`],
    ['Tỷ lệ đạt thấp nhất', `${summary.lowestPassRateMonth.label} - ${summary.lowestPassRateMonth.valueLabel}`],
    ['Tháng hiện tại', `${summary.currentMonth.volumeLabel} - ${summary.currentMonth.valueLabel}`],
  ];

  return (
    <div className="mb-4 grid gap-3 md:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-[var(--color-surface-200)] bg-white p-3">
          <div className="text-[11px] font-semibold uppercase text-[var(--color-text-muted)]">{label}</div>
          <div className="mt-1 text-sm font-bold text-[var(--color-text-main)]">{value}</div>
        </div>
      ))}
    </div>
  );
}

function HeatmapManagementSummary({ stats }) {
  if (!stats) return null;

  return (
    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
      <div className="rounded-lg border border-[var(--color-surface-200)] bg-white p-2">
        <div className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">TB tháng</div>
        <div className="mt-0.5 text-sm font-bold text-[var(--color-text-main)]">{stats.average.toFixed(2)}%</div>
      </div>
      <div className="rounded-lg border border-green-100 bg-green-50 p-2 text-green-800">
        <div className="text-[10px] font-semibold uppercase">Tốt nhất</div>
        <div className="mt-0.5 text-xs font-bold">{stats.best.date}</div>
        <div className="text-[10px]">{stats.best.rate.toFixed(2)}%</div>
      </div>
      <div className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-800">
        <div className="text-[10px] font-semibold uppercase">Thấp nhất</div>
        <div className="mt-0.5 text-xs font-bold">{stats.worst.date}</div>
        <div className="text-[10px]">{stats.worst.rate.toFixed(2)}%</div>
      </div>
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-emerald-800">
        <div className="text-[10px] font-semibold uppercase">&gt; TB</div>
        <div className="mt-0.5 text-sm font-bold">{stats.aboveAverageCount}</div>
      </div>
      <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-2 text-yellow-800">
        <div className="text-[10px] font-semibold uppercase">&lt; TB</div>
        <div className="mt-0.5 text-sm font-bold">{stats.belowAverageCount}</div>
      </div>
    </div>
  );
}

function HeatmapMonthSection({ month }) {
  return (
    <section className="rounded-xl border border-[var(--color-surface-200)] bg-white p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-[var(--color-text-main)]">{month.label}</h4>
          <p className="text-xs text-[var(--color-text-muted)]">{month.rangeLabel}</p>
        </div>
        {month.stats ? <StatusBadge label={`TB ${month.stats.average.toFixed(2)}%`} tone="neutral" /> : null}
      </div>
      <HeatmapManagementSummary stats={month.stats} />
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[320px] grid-cols-7 gap-1.5">
          {month.days.map((day) => (
            <div
              key={day.id}
              className={`flex h-12 flex-col justify-center rounded-lg border px-1 text-center ${TONE_CLASS[day.targetTone] || TONE_CLASS.unavailable}`}
              title={day.deltaFromMonthAverage !== null ? `${day.deltaFromMonthAverage > 0 ? '+' : ''}${day.deltaFromMonthAverage.toFixed(2)} so với TB` : ''}
            >
              <span className="text-[10px] font-bold">{day.dayLabel}</span>
              <span className="text-[10px] font-semibold">{day.valueLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
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
  }, [maBcvh, toDate]);

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
    <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Chọn quy luật vận hành">
      {OPERATING_PATTERN_TABS.map((tab) => {
        const Icon = TAB_ICON[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--color-primary-600)] text-white'
                : 'bg-[var(--color-surface-100)] text-[var(--color-text-main)] hover:bg-[var(--color-surface-200)]'
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
      className="overflow-hidden"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
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
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--color-primary-700)]"
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
          <div className="mb-4 rounded-lg border border-[var(--color-surface-200)] bg-[var(--color-surface-50)] px-4 py-3 text-sm text-[var(--color-text-main)]">
            {summary}
            {state.data?.pulse?.text ? (
              <div className="mt-1 text-xs text-[var(--color-text-muted)]">Nhịp chất lượng: {state.data.pulse.text}</div>
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
