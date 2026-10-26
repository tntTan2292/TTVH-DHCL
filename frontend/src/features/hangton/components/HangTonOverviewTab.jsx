import React, { useRef, useState, useMemo } from 'react';
import {
  Package,
  AlertOctagon,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  Target,
  Clock,
  Activity,
  Building2,
  Users,
  Sparkles,
  ChevronRight,
  Flame,
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
import SortableTh from '../../../components/common/SortableTh.jsx';
import { nextSortState, sortRowsBy } from '../../../components/common/tableSort.js';
import HangTonCustomerChart from './HangTonCustomerChart.jsx';
import { chartMode } from '../hangtonCustomers.js';
import LevelPicker from './LevelPicker.jsx';
import { useStoredHiddenLevels } from '../hangtonLevelState.js';
import {
  TON_LEVELS,
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
import {
  computeExecutiveTriage,
  buildTopOfficesOverview,
  buildCustomerBreakdown,
  buildLevelRows,
} from '../hangtonOverviewHelpers.js';

export default function HangTonOverviewTab({
  overview,
  compare,
  currentSnapshot,
  baseSnapshot,
  selectedCustomers = [],
  onDrilldownToOffice = null,
}) {
  const groupMode = chartMode(selectedCustomers) === 'groups';
  // The chart starts from 3 days and more (the low levels are the bulk and hide the heavy ones); the leader can show any level.
  const [chartHidden, setChartHidden] = useStoredHiddenLevels('qis.hangton.chartLevels', presetHiddenLevels('ge3'));
  const chartLevels = visibleLevels(chartHidden);

  const [detailSubTab, setDetailSubTab] = useState('levels'); // 'levels' | 'status'
  // Click-to-order titles of the two tables (null = the natural order: handling order / age order)
  const [customerSort, setCustomerSort] = useState(null);
  const [levelSort, setLevelSort] = useState(null);

  // Block refs for camera capture
  const triageBlockRef = useRef(null);
  const chartBlockRef = useRef(null);
  const officesBlockRef = useRef(null);
  const customersBlockRef = useRef(null);
  const statusLevelsBlockRef = useRef(null);

  const snapshotLabel = formatSnapshotLabel(currentSnapshot);

  const total = overview?.total ?? 0;
  const ge5 = overview?.ge5 ?? 0;
  const byLevel = overview?.by_level || [];
  const byStatus = overview?.by_status || [];

  // Base comparison deltas if available
  const baseTotal = compare?.from?.kept_row_count;
  const deltaTotal = Number.isFinite(baseTotal) ? total - baseTotal : null;

  // Executive Triage Insights
  const triage = useMemo(() => {
    return computeExecutiveTriage({ overview, compare, selectedCustomers });
  }, [overview, compare, selectedCustomers]);

  // Top offices by heavy stock (>= 5 days)
  const topOffices = useMemo(() => {
    return buildTopOfficesOverview(overview?.by_office || [], ge5, 5);
  }, [overview?.by_office, ge5]);

  // All nine levels, whatever the chart shows
  const levelRows = useMemo(() => buildLevelRows(overview?.by_level || [], TON_LEVELS), [overview?.by_level]);
  const sortedLevelRows = levelSort ? sortRowsBy(levelRows, levelSort.field, levelSort.direction) : levelRows;

  // Customer groups breakdown
  const customerBreakdown = useMemo(() => {
    return buildCustomerBreakdown(overview?.by_customer || [], selectedCustomers);
  }, [overview?.by_customer, selectedCustomers]);
  const sortedCustomers = customerSort ? sortRowsBy(customerBreakdown, customerSort.field, customerSort.direction) : customerBreakdown;

  // Chart data: filtered to shown levels in strict ascending order
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
    <div className="space-y-5">
      {/* 1. Base comparison info banner */}
      {baseSnapshot ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/70 px-4 py-2.5 text-base text-rose-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-rose-600 shrink-0" />
            <span>
              Mốc xem xét: <strong>{currentSnapshot?.business_date} {formatSlot(currentSnapshot?.slot)}</strong>
              {' vs '}
              Mốc so sánh: <strong>{baseSnapshot?.business_date} {formatSlot(baseSnapshot?.slot)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 font-semibold text-base">
            <span>Tổng tồn: {formatNumber(total)} ({deltaTotal !== null ? formatDelta(deltaTotal) : '—'})</span>
            <span className="text-rose-300">|</span>
            <span>Tồn ≥5 ngày: <strong className="text-rose-700">{formatNumber(ge5)}</strong> (mục tiêu: 0)</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-base text-amber-900 shadow-2xs" data-no-capture="true">
          {NO_BASE_NOTE}
        </div>
      )}

      {/* 2. 5 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Tổng tồn */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-sm font-bold uppercase tracking-wider">Tổng tồn</span>
            <Package size={17} className="text-blue-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{formatNumber(total)}</span>
            <span className="text-sm text-slate-500 font-medium">bưu gửi</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-slate-600 border-t border-slate-100 pt-2">
            <span>So mốc cơ sở:</span>
            <span className="font-bold text-slate-800">
              {deltaTotal !== null ? formatDelta(deltaTotal) : '—'}
            </span>
          </div>
        </div>

        {/* Card 2: Tồn >=5 ngày (Target 0) */}
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-sm font-bold uppercase tracking-wider flex items-center gap-1">
              <Flame size={14} className="text-red-600" />
              Tồn ≥5 ngày
            </span>
            <AlertOctagon size={17} className="text-red-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-red-700">{formatNumber(ge5)}</span>
            <span className="text-sm text-red-600 font-bold">
              ({total > 0 ? ((ge5 / total) * 100).toFixed(1) : 0}%)
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-red-800 border-t border-red-100 pt-2 font-semibold">
            <span className="inline-flex items-center gap-1">
              <Target size={12} className="text-red-600" />
              Mục tiêu TCT:
            </span>
            <span className="font-bold text-red-900 bg-white/90 px-1.5 py-0.5 rounded border border-red-200">
              0 bưu gửi
            </span>
          </div>
        </div>

        {/* Card 3: Đã xử lý khỏi tồn */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-sm font-bold uppercase tracking-wider">Đã xử lý khỏi tồn</span>
            <CheckCircle2 size={17} className="text-emerald-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">{compareValue(compare, 'resolved')}</span>
            <span className="text-sm text-emerald-600 font-medium">bưu gửi</span>
          </div>
          <p className="mt-2 text-sm text-emerald-800 border-t border-emerald-100 pt-2">
            Đã phát / vu hồi khỏi tồn
          </p>
        </div>

        {/* Card 4: Tăng loại tồn */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-sm font-bold uppercase tracking-wider">Tăng loại tồn</span>
            <TrendingUp size={17} className="text-amber-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-700">{compareValue(compare, 'aged_up')}</span>
            <span className="text-sm text-amber-600 font-medium">bưu gửi</span>
          </div>
          <p className="mt-2 text-sm text-amber-800 border-t border-amber-100 pt-2">
            Chuyển sang mức tồn cao hơn
          </p>
        </div>

        {/* Card 5: Mới vào tồn */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-sm font-bold uppercase tracking-wider">Mới vào tồn</span>
            <PlusCircle size={17} className="text-indigo-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-indigo-700">{compareValue(compare, 'new')}</span>
            <span className="text-sm text-indigo-600 font-medium">bưu gửi</span>
          </div>
          <p className="mt-2 text-sm text-indigo-800 border-t border-indigo-100 pt-2">
            Phát sinh mới so với mốc trước
          </p>
        </div>
      </div>

      {/* 3. Executive Triage & Priority Actions (Xử lý gì trước & Điểm nóng điều hành) */}
      <div
        ref={triageBlockRef}
        className="rounded-xl border border-rose-200/80 bg-linear-to-r from-rose-50/80 via-white to-amber-50/60 p-4 shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100/80 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-rose-600" />
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
              Tiêu điểm điều hành & Khuyến nghị xử lý ưu tiên
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              COD rủi ro tồn ≥5 ngày: <strong className="text-rose-700">{formatCurrency(triage.codGe5)}</strong>
            </span>
            <BlockCaptureButton
              targetRef={triageBlockRef}
              blockTitle="Tiêu điểm điều hành hàng tồn"
              dateOrPeriod={snapshotLabel}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {triage.actionPoints.length > 0 ? (
            triage.actionPoints.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-white/80 bg-white/90 p-3 shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-sm font-bold ${
                      item.level === 'critical'
                        ? 'bg-red-600 text-white'
                        : item.level === 'warning'
                        ? 'bg-amber-600 text-white'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                  {item.text}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-3 py-2 text-center text-sm text-emerald-700 font-semibold bg-emerald-50 rounded-lg">
              ✓ Không có cảnh báo tồn lâu bất thường. Toàn tỉnh đang kiểm soát tốt chỉ số rà soát hàng tồn.
            </div>
          )}
        </div>
      </div>

      {/* 4. Grid Row 1: Charts & Hot-spot Offices (Cơ cấu Loại tồn & Điểm nóng Bưu cục) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (col-span-7): Stock Age Chart */}
        <div
          ref={chartBlockRef}
          className="lg:col-span-7 rounded-xl border border-slate-200/90 bg-white shadow-2xs p-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity size={17} className="text-rose-600" />
                  Cơ cấu hàng tồn theo Loại Tồn{selectedCustomers.length > 0 ? ` — ${selectedCustomers.join(', ')}` : ''}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Màu đỏ đậm dần theo tuổi bưu gửi; từ mức ≥5 ngày là diện cảnh báo nặng.
                </p>
              </div>
              <div className="flex items-center gap-2" data-no-capture="true">
                <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 mr-1">
                  <span className="flex items-center gap-1 font-semibold text-red-700">
                    <span className="inline-block w-3.5 border-t-2 border-dashed border-red-600" />
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

            <div className="mb-3 space-y-1.5" data-no-capture="true">
              <LevelPicker
                hiddenLevels={chartHidden}
                onChange={setChartHidden}
                label="Mức tồn trên biểu đồ:"
                note="Biểu đồ vẽ các mức đang chọn (mặc định từ ≥3 ngày); bảng 'Chi tiết 9 mức' bên dưới luôn đủ 9 mức."
              />
              {chartLevels.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
                  Chưa bật mức tồn nào: hãy chọn "Tất cả mức" hoặc bật ít nhất một mức.
                </p>
              ) : null}
            </div>

            {/* Chart rendering */}
            {groupMode ? (
              <div className="h-64 sm:h-72 w-full">
                <HangTonCustomerChart
                  byLevelCustomer={overview?.by_level_customer || []}
                  selected={selectedCustomers}
                  levels={chartLevels}
                />
              </div>
            ) : (
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 18, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
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
                            <p className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">
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
                    <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                      <LabelList
                        dataKey="count"
                        position="top"
                        formatter={(v) => (Number(v) > 0 ? formatNumber(v) : '')}
                        fill="#334155"
                        fontSize={13}
                        fontWeight={700}
                      />
                      {chartData.map((entry) => (
                        <Cell key={entry.level} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (col-span-5): Hot-spot Offices (Top Bưu cục tồn lâu >= 5 ngày) */}
        <div
          ref={officesBlockRef}
          className="lg:col-span-5 rounded-xl border border-slate-200/90 bg-white shadow-2xs p-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building2 size={17} className="text-rose-600" />
                  Điểm nóng Bưu cục (Tồn ≥5 ngày)
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Top bưu cục có nhiều bưu gửi tồn ≥5 ngày nhất.
                </p>
              </div>
              <BlockCaptureButton
                targetRef={officesBlockRef}
                blockTitle="Điểm nóng bưu cục tồn ≥5 ngày"
                dateOrPeriod={snapshotLabel}
              />
            </div>

            <div className="space-y-2.5">
              {topOffices.length > 0 ? (
                topOffices.map((office, idx) => {
                  return (
                    <div
                      key={office.office}
                      className="group p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-rose-50/40 hover:border-rose-200 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-sm font-bold ${
                            idx === 0 ? 'bg-red-600 text-white' : idx === 1 ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 text-base">
                            {office.office}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-red-700 text-base">
                            {formatNumber(office.n_ge5)}
                          </span>
                          <span className="text-sm text-slate-500 ml-1">tồn ≥5 ngày / {formatNumber(office.n)} tồn của bưu cục ({office.pctOfOffice}%)</span>
                        </div>
                      </div>

                      {/* Bar = share of the office's own stock that is 5 days and more */}
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-600 transition-all duration-300"
                          style={{ width: `${Math.min(100, Number(office.pctOfOffice))}%` }}
                        />
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-sm text-slate-500">
                        <span>
                          Chiếm <strong className="text-slate-700">{office.pctOfTotal}%</strong> tồn ≥5 ngày
                          {office.codGe5 !== null ? <> · COD ≥5 ngày: <strong className="text-slate-700">{formatCurrency(office.codGe5)}</strong></> : null}
                        </span>
                        {onDrilldownToOffice ? (
                          <button
                            type="button"
                            onClick={() => onDrilldownToOffice(office.office, 5)}
                            className="inline-flex items-center gap-0.5 text-sm font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                            data-no-capture="true"
                          >
                            <span>Xem bưu gửi</span>
                            <ChevronRight size={13} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500 py-4 text-center">
                  Không có bưu cục nào có tồn bưu gửi.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Grid Row 2: Customer Breakdown & Status / 9 Levels Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (col-span-6): Customer Group Breakdown */}
        <div
          ref={customersBlockRef}
          className="lg:col-span-6 rounded-xl border border-slate-200/90 bg-white shadow-2xs p-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users size={17} className="text-rose-600" />
                  Phân bổ theo Nhóm Khách Hàng
                </h4>
                <p className="text-sm text-slate-500 mt-0.5">
                  Thứ tự ưu tiên xử lý: KH Trọng điểm, KHL2, Shopee, Tiktok, Mới, Thường.
                </p>
              </div>
              <BlockCaptureButton
                targetRef={customersBlockRef}
                blockTitle="Phân bổ hàng tồn theo nhóm khách hàng"
                dateOrPeriod={snapshotLabel}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold text-left">
                    <SortableTh field="customer_class" sort={customerSort} onSort={(f) => setCustomerSort((cur) => nextSortState(cur, f, { textFields: ['customer_class'] }))} className="py-2 pr-2 text-left" activeClassName="bg-rose-100 text-rose-950 font-bold">Nhóm khách hàng</SortableTh>
                    <SortableTh field="n" sort={customerSort} onSort={(f) => setCustomerSort((cur) => nextSortState(cur, f))} className="py-2 px-2 text-right" activeClassName="bg-rose-100 text-rose-950 font-bold">Tổng tồn</SortableTh>
                    <SortableTh field="n_ge5" sort={customerSort} onSort={(f) => setCustomerSort((cur) => nextSortState(cur, f))} className="py-2 px-2 text-right" activeClassName="bg-rose-100 text-rose-950 font-bold">Tồn ≥5 ngày</SortableTh>
                    <SortableTh field="cod" sort={customerSort} onSort={(f) => setCustomerSort((cur) => nextSortState(cur, f))} className="py-2 px-2 text-right" activeClassName="bg-rose-100 text-rose-950 font-bold">Tổng COD</SortableTh>
                    <SortableTh field="codGe5" sort={customerSort} onSort={(f) => setCustomerSort((cur) => nextSortState(cur, f))} className="py-2 pl-2 text-right" activeClassName="bg-rose-100 text-rose-950 font-bold">COD tồn ≥5 ngày</SortableTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedCustomers.map((row) => {
                    return (
                      <tr
                        key={row.customer_class}
                        className={`hover:bg-slate-50 transition-colors ${row.isSelected ? 'bg-rose-50/30' : ''}`}
                      >
                        <td className="py-2 pr-2 font-medium text-slate-900">
                          <span className="flex items-center gap-1.5">
                            <span className="font-bold text-sm">{row.customer_class}</span>
                            {row.isSelected ? (
                              <span className="text-sm px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-semibold" data-no-capture="true">
                                Đang lọc
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-slate-800">
                          {formatNumber(row.n)} <span className="text-slate-400 font-normal">({row.pct}%)</span>
                        </td>
                        <td className="py-2 px-2 text-right">
                          {row.n_ge5 > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded font-black text-red-700 bg-red-50 border border-red-200">
                              {formatNumber(row.n_ge5)}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-700 font-medium">
                          {formatCurrency(row.cod)}
                        </td>
                        <td className="py-2 pl-2 text-right text-slate-800 font-semibold">
                          {row.codGe5 === null ? '—' : formatCurrency(row.codGe5)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (col-span-6): 9 Levels & 5 TMS Statuses */}
        <div
          ref={statusLevelsBlockRef}
          className="lg:col-span-6 rounded-xl border border-slate-200/90 bg-white shadow-2xs p-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2" data-no-capture="true">
                <button
                  type="button"
                  onClick={() => setDetailSubTab('levels')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                    detailSubTab === 'levels'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Chi tiết 9 mức Loại Tồn
                </button>
                <button
                  type="button"
                  onClick={() => setDetailSubTab('status')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                    detailSubTab === 'status'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  5 Trạng thái TMS
                </button>
              </div>
              <BlockCaptureButton
                targetRef={statusLevelsBlockRef}
                blockTitle={detailSubTab === 'levels' ? 'Chi tiết 9 mức Loại Tồn' : 'Phân bổ 5 trạng thái TMS'}
                dateOrPeriod={snapshotLabel}
              />
            </div>

            {detailSubTab === 'levels' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold text-left">
                      <SortableTh field="rank" sort={levelSort} onSort={(f) => setLevelSort((cur) => nextSortState(cur, f, { textFields: ['rank'] }))} className="py-2 pr-2 text-left" activeClassName="bg-rose-100 text-rose-950 font-bold">Mức tồn</SortableTh>
                      <SortableTh field="count" sort={levelSort} onSort={(f) => setLevelSort((cur) => nextSortState(cur, f))} className="py-2 px-2 text-right" activeClassName="bg-rose-100 text-rose-950 font-bold">Số lượng</SortableTh>
                      <SortableTh field="pct" sort={levelSort} onSort={(f) => setLevelSort((cur) => nextSortState(cur, f))} className="py-2 px-2 text-right" activeClassName="bg-rose-100 text-rose-950 font-bold">Tỷ lệ</SortableTh>
                      <SortableTh field="cod" sort={levelSort} onSort={(f) => setLevelSort((cur) => nextSortState(cur, f))} className="py-2 pl-2 text-right" activeClassName="bg-rose-100 text-rose-950 font-bold">Tổng COD</SortableTh>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedLevelRows.map((row) => {
                      const cfg = getLevelConfig(row.level);
                      return (
                        <tr key={row.level} className="hover:bg-slate-50 transition-colors">
                          <td className="py-1.5 pr-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-sm font-semibold border ${cfg.badgeClass}`}>
                              {row.level}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-slate-900">
                            {formatNumber(row.count)}
                          </td>
                          <td className="py-1.5 px-2 text-right text-slate-600 font-medium">
                            {row.pct}%
                          </td>
                          <td className="py-1.5 pl-2 text-right text-slate-700">
                            {formatCurrency(row.cod)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-sm text-slate-500 mb-2">
                  5 trạng thái hợp lệ theo Quyết định PO D2 (Đã xác nhận đến, Đã phân tuyến, Giao bưu tá, Phát không thành công, Vu hồi).
                </p>
                {byStatus.map((st) => {
                  const count = Number(st.n) || 0;
                  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={st.status_name} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span className="text-slate-800">{st.status_name}</span>
                        <span className="text-slate-900 font-bold">
                          {formatNumber(count)} <span className="text-slate-500 font-normal">({pct}%)</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-rose-600 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
