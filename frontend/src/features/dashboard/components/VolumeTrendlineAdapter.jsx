import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import api from '../../../api/client';
import { CardContainer, EmptyState, ErrorState, LoadingState, StatusBadge } from '../../../components/shared/SharedComponents';
import { buildTrendlineRequestParams } from './qualityTrendlineWindow';

const normalizeItems = (items = []) =>
  items
    .map((item) => ({
      date: item.date,
      total_volume: Number(item.total_volume || 0),
      data_available: Boolean(item.data_available),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

function VolumeTrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload || {};

  return (
    <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white px-4 py-3 shadow-xl">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">Total shipment volume</span>
          <span className="font-semibold text-[var(--color-text-main)]">
            {Number(point.total_volume || 0).toLocaleString('vi-VN')}
          </span>
        </div>
      </div>
    </div>
  );
}

function VolumeTrendlineChart({ data }) {
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 24, bottom: 8, left: 0 }}>
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
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
            tickFormatter={(value) => Number(value).toLocaleString('vi-VN')}
            width={72}
          />
          <Tooltip content={<VolumeTrendTooltip />} />
          <Line
            type="monotone"
            dataKey="total_volume"
            name="Total shipment volume"
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
  );
}

export default function VolumeTrendlineAdapter({ reportingToDate, latestDate, maBcvh }) {
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
          throw new Error('Không thể xác định khoảng thời gian rolling 30 ngày cho volume trendline.');
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
            error: error?.message || 'Không thể tải volume trendline.',
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
    return <LoadingState label="Đang tải Volume Trendline..." className="min-h-[420px]" />;
  }

  if (state.error) {
    return <ErrorState title="Không thể tải volume trendline" description={state.error} className="min-h-[420px]" />;
  }

  if (!state.data.length) {
    return (
      <EmptyState
        title="Không có dữ liệu volume trendline"
        description="Không có dữ liệu bưu gửi phù hợp trong khoảng ngày đã chọn."
        className="min-h-[420px]"
      />
    );
  }

  return (
    <CardContainer
      title="Volume Trendline"
      subtitle="Daily total shipment volume theo ngày vận hành."
      action={<StatusBadge label="Daily" tone="info" />}
      className="overflow-hidden"
    >
      <VolumeTrendlineChart data={state.data} />
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#0f62fe]" />
          Total shipment volume
        </span>
        <span className="inline-flex items-center gap-2">
          <BarChart3 size={12} />
          Missing dates remain gaps, not 0
        </span>
      </div>
    </CardContainer>
  );
}
