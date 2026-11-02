import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client.js';
import { PageContainer } from '../../components/common/Containers.jsx';
import { useIndicator } from '../indicator/IndicatorContext.js';
import { indicatorTheme, F13_INDICATOR } from '../indicator/indicatorConfig.js';
import { BcvhUnitsProvider } from '../indicator/BcvhUnitsContext.js';
import { fetchLayout } from './api/f13v2Api.js';
import { isBlockVisible } from './f13v2Helpers.js';
import F13V2FilterBar from './components/F13V2FilterBar.jsx';

import BcvhWeeklyComparisonBlock from '../ranking/BcvhWeeklyComparisonBlock.jsx';
import { BcvhMonthlyTrendBlock } from '../ranking/BcvhRankingOverviewBlocks.jsx';
import OperatingPatternTabsCard from '../dashboard/components/OperatingPatternTabsCard.jsx';
import { processOverviewData } from '../ranking/bcvhOverviewData.js';

export default function F13V2MonthPage() {
  const indicator = useIndicator() || F13_INDICATOR;
  const theme = indicatorTheme(indicator);

  const [searchParams, setSearchParams] = useSearchParams();

  const [layout, setLayout] = useState(null);
  const [months, setMonths] = useState([]);
  const [latestDate, setLatestDate] = useState(null);

  // URL parameters: month, bcvh
  const monthParam = searchParams.get('month') || '';
  const bcvhParam = searchParams.get('bcvh') || 'all';

  const [overviewState, setOverviewState] = useState({ loading: true, data: null, processed: null, error: null });

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchLayout().catch((e) => {
        console.error('[F13V2MonthPage] fetchLayout error:', e);
        return null;
      }),
      api.get('/f13/months').catch((e) => {
        console.error('[F13V2MonthPage] fetchMonths error:', e);
        return null;
      }),
      api.get('/f13/dashboard/meta').catch((e) => {
        console.error('[F13V2MonthPage] meta error:', e);
        return null;
      }),
    ]).then(([layoutData, monthsRes, metaRes]) => {
      if (!active) return;
      if (layoutData) setLayout(layoutData);

      const rawMonths = monthsRes?.data?.data?.months || [];
      const sortedMonths = [...rawMonths].sort((a, b) => (b.month_id || '').localeCompare(a.month_id || ''));
      setMonths(sortedMonths);

      const meta = metaRes?.data?.data || {};
      setLatestDate(meta.max_date || null);
    });

    return () => {
      active = false;
    };
  }, []);

  // Synchronize default month if missing from searchParams
  useEffect(() => {
    if (months.length > 0 && !monthParam) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!next.get('month')) {
            next.set('month', months[0].month_id);
          }
          return next;
        },
        { replace: true }
      );
    }
  }, [months, monthParam, setSearchParams]);

  const effectiveMonthId = monthParam || (months[0]?.month_id ?? '');
  const activeMonthObj = months.find((m) => m.month_id === effectiveMonthId) || months[0] || null;

  // Anchor date for monthly overview: the end of the selected month or latestDate if earlier
  const anchorDateForMonth =
    activeMonthObj?.month_end && latestDate && activeMonthObj.month_end > latestDate
      ? latestDate
      : activeMonthObj?.month_end || latestDate || '';

  // Fetch overview data for BcvhMonthlyTrendBlock
  useEffect(() => {
    if (!anchorDateForMonth) return;
    let active = true;

    setOverviewState((prev) => ({ ...prev, loading: true, error: null }));
    api.get('/f13/ranking/bcvh/overview', { params: { anchor_date: anchorDateForMonth } })
      .then((res) => {
        if (!active) return;
        const rawData = res?.data?.data || {};
        const rawMeta = rawData.meta || {};
        const processed = processOverviewData(rawData, rawMeta);
        setOverviewState({
          loading: false,
          data: rawData,
          processed,
          error: null,
        });
      })
      .catch((err) => {
        if (!active) return;
        setOverviewState({
          loading: false,
          data: null,
          processed: null,
          error: err?.message || 'Không thể tải dữ liệu xu hướng tháng.',
        });
      });

    return () => {
      active = false;
    };
  }, [anchorDateForMonth]);

  return (
    <BcvhUnitsProvider>
      <PageContainer
        accentClassName={theme.accentBar}
        badge={<span className={`rounded-full border px-3 py-0.5 text-sm font-black ${theme.chip}`}>F1.3</span>}
        title="F1.3 – Chất lượng phát liên tỉnh (Theo tháng)"
        subtitle="So sánh BCVH theo tháng (lũy kế, cùng kỳ / cả tháng trước), xu hướng năm và quy luật vận hành theo tháng."
      >
        <div className="space-y-4">
          {/* 3-Tier Filter Bar */}
          <F13V2FilterBar
            activePage="thang"
            layout={layout}
            latestDate={latestDate}
            availableMonths={months}
          />

          {/* Block 1: month.compare */}
          {isBlockVisible(layout, 'thang', 'month.compare') && (
            <BcvhWeeklyComparisonBlock
              controlledPeriodMode="month"
              controlledPeriod={effectiveMonthId}
              hidePeriodModeSwitch={true}
            />
          )}

          {/* Block 2: month.trend */}
          {isBlockVisible(layout, 'thang', 'month.trend') && (
            <div>
              {overviewState.loading ? (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <span>Đang tải xu hướng theo tháng và heatmap...</span>
                  </div>
                </div>
              ) : overviewState.processed ? (
                <BcvhMonthlyTrendBlock data={overviewState.processed} />
              ) : null}
            </div>
          )}

          {/* Block 3: month.pattern */}
          {isBlockVisible(layout, 'thang', 'month.pattern') && (
            <OperatingPatternTabsCard
              fromDate={activeMonthObj?.month_start || ''}
              toDate={anchorDateForMonth}
              maBcvh={bcvhParam}
              defaultTab="month"
              allowedTabs={['month', 'heatmap']}
            />
          )}
        </div>
      </PageContainer>
    </BcvhUnitsProvider>
  );
}
