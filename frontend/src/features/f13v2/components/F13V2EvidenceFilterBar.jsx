import { CalendarDays, BarChart2, Activity, Filter, RefreshCw, Search, X } from 'lucide-react';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme } from '../../indicator/indicatorConfig.js';
import { ANALYST_CAUSES } from '../f13EvidenceHelpers.js';

const TABS = [
  { id: 'day', label: 'Theo ngày', icon: CalendarDays },
  { id: 'week', label: 'Theo tuần', icon: BarChart2 },
  { id: 'month', label: 'Theo tháng', icon: Activity },
];

export default function F13V2EvidenceFilterBar({
  periodMode = 'day',
  onPeriodModeChange,
  fromDate = '',
  toDate = '',
  onFromDateChange,
  onToDateChange,
  weekId = '',
  onWeekChange,
  availableWeeks = [],
  monthId = '',
  onMonthChange,
  availableMonths = [],
  bcvh = 'all',
  onBcvhChange,
  unitOptions = [],
  verdict = '',
  onVerdictChange,
  systemCause = '',
  onSystemCauseChange,
  analysed = '',
  onAnalysedChange,
  analystCause = '',
  onAnalystCauseChange,
  route = '',
  onRouteChange,
  postman = '',
  onPostmanChange,
  search = '',
  onSearchChange,
  sort = 'priority',
  onSortChange,
  // Extra filter properties passed from /why
  reason = '',
  onReasonChange,
  remaining = '',
  onRemainingChange,
  aSource = '',
  onASourceChange,
  hint = '',
  onHintChange,
  onResetFilters,
  onRefresh,
  loading = false,
}) {
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);

  const hasExtraFilters = Boolean(
    verdict ||
    systemCause ||
    analysed ||
    analystCause ||
    route ||
    postman ||
    search ||
    reason ||
    remaining ||
    aSource ||
    hint ||
    sort !== 'priority'
  );

  return (
    <div
      data-no-capture="true"
      className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-sm transition-[box-shadow,border-color] duration-150 flex flex-col gap-3"
    >
      {/* Tier 1 & 2: Time mode switcher + Date / Period + Unit selector */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Tier 1 Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-100/80 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === periodMode;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onPeriodModeChange?.(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? `${theme.button} shadow-xs`
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Period Picker & Unit Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Day Mode: From and To Date */}
          {periodMode === 'day' && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1">
                <span className="text-xs font-semibold text-slate-500">Từ</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => onFromDateChange?.(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1">
                <span className="text-xs font-semibold text-slate-500">Đến</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => onToDateChange?.(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Week Mode */}
          {periodMode === 'week' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Tuần</span>
              <select
                value={weekId}
                onChange={(e) => onWeekChange?.(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                {availableWeeks.map((w) => (
                  <option key={w.week_id} value={w.week_id}>
                    {w.label || w.week_id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month Mode */}
          {periodMode === 'month' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Tháng</span>
              <select
                value={monthId}
                onChange={(e) => onMonthChange?.(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={m.month_id} value={m.month_id}>
                    {m.label || m.month_id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Unit Scope */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={bcvh || 'all'}
              onChange={(e) => onBcvhChange?.(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              {unitOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Tải lại dữ liệu"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* Tier 3: Detailed Evidence Filters (verdict, causes, analysis status, search, server sort) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
        {/* Search by parcel code / lot */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1">
          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Tìm mã BG / mã lô..."
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange?.('')}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Verdict filter: All, Không đạt, Đạt */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Đánh giá:</span>
          <select
            value={verdict || ''}
            onChange={(e) => onVerdictChange?.(e.target.value)}
            className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="">Tất cả kết quả</option>
            <option value="Không đạt">Không đạt</option>
            <option value="Đạt">Đạt</option>
          </select>
        </div>

        {/* System Cause */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Nguyên nhân HT:</span>
          <select
            value={systemCause || ''}
            onChange={(e) => onSystemCauseChange?.(e.target.value)}
            className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer truncate"
          >
            <option value="">Tất cả nguyên nhân HT</option>
            <option value="KHONG_TRON_LO">Không trọn lô</option>
            <option value="KHAI_THAC">Khai thác</option>
            <option value="VAN_CHUYEN">Vận chuyển</option>
            <option value="KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET">Khai thác - VC chưa phân biệt</option>
            <option value="GIAO_BUU_TA_QUA_GIO">Phát - Chậm giao bưu tá</option>
            <option value="PHAT_MUON">Phát - Phát chậm sau khi giao</option>
            <option value="PHAT_KHONG_CHI_TIET">Phát - Chưa rõ chi tiết</option>
            <option value="CHO_CHUYEN_QUAN">Chờ Chuyên quản phân tích</option>
          </select>
        </div>

        {/* Analysed filter: All, Yes, No */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Chuyên quản:</span>
          <select
            value={analysed || ''}
            onChange={(e) => onAnalysedChange?.(e.target.value)}
            className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="">Tất cả phân tích</option>
            <option value="yes">Đã phân tích</option>
            <option value="no">Chưa phân tích</option>
          </select>
        </div>

        {/* Analyst Cause */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Kết luận CQ:</span>
          <select
            value={analystCause || ''}
            onChange={(e) => onAnalystCauseChange?.(e.target.value)}
            className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer truncate"
          >
            <option value="">Tất cả kết luận CQ</option>
            {ANALYST_CAUSES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Server Sort Order */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Thứ tự:</span>
          <select
            value={sort || 'priority'}
            onChange={(e) => onSortChange?.(e.target.value)}
            className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="priority">Ưu tiên (Chờ CQ trước)</option>
            <option value="date">Theo ngày đo (Mới nhất)</option>
          </select>
        </div>
      </div>

      {/* Row for specific route / postman and extra filters tag strip */}
      {(route || postman || reason || remaining || aSource || hint || hasExtraFilters) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-medium">Bộ lọc nâng cao:</span>

          {route && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              Tuyến: {route}
              <button type="button" onClick={() => onRouteChange?.('')} className="hover:text-blue-950">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {postman && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              Bưu tá: {postman}
              <button type="button" onClick={() => onPostmanChange?.('')} className="hover:text-blue-950">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {reason && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
              Lý do Chờ CQ: {reason}
              <button type="button" onClick={() => onReasonChange?.('')} className="hover:text-amber-950">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {remaining && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-medium">
              Thời gian còn lại: {remaining}
              <button type="button" onClick={() => onRemainingChange?.('')} className="hover:text-purple-950">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {aSource && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium">
              Nguồn đến: {aSource}
              <button type="button" onClick={() => onASourceChange?.('')} className="hover:text-slate-950">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {hint && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium">
              Gợi ý: {hint}
              <button type="button" onClick={() => onHintChange?.('')} className="hover:text-slate-950">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {hasExtraFilters && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium ml-auto cursor-pointer underline underline-offset-2"
            >
              Xóa tất cả bộ lọc chi tiết
            </button>
          )}
        </div>
      )}
    </div>
  );
}
