import { useMemo } from 'react';
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
import { CardContainer, EmptyState, LoadingState, StatusBadge } from '../../../components/shared/SharedComponents';
import {
  buildSamePeriodComparisonRows,
  formatComparisonDelta,
  formatComparisonRate,
  formatComparisonValue,
} from './samePeriodComparisonData';
import { QUALITY_TARGET_RATE, getVolumeAxisMax } from './comboTrendlineData';
import { DASHBOARD_SEMANTIC_COLORS } from './dashboardSemantics';

const CURRENT_VOLUME_COLOR = DASHBOARD_SEMANTIC_COLORS.volume;
const PREVIOUS_VOLUME_COLOR = DASHBOARD_SEMANTIC_COLORS.comparison;
const CURRENT_QUALITY_COLOR = DASHBOARD_SEMANTIC_COLORS.passed;
const PREVIOUS_QUALITY_COLOR = DASHBOARD_SEMANTIC_COLORS.neutral;
const TARGET_LINE_COLOR = DASHBOARD_SEMANTIC_COLORS.target;

function SamePeriodTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload.find((item) => item?.payload)?.payload || {};

  return (
    <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white px-4 py-3 shadow-xl">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {point.dayLabel}
      </div>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Ngày - Kỳ hiện tại</span>
          <span className="font-semibold text-[var(--color-text-main)]">{point.current_date || 'Không có dữ liệu'}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Ngày - Kỳ so sánh</span>
          <span className="font-semibold text-[var(--color-text-main)]">{point.previous_date || 'Không có dữ liệu'}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Sản lượng - Kỳ hiện tại</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatComparisonValue(point.current_volume)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Sản lượng - Kỳ so sánh</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatComparisonValue(point.previous_volume)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Chênh lệch sản lượng</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatComparisonDelta(point.current_volume_delta)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Tỷ lệ đạt - Kỳ hiện tại</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatComparisonRate(point.current_quality)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Tỷ lệ đạt - Kỳ so sánh</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatComparisonRate(point.previous_quality)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Chênh lệch tỷ lệ đạt</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatComparisonDelta(point.current_quality_delta, ' điểm %')}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Mục tiêu</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatComparisonRate(QUALITY_TARGET_RATE)}</span>
        </div>
      </div>
    </div>
  );
}

function SamePeriodComparisonChart({ data }) {
  const volumeAxisMax = getVolumeAxisMax(
    data.flatMap((item) => [item.current_volume, item.previous_volume])
      .filter((value) => typeof value === 'number')
      .map((total_volume) => ({ total_volume }))
  );

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 12, left: 8 }} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-200)" />
          <XAxis
            dataKey="dayLabel"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
          />
          <YAxis
            yAxisId="volume"
            domain={[0, volumeAxisMax]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
            tickFormatter={(value) => Number(value).toLocaleString('vi-VN')}
            label={{ value: 'Sản lượng (bưu gửi)', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 12 }}
            width={86}
          />
          <YAxis
            yAxisId="quality"
            orientation="right"
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
            tickFormatter={(value) => `${value}%`}
            label={{ value: 'Tỷ lệ đạt (%)', angle: 90, position: 'insideRight', fill: 'var(--color-text-muted)', fontSize: 12 }}
            width={82}
          />
          <Tooltip content={<SamePeriodTooltip />} />
          <ReferenceLine
            yAxisId="quality"
            y={QUALITY_TARGET_RATE}
            stroke={TARGET_LINE_COLOR}
            strokeDasharray="6 6"
          />
          <Bar yAxisId="volume" dataKey="current_volume" name="Sản lượng - Kỳ hiện tại" fill={CURRENT_VOLUME_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar yAxisId="volume" dataKey="previous_volume" name="Sản lượng - Kỳ so sánh" fill={PREVIOUS_VOLUME_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Line
            yAxisId="quality"
            type="linear"
            dataKey="current_quality"
            name="Tỷ lệ đạt - Kỳ hiện tại"
            stroke={CURRENT_QUALITY_COLOR}
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
            activeDot={{ r: 6 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="quality"
            type="linear"
            dataKey="previous_quality"
            name="Tỷ lệ đạt - Kỳ so sánh"
            stroke={PREVIOUS_QUALITY_COLOR}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3, strokeWidth: 1, fill: '#fff' }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function SamePeriodComparisonTrendlineAdapter({ data, loading, error, toDate }) {
  const rows = useMemo(() => buildSamePeriodComparisonRows(data, toDate), [data, toDate]);

  if (loading) {
    return (
      <CardContainer
        title="So sánh cùng kỳ 7 ngày"
        subtitle="So sánh 7 ngày hiện tại với 7 ngày ngay trước đó."
        action={<StatusBadge label="7 ngày" tone="info" />}
      >
        <LoadingState label="Đang tải biểu đồ so sánh cùng kỳ..." className="min-h-[320px]" />
      </CardContainer>
    );
  }

  if (error) {
    return (
      <CardContainer
        title="So sánh cùng kỳ 7 ngày"
        subtitle="So sánh 7 ngày hiện tại với 7 ngày ngay trước đó."
        action={<StatusBadge label="7 ngày" tone="info" />}
      >
        <EmptyState title="Không thể tải biểu đồ so sánh" description={error} className="min-h-[320px]" />
      </CardContainer>
    );
  }

  return (
    <CardContainer
      title="So sánh cùng kỳ 7 ngày"
      subtitle="Biểu đồ hợp nhất sản lượng và tỷ lệ đạt theo vị trí ngày trong tuần."
      action={<StatusBadge label="7 ngày" tone="info" />}
      className="overflow-hidden"
    >
      <SamePeriodComparisonChart data={rows} />
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: CURRENT_VOLUME_COLOR }} />
          Sản lượng - Kỳ hiện tại
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: PREVIOUS_VOLUME_COLOR }} />
          Sản lượng - Kỳ so sánh
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CURRENT_QUALITY_COLOR }} />
          Tỷ lệ đạt - Kỳ hiện tại
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-4 border-t-2 border-dashed" style={{ borderColor: PREVIOUS_QUALITY_COLOR }} />
          Tỷ lệ đạt - Kỳ so sánh
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-4 border-t-2 border-dashed" style={{ borderColor: TARGET_LINE_COLOR }} />
          Mục tiêu 90%
        </span>
      </div>
    </CardContainer>
  );
}
