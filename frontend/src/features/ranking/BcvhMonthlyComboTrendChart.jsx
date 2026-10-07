import { useId } from 'react';
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
import { CANONICAL_BCVH_CODES } from '../dashboard/components/dashboardFilterOptions.js';
import { BCVH_COLORS, CANONICAL_NAMES, DASH, getMonthlyTrendSeriesData } from './bcvhOverviewData.js';
import {
  formatNumber,
  formatRate,
  formatVariance,
  getVolumeAxisMax,
  QUALITY_TARGET_RATE,
} from '../dashboard/components/comboTrendlineData.js';
import { selectLabelIndexes } from '../dashboard/components/chartDataLabels.js';
import {
  renderRateLabel,
  renderVolumeBarLabel,
  ReferenceTargetLabel,
} from '../dashboard/components/ChartLabelRenderers.jsx';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_HEX_COLOR,
} from '../../components/f13/f13HeatmapBandCatalog.js';

function HeatmapRateDot(props) {
  const { cx, cy, value } = props;
  if (value === null || value === undefined || typeof cx !== 'number' || typeof cy !== 'number') return null;
  const band = classifyF13HeatmapRate(value);
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
  const { cx, cy, value } = props;
  if (value === null || value === undefined || typeof cx !== 'number' || typeof cy !== 'number') return null;
  const band = classifyF13HeatmapRate(value);
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

function MonthlyComboTooltip({ active, payload, label, unitName, anchorDate = null, compact = false }) {
  if (!active || !payload || !payload.length) return null;

  const point = payload.find((item) => item?.payload)?.payload || {};
  const hasData = point.total_volume !== null && point.total_volume !== undefined;
  const band = classifyF13HeatmapRate(point.quality_rate);
  const isCurrent = point.isCurrentMonth;

  return (
    <div className={`rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-xs ${compact ? 'p-2.5 text-xs max-w-[240px]' : 'p-3.5 text-xs sm:text-sm max-w-[300px]'}`}>
      <div className="border-b border-slate-100 pb-2">
        <div className="flex items-center justify-between gap-2 font-bold text-slate-800">
          <span>{point.month ? `Tháng ${parseInt(point.month.slice(5), 10)}/${point.month.slice(0, 4)}` : label}</span>
          {unitName ? <span className="text-[11px] font-semibold text-slate-500">{unitName}</span> : null}
        </div>
        {isCurrent ? (
          <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            <span>Tháng hiện tại lũy kế{anchorDate ? ` đến ${anchorDate}` : ''}</span>
          </div>
        ) : (
          point.days_with_data > 0 ? (
            <div className="mt-0.5 text-[11px] font-medium text-slate-500">
              {point.days_with_data}/{point.days_in_period} ngày có dữ liệu
            </div>
          ) : null
        )}
      </div>

      {!hasData ? (
        <div className="mt-2 text-xs font-semibold text-slate-400 italic">
          Tháng này chưa có dữ liệu đo kiểm
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
            <span className="text-slate-500">Tỷ lệ đạt KPI:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: F13_HEATMAP_HEX_COLOR[band.tone] }} />
              <span className="font-black tabular-nums text-slate-900">
                {formatRate(point.quality_rate)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Mục tiêu KPI 2026:</span>
            <span className="font-semibold tabular-nums text-purple-700">
              {QUALITY_TARGET_RATE}%
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
 * Single-unit combo chart for monthly trend (Volume Bar + KPI Rate Line).
 */
function SingleMonthlyComboTrendChart({
  seriesData = [],
  unitName = '',
  anchorDate = null,
  height = 320,
}) {
  const gradId = useId().replace(/:/g, '_');
  const volumeAxisMax = getVolumeAxisMax(seriesData);

  // <= 12 months: Label every valued point cleanly
  const volumeLabelIndexes = selectLabelIndexes(seriesData, 'total_volume', { allMaxPoints: 12 });
  const rateLabelIndexes = selectLabelIndexes(seriesData, 'quality_rate', { allMaxPoints: 12 });

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={seriesData}
          margin={{ top: 28, right: 32, bottom: 8, left: 6 }}
          barCategoryGap="28%"
        >
          <defs>
            <linearGradient id={`monthlyVolGrad_${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#003E7E" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id={`monthlyVolGradCurrent_${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#0284C7" stopOpacity={0.8} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />

          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: '#CBD5E1' }}
            tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
          />

          <YAxis
            yAxisId="volume"
            domain={[0, volumeAxisMax]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
            tickFormatter={(val) => Number(val).toLocaleString('vi-VN')}
            width={76}
          />

          <YAxis
            yAxisId="rate"
            orientation="right"
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
            tickFormatter={(val) => `${val}%`}
            width={60}
          />

          <Tooltip
            content={<MonthlyComboTooltip unitName={unitName} anchorDate={anchorDate} />}
          />

          <ReferenceLine
            yAxisId="rate"
            y={QUALITY_TARGET_RATE}
            stroke="#DC2626"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={<ReferenceTargetLabel value={`Mục tiêu ${QUALITY_TARGET_RATE}%`} />}
          />

          <Bar
            yAxisId="volume"
            dataKey="total_volume"
            name="Sản lượng đo kiểm"
            radius={[6, 6, 0, 0]}
            isAnimationActive={false}
            label={renderVolumeBarLabel({
              visible: volumeLabelIndexes,
              textColor: '#FFFFFF',
              fontSize: 10,
            })}
          >
            {seriesData.map((entry, idx) => (
              <Cell
                key={`cell-${entry.period_id || idx}`}
                fill={entry.isCurrentMonth ? `url(#monthlyVolGradCurrent_${gradId})` : `url(#monthlyVolGrad_${gradId})`}
                stroke={entry.isCurrentMonth ? '#0284C7' : undefined}
                strokeWidth={entry.isCurrentMonth ? 1.5 : 0}
              />
            ))}
          </Bar>

          <Line
            yAxisId="rate"
            type="linear"
            dataKey="quality_rate"
            name="Tỷ lệ đạt KPI 2026"
            stroke="#059669"
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
                const band = classifyF13HeatmapRate(value);
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
 * Small-multiples grid for monthly trend (6 synchronized mini combo charts for 6 BCVHs).
 */
function SmallMultiplesMonthlyGrid({
  chartData = [],
  unitNames = {},
  unitColors = {},
  anchorDate = null,
}) {
  return (
    <div className="w-full">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <span>Xem đồng thời 06 Bưu cục vận hành (Small Multiples)</span>
          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
            Đồng bộ trục tháng (T01 → T10)
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          Mỗi BCVH có thang sản lượng riêng, độc lập trực quan, không chồng chéo.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {CANONICAL_BCVH_CODES.map((code) => {
          const unitData = getMonthlyTrendSeriesData(chartData, code);
          const unitName = unitNames[code] || CANONICAL_NAMES[code] || code;
          const unitColor = unitColors[code] || BCVH_COLORS[code] || '#2563eb';
          const volumeAxisMax = getVolumeAxisMax(unitData);

          const latestPoint = unitData[unitData.length - 1];
          const latestRate = latestPoint?.quality_rate;
          const band = classifyF13HeatmapRate(latestRate);

          const volumeLabelIndexes = selectLabelIndexes(unitData, 'total_volume', { allMaxPoints: 12 });
          const rateLabelIndexes = selectLabelIndexes(unitData, 'quality_rate', { allMaxPoints: 12 });

          return (
            <div
              key={code}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:shadow-md transition-shadow"
            >
              {/* Unit Header */}
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full shadow-2xs"
                    style={{ backgroundColor: unitColor }}
                  />
                  <span className="font-bold text-slate-800 text-xs">{unitName}</span>
                </div>
                {latestRate !== null && latestRate !== undefined ? (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400 font-medium">Tháng gần nhất:</span>
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

              {/* Chart Plot */}
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={unitData}
                    margin={{ top: 16, right: 24, bottom: 4, left: 4 }}
                    barCategoryGap="22%"
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />

                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                    />

                    <YAxis
                      yAxisId="volume"
                      domain={[0, volumeAxisMax]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: '#94A3B8' }}
                      tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                      width={32}
                    />

                    <YAxis
                      yAxisId="rate"
                      orientation="right"
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: '#94A3B8' }}
                      tickFormatter={(v) => `${v}%`}
                      width={30}
                    />

                    <Tooltip
                      content={
                        <MonthlyComboTooltip
                          unitName={unitName}
                          anchorDate={anchorDate}
                          compact
                        />
                      }
                    />

                    <ReferenceLine
                      yAxisId="rate"
                      y={QUALITY_TARGET_RATE}
                      stroke="#DC2626"
                      strokeDasharray="4 3"
                      strokeWidth={1}
                    />

                    <Bar
                      yAxisId="volume"
                      dataKey="total_volume"
                      fill="#93C5FD"
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={false}
                      label={renderVolumeBarLabel({
                        visible: volumeLabelIndexes,
                        textColor: '#1E293B',
                        fontSize: 8,
                      })}
                    >
                      {unitData.map((entry, idx) => (
                        <Cell
                          key={`mini-cell-${entry.period_id || idx}`}
                          fill={entry.isCurrentMonth ? '#38BDF8' : '#93C5FD'}
                        />
                      ))}
                    </Bar>

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
                          const pointBand = classifyF13HeatmapRate(value);
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
 * Main Monthly Combo Trend Chart Component.
 * Supports:
 * - "total": Summed 6 BCVHs Combo Chart (Bar + Line)
 * - Specific BCVH code: Individual BCVH Combo Chart
 * - "all": Small Multiples Grid (6 mini combo charts)
 */
export default function BcvhMonthlyComboTrendChart({
  chartData = [],
  unit = 'total',
  unitNames = {},
  unitColors = {},
  anchorDate = null,
  height = 320,
}) {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm font-semibold text-slate-400">
        {DASH} Chưa có dữ liệu biểu đồ tháng {DASH}
      </div>
    );
  }

  const isAllUnits = unit === 'all';
  const unitLabel = unitNames[unit] || CANONICAL_NAMES[unit] || unit;

  return (
    <div className="w-full">
      {isAllUnits ? (
        <SmallMultiplesMonthlyGrid
          chartData={chartData}
          unitNames={unitNames}
          unitColors={unitColors}
          anchorDate={anchorDate}
        />
      ) : (
        <SingleMonthlyComboTrendChart
          seriesData={getMonthlyTrendSeriesData(chartData, unit)}
          unitName={unitLabel}
          anchorDate={anchorDate}
          height={height}
        />
      )}
    </div>
  );
}
