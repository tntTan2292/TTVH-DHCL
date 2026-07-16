import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import api from '../../../api/client';
import { CardContainer, EmptyState, ErrorState, LoadingState, StatusBadge } from '../../../components/shared/SharedComponents';

const TARGET_RATE = 90;

const normalizeItems = (items = []) =>
  items
    .map((item) => ({
      date: item.date,
      total_volume: Number(item.total_volume || 0),
      passed: Number(item.passed || 0),
      failed: Number(item.failed || 0),
      quality_rate: item.quality_rate === null || item.quality_rate === undefined ? null : Number(item.quality_rate),
      data_available: Boolean(item.data_available),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

function QualityTrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload || {};
  const qualityRate = point.quality_rate === null || point.quality_rate === undefined ? 'N/A' : `${point.quality_rate.toFixed(4)}%`;

  return (
    <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white px-4 py-3 shadow-xl">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Quality rate</span>
          <span className="font-semibold text-[var(--color-text-main)]">{qualityRate}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Target</span>
          <span className="font-semibold text-[var(--color-text-main)]">{TARGET_RATE.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Total volume</span>
          <span className="font-semibold text-[var(--color-text-main)]">{point.total_volume?.toLocaleString('vi-VN') || '0'}</span>
        </div>
      </div>
    </div>
  );
}

export default function QualityDeliveryTrendlineAdapter({ fromDate, toDate, maBcvh }) {
  const [state, setState] = useState({ loading: true, error: null, data: [] });

  useEffect(() => {
    let cancelled = false;

    const fetchTrend = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const params = {
          from_date: fromDate,
          to_date: toDate,
        };

        if (maBcvh && maBcvh !== 'all') {
          params.bcvh_id = maBcvh;
        }

        const response = await api.get('/f13/dashboard/daily-trend', { params });

        if (!cancelled && response?.data?.success) {
          setState({
            loading: false,
            error: null,
            data: normalizeItems(response.data?.data?.items || []),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error?.message || 'Không thể tải quality trendline.',
            data: [],
          });
        }
      }
    };

    if (fromDate && toDate) {
      fetchTrend();
    }

    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate, maBcvh]);

  if (state.loading) {
    return <LoadingState label="Đang tải Quality Delivery Rate Trendline..." className="min-h-[420px]" />;
  }

  if (state.error) {
    return <ErrorState title="Không thể tải trendline" description={state.error} className="min-h-[420px]" />;
  }

  if (!state.data.length) {
    return (
      <EmptyState
        title="Không có dữ liệu trendline"
        description="Không có dữ liệu vận hành phù hợp trong khoảng ngày đã chọn."
        className="min-h-[420px]"
      />
    );
  }

  return (
    <CardContainer
      title="Quality Delivery Rate Trendline"
      subtitle="Daily quality rate theo ngày vận hành, hiển thị target cố định 90%."
      action={<StatusBadge label="Daily" tone="info" />}
      className="overflow-hidden"
    >
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={state.data} margin={{ top: 20, right: 24, bottom: 8, left: 0 }}>
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
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              tickFormatter={(value) => `${value}%`}
              width={56}
            />
            <Tooltip content={<QualityTrendTooltip />} />
            <ReferenceLine
              y={TARGET_RATE}
              stroke="#ef4444"
              strokeDasharray="6 6"
              label={{ value: '90% Target', position: 'insideTopRight', fill: '#ef4444', fontSize: 12, fontWeight: 700 }}
            />
            <Line
              type="monotone"
              dataKey="quality_rate"
              name="Quality rate"
              stroke="#0f62fe"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#0f62fe]" />
          Quality rate
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          90% target
        </span>
        <span className="inline-flex items-center gap-2">
          <TrendingUp size={12} />
          Missing dates remain gaps, not 0%
        </span>
      </div>
    </CardContainer>
  );
}
