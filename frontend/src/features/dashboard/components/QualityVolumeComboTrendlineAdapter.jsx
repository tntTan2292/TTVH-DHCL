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
  normalizeComboTrendlineItems,
  QUALITY_TARGET_RATE,
} from './comboTrendlineData';

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
          <span className="text-[var(--color-text-muted)]">Volume</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatNumber(point.total_volume)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Passed</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatNumber(point.passed)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Failed</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatNumber(point.failed)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Quality rate</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatRate(point.quality_rate)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Target</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatRate(point.target_rate)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Variance</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatVariance(point.target_variance)}</span>
        </div>
      </div>
    </div>
  );
}

function QualityVolumeComboTrendline({ data }) {
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
            domain={[0, 'dataMax']}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
            tickFormatter={(value) => Number(value).toLocaleString('vi-VN')}
            label={{ value: 'Volume', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 12 }}
            width={76}
          />
          <YAxis
            yAxisId="quality"
            orientation="right"
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
            tickFormatter={(value) => `${value}%`}
            label={{ value: 'Quality rate', angle: 90, position: 'insideRight', fill: 'var(--color-text-muted)', fontSize: 12 }}
            width={72}
          />
          <Tooltip content={<ComboTrendTooltip />} />
          <ReferenceLine
            yAxisId="quality"
            y={QUALITY_TARGET_RATE}
            stroke="#dc2626"
            strokeDasharray="6 6"
            label={{ value: '90% target', position: 'insideTopRight', fill: '#dc2626', fontSize: 12, fontWeight: 700 }}
          />
          <Bar
            yAxisId="volume"
            dataKey="total_volume"
            name="Volume"
            fill="#7aa7d9"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            yAxisId="quality"
            type="monotone"
            dataKey="quality_rate"
            name="Quality rate"
            stroke="#174ea6"
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
    return <LoadingState label="Loading Quality and Volume Combo Trendline..." className="min-h-[460px]" />;
  }

  if (state.error) {
    return <ErrorState title="Unable to load combo trendline" description={state.error} className="min-h-[460px]" />;
  }

  if (!state.data.length) {
    return (
      <EmptyState
        title="No trendline data"
        description="No daily shipment data is available for the selected dashboard context."
        className="min-h-[460px]"
      />
    );
  }

  return (
    <CardContainer
      title="Quality and Volume Combo Trendline"
      subtitle="30-day daily shipment volume and quality rate in one operational view."
      action={<StatusBadge label="30-day combo" tone="info" />}
      className="overflow-hidden"
    >
      <QualityVolumeComboTrendline data={state.data} />
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-[#7aa7d9]" />
          Volume, left axis
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#174ea6]" />
          Quality rate, right axis
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-4 border-t-2 border-dashed border-red-600" />
          90% target
        </span>
        <span className="inline-flex items-center gap-2">
          <Activity size={12} />
          Missing dates remain gaps
        </span>
      </div>
    </CardContainer>
  );
}
