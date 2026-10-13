import React, { useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Award } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { INDICATORS, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { IndicatorProvider } from '../../indicator/IndicatorContext.js';

function TrendTooltip({ active, payload, label, targetRate, indicatorLabel }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0]?.payload || {};
  const hasRate = point.rate != null;
  const isTargetMet = hasRate && point.rate >= targetRate;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl max-w-[220px]">
      <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between">
        <span>{indicatorLabel} · Ngày {point.date || label}</span>
      </div>

      {!hasRate ? (
        <div className="pt-2 text-slate-400 italic">Chưa có dữ liệu ngày này</div>
      ) : (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 font-medium">Tỷ lệ đạt:</span>
            <span className="font-black text-slate-900 tabular-nums text-sm">
              {Number(point.rate).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 font-medium">Mục tiêu:</span>
            <span className="font-bold text-slate-700 tabular-nums">
              {targetRate}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-1.5">
            <span className="text-slate-500 font-medium">Chênh lệch:</span>
            <span className={`font-bold tabular-nums ${isTargetMet ? 'text-emerald-700' : 'text-rose-600'}`}>
              {(point.rate - targetRate).toFixed(1)}%
            </span>
          </div>
          {point.rank != null && (
            <div className="flex items-center justify-between gap-3 pt-0.5">
              <span className="text-slate-500 font-medium">Vị thứ TQ:</span>
              <span className="font-bold text-rose-600 tabular-nums">
                {point.rank}/34
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SingleIndicatorTrendChart({ indicatorData, rangeDays = 30 }) {
  const chartRef = useRef(null);
  const indConfig = INDICATORS[indicatorData?.id] || INDICATORS.f13;
  const theme = indicatorTheme(indConfig);
  const targetRate = indicatorData?.target_rate ?? indConfig.targetRate;

  const rawTrend = indicatorData?.trend || [];
  // Slice to 7 or 30 days
  const displayItems = rawTrend.slice(-rangeDays).map((item) => ({
    ...item,
    formattedDate: item.date ? item.date.slice(5) : '',
  }));

  const latestRate = indicatorData?.rate;

  return (
    <IndicatorProvider indicator={indConfig}>
      <div
        ref={chartRef}
        className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className={`h-3 w-1.5 rounded-full ${theme.accentBar}`} />
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-black text-slate-900 tracking-tight">
                  {indicatorData?.label || indConfig.moduleLabel}
                </h4>
                <span className={`rounded-md border px-1.5 py-0.2 text-[10px] font-bold ${theme.chip}`}>
                  MT {targetRate}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-base font-black text-slate-900 tabular-nums">
                {latestRate != null ? `${Number(latestRate).toFixed(1)}%` : '—'}
              </span>
            </div>
            <BlockCaptureButton
              targetRef={chartRef}
              blockTitle={`Xu hướng ${indicatorData?.label || indConfig.moduleLabel} (${rangeDays} ngày)`}
              dateOrPeriod={`${rangeDays} ngày gần nhất`}
            />
          </div>
        </div>

        {/* Chart Area */}
        <div className="h-44 w-full mt-3">
          {!displayItems.length ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-400 font-medium">
              Chưa có dữ liệu xu hướng
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={displayItems}
                margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[40, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  tickFormatter={(val) => `${val}%`}
                  ticks={[50, 70, 90, 95, 100]}
                />
                <Tooltip
                  content={
                    <TrendTooltip
                      targetRate={targetRate}
                      indicatorLabel={indicatorData?.label || indConfig.moduleLabel}
                    />
                  }
                />
                {/* Target line */}
                <ReferenceLine
                  y={targetRate}
                  stroke="#EF4444"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
                {/* Quality Rate Line */}
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke={theme.primary}
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: theme.primary }}
                  activeDot={{ r: 5, fill: theme.primary, stroke: '#FFFFFF', strokeWidth: 2 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom Legend */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-full" style={{ backgroundColor: theme.primary }} />
              <span className="font-semibold text-slate-600">Tỷ lệ đạt</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-3 border-t border-dashed border-red-500" />
              <span className="font-semibold text-red-600">Mục tiêu {targetRate}%</span>
            </div>
          </div>

          {indicatorData?.rank != null && (
            <div className="font-bold text-rose-600 flex items-center gap-1">
              <Award size={12} />
              <span>VT {indicatorData.rank}/34</span>
            </div>
          )}
        </div>
      </div>
    </IndicatorProvider>
  );
}

export default function IndicatorTrendsGrid({ indicators = [] }) {
  const gridRef = useRef(null);
  const [rangeDays, setRangeDays] = useState(30); // 7 | 30

  return (
    <section
      ref={gridRef}
      className="rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-150 p-5 space-y-4"
    >
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-1.5 rounded-full bg-blue-600" />
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              DIỄN BIẾN XU HƯỚNG TỪNG CHỈ TIÊU ĐỘC LẬP
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Mỗi chỉ tiêu có trục đo và vạch mục tiêu độc lập — không gộp chung trục để đảm bảo tính chuẩn xác.
          </p>
        </div>

        {/* Controls */}
        <div data-no-capture="true" className="flex items-center gap-2">
          {/* Day range toggle */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setRangeDays(7)}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                rangeDays === 7 ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 ngày
            </button>
            <button
              type="button"
              onClick={() => setRangeDays(30)}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                rangeDays === 30 ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 ngày
            </button>
          </div>

          <BlockCaptureButton
            targetRef={gridRef}
            blockTitle="Diễn biến xu hướng 04 chỉ tiêu độc lập"
            dateOrPeriod={`${rangeDays} ngày gần nhất`}
          />
        </div>
      </div>

      {/* 2x2 Grid of Individual Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {indicators.map((ind) => (
          <SingleIndicatorTrendChart
            key={ind.id}
            indicatorData={ind}
            rangeDays={rangeDays}
          />
        ))}
      </div>
    </section>
  );
}
