import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer } from '../../components/shared/SharedComponents.jsx';
import { useIndicator } from '../indicator/IndicatorContext.js';
import { F13_INDICATOR, indicatorTheme } from '../indicator/indicatorConfig.js';
import { fetchLayout, resolvePeriod, fetchWhyBcvh, fetchWhyRoutes } from './api/f13v2Api.js';
import api from '../../api/client.js';
import { buildScopedUnitOptions } from './f13v2Helpers.js';
import F13V2WhyFilterBar from './components/F13V2WhyFilterBar.jsx';
import F13V2WhyFreshnessNotice from './components/F13V2WhyFreshnessNotice.jsx';
import F13V2WhyDiagnosticCard from './components/F13V2WhyDiagnosticCard.jsx';
import F13V2WhyRouteTable from './components/F13V2WhyRouteTable.jsx';
import { separateRouteScopes } from './f13WhyHelpers.js';

export default function F13V2WhyPage() {
  const indicator = useIndicator() || F13_INDICATOR;
  const theme = indicatorTheme(indicator);

  const [searchParams, setSearchParams] = useSearchParams();

  // Layout & Meta states
  const [layout, setLayout] = useState(null);
  const [latestDate, setLatestDate] = useState(null);
  const [metaUnits, setMetaUnits] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [months, setMonths] = useState([]);

  // URL parameters: from, to, week, month, bcvh
  const fromParam = searchParams.get('from') || '';
  const toParam = searchParams.get('to') || '';
  const weekParam = searchParams.get('week') || '';
  const monthParam = searchParams.get('month') || '';

  // Determine periodMode from URL params
  const periodMode = useMemo(() => {
    if (weekParam) return 'week';
    if (monthParam) return 'month';
    return 'day';
  }, [weekParam, monthParam]);

  // Scoped unit contract: if user is locked to one unit, they cannot see 'all'
  const ownBcvh = layout?.units?.allow_all === false && layout.units.bcvh?.length === 1 ? layout.units.bcvh[0] : null;
  const bcvhParam = searchParams.get('bcvh') || ownBcvh || 'all';

  // Unit options from layout contract
  const unitOptions = useMemo(() => {
    return buildScopedUnitOptions({ layout, metaUnits });
  }, [layout, metaUnits]);

  // Query Data states
  const [dataState, setDataState] = useState({
    loading: true,
    bcvhData: null,
    routesData: null,
    error: null,
  });

  // 1. Initial Load: Layout, Meta, Weeks, Months
  useEffect(() => {
    let active = true;

    Promise.all([
      fetchLayout(indicator.apiBase).catch(() => null),
      api.get('/f13/dashboard/meta').catch(() => null),
      api.get('/time-axis/weeks').catch(() => null),
      api.get('/time-axis/months').catch(() => null),
    ]).then(([layoutRes, metaRes, weeksRes, monthsRes]) => {
      if (!active) return;
      if (layoutRes) setLayout(layoutRes);

      const meta = metaRes?.data?.data || {};
      const maxDate = meta.max_date || new Date().toISOString().slice(0, 10);
      setLatestDate(maxDate);

      if (meta.bcvh_units && Array.isArray(meta.bcvh_units)) {
        setMetaUnits(meta.bcvh_units);
      }

      const rawWeeks = weeksRes?.data?.data?.weeks || [];
      const sortedWeeks = [...rawWeeks].sort((a, b) => (b.week_start || '').localeCompare(a.week_start || ''));
      setWeeks(sortedWeeks);

      const rawMonths = monthsRes?.data?.data?.months || [];
      const sortedMonths = [...rawMonths].sort((a, b) => (b.month_id || '').localeCompare(a.month_id || ''));
      setMonths(sortedMonths);
    });

    return () => {
      active = false;
    };
  }, [indicator.apiBase]);

  // 2. Default Anchor Resolution: if URL has no date/week/month, resolve latest day anchor
  useEffect(() => {
    if (fromParam || toParam || weekParam || monthParam) return;
    let active = true;

    resolvePeriod({ kind: 'latest' }, indicator.apiBase)
      .then((res) => {
        if (!active || !res?.day) return;
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (!next.get('from')) next.set('from', res.day);
            if (!next.get('to')) next.set('to', res.day);
            return next;
          },
          { replace: true }
        );
      })
      .catch(() => {
        if (latestDate && active) {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              if (!next.get('from')) next.set('from', latestDate);
              if (!next.get('to')) next.set('to', latestDate);
              return next;
            },
            { replace: true }
          );
        }
      });

    return () => {
      active = false;
    };
  }, [fromParam, toParam, weekParam, monthParam, latestDate, indicator.apiBase, setSearchParams]);

  // 3. Fetch Why data whenever period or unit changes
  const fetchData = useCallback(async () => {
    // If not ready with any period parameter yet, wait for default resolution
    if (!fromParam && !toParam && !weekParam && !monthParam) return;

    setDataState((prev) => ({ ...prev, loading: true, error: null }));

    const query = {};
    if (periodMode === 'week') {
      query.week = weekParam || (weeks[0]?.week_id ?? '');
    } else if (periodMode === 'month') {
      query.month = monthParam || (months[0]?.month_id ?? '');
    } else {
      query.from = fromParam || latestDate;
      query.to = toParam || latestDate;
    }

    if (bcvhParam && bcvhParam !== 'all') {
      query.bcvh = bcvhParam;
    }

    try {
      const [bcvhData, routesData] = await Promise.all([
        fetchWhyBcvh(query, indicator.apiBase),
        fetchWhyRoutes(query, indicator.apiBase),
      ]);

      setDataState({
        loading: false,
        bcvhData,
        routesData,
        error: null,
      });
    } catch (err) {
      setDataState({
        loading: false,
        bcvhData: null,
        routesData: null,
        error: err?.response?.data?.error?.message || err?.message || 'Không thể tải dữ liệu phân tích nguyên nhân.',
      });
    }
  }, [periodMode, fromParam, toParam, weekParam, monthParam, bcvhParam, latestDate, weeks, months, indicator.apiBase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter Bar Handlers
  const handlePeriodModeChange = (newMode) => {
    if (newMode === periodMode) return;

    const next = new URLSearchParams(searchParams);
    next.delete('from');
    next.delete('to');
    next.delete('week');
    next.delete('month');

    if (newMode === 'week') {
      const defWeek = weeks[0]?.week_id || '2026-W44';
      next.set('week', defWeek);
    } else if (newMode === 'month') {
      const defMonth = months[0]?.month_id || '2026-10';
      next.set('month', defMonth);
    } else {
      const defDay = latestDate || '2026-11-04';
      next.set('from', defDay);
      next.set('to', defDay);
    }

    setSearchParams(next);
  };

  const handleFromDateChange = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set('from', val);
    else next.delete('from');
    setSearchParams(next);
  };

  const handleToDateChange = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set('to', val);
    else next.delete('to');
    setSearchParams(next);
  };

  const handleWeekChange = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set('week', val);
    else next.delete('week');
    setSearchParams(next);
  };

  const handleMonthChange = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set('month', val);
    else next.delete('month');
    setSearchParams(next);
  };

  const handleBcvhChange = (val) => {
    const next = new URLSearchParams(searchParams);
    if (!val || val === 'all') next.delete('bcvh');
    else next.set('bcvh', val);
    setSearchParams(next);
  };

  // Period label for presentation
  const periodLabel = useMemo(() => {
    if (periodMode === 'week') {
      const wObj = weeks.find((w) => w.week_id === (weekParam || weeks[0]?.week_id));
      return wObj?.label || weekParam || 'Tuần';
    }
    if (periodMode === 'month') {
      const mObj = months.find((m) => m.month_id === (monthParam || months[0]?.month_id));
      return mObj?.label || monthParam || 'Tháng';
    }
    if (fromParam === toParam) return `Ngày ${toParam || latestDate || ''}`;
    return `${fromParam} đến ${toParam}`;
  }, [periodMode, weekParam, monthParam, fromParam, toParam, latestDate, weeks, months]);

  // Pick target BCVH row and postman routes
  const { currentBcvhRow, bcvhDisplayName } = useMemo(() => {
    const rows = dataState.bcvhData?.rows || [];
    if (bcvhParam && bcvhParam !== 'all') {
      const found = rows.find((r) => r.ma_bcvh === bcvhParam);
      return {
        currentBcvhRow: found || rows[0] || null,
        bcvhDisplayName: found?.ten_bcvh || `BCVH ${bcvhParam}`,
      };
    }
    // All units selected: if total exists use total, otherwise first unit
    const total = dataState.bcvhData?.total || null;
    if (total) {
      return {
        currentBcvhRow: { ...total, ten_bcvh: 'Toàn tỉnh (Tất cả BCVH)' },
        bcvhDisplayName: 'Toàn tỉnh (Tất cả BCVH)',
      };
    }
    return {
      currentBcvhRow: rows[0] || null,
      bcvhDisplayName: rows[0]?.ten_bcvh || 'Tất cả BCVH',
    };
  }, [dataState.bcvhData, bcvhParam]);

  const allRoutes = useMemo(() => dataState.routesData?.rows || [], [dataState.routesData]);
  const { postmanRoutes } = useMemo(() => separateRouteScopes(allRoutes), [allRoutes]);

  const meta = dataState.bcvhData?.meta || dataState.routesData?.meta || null;

  return (
    <PageContainer
      accentClassName={theme.accentBar}
      badge={<span className={`rounded-full border px-3 py-0.5 text-sm font-black ${theme.chip}`}>{indicator.moduleLabel}</span>}
      title={`${indicator.fullTitle} – Phân tích nguyên nhân`}
      subtitle="Chẩn đoán bức tranh nguyên nhân không đạt chỉ tiêu F1.3 theo bưu cục và danh sách tuyến phát cần chú ý."
    >
      <div className="space-y-4">
        {/* Tier 1-3 Filter Toolbar */}
        <F13V2WhyFilterBar
          periodMode={periodMode}
          onPeriodModeChange={handlePeriodModeChange}
          fromDate={fromParam || latestDate || ''}
          toDate={toParam || latestDate || ''}
          onFromDateChange={handleFromDateChange}
          onToDateChange={handleToDateChange}
          weekId={weekParam || weeks[0]?.week_id || ''}
          onWeekChange={handleWeekChange}
          availableWeeks={weeks}
          monthId={monthParam || months[0]?.month_id || ''}
          onMonthChange={handleMonthChange}
          availableMonths={months}
          bcvh={bcvhParam}
          onBcvhChange={handleBcvhChange}
          unitOptions={unitOptions}
          onRefresh={fetchData}
          loading={dataState.loading}
        />

        {/* Freshness & Multi-day repeat warnings */}
        <F13V2WhyFreshnessNotice meta={meta} />

        {/* Error State */}
        {dataState.error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 font-medium">
            <p className="font-bold">Lỗi tải dữ liệu phân tích nguyên nhân:</p>
            <p className="mt-1">{dataState.error}</p>
          </div>
        )}

        {/* Loading Spinner */}
        {dataState.loading && (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span>Đang tải bức tranh phân tích nguyên nhân...</span>
            </div>
          </div>
        )}

        {/* Loaded Content */}
        {!dataState.loading && !dataState.error && (
          <>
            {/* Step 1 Block 1: BCVH Level Diagnostic Card */}
            {currentBcvhRow && (
              <F13V2WhyDiagnosticCard
                bcvhRow={currentBcvhRow}
                postmanRoutes={postmanRoutes}
                periodLabel={periodLabel}
              />
            )}

            {/* Step 1 Block 2: Route Level Ranking & Cause Breakdown Table */}
            <F13V2WhyRouteTable
              routes={allRoutes}
              bcvhName={bcvhDisplayName}
              periodLabel={periodLabel}
            />
          </>
        )}
      </div>
    </PageContainer>
  );
}
