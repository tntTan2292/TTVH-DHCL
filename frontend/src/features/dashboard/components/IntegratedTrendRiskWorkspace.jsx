import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Layers, TrendingUp } from 'lucide-react';
import { CardContainer, EmptyState, ErrorState, LoadingState, StatusBadge } from '../../../components/shared/SharedComponents';
import {
  formatNumber,
  formatRate,
  getVolumeAxisMax,
  QUALITY_TARGET_RATE,
} from './comboTrendlineData';
import { DASHBOARD_LABELS, DASHBOARD_SEMANTIC_COLORS } from './dashboardSemantics';
import {
  buildIntegratedTrendRows,
  buildLeadershipComparisonWidgets,
  buildSevenDayVisibleComparisonEvidence,
  TREND_MODES,
} from './integratedTrendRiskData';

const COLORS = {
  volume: DASHBOARD_SEMANTIC_COLORS.volume,
  pass: DASHBOARD_SEMANTIC_COLORS.passed,
  target: DASHBOARD_SEMANTIC_COLORS.target,
  comparison: DASHBOARD_SEMANTIC_COLORS.comparison,
  warning: DASHBOARD_SEMANTIC_COLORS.warning,
  unknown: DASHBOARD_SEMANTIC_COLORS.unknown,
};

function IntegratedTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload.find((item) => item?.payload)?.payload || {};

  return (
    <div className="z-50 rounded-xl border border-slate-700 bg-slate-900/95 px-3.5 py-2.5 shadow-xl backdrop-blur-xs text-white">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {point.current_date ? `${point.dayLabel} · ${point.current_date}` : label}
      </div>
      <div className="mt-2 space-y-1.5 text-xs font-medium">
        <div className="flex items-center justify-between gap-6">
          <span className="text-slate-300">{DASHBOARD_LABELS.volume}:</span>
          <span className="font-bold tabular-nums text-white">{formatNumber(point.total_volume)}</span>
        </div>
        {point.previous_total_volume !== undefined ? (
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-400">Sản lượng kỳ so sánh:</span>
            <span className="font-semibold tabular-nums text-slate-200">{formatNumber(point.previous_total_volume)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-6">
          <span className="text-slate-300">{DASHBOARD_LABELS.passRate}:</span>
          <span className="font-bold tabular-nums text-emerald-400">{formatRate(point.quality_rate)}</span>
        </div>
        {point.previous_quality_rate !== undefined ? (
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-400">Tỷ lệ đạt kỳ so sánh:</span>
            <span className="font-semibold tabular-nums text-slate-200">{formatRate(point.previous_quality_rate)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-6 border-t border-slate-800 pt-1.5">
          <span className="text-slate-400">{DASHBOARD_LABELS.target}:</span>
          <span className="font-semibold tabular-nums text-indigo-300">{formatRate(point.target_rate)}</span>
        </div>
        {point.national_rank ? (
          <div className="flex items-center justify-between gap-6 border-t border-slate-800 pt-1.5">
            <span className="text-slate-400">Xếp hạng toàn quốc Huế:</span>
            <span className="font-bold text-amber-300">
              {point.national_rank.available
                ? `${point.national_rank.rank}/${point.national_rank.total}`
                : point.national_rank.message || 'Chưa có dữ liệu'}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatSelectedRangeRank(rank) {
  if (!rank) return null;
  if (rank.available && rank.rank !== null && rank.rank !== undefined && rank.total !== null && rank.total !== undefined) {
    const period = rank.period_start && rank.period_end
      ? (rank.period_start === rank.period_end ? rank.period_end : `${rank.period_start} đến ${rank.period_end}`)
      : rank.period || null;
    return `Xếp hạng toàn quốc Huế theo kỳ đang chọn${period ? ` (${period})` : ''}: ${rank.rank}/${rank.total}`;
  }
  return rank.message || 'Chưa có dữ liệu xếp hạng toàn quốc cho kỳ đang chọn';
}

function MarkerShape({ cx, cy, payload }) {
  if (!payload?.below_target) return null;
  const fill = COLORS.warning;
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle r="6" fill="#fff" stroke={fill} strokeWidth="2" />
      <circle r="2.5" fill={fill} />
    </g>
  );
}

function TrendChart({ rows, mode }) {
  const volumeAxisMax = getVolumeAxisMax(rows);
  const xKey = mode === '7-days' ? 'dayLabel' : mode === 'by-bcvh' ? 'date_label' : 'date';

  return (
    <div className="h-[280px] lg:h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 18, right: 18, bottom: 8, left: 0 }} barCategoryGap="34%">
          <defs>
            <linearGradient id="volumeBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#003E7E" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="prevVolumeBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#64748B" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }}
            tickFormatter={(value) => typeof value === 'string' && value.length === 10 ? value.slice(5) : value}
            minTickGap={16}
          />
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
          <Tooltip content={<IntegratedTooltip />} />
          <ReferenceLine
            yAxisId="rate"
            y={QUALITY_TARGET_RATE}
            stroke="#DC2626"
            strokeDasharray="6 4"
            strokeWidth={2}
            label={{ value: `Mục tiêu ${QUALITY_TARGET_RATE}%`, fill: '#DC2626', fontSize: 11, fontWeight: 700, position: 'insideTopRight' }}
          />
          <Bar yAxisId="volume" dataKey="total_volume" name={DASHBOARD_LABELS.volume} fill="url(#volumeBarGradient)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          {mode === '7-days' ? (
            <Bar yAxisId="volume" dataKey="previous_total_volume" name="Sản lượng kỳ so sánh" fill="url(#prevVolumeBarGradient)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          ) : null}
          <Line yAxisId="rate" type="linear" dataKey="quality_rate" name={DASHBOARD_LABELS.passRate} stroke="#059669" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#059669' }} connectNulls={false} isAnimationActive={false} />
          {mode === '7-days' ? (
            <Line yAxisId="rate" type="linear" dataKey="previous_quality_rate" name="Tỷ lệ đạt kỳ so sánh" stroke={COLORS.comparison} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, strokeWidth: 1.5, fill: '#fff', stroke: COLORS.comparison }} connectNulls={false} isAnimationActive={false} />
          ) : null}
          <Scatter yAxisId="rate" dataKey="quality_rate" shape={<MarkerShape />} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function LegendItem({ color, label, shape = 'dot', dashed = false }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
      <span
        className={shape === 'bar' ? 'h-2.5 w-3.5 rounded-sm shadow-2xs' : dashed ? 'h-2 w-5 border-t-2 border-dashed' : 'h-2.5 w-2.5 rounded-full shadow-2xs'}
        style={shape === 'bar' ? { backgroundColor: color } : dashed ? { borderColor: color } : { backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function formatDeltaValue(value, formatter) {
  if (value === null || value === undefined) return 'Không có dữ liệu';
  const sign = Number(value) > 0 ? '+' : '';
  return `${sign}${formatter(value)}`;
}

function getDeltaTone(value) {
  if (value === null || value === undefined || Number(value) === 0) return 'neutral';
  return Number(value) > 0 ? 'info' : 'warning';
}

function getDirectionLabel(value) {
  if (value === null || value === undefined || Number(value) === 0) return 'Không đổi';
  return Number(value) > 0 ? 'Tăng' : 'Giảm';
}

function LeadershipComparisonCard({ comparison }) {
  const metrics = comparison?.available ? [
    {
      id: 'pass-rate',
      label: 'Tỷ lệ đạt',
      value: formatRate(comparison.pass_rate.current),
      comparisonValue: formatRate(comparison.pass_rate.previous),
      delta: formatDeltaValue(comparison.pass_rate.delta, (delta) => `${Number(delta).toFixed(2)} điểm %`),
      tone: getDeltaTone(comparison.pass_rate.delta),
      rawDelta: comparison.pass_rate.delta,
    },
    {
      id: 'total-volume',
      label: 'Sản lượng',
      value: formatNumber(comparison.total_volume.current),
      comparisonValue: formatNumber(comparison.total_volume.previous),
      delta: formatDeltaValue(comparison.total_volume.delta, formatNumber),
      tone: getDeltaTone(comparison.total_volume.delta),
      rawDelta: comparison.total_volume.delta,
    },
  ] : [];

  return (
    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 via-white to-slate-50/40 p-4 shadow-2xs hover:shadow-md transition-all duration-150 motion-reduce:transition-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">{comparison?.title}</h4>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {comparison?.current_date && comparison?.previous_date
              ? `${comparison.current_date} so với ${comparison.previous_date}`
              : 'Dựa trên ngày mới nhất có dữ liệu trong phạm vi đang chọn.'}
          </p>
        </div>
        <StatusBadge label={comparison?.id === 'd-7' ? 'D-7' : 'D-1'} tone={comparison?.available ? 'info' : 'neutral'} />
      </div>

      {comparison?.available ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric.id} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{metric.label}</div>
              <div className="mt-2 flex flex-col gap-1.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#003E7E]">Hôm nay</span>
                  <div className={metric.id === 'pass-rate' ? 'text-2xl xl:text-3xl font-black tabular-nums text-slate-900 leading-none mt-0.5' : 'text-lg xl:text-xl font-black tabular-nums text-slate-900 leading-none mt-0.5'}>
                    {metric.value}
                  </div>
                </div>
                <div className="border-t border-dashed border-slate-200 my-1"></div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <div>
                    <span className="font-medium mr-1">{comparison.comparison_label}:</span>
                    <span className="font-bold tabular-nums text-slate-900">{metric.comparisonValue}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge label={metric.delta} tone={metric.tone} />
                    <span className="text-[10px] font-bold text-slate-700">{getDirectionLabel(metric.rawDelta)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-500">Không có dữ liệu so sánh</p>
      )}
    </div>
  );
}

function LeadershipComparisonGrid({ comparisons }) {
  return (
    <div className="mb-4">
      <h4 className="text-base font-bold text-slate-900">So sánh điều hành</h4>
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        {comparisons.map((comparison) => (
          <LeadershipComparisonCard key={comparison.id} comparison={comparison} />
        ))}
      </div>
    </div>
  );
}

function SevenDayComparisonEvidenceTable({ rows }) {
  if (!rows?.length) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-900">Bằng chứng so cùng kỳ 7 ngày</h4>
        <StatusBadge label="D-7" tone="info" />
      </div>
      <div className="grid gap-2 md:grid-cols-7">
        {rows.map((row) => (
          <div key={row.current_date} className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 shadow-2xs">
            <div className="text-xs font-bold text-slate-900">{row.dayLabel}</div>
            <div className="mt-0.5 text-[11px] font-medium text-slate-500">{row.current_date}</div>
            {row.available ? (
              <div className="mt-2 space-y-1 text-[11px] font-medium">
                <div className="flex justify-between gap-1">
                  <span className="text-slate-500">Sản lượng</span>
                  <span className="font-bold tabular-nums text-slate-900">{formatDeltaValue(row.total_volume_delta, formatNumber)}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-slate-500">Tỷ lệ đạt</span>
                  <span className="font-bold tabular-nums text-emerald-700">{formatDeltaValue(row.pass_rate_delta, (delta) => `${Number(delta).toFixed(2)} điểm %`)}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-slate-500">Không đạt</span>
                  <span className="font-bold tabular-nums text-red-600">{formatDeltaValue(row.failed_count_delta, formatNumber)}</span>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-[11px] font-semibold text-slate-400">Không có dữ liệu so sánh</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IntegratedTrendRiskWorkspace({
  data = [],
  loading,
  error,
  fromDate,
  toDate,
  maBcvh,
  kpiData,
  mode = '30-days',
  onModeChange,
}) {
  const rows = useMemo(() => buildIntegratedTrendRows({ mode, items: data, toDate }), [data, mode, toDate]);
  const leadershipComparisons = useMemo(
    () => buildLeadershipComparisonWidgets({ items: data, fromDate, toDate, comparisonContract: kpiData?.comparisons }),
    [data, fromDate, toDate, kpiData?.comparisons],
  );
  const sevenDayEvidence = useMemo(
    () => buildSevenDayVisibleComparisonEvidence(data, toDate),
    [data, toDate],
  );
  const selectedRangeRankLabel = maBcvh === 'all' ? formatSelectedRangeRank(kpiData?.national_rank) : null;

  const action = (
    <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/80" role="tablist" aria-label="Chọn chế độ xu hướng">
      {TREND_MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={mode === item.id}
          onClick={() => onModeChange?.(item.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 motion-reduce:transition-none ${
            mode === item.id
              ? 'bg-[#003E7E] text-white font-bold shadow-2xs'
              : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <CardContainer
      title="Xu hướng điều hành tổng hợp"
      subtitle="Một vùng xu hướng chính cho sản lượng, tỷ lệ đạt, mục tiêu và ngoại lệ hiện tại."
      action={action}
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all duration-150 motion-reduce:transition-none"
    >
      {loading ? (
        <LoadingState label="Đang tải dữ liệu xu hướng điều hành..." className="min-h-[360px]" />
      ) : error ? (
        <ErrorState title="Không thể tải xu hướng điều hành" description={error} className="min-h-[360px]" />
      ) : !rows.length ? (
        <EmptyState title="Không có dữ liệu xu hướng" description="Không có dữ liệu bưu gửi hằng ngày cho phạm vi đang chọn." className="min-h-[360px]" />
      ) : (
        <div className="grid gap-5">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
              <StatusBadge label={TREND_MODES.find((item) => item.id === mode)?.label} tone="info" />
              {selectedRangeRankLabel ? <span>{selectedRangeRankLabel}</span> : null}
              <span className="inline-flex items-center gap-1"><Layers size={13} /> Chỉ hiển thị một câu chuyện xu hướng chính</span>
              <span className="inline-flex items-center gap-1"><TrendingUp size={13} /> Mốc dưới mục tiêu hiển thị bằng marker</span>
            </div>
            <LeadershipComparisonGrid comparisons={leadershipComparisons} />
            <TrendChart rows={rows} mode={mode} />
            {mode === '7-days' ? <SevenDayComparisonEvidenceTable rows={sevenDayEvidence} /> : null}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium">
              <LegendItem color="#2563EB" label="Sản lượng, trục trái" shape="bar" />
              {mode === '7-days' ? <LegendItem color="#64748B" label="Sản lượng kỳ so sánh" shape="bar" /> : null}
              <LegendItem color="#059669" label="Tỷ lệ đạt, trục phải" />
              {mode === '7-days' ? <LegendItem color={COLORS.comparison} label="Tỷ lệ đạt kỳ so sánh" dashed /> : null}
              <LegendItem color="#DC2626" label={`Mục tiêu ${QUALITY_TARGET_RATE}%`} dashed />
              <LegendItem color={COLORS.warning} label="Marker dưới mục tiêu" />
            </div>
          </div>
        </div>
      )}
    </CardContainer>
  );
}
