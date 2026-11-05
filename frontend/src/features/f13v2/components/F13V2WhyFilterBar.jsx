import { CalendarDays, BarChart2, Activity, Filter, RefreshCw } from 'lucide-react';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme } from '../../indicator/indicatorConfig.js';

const TABS = [
  { id: 'day', label: 'Theo ngày', icon: CalendarDays },
  { id: 'week', label: 'Theo tuần', icon: BarChart2 },
  { id: 'month', label: 'Theo tháng', icon: Activity },
];

export default function F13V2WhyFilterBar({
  periodMode = 'day', // 'day' | 'week' | 'month'
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
  onRefresh,
  loading = false,
}) {
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);

  return (
    <div
      data-no-capture="true"
      className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-sm transition-[box-shadow,border-color] duration-150"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Tier 1 Switcher Tabs - Exact Titles per PO standard */}
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

        {/* Tier 2 & 3: Period Selection & Unit Scope */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Day Mode: From and To Date Inputs */}
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

          {/* Week Mode: Week Select */}
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

          {/* Month Mode: Month Select */}
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

          {/* BCVH Unit Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            {/* S1-PO1: the browser must not restore an old choice (form restore on reload / back); the key re-creates the
                select whenever the state or the options change, so what is shown is always the page state. */}
            <select
              key={`${bcvh}|${unitOptions.map((opt) => opt.value).join(',')}`}
              autoComplete="off"
              value={bcvh}
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

          {/* Refresh Action */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Tải lại dữ liệu"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
