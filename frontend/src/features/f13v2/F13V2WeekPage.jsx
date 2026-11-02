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
import BcvhWeeklyTrendBlock from '../ranking/BcvhWeeklyTrendBlock.jsx';

export default function F13V2WeekPage() {
  const indicator = useIndicator() || F13_INDICATOR;
  const theme = indicatorTheme(indicator);

  const [searchParams, setSearchParams] = useSearchParams();

  const [layout, setLayout] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [latestDate, setLatestDate] = useState(null);

  // URL parameters: week, bcvh
  const weekParam = searchParams.get('week') || '';

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchLayout().catch((e) => {
        console.error('[F13V2WeekPage] fetchLayout error:', e);
        return null;
      }),
      api.get('/f13/ranking/bcvh/weeks').catch((e) => {
        console.error('[F13V2WeekPage] fetchWeeks error:', e);
        return null;
      }),
      api.get('/f13/dashboard/meta').catch((e) => {
        console.error('[F13V2WeekPage] meta error:', e);
        return null;
      }),
    ]).then(([layoutData, weeksRes, metaRes]) => {
      if (!active) return;
      if (layoutData) setLayout(layoutData);

      const rawWeeks = weeksRes?.data?.data?.weeks || [];
      const sortedWeeks = [...rawWeeks].sort((a, b) => (b.week_start || '').localeCompare(a.week_start || ''));
      setWeeks(sortedWeeks);

      const meta = metaRes?.data?.data || {};
      setLatestDate(meta.max_date || null);
    });

    return () => {
      active = false;
    };
  }, []);

  // Synchronize default week if missing from searchParams
  useEffect(() => {
    if (weeks.length > 0 && !weekParam) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!next.get('week')) {
            next.set('week', weeks[0].week_id);
          }
          return next;
        },
        { replace: true }
      );
    }
  }, [weeks, weekParam, setSearchParams]);

  const effectiveWeekId = weekParam || (weeks[0]?.week_id ?? '');
  const activeWeekObj = weeks.find((w) => w.week_id === effectiveWeekId) || weeks[0] || null;

  return (
    <BcvhUnitsProvider>
      <PageContainer
        accentClassName={theme.accentBar}
        badge={<span className={`rounded-full border px-3 py-0.5 text-sm font-black ${theme.chip}`}>F1.3</span>}
        title="F1.3 – Chất lượng phát liên tỉnh (Theo tuần)"
        subtitle="So sánh hiệu quả các bưu cục vận hành và diễn biến chất lượng theo chu kỳ tuần (Thứ Năm → Thứ Tư)."
      >
        <div className="space-y-4">
          {/* 3-Tier Filter Bar */}
          <F13V2FilterBar
            activePage="tuan"
            layout={layout}
            latestDate={latestDate}
            availableWeeks={weeks}
          />

          {/* Block 1: week.compare */}
          {isBlockVisible(layout, 'tuan', 'week.compare') && (
            <BcvhWeeklyComparisonBlock
              controlledPeriodMode="week"
              controlledPeriod={effectiveWeekId}
              hidePeriodModeSwitch={true}
            />
          )}

          {/* Block 2: week.trend */}
          {isBlockVisible(layout, 'tuan', 'week.trend') && (
            <BcvhWeeklyTrendBlock
              anchorWeekId={effectiveWeekId}
              anchorWeek={activeWeekObj}
            />
          )}
        </div>
      </PageContainer>
    </BcvhUnitsProvider>
  );
}
