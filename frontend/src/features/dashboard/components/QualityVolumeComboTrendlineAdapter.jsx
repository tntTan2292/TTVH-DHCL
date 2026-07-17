import { useEffect, useState } from 'react';
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
import { Activity } from 'lucide-react';
import api from '../../../api/client';
import { CardContainer, EmptyState, ErrorState, LoadingState, StatusBadge } from '../../../components/shared/SharedComponents';
import { buildTrendlineRequestParams } from './qualityTrendlineWindow';
import {
  formatNumber,
  formatRate,
  formatVariance,
  getVolumeAxisMax,
  normalizeComboTrendlineItems,
  QUALITY_TARGET_RATE,
} from './comboTrendlineData';

const VOLUME_BAR_COLOR = '#0f766e';
const QUALITY_LINE_COLOR = '#174ea6';
const TARGET_LINE_COLOR = '#dc2626';

function ComboTrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const point = payload.find((item) => item?.payload)?.payload || {};

  return (
    <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white px-4 py-3 shadow-xl">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Sản lượng</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatNumber(point.total_volume)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Đạt</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatNumber(point.passed)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Không đạt</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatNumber(point.failed)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Tỷ lệ chất lượng</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatRate(point.quality_rate)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Mục tiêu</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatRate(point.target_rate)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Chênh lệch so mục tiêu</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatVariance(point.target_variance)}</span>
        </div>
      </div>
    </div>
  );
}

function QualityVolumeComboTrendline({ data }) {
  const volumeAxisMax = getVolumeAxisMax(data);

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 12, left: 8 }} barCategoryGap="38%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-200)" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
            tickFormatter={(value) => value.slice(5)}
            minTickGap={18}
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
            label={{ value: 'Tỷ lệ chất lượng (%)', angle: 90, position: 'insideRight', fill: 'var(--color-text-muted)', fontSize: 12 }}
            width={82}
          />
          <Tooltip content={<ComboTrendTooltip />} />
          <ReferenceLine
            yAxisId="quality"
            y={QUALITY_TARGET_RATE}
            stroke={TARGET_LINE_COLOR}
            strokeDasharray="6 6"
            label={{ value: 'Mục tiêu 90%', position: 'insideTopRight', fill: TARGET_LINE_COLOR, fontSize: 12, fontWeight: 700 }}
          />
          <Bar
            yAxisId="volume"
            dataKey="total_volume"
            name="Sản lượng"
            fill={VOLUME_BAR_COLOR}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            yAxisId="quality"
            type="linear"
            dataKey="quality_rate"
            name="Tỷ lệ chất lượng"
            stroke={QUALITY_LINE_COLOR}
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
            activeDot={{ r: 6 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function QualityVolumeComboTrendlineAdapter({ reportingToDate, latestDate, maBcvh }) {
  const [state, setState] = useState({ loading: true, error: null, data: [] });

  useEffect(() => {
    let cancelled = false;

    const fetchTrend = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const params = buildTrendlineRequestParams({
          reportingToDate,
          latestDate,
          maBcvh,
        });

        if (!params) {
          throw new Error('Unable to resolve the rolling 30-day trendline window.');
        }

        const response = await api.get('/f13/dashboard/daily-trend', { params });

        if (!cancelled && response?.data?.success) {
          setState({
            loading: false,
            error: null,
            data: normalizeComboTrendlineItems(response.data?.data?.items || []),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error?.message || 'Unable to load the combo trendline.',
            data: [],
          });
        }
      }
    };

    if (reportingToDate || latestDate) {
      fetchTrend();
    }

    return () => {
      cancelled = true;
    };
  }, [reportingToDate, latestDate, maBcvh]);

  if (state.loading) {
    return <LoadingState label="Đang tải biểu đồ sản lượng và chất lượng..." className="min-h-[460px]" />;
  }

  if (state.error) {
    return <ErrorState title="Không thể tải biểu đồ kết hợp" description={state.error} className="min-h-[460px]" />;
  }

  if (!state.data.length) {
    return (
      <EmptyState
        title="Không có dữ liệu biểu đồ"
        description="Không có dữ liệu bưu gửi hằng ngày cho ngữ cảnh dashboard đã chọn."
        className="min-h-[460px]"
      />
    );
  }

  return (
    <CardContainer
      title="Sản lượng và chất lượng phát – 30 ngày"
      subtitle="Sản lượng bưu gửi và tỷ lệ chất lượng theo ngày trong cùng một biểu đồ."
      action={<StatusBadge label="30 ngày" tone="info" />}
      className="overflow-hidden"
    >
      <QualityVolumeComboTrendline data={state.data} />
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-[#0f766e]" />
          Sản lượng, trục trái
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#174ea6]" />
          Tỷ lệ chất lượng, trục phải
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-4 border-t-2 border-dashed border-red-600" />
          Mục tiêu 90%
        </span>
        <span className="inline-flex items-center gap-2">
          <Activity size={12} />
          Ngày thiếu dữ liệu giữ nguyên khoảng trống
        </span>
      </div>
    </CardContainer>
  );
}
