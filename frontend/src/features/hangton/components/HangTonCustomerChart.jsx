import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { buildCustomerChart } from '../hangtonCustomers.js';
import { formatNumber } from '../hangtonLevels.js';

// Stock by Loại Tồn, one stacked series per selected customer group (shown when two or more groups are selected).
export default function HangTonCustomerChart({ byLevelCustomer = [], selected = [] }) {
  const { data, series } = buildCustomerChart(byLevelCustomer, selected);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="level" tick={{ fontSize: 13, fill: '#475569' }} tickLine={false} interval={0} />
        <YAxis tick={{ fontSize: 13, fill: '#64748B' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const total = payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
            return (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg">
                <p className="mb-1.5 border-b border-slate-100 pb-1.5 font-bold text-slate-900">Loại tồn: {label}</p>
                {payload.map((p) => (
                  <p key={p.dataKey} className="flex items-center gap-2 text-slate-700">
                    <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: p.color }} />
                    {p.dataKey}: <strong>{formatNumber(p.value)}</strong>
                  </p>
                ))}
                <p className="mt-1 border-t border-slate-100 pt-1 text-slate-600">Cộng: <strong>{formatNumber(total)}</strong> bưu gửi</p>
              </div>
            );
          }}
        />
        <Legend wrapperStyle={{ fontSize: 14 }} />
        <ReferenceLine
          y={0}
          stroke="#DC2626"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          label={{ value: 'Mục tiêu ≥5 ngày: 0', position: 'top', fill: '#DC2626', fontSize: 13 }}
        />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} stackId="customers" fill={s.color} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
