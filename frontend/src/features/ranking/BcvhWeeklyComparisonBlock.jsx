import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarRange,
  CheckCircle2,
  Info,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import api from '../../api/client';
import { ErrorState } from '../../components/shared/SharedComponents';
import { BCVH_COLORS } from './bcvhOverviewData';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_TONE_CLASS,
} from '../../components/f13/f13HeatmapBandCatalog';
import {
  DASH,
  formatDeltaIndicator,
  formatRate,
  formatVolume,
} from '../dashboard/components/bcvhOperationTableData';
import {
  createMonthlyComparisonFetcher,
  createMonthsListFetcher,
  createWeeksListFetcher,
  createWeeklyComparisonFetcher,
} from './bcvhWeeklyComparisonFetcher';
import {
  buildMonthOptions,
  buildWeekOptions,
  checkMonthsDaysMismatch,
  checkWeeksDaysMismatch,
  formatMonthLabel,
  previousMonthId,
  formatDateVN,
  formatSignedVolumeDelta,
  formatWeekDataNote,
  formatWeekDateRange,
  resolveWeeksListWithAnchor,
  sortBcvhWeeklyRows,
} from './bcvhWeeklyComparisonData';

function renderDeltaBadge(deltaValue) {
  const { display, toneClass } = formatDeltaIndicator(deltaValue);
  return <span className={toneClass}>{display}</span>;
}

function renderRateBadge(rate) {
  if (rate === null || rate === undefined || rate === '') {
    return <span className="text-slate-400 font-medium">{DASH}</span>;
  }
  const num = Number(rate);
  if (!Number.isFinite(num)) {
    return <span className="text-slate-400 font-medium">{DASH}</span>;
  }
  const band = classifyF13HeatmapRate(num);
  const toneClass = F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable;
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[52px] sm:min-w-[60px] px-1.5 py-0.5 rounded-md border text-xs sm:text-sm md:text-base font-bold tabular-nums ${toneClass}`}
      title={`${band.label}: ${formatRate(num)}`}
    >
      {formatRate(num)}
    </span>
  );
}

function WeekSelect({ label, value, options, onChange, disabled, emptyText = 'Chưa có dữ liệu tuần' }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
      <span>{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs transition-all duration-150 hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600">
        <CalendarRange size={16} className="shrink-0 text-slate-400" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || !options.length}
          className="w-full cursor-pointer border-none bg-transparent text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!options.length ? <option value="">{emptyText}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function WeekNoteBadge({ week }) {
  const note = formatWeekDataNote(week);
  if (!note) return null;
  return (
    <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 border border-amber-200/80 shadow-2xs">
      <Info className="h-3 w-3 shrink-0 text-amber-600" />
      <span>{note}</span>
    </div>
  );
}

export default function BcvhWeeklyComparisonBlock() {
  const [weeksState, setWeeksState] = useState({ status: 'loading', weeks: [], error: null });
  const [anchorDate, setAnchorDate] = useState('');
  const [defaultAnchorDate, setDefaultAnchorDate] = useState('');
  const [anchorNotice, setAnchorNotice] = useState(null);
  const [selection, setSelection] = useState({ current: '', compare: '' });
  const [weekComparisonState, setComparisonState] = useState({ status: 'idle', data: null, error: null });

  // Monthly mode (PO 2026-10-05): calendar months, optional "cùng kỳ" (same first-N-days) comparison.
  const [periodMode, setPeriodMode] = useState('week');
  const isMonth = periodMode === 'month';
  const [monthsState, setMonthsState] = useState({ status: 'idle', months: [], error: null });
  const [monthSelection, setMonthSelection] = useState({ current: '', compare: '' });
  const [samePeriod, setSamePeriod] = useState(false);
  const [monthComparisonState, setMonthComparisonState] = useState({ status: 'idle', data: null, error: null });
  const comparisonState = isMonth ? monthComparisonState : weekComparisonState;
  const [fitMode, setFitMode] = useState(true);

  const containerRef = useRef(null);
  const tableRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState(null);

  // Responsive Fit Mode similar to Operation Dashboard
  useEffect(() => {
    if (!fitMode || !containerRef.current || !tableRef.current) {
      setScaledHeight(null);
      return;
    }
    const updateScale = () => {
      if (!containerRef.current || !tableRef.current) return;
      const cWidth = containerRef.current.clientWidth;
      const tWidth = tableRef.current.scrollWidth || 1100;
      if (tWidth > 0 && cWidth > 0) {
        const scale = Math.min(1, cWidth / tWidth);
        setFitScale(scale);
        const tHeight = tableRef.current.scrollHeight;
        setScaledHeight(tHeight * scale);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [fitMode, comparisonState.data]);

  // Load canonical weeks list once from API (no fake weeks!)
  const fetchWeeksRef = useRef(null);
  if (!fetchWeeksRef.current) fetchWeeksRef.current = createWeeksListFetcher(api, setWeeksState);
  useEffect(() => {
    fetchWeeksRef.current();
  }, []);

  // When API weeks load: extract real latest week anchor from backend data (no hardcoded fallback)
  useEffect(() => {
    if (weeksState.status !== 'success' || !weeksState.weeks.length) return;
    const sorted = [...weeksState.weeks].sort((a, b) => (b.week_start || '').localeCompare(a.week_start || ''));
    const latest = sorted[0];
    if (latest?.week_start) {
      setDefaultAnchorDate(latest.week_start);
      setAnchorDate((prev) => prev || latest.week_start);
    }
  }, [weeksState.status, weeksState.weeks]);

  // PO Requirement 6: Build week options sorted newest first with real data ranges
  const weekOptions = useMemo(() => {
    if (!weeksState.weeks || !weeksState.weeks.length) return [];
    return buildWeekOptions(weeksState.weeks);
  }, [weeksState.weeks]);

  // Default selection when options load
  useEffect(() => {
    if (!weekOptions.length) return;
    setSelection((prev) => {
      const validCurrent = weekOptions.some((o) => o.value === prev.current);
      const validCompare = weekOptions.some((o) => o.value === prev.compare);
      if (validCurrent && validCompare) return prev;

      const latest = weekOptions[0];
      const previous = weekOptions.length > 1 ? weekOptions[1] : latest;
      return {
        current: validCurrent ? prev.current : latest.value,
        compare: validCompare ? prev.compare : previous.value,
      };
    });
  }, [weekOptions]);

  // PO Blockers B1, B2, B3: When user changes anchor date, resolve to Thursday and update current selection
  const handleAnchorDateChange = (rawInputDate) => {
    if (!rawInputDate) {
      setAnchorNotice(null);
      return;
    }
    const resolution = resolveWeeksListWithAnchor(weeksState.weeks, rawInputDate);
    if (!resolution.resolvedWeek) {
      setAnchorNotice({ tone: 'error', text: resolution.message || 'Không tìm thấy tuần tương ứng.' });
      return;
    }

    setAnchorDate(resolution.snappedThursday);
    setSelection((prev) => ({
      ...prev,
      current: resolution.selectedWeekId,
    }));

    if (resolution.isFutureClamped) {
      setAnchorNotice({ tone: 'warning', text: resolution.message });
    } else if (rawInputDate !== resolution.snappedThursday) {
      setAnchorNotice({
        tone: 'info',
        text: `Ngày ${formatDateVN(rawInputDate)} đã được tự động căn về Thứ Năm ngày ${formatDateVN(resolution.snappedThursday)} (${resolution.resolvedWeek.label}).`,
      });
    } else {
      setAnchorNotice({
        tone: 'success',
        text: `Đã chọn ${resolution.resolvedWeek.label} (${formatWeekDateRange(resolution.resolvedWeek.display_start_date, resolution.resolvedWeek.display_end_date)}).`,
      });
    }
  };

  // Reset anchor to system latest fact week
  const handleResetAnchor = () => {
    if (!defaultAnchorDate) return;
    handleAnchorDateChange(defaultAnchorDate);
    setAnchorNotice(null);
  };

  // Fetch comparison aggregate when selection changes
  const fetchComparisonRef = useRef(null);
  if (!fetchComparisonRef.current) fetchComparisonRef.current = createWeeklyComparisonFetcher(api, setComparisonState);
  useEffect(() => {
    if (selection.current && selection.compare) {
      fetchComparisonRef.current(selection.current, selection.compare);
    }
  }, [selection]);

  // Monthly mode: months list loads lazily, the first time the user switches to "Tháng".
  const fetchMonthsRef = useRef(null);
  if (!fetchMonthsRef.current) fetchMonthsRef.current = createMonthsListFetcher(api, setMonthsState);
  useEffect(() => {
    if (isMonth && monthsState.status === 'idle') fetchMonthsRef.current();
  }, [isMonth, monthsState.status]);

  const monthOptions = useMemo(() => buildMonthOptions(monthsState.months), [monthsState.months]);

  // Default: latest month vs the month before it.
  useEffect(() => {
    if (!monthOptions.length) return;
    setMonthSelection((prev) => {
      const validCurrent = monthOptions.some((o) => o.value === prev.current);
      const validCompare = monthOptions.some((o) => o.value === prev.compare);
      if (validCurrent && validCompare) return prev;
      const latest = monthOptions[0];
      const previous = monthOptions.length > 1 ? monthOptions[1] : latest;
      return {
        current: validCurrent ? prev.current : latest.value,
        compare: validCompare ? prev.compare : previous.value,
      };
    });
  }, [monthOptions]);

  const fetchMonthComparisonRef = useRef(null);
  if (!fetchMonthComparisonRef.current) fetchMonthComparisonRef.current = createMonthlyComparisonFetcher(api, setMonthComparisonState);
  useEffect(() => {
    if (isMonth && monthSelection.current && monthSelection.compare) {
      fetchMonthComparisonRef.current(monthSelection.current, monthSelection.compare, samePeriod);
    }
  }, [isMonth, monthSelection, samePeriod]);

  const currentWeek = weekOptions.find((o) => o.value === selection.current)?.week || null;
  const compareWeek = weekOptions.find((o) => o.value === selection.compare)?.week || null;
  const currentMonth = monthOptions.find((o) => o.value === monthSelection.current)?.month || null;
  const compareMonth = monthOptions.find((o) => o.value === monthSelection.compare)?.month || null;

  // PO Requirement 5: Check if the two selected weeks have different days with data
  const weekDaysMismatch = useMemo(() => checkWeeksDaysMismatch(currentWeek, compareWeek), [currentWeek, compareWeek]);
  const monthDaysMismatch = useMemo(
    () => checkMonthsDaysMismatch(currentMonth, compareMonth, samePeriod),
    [currentMonth, compareMonth, samePeriod],
  );
  const daysMismatch = isMonth ? monthDaysMismatch : weekDaysMismatch;
  // One-click preset (like the Operation Dashboard "so với cùng kỳ tháng trước" column): compare the
  // selected month with the calendar month right before it, over the same first-N days.
  const prevMonthOfCurrent = previousMonthId(monthSelection.current);
  const prevMonthAvailable = monthOptions.some((o) => o.value === prevMonthOfCurrent);
  const samePrevMonthActive = samePeriod && prevMonthAvailable && monthSelection.compare === prevMonthOfCurrent;
  const handleSamePrevMonthPreset = () => {
    if (samePrevMonthActive) {
      setSamePeriod(false);
      return;
    }
    if (!prevMonthAvailable) return;
    setMonthSelection((prev) => ({ ...prev, compare: prevMonthOfCurrent }));
    setSamePeriod(true);
  };
  const samePeriodMeta = isMonth ? comparisonState.data?.meta?.same_period : null;

  // Sorting: Default order BCVH by current week KPI rate (tỉ lệ đạt KPI 2026 của Tuần kỳ này) descending
  const [sortConfig, setSortConfig] = useState({ field: 'current_rate', direction: 'desc' });

  const totalRow = comparisonState.data?.total_row || null;

  // Order BCVH rows according to current week KPI rate (default descending)
  const rows = useMemo(() => {
    return sortBcvhWeeklyRows(comparisonState.data?.rows, {
      sortField: sortConfig.field,
      direction: sortConfig.direction,
    });
  }, [comparisonState.data?.rows, sortConfig]);

  const handleSort = (field) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'desc' ? 'asc' : 'desc' };
      }
      const isText = field === 'ma_bcvh' || field === 'ten_bcvh';
      return { field, direction: isText ? 'asc' : 'desc' };
    });
  };

  const handleToggleCurrentRateSort = () => handleSort('current_rate');

  const renderSortableTh = (field, label, { widthClass, borderClass = 'border-r border-slate-200', hoverClass = 'hover:bg-slate-200/80', nowrap = false } = {}) => {
    const isActive = sortConfig.field === field;
    return (
      <th
        key={field}
        onClick={field === 'current_rate' ? handleToggleCurrentRateSort : () => handleSort(field)}
        className={`py-2 px-1 text-center align-middle ${widthClass} ${borderClass} leading-snug cursor-pointer select-none transition-colors ${hoverClass} ${nowrap ? 'whitespace-nowrap' : ''} ${isActive ? 'bg-blue-100/90 font-black text-blue-950 shadow-2xs' : ''}`}
        title={`Sắp xếp theo ${label} (nhấp để đảo chiều)`}
      >
        <div className="inline-flex items-center justify-center gap-1">
          <span>{label}</span>
          {isActive ? (
            sortConfig.direction === 'desc' ? (
              <ArrowDown className="h-3 w-3 text-blue-900 shrink-0" />
            ) : (
              <ArrowUp className="h-3 w-3 text-blue-900 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="h-2.5 w-2.5 opacity-30 hover:opacity-80 shrink-0" />
          )}
        </div>
      </th>
    );
  };

  // PO B4: Use real display dates for in-progress weeks (e.g. 17/09–21/09/2026 for W38)
  const currentWeekRange = currentWeek ? formatWeekDateRange(currentWeek.display_start_date, currentWeek.display_end_date) : '';
  const compareWeekRange = compareWeek ? formatWeekDateRange(compareWeek.display_start_date, compareWeek.display_end_date) : '';

  // Month mode: when "cùng kỳ" is on, the table really covers the first N days of each month,
  // so headers show those cut ranges (from backend meta), never the full-month range.
  const monthRange = (month, cut) => {
    if (cut) return formatWeekDateRange(cut.from, cut.to);
    return month ? formatWeekDateRange(month.display_start_date, month.display_end_date) : '';
  };
  const currentMonthRange = monthRange(currentMonth, samePeriodMeta?.enabled ? samePeriodMeta.current_range : null);
  const compareMonthRange = monthRange(compareMonth, samePeriodMeta?.enabled ? samePeriodMeta.compare_range : null);
  const currentMonthName = currentMonth ? formatMonthLabel(currentMonth) : '';
  const compareMonthName = compareMonth ? formatMonthLabel(compareMonth) : '';

  const titleLine1 = isMonth
    ? `BẢNG TỔNG HỢP SO SÁNH CHẤT LƯỢNG F1.3 THEO THÁNG TẠI CÁC BCVH${samePeriodMeta?.enabled ? ' (CÙNG KỲ)' : ''}`
    : 'BẢNG TỔNG HỢP SO SÁNH CHẤT LƯỢNG F1.3 THEO TUẦN TẠI CÁC BCVH';
  const titleLine2 = isMonth
    ? `KỲ NÀY: ${currentMonthName || 'THÁNG HIỆN TẠI'} (${currentMonthRange || DASH}) • SO VỚI: ${compareMonthName || 'THÁNG SO SÁNH'} (${compareMonthRange || DASH})`
    : `KỲ NÀY: ${currentWeek?.label || 'TUẦN HIỆN TẠI'} (${currentWeekRange || DASH}) • SO VỚI: ${compareWeek?.label || 'TUẦN SO SÁNH'} (${compareWeekRange || DASH})`;

  // One descriptor per side so the shared table headers do not branch on week/month everywhere.
  const headerPeriod = (side) => {
    const week = side === 'current' ? currentWeek : compareWeek;
    const month = side === 'current' ? currentMonth : compareMonth;
    if (isMonth) {
      const cut = side === 'current' ? samePeriodMeta?.current_range : samePeriodMeta?.compare_range;
      const sameOn = Boolean(samePeriodMeta?.enabled && cut);
      return {
        name: side === 'current' ? currentMonthName : compareMonthName,
        range: side === 'current' ? currentMonthRange : compareMonthRange,
        yearText: '',
        dataThrough: !sameOn && month?.is_in_progress ? month.last_data_date : null,
      };
    }
    return {
      name: week?.label,
      range: side === 'current' ? currentWeekRange : compareWeekRange,
      yearText: ` (Năm ${week?.iso_year || ''})`,
      dataThrough: week?.is_in_progress && week?.last_data_date ? week.last_data_date : null,
    };
  };
  const headCurrent = headerPeriod('current');
  const headCompare = headerPeriod('compare');

  return (
    <section className="bcvh-weekly-operation-card w-full rounded-2xl border border-slate-300 bg-white p-3 sm:p-5 shadow-sm">
      {/* PO Requirement 2: Dedicated, Independent Filter Toolbar (đưa lên trên cùng để không cản trở chụp ảnh bảng dữ liệu) */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-700" />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
              Bộ lọc so sánh tuần/tháng độc lập
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div role="group" aria-label="Chọn kiểu kỳ so sánh" className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
              {[['week', 'Tuần'], ['month', 'Tháng']].map(([mode, text]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPeriodMode(mode)}
                  aria-pressed={periodMode === mode}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                    periodMode === mode ? 'bg-blue-700 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              {isMonth ? 'Tháng dương lịch (từ ngày 1 đến hết tháng)' : 'Chu kỳ tuần 7 ngày (Thứ Năm → Thứ Tư)'}
            </span>
          </div>
        </div>

        {isMonth ? (
          <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <WeekSelect
                label="Tháng kỳ này"
                value={monthSelection.current}
                options={monthOptions}
                emptyText="Chưa có dữ liệu tháng"
                disabled={monthsState.status !== 'success'}
                onChange={(value) => setMonthSelection((prev) => ({ ...prev, current: value }))}
              />
              <WeekNoteBadge week={currentMonth} />
            </div>
            <div>
              <WeekSelect
                label="Tháng so sánh"
                value={monthSelection.compare}
                options={monthOptions}
                emptyText="Chưa có dữ liệu tháng"
                disabled={monthsState.status !== 'success'}
                onChange={(value) => setMonthSelection((prev) => ({ ...prev, compare: value }))}
              />
              <WeekNoteBadge week={compareMonth} />
            </div>
            <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSamePrevMonthPreset}
              disabled={!samePrevMonthActive && !prevMonthAvailable}
              aria-pressed={samePrevMonthActive}
              title="So sánh tháng đang chọn với tháng liền trước, cùng số ngày đầu tháng"
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-2xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                samePrevMonthActive
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              So sánh cùng kỳ tháng trước
            </button>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-blue-400">
              <input
                type="checkbox"
                checked={samePeriod}
                onChange={(e) => setSamePeriod(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-700"
              />
              <span className="flex flex-col gap-0.5">
                <span>So sánh cùng kỳ</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Chỉ so sánh những ngày đầu tháng có dữ liệu ở cả hai tháng (ví dụ 01–05 của cả hai tháng).
                </span>
              </span>
            </label>
            </div>
          </div>
        ) : null}

        <div className={`mt-3.5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 ${isMonth ? 'hidden' : ''}`}>
          {/* Select Tuần kỳ này */}
          <div>
            <WeekSelect
              label="Tuần kỳ này"
              value={selection.current}
              options={weekOptions}
              disabled={weeksState.status !== 'success'}
              onChange={(value) => {
                setSelection((prev) => ({ ...prev, current: value }));
                const chosen = weekOptions.find((o) => o.value === value)?.week;
                if (chosen?.week_start) setAnchorDate(chosen.week_start);
                setAnchorNotice(null);
              }}
            />
            <WeekNoteBadge week={currentWeek} />
          </div>

          {/* Select Tuần so sánh */}
          <div>
            <WeekSelect
              label="Tuần so sánh"
              value={selection.compare}
              options={weekOptions}
              disabled={weeksState.status !== 'success'}
              onChange={(value) => setSelection((prev) => ({ ...prev, compare: value }))}
            />
            <WeekNoteBadge week={compareWeek} />
          </div>

          {/* PO Requirement 7, B1, B2: UI control to adjust current week anchor */}
          <div className="flex flex-col gap-1 text-xs font-bold text-slate-700">
            <span>Điều chỉnh mốc tuần hiện tại</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={anchorDate}
                disabled={weeksState.status !== 'success' || !weeksState.weeks.length}
                onChange={(e) => handleAnchorDateChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs hover:border-blue-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
                title="Chọn ngày để tự động căn về Thứ Năm của tuần đó và chọn tuần tương ứng"
              />
              {anchorDate && defaultAnchorDate && anchorDate !== defaultAnchorDate ? (
                <button
                  type="button"
                  onClick={handleResetAnchor}
                  className="inline-flex items-center gap-1 shrink-0 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                  title="Đặt lại về mốc tuần mới nhất của hệ thống"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mặc định</span>
                </button>
              ) : null}
            </div>
            <span className="text-[11px] font-normal text-slate-500">
              Chọn ngày bất kỳ sẽ tự động căn về Thứ Năm mở đầu tuần tương ứng.
            </span>
          </div>
        </div>

        {/* Anchor feedback notification */}
        {anchorNotice ? (
          <div
            className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
              anchorNotice.tone === 'warning'
                ? 'bg-amber-100/80 text-amber-900 border border-amber-200'
                : anchorNotice.tone === 'info'
                ? 'bg-blue-100/80 text-blue-900 border border-blue-200'
                : anchorNotice.tone === 'error'
                ? 'bg-rose-100/80 text-rose-900 border border-rose-200'
                : 'bg-emerald-100/80 text-emerald-900 border border-emerald-200'
            }`}
          >
            {anchorNotice.tone === 'warning' ? (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            ) : anchorNotice.tone === 'success' ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ) : (
              <Info className="h-3.5 w-3.5 shrink-0 text-blue-600" />
            )}
            <span>{anchorNotice.text}</span>
          </div>
        ) : null}

        {/* PO Requirement 5: Prominent visual warning when two weeks have different days with data */}
        {daysMismatch.isMismatch ? (
          <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-900 shadow-2xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <div className="flex flex-wrap items-center gap-2">
              <span>{daysMismatch.message || 'Lưu ý: Hai tuần có số ngày dữ liệu khác nhau'}</span>
              <span className="rounded bg-amber-200/80 px-2 py-0.5 font-semibold text-amber-950">
                {(isMonth ? currentMonthName : currentWeek?.label) || 'Kỳ này'}: {daysMismatch.daysA} ngày · {(isMonth ? compareMonthName : compareWeek?.label) || 'So sánh'}: {daysMismatch.daysB} ngày
              </span>
              {daysMismatch.suggestion ? (
                <span className="font-semibold text-amber-900">{daysMismatch.suggestion}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* "Cùng kỳ" đang bật: nói rõ khoảng ngày thực tế được so sánh */}
        {isMonth && samePeriodMeta?.enabled ? (
          <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-900 shadow-2xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Đang so sánh cùng kỳ {samePeriodMeta.day_count} ngày đầu tháng: {currentMonthName} ({currentMonthRange}) và {compareMonthName} ({compareMonthRange}).
            </span>
          </div>
        ) : null}
      </div>

      {isMonth && monthsState.status === 'error' ? (
        <ErrorState title="Không thể tải danh sách tháng" description={monthsState.error} />
      ) : null}

      {isMonth && monthsState.status === 'success' && !monthsState.months.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500 font-medium">
          Chưa có dữ liệu tháng.
        </div>
      ) : null}

      {!isMonth && weeksState.status === 'error' ? (
        <ErrorState title="Không thể tải danh sách tuần" description={weeksState.error} />
      ) : null}

      {!isMonth && weeksState.status === 'success' && !weeksState.weeks.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500 font-medium">
          Chưa có dữ liệu tuần.
        </div>
      ) : null}

      {/* Khối Báo cáo (Tiêu đề 2 dòng + Bảng số liệu) liền kề nhau để tối ưu chụp hình */}
      <div className="bcvh-weekly-report-capture-area pt-1">
        {/* Title Header (2 Lines) + Fit Mode Switch */}
        <div className="mb-4 border-b border-slate-200 pb-3 text-center relative">
          <h2 className="text-base sm:text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 leading-snug">
            {titleLine1}
          </h2>
          <p className="mt-1 text-xs sm:text-base font-black uppercase tracking-wide text-blue-900">
            {titleLine2}
          </p>
          <div className="mt-2 flex justify-center items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setFitMode(!fitMode)}
              className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors shadow-2xs"
            >
              {fitMode ? '🔍 Chế độ cuộn chi tiết' : '📱 Xem trọn bảng (Fit màn hình)'}
            </button>
          </div>
        </div>

        {comparisonState.status === 'error' ? (
          <ErrorState title={isMonth ? 'Không thể so sánh hai tháng đã chọn' : 'Không thể so sánh hai tuần đã chọn'} description={comparisonState.error} />
        ) : null}

        {comparisonState.status === 'loading' ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-500">
            <div className="flex items-center gap-3 text-sm font-bold">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span>{isMonth ? 'Đang tải số liệu bảng so sánh tháng...' : 'Đang tải số liệu bảng so sánh tuần...'}</span>
            </div>
          </div>
        ) : null}

        {/* PO Requirement 1: Table styled similarly to Operation Dashboard daily table */}
        {comparisonState.status === 'success' && comparisonState.data ? (
          <div
            ref={containerRef}
            className={`w-full ${
              fitMode
                ? 'overflow-hidden transition-all'
                : 'overflow-x-auto lg:overflow-x-visible'
            }`}
            style={fitMode && scaledHeight ? { height: `${scaledHeight}px` } : undefined}
          >
            <div
              style={
                fitMode
                  ? {
                      transform: `scale(${fitScale})`,
                      transformOrigin: 'top left',
                      width: `${(100 / fitScale).toFixed(2)}%`,
                    }
                  : undefined
              }
            >
              <table ref={tableRef} className="w-full text-left border-collapse table-fixed min-w-[1020px] lg:min-w-full">
                {/* Locked 11-column proportions */}
                <colgroup>
                  {/* ĐƠN VỊ (28%) */}
                  <col style={{ width: '5%' }} className="w-[5%]" />
                  <col style={{ width: '8%' }} className="w-[8%]" />
                  <col style={{ width: '15%' }} className="w-[15%]" />
                  {/* TUẦN KỲ NÀY (28%) */}
                  <col style={{ width: '9%' }} className="w-[9%]" />
                  <col style={{ width: '8%' }} className="w-[8%]" />
                  <col style={{ width: '11%' }} className="w-[11%]" />
                  {/* TUẦN SO SÁNH (28%) */}
                  <col style={{ width: '9%' }} className="w-[9%]" />
                  <col style={{ width: '8%' }} className="w-[8%]" />
                  <col style={{ width: '11%' }} className="w-[11%]" />
                  {/* SO SÁNH (16%) */}
                  <col style={{ width: '9%' }} className="w-[9%]" />
                  <col style={{ width: '7%' }} className="w-[7%]" />
                </colgroup>

                {/* Level 1: Grouped Headers with clean, non-overflowing typography */}
                <thead>
                  <tr className="border-b border-slate-300">
                    <th
                      colSpan={3}
                      className="bg-slate-100/90 text-slate-800 font-black uppercase tracking-wider text-center align-middle py-2.5 px-2 border-r border-slate-300 text-xs sm:text-sm md:text-base"
                    >
                      <div>ĐƠN VỊ</div>
                      <div className="text-[11px] sm:text-xs font-bold text-slate-500 tracking-normal mt-0.5">
                        06 BƯU CỤC VẬN HÀNH
                      </div>
                    </th>

                    {/* Tuần kỳ này group header */}
                    <th
                      colSpan={3}
                      className="bg-blue-100/90 text-blue-950 font-black uppercase tracking-wider text-center align-middle py-2 px-2 border-r border-blue-300 text-xs sm:text-sm md:text-base"
                    >
                      <div className="leading-snug">{isMonth ? 'THÁNG KỲ NÀY' : 'TUẦN KỲ NÀY'} ({headCurrent.name || 'KỲ NÀY'})</div>
                      <div className="text-[11px] sm:text-xs font-black text-rose-600 tracking-normal mt-0.5 leading-snug">
                        {headCurrent.range}{headCurrent.yearText}
                      </div>
                      {headCurrent.dataThrough ? (
                        <div className="mt-1">
                          <span className="inline-block rounded bg-blue-200/90 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-blue-950 tracking-normal">
                            Dữ liệu đến ngày {formatDateVN(headCurrent.dataThrough)}
                          </span>
                        </div>
                      ) : null}
                    </th>

                    {/* Tuần so sánh group header */}
                    <th
                      colSpan={3}
                      className="bg-emerald-100/90 text-emerald-950 font-black uppercase tracking-wider text-center align-middle py-2 px-2 border-r border-emerald-300 text-xs sm:text-sm md:text-base"
                    >
                      <div className="leading-snug">{isMonth ? 'THÁNG SO SÁNH' : 'TUẦN SO SÁNH'} ({headCompare.name || 'SO SÁNH'})</div>
                      <div className="text-[11px] sm:text-xs font-black text-rose-600 tracking-normal mt-0.5 leading-snug">
                        {headCompare.range}{headCompare.yearText}
                      </div>
                      {headCompare.dataThrough ? (
                        <div className="mt-1">
                          <span className="inline-block rounded bg-emerald-200/90 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-950 tracking-normal">
                            Dữ liệu đến ngày {formatDateVN(headCompare.dataThrough)}
                          </span>
                        </div>
                      ) : null}
                    </th>

                    {/* So sánh group header */}
                    <th
                      colSpan={2}
                      className="bg-amber-100/90 text-amber-950 font-black uppercase tracking-wider text-center align-middle py-2 px-2 text-xs sm:text-sm md:text-base"
                    >
                      <div className="leading-snug">SO SÁNH</div>
                      <div className="text-[11px] sm:text-xs font-semibold text-slate-600 tracking-normal mt-0.5 leading-snug">
                        {isMonth ? 'Kỳ này so với tháng so sánh' : 'Kỳ này so với tuần so sánh'}
                      </div>
                    </th>
                  </tr>

                {/* Level 2: Exact Column Headers without text overflow */}
                <tr className="border-b-2 border-slate-300 bg-slate-50/95 text-slate-800 text-[11px] sm:text-xs md:text-sm font-extrabold">
                  {/* Identity (28%) */}
                  <th className="py-2 px-1 text-center align-middle w-[5%] border-r border-slate-200 whitespace-nowrap">
                    STT
                  </th>
                  {renderSortableTh('ma_bcvh', 'Mã bưu cục', { widthClass: 'w-[8%]', borderClass: 'border-r border-slate-200', hoverClass: 'hover:bg-slate-200/80', nowrap: true })}
                  {renderSortableTh('ten_bcvh', 'Tên bưu cục', { widthClass: 'w-[15%]', borderClass: 'border-r border-slate-300', hoverClass: 'hover:bg-slate-200/80', nowrap: true })}

                  {/* Tuần kỳ này (28%) */}
                  {renderSortableTh('current_volume', 'Sản lượng đo kiểm', { widthClass: 'w-[9%]', borderClass: 'border-r border-slate-200', hoverClass: 'hover:bg-blue-100/90' })}
                  {renderSortableTh('current_passed', 'Đạt', { widthClass: 'w-[8%]', borderClass: 'border-r border-slate-200', hoverClass: 'hover:bg-blue-100/90' })}
                  {renderSortableTh('current_rate', 'Tỷ lệ đạt KPI 2026', { widthClass: 'w-[11%]', borderClass: 'border-r border-blue-300', hoverClass: 'hover:bg-blue-100/90' })}

                  {/* Tuần so sánh (28%) */}
                  {renderSortableTh('compare_volume', 'Sản lượng đo kiểm', { widthClass: 'w-[9%]', borderClass: 'border-r border-slate-200', hoverClass: 'hover:bg-emerald-100/90' })}
                  {renderSortableTh('compare_passed', 'Đạt', { widthClass: 'w-[8%]', borderClass: 'border-r border-slate-200', hoverClass: 'hover:bg-emerald-100/90' })}
                  {renderSortableTh('compare_rate', 'Tỷ lệ đạt KPI 2026', { widthClass: 'w-[11%]', borderClass: 'border-r border-emerald-300', hoverClass: 'hover:bg-emerald-100/90' })}

                  {/* So sánh (16%) */}
                  {renderSortableTh('rate_delta', 'Tăng/giảm tỷ lệ', { widthClass: 'w-[9%]', borderClass: 'border-r border-slate-200', hoverClass: 'hover:bg-amber-100/90' })}
                  {renderSortableTh('volume_delta', 'Chênh lệch SL', { widthClass: 'w-[7%]', borderClass: '', hoverClass: 'hover:bg-amber-100/90' })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm md:text-base">
                {/* Row 1: TỔNG CỘNG (First Row, matching Operation Dashboard pattern) */}
                {totalRow ? (
                  <tr className="bg-blue-50/90 text-slate-950 font-black border-b-2 border-blue-300 hover:bg-blue-100/70 transition-colors">
                    <td className="py-2 px-1 text-center text-slate-500 font-extrabold border-r border-blue-200 whitespace-nowrap">
                      {DASH}
                    </td>
                    <td className="py-2 px-1 text-center text-slate-500 font-extrabold border-r border-blue-200 whitespace-nowrap">
                      {DASH}
                    </td>
                    <td className="py-2 px-2 text-left font-black text-blue-950 border-r border-slate-300 whitespace-nowrap">
                      {totalRow.ten_bcvh}
                    </td>

                    {/* Tuần kỳ này */}
                    <td className="py-2 px-2 text-right font-black tabular-nums border-r border-blue-200 whitespace-nowrap">
                      {formatVolume(totalRow.current.volume)}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-emerald-700 tabular-nums border-r border-blue-200 whitespace-nowrap">
                      {formatVolume(totalRow.current.passed)}
                    </td>
                    <td className="py-2 px-1 text-center tabular-nums border-r border-blue-300 whitespace-nowrap">
                      {renderRateBadge(totalRow.current.rate)}
                    </td>

                    {/* Tuần so sánh */}
                    <td className="py-2 px-2 text-right font-black tabular-nums border-r border-emerald-200 whitespace-nowrap">
                      {formatVolume(totalRow.compare.volume)}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-emerald-700 tabular-nums border-r border-emerald-200 whitespace-nowrap">
                      {formatVolume(totalRow.compare.passed)}
                    </td>
                    <td className="py-2 px-1 text-center tabular-nums border-r border-emerald-300 whitespace-nowrap">
                      {renderRateBadge(totalRow.compare.rate)}
                    </td>

                    {/* Chênh lệch */}
                    <td className="py-2 px-2 text-right tabular-nums border-r border-slate-200 whitespace-nowrap">
                      {renderDeltaBadge(totalRow.rate_delta)}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums font-bold text-slate-700 whitespace-nowrap">
                      {formatSignedVolumeDelta(totalRow.volume_delta)}
                    </td>
                  </tr>
                ) : null}

                {/* Rows 2..7: The 06 Canonical BCVH */}
                {rows.map((row, index) => {
                  const color = BCVH_COLORS[row.ma_bcvh] || '#64748b';
                  return (
                    <tr key={row.ma_bcvh} className="hover:bg-slate-50/90 transition-colors font-bold text-slate-800">
                      <td className="py-2 px-1 text-center font-extrabold text-slate-600 border-r border-slate-200 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="py-2 px-1 text-center font-bold text-slate-700 border-r border-slate-200 tabular-nums whitespace-nowrap">
                        {row.ma_bcvh}
                      </td>
                      <td className="py-2 px-2 text-left font-black text-slate-900 border-r border-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="h-3.5 w-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span>{row.ten_bcvh}</span>
                        </div>
                      </td>

                      {/* Tuần kỳ này */}
                      <td className="py-2 px-2 text-right font-bold text-slate-800 tabular-nums border-r border-slate-200 whitespace-nowrap">
                        {formatVolume(row.current.volume)}
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-emerald-600 tabular-nums border-r border-slate-200 whitespace-nowrap">
                        {formatVolume(row.current.passed)}
                      </td>
                      <td className="py-2 px-1 text-center tabular-nums border-r border-blue-300 whitespace-nowrap">
                        {renderRateBadge(row.current.rate)}
                      </td>

                      {/* Tuần so sánh */}
                      <td className="py-2 px-2 text-right font-bold text-slate-800 tabular-nums border-r border-slate-200 whitespace-nowrap">
                        {formatVolume(row.compare.volume)}
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-emerald-600 tabular-nums border-r border-slate-200 whitespace-nowrap">
                        {formatVolume(row.compare.passed)}
                      </td>
                      <td className="py-2 px-1 text-center tabular-nums border-r border-emerald-300 whitespace-nowrap">
                        {renderRateBadge(row.compare.rate)}
                      </td>

                      {/* Chênh lệch */}
                      <td className="py-2 px-2 text-right tabular-nums border-r border-slate-200 whitespace-nowrap">
                        {renderDeltaBadge(row.rate_delta)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-xs font-semibold text-slate-600 whitespace-nowrap">
                        {formatSignedVolumeDelta(row.volume_delta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      </div>
    </section>
  );
}
