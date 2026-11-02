import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, BarChart2, Activity, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { resolveTargetPageParams, buildScopedUnitOptions } from '../f13v2Helpers.js';

const TABS = [
  { id: 'ngay', label: 'Theo ngày', icon: CalendarDays },
  { id: 'tuan', label: 'Theo tuần', icon: BarChart2 },
  { id: 'thang', label: 'Theo tháng', icon: Activity },
];

export default function F13V2FilterBar({
  activePage = 'ngay', // 'ngay' | 'tuan' | 'thang'
  layout,
  latestDate,
  availableWeeks = [],
  availableMonths = [],
  bcvhUnits = [],
  onRefresh,
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL parameters
  const fromParam = searchParams.get('from') || '';
  const toParam = searchParams.get('to') || '';
  const weekParam = searchParams.get('week') || '';
  const monthParam = searchParams.get('month') || '';
  const bcvhParam = searchParams.get('bcvh') || 'all';

  // Allowed units from layout contract: strict check, do NOT default to allow_all if layout failed
  const allowAllUnits = layout?.units?.allow_all === true;
  const unitOptions = buildScopedUnitOptions({ layout, metaUnits: bcvhUnits });

  // PO Rule: switching pages does NOT convert date/week/month across pages;
  // it carries over ONLY `bcvh`. The destination page opens its own latest period.
  const handleTabSwitch = (targetPageId) => {
    if (targetPageId === activePage) return;

    const target = resolveTargetPageParams({
      currentPage: activePage,
      targetPage: targetPageId,
      currentParams: searchParams,
    });

    navigate(target.fullPath);
  };

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || (key === 'bcvh' && value === 'all')) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const handleFromChange = (val) => updateParam('from', val);
  const handleToChange = (val) => updateParam('to', val);
  const handleWeekChange = (val) => updateParam('week', val);
  const handleMonthChange = (val) => updateParam('month', val);
  const handleBcvhChange = (val) => updateParam('bcvh', val);

  // Soft validation: ?week= or ?month= invalid does NOT leave the filter select empty
  const isWeekInvalid = Boolean(
    weekParam && availableWeeks.length > 0 && !availableWeeks.some((w) => w.week_id === weekParam)
  );
  const selectWeekValue = isWeekInvalid
    ? availableWeeks[0]?.week_id || ''
    : weekParam || availableWeeks[0]?.week_id || '';

  const isMonthInvalid = Boolean(
    monthParam && availableMonths.length > 0 && !availableMonths.some((m) => m.month_id === monthParam)
  );
  const selectMonthValue = isMonthInvalid
    ? availableMonths[0]?.month_id || ''
    : monthParam || availableMonths[0]?.month_id || '';

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-sm transition-[box-shadow,border-color] duration-150">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Tier 1 Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-100/80 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activePage;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSwitch(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tier 1 & 2 Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mốc thời gian theo trang (Ngày) */}
          {activePage === 'ngay' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span className="text-slate-500">Từ</span>
                <input
                  type="date"
                  value={fromParam}
                  max={toParam || latestDate || undefined}
                  onChange={(e) => handleFromChange(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span className="text-slate-500">Đến</span>
                <input
                  type="date"
                  value={toParam}
                  min={fromParam || undefined}
                  max={latestDate || undefined}
                  onChange={(e) => handleToChange(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Mốc thời gian theo trang (Tuần) */}
          {activePage === 'tuan' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span className="text-slate-500">Tuần</span>
                <select
                  value={selectWeekValue}
                  onChange={(e) => handleWeekChange(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-2xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {availableWeeks.map((w) => (
                    <option key={w.week_id} value={w.week_id}>
                      {w.label || w.week_id}
                    </option>
                  ))}
                </select>
              </div>

              {isWeekInvalid && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  <AlertCircle size={12} className="text-amber-600" />
                  <span>Tuần {weekParam} không tồn tại</span>
                </span>
              )}
            </div>
          )}

          {/* Mốc thời gian theo trang (Tháng) */}
          {activePage === 'thang' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span className="text-slate-500">Tháng</span>
                <select
                  value={selectMonthValue}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-2xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {availableMonths.map((m) => (
                    <option key={m.month_id} value={m.month_id}>
                      {m.label || `Tháng ${m.month_id}`}
                    </option>
                  ))}
                </select>
              </div>

              {isMonthInvalid && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  <AlertCircle size={12} className="text-amber-600" />
                  <span>Tháng {monthParam} không tồn tại</span>
                </span>
              )}
            </div>
          )}

          {/* Tier 2: Đơn vị dùng chung 3 trang (bcvh) */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Filter size={14} className="text-slate-400" />
            <select
              value={bcvhParam}
              onChange={(e) => handleBcvhChange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-2xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {allowAllUnits && <option value="all">Tất cả BCVH</option>}
              {unitOptions.length > 0 ? (
                unitOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              ) : (
                !allowAllUnits && <option value="" disabled>Chưa có đơn vị được cấp quyền</option>
              )}
            </select>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Tải lại dữ liệu"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
