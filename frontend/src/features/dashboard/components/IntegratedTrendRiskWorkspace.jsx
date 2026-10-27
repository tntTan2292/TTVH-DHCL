import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../../api/client';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton';
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
import { CardContainer, EmptyState, ErrorState, LoadingState, StatusBadge } from '../../../components/shared/SharedComponents';
import {
  formatNumber,
  formatRate,
  getVolumeAxisMax,
} from './comboTrendlineData';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorEndpoint, indicatorTargetRate, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { DASHBOARD_LABELS, DASHBOARD_SEMANTIC_COLORS } from './dashboardSemantics';
import { ReferenceTargetLabel, renderRateLabel, renderVolumeBarLabel } from './ChartLabelRenderers';
import ChartZoomFrame from './ChartZoomFrame';
import ChartRangeNavigator from './ChartRangeNavigator';
import { LABEL_STYLE, MIN_ZOOM_SPAN, selectLabelIndexes, sliceWindow } from './chartDataLabels';
import {
  buildIntegratedTrendRows,
  buildLeadershipComparisonWidgets,
  buildSevenDayVisibleComparisonEvidence,
  TREND_MODES,
} from './integratedTrendRiskData';
import { isIsoDate } from './qualityTrendlineWindow';
import { buildSevenDayWindowComparisonModel } from './sevenDayRollingComparisonData';

const COLORS = {
  volume: DASHBOARD_SEMANTIC_COLORS.volume,
  pass: DASHBOARD_SEMANTIC_COLORS.passed,
  target: DASHBOARD_SEMANTIC_COLORS.target,
  comparison: DASHBOARD_SEMANTIC_COLORS.comparison,
  warning: DASHBOARD_SEMANTIC_COLORS.warning,
  unknown: DASHBOARD_SEMANTIC_COLORS.unknown,
};

function formatDayPointLabel(row, idx) {
  if (!row) return `Ngày ${idx + 1}`;
  if (row.dayLabel && row.current_date) return `${row.dayLabel} (${row.current_date})`;
  if (row.current_date) return row.current_date;
  if (row.date) {
    const parts = row.date.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return row.date;
  }
  return `Ngày ${idx + 1}`;
}

function IntegratedTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload.find((item) => item?.payload)?.payload || {};

  return (
    <div className="z-50 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 shadow-xl text-white">
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

function SevenDayCumulativeStrip({ model, theme, isMobile = false }) {
  return (
    <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : 'flex-nowrap'}`}>
      {/* Kỳ hiện tại */}
      <div
        className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-lg border ${theme.soft || 'bg-slate-50'} ${theme.headerBorder || 'border-slate-300'} px-2.5 py-1 shadow-2xs shrink-0`}
      >
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full shadow-2xs"
          style={{ backgroundColor: theme.primary }}
        />
        <div className="flex items-baseline gap-1 sm:gap-1.5 whitespace-nowrap">
          <span className="text-xs font-black uppercase tracking-wide text-slate-800">
            Kỳ hiện tại{model.currentRange ? (
              <span className="text-[11px] font-semibold text-slate-600 hidden md:inline"> ({model.currentRange})</span>
            ) : null}:
          </span>
          <span className={`text-base sm:text-lg font-black tabular-nums leading-none ${theme.text || 'text-slate-900'}`}>
            {model.current.rate}
          </span>
          {model.current.rank !== '—' ? (
            <span className={`text-xs sm:text-sm font-black tabular-nums ${theme.text || 'text-slate-900'}`}>
              - {model.current.rank}
            </span>
          ) : null}
        </div>
      </div>

      {/* Kỳ so sánh */}
      <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 shadow-2xs shrink-0">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-slate-500 shadow-2xs" />
        <div className="flex items-baseline gap-1 sm:gap-1.5 whitespace-nowrap">
          <span className="text-xs font-black uppercase tracking-wide text-slate-800">
            Kỳ so sánh{model.compareRange ? (
              <span className="text-[11px] font-semibold text-slate-600 hidden md:inline"> ({model.compareRange})</span>
            ) : null}:
          </span>
          <span className="text-base sm:text-lg font-black tabular-nums leading-none text-slate-900">
            {model.compare.rate}
          </span>
          {model.compare.rank !== '—' ? (
            <span className="text-xs sm:text-sm font-black tabular-nums text-slate-700">
              - {model.compare.rank}
            </span>
          ) : null}
        </div>
      </div>

      {/* Chênh lệch tỷ lệ */}
      {model.delta?.rate?.text && model.delta.rate.text !== '—' ? (
        <div
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-extrabold tabular-nums shadow-2xs shrink-0 ${
            isMobile ? '' : 'hidden lg:inline-flex'
          } ${
            model.delta.rate.tone === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : model.delta.rate.tone === 'danger'
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : 'border-slate-300 bg-slate-100 text-slate-800'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Chênh lệch:</span>
          <span className="text-xs font-black">{model.delta.rate.text}</span>
        </div>
      ) : null}
    </div>
  );
}

// Fixed frame; only the 30-day mode zooms (wheel / drag / double-click to reset) so the
// per-point labels become readable without changing the card size.
// Enhanced: smart cursor zoom anchoring (plotMargins { left: 82, right: 94 }),
// horizontal pan slider, presets (14 days, 7 days, all), jump to latest (N-1) button.
// Height: generous, comfortable heights for 100% zoom (Section 8: 30-day >= 300px, 7-day >= ~320px).
function TrendChart({ rows, mode, windowData }) {
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const cumulativeModel = useMemo(() => buildSevenDayWindowComparisonModel(windowData), [windowData]);
  const canZoom = mode === '30-days' && rows.length > MIN_ZOOM_SPAN;
  const plotMargins = { left: 82, right: 94 };
  const chartHeight = mode === '7-days' ? 'h-[340px] lg:h-[360px]' : 'h-[320px] lg:h-[340px]';

  return (
    <div className="w-full">
      {/* Below sm (< 640px): cumulative figures sit OUTSIDE the chart to keep the chart clean */}
      {mode === '7-days' ? (
        <div className="block sm:hidden mb-2">
          <SevenDayCumulativeStrip model={cumulativeModel} theme={theme} isMobile />
        </div>
      ) : null}

      <ChartZoomFrame
        total={rows.length}
        enabled={canZoom}
        plotMargins={plotMargins}
        className="w-full"
      >
        {({ window, isZoomed: _isZoomed, setWindow }) => {
          const visibleRows = sliceWindow(rows, window);

          return (
            <div>
              <div className={`w-full ${chartHeight}`}>
                <TrendChartPlot rows={visibleRows} mode={mode} windowData={windowData} cumulativeModel={cumulativeModel} />
              </div>
              {canZoom ? (
                <ChartRangeNavigator
                  window={window}
                  total={rows.length}
                  rows={rows}
                  unitNoun="ngày"
                  presets={[
                    { count: 14, label: '14 ngày gần nhất' },
                    { count: 7, label: '7 ngày gần nhất' },
                  ]}
                  jumpLatestLabel="Về ngày mới nhất (N-1)"
                  getPointLabel={formatDayPointLabel}
                  onRangeChange={(nextWin) => setWindow?.(nextWin)}
                  onReset={() => setWindow?.(null)}
                />
              ) : null}
            </div>
          );
        }}
      </ChartZoomFrame>
    </div>
  );
}

function TrendChartPlot({ rows, mode, windowData, cumulativeModel: providedModel }) {
  const indicator = useIndicator();
  const targetRate = indicatorTargetRate(indicator);
  const theme = indicatorTheme(indicator);
  const volumeAxisMax = getVolumeAxisMax(rows);
  const xKey = mode === '7-days' ? 'dayLabel' : 'date';
  const rateLabelIndexes = selectLabelIndexes(rows, 'quality_rate');
  const volumeLabelIndexes = selectLabelIndexes(rows, 'total_volume');
  const previousRateLabelIndexes = selectLabelIndexes(rows, 'previous_quality_rate');
  const previousVolumeLabelIndexes = selectLabelIndexes(rows, 'previous_total_volume');

  const cumulativeModel = useMemo(
    () => providedModel || buildSevenDayWindowComparisonModel(windowData),
    [providedModel, windowData],
  );

  const overlayRef = useRef(null);
  const [overlayHeight, setOverlayHeight] = useState(0);

  useEffect(() => {
    if (!overlayRef.current || typeof globalThis.ResizeObserver === 'undefined') return;
    const ro = new globalThis.ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = Math.round(entry.contentRect?.height || entry.target?.offsetHeight || 0);
        if (h > 0) setOverlayHeight(h);
      }
    });
    ro.observe(overlayRef.current);
    return () => ro.disconnect();
  }, [mode]);

  const chartMarginTop = useMemo(() => {
    if (mode !== '7-days') {
      return targetRate >= 95 ? 24 : 16;
    }
    // 7-day mode: overlay sits between top-1 (4px) and 4 + overlayHeight.
    // The plot area (YAxis, bars, lines, labels, target label) must start below the overlay.
    // For targetRate >= 95% (F1.1/F1.2), the target line is close to 100% and ReferenceTargetLabel
    // sits at y - 7, so we ensure base headroom of at least 48px.
    const effectiveHeight = overlayHeight > 0 ? overlayHeight : 32;
    const minHeadroom = targetRate >= 95 ? 48 : 40;
    return Math.max(effectiveHeight + 14, minHeadroom);
  }, [mode, overlayHeight, targetRate]);

  // Dynamic vertical separation: higher series label sits 'above' its point,
  // lower series label sits 'below'. Even when the two lines cross or run very close,
  // their labels maintain a safe >=27px gap and never overlap.
  const getQualityRatePlacement = (row) => {
    if (row?.previous_quality_rate == null || row?.quality_rate == null) return 'above';
    return Number(row.quality_rate) >= Number(row.previous_quality_rate) ? 'above' : 'below';
  };

  const getPreviousRatePlacement = (row) => {
    if (row?.quality_rate == null || row?.previous_quality_rate == null) return 'below';
    return Number(row.previous_quality_rate) > Number(row.quality_rate) ? 'above' : 'below';
  };

  return (
    <div className="relative h-full w-full">
      {/* 7-day mode cumulative figures in reserved top band (covers no bars, lines, or data labels) */}
      {mode === '7-days' ? (
        <div
          ref={overlayRef}
          className="absolute top-1.5 left-[82px] right-[94px] z-10 pointer-events-none hidden sm:flex flex-nowrap items-center gap-2 overflow-hidden"
        >
          <SevenDayCumulativeStrip model={cumulativeModel} theme={theme} isMobile={false} />
        </div>
      ) : null}

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: chartMarginTop, right: 24, bottom: 8, left: 4 }} barCategoryGap="22%">
          <defs>
            <linearGradient id="volumeBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.primary} stopOpacity={0.95} />
              <stop offset="100%" stopColor={theme.primary} stopOpacity={0.6} />
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
            y={targetRate}
            stroke="#DC2626"
            strokeDasharray="6 4"
            strokeWidth={2}
            label={<ReferenceTargetLabel value={`Mục tiêu ${targetRate}%`} />}
          />
          <Bar yAxisId="volume" dataKey="total_volume" name={DASHBOARD_LABELS.volume} fill="url(#volumeBarGradient)" radius={[6, 6, 0, 0]} isAnimationActive={false} label={renderVolumeBarLabel({ visible: volumeLabelIndexes })} />
          {mode === '7-days' ? (
            <Bar yAxisId="volume" dataKey="previous_total_volume" name="Sản lượng kỳ so sánh" fill="url(#prevVolumeBarGradient)" radius={[6, 6, 0, 0]} isAnimationActive={false} label={renderVolumeBarLabel({ visible: previousVolumeLabelIndexes, textColor: '#0F172A', fontSize: LABEL_STYLE.compareFontSize + 1, className: 'hidden sm:inline' })} />
          ) : null}
          <Line yAxisId="rate" type="linear" dataKey="quality_rate" name={DASHBOARD_LABELS.passRate} stroke={theme.line} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: theme.line }} connectNulls={false} isAnimationActive={false} label={renderRateLabel({ visible: rateLabelIndexes, rows, placement: getQualityRatePlacement, getFill: (row) => (row?.below_target ? '#C2410C' : '#047857') })} />
          {mode === '7-days' ? (
            <Line yAxisId="rate" type="linear" dataKey="previous_quality_rate" name="Tỷ lệ đạt kỳ so sánh" stroke={COLORS.comparison} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, strokeWidth: 1.5, fill: '#fff', stroke: COLORS.comparison }} connectNulls={false} isAnimationActive={false} label={renderRateLabel({ visible: previousRateLabelIndexes, rows, placement: getPreviousRatePlacement, fill: '#475569', fontSize: LABEL_STYLE.compareFontSize, className: 'hidden sm:inline' })} />
          ) : null}
          <Scatter yAxisId="rate" dataKey="quality_rate" shape={<MarkerShape />} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function LegendItem({ color, label, shape = 'dot', dashed = false }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
      <span
        className={shape === 'bar' ? 'h-2 w-3 rounded-xs shadow-2xs' : dashed ? 'h-1.5 w-4 border-t-2 border-dashed' : 'h-2 w-2 rounded-full shadow-2xs'}
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

function getDeltaTone(value, type = 'rate') {
  if (value === null || value === undefined || Number(value) === 0) return 'neutral';
  if (type === 'volume') {
    return Number(value) > 0 ? 'info' : 'neutral';
  }
  return Number(value) > 0 ? 'success' : 'danger';
}

function getDirectionLabel(value) {
  if (value === null || value === undefined || Number(value) === 0) return 'Không đổi';
  return Number(value) > 0 ? 'Tăng' : 'Giảm';
}

function ComparisonMetric({ label, current, previous, previousLabel, delta, tone, direction }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-base font-black tabular-nums leading-none text-slate-900">{current}</span>
      <StatusBadge label={delta} tone={tone} className="text-[10px] px-1 py-0" />
      <span className="text-[10px] font-bold text-slate-700">{direction}</span>
      <span className="text-[11px] text-slate-600">{previousLabel}: <strong className="tabular-nums text-slate-900">{previous}</strong></span>
    </div>
  );
}

function LeadershipComparisonCard({ comparison }) {
  if (!comparison) return null;

  const dateSub = comparison?.current_date && comparison?.previous_date
    ? `${comparison.current_date} so với ${comparison.previous_date}`
    : 'Dựa trên ngày mới nhất có dữ liệu trong phạm vi đang chọn.';

  return (
    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 via-white to-slate-50/40 px-3 py-1.5 shadow-2xs">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <StatusBadge label={comparison?.id === 'd-7' ? 'D-7' : 'D-1'} tone={comparison?.available ? 'info' : 'neutral'} />
          <h4 className="text-xs font-bold text-slate-900 truncate" title={dateSub}>{comparison?.title}</h4>
        </div>
        {comparison?.available ? (
          <>
            <ComparisonMetric
              label="Tỷ lệ đạt"
              current={formatRate(comparison.pass_rate?.current)}
              previous={formatRate(comparison.pass_rate?.previous)}
              previousLabel={comparison.comparison_label}
              delta={formatDeltaValue(comparison.pass_rate?.delta, (delta) => `${Number(delta).toFixed(2)}%`)}
              tone={getDeltaTone(comparison.pass_rate?.delta, 'rate')}
              direction={getDirectionLabel(comparison.pass_rate?.delta)}
            />
            <ComparisonMetric
              label="Sản lượng"
              current={formatNumber(comparison.total_volume?.current)}
              previous={formatNumber(comparison.total_volume?.previous)}
              previousLabel={comparison.comparison_label}
              delta={formatDeltaValue(comparison.total_volume?.delta, formatNumber)}
              tone={getDeltaTone(comparison.total_volume?.delta, 'volume')}
              direction={getDirectionLabel(comparison.total_volume?.delta)}
            />
          </>
        ) : (
          <p className="text-xs font-semibold text-slate-500">Không có dữ liệu so sánh</p>
        )}
      </div>
    </div>
  );
}

function LeadershipComparisonGrid({ comparisons }) {
  return (
    <div className="grid gap-1.5 md:grid-cols-2">
      {comparisons.map((comparison) => (
        <LeadershipComparisonCard key={comparison.id} comparison={comparison} />
      ))}
    </div>
  );
}

function formatEvidenceDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return dateStr.slice(5) || dateStr;
}

function SevenDayComparisonEvidenceTable({ rows }) {
  if (!rows?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h4 className="text-sm font-bold text-slate-900">Bằng chứng so cùng kỳ 7 ngày</h4>
          <span className="text-xs font-medium text-slate-500">(So với cùng thứ tuần trước)</span>
        </div>
        <StatusBadge label="D-7" tone="info" />
      </div>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 md:grid-cols-7">
        {rows.map((row) => (
          <div key={row.current_date} className="rounded-lg border border-slate-200/90 bg-slate-50/75 p-2 shadow-2xs transition-colors hover:bg-slate-100/70">
            <div className="flex items-baseline justify-between border-b border-slate-200/70 pb-1.5">
              <span className="text-sm font-bold text-slate-900">{row.dayLabel}</span>
              <span className="text-xs font-semibold text-slate-500">{formatEvidenceDate(row.current_date)}</span>
            </div>
            {row.available ? (
              <div className="mt-1.5 space-y-1">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-xs font-medium text-slate-600">Tỷ lệ đạt</span>
                  <span className={`text-sm font-black tabular-nums ${row.pass_rate_delta > 0 ? 'text-emerald-700' : row.pass_rate_delta < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {formatDeltaValue(row.pass_rate_delta, (delta) => `${Number(delta).toFixed(2)}%`)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-xs font-medium text-slate-600">Sản lượng</span>
                  <span className="text-xs sm:text-sm font-bold tabular-nums text-slate-900">
                    {formatDeltaValue(row.total_volume_delta, formatNumber)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs font-medium text-slate-400 text-center py-1">Không có dữ liệu</div>
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
  latestDate,
  maBcvh,
  kpiData,
  mode = '30-days',
  onModeChange,
  windowComparisonData = null,
}) {
  const indicator = useIndicator();
  const targetRate = indicatorTargetRate(indicator);
  const theme = indicatorTheme(indicator);
  const rows = useMemo(() => buildIntegratedTrendRows({ mode, items: data, toDate, targetRate }), [data, mode, toDate, targetRate]);
  const leadershipComparisons = useMemo(
    () => buildLeadershipComparisonWidgets({ items: data, fromDate, toDate, comparisonContract: kpiData?.comparisons }),
    [data, fromDate, toDate, kpiData?.comparisons],
  );
  const sevenDayEvidence = useMemo(
    () => buildSevenDayVisibleComparisonEvidence(data, toDate),
    [data, toDate],
  );
  const selectedRangeRankLabel = maBcvh === 'all' ? formatSelectedRangeRank(kpiData?.national_rank) : null;

  const cardRef = useRef(null);

  // 7-day rolling window comparison cumulative panel fetch
  const [fetchedWindowComparison, setFetchedWindowComparison] = useState(null);

  useEffect(() => {
    // Reset stored data to null when parameters change so old payload is never shown for new selection
    setFetchedWindowComparison(null);

    if (mode !== '7-days') return;
    if (windowComparisonData) return;

    const effectiveToDate = isIsoDate(toDate)
      ? toDate
      : isIsoDate(latestDate)
        ? latestDate
        : null;
    if (!effectiveToDate) return;

    const controller = typeof globalThis.AbortController !== 'undefined' ? new globalThis.AbortController() : null;
    const params = { to_date: effectiveToDate };
    if (maBcvh && maBcvh !== 'all') {
      params.ma_bcvh = maBcvh;
    }

    let endpoint;
    try {
      endpoint = indicatorEndpoint('windowComparison', indicator);
    } catch {
      endpoint = `${indicator?.apiBase || '/f13'}/ranking/bcvh/window-comparison`;
    }

    api
      .get(endpoint, { params, signal: controller?.signal })
      .then((res) => {
        if (!controller?.signal?.aborted) {
          if (res?.data?.success) {
            setFetchedWindowComparison(res.data.data);
          } else {
            setFetchedWindowComparison(null);
          }
        }
      })
      .catch(() => {
        // Must not blank the chart on error; fallback to null which renders "—"
        if (!controller?.signal?.aborted) {
          setFetchedWindowComparison(null);
        }
      });

    return () => controller?.abort();
  }, [indicator, latestDate, maBcvh, mode, toDate, windowComparisonData]);

  const activeWindowComparison = windowComparisonData || fetchedWindowComparison;

  const action = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-2xs" role="tablist" aria-label="Chọn chế độ xu hướng">
        {TREND_MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            onClick={() => onModeChange?.(item.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-[color,background-color,box-shadow] duration-150 motion-reduce:transition-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-vnpost-blue)]/40 ${
              mode === item.id
                ? `${theme.button} font-bold shadow-xs`
                : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <BlockCaptureButton
        targetRef={cardRef}
        blockTitle="Xu hướng điều hành tổng hợp"
        dateOrPeriod={fromDate === toDate ? toDate : `${fromDate} đến ${toDate}`}
      />
    </div>
  );

  return (
    <div ref={cardRef}>
      <CardContainer
        title={
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-bold text-slate-900">Xu hướng điều hành tổng hợp</span>
            {selectedRangeRankLabel ? (
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">({selectedRangeRankLabel})</span>
            ) : null}
          </div>
        }
        action={action}
        className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-150 motion-reduce:transition-none [&>div:first-child]:py-2.5 [&>div:first-child]:px-5 [&>div:last-child]:p-3 md:[&>div:last-child]:p-3.5"
      >
      {loading ? (
        <LoadingState label="Đang tải dữ liệu xu hướng điều hành..." className="min-h-[360px]" />
      ) : error ? (
        <ErrorState title="Không thể tải xu hướng điều hành" description={error} className="min-h-[360px]" />
      ) : !rows.length ? (
        <EmptyState title="Không có dữ liệu xu hướng" description="Không có dữ liệu bưu gửi hằng ngày cho phạm vi đang chọn." className="min-h-[360px]" />
      ) : (
          <div className="space-y-2">
            <LeadershipComparisonGrid comparisons={leadershipComparisons} />
            <TrendChart rows={rows} mode={mode} windowData={activeWindowComparison} />
            {mode === '7-days' ? <SevenDayComparisonEvidenceTable rows={sevenDayEvidence} /> : null}
            <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 font-medium border-t border-slate-100">
              <LegendItem color={theme.primary} label="Sản lượng, trục trái" shape="bar" />
              {mode === '7-days' ? <LegendItem color="#64748B" label="Sản lượng kỳ so sánh" shape="bar" /> : null}
              <LegendItem color={theme.line} label="Tỷ lệ đạt, trục phải" />
              {mode === '7-days' ? <LegendItem color={COLORS.comparison} label="Tỷ lệ đạt kỳ so sánh" dashed /> : null}
              <LegendItem color="#DC2626" label={`Mục tiêu ${targetRate}%`} dashed />
              <LegendItem color={COLORS.warning} label="Marker dưới mục tiêu" />
            </div>
          </div>
      )}
    </CardContainer>
    </div>
  );
}
