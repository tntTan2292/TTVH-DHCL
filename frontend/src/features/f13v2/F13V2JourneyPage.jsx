import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, BarChart2, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../api/client.js';
import { PageContainer } from '../../components/common/Containers.jsx';
import { nextSortState } from '../../components/common/tableSort.js';
import { useIndicator } from '../indicator/IndicatorContext.js';
import { indicatorTheme, F13_INDICATOR } from '../indicator/indicatorConfig.js';
import { fetchJourneyParcels, fetchJourneyRoutes, fetchLayout, resolvePeriod } from './api/f13v2Api.js';
import { buildScopedUnitOptions } from './f13v2Helpers.js';
import {
  JOURNEY_MILESTONES,
  coveragePercent,
  formatPeriodDisplay,
} from './journeyHelpers.js';
import F13V2JourneyRouteTable from './components/F13V2JourneyRouteTable.jsx';
import F13V2JourneyParcelTable from './components/F13V2JourneyParcelTable.jsx';
import F13V2JourneyParcelModal from './components/F13V2JourneyParcelModal.jsx';

const TEXT_SORT_FIELDS = ['ma_bg', 'ten_buu_ta', 'danh_gia', 'ma_lo'];

const TABS = [
  { id: 'day', label: 'Theo ngày', icon: CalendarDays },
  { id: 'week', label: 'Theo tuần', icon: BarChart2 },
  { id: 'month', label: 'Theo tháng', icon: Activity },
];

// F13-JOURNEY-ROUTE-02 U1: "Hành trình theo tuyến phát" rebuilt
// Common F1.3 period filter (Ngày/Tuần/Tháng), grouped by BCVH in API order,
// Không đạt beside Đạt stage hours, slowest_leg marked, postmen with volume,
// non-postman and other groups at bottom, title "Bưu tá" everywhere, route parcels click, RANGE_TOO_LONG alert.
export default function F13V2JourneyPage() {
  const indicator = useIndicator() || F13_INDICATOR;
  const theme = indicatorTheme(indicator);
  const [searchParams, setSearchParams] = useSearchParams();

  // Period query params (supporting from/to, week, month, and legacy date)
  const fromParam = searchParams.get('from') || searchParams.get('date') || '';
  const toParam = searchParams.get('to') || searchParams.get('date') || '';
  const weekParam = searchParams.get('week') || '';
  const monthParam = searchParams.get('month') || '';
  const bcvhParam = searchParams.get('bcvh') || 'all';
  const routeParam = searchParams.get('route') || '';
  const searchParam = searchParams.get('search') || '';
  const onlyKhongTronLo = searchParams.get('khong_tron_lo') === '1';

  // Period mode determined by URL
  const periodMode = useMemo(() => {
    if (weekParam) return 'week';
    if (monthParam) return 'month';
    return 'day';
  }, [weekParam, monthParam]);

  const [layout, setLayout] = useState(null);
  const [latestDate, setLatestDate] = useState(null);
  const [metaUnits, setMetaUnits] = useState([]);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);

  const [routeState, setRouteState] = useState({ loading: true, data: null, error: null, isRangeTooLong: false });
  const [parcelState, setParcelState] = useState({ loading: true, data: null, error: null });
  const [parcelSort, setParcelSort] = useState({ field: 'tms_ptc', direction: 'desc' });
  const [{ page, pageSize }, setPagination] = useState({ page: 1, pageSize: 20 });
  const [searchText, setSearchText] = useState(searchParam);
  const [selectedRouteObj, setSelectedRouteObj] = useState(null);
  const [popupRow, setPopupRow] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const updateParams = useCallback((patch) => {
    setSearchParams((previous) => {
      const next = new globalThis.URLSearchParams(previous);
      // Remove legacy 'date' param when transitioning to from/to
      next.delete('date');
      Object.entries(patch).forEach(([key, value]) => {
        if (value && value !== 'all') next.set(key, value);
        else next.delete(key);
      });
      return next;
    }, { replace: true });
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [setSearchParams]);

  // Initial load: Layout, Meta, Weeks, Months
  useEffect(() => {
    let active = true;
    Promise.all([
      fetchLayout().catch(() => null),
      api.get('/f13/dashboard/meta').catch(() => null),
      api.get('/f13/ranking/bcvh/weeks').catch(() => null),
      api.get('/f13/ranking/bcvh/months').catch(() => null),
    ]).then(([layoutData, metaResponse, weeksResponse, monthsResponse]) => {
      if (!active) return;
      setLayout(layoutData);
      const meta = metaResponse?.data?.data || {};
      const maxDate = meta.max_date || new Date().toISOString().slice(0, 10);
      setLatestDate(maxDate);
      setMetaUnits(meta.bcvh_units || []);

      const wList = weeksResponse?.data?.data?.weeks || [];
      const mList = monthsResponse?.data?.data?.months || [];
      setAvailableWeeks(wList);
      setAvailableMonths(mList);
    });
    return () => { active = false; };
  }, []);

  // When no period is in the URL: default to the latest date
  useEffect(() => {
    if (fromParam || toParam || weekParam || monthParam) return undefined;
    let active = true;
    resolvePeriod({ kind: 'latest' })
      .then((result) => {
        if (active && result?.day) {
          updateParams({ from: result.day, to: result.day });
        }
      })
      .catch(() => {
        if (active && latestDate) {
          updateParams({ from: latestDate, to: latestDate });
        }
      });
    return () => { active = false; };
  }, [fromParam, toParam, weekParam, monthParam, latestDate, updateParams]);

  // Handle switching tabs (Ngày / Tuần / Tháng)
  const handlePeriodModeChange = (targetMode) => {
    if (targetMode === periodMode) return;
    if (targetMode === 'week') {
      const defaultWeek = availableWeeks[0]?.week_id || '2026-W42';
      updateParams({ week: defaultWeek, from: '', to: '', month: '', route: '' });
    } else if (targetMode === 'month') {
      const defaultMonth = availableMonths[0]?.month_id || '2026-10';
      updateParams({ month: defaultMonth, from: '', to: '', week: '', route: '' });
    } else {
      const defaultDay = latestDate || new Date().toISOString().slice(0, 10);
      updateParams({ from: defaultDay, to: defaultDay, week: '', month: '', route: '' });
    }
    setSelectedRouteObj(null);
  };

  // Build active query period object. A string key keeps the object stable while meta loads (no refetch of the same period).
  const periodKey = periodMode === 'week'
    ? `week|${weekParam || availableWeeks[0]?.week_id || ''}`
    : periodMode === 'month'
      ? `month|${monthParam || availableMonths[0]?.month_id || ''}`
      : `day|${fromParam || latestDate || ''}|${toParam || latestDate || ''}`;
  const queryPeriod = useMemo(() => {
    const [kind, a = '', b = ''] = periodKey.split('|');
    if (kind === 'week') return { week: a || undefined };
    if (kind === 'month') return { month: a || undefined };
    return { from: a, to: b };
  }, [periodKey]);

  // Fetch routes data whenever queryPeriod, BCVH, or refreshTick changes
  useEffect(() => {
    if (!queryPeriod.from && !queryPeriod.week && !queryPeriod.month) return undefined;
    let active = true;
    setRouteState((previous) => ({ ...previous, loading: true, error: null, isRangeTooLong: false }));

    fetchJourneyRoutes({
      ...queryPeriod,
      maBcvh: bcvhParam,
    })
      .then((data) => {
        if (active) setRouteState({ loading: false, data, error: null, isRangeTooLong: false });
      })
      .catch((error) => {
        if (!active) return;
        const errCode = error?.response?.data?.error?.code || '';
        const errMsg = error?.response?.data?.error?.message || error?.message || 'Không tải được hành trình.';
        const isRangeTooLong = errCode === 'RANGE_TOO_LONG' || errMsg.includes('RANGE_TOO_LONG') || errMsg.includes('93 ngày');

        setRouteState({
          loading: false,
          data: null,
          error: isRangeTooLong ? 'Khoảng thời gian xem tối đa 93 ngày. Vui lòng chọn khoảng thời gian ngắn hơn.' : errMsg,
          isRangeTooLong,
        });
      });

    return () => { active = false; };
  }, [queryPeriod, bcvhParam, refreshTick]);

  // Fetch parcels data whenever period, unit, route, pagination, or refreshTick changes
  useEffect(() => {
    if (!queryPeriod.from && !queryPeriod.week && !queryPeriod.month) return undefined;
    let active = true;
    setParcelState((previous) => ({ ...previous, loading: true, error: null }));

    fetchJourneyParcels({
      ...queryPeriod,
      maBcvh: bcvhParam,
      route: routeParam,
      search: searchParam,
      onlyKhongTronLo,
      sort: parcelSort.field,
      order: parcelSort.direction,
      page,
      pageSize,
    })
      .then((data) => {
        if (active) setParcelState({ loading: false, data, error: null });
      })
      .catch((error) => {
        if (active) {
          const errCode = error?.response?.data?.error?.code || '';
          const errMsg = error?.response?.data?.error?.message || error?.message || 'Không tải được bưu gửi.';
          const isRangeTooLong = errCode === 'RANGE_TOO_LONG' || errMsg.includes('RANGE_TOO_LONG') || errMsg.includes('93 ngày');
          setParcelState({
            loading: false,
            data: null,
            error: isRangeTooLong ? 'Khoảng thời gian xem tối đa 93 ngày. Vui lòng chọn khoảng thời gian ngắn hơn.' : errMsg,
          });
        }
      });

    return () => { active = false; };
  }, [queryPeriod, bcvhParam, routeParam, searchParam, onlyKhongTronLo, parcelSort, page, pageSize, refreshTick]);

  // Scoped unit options
  const unitOptions = useMemo(() => buildScopedUnitOptions({ layout, metaUnits }), [layout, metaUnits]);
  const allowAll = layout?.units?.allow_all === true;

  const routes = routeState.data?.routes;
  const coverage = routeState.data?.meta?.coverage;
  const lotSummary = routeState.data?.meta?.lots;

  // Period label for headers and camera exports
  const periodLabel = useMemo(() => {
    return formatPeriodDisplay({
      periodMode,
      fromDate: fromParam,
      toDate: toParam,
      weekId: weekParam,
      availableWeeks,
      monthId: monthParam,
      availableMonths,
      latestDate,
    });
  }, [periodMode, fromParam, toParam, weekParam, availableWeeks, monthParam, availableMonths, latestDate]);

  // Selected route name
  const selectedRouteName = useMemo(() => {
    if (!routeParam) return '';
    if (selectedRouteObj) return selectedRouteObj.ten_tuyen || selectedRouteObj.ma_tuyen || routeParam;
    const found = routes?.find((r) => (r.filter?.route || r.ma_tuyen) === routeParam);
    return found?.ten_tuyen || found?.ma_tuyen || routeParam;
  }, [routeParam, selectedRouteObj, routes]);

  // Clicking a route row opens the popup with parcels of that postman + route (J8)
  const handleSelectRoute = (row) => {
    if (!row) {
      setPopupRow(null);
      return;
    }
    setPopupRow(row);
  };

  return (
    <PageContainer
      accentClassName={theme.accentBar}
      badge={<span className={`rounded-full border px-3 py-0.5 text-sm font-black ${theme.chip}`}>F1.3</span>}
      title="F1.3 – Hành trình bưu gửi"
      subtitle="Từ lúc quét TMS xuống sàn Khai thác cấp 1 đến khi phát thành công. Phân tích thời gian từng chặng và bưu gửi Không đạt."
    >
      <div className="space-y-4">
        {/* J1: Common F1.3 Period Filter Bar */}
        <div
          data-no-capture="true"
          className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-sm"
        >
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
                    onClick={() => handlePeriodModeChange(tab.id)}
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
              {/* Day Mode */}
              {periodMode === 'day' && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1">
                    <span className="text-xs font-semibold text-slate-500">Từ</span>
                    <input
                      type="date"
                      value={fromParam}
                      onChange={(e) => updateParams({ from: e.target.value, route: '' })}
                      className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1">
                    <span className="text-xs font-semibold text-slate-500">Đến</span>
                    <input
                      type="date"
                      value={toParam}
                      onChange={(e) => updateParams({ to: e.target.value, route: '' })}
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
                    value={weekParam || (availableWeeks[0]?.week_id ?? '')}
                    onChange={(e) => updateParams({ week: e.target.value, route: '' })}
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
                    value={monthParam || (availableMonths[0]?.month_id ?? '')}
                    onChange={(e) => updateParams({ month: e.target.value, route: '' })}
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

              {/* BCVH Unit Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Bưu cục</span>
                <select
                  value={bcvhParam}
                  onChange={(e) => updateParams({ bcvh: e.target.value, route: '' })}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  {allowAll ? <option value="all">Tất cả BCVH</option> : null}
                  {unitOptions.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => setRefreshTick((t) => t + 1)}
                disabled={routeState.loading}
                title="Tải lại dữ liệu"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${routeState.loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            </div>
          </div>

          {/* Sub-bar: Search, Incomplete lot filter, Active route pill */}
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-2.5">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                updateParams({ search: searchText.trim() });
              }}
              className="flex items-center gap-2"
            >
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onBlur={() => updateParams({ search: searchText.trim() })}
                placeholder="Tìm số hiệu hoặc mã lô trong kỳ..."
                className="w-64 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1 text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400"
              />
            </form>

            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyKhongTronLo}
                onChange={(event) => updateParams({ khong_tron_lo: event.target.checked ? '1' : '' })}
                className="h-4 w-4 cursor-pointer rounded"
              />
              <span>Chỉ bưu gửi không trọn lô</span>
            </label>

            {routeParam && (
              <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
                <span>Đang lọc: {selectedRouteName}</span>
                <button
                  type="button"
                  onClick={() => handleSelectRoute(null)}
                  className="ml-1 rounded px-1 text-blue-600 hover:bg-blue-100 hover:text-blue-900 cursor-pointer"
                  title="Bỏ lọc theo tuyến"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Milestone Coverage Cards */}
        {coverage?.parcels ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {JOURNEY_MILESTONES.map((item, index) => (
              <div key={item.key} className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs">
                <div className="text-xs font-bold text-slate-500">Mốc {index + 1}: {item.label}</div>
                <div className="mt-0.5 text-lg font-black tabular-nums text-slate-900">
                  {coveragePercent(coverage[item.key], coverage.parcels)}
                </div>
                <div className="text-[11px] text-slate-500">
                  {(coverage[item.key] || 0).toLocaleString('vi-VN')} / {coverage.parcels.toLocaleString('vi-VN')} bưu gửi có mốc này
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Incomplete Lot Summary Card */}
        {lotSummary?.khong_tron_lo ? (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-2xs">
            <span className="font-black text-slate-900">
              Nguyên nhân khách quan, không trọn lô: {lotSummary.khong_tron_lo.toLocaleString('vi-VN')} bưu gửi
            </span>
            {' '}({lotSummary.khong_tron_lo_lots.toLocaleString('vi-VN')} lô), trên {lotSummary.failed.toLocaleString('vi-VN')} bưu gửi Không đạt của kỳ.
            <span className="block text-xs text-slate-500 mt-0.5">
              Lô có bưu gửi Không đạt về từ 2 đợt quét TMS trở lên. Mã lô lấy từ BF Phát: {lotSummary.failed_in_lot.toLocaleString('vi-VN')} bưu gửi Không đạt có mã lô.
            </span>
          </div>
        ) : null}

        <p className="text-xs text-slate-500">
          Mốc nào dữ liệu chưa có thì để trống. Số giờ tính theo đồng hồ thực tế giữa các mốc. Trung vị của từng chặng lấy trên các bưu gửi có đủ hai mốc của chặng đó.
        </p>

        {/* Route Table or Loading / Error / RANGE_TOO_LONG State */}
        {routeState.loading && !routes ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-500">
            Đang tải hành trình theo tuyến...
          </div>
        ) : routeState.error ? (
          <div className={`rounded-xl border p-4 text-center ${routeState.isRangeTooLong ? 'border-amber-300 bg-amber-50' : 'border-rose-200 bg-rose-50/70'}`}>
            <div className={`flex items-center justify-center gap-2 font-bold text-sm ${routeState.isRangeTooLong ? 'text-amber-900' : 'text-rose-800'}`}>
              <AlertCircle className={`h-5 w-5 flex-shrink-0 ${routeState.isRangeTooLong ? 'text-amber-600' : 'text-rose-600'}`} />
              <span>{routeState.error}</span>
            </div>
            {routeState.isRangeTooLong && (
              <p className="mt-1 text-xs text-amber-700">
                Quy định hệ thống: khoảng thời gian tra cứu hành trình tối đa 93 ngày. Vui lòng chọn phạm vi ngày ngắn hơn hoặc chọn xem theo tuần / tháng.
              </p>
            )}
          </div>
        ) : routes?.length ? (
          <F13V2JourneyRouteTable
            routes={routes}
            periodLabel={periodLabel}
            selectedRoute={routeParam}
            onSelectRoute={handleSelectRoute}
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm text-slate-500">
            Không có dữ liệu F1.3 cho kỳ đã chọn.
          </div>
        )}

        {/* Parcel Details Table */}
        <F13V2JourneyParcelTable
          data={parcelState.data}
          loading={parcelState.loading}
          error={parcelState.error}
          periodLabel={periodLabel}
          routeName={selectedRouteName}
          sort={parcelSort}
          onSort={(field) => {
            setParcelSort((current) => nextSortState(current, field, { textFields: TEXT_SORT_FIELDS }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          onPage={(newPage) => setPagination((prev) => ({ ...prev, page: newPage }))}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => {
            setPagination({ page: 1, pageSize: newSize });
          }}
        />

        {/* J8: Popup window displaying parcels of the clicked route + postman row */}
        <F13V2JourneyParcelModal
          isOpen={Boolean(popupRow)}
          onClose={() => setPopupRow(null)}
          row={popupRow}
          periodQuery={queryPeriod}
          periodLabel={periodLabel}
        />
      </div>
    </PageContainer>
  );
}
