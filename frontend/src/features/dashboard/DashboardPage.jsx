import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageContainer, CardContainer } from '../../components/common/Containers';
import { LoadingLayout, ErrorLayout, EmptyLayout } from '../../components/common/StateLayouts';
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Target, Package, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import BcvhOperationTableAdapter from './components/BcvhOperationTableAdapter';
import QualityTimelineAdapter from './components/QualityTimelineAdapter';

// ─── Mock Data (Bưu điện tỉnh Thừa Thiên Huế) ────────────────────────────────
const MOCK_DATA = {
  // KPI Hôm nay
  today:            85.5,
  yesterday:        83.2,
  dod:              +2.3,  // today - yesterday
  swc:              -1.1,  // today - same weekday last week
  // Sản lượng
  total_bg:         15200,
  buu_gui_dat:      13006,
  buu_gui_khong_dat: 2194,
  // Lũy kế
  luy_ke_tuan:      84.1,
  luy_ke_thang:     86.0,
  // F13_303
  f13_303_rate:     14.5,
  // Bưu cục vi phạm (tính từ bottom_bcvh)
  series: [
    { date: '2026-06-12', f13_303_rate: 10.2 },
    { date: '2026-06-13', f13_303_rate: 12.5 },
    { date: '2026-06-14', f13_303_rate: 15.0 },
    { date: '2026-06-15', f13_303_rate: 18.2 },
    { date: '2026-06-16', f13_303_rate: 14.5 },
  ],
  top_bcvh: [
    { id: 'BC_HUE10', name: 'Bình Điền',  rate: 4.2  },
    { id: 'BC_HUE01', name: 'TP Huế',     rate: 6.8  },
    { id: 'BC_HUE12', name: 'Tứ Hạ',      rate: 10.4 },
    { id: 'BC_HUE06', name: 'Quảng Điền', rate: 9.5  },
    { id: 'BC_HUE05', name: 'Phong Điền', rate: 11.3 },
  ],
  bottom_bcvh: [
    { id: 'BC_HUE09', name: 'Nam Đông',   rate: 32.1 },
    { id: 'BC_HUE08', name: 'A Lưới',     rate: 28.4 },
    { id: 'BC_HUE04', name: 'Hương Trà',  rate: 20.1 },
    { id: 'BC_HUE03', name: 'Phú Lộc',   rate: 18.2 },
    { id: 'BC_HUE07', name: 'Phú Vang',  rate: 16.7 },
  ],
};

// All BCVHs for filter dropdown (BĐTP Huế)
const BCVH_OPTIONS = [
  { value: 'all',      label: 'Tất cả BCVH' },
  { value: 'BC_HUE01', label: 'BCVH TP Huế' },
  { value: 'BC_HUE02', label: 'BCVH Hương Thủy' },
  { value: 'BC_HUE03', label: 'BCVH Phú Lộc' },
  { value: 'BC_HUE04', label: 'BCVH Hương Trà' },
  { value: 'BC_HUE05', label: 'BCVH Phong Điền' },
  { value: 'BC_HUE06', label: 'BCVH Quảng Điền' },
  { value: 'BC_HUE07', label: 'BCVH Phú Vang' },
  { value: 'BC_HUE08', label: 'BCVH A Lưới' },
  { value: 'BC_HUE09', label: 'BCVH Nam Đông' },
  { value: 'BC_HUE10', label: 'BCVH Bình Điền' },
  { value: 'BC_HUE11', label: 'BCVH Thuận An' },
  { value: 'BC_HUE12', label: 'BCVH Tứ Hạ' },
];

// ─── Helper formatters ────────────────────────────────────────────────────────
const fmtPct   = (v) => `${(v ?? 0).toFixed(1)}%`;
const fmtDelta = (v) => `${(v ?? 0) > 0 ? '+' : ''}${(v ?? 0).toFixed(1)}%`;
const fmtCount = (v) => (v ?? 0).toLocaleString('vi-VN');

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub1Label, sub1Value, sub1Up, sub2Label, sub2Value, sub2Up, icon: Icon, accent = 'default' }) {
  const accentMap = {
    default: { border: 'border-[var(--color-surface-200)]', icon: 'text-[var(--color-primary-600)]', val: 'text-[var(--color-text-main)]' },
    success: { border: 'border-green-100',  icon: 'text-green-600',  val: 'text-green-700' },
    danger:  { border: 'border-red-100',    icon: 'text-red-500',    val: 'text-red-600'  },
    warning: { border: 'border-amber-100',  icon: 'text-amber-500',  val: 'text-amber-600' },
  };
  const c = accentMap[accent] || accentMap.default;

  return (
    <div className={`bg-white p-5 rounded-lg border ${c.border} shadow-sm flex flex-col`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">{title}</p>
        {Icon && <Icon className={`w-4 h-4 ${c.icon}`} />}
      </div>
      <p className={`text-2xl font-black ${c.val} mt-1`}>{value}</p>
      {(sub1Label || sub2Label) && (
        <div className="mt-auto pt-3 grid grid-cols-2 gap-2 text-xs border-t border-[var(--color-surface-100)] mt-3">
          {sub1Label && (
            <div className={`flex items-center gap-1 ${sub1Up ? 'text-green-600' : 'text-red-600'}`}>
              {sub1Up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{sub1Label}: <strong>{sub1Value}</strong></span>
            </div>
          )}
          {sub2Label && (
            <div className={`flex items-center gap-1 ${sub2Up ? 'text-green-600' : 'text-red-600'}`}>
              {sub2Up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{sub2Label}: <strong>{sub2Value}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Executive Daily Brief (reuses logic from Legacy ExecutiveDailyBrief) ─────
function ExecutiveDailyBrief({ data }) {
  if (!data) return null;
  const kpiVal = data.today ?? 0;
  const kpiDod = data.dod ?? 0;
  const TARGET = 95;
  const statusStr = kpiVal >= TARGET ? 'ĐẠT MỤC TIÊU' : 'CHƯA ĐẠT MỤC TIÊU';
  const trendStr  = kpiDod > 0 ? 'TĂNG' : (kpiDod < 0 ? 'GIẢM' : 'ĐI NGANG');

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3" role="note">
      <FileText className="w-5 h-5 text-[#0054A6] mt-0.5 flex-shrink-0" />
      <div className="text-sm text-gray-800 leading-relaxed space-y-1">
        <p className="font-bold text-[#003E7E] uppercase tracking-wide text-xs mb-2">Bản Tin Điều Hành Nhanh</p>
        <p>
          <span className="font-semibold text-[#0054A6]">• Tình trạng:</span>{' '}
          Toàn mạng hiện <strong>{statusStr}</strong> ({fmtPct(kpiVal)}),{' '}
          <strong>{trendStr} {Math.abs(kpiDod).toFixed(1)}%</strong> so với hôm qua.
        </p>
        <p>
          <span className="font-semibold text-[#0054A6]">• Xử lý:</span>{' '}
          Đạt <strong>{fmtCount(data.buu_gui_dat)}</strong> bưu gửi.
          Còn <strong>{fmtCount(data.buu_gui_khong_dat)}</strong> bưu gửi chậm chỉ tiêu.
        </p>
        <p>
          <span className="font-semibold text-red-600">• Yêu cầu:</span>{' '}
          Các đơn vị rà soát lượng bưu gửi tồn đọng, ưu tiên phát dứt điểm trong ca làm việc.
        </p>
      </div>
    </div>
  );
}

// ─── Rule Recommendation (stub using mock, no API call while in mock phase) ───
function RuleRecommendationStub({ f13303Rate }) {
  if (!f13303Rate || f13303Rate <= 10) return null;
  const recs = [
    {
      id: 'REC-01', color: 'red', level: 'CẢNH BÁO', priority: 'P0',
      name: 'Nam Đông', category: 'Chậm nộp tiền',
      condition: `F13_303 = ${f13303Rate}% — vượt ngưỡng 10%`,
      impact: 'Kéo giảm KPI toàn mạng ≥ 0.8%',
      action: 'Điều tra ngay tuyến phát A Lưới và Nam Đông. Yêu cầu BCVH báo cáo trước 17:00.',
    },
  ];
  return (
    <div className="bg-white rounded-lg border border-[var(--color-surface-200)] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-surface-200)] bg-red-50 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wide">Khuyến Nghị Điều Hành</h3>
        <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {recs.filter(r => r.priority === 'P0').length} NGUY HIỂM
        </span>
      </div>
      <div className="p-4 space-y-3">
        {recs.map(rec => (
          <div key={rec.id} className="p-3 rounded-lg border bg-red-50 border-red-200 flex gap-3 items-start">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded text-red-600 bg-white border border-red-200">
                  {rec.level} — {rec.priority}
                </span>
                <span className="font-semibold text-gray-800">{rec.name} ({rec.category})</span>
              </div>
              <p className="text-gray-700 mb-1"><span className="font-semibold">Hiện trạng:</span> {rec.condition}</p>
              <p className="text-gray-700 mb-2"><span className="font-semibold">Tác động:</span> {rec.impact}</p>
              <p className="bg-white p-2 rounded border border-gray-100 text-gray-800">
                <span className="font-bold">Đề xuất:</span> {rec.action}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL State — D7.0 Engineering Guideline
  const fromDate = searchParams.get('from_date') || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const toDate   = searchParams.get('to_date')   || new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const interval = searchParams.get('interval')  || 'daily';
  const maBcvh   = searchParams.get('ma_bcvh')   || 'all';

  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    setState(prev => ({ ...prev, status: 'loading' }));
    const t = setTimeout(() => {
      setState({ status: 'success', data: MOCK_DATA, error: null });
    }, 700);
    return () => clearTimeout(t);
  }, [fromDate, toDate, interval, maBcvh]);

  const handleFilterChange = (e) => {
    if (state.status === 'loading') return; // Loading Guard
    const { name, value } = e.target;
    setSearchParams(prev => { prev.set(name, value); return prev; });
  };

  // TD-01 FIX: Drill-down uses /f13/ranking/bcvh (not /ranking/bcvh)
  const handleBcvhDrillDown = (bc) => {
    if (state.status === 'loading') return;
    const params = new URLSearchParams();
    params.set('from_date', fromDate);
    params.set('to_date',   toDate);
    params.set('interval',  interval);
    params.set('bcvh_id',   bc.id);
    params.set('bcvh_name', bc.name);
    navigate(`/f13/ranking/bcvh?${params.toString()}`);
  };

  const handleGoToBcvhRanking = () => {
    navigate(`/f13/ranking/bcvh?from_date=${fromDate}&to_date=${toDate}&interval=${interval}`);
  };

  if (state.status === 'error') {
    return <ErrorLayout error={state.error} onRetry={() => setState({ status: 'loading', data: null, error: null })} />;
  }

  const d = state.data;

  return (
    <PageContainer
      title="Executive Dashboard"
      action={
        <div className="flex items-center flex-wrap gap-2 bg-white p-2 rounded-lg border border-[var(--color-surface-200)] shadow-sm">
          {/* Date range */}
          <input
            type="date" name="from_date" value={fromDate}
            onChange={handleFilterChange}
            disabled={state.status === 'loading'}
            className="text-sm border-none focus:ring-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Từ ngày"
          />
          <span className="text-[var(--color-text-muted)]">-</span>
          <input
            type="date" name="to_date" value={toDate}
            onChange={handleFilterChange}
            disabled={state.status === 'loading'}
            className="text-sm border-none focus:ring-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Đến ngày"
          />
          {/* Interval */}
          <select
            name="interval" value={interval}
            onChange={handleFilterChange}
            disabled={state.status === 'loading'}
            className="text-sm border-l border-[var(--color-surface-200)] pl-3 ml-1 focus:ring-0 cursor-pointer bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Khung thời gian"
          >
            <option value="daily">Daily View</option>
            <option value="weekly">Weekly View</option>
            <option value="monthly">Monthly View</option>
          </select>
          {/* BCVH Filter — P0 bổ sung */}
          <select
            name="ma_bcvh" value={maBcvh}
            onChange={handleFilterChange}
            disabled={state.status === 'loading'}
            className="text-sm border-l border-[var(--color-surface-200)] pl-3 ml-1 focus:ring-0 cursor-pointer bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Chọn BCVH"
          >
            {BCVH_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      }
    >
      {state.status === 'loading' && <LoadingLayout />}

      {state.status === 'success' && !d && <EmptyLayout />}

      {state.status === 'success' && d && (
        <div className="space-y-5">
          {/* Alert Banner */}
          {d.f13_303_rate > 10 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start" role="alert">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-red-800">CẢNH BÁO P0: Tỷ lệ chậm nộp tiền vượt ngưỡng 10%</h3>
                <p className="text-sm text-red-700 mt-1">Đề nghị Giám đốc chỉ đạo rà soát ngay các Bưu cục nhóm Đáy.</p>
              </div>
            </div>
          )}

          {/* Executive Daily Brief (P1 — reuse logic from legacy ExecutiveDailyBrief) */}
          <ExecutiveDailyBrief data={d} />

          {/* KPI Cards — P0: bổ sung DoD, SWC, Hôm qua, Lũy kế */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI Toàn mạng + DoD + SWC */}
            <KpiCard
              title="KPI Toàn Mạng"
              value={fmtPct(d.today)}
              icon={Target}
              accent="default"
              sub1Label="DoD" sub1Value={fmtDelta(d.dod)} sub1Up={d.dod >= 0}
              sub2Label="SWC" sub2Value={fmtDelta(d.swc)} sub2Up={d.swc >= 0}
            />
            {/* Hôm qua */}
            <KpiCard
              title="KPI Hôm Qua"
              value={fmtPct(d.yesterday)}
              icon={Package}
              accent="default"
              sub1Label="Lũy kế tuần" sub1Value={fmtPct(d.luy_ke_tuan)} sub1Up={d.luy_ke_tuan >= 85}
              sub2Label="Lũy kế tháng" sub2Value={fmtPct(d.luy_ke_thang)} sub2Up={d.luy_ke_thang >= 85}
            />
            {/* Tỷ lệ chậm nộp */}
            <KpiCard
              title="Tỷ lệ Chậm Nộp (F13_303)"
              value={fmtPct(d.f13_303_rate)}
              icon={AlertTriangle}
              accent="danger"
              sub1Label="Đạt"     sub1Value={fmtCount(d.buu_gui_dat)}      sub1Up={true}
              sub2Label="Không đạt" sub2Value={fmtCount(d.buu_gui_khong_dat)} sub2Up={false}
            />
            {/* Bưu cục vi phạm — TD-02 FIX: lấy từ data thay vì hardcode */}
            <KpiCard
              title="Bưu Cục Vi Phạm"
              value={d.bottom_bcvh.length}
              icon={XCircle}
              accent="warning"
            />
          </div>

          {/* Rule Recommendation (P1 — reused logic from legacy) */}
          <RuleRecommendationStub f13303Rate={d.f13_303_rate} />

          {/* Chart + Top/Bottom */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Quality Timeline & Patterns (P0.2 — Wrap & Adapt Legacy QualityTimelinePanel) */}
            <div className="lg:col-span-2">
              <QualityTimelineAdapter 
                fromDate={fromDate}
                toDate={toDate}
                interval={interval}
                maBcvh={maBcvh}
              />
            </div>

            {/* Top / Bottom BCVH — TD fix: Top 5 thay vì Top 3 */}
            <div className="space-y-4">
              <CardContainer title="Bottom 5 Bưu Cục (Kém nhất)">
                <ul className="space-y-2.5">
                  {d.bottom_bcvh.map(bc => (
                    <li key={bc.id} className="flex justify-between items-center group cursor-pointer"
                      onClick={() => handleBcvhDrillDown(bc)}
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && handleBcvhDrillDown(bc)}
                    >
                      <span className="text-sm font-medium text-[var(--color-text-main)] group-hover:text-[var(--color-primary-600)] transition-colors">{bc.name}</span>
                      <div className="flex items-center text-red-600">
                        <span className="text-sm font-bold mr-2">{bc.rate}%</span>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContainer>

              <CardContainer title="Top 5 Bưu Cục (Tốt nhất)">
                <ul className="space-y-2.5">
                  {d.top_bcvh.map(bc => (
                    <li key={bc.id} className="flex justify-between items-center group cursor-pointer"
                      onClick={() => handleBcvhDrillDown(bc)}
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && handleBcvhDrillDown(bc)}
                    >
                      <span className="text-sm font-medium text-[var(--color-text-main)] group-hover:text-[var(--color-primary-600)] transition-colors">{bc.name}</span>
                      <div className="flex items-center text-green-600">
                        <span className="text-sm font-bold mr-2">{bc.rate}%</span>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContainer>
            </div>
          </div>

          {/* BCVH Operation Table (P0 — Wrap & Adapt Legacy BcvhOperationTable) */}
          <BcvhOperationTableAdapter 
            fromDate={fromDate}
            toDate={toDate}
            interval={interval}
            maBcvh={maBcvh}
          />

          {/* Heatmap Placeholder */}
          <CardContainer title="Ma trận nhiệt (Heatmap) Bưu Cục" className="h-48">
            <div className="w-full h-full bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center rounded text-slate-500">
              <p className="font-medium">Heatmap Component — Coming D7.4</p>
              <p className="text-sm mt-1">Chờ API /ranking/bcvh?interval=daily hoàn thiện</p>
            </div>
          </CardContainer>
        </div>
      )}
    </PageContainer>
  );
}
