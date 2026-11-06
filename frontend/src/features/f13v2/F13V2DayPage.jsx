import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIndicatorApi } from '../indicator/useIndicatorApi.js';
import { PageContainer } from '../../components/common/Containers.jsx';
import { useIndicator } from '../indicator/IndicatorContext.js';
import { indicatorTheme, indicatorTargetRate, F13_INDICATOR } from '../indicator/indicatorConfig.js';
import { BcvhUnitsProvider } from '../indicator/BcvhUnitsContext.js';
import { fetchLayout, resolvePeriod, fetchDaySummary } from './api/f13v2Api.js';
import { isBlockVisible, isDateRange } from './f13v2Helpers.js';
import F13V2FilterBar from './components/F13V2FilterBar.jsx';
import F13V2DaySummaryTable from './components/F13V2DaySummaryTable.jsx';
import F13V2RangeCompareTable from './components/F13V2RangeCompareTable.jsx';

import UnifiedCommandSummary from '../dashboard/components/UnifiedCommandSummary.jsx';
import BcvhOperationTableAdapter from '../dashboard/components/BcvhOperationTableAdapter.jsx';
import IntegratedTrendRiskWorkspace from '../dashboard/components/IntegratedTrendRiskWorkspace.jsx';
import OperatingPatternTabsCard from '../dashboard/components/OperatingPatternTabsCard.jsx';
import F11PairTableBlock from '../f11/components/F11PairTableBlock.jsx';
import F42SixBcvhStripBlock from '../f42/components/F42SixBcvhStripBlock.jsx';
import F42PostmanDashboardBlocks from '../f42/components/F42PostmanDashboardBlocks.jsx';
import { buildTrendlineRequestParams } from '../dashboard/components/qualityTrendlineWindow.js';
import { normalizeComboTrendlineItems } from '../dashboard/components/comboTrendlineData.js';

export default function F13V2DayPage() {
  const indicator = useIndicator() || F13_INDICATOR;
  const theme = indicatorTheme(indicator);
  const api = useIndicatorApi(); // the F1.3 report paths, rewritten to this indicator's endpoints

  const [searchParams, setSearchParams] = useSearchParams();

  const [layout, setLayout] = useState(null);
  const [latestDate, setLatestDate] = useState(null);
  const [metaUnits, setMetaUnits] = useState([]);

  // URL parameters: from, to, bcvh
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  // An account limited to one BCVH has no "all units": its page reads and says its own unit.
  const ownBcvh = layout?.units?.allow_all === false && layout.units.bcvh?.length === 1 ? layout.units.bcvh[0] : null;
  const bcvhParam = searchParams.get('bcvh') || ownBcvh || 'all';

  const [daySummaryState, setDaySummaryState] = useState({ loading: true, data: null, error: null });
  const [kpiState, setKpiState] = useState({ loading: true, data: null, error: null });
  const [trendState, setTrendState] = useState({ loading: true, data: [], error: null });
  const [trendMode, setTrendMode] = useState('30-days');

  // Load layout and metadata
  useEffect(() => {
    let active = true;

    Promise.all([
      fetchLayout(indicator.apiBase).catch((e) => {
        console.error('[F13V2DayPage] fetchLayout error:', e);
        return null;
      }),
      api.get('/f13/dashboard/meta').catch((e) => {
        console.error('[F13V2DayPage] meta error:', e);
        return null;
      }),
    ]).then(([layoutData, metaRes]) => {
      if (!active) return;
      if (layoutData) setLayout(layoutData);

      const meta = metaRes?.data?.data || {};
      const maxD = meta.max_date || new Date().toISOString().slice(0, 10);
      setLatestDate(maxD);

      if (meta.bcvh_units && Array.isArray(meta.bcvh_units)) {
        setMetaUnits(meta.bcvh_units);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // Synchronize initial URL params once latestDate or resolvePeriod is known
  // PO Rule: if no from/to in URL, resolve default anchor via GET /api/f13/v2/period/resolve?kind=latest
  useEffect(() => {
    if (fromParam && toParam) return;
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
      .catch((err) => {
        console.warn('[F13V2DayPage] resolvePeriod latest failed, fallback to latestDate:', err);
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
  }, [fromParam, toParam, latestDate, setSearchParams]);

  // Effective dates: use params if present, else fallback to latestDate
  const effectiveFrom = fromParam || latestDate || '';
  const effectiveTo = toParam || latestDate || '';

  // Scoped units for BcvhUnitsProvider (B2)
  const isScoped = layout?.units?.allow_all === false;
  const scopedUnits = useMemo(() => {
    if (!metaUnits.length) return null;
    if (!isScoped) return metaUnits;
    const allowed = new Set(layout?.units?.bcvh || []);
    return metaUnits.filter((u) => allowed.has(u.ma_bcvh));
  }, [isScoped, layout, metaUnits]);

  // Fetch Day Summary data. One day: only a BCVH-mode account needs it (a city-wide account has the operation table).
  // A range (PO 2026-11-02): every account gets the same-period comparison table.
  const isRange = isDateRange(effectiveFrom, effectiveTo);
  const showOwnDayTable = !isRange && isBlockVisible(layout, 'ngay', 'day.table');
  const showRangeTable = isRange && isBlockVisible(layout, 'ngay', 'day.range');
  const needsDaySummary = showOwnDayTable || showRangeTable;
  useEffect(() => {
    if (!needsDaySummary || !effectiveFrom || !effectiveTo) return;
    let active = true;

    setDaySummaryState((prev) => ({ ...prev, loading: true, error: null }));
    fetchDaySummary({ from: effectiveFrom, to: effectiveTo, maBcvh: bcvhParam }, indicator.apiBase)
      .then((data) => {
        if (!active) return;
        setDaySummaryState({ loading: false, data, error: null });
      })
      .catch((err) => {
        if (!active) return;
        setDaySummaryState({
          loading: false,
          data: null,
          error: err?.response?.data?.error?.message || err?.message || 'Không thể tải bảng BCVH theo ngày.',
        });
      });

    return () => {
      active = false;
    };
  }, [needsDaySummary, effectiveFrom, effectiveTo, bcvhParam]);

  // Fetch KPI data for UnifiedCommandSummary
  useEffect(() => {
    if (!effectiveFrom || !effectiveTo) return;
    let active = true;

    setKpiState({ loading: true, data: null, error: null });
    api.get('/f13/dashboard/kpi', {
      params: {
        from_date: effectiveFrom,
        to_date: effectiveTo,
        ma_bcvh: bcvhParam,
      },
    })
      .then((res) => {
        if (!active) return;
        setKpiState({ loading: false, data: res?.data?.data || null, error: null });
      })
      .catch((err) => {
        if (!active) return;
        setKpiState({
          loading: false,
          data: null,
          error: err?.message || 'Không thể tải dữ liệu KPI.',
        });
      });

    return () => {
      active = false;
    };
  }, [effectiveFrom, effectiveTo, bcvhParam]);

  // Fetch Daily Trend data
  useEffect(() => {
    if (!effectiveFrom || !effectiveTo || !latestDate) return;
    let active = true;

    setTrendState((prev) => ({ ...prev, loading: true, error: null }));
    const params = buildTrendlineRequestParams({
      reportingFromDate: effectiveFrom,
      reportingToDate: effectiveTo,
      latestDate,
      maBcvh: bcvhParam,
      mode: trendMode,
    });

    if (!params) {
      setTrendState({ loading: false, data: [], error: null });
      return;
    }

    api.get('/f13/dashboard/daily-trend', { params })
      .then((res) => {
        if (!active) return;
        setTrendState({
          loading: false,
          data: normalizeComboTrendlineItems(res?.data?.data?.items || [], indicatorTargetRate(indicator)),
          error: null,
        });
      })
      .catch((err) => {
        if (!active) return;
        setTrendState({
          loading: false,
          data: [],
          error: err?.message || 'Không thể tải dữ liệu xu hướng.',
        });
      });

    return () => {
      active = false;
    };
  }, [effectiveFrom, effectiveTo, latestDate, bcvhParam, trendMode, indicator]);

  const selectedBcvhUnit = metaUnits.find((u) => u.ma_bcvh === bcvhParam);
  const selectedBcvhLabel =
    bcvhParam === 'all'
      ? 'Toàn mạng'
      : selectedBcvhUnit?.ten_bcvh
        ? `${selectedBcvhUnit.ten_bcvh} (${bcvhParam})`
        : `BCVH ${bcvhParam}`;

  // The trend dropdown: a city-wide account gets "Tất cả" on top (it is the default view); a scoped account only its own units.
  const bcvhOptions = useMemo(() => {
    const units = (isScoped ? scopedUnits || [] : metaUnits).map((u) => ({
      value: u.ma_bcvh,
      label: u.ten_bcvh ? `${u.ten_bcvh} (${u.ma_bcvh})` : `BCVH ${u.ma_bcvh}`,
    }));
    if (layout?.units?.allow_all !== true || !units.length) return units;
    return [{ value: 'all', label: `Tất cả ${indicator.unitLabel || 'BCVH'}` }, ...units];
  }, [isScoped, scopedUnits, metaUnits, layout, indicator.unitLabel]);

  return (
    <BcvhUnitsProvider units={isScoped || indicator.dynamicUnits ? scopedUnits : null} scoped={isScoped}>
      <PageContainer
        accentClassName={theme.accentBar}
        badge={<span className={`rounded-full border px-3 py-0.5 text-sm font-black ${theme.chip}`}>{indicator.moduleLabel}</span>}
        title={`${indicator.fullTitle} (Theo ngày)`}
        subtitle="Dữ liệu và chỉ số điều hành theo khoảng ngày đo kiểm trên trục thời gian."
      >
        <div className="space-y-4">
          {/* 3-Tier Filter Bar */}
          <F13V2FilterBar
            activePage="ngay"
            layout={layout}
            latestDate={latestDate}
            bcvhUnits={metaUnits}
          />

          {/* Block 1: day.overview */}
          {isBlockVisible(layout, 'ngay', 'day.overview') && (
            <UnifiedCommandSummary
              kpiData={kpiState.data}
              loading={kpiState.loading}
              error={kpiState.error}
              fromDate={effectiveFrom}
              toDate={effectiveTo}
              bcvhLabel={selectedBcvhLabel}
            />
          )}

          {/* F4.2: the six BCVH of the day */}
          {isBlockVisible(layout, 'ngay', 'day.strip') && <F42SixBcvhStripBlock anchorDate={effectiveTo} />}

          {/* Block 2: day.operation (the table the PO sends every day, same as the old Bảng điều hành; scope: city) */}
          {isBlockVisible(layout, 'ngay', 'day.operation') && (
            <div className="space-y-2">
              {isRange ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
                  Bảng tổng hợp bên dưới hiện ngày cuối của khoảng đã chọn ({effectiveTo.split('-').reverse().join('/')}) và lũy kế tháng đến ngày đó; số của cả khoảng nằm ở bảng so sánh tiếp theo.
                </p>
              ) : null}
              <BcvhOperationTableAdapter
                fromDate={effectiveFrom}
                toDate={effectiveTo}
                interval="daily"
                maBcvh={bcvhParam}
              />
            </div>
          )}

          {/* Range only: day.range, compared with the same period (PO 2026-11-02) */}
          {showRangeTable && (
            <F13V2RangeCompareTable
              data={daySummaryState.data}
              loading={daySummaryState.loading}
              error={daySummaryState.error}
              fromDate={effectiveFrom}
              toDate={effectiveTo}
            />
          )}

          {/* Block 2 for a BCVH-mode account: day.table (own row only) */}
          {showOwnDayTable && (
            <F13V2DaySummaryTable
              data={daySummaryState.data}
              loading={daySummaryState.loading}
              error={daySummaryState.error}
              fromDate={effectiveFrom}
              toDate={effectiveTo}
            />
          )}

          {/* Block 3: day.trend */}
          {isBlockVisible(layout, 'ngay', 'day.trend') && (
            <IntegratedTrendRiskWorkspace
              data={trendState.data}
              loading={trendState.loading}
              error={trendState.error}
              fromDate={effectiveFrom}
              toDate={effectiveTo}
              latestDate={latestDate}
              maBcvh={bcvhParam}
              onBcvhChange={(v) => {
                const next = new URLSearchParams(searchParams);
                if (!v || v === 'all') next.delete('bcvh');
                else next.set('bcvh', v);
                setSearchParams(next);
              }}
              bcvhOptions={bcvhOptions}
              kpiData={kpiState.data}
              mode={trendMode}
              onModeChange={setTrendMode}
            />
          )}

          {/* Block 4: day.pattern (Locked to weekday tab only) */}
          {isBlockVisible(layout, 'ngay', 'day.pattern') && (
            <OperatingPatternTabsCard
              fromDate={effectiveFrom}
              toDate={effectiveTo}
              maBcvh={bcvhParam}
              defaultTab="weekday"
              allowedTabs={['weekday']}
              hideTabs={true}
            />
          )}

          {/* The indicator's own blocks, as on its Bảng điều hành */}
          {isBlockVisible(layout, 'ngay', 'day.pair') && <F11PairTableBlock anchorDate={effectiveTo} toDate={effectiveTo} fromDate={effectiveFrom} controlledPeriod="day" />}
          {isBlockVisible(layout, 'ngay', 'day.postman') && <F42PostmanDashboardBlocks anchorDate={effectiveTo} fromDate={effectiveFrom} maBcvh={bcvhParam} controlledPeriod="day" />}
        </div>
      </PageContainer>
    </BcvhUnitsProvider>
  );
}
