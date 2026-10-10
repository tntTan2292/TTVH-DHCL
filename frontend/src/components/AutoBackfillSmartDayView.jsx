import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  MinusSquare,
  MoreHorizontal,
  RotateCcw,
  RotateCw,
  Square,
  UserCheck,
  Zap,
  Filter
} from 'lucide-react';
import {
  getItemKey,
  groupItemsByDay,
  summarizeMonthDays,
  resolveDaySelectionState,
  isSelectable,
  isReimportSelectable,
  resolveNoCodeStatus,
  paginateItems,
  filterDaysByMissingOnly
} from './autoBackfillUiHelpers';

/**
 * AutoBackfillSmartDayView
 * Chế độ Lịch theo Ngày thông minh (Option A - Redesigned)
 * - Các cột thẳng hàng tuyệt đối (Fixed-width aligned columns).
 * - Bộ lọc Indicator Tabs & Month Pills chuyển nhanh không cần cuộn dọc.
 * - Lọc nhanh "Chỉ ngày còn thiếu" với 1 click.
 */
export default function AutoBackfillSmartDayView({
  filteredCoverageItems = [],
  indicatorsList = [],
  indicatorFilter = 'ALL',
  setIndicatorFilter,
  monthFilter = 'ALL',
  setMonthFilter,
  _defaultMonthKey = null,
  monthOptions = [],
  laneFilter = 'ALL',
  _setLaneFilter,
  selectedBulkKeys = new Set(),
  selectedReimportKeys = new Set(),
  isAdmin = false,
  onToggleSelectItem,
  onSelectAllUnfinished,
  onSelectAllReimport,
  onConfirmClick,
  onRevokeClick,
  onReimportClick,
  onMarkHolidayClick,
  onRevokeHolidayClick
}) {
  const [onlyMissingDays, setOnlyMissingDays] = useState(false);
  const [accordionPage, setAccordionPage] = useState(1);
  const [accordionPageSize, setAccordionPageSize] = useState(10);
  const [activeMenuKey, setActiveMenuKey] = useState(null);

  // Close secondary actions menu on click outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuKey(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setAccordionPage(1);
  }, [indicatorFilter, monthFilter, laneFilter, onlyMissingDays]);

  // Group filtered items by business date
  const allDayGroups = useMemo(() => {
    return groupItemsByDay(filteredCoverageItems);
  }, [filteredCoverageItems]);

  // Apply "Only Missing Days" quick toggle
  const displayedDayGroups = useMemo(() => {
    if (onlyMissingDays) {
      return filterDaysByMissingOnly(allDayGroups);
    }
    return allDayGroups;
  }, [allDayGroups, onlyMissingDays]);

  // Month-wide summary metrics
  const monthSummary = useMemo(() => {
    return summarizeMonthDays(allDayGroups);
  }, [allDayGroups]);

  // Pagination for the day rows
  const paginatedDays = useMemo(() => {
    return paginateItems(displayedDayGroups, accordionPage, accordionPageSize);
  }, [displayedDayGroups, accordionPage, accordionPageSize]);

  // Check if all page items are selected
  const isReimportMode = selectedReimportKeys.size > 0;
  const isAllPageItemsSelected = useMemo(() => {
    const allPageItems = paginatedDays.pageItems.flatMap((d) => d.items);
    if (isReimportMode) {
      const selectable = allPageItems.filter(isReimportSelectable).map(getItemKey);
      return selectable.length > 0 && selectable.every((k) => selectedReimportKeys.has(k));
    }
    const selectable = allPageItems.filter(isSelectable).map(getItemKey);
    return selectable.length > 0 && selectable.every((k) => selectedBulkKeys.has(k));
  }, [paginatedDays.pageItems, isReimportMode, selectedBulkKeys, selectedReimportKeys]);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. INDICATOR NAVIGATION TABS (One-click jump across F1.1, F1.3, F4.1) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              Chỉ tiêu:
            </span>
            <button
              type="button"
              onClick={() => setIndicatorFilter('ALL')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                indicatorFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất cả Chỉ tiêu
            </button>
            {indicatorsList.map((ind) => {
              const isActive = indicatorFilter === ind.code;
              const hasMissing = ind.missingCount > 0;
              return (
                <button
                  key={ind.code}
                  type="button"
                  onClick={() => setIndicatorFilter(ind.code)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    isActive
                      ? 'bg-[var(--color-vnpost-blue)] text-white shadow-sm ring-2 ring-blue-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{ind.code}</span>
                  {hasMissing ? (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                        isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {ind.missingCount}
                    </span>
                  ) : (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        isActive ? 'bg-blue-800 text-blue-100' : 'text-emerald-700'
                      }`}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Toggle: All Days vs Only Missing Days */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setOnlyMissingDays(false)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                !onlyMissingDays
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ngày ({allDayGroups.length})
            </button>
            <button
              type="button"
              onClick={() => setOnlyMissingDays(true)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                onlyMissingDays
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-amber-900 hover:bg-amber-50'
              }`}
            >
              <Zap className="h-3 w-3" />
              <span>Chỉ ngày còn thiếu ({monthSummary.missingDays})</span>
            </button>
          </div>
        </div>

        {/* 2. MONTH PILLS NAVIGATION (Instant month switcher without vertical scrolling) */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 text-xs">
          <span className="font-bold text-slate-500 mr-1 flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            Tháng:
          </span>
          <button
            type="button"
            onClick={() => setMonthFilter('ALL')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              monthFilter === 'ALL'
                ? 'bg-blue-100 text-blue-900 font-bold border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả tháng
          </button>
          {monthOptions.map((m) => {
            const isActive = monthFilter === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMonthFilter(m)}
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  isActive
                    ? 'bg-[var(--color-vnpost-blue)] text-white font-bold shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Tháng {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TOOLBAR & BULK ACTIONS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <p className="text-xs font-medium text-slate-700">
            {monthSummary.label}
          </p>
          {onlyMissingDays && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300">
              Đang lọc {displayedDayGroups.length} ngày còn thiếu
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action 1: Select all unfinished in current scope */}
          {isAdmin && onSelectAllUnfinished && (
            <button
              type="button"
              onClick={() => onSelectAllUnfinished(indicatorFilter, monthFilter)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[var(--color-vnpost-blue)] hover:bg-blue-100 transition shadow-2xs"
              title="Tự động chọn toàn bộ ngày chưa hoàn tất của phạm vi hiện tại"
            >
              <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
              <span>Chọn tất cả chưa hoàn tất</span>
            </button>
          )}

          {/* Action 2: Select all reimport */}
          {isAdmin && onSelectAllReimport && (
            <button
              type="button"
              onClick={() => onSelectAllReimport(indicatorFilter, monthFilter)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
              title="Chọn tất cả ngày bao gồm ngày đã hoàn tất để tái nhập hàng loạt"
            >
              <RotateCcw className="h-3.5 w-3.5 text-indigo-600" />
              <span>Chọn tất cả (Tái nhập)</span>
            </button>
          )}

          <span className="text-xs font-semibold text-slate-500 pl-2 border-l border-slate-200">
            Hiển thị {paginatedDays.pageItems.length}/{displayedDayGroups.length} ngày
          </span>
        </div>
      </div>

      {/* 4. THE STRICTLY ALIGNED DAY TABLE (Fixed-width columns, zero horizontal jumping) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        {paginatedDays.pageItems.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="mt-3 text-lg font-bold text-slate-900">Không có dữ liệu phù hợp bộ lọc</h3>
            <p className="mt-1 text-sm text-slate-500">
              {onlyMissingDays
                ? 'Tuyệt vời! Không có ngày nào còn thiếu trong phạm vi lựa chọn.'
                : 'Tất cả các ngày trong phạm vi lựa chọn đã được xử lý hoàn tất hoặc ngoại lệ.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-xs font-bold uppercase text-slate-600">
                <tr>
                  {/* Col 1: Day Checkbox (w-12 fixed) */}
                  {isAdmin && (
                    <th className="w-12 px-3 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const allItems = paginatedDays.pageItems.flatMap((d) => d.items);
                          if (isReimportMode) {
                            const selectable = allItems.filter(isReimportSelectable);
                            selectable.forEach(onToggleSelectItem);
                          } else {
                            const selectable = allItems.filter(isSelectable);
                            selectable.forEach(onToggleSelectItem);
                          }
                        }}
                        className="text-slate-500 hover:text-slate-800 focus:outline-none"
                        title={isAllPageItemsSelected ? 'Bỏ chọn trang này' : 'Chọn trang này'}
                      >
                        {isAllPageItemsSelected ? (
                          <CheckSquare className={`h-4 w-4 ${isReimportMode ? 'text-indigo-600' : 'text-blue-600'}`} />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                  )}

                  {/* Col 2: Business Date (w-28 fixed) */}
                  <th className="w-28 px-3 py-3.5">Ngày Nghiệp vụ</th>

                  {/* Col 3: Indicator Code (w-20 fixed, shown when viewing all) */}
                  {indicatorFilter === 'ALL' && (
                    <th className="w-20 px-3 py-3.5">Chỉ tiêu</th>
                  )}

                  {/* Col 4: Lịch Nghỉ / Ghi chú (w-40 fixed, dedicated column so it NEVER pushes HUE/TCT) */}
                  <th className="w-40 px-3 py-3.5">Lịch Nghỉ / Ngoại lệ</th>

                  {/* Col 5: Nguồn Huế (HUE) (min-w-[310px] fixed layout) */}
                  <th className="min-w-[310px] px-3 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">HUE</span>
                      <span>Nguồn Huế</span>
                    </div>
                  </th>

                  {/* Col 6: Nguồn Tổng công ty (TCT) (min-w-[310px] fixed layout) */}
                  <th className="min-w-[310px] px-3 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">TCT</span>
                      <span>Nguồn Tổng công ty</span>
                    </div>
                  </th>

                  {/* Col 7: Thao tác Ngày (w-36 fixed text-right) */}
                  <th className="w-36 px-3 py-3.5 text-right">Thao tác Ngày</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedDays.pageItems.map((day) => {
                  const daySelection = resolveDaySelectionState(
                    day,
                    isReimportMode ? selectedReimportKeys : selectedBulkKeys,
                    { isReimportMode }
                  );
                  const firstActionableItem = day.items.find(isSelectable);
                  const holidayItem = day.items.find((i) => Boolean(i.holiday));
                  const holiday = day.holiday || holidayItem?.holiday;
                  const isAnyLaneSelected = day.items.some((i) => {
                    const k = getItemKey(i);
                    return isReimportMode ? selectedReimportKeys.has(k) : selectedBulkKeys.has(k);
                  });

                  // Day checkbox toggle handler
                  const handleToggleDay = (e) => {
                    e.stopPropagation();
                    if (!daySelection.canSelect) return;
                    if (daySelection.isSelected) {
                      daySelection.selectableItems.forEach((item) => {
                        const k = getItemKey(item);
                        const isSelected = isReimportMode ? selectedReimportKeys.has(k) : selectedBulkKeys.has(k);
                        if (isSelected) onToggleSelectItem(item);
                      });
                    } else {
                      daySelection.selectableItems.forEach((item) => {
                        const k = getItemKey(item);
                        const isSelected = isReimportMode ? selectedReimportKeys.has(k) : selectedBulkKeys.has(k);
                        if (!isSelected) onToggleSelectItem(item);
                      });
                    }
                  };

                  return (
                    <tr
                      key={`${day.indicator || ''}-${day.date}`}
                      className={`transition hover:bg-slate-50/80 ${
                        isAnyLaneSelected
                          ? isReimportMode
                            ? 'bg-indigo-50/40'
                            : 'bg-blue-50/40'
                          : ''
                      }`}
                    >
                      {/* Col 1: Day Checkbox */}
                      {isAdmin && (
                        <td className="w-12 px-3 py-3 text-center align-middle">
                          {daySelection.canSelect ? (
                            <button
                              type="button"
                              onClick={handleToggleDay}
                              className="text-slate-400 hover:text-blue-600 focus:outline-none"
                              title={daySelection.isSelected ? 'Bỏ chọn ngày này' : 'Chọn ngày này'}
                            >
                              {daySelection.isSelected ? (
                                <CheckSquare
                                  className={`h-4 w-4 ${isReimportMode ? 'text-indigo-600 fill-indigo-50' : 'text-blue-600 fill-blue-50'}`}
                                />
                              ) : daySelection.isPartial ? (
                                <MinusSquare
                                  className={`h-4 w-4 ${isReimportMode ? 'text-indigo-600 fill-indigo-50' : 'text-blue-600 fill-blue-50'}`}
                                />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <span className="w-4 h-4 inline-block text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      )}

                      {/* Col 2: Business Date */}
                      <td className="w-28 px-3 py-3 font-bold text-slate-900 whitespace-nowrap align-middle">
                        {day.date}
                      </td>

                      {/* Col 3: Indicator Code (if viewing ALL) */}
                      {indicatorFilter === 'ALL' && (
                        <td className="w-20 px-3 py-3 whitespace-nowrap align-middle">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                            {day.indicator}
                          </span>
                        </td>
                      )}

                      {/* Col 4: Lịch Nghỉ / Ghi chú (Fixed width, does NOT shift other columns) */}
                      <td className="w-40 px-3 py-3 whitespace-nowrap align-middle">
                        {holiday ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200"
                            title={holiday.reason}
                          >
                            <CalendarDays className="h-3 w-3 text-purple-600 shrink-0" />
                            <span className="truncate max-w-[120px]">
                              LỊCH NGHỈ: {holiday.reason}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Col 5: Nguồn Huế (HUE Cell - Fixed strictly aligned layout) */}
                      <td className="min-w-[310px] px-3 py-3 align-middle">
                        {day.lanes.HUE ? (
                          <LaneSourceCell
                            item={day.lanes.HUE}
                            lane="HUE"
                            isReimportMode={isReimportMode}
                            selectedBulkKeys={selectedBulkKeys}
                            selectedReimportKeys={selectedReimportKeys}
                            isAdmin={isAdmin}
                            onToggleSelectItem={onToggleSelectItem}
                            onReimportClick={onReimportClick}
                            onConfirmClick={onConfirmClick}
                            onRevokeClick={onRevokeClick}
                            activeMenuKey={activeMenuKey}
                            setActiveMenuKey={setActiveMenuKey}
                          />
                        ) : (
                          <span className="text-xs text-slate-400 italic">Không hỗ trợ nguồn</span>
                        )}
                      </td>

                      {/* Col 6: Nguồn TCT (TCT Cell - Fixed strictly aligned layout) */}
                      <td className="min-w-[310px] px-3 py-3 align-middle">
                        {day.lanes.TCT ? (
                          <LaneSourceCell
                            item={day.lanes.TCT}
                            lane="TCT"
                            isReimportMode={isReimportMode}
                            selectedBulkKeys={selectedBulkKeys}
                            selectedReimportKeys={selectedReimportKeys}
                            isAdmin={isAdmin}
                            onToggleSelectItem={onToggleSelectItem}
                            onReimportClick={onReimportClick}
                            onConfirmClick={onConfirmClick}
                            onRevokeClick={onRevokeClick}
                            activeMenuKey={activeMenuKey}
                            setActiveMenuKey={setActiveMenuKey}
                          />
                        ) : (
                          <span className="text-xs text-slate-400 italic">Không hỗ trợ nguồn</span>
                        )}
                      </td>

                      {/* Col 7: Thao tác Ngày (Right-aligned) */}
                      <td className="w-36 px-3 py-3 text-right whitespace-nowrap align-middle">
                        {isAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {firstActionableItem && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkHolidayClick(firstActionableItem);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-900 hover:bg-indigo-100 transition shadow-2xs"
                                title="Đánh dấu LỊCH NGHỈ (tự động bỏ qua cho tất cả chỉ tiêu)"
                              >
                                <CalendarDays className="h-3 w-3" />
                                <span>LỊCH NGHỈ</span>
                              </button>
                            )}

                            {holiday && holidayItem && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRevokeHolidayClick(holidayItem.holiday);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-900 hover:bg-purple-100 transition shadow-2xs"
                                title="Thu hồi LỊCH NGHỈ"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Thu hồi</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chỉ xem</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. INTERNAL PAGINATION BAR */}
        {paginatedDays.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <span>Hiển thị:</span>
              <select
                value={accordionPageSize}
                onChange={(e) => {
                  setAccordionPageSize(Number(e.target.value));
                  setAccordionPage(1);
                }}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700"
              >
                <option value={10}>10 ngày/trang</option>
                <option value={20}>20 ngày/trang</option>
                <option value={50}>50 ngày/trang</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAccordionPage((p) => Math.max(1, p - 1))}
                disabled={!paginatedDays.hasPrev}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Trước</span>
              </button>
              <span className="font-bold text-slate-800">
                Trang {paginatedDays.currentPage} / {paginatedDays.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setAccordionPage((p) => Math.min(paginatedDays.totalPages, p + 1))}
                disabled={!paginatedDays.hasNext}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40"
              >
                <span>Sau</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * LaneSourceCell
 * Subcomponent rendering an individual lane cell with strictly aligned sub-columns
 */
function LaneSourceCell({
  item,
  lane,
  isReimportMode,
  selectedBulkKeys,
  selectedReimportKeys,
  isAdmin,
  onToggleSelectItem,
  onReimportClick,
  onConfirmClick,
  onRevokeClick,
  activeMenuKey,
  setActiveMenuKey
}) {
  const statusInfo = resolveNoCodeStatus(item.status);
  const key = getItemKey(item);
  const isLaneSelected = isReimportMode ? selectedReimportKeys.has(key) : selectedBulkKeys.has(key);
  const canSelectLane = isReimportMode
    ? isReimportSelectable(item)
    : isSelectable(item) || item.status === 'COMPLETED';

  const canConfirm = isAdmin && isSelectable(item);
  const canRevoke = isAdmin && item.status === 'EXCLUDED' && item.exception?.exception_type === 'PO_EXEMPTED';
  const hasSecondaryActions = canConfirm || canRevoke;

  const menuKey = `${key}::menu`;
  const isMenuOpen = activeMenuKey === menuKey;

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 transition ${
        isLaneSelected
          ? isReimportMode
            ? 'border-indigo-300 bg-indigo-50/60'
            : 'border-blue-300 bg-blue-50/60'
          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Sub-col 1: Per-lane Checkbox (w-5) */}
        {isAdmin && (
          <div className="w-5 flex items-center justify-center">
            {canSelectLane ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelectItem(item);
                }}
                className="text-slate-400 hover:text-blue-600 focus:outline-none"
                title={`Chọn riêng nguồn ${lane}`}
              >
                {isLaneSelected ? (
                  <CheckSquare
                    className={`h-3.5 w-3.5 ${isReimportMode ? 'text-indigo-600 fill-indigo-50' : 'text-blue-600 fill-blue-50'}`}
                  />
                ) : (
                  <Square className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5 h-3.5" />
            )}
          </div>
        )}

        {/* Sub-col 2: Status Chip (fixed w-28 text-center) */}
        <span
          className={`w-28 text-center truncate inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border ${statusInfo.badgeClass}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
          <span className="truncate">{statusInfo.label}</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Sub-col 3: Primary Action Button (fixed w-20 text-right) */}
        {isAdmin ? (
          item.status === 'COMPLETED' ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReimportClick(item);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
              title="Tái nạp và thay thế dữ liệu ngày này"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Nhập lại</span>
            </button>
          ) : item.status === 'INCOMPLETE' ||
            item.status === 'DATA_ERROR' ||
            (item.status === 'EXCLUDED' && item.holiday) ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReimportClick(item);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-[var(--color-vnpost-blue)] hover:bg-blue-100 transition shadow-2xs"
              title="Yêu cầu nạp mới dữ liệu cho ngày này"
            >
              <RotateCw className="h-3 w-3" />
              <span>Nhập mới</span>
            </button>
          ) : (
            <span className="w-16" />
          )
        ) : (
          <span className="w-16" />
        )}

        {/* Sub-col 4: Secondary Actions ⋯ Popover Menu (w-6) */}
        {hasSecondaryActions ? (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuKey(isMenuOpen ? null : menuKey);
              }}
              className="flex items-center justify-center rounded-lg p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
              title="Thao tác khác"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {isMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full z-30 mt-1 min-w-[190px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100"
              >
                {canConfirm && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuKey(null);
                      onConfirmClick(item);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-amber-900 hover:bg-amber-50 transition"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-amber-600" />
                    <span>Xác nhận Không phát sinh</span>
                  </button>
                )}
                {canRevoke && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuKey(null);
                      onRevokeClick(item);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                    <span>Hoàn tác</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="w-6" />
        )}
      </div>
    </div>
  );
}
