import React, { useRef } from 'react';
import {
  Package,
  AlertOctagon,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  Target,
  Clock,
  Activity,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import HangTonCustomerChart from './HangTonCustomerChart.jsx';
import { chartMode } from '../hangtonCustomers.js';
import LevelPicker from './LevelPicker.jsx';
import { useStoredHiddenLevels } from '../hangtonLevelState.js';
import {
  presetHiddenLevels,
  visibleLevels,
  getLevelConfig,
  formatNumber,
  formatCurrency,
  formatDelta,
  formatSlot,
  formatSnapshotLabel,
  compareValue,
  NO_BASE_NOTE,
} from '../hangtonLevels.js';

export default function HangTonOverviewTab({
  overview,
  compare,
  currentSnapshot,
  baseSnapshot,
  selectedCustomers = [],
}) {
  const groupMode = chartMode(selectedCustomers) === 'groups';
  // The chart starts from 3 days and more (the low levels are the bulk and hide the heavy ones); the leader can show any level.
  const [chartHidden, setChartHidden] = useStoredHiddenLevels('qis.hangton.chartLevels', presetHiddenLevels('ge3'));
  const chartLevels = visibleLevels(chartHidden);
  const chartBlockRef = useRef(null);
  const statusBlockRef = useRef(null);
  const levelsBlockRef = useRef(null);

  const snapshotLabel = formatSnapshotLabel(currentSnapshot);

  const total = overview?.total ?? 0;
  const ge5 = overview?.ge5 ?? 0;
  const byLevel = overview?.by_level || [];
  const byStatus = overview?.by_status || [];

  // Base comparison deltas if available
  const baseTotal = compare?.from?.kept_row_count;
  const deltaTotal = Number.isFinite(baseTotal) ? total - baseTotal : null;

  // Chart data: 9 levels in strict ascending order
  const chartData = chartLevels.map((lvl) => {
    const config = getLevelConfig(lvl);
    const item = byLevel.find((b) => b.ton_level === lvl);
    const count = item ? Number(item.n) || 0 : 0;
    const cod = item ? Number(item.cod) || 0 : 0;
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
    return {
      level: lvl,
      count,
      cod,
      pct,
      color: config.chartColor,
      isAlert: config.isAlert,
    };
  });

  return (
    <div className="space-y-6">
      {/* Base comparison info banner */}
      {baseSnapshot ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-2.5 text-sm text-rose-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-rose-600 shrink-0" />
            <span>
              Mốc xem xét: <strong>{currentSnapshot?.business_date} {formatSlot(currentSnapshot?.slot)}</strong>
              {' vs '}
              Mốc so sánh: <strong>{baseSnapshot?.business_date} {formatSlot(baseSnapshot?.slot)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 font-semibold">
            <span>Tổng tồn: {formatNumber(total)} ({deltaTotal !== null ? formatDelta(deltaTotal) : '—'})</span>
            <span className="text-rose-400">|</span>
            <span>Tồn ≥5 ngày: <strong className="text-rose-700">{formatNumber(ge5)}</strong> (mục tiêu: 0)</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-sm text-amber-900 shadow-2xs" data-no-capture="true">
          {NO_BASE_NOTE}
        </div>
      )}

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Tổng tồn */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-sm font-bold uppercase tracking-wider">Tổng tồn</span>
            <Package size={18} className="text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{formatNumber(total)}</span>
            <span className="text-sm text-slate-500 font-medium">bưu gửi</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[13px] text-slate-600 border-t border-slate-100 pt-2">
            <span>So với mốc cơ sở:</span>
            <span className="font-bold text-slate-800">
              {deltaTotal !== null ? formatDelta(deltaTotal) : '—'}
            </span>
          </div>
        </div>

        {/* Card 2: Tồn >=5 ngày (Target 0) */}
        <div className="rounded-2xl border border-red-200 bg-red-50/40 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-sm font-bold uppercase tracking-wider">Tồn ≥5 ngày</span>
            <AlertOctagon size={18} className="text-red-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-red-700">{formatNumber(ge5)}</span>
            <span className="text-sm text-red-600 font-bold">
              ({total > 0 ? ((ge5 / total) * 100).toFixed(1) : 0}%)
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[13px] text-red-800 border-t border-red-100 pt-2 font-semibold">
            <span className="inline-flex items-center gap-1">
              <Target size={12} className="text-red-600" />
              Mục tiêu TCT:
            </span>
            <span className="font-bold text-red-900 bg-white/80 px-2 py-0.5 rounded border border-red-200">
              0 bưu gửi
            </span>
          </div>
        </div>

        {/* Card 3: Đã xử lý khỏi tồn */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-sm font-bold uppercase tracking-wider">Đã xử lý khỏi tồn</span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-700">{compareValue(compare, 'resolved')}</span>
            <span className="text-sm text-emerald-600 font-medium">bưu gửi</span>
          </div>
          <p className="mt-2 text-[13px] text-emerald-800 border-t border-emerald-100 pt-2">
            Đã phát / vu hồi / ra khỏi tồn
          </p>
        </div>

        {/* Card 4: Tăng loại tồn */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-sm font-bold uppercase tracking-wider">Tăng loại tồn</span>
            <TrendingUp size={18} className="text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-700">{compareValue(compare, 'aged_up')}</span>
            <span className="text-sm text-amber-600 font-medium">bưu gửi</span>
          </div>
          <p className="mt-2 text-[13px] text-amber-800 border-t border-amber-100 pt-2">
            Chuyển sang mức tồn cao hơn
          </p>
        </div>

        {/* Card 5: Mới vào tồn */}
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-sm font-bold uppercase tracking-wider">Mới vào tồn</span>
            <PlusCircle size={18} className="text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-700">{compareValue(compare, 'new')}</span>
            <span className="text-sm text-indigo-600 font-medium">bưu gửi</span>
          </div>
          <p className="mt-2 text-[13px] text-indigo-800 border-t border-indigo-100 pt-2">
            Phát sinh mới so với mốc trước
          </p>
        </div>
      </div>

      {/* Main Chart: Stock by Loại Tồn */}
      <div
        ref={chartBlockRef}
        className="rounded-2xl border border-slate-200/80 bg-white shadow-xs p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity size={18} className="text-rose-600" />
              Cơ cấu hàng tồn theo Loại Tồn{selectedCustomers.length > 0 ? ` — ${selectedCustomers.join(', ')}` : ''} ({snapshotLabel})
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              9 mức thời gian lưu tồn tăng dần. Màu đỏ đậm dần theo tuổi bưu gửi; từ mức ≥5 ngày là diện cảnh báo nặng.
            </p>
          </div>
          <div className="flex items-center gap-2" data-no-capture="true">
            <div className="hidden md:flex items-center gap-3 text-sm text-slate-600 mr-2">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-red-600" />
                <span>≥5 ngày (báo động)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-slate-300" />
                <span>{'<5 ngày'}</span>
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-red-700">
                <span className="inline-block w-4 border-t-2 border-dashed border-red-600" />
                <span>Mục tiêu ≥5 ngày: 0</span>
              </span>
            </div>
            <BlockCaptureButton
              targetRef={chartBlockRef}
              blockTitle="Cơ cấu hàng tồn theo Loại Tồn"
              dateOrPeriod={snapshotLabel}
            />
          </div>
        </div>

        <div className="mb-3 space-y-2">
          <LevelPicker
            hiddenLevels={chartHidden}
            onChange={setChartHidden}
            label="Mức tồn trên biểu đồ:"
            note="Biểu đồ chỉ vẽ các mức đang bật; các thẻ và bảng bên dưới vẫn đủ 9 mức."
          />
          {chartLevels.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-no-capture="true">
              Chưa bật mức tồn nào: hãy chọn "Tất cả mức" hoặc bật ít nhất một mức.
            </p>
          ) : null}
        </div>

        {/* Chart rendering: red stock-age scale for all groups or one group; one stacked series per group when 2+ are selected */}
        {groupMode ? (
          <div className="h-72 w-full">
            <HangTonCustomerChart byLevelCustomer={overview?.by_level_customer || []} selected={selectedCustomers} levels={chartLevels} />
          </div>
        ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="level"
                tick={{ fontSize: 13, fill: '#475569' }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 13, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatNumber(v)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-sm">
                      <p className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-1.5">
                        Loại tồn: {d.level}
                      </p>
                      <p className="text-slate-600">
                        Số lượng: <strong>{formatNumber(d.count)}</strong> bưu gửi ({d.pct}%)
                      </p>
                      <p className="text-slate-600">
                        Tiền COD: <strong>{formatCurrency(d.cod)}</strong>
                      </p>
                      {d.isAlert ? (
                        <p className="mt-1 font-bold text-red-600">
                          ⚠ Mức cảnh báo tồn lâu (Mục tiêu: 0)
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              />
              <ReferenceLine y={0} stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4 4" />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="count" position="top" formatter={(v) => (Number(v) > 0 ? formatNumber(v) : '')} fill="#334155" fontSize={13} fontWeight={700} />
                {chartData.map((entry) => (
                  <Cell key={entry.level} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>

      {/* Two columns: Level Distribution details & Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table of levels */}
        <div
          ref={levelsBlockRef}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers size={16} className="text-rose-600" />
                Chi tiết 9 mức Loại Tồn
              </h4>
              <BlockCaptureButton
                targetRef={levelsBlockRef}
                blockTitle="Bảng chi tiết 9 mức Loại Tồn"
                dateOrPeriod={snapshotLabel}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold text-left">
                    <th className="py-2 pr-3">Loại tồn</th>
                    <th className="py-2 px-3 text-right">Số lượng</th>
                    <th className="py-2 px-3 text-right">Tỷ lệ</th>
                    <th className="py-2 pl-3 text-right">Tổng COD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chartData.map((row) => {
                    const cfg = getLevelConfig(row.level);
                    return (
                      <tr key={row.level} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 pr-3 flex items-center gap-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[13px] font-semibold border ${cfg.badgeClass}`}>
                            {row.level}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {formatNumber(row.count)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600 font-medium">
                          {row.pct}%
                        </td>
                        <td className="py-2 pl-3 text-right text-slate-700">
                          {formatCurrency(row.cod)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div
          ref={statusBlockRef}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity size={16} className="text-rose-600" />
                Phân bổ theo Trạng thái (5 trạng thái TMS)
              </h4>
              <BlockCaptureButton
                targetRef={statusBlockRef}
                blockTitle="Phân bổ trạng thái hàng tồn"
                dateOrPeriod={snapshotLabel}
              />
            </div>
            <p className="text-sm text-slate-500 mb-3">
              QIS lọc 5 trạng thái hợp lệ theo Quyết định D2.
            </p>
            <div className="space-y-3">
              {byStatus.map((st) => {
                const count = Number(st.n) || 0;
                const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                return (
                  <div key={st.status_name} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-slate-800">{st.status_name}</span>
                      <span className="text-slate-900 font-bold">
                        {formatNumber(count)} <span className="text-slate-500 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-600 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
