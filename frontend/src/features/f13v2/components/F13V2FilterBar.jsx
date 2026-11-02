import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, BarChart2, Activity, Filter, RefreshCw } from 'lucide-react';
import { resolvePeriod } from '../api/f13v2Api.js';
import { resolveTargetPageParams } from '../f13v2Helpers.js';

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
  onRefresh,
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [switching, setSwitching] = useState(false);

  // URL parameters
  const fromParam = searchParams.get('from') || '';
  const toParam = searchParams.get('to') || '';
  const weekParam = searchParams.get('week') || '';
  const monthParam = searchParams.get('month') || '';
  const bcvhParam = searchParams.get('bcvh') || 'all';

  // Allowed units from layout
  const allowAllUnits = layout?.units?.allow_all ?? true;
  const userBcvhCodes = layout?.units?.bcvh || [];

  const handleTabSwitch = async (targetPageId) => {
    if (targetPageId === activePage || switching) return;
    setSwitching(true);

    try {
      let kind = 'day';
      let value = toParam || latestDate || new Date().toISOString().slice(0, 10);

      if (activePage === 'tuan') {
        kind = 'week';
        value = weekParam || (availableWeeks[0]?.week_id ?? '');
      } else if (activePage === 'thang') {
        kind = 'month';
        value = monthParam || (availableMonths[0]?.month_id ?? '');
      }

      const resolveData = await resolvePeriod({ kind, value, latestDate });

      const target = resolveTargetPageParams({
        currentPage: activePage,
        targetPage: targetPageId,
        currentParams: searchParams,
        resolveData,
      });

      navigate(target.fullPath);
    } catch (err) {
      console.error('[F13V2FilterBar] Tab switch resolve failed:', err);
      // Fallback navigation with existing params
      navigate(`/f13/v2/${targetPageId}?${searchParams.toString()}`);
    } finally {
      setSwitching(false);
    }
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
                disabled={switching}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                } ${switching ? 'opacity-60 cursor-not-allowed' : ''}`}
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
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span className="text-slate-500">Tuần</span>
              <select
                value={weekParam}
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
          )}

          {/* Mốc thời gian theo trang (Tháng) */}
          {activePage === 'thang' && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span className="text-slate-500">Tháng</span>
              <select
                value={monthParam}
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
              {userBcvhCodes.length > 0 ? (
                userBcvhCodes.map((code) => (
                  <option key={code} value={code}>
                    BCVH {code}
                  </option>
                ))
              ) : (
                <>
                  <option value="530000">BCVH Huế (530000)</option>
                  <option value="533140">BCVH Hương Thủy (533140)</option>
                  <option value="532800">BCVH Phong Điền (532800)</option>
                  <option value="533800">BCVH Phú Lộc (533800)</option>
                  <option value="532200">BCVH Quảng Điền (532200)</option>
                  <option value="534600">BCVH A Lưới (534600)</option>
                </>
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
