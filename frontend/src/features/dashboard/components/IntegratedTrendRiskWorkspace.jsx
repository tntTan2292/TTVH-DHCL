import { useEffect, useMemo, useState } from 'react';
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
import { AlertTriangle, CircleHelp, Gauge, Info, Layers, TrendingUp } from 'lucide-react';
import api from '../../../api/client';
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
  summarizeRiskEvidence,
  TREND_MODES,
} from './integratedTrendRiskData';

const COLORS = {
  volume: DASHBOARD_SEMANTIC_COLORS.volume,
  pass: DASHBOARD_SEMANTIC_COLORS.passed,
  failed: DASHBOARD_SEMANTIC_COLORS.failed,
  target: DASHBOARD_SEMANTIC_COLORS.target,
  comparison: DASHBOARD_SEMANTIC_COLORS.comparison,
  warning: DASHBOARD_SEMANTIC_COLORS.warning,
  unknown: DASHBOARD_SEMANTIC_COLORS.unknown,
};

function IntegratedTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload.find((item) => item?.payload)?.payload || {};

  return (
    <div className="rounded-xl border border-[var(--color-surface-200)] bg-white px-4 py-3 shadow-xl">
      <div className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
        {point.current_date ? `${point.dayLabel} - ${point.current_date}` : label}
      </div>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">{DASHBOARD_LABELS.volume}</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatNumber(point.total_volume)}</span>
        </div>
        {point.previous_total_volume !== undefined ? (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--color-text-muted)]">Sản lượng kỳ so sánh</span>
            <span className="font-semibold text-[var(--color-text-main)]">{formatNumber(point.previous_total_volume)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">{DASHBOARD_LABELS.passRate}</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatRate(point.quality_rate)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">{DASHBOARD_LABELS.failedRate}</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatRate(point.failed_rate)}</span>
        </div>
        {point.previous_quality_rate !== undefined ? (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--color-text-muted)]">Tỷ lệ đạt kỳ so sánh</span>
            <span className="font-semibold text-[var(--color-text-main)]">{formatRate(point.previous_quality_rate)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-muted)]">{DASHBOARD_LABELS.target}</span>
          <span className="font-semibold text-[var(--color-text-main)]">{formatRate(point.target_rate)}</span>
        </div>
      </div>
    </div>
  );
}

function MarkerShape({ cx, cy, payload }) {
  if (!payload?.below_target && !payload?.abnormal_day) return null;
  const fill = payload.abnormal_day ? COLORS.failed : COLORS.warning;
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
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 18, right: 18, bottom: 8, left: 0 }} barCategoryGap="34%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-200)" />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
            tickFormatter={(value) => typeof value === 'string' && value.length === 10 ? value.slice(5) : value}
            minTickGap={16}
          />
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
          <Tooltip content={<IntegratedTooltip />} />
          <ReferenceLine yAxisId="rate" y={QUALITY_TARGET_RATE} stroke={COLORS.target} strokeDasharray="7 5" />
          <Bar yAxisId="volume" dataKey="total_volume" name={DASHBOARD_LABELS.volume} fill={COLORS.volume} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          {mode === '7-days' ? (
            <Bar yAxisId="volume" dataKey="previous_total_volume" name="Sản lượng kỳ so sánh" fill={COLORS.comparison} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          ) : null}
          <Line yAxisId="rate" type="linear" dataKey="quality_rate" name={DASHBOARD_LABELS.passRate} stroke={COLORS.pass} strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} connectNulls={false} isAnimationActive={false} />
          <Line yAxisId="rate" type="linear" dataKey="failed_rate" name={DASHBOARD_LABELS.failedRate} stroke={COLORS.failed} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} connectNulls={false} isAnimationActive={false} />
          {mode === '7-days' ? (
            <Line yAxisId="rate" type="linear" dataKey="previous_quality_rate" name="Tỷ lệ đạt kỳ so sánh" stroke={COLORS.comparison} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 2, strokeWidth: 1, fill: '#fff' }} connectNulls={false} isAnimationActive={false} />
          ) : null}
          <Scatter yAxisId="rate" dataKey="quality_rate" shape={<MarkerShape />} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function LegendItem({ color, label, shape = 'dot', dashed = false }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={shape === 'bar' ? 'h-2 w-3 rounded-sm' : dashed ? 'h-2 w-5 border-t-2 border-dashed' : 'h-2 w-2 rounded-full'}
        style={shape === 'bar' ? { backgroundColor: color } : dashed ? { borderColor: color } : { backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function RiskPanel({ risks, loading, error }) {
  if (loading) {
    return <LoadingState label="Đang tải ngoại lệ và rủi ro..." className="min-h-[360px]" />;
  }

  if (error) {
    return <ErrorState title="Không thể tải ngoại lệ" description={error} className="min-h-[360px]" />;
  }

  return (
    <aside className="flex h-full flex-col rounded-xl border border-[var(--color-surface-200)] bg-[var(--color-surface-50)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-[var(--color-text-main)]">Ngoại lệ & Rủi ro chính</h4>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Dựa trên dữ liệu hệ thống đã ghi nhận.</p>
        </div>
        <Gauge size={18} className="text-[var(--color-primary-600)]" />
      </div>
      <div className="mt-4 space-y-3">
        {risks.map((risk) => (
          <div key={risk.id} className="rounded-lg border border-white bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                {risk.tone === 'danger' ? <AlertTriangle size={16} className="mt-0.5 text-red-600" /> : risk.tone === 'warning' ? <CircleHelp size={16} className="mt-0.5 text-amber-600" /> : <Info size={16} className="mt-0.5 text-blue-600" />}
                <div>
                  <div className="text-sm font-semibold text-[var(--color-text-main)]">{risk.title}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">{risk.unit}</div>
                </div>
              </div>
              <StatusBadge label={risk.severity} tone={risk.tone} />
            </div>
            <p className="mt-3 text-sm text-[var(--color-text-main)]">{risk.evidence}</p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">{risk.note}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function IntegratedTrendRiskWorkspace({
  data = [],
  loading,
  error,
  toDate,
  maBcvh,
  kpiData,
}) {
  const [mode, setMode] = useState('30-days');
  const [pulseState, setPulseState] = useState({ loading: true, error: null, pulse: null });

  useEffect(() => {
    let cancelled = false;

    const loadPulse = async () => {
      try {
        setPulseState({ loading: true, error: null, pulse: null });
        const response = await api.get('/f13/dashboard/quality-timeline', {
          params: {
            toDate,
            ma_bcvh: maBcvh,
          },
        });

        if (!cancelled) {
          setPulseState({
            loading: false,
            error: null,
            pulse: response?.data?.data?.pulse || null,
          });
        }
      } catch (fetchError) {
        if (!cancelled) {
          setPulseState({
            loading: false,
            error: fetchError?.message || 'Không thể tải nhịp chất lượng.',
            pulse: null,
          });
        }
      }
    };

    if (toDate) loadPulse();

    return () => {
      cancelled = true;
    };
  }, [maBcvh, toDate]);

  const rows = useMemo(() => buildIntegratedTrendRows({ mode, items: data, toDate }), [data, mode, toDate]);
  const risks = useMemo(() => summarizeRiskEvidence(data, kpiData, pulseState.pulse), [data, kpiData, pulseState.pulse]);

  const action = (
    <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Chọn chế độ xu hướng">
      {TREND_MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={mode === item.id}
          onClick={() => setMode(item.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            mode === item.id
              ? 'bg-[var(--color-primary-600)] text-white'
              : 'bg-[var(--color-surface-100)] text-[var(--color-text-main)] hover:bg-[var(--color-surface-200)]'
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
      subtitle="Một vùng xu hướng chính cho sản lượng, tỷ lệ đạt, tỷ lệ không đạt, mục tiêu và ngoại lệ hiện tại."
      action={action}
      className="overflow-hidden"
    >
      {loading ? (
        <LoadingState label="Đang tải dữ liệu xu hướng điều hành..." className="min-h-[360px]" />
      ) : error ? (
        <ErrorState title="Không thể tải xu hướng điều hành" description={error} className="min-h-[360px]" />
      ) : !rows.length ? (
        <EmptyState title="Không có dữ liệu xu hướng" description="Không có dữ liệu bưu gửi hằng ngày cho phạm vi đang chọn." className="min-h-[360px]" />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <StatusBadge label={TREND_MODES.find((item) => item.id === mode)?.label} tone="info" />
              <span className="inline-flex items-center gap-1"><Layers size={13} /> Chỉ hiển thị một câu chuyện xu hướng chính</span>
              <span className="inline-flex items-center gap-1"><TrendingUp size={13} /> Mốc dưới mục tiêu và ngày bất thường hiển thị bằng marker</span>
            </div>
            <TrendChart rows={rows} mode={mode} />
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
              <LegendItem color={COLORS.volume} label="Sản lượng, trục trái" shape="bar" />
              {mode === '7-days' ? <LegendItem color={COLORS.comparison} label="Sản lượng kỳ so sánh" shape="bar" /> : null}
              <LegendItem color={COLORS.pass} label="Tỷ lệ đạt, trục phải" />
              <LegendItem color={COLORS.failed} label="Tỷ lệ không đạt, trục phải" />
              {mode === '7-days' ? <LegendItem color={COLORS.comparison} label="Tỷ lệ đạt kỳ so sánh" dashed /> : null}
              <LegendItem color={COLORS.target} label={`Mục tiêu ${QUALITY_TARGET_RATE}%`} dashed />
              <LegendItem color={COLORS.warning} label="Marker dưới mục tiêu" />
              <LegendItem color={COLORS.failed} label="Marker ngày bất thường" />
            </div>
          </div>
          <RiskPanel risks={risks} loading={pulseState.loading} error={pulseState.error} />
        </div>
      )}
    </CardContainer>
  );
}
