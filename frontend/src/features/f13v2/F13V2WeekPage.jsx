import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client.js';
import { PageContainer } from '../../components/common/Containers.jsx';
import { useIndicator } from '../indicator/IndicatorContext.js';
import { indicatorTheme, F13_INDICATOR } from '../indicator/indicatorConfig.js';
import { BcvhUnitsProvider } from '../indicator/BcvhUnitsContext.js';
import { fetchLayout, resolvePeriod } from './api/f13v2Api.js';
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
  const [metaUnits, setMetaUnits] = useState([]);

  // URL parameters: week, bcvh
  const weekParam = searchParams.get('week') || '';
  const bcvhParam = searchParams.get('bcvh') || 'all';

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
      if (meta.bcvh_units && Array.isArray(meta.bcvh_units)) {
        setMetaUnits(meta.bcvh_units);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // Synchronize default week if missing from searchParams
  // PO Rule: if no week in URL, resolve default anchor via GET /api/f13/v2/period/resolve?kind=latest
  useEffect(() => {
    if (weekParam) return;
    let active = true;

    resolvePeriod({ kind: 'latest' })
      .then((res) => {
        if (!active || !res?.week?.week_id) return;
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (!next.get('week')) {
              next.set('week', res.week.week_id);
            }
            return next;
          },
          { replace: true }
        );
      })
      .catch((err) => {
        console.warn('[F13V2WeekPage] resolvePeriod latest failed, fallback to weeks[0]:', err);
        if (weeks.length > 0 && active) {
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
      });

    return () => {
      active = false;
    };
  }, [weekParam, weeks, setSearchParams]);

  const effectiveWeekId = weekParam || (weeks[0]?.week_id ?? '');
  const activeWeekObj = weeks.find((w) => w.week_id === effectiveWeekId) || weeks[0] || null;

  // Scoped units for BcvhUnitsProvider (B2)
  const isScoped = layout?.units?.allow_all === false;
  const scopedUnits = useMemo(() => {
    if (!metaUnits.length) return null;
    if (!isScoped) return metaUnits;
    const allowed = new Set(layout?.units?.bcvh || []);
    return metaUnits.filter((u) => allowed.has(u.ma_bcvh));
  }, [isScoped, layout, metaUnits]);

  return (
    <BcvhUnitsProvider units={scopedUnits} scoped={isScoped}>
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
            bcvhUnits={metaUnits}
          />

          {/* Block 1: week.compare (hide internal trend to prevent duplication, B4) */}
          {isBlockVisible(layout, 'tuan', 'week.compare') && (
            <BcvhWeeklyComparisonBlock
              controlledPeriodMode="week"
              controlledPeriod={effectiveWeekId}
              hidePeriodModeSwitch={true}
              hideTrend={true}
              maBcvh={bcvhParam}
            />
          )}

          {/* Block 2: week.trend (exactly ONE weekly trend block on Tuần page, B4) */}
          {isBlockVisible(layout, 'tuan', 'week.trend') && (
            <BcvhWeeklyTrendBlock
              anchorWeekId={effectiveWeekId}
              anchorWeek={activeWeekObj}
              controlledUnit={bcvhParam}
            />
          )}
        </div>
      </PageContainer>
    </BcvhUnitsProvider>
  );
}
