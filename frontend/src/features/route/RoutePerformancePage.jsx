import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PageContainer, KPICard, StatusBadge, LoadingState, ErrorState, EmptyState } from '../../components/shared/SharedComponents';
import f13DashboardClient from '../../api/F13DashboardClient';
import { DEFAULT_ROUTE_TYPE_FILTER, ROUTE_TYPE_FILTERS, normalizeRouteTypeFilter } from './routeRankingFilters';
import { toNumber, formatDelayedCashRate, applyRouteFilters, sortRouteRows, computeRouteKpiStats, computeDelayedCashWidget, resolveDefaultRouteDate } from './routeRankingCalculations';
import { buildViolationEvidenceLink } from './routeViolationEvidenceData';
import { processRoutePeriods, mergeRouteData, buildReconciliationView, formatPeriodRate, formatPeriodDelta, formatPeriodVolume, DASH } from './routePeriodData';
import { classifyF13HeatmapRate, F13_HEATMAP_TONE_CLASS } from '../../components/f13/f13HeatmapBandCatalog';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronLeft, AlertTriangle, Flame, Search, Filter, CalendarDays, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const ROUTE_BCVH_OPTIONS = [
  { value: '533140', label: 'BCVH Thuận Hóa' },
  { value: '535470', label: 'BCVH Hương Trà' },
  { value: '535790', label: 'BCVH A Lưới' },
  { value: '536250', label: 'BCVH Hương Thủy' },
  { value: '537015', label: 'BCVH Thuận An' },
  { value: '537220', label: 'BCVH Phú Lộc' },
];

const ITEMS_PER_PAGE = 10;

// Three-state classification: `true`/`false` are real backend facts (from the old day-scoped
// endpoint, or trivially true whenever the postman filter is applied — see mergeRouteData()'s
// comment); `null` means genuinely unknown (an all-scope row with zero activity on the anchor
// day, so the old endpoint never returned a classification for it) — rendered honestly, not
// guessed either way.
function classificationLabel(row) {
  if (row.is_postman_delivery_route === null || row.is_postman_delivery_route === undefined) return 'Chưa xác định';
  return row.is_postman_delivery_route ? 'Tuyến bưu tá' : 'Nhận tại bưu cục';
}

function classificationBadgeClass(row) {
  if (row.is_postman_delivery_route === null || row.is_postman_delivery_route === undefined) {
    return 'bg-slate-50 text-slate-400 border border-slate-200 border-dashed';
  }
  return row.is_postman_delivery_route
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-slate-100 text-slate-700 border border-slate-200';
}

// §7.3 Design of Record: "Giữ nguyên không đổi ... Tổng BG, Đạt, Không đạt, Chuyển hoàn" — these
// four plus "Tỷ lệ ngày" (the renamed "Tỷ lệ đạt") make up "Kết quả ngày đánh giá", day-scoped,
// enriched from the old GET /f13/ranking/route endpoint via mergeRouteData(). `null` (route had
// no activity that specific day) renders "—", never a fabricated 0.
const DAY_EVAL_COLUMNS = [
  { key: 'total_bg', label: 'Tổng BG' },
  { key: 'passed', label: 'Đạt' },
  { key: 'failed', label: 'Không đạt' },
  { key: 'returned', label: 'Chuyển hoàn' },
  { key: 'day_rate', label: 'Tỷ lệ ngày' },
];

// §7.3: "Nhóm cột mới — 'Kết quả theo kỳ', đặt sau nhóm 'Kết quả ngày đánh giá'" — period-scoped,
// sourced from GET /f13/ranking/route/periods. `Hạng` here is the real backend rank (never the
// old row-position placeholder — that column is removed entirely, not kept alongside this one).
const PERIOD_COLUMNS = [
  { key: 'rank', label: 'Hạng' },
  { key: 'month_rate', label: 'Lũy kế tháng' },
  { key: 'previous_month_rate', label: 'Cùng kỳ T.trước' },
  { key: 'delta', label: 'Chênh lệch' },
  { key: 'month_days_with_data', label: 'Ngày có DL' },
  { key: 'month_volume', label: 'Sản lượng' },
];

// §7.3: "Giữ nguyên không đổi ... toàn bộ nhóm 'Vi phạm chậm nộp tiền'" — day-scoped, same
// null-safety as DAY_EVAL_COLUMNS.
const DELAYED_CASH_COLUMNS = [
  { key: 'delayed_cash_handover_count', label: 'BG Chậm nộp tiền' },
  { key: 'f13_303_rate', label: 'Tỷ lệ chậm nộp' },
];

// A day-scoped numeric cell: `null` (route had no activity that day) renders "—", a real number
// (including a genuine 0) renders as data — never coerced through toNumber(), which would turn
// null into a fabricated 0.
function DayScopedCell({ value }) {
  return (
    <td className="px-3 py-3 text-right font-mono text-xs text-slate-600">
      {value === null || value === undefined ? <span className="text-slate-400">{DASH}</span> : Number(value).toLocaleString('vi-VN')}
    </td>
  );
}

function SortHeaderCell({ column, sortState, onSort, isSubHeader = false }) {
  const isActive = sortState.key === column.key;
  const ArrowIcon = isActive ? (sortState.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className={`px-3 py-2.5 text-right transition-colors ${isSubHeader ? 'bg-slate-50/80' : ''}`}>
      <button
        type="button"
        onClick={() => onSort(column.key)}
        aria-sort={isActive ? (sortState.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`inline-flex items-center justify-end gap-1.5 w-full text-xs font-semibold uppercase tracking-wider transition-colors hover:text-[var(--color-primary-700)] ${
          isActive ? 'text-[var(--color-primary-700)] font-bold' : 'text-slate-500'
        }`}
      >
        <span>{column.label}</span>
        <ArrowIcon size={13} className={isActive ? 'text-[var(--color-primary-600)]' : 'text-slate-400 opacity-60'} />
      </button>
    </th>
  );
}

function RouteRankingTable({
  pageRows,
  totalRows,
  currentPage,
  totalPages,
  onPageChange,
  selectedRouteId,
  onSelectRoute,
  sortState,
  onSort
}) {
  if (!totalRows) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
          <Filter size={20} />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">Không có tuyến nào phù hợp</h3>
        <p className="mt-1 text-xs text-slate-500">Vui lòng thử điều chỉnh bộ lọc loại tuyến, ô tìm kiếm hoặc bộ lọc phát sinh lỗi.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm" data-testid="route-ranking-table">
          <thead>
            <tr className="bg-slate-100/90 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <th className="px-3.5 py-3" rowSpan={2}>Mã tuyến</th>
              <th className="px-4 py-3" rowSpan={2}>Tên tuyến bưu tá</th>
              <th className="border-l border-slate-200 px-3 py-2 text-center bg-slate-50 text-slate-700" colSpan={DAY_EVAL_COLUMNS.length}>
                Kết quả ngày đánh giá
              </th>
              <th className="border-l border-slate-200 px-3 py-2 text-center bg-blue-50/70 text-blue-900" colSpan={PERIOD_COLUMNS.length}>
                Kết quả theo kỳ
              </th>
              <th className="border-l border-slate-200 px-3 py-2 text-center bg-amber-50/70 text-amber-900 border-r border-slate-200" colSpan={DELAYED_CASH_COLUMNS.length}>
                Vi phạm chậm nộp tiền
              </th>
              <th className="px-3.5 py-3 text-center" rowSpan={2}>Phân loại</th>
            </tr>
            <tr className="border-b border-slate-200">
              {DAY_EVAL_COLUMNS.map((column) => (
                <SortHeaderCell key={column.key} column={column} sortState={sortState} onSort={onSort} isSubHeader />
              ))}
              {PERIOD_COLUMNS.map((column) => (
                <SortHeaderCell key={column.key} column={column} sortState={sortState} onSort={onSort} isSubHeader />
              ))}
              {DELAYED_CASH_COLUMNS.map((column) => (
                <SortHeaderCell key={column.key} column={column} sortState={sortState} onSort={onSort} isSubHeader />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {pageRows.map((row) => {
              const routeId = row.id || row.ma_tuyen;
              const selected = routeId === selectedRouteId;
              const failedCount = toNumber(row.failed ?? row.total_failed);
              const delayedCount = row.delayed_cash_handover_count === null || row.delayed_cash_handover_count === undefined
                ? null
                : toNumber(row.delayed_cash_handover_count);

              const isHighRisk = failedCount > 0 || (delayedCount ?? 0) > 0;

              return (
                <tr
                  key={routeId}
                  onClick={() => onSelectRoute(routeId)}
                  className={`cursor-pointer transition-colors ${
                    selected
                      ? 'bg-blue-50/90 ring-1 ring-inset ring-blue-300'
                      : isHighRisk
                        ? 'hover:bg-amber-50/40'
                        : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-3.5 py-3 font-mono text-xs font-medium text-slate-600">{row.code || row.ma_tuyen}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRoute(routeId);
                        }}
                        className={`text-left font-semibold transition-colors hover:underline focus-visible:outline-none ${
                          selected ? 'text-[var(--color-primary-700)]' : 'text-slate-800'
                        }`}
                      >
                        {row.name || row.ten_tuyen || row.ma_tuyen}
                      </button>
                      {failedCount > 5 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          <Flame size={10} className="mr-0.5" /> Yếu
                        </span>
                      )}
                    </div>
                  </td>
                  {/* Kết quả ngày đánh giá — day-scoped, old endpoint, null-safe */}
                  <DayScopedCell value={row.total_bg} />
                  <DayScopedCell value={row.passed} />
                  <DayScopedCell value={row.failed} />
                  <DayScopedCell value={row.returned} />
                  <td className="px-3 py-3 text-right">
                    <span className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded ${row.day_rate !== null ? F13_HEATMAP_TONE_CLASS[classifyF13HeatmapRate(row.day_rate).tone] : F13_HEATMAP_TONE_CLASS.unavailable}`}>
                      {formatPeriodRate(row.day_rate)}
                    </span>
                  </td>
                  {/* Kết quả theo kỳ — period-scoped, new endpoint */}
                  <td className="px-3 py-3 text-right font-mono text-xs font-bold text-slate-700">
                    {row.rank ?? DASH}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded ${row.month_rate !== null ? F13_HEATMAP_TONE_CLASS[classifyF13HeatmapRate(row.month_rate).tone] : F13_HEATMAP_TONE_CLASS.unavailable}`}>
                      {formatPeriodRate(row.month_rate)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-slate-600">
                    {formatPeriodRate(row.previous_month_rate)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs">
                    {row.delta !== null ? (
                      <span className={Number(row.delta) > 0 ? 'text-emerald-600 font-bold' : Number(row.delta) < 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                        {formatPeriodDelta(row.delta)}
                      </span>
                    ) : (
                      <span className="text-slate-400">{DASH}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-slate-600">
                    {row.month_days_with_data}/{row.month_days_in_period}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-slate-600">
                    {formatPeriodVolume(row.month_volume)}
                  </td>
                  {/* Vi phạm chậm nộp tiền — day-scoped, old endpoint, null-safe */}
                  <td className="border-l border-slate-100 px-3 py-3 text-right font-mono text-xs">
                    {delayedCount === null ? (
                      <span className="text-slate-400">{DASH}</span>
                    ) : delayedCount > 0 ? (
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                        {delayedCount.toLocaleString('vi-VN')}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-amber-800">
                    {formatDelayedCashRate(row.f13_303_rate)}
                  </td>
                  <td className="px-3.5 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${classificationBadgeClass(row)}`}>
                      {classificationLabel(row)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs">
        <div className="text-slate-600 font-medium">
          Hiển thị <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalRows)}</strong> trong tổng số <strong>{totalRows}</strong> tuyến
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 mr-2 font-medium">
            Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Trang trước"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <ChevronLeft size={14} />
            <span>Trước</span>
          </button>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Trang sau"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <span>Sau</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function RouteSelectedPanel({ route, bcvhId, bcvhName, fromDate, currentSearch }) {
  const chartData = useMemo(() => {
    if (!route?.daily_series) return [];
    return route.daily_series.map(d => ({
      date: (d.date || '').split('-').pop(),
      rate: d.rate !== null ? Number(d.rate) : null
    }));
  }, [route?.daily_series]);

  if (!route) {
    return (
      <EmptyState
        title="Chưa chọn tuyến"
        description="Chọn một tuyến trong bảng bên trái để xem chi tiết đối soát vi phạm."
      />
    );
  }

  const violationLink = buildViolationEvidenceLink({
    analysisDate: fromDate,
    bcvhId,
    bcvhName,
    routeId: route.id || route.ma_tuyen,
    routeName: route.name || route.ten_tuyen || route.ma_tuyen,
    currentSearch,
  });

  // Day-scoped fields (old endpoint): `null` means the route had no activity on the anchor
  // day itself — rendered as "—", never a fabricated 0. A genuine 0 (real data) still renders
  // as "0", the normal case for the vast majority of routes.
  const hasDayData = route.total_bg !== null && route.total_bg !== undefined;
  const totalBg = toNumber(route.total_bg);
  const passed = toNumber(route.passed);
  const failed = toNumber(route.failed ?? route.total_failed);
  const returned = route.returned === null || route.returned === undefined ? null : toNumber(route.returned);
  const delayedCount = route.delayed_cash_handover_count === null || route.delayed_cash_handover_count === undefined
    ? null
    : toNumber(route.delayed_cash_handover_count);
  const delayedEligible = route.delayed_cash_handover_eligible_count === null || route.delayed_cash_handover_eligible_count === undefined
    ? null
    : toNumber(route.delayed_cash_handover_eligible_count);

  const renderDayMetric = (value) => (value === null ? DASH : value.toLocaleString('vi-VN'));

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sticky top-4">
      <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tuyến được chọn</span>
          <h3 className="mt-0.5 text-base font-bold text-slate-800 leading-snug">{route.name || route.ten_tuyen || route.ma_tuyen}</h3>
          <p className="font-mono text-xs text-slate-500 mt-0.5">Mã tuyến: {route.code || route.ma_tuyen}</p>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${classificationBadgeClass(route)}`}>
          {classificationLabel(route)}
        </span>
      </div>

      {chartData.length > 0 && (
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-3">Diễn biến tỷ lệ ngày</p>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`${value}%`, 'Tỷ lệ ngày']}
                  labelFormatter={(label) => `Ngày ${label}`}
                />
                <Line type="monotone" dataKey="rate" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2, fill: '#0ea5e9', strokeWidth: 0 }} activeDot={{ r: 4 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <div className={`rounded-lg p-3 border ${route.day_rate !== null ? F13_HEATMAP_TONE_CLASS[classifyF13HeatmapRate(route.day_rate).tone] : F13_HEATMAP_TONE_CLASS.unavailable}`}>
          <p className="text-[11px] uppercase tracking-wider font-semibold opacity-70">Tỷ lệ ngày</p>
          <p className="mt-1 text-lg font-bold font-mono">
            {formatPeriodRate(route.day_rate)}
          </p>
        </div>
        <div className={`rounded-lg p-3 border ${route.month_rate !== null ? F13_HEATMAP_TONE_CLASS[classifyF13HeatmapRate(route.month_rate).tone] : F13_HEATMAP_TONE_CLASS.unavailable}`}>
          <div className="flex justify-between items-start">
            <p className="text-[11px] uppercase tracking-wider font-semibold opacity-70">Lũy kế tháng</p>
            <span className="text-[10px] font-bold bg-white/50 px-1.5 py-0.5 rounded opacity-90 border border-white/40 shadow-xs text-slate-800">Hạng {route.rank ?? DASH}</span>
          </div>
          <div className="flex justify-between items-end mt-1">
            <p className="text-lg font-bold font-mono leading-none">
              {formatPeriodRate(route.month_rate)}
            </p>
            <span className="text-[10px] font-semibold opacity-80 leading-none mb-0.5">
              SL: {formatPeriodVolume(route.month_volume)}
            </span>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Cùng kỳ tháng trước</p>
          <div className="flex justify-between items-end mt-1">
            <p className="text-base font-bold text-slate-800 font-mono leading-none">{formatPeriodRate(route.previous_month_rate)}</p>
            <span className="text-[10px] text-slate-500 font-semibold leading-none mb-0.5">SL: {formatPeriodVolume(route.previous_month?.volume)}</span>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
          <div className="flex justify-between items-start">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Chênh lệch</p>
            <span className="text-[10px] font-semibold text-slate-400">{route.month_days_with_data}/{route.month_days_in_period} ngày</span>
          </div>
          <p className="mt-1 text-base font-bold text-slate-800 font-mono leading-none">
             {route.delta !== null ? (
               <span className={Number(route.delta) > 0 ? 'text-emerald-600' : Number(route.delta) < 0 ? 'text-rose-600' : 'text-slate-600'}>
                 {formatPeriodDelta(route.delta)}
               </span>
             ) : DASH}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Sản lượng phát</p>
          <p className="mt-0.5 text-base font-bold text-slate-800 font-mono">{renderDayMetric(hasDayData ? totalBg : null)}</p>
        </div>
        <div className="rounded-lg bg-emerald-50/40 p-2.5 border border-emerald-100">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800">Đạt chỉ tiêu</p>
          <p className="mt-0.5 text-base font-bold text-emerald-700 font-mono">{renderDayMetric(hasDayData ? passed : null)}</p>
        </div>
        <div className="rounded-lg bg-rose-50/50 p-2.5 border border-rose-100">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-rose-800">Không đạt</p>
          <p className="mt-0.5 text-base font-bold text-rose-700 font-mono">{renderDayMetric(hasDayData ? failed : null)}</p>
        </div>
      </div>
      {/* AC-09 (Design of Record §12.1, M-02): Sản lượng includes bưu gửi with no danh_gia_2026
          verdict yet (chuyển hoàn/chưa xử lý), so Đạt + Không đạt can legitimately be less than
          Sản lượng — a static caption (not a hover-only tooltip) so it reads the same on desktop
          and mobile, matching the existing PTC-3h caption pattern below. */}
      <p className="text-[11px] text-slate-400 italic -mt-1.5">
        Sản lượng bao gồm cả bưu gửi chưa có kết quả đánh giá; vì vậy Đạt + Không đạt có thể không bằng Sản lượng.
      </p>

      <div className="rounded-xl bg-gradient-to-br from-amber-50/90 to-orange-50/40 p-3.5 border border-amber-200/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={15} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">Vi phạm Chậm nộp tiền</span>
          </div>
          <span className="text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
            {formatDelayedCashRate(route.f13_303_rate)}
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/80 p-2 rounded border border-amber-200/50">
            <span className="text-[10px] text-slate-500 block">Số BG vi phạm:</span>
            <span className="text-sm font-bold text-amber-900 font-mono">{renderDayMetric(delayedCount)}</span>
          </div>
          <div className="bg-white/80 p-2 rounded border border-amber-200/50">
            <span className="text-[10px] text-slate-500 block">Mẫu kiểm tra:</span>
            <span className="text-sm font-semibold text-slate-700 font-mono">{renderDayMetric(delayedEligible)}</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-amber-800/90 italic">
          *Đánh giá chậm khi tiền được nộp sau thời điểm PTC trên 3.0 giờ.
        </p>
      </div>

      {returned !== null && returned > 0 && (
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80 text-xs">
          <div className="flex items-center justify-between text-slate-700 font-medium">
            <span>Bưu gửi chuyển hoàn:</span>
            <span className="font-mono font-bold text-slate-800">{returned.toLocaleString('vi-VN')} BG</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Được ghi nhận phân loại BLACK theo quy chuẩn KPI 2026.
          </p>
        </div>
      )}

      <Link
        to={violationLink}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-[var(--color-primary-700)] hover:shadow-md active:scale-[0.99]"
      >
        <span>Xem bưu gửi vi phạm</span>
        <ChevronRight size={16} />
      </Link>

      <div className="border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 flex justify-between items-center">
        <span>Ngày dữ liệu: <strong className="text-slate-600">{fromDate || 'N/A'}</strong></span>
        <span>BCVH: <strong className="text-slate-600">{bcvhName}</strong></span>
      </div>
    </div>
  );
}

// §5.3 Design of Record: "Đối soát phạm vi" strip, one horizontal band under the filter row, a
// Ngày/Lũy kế tháng toggle to switch which period it explains, always shown (even when the
// out-of-scope remainder is 0 — that is information, not an empty state). `identity_ok: false`
// surfaces a visible warning rather than being silently swallowed (F9).
function ReconciliationStrip({ reconciliation, anchorDate, periodLabel, onTogglePeriod }) {
  if (!reconciliation) return null;
  const { bcvhTotal, ranked, pickupAtOffice, nonHue, noRoute, outsideRanked, identityOk } = reconciliation;

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Đối soát phạm vi</h3>
            <p className="text-[11px] text-slate-500">{periodLabel === 'month' ? 'Kỳ lũy kế tháng' : `Ngày ${anchorDate || 'N/A'}`}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Toàn BCVH</span>
            <span className="font-mono font-bold text-slate-800">{bcvhTotal.toLocaleString('vi-VN')}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Trong xếp hạng</span>
            <span className="font-mono font-bold text-slate-800">{ranked.toLocaleString('vi-VN')}</span>
          </div>
          <div className="flex flex-col pl-6 border-l border-blue-200">
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Ngoài xếp hạng</span>
            <span className="font-mono font-bold text-slate-800">{outsideRanked.toLocaleString('vi-VN')}</span>
          </div>
          <button
            type="button"
            onClick={onTogglePeriod}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-xs hover:bg-blue-50"
          >
            {periodLabel === 'month' ? 'Xem theo ngày' : 'Xem theo lũy kế tháng'}
          </button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Ngoài xếp hạng gồm: nhận tại quầy/bưu cục <strong className="text-slate-700">{pickupAtOffice.toLocaleString('vi-VN')}</strong> · mã tuyến ngoài Huế <strong className="text-slate-700">{nonHue.toLocaleString('vi-VN')}</strong> · không có mã tuyến <strong className="text-slate-700">{noRoute.toLocaleString('vi-VN')}</strong>
      </p>
      {!identityOk && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-rose-700">
          <AlertTriangle size={13} />
          Cảnh báo: tổng đối soát không khớp toàn BCVH — cần kiểm tra lại dữ liệu.
        </p>
      )}
    </div>
  );
}

export default function RoutePerformancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);
  const [reconciliationPeriod, setReconciliationPeriod] = useState('day');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [sortState, setSortState] = useState({ key: 'passed_rate', dir: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [metaMaxDate, setMetaMaxDate] = useState(null);
  const [metaStatus, setMetaStatus] = useState('loading');

  const fromDateParam = searchParams.get('from_date') || '';
  const toDateParam = searchParams.get('to_date') || '';
  const bcvhId = searchParams.get('bcvh_id') || searchParams.get('ma_bcvh') || '533140';
  const bcvhName = searchParams.get('bcvh_name') || 'BCVH Thuận Hóa';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'day_rate';
  const order = searchParams.get('order') || 'asc';
  const routeType = normalizeRouteTypeFilter(searchParams.get('route_type') || DEFAULT_ROUTE_TYPE_FILTER);
  const onlyFailed = searchParams.get('only_failed') === '1';

  const analysisDate = resolveDefaultRouteDate({ param: toDateParam || fromDateParam, metaMaxDate });

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value === undefined || value === null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    // Update both from_date and to_date when picking a new analysis date
    if (key === 'analysis_date') {
      params.set('from_date', value);
      params.set('to_date', value);
    }
    setSearchParams(params);
    setCurrentPage(1);
  };

  const updateBcvhParam = (value) => {
    const params = new URLSearchParams(searchParams);
    params.delete('ma_bcvh');
    if (value === undefined || value === null || value === '' || value === 'all') {
      params.delete('bcvh_id');
    } else {
      params.set('bcvh_id', value);
    }
    setSearchParams(params);
    setCurrentPage(1);
  };

  const [bcvhOptions, setBcvhOptions] = useState(ROUTE_BCVH_OPTIONS);

  useEffect(() => {
    let mounted = true;
    const fetchMeta = async () => {
      try {
        const result = await f13DashboardClient.getDashboardMeta();
        if (!mounted) return;
        setMetaMaxDate(result?.data?.max_date || null);
        if (Array.isArray(result?.data?.bcvh_units) && result.data.bcvh_units.length > 0) {
          const formattedOptions = result.data.bcvh_units.map((unit) => ({
            value: unit.ma_bcvh || unit.value,
            label: unit.ten_bcvh ? `BCVH ${unit.ten_bcvh.replace(/^BCVH\s+/i, '')}` : (unit.label || unit.ma_bcvh),
          }));
          setBcvhOptions(formattedOptions);
        }
        setMetaStatus('ready');
      } catch {
        if (!mounted) return;
        setMetaMaxDate(null);
        setMetaStatus('error');
      }
    };
    fetchMeta();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchRoute = async () => {
      try {
        setStatus('loading');
        setError(null);
        // Design of Record §7.3: the old day-scoped columns (Tổng BG/Đạt/Không đạt/Chuyển
        // hoàn/delayed-cash/classification/BG-summary) must stay unchanged, sourced from
        // GET /f13/ranking/route exactly as before; GET /f13/ranking/route/periods only adds
        // the new period columns and the scope reconciliation. Both calls share the same
        // bcvh/date/route_type scope, so they merge cleanly by ma_tuyen.
        const [oldResult, periodsResult] = await Promise.all([
          f13DashboardClient.getRouteRanking(analysisDate, bcvhId, 1, 1000, sort, order, routeType),
          f13DashboardClient.getRoutePeriods(bcvhId, analysisDate, routeType),
        ]);
        if (!mounted) return;

        const oldRows = Array.isArray(oldResult?.data) ? oldResult.data : [];
        const processedPeriods = processRoutePeriods(periodsResult?.data);
        const mergedRows = mergeRouteData(oldRows, processedPeriods.routes, routeType);

        setRows(mergedRows);
        setMeta(oldResult?.meta || null);
        setReconciliation(processedPeriods.reconciliation || null);
        setCurrentPage(1);
        setSortState({ key: 'passed_rate', dir: 'asc' });

        if (mergedRows.length > 0) {
          // ITR-BLOCK-02: reuses the same null-safe sortRouteRows() the table itself uses, so a
          // route absent on the anchor day (day_rate: null) is never auto-selected as the
          // "worst" route ahead of a route that genuinely ran and scored low or 0%.
          const sortedWorst = sortRouteRows(mergedRows, { key: 'day_rate', dir: 'asc' });
          setSelectedRouteId((prev) => prev || sortedWorst[0]?.id || sortedWorst[0]?.ma_tuyen || '');
        }
        setStatus('success');
      } catch (e) {
        if (!mounted) return;
        setError({ message: e.message || 'Không thể tải dữ liệu tuyến' });
        setStatus('error');
      }
    };

    if (analysisDate && bcvhId) {
      fetchRoute();
    } else if (!fromDateParam && !toDateParam) {
      if (metaStatus === 'error') {
        setStatus('error');
        setError({ message: 'Không thể xác định ngày dữ liệu hợp lệ mới nhất.' });
      } else if (metaStatus === 'ready' && !metaMaxDate) {
        setStatus('error');
        setError({ message: 'Không có ngày dữ liệu hợp lệ trong hệ thống.' });
      }
    }
    return () => {
      mounted = false;
    };
  }, [bcvhId, analysisDate, fromDateParam, toDateParam, order, routeType, sort, metaStatus, metaMaxDate]);

  const hasDateMismatch = fromDateParam && toDateParam && fromDateParam !== toDateParam;

  const handleSort = (key) => {
    setSortState((prev) => (prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'asc' }));
  };

  const filteredRows = useMemo(
    () => sortRouteRows(applyRouteFilters(rows, { search, onlyFailed }), sortState),
    [rows, search, onlyFailed, sortState]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRows.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRows, currentPage]);

  const selectedRow = useMemo(() => {
    if (!filteredRows.length) return null;
    return filteredRows.find((item) => (item.id || item.ma_tuyen) === selectedRouteId) || filteredRows[0];
  }, [filteredRows, selectedRouteId]);

  const kpiStats = useMemo(() => computeRouteKpiStats(rows), [rows]);
  const delayedCashWidget = useMemo(() => computeDelayedCashWidget(meta?.delayed_cash_handover_summary), [meta]);

  const executiveKpis = [
    {
      label: 'Tổng tuyến phân tích',
      value: kpiStats.totalRoutes.toLocaleString('vi-VN'),
      delta: `${kpiStats.failedRouteCount} tuyến phát sinh lỗi`,
      tone: kpiStats.failedRouteCount > 0 ? 'warning' : 'success',
    },
    {
      label: 'Tỷ lệ đạt toàn BCVH',
      value: `${kpiStats.bcvhPassedRate.toFixed(1)}%`,
      delta: bcvhName,
      tone: kpiStats.bcvhPassedRate >= 90 ? 'primary' : 'danger',
    },
    {
      label: 'Tổng BG không đạt',
      value: kpiStats.totalFailed.toLocaleString('vi-VN'),
      delta: `Ngày ${analysisDate}`,
      tone: 'danger',
    },
    {
      label: 'BG Chậm nộp tiền',
      value: delayedCashWidget.value,
      delta: delayedCashWidget.delta,
      tone: 'warning',
    },
  ];

  const reconciliationView = useMemo(
    () => buildReconciliationView(reconciliation?.[reconciliationPeriod]),
    [reconciliation, reconciliationPeriod]
  );

  if (status === 'loading') {
    return (
      <PageContainer title="Bảng xếp hạng Tuyến Bưu tá" subtitle="Đang tải dữ liệu xếp hạng tuyến và đối soát nghiệp vụ...">
        <LoadingState label="Đang tải dữ liệu Tuyến Ranking..." />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer title="Bảng xếp hạng Tuyến Bưu tá" subtitle="Không thể kết nối hoặc tải dữ liệu tuyến.">
        <ErrorState description={error?.message} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Bảng xếp hạng Tuyến Bưu tá"
      subtitle="Bảng điều hành chất lượng tuyến: Nhận diện tuyến yếu, đối soát bưu gửi không đạt và chậm nộp tiền."
      action={
        <div className="flex flex-wrap items-center gap-2">
          {hasDateMismatch && (
            <StatusBadge label={`Đang phân tích ngày ${analysisDate}`} tone="warning" icon={AlertTriangle} />
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-150 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs transition-all duration-150 hover:border-blue-400 hover:bg-slate-50/50 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600">
              <CalendarDays size={16} className="text-slate-400 shrink-0" />
              <input
                type="date"
                value={analysisDate}
                onChange={(e) => updateParam('analysis_date', e.target.value)}
                className="border-none bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0"
                aria-label="Ngày phân tích"
              />
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs transition-all duration-150 hover:border-blue-400 hover:bg-slate-50/50 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600">
              <Filter size={16} className="text-slate-400 shrink-0" />
              <select
                value={bcvhId}
                onChange={(e) => updateBcvhParam(e.target.value)}
                className="border-none bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Bộ lọc BCVH"
              >
                {bcvhOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs transition-all duration-150 hover:border-blue-400 hover:bg-slate-50/50 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => updateParam('search', e.target.value)}
                className="w-full border-none bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              {ROUTE_TYPE_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => updateParam('route_type', item.value === DEFAULT_ROUTE_TYPE_FILTER ? '' : item.value)}
                  aria-pressed={routeType === item.value}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    routeType === item.value
                      ? 'bg-white text-slate-800 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => updateParam('only_failed', onlyFailed ? '' : '1')}
              aria-pressed={onlyFailed}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                onlyFailed
                  ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Flame size={14} className={onlyFailed ? 'text-rose-600' : 'text-slate-400'} />
              <span>Chỉ hiện tuyến phát sinh lỗi</span>
            </button>
          </div>
        </div>

        <ReconciliationStrip
          reconciliation={reconciliationView}
          anchorDate={analysisDate}
          periodLabel={reconciliationPeriod}
          onTogglePeriod={() => setReconciliationPeriod((prev) => (prev === 'day' ? 'month' : 'day'))}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {executiveKpis.map((item) => (
            <KPICard key={item.label} label={item.label} value={item.value} delta={item.delta} tone={item.tone} />
          ))}
        </div>

        {kpiStats.failedRouteCount > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent p-4 border border-rose-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 text-white shrink-0 shadow-xs">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Phát hiện <span className="text-rose-700 font-extrabold">{kpiStats.failedRouteCount} tuyến</span> có bưu gửi không đạt trong ngày
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Ưu tiên rà soát các tuyến có tỷ lệ không đạt cao và vi phạm Chậm nộp tiền để chỉ đạo khắc phục kịp thời.
                </p>
              </div>
            </div>
            <button
              onClick={() => updateParam('only_failed', '1')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-xs shrink-0"
            >
              <Filter size={13} />
              Lọc danh sách tuyến lỗi
            </button>
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-3 items-start">
          <div className="xl:col-span-2 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Bảng xếp hạng hiệu năng tuyến</h3>
                <p className="text-xs text-slate-500">Hiển thị {filteredRows.length} tuyến trong phạm vi chọn (10 tuyến/trang)</p>
              </div>
              <span className="text-xs font-medium text-slate-500">Click vào dòng để xem chi tiết đối soát</span>
            </div>
            <RouteRankingTable
              rows={filteredRows}
              pageRows={pageRows}
              totalRows={filteredRows.length}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              sortState={sortState}
              onSort={handleSort}
            />
          </div>

          <div className="xl:col-span-1">
            <div className="flex items-center justify-between px-1 mb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Bảng đối soát tuyến</h3>
              <span className="text-xs font-semibold text-slate-500">Admin Control</span>
            </div>
            <RouteSelectedPanel
              route={selectedRow}
              bcvhId={bcvhId}
              bcvhName={bcvhName}
              fromDate={analysisDate}
              currentSearch={searchParams.toString()}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
