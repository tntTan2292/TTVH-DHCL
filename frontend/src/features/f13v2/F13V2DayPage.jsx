import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client.js';
import { PageContainer } from '../../components/common/Containers.jsx';
import { useIndicator } from '../indicator/IndicatorContext.js';
import { indicatorTheme, indicatorTargetRate, F13_INDICATOR } from '../indicator/indicatorConfig.js';
import { BcvhUnitsProvider } from '../indicator/BcvhUnitsContext.js';
import { fetchLayout, fetchDaySummary } from './api/f13v2Api.js';
import { isBlockVisible } from './f13v2Helpers.js';
import F13V2FilterBar from './components/F13V2FilterBar.jsx';
import F13V2DaySummaryTable from './components/F13V2DaySummaryTable.jsx';

import UnifiedCommandSummary from '../dashboard/components/UnifiedCommandSummary.jsx';
import IntegratedTrendRiskWorkspace from '../dashboard/components/IntegratedTrendRiskWorkspace.jsx';
import OperatingPatternTabsCard from '../dashboard/components/OperatingPatternTabsCard.jsx';
import UnifiedActionCenter from '../dashboard/components/UnifiedActionCenter.jsx';
import { buildTrendlineRequestParams } from '../dashboard/components/qualityTrendlineWindow.js';
import { normalizeComboTrendlineItems } from '../dashboard/components/comboTrendlineData.js';

export default function F13V2DayPage() {
  const indicator = useIndicator() || F13_INDICATOR;
  const theme = indicatorTheme(indicator);

  const [searchParams, setSearchParams] = useSearchParams();

  const [layout, setLayout] = useState(null);
  const [latestDate, setLatestDate] = useState(null);
  const [bcvhOptions, setBcvhOptions] = useState([]);

  // URL parameters: from, to, bcvh
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const bcvhParam = searchParams.get('bcvh') || 'all';

  const [daySummaryState, setDaySummaryState] = useState({ loading: true, data: null, error: null });
  const [kpiState, setKpiState] = useState({ loading: true, data: null, error: null });
  const [trendState, setTrendState] = useState({ loading: true, data: [], error: null });
  const [trendMode, setTrendMode] = useState('30-days');

  // Load layout and metadata
  useEffect(() => {
    let active = true;

    Promise.all([
      fetchLayout().catch((e) => {
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
        setBcvhOptions(
          meta.bcvh_units.map((u) => ({
            value: u.ma_bcvh,
            label: u.ten_bcvh ? `${u.ten_bcvh} (${u.ma_bcvh})` : `BCVH ${u.ma_bcvh}`,
          }))
        );
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // Effective dates: use params if present, else fallback to latestDate
  const effectiveFrom = fromParam || latestDate || '';
  const effectiveTo = toParam || latestDate || '';

  // Synchronize initial URL params once latestDate is known
  useEffect(() => {
    if (!latestDate) return;
    if (!fromParam || !toParam) {
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
  }, [latestDate, fromParam, toParam, setSearchParams]);

  // Fetch Day Summary table data
  useEffect(() => {
    if (!effectiveFrom || !effectiveTo) return;
    let active = true;

    setDaySummaryState((prev) => ({ ...prev, loading: true, error: null }));
    fetchDaySummary({ from: effectiveFrom, to: effectiveTo, maBcvh: bcvhParam })
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
  }, [effectiveFrom, effectiveTo, bcvhParam]);

  // Fetch KPI data for UnifiedCommandSummary and UnifiedActionCenter
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

  const selectedBcvhLabel =
    bcvhParam === 'all'
      ? 'Toàn mạng'
      : bcvhOptions.find((opt) => opt.value === bcvhParam)?.label || `BCVH ${bcvhParam}`;

  return (
    <BcvhUnitsProvider units={bcvhOptions}>
      <PageContainer
        accentClassName={theme.accentBar}
        badge={<span className={`rounded-full border px-3 py-0.5 text-sm font-black ${theme.chip}`}>F1.3</span>}
        title="F1.3 – Chất lượng phát liên tỉnh (Theo ngày)"
        subtitle="Dữ liệu và chỉ số điều hành theo khoảng ngày đo kiểm trên trục thời gian."
      >
        <div className="space-y-4">
          {/* 3-Tier Filter Bar */}
          <F13V2FilterBar
            activePage="ngay"
            layout={layout}
            latestDate={latestDate}
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

          {/* Block 2: day.table */}
          {isBlockVisible(layout, 'ngay', 'day.table') && (
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

          {/* Block 4: day.pattern */}
          {isBlockVisible(layout, 'ngay', 'day.pattern') && (
            <OperatingPatternTabsCard
              fromDate={effectiveFrom}
              toDate={effectiveTo}
              maBcvh={bcvhParam}
            />
          )}

          {/* Block 5: day.actions (scope: city) */}
          {isBlockVisible(layout, 'ngay', 'day.actions') && (
            <UnifiedActionCenter
              fromDate={effectiveFrom}
              toDate={effectiveTo}
              maBcvh={bcvhParam}
              bcvhLabel={selectedBcvhLabel}
              kpiData={kpiState.data}
              kpiLoading={kpiState.loading}
              kpiError={kpiState.error}
            />
          )}
        </div>
      </PageContainer>
    </BcvhUnitsProvider>
  );
}
