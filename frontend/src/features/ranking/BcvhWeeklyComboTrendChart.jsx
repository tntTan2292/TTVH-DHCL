import { useId } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CANONICAL_BCVH_CODES } from '../dashboard/components/dashboardFilterOptions.js';
import { BCVH_COLORS, CANONICAL_NAMES, DASH } from './bcvhOverviewData.js';
import {
  formatNumber,
  formatRate,
  formatVariance,
  getVolumeAxisMax,
} from '../dashboard/components/comboTrendlineData.js';
import {
  LABEL_ALL_MAX_POINTS,
  MIN_ZOOM_SPAN,
  selectLabelIndexes,
  selectLastIndex,
  sliceWindow,
} from '../dashboard/components/chartDataLabels.js';
import {
  renderRateLabel,
  renderVolumeBarLabel,
  ReferenceTargetLabel,
} from '../dashboard/components/ChartLabelRenderers.jsx';
import ChartZoomFrame from '../dashboard/components/ChartZoomFrame.jsx';
import ChartRangeNavigator from '../dashboard/components/ChartRangeNavigator.jsx';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_HEX_COLOR,
} from '../../components/f13/f13HeatmapBandCatalog.js';
import { useIndicator } from '../indicator/IndicatorContext.js';
import { indicatorTargetRate, indicatorTheme } from '../indicator/indicatorConfig.js';
import {
  WEEKLY_TREND_TOTAL_KEY,
  getWeeklyTrendSeriesData,
} from './bcvhWeeklyComparisonData.js';

function HeatmapRateDot(props) {
  const { heatmapBands } = useIndicator();
  const { cx, cy, value } = props;
  if (value === null || value === undefined || typeof cx !== 'number' || typeof cy !== 'number') return null;
  const band = classifyF13HeatmapRate(value, heatmapBands);
  const color = F13_HEATMAP_HEX_COLOR[band.tone] || '#059669';
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3.5}
      fill="#ffffff"
      stroke={color}
      strokeWidth={2}
    />
  );
}

function HeatmapRateActiveDot(props) {
  const { heatmapBands } = useIndicator();
  const { cx, cy, value } = props;
  if (value === null || value === undefined || typeof cx !== 'number' || typeof cy !== 'number') return null;
  const band = classifyF13HeatmapRate(value, heatmapBands);
  const color = F13_HEATMAP_HEX_COLOR[band.tone] || '#059669';
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5.5}
      fill={color}
      stroke="#ffffff"
      strokeWidth={2}
    />
  );
}

function WeeklyComboTooltip({ active, payload, label, unitName, compact = false }) {
  const indicator = useIndicator();
  const { heatmapBands } = indicator;
  const targetRate = indicatorTargetRate(indicator);
  if (!active || !payload || !payload.length) return null;

  const point = payload.find((item) => item?.payload)?.payload || {};
  const hasData = point.total_volume !== null && point.total_volume !== undefined;
  const band = classifyF13HeatmapRate(point.quality_rate, heatmapBands);

  return (
    <div className={`rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-xs ${compact ? 'p-2.5 text-xs max-w-[240px]' : 'p-3.5 text-xs sm:text-sm max-w-[300px]'}`}>
      <div className="border-b border-slate-100 pb-2">
        <div className="flex items-center justify-between gap-2 font-bold text-slate-800">
          <span>{label}</span>
          {unitName ? <span className="text-[11px] font-semibold text-slate-500">{unitName}</span> : null}
        </div>
        {point.rangeLabel ? (
          <div className="mt-0.5 text-[11px] font-medium text-slate-500">{point.rangeLabel}</div>
        ) : null}
        {point.national_rank ? (
          <div className="mt-0.5 text-[11px] font-bold text-rose-600">
            Vị thứ toàn quốc: {point.national_rank.rank}/{point.national_rank.total}
          </div>
        ) : null}
        {point.dataThroughNote ? (
          <div className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
            {point.dataThroughNote}
          </div>
        ) : null}
      </div>

      {!hasData ? (
        <div className="mt-2 text-xs font-semibold text-slate-400 italic">
          Tuần này không có dữ liệu đo kiểm
        </div>
      ) : (
        <div className="mt-2 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Sản lượng đo kiểm:</span>
            <span className="font-bold tabular-nums text-slate-800">
              {formatNumber(point.total_volume)} bưu gửi
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Số lượng đạt:</span>
            <span className="font-bold tabular-nums text-emerald-700">
              {formatNumber(point.passed)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Số lượng không đạt:</span>
            <span className="font-bold tabular-nums text-red-600">
              {formatNumber(point.failed)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-1.5">
            <span className="text-slate-500">{indicator.id === 'f13' ? 'Tỷ lệ đạt KPI:' : `Tỷ lệ đạt ${indicator.moduleLabel}:`}</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: F13_HEATMAP_HEX_COLOR[band.tone] }} />
              <span className="font-black tabular-nums text-slate-900">
                {formatRate(point.quality_rate)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">{indicator.id === 'f13' ? 'Mục tiêu KPI 2026:' : `Mục tiêu ${indicator.moduleLabel}:`}</span>
            <span className="font-semibold tabular-nums text-purple-700">
              {targetRate}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Chênh lệch mục tiêu:</span>
            <span className={`font-bold tabular-nums ${point.target_variance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatVariance(point.target_variance)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * Single-unit combo chart (Sản lượng cột + Tỷ lệ đường).
 * Used for "Tổng cộng 6 BCVH" or a selected individual BCVH.
 */
function SingleComboTrendChart({
  seriesData = [],
  unitName = '',
  height = 340,
  isZoomed = false,
}) {
  const indicator = useIndicator();
  const { heatmapBands } = indicator;
  const targetRate = indicatorTargetRate(indicator);
  const theme = indicatorTheme(indicator);
  const gradId = useId().replace(/:/g, '_');
  const volumeAxisMax = getVolumeAxisMax(seriesData);

  // Requirement 5: 40+ tuần khi chưa zoom chỉ gắn nhãn cột cuối/tuần mốc;
  // phóng to (<=10 tuần) mới hiện đủ nhãn số.
  const volumeLabelIndexes = !isZoomed
    ? selectLastIndex(seriesData, 'total_volume')
    : (seriesData.length <= LABEL_ALL_MAX_POINTS
        ? selectLabelIndexes(seriesData, 'total_volume', { allMaxPoints: LABEL_ALL_MAX_POINTS })
        : selectLabelIndexes(seriesData, 'total_volume'));

  const rateLabelIndexes = !isZoomed
    ? selectLastIndex(seriesData, 'quality_rate')
    : (seriesData.length <= LABEL_ALL_MAX_POINTS
        ? selectLabelIndexes(seriesData, 'quality_rate', { allMaxPoints: LABEL_ALL_MAX_POINTS })
        : selectLabelIndexes(seriesData, 'quality_rate'));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={seriesData}
          margin={{ top: 28, right: 32, bottom: 8, left: 6 }}
          barCategoryGap="28%"
        >
          <defs>
            <linearGradient id={`volumeBarGrad_${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.primary} stopOpacity={0.95} />
              <stop offset="100%" stopColor={theme.primary} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: '#CBD5E1' }}
            tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
            minTickGap={16}
          />
          <YAxis
            yAxisId="volume"
            domain={[0, volumeAxisMax]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
            tickFormatter={(value) => Number(value).toLocaleString('vi-VN')}
            label={{
              value: 'Sản lượng (bưu gửi)',
              angle: -90,
              position: 'insideLeft',
              fill: '#64748B',
              fontSize: 11,
              fontWeight: 600,
            }}
            width={78}
          />
          <YAxis
            yAxisId="rate"
            orientation="right"
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
            tickFormatter={(value) => `${value}%`}
            label={{
              value: 'Tỷ lệ đạt (%)',
              angle: 90,
              position: 'insideRight',
              fill: '#64748B',
              fontSize: 11,
              fontWeight: 600,
            }}
            width={68}
          />
          <Tooltip content={<WeeklyComboTooltip unitName={unitName} />} />
          <ReferenceLine
            yAxisId="rate"
            y={targetRate}
            stroke="#DC2626"
            strokeDasharray="6 4"
            strokeWidth={2}
            label={<ReferenceTargetLabel value={`Mục tiêu ${targetRate}%`} />}
          />
          <Bar
            yAxisId="volume"
            dataKey="total_volume"
            name="Sản lượng"
            fill={`url(#volumeBarGrad_${gradId})`}
            radius={[5, 5, 0, 0]}
            isAnimationActive={false}
            label={renderVolumeBarLabel({ visible: volumeLabelIndexes, fontSize: 10 })}
          />
          <Line
            yAxisId="rate"
            type="linear"
            dataKey="quality_rate"
            name="Tỷ lệ đạt KPI"
            stroke={theme.line}
            strokeWidth={3}
            dot={<HeatmapRateDot />}
            activeDot={<HeatmapRateActiveDot />}
            connectNulls={false}
            isAnimationActive={false}
            label={renderRateLabel({
              visible: rateLabelIndexes,
              rows: seriesData,
              fontSize: 10,
              getFill: (_row, value) => {
                const band = classifyF13HeatmapRate(value, heatmapBands);
                return F13_HEATMAP_HEX_COLOR[band.tone] || '#047857';
              },
            })}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Small-multiples grid: 6 synchronized mini combo charts for the 6 canonical BCVHs.
 * Solves PO problem: avoids 6 overlapping lines or 240+ cramped clustered bars.
 */
function SmallMultiplesGrid({
  view = [],
  unitNames = {},
  unitColors = {},
  isZoomed = false,
}) {
  const indicator = useIndicator();
  const { heatmapBands } = indicator;
  const targetRate = indicatorTargetRate(indicator);
  return (
    <div className="w-full">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs pr-40 sm:pr-48">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <span>Xem đồng thời 06 Bưu cục vận hành (Small Multiples)</span>
          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
            {isZoomed ? 'Đang phóng to đồng bộ' : 'Đồng bộ trục tuần'}
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          Mỗi BCVH có thang sản lượng riêng, độc lập trực quan, không chồng chéo.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {CANONICAL_BCVH_CODES.map((code) => {
          const unitData = getWeeklyTrendSeriesData(view, code, targetRate);
          const rawUnitName = unitNames[code] || CANONICAL_NAMES[code] || code;
          const unitName = rawUnitName.startsWith('BCVH') ? rawUnitName : `BCVH ${rawUnitName}`;
          const unitColor = unitColors[code] || BCVH_COLORS[code] || '#2563eb';
          const volumeAxisMax = getVolumeAxisMax(unitData);

          // Latest week summary point
          const latestPoint = unitData[unitData.length - 1];
          const latestRate = latestPoint?.quality_rate;
          const band = classifyF13HeatmapRate(latestRate, heatmapBands);

          const volumeLabelIndexes = !isZoomed
            ? selectLastIndex(unitData, 'total_volume')
            : (unitData.length <= LABEL_ALL_MAX_POINTS
                ? selectLabelIndexes(unitData, 'total_volume', { allMaxPoints: LABEL_ALL_MAX_POINTS })
                : selectLastIndex(unitData, 'total_volume'));

          const rateLabelIndexes = !isZoomed
            ? selectLastIndex(unitData, 'quality_rate')
            : (unitData.length <= LABEL_ALL_MAX_POINTS
                ? selectLabelIndexes(unitData, 'quality_rate', { allMaxPoints: LABEL_ALL_MAX_POINTS })
                : selectLastIndex(unitData, 'quality_rate'));

          return (
            <div
              key={code}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:shadow-md transition-shadow"
            >
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full shadow-2xs"
                    style={{ backgroundColor: unitColor }}
                  />
                  <h4 className="text-xs font-bold text-slate-800 truncate" title={unitName}>
                    {unitName}
                  </h4>
                </div>
                {latestRate !== null && latestRate !== undefined ? (
                  <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                    <span className="text-slate-400 font-medium">Tuần gần nhất:</span>
                    <span
                      className="rounded px-1.5 py-0.5 font-bold text-white shadow-2xs"
                      style={{ backgroundColor: F13_HEATMAP_HEX_COLOR[band.tone] || '#047857' }}
                    >
                      {formatRate(latestRate)}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">{DASH}</span>
                )}
              </div>

              <div className="h-[190px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={unitData}
                    margin={{ top: 16, right: 14, bottom: 4, left: 4 }}
                    barCategoryGap="24%"
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      minTickGap={16}
                    />
                    <YAxis
                      yAxisId="volume"
                      domain={[0, volumeAxisMax]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: '#64748B' }}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                      width={40}
                    />
                    <YAxis
                      yAxisId="rate"
                      orientation="right"
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: '#64748B' }}
                      tickFormatter={(v) => `${v}%`}
                      width={32}
                    />
                    <Tooltip content={<WeeklyComboTooltip unitName={unitName} compact />} />
                    <ReferenceLine
                      yAxisId="rate"
                      y={targetRate}
                      stroke="#DC2626"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                    <Bar
                      yAxisId="volume"
                      dataKey="total_volume"
                      fill={unitColor}
                      fillOpacity={0.8}
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={false}
                      label={renderVolumeBarLabel({ visible: volumeLabelIndexes, fontSize: 9 })}
                    />
                    <Line
                      yAxisId="rate"
                      type="linear"
                      dataKey="quality_rate"
                      stroke={unitColor}
                      strokeWidth={2.5}
                      dot={<HeatmapRateDot />}
                      activeDot={<HeatmapRateActiveDot />}
                      connectNulls={false}
                      isAnimationActive={false}
                      label={renderRateLabel({
                        visible: rateLabelIndexes,
                        rows: unitData,
                        fontSize: 9,
                        getFill: (_row, value) => {
                          const pointBand = classifyF13HeatmapRate(value, heatmapBands);
                          return F13_HEATMAP_HEX_COLOR[pointBand.tone] || '#047857';
                        },
                      })}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Main combo trend chart adapter for weekly trend.
 * Supports:
 * 1. Single unit mode ("Tổng cộng 6 BCVH" or specific BCVH)
 * 2. Small multiples mode ("Tất cả 6 BCVH")
 * 3. Smart cursor zoom anchoring with plotMargins
 * 4. Interactive Horizontal Range Slider / Scrollbar for easy week navigation
 */
export default function BcvhWeeklyComboTrendChart({
  data = [],
  unit = WEEKLY_TREND_TOTAL_KEY,
  unitNames = {},
  unitColors = {},
  height = 340,
}) {
  const targetRate = indicatorTargetRate(useIndicator());
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm font-semibold text-slate-400">
        {DASH} Chưa có dữ liệu biểu đồ tuần {DASH}
      </div>
    );
  }

  const isAllUnits = unit === 'all';
  const unitLabel = unitNames[unit] || CANONICAL_NAMES[unit] || unit;
  const plotMargins = isAllUnits ? { left: 40, right: 46 } : { left: 84, right: 100 };

  return (
    <div className="w-full">
      <ChartZoomFrame
        total={data.length}
        enabled={data.length > MIN_ZOOM_SPAN}
        plotMargins={plotMargins}
      >
        {({ window, isZoomed, setWindow }) => {
          const view = sliceWindow(data, window);

          return (
            <div>
              {isAllUnits ? (
                <SmallMultiplesGrid
                  view={view}
                  unitNames={unitNames}
                  unitColors={unitColors}
                  isZoomed={isZoomed}
                />
              ) : (
                <SingleComboTrendChart
                  seriesData={getWeeklyTrendSeriesData(view, unit, targetRate)}
                  unitName={unitLabel}
                  height={height}
                  isZoomed={isZoomed}
                />
              )}

              {data.length > MIN_ZOOM_SPAN ? (
                <ChartRangeNavigator
                  window={window}
                  total={data.length}
                  rows={data}
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
