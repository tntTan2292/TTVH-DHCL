import { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3 } from 'lucide-react';
import { useIndicator } from '../indicator/IndicatorContext.js';
import { indicatorTargetRate, indicatorTheme } from '../indicator/indicatorConfig.js';
import { useIndicatorApi } from '../indicator/useIndicatorApi.js';
import { ErrorState } from '../../components/shared/SharedComponents';
import { CANONICAL_BCVH_CODES } from '../dashboard/components/dashboardFilterOptions.js';
import BcvhWeeklyComboTrendChart from './BcvhWeeklyComboTrendChart';
import { BCVH_COLORS, CANONICAL_NAMES } from './bcvhOverviewData.js';
import { createWeeklyTrendFetcher } from './bcvhWeeklyComparisonFetcher';
import {
  WEEKLY_TREND_TOTAL_KEY,
  buildWeeklyTrendChartData,
  formatNationalRank,
  formatWeekDateRange,
} from './bcvhWeeklyComparisonData';

const ALL_UNITS = 'all';
const TREND_COLORS = { ...BCVH_COLORS, [WEEKLY_TREND_TOTAL_KEY]: '#0f172a' };
const TREND_NAMES = {
  ...Object.fromEntries(
    CANONICAL_BCVH_CODES.map((c) => [c, CANONICAL_NAMES[c] ? `BCVH ${CANONICAL_NAMES[c]}` : `BCVH ${c}`])
  ),
  [WEEKLY_TREND_TOTAL_KEY]: 'Tổng cộng 6 BCVH',
};

// Replaces the old "Diễn biến theo ngày" block. Driven ONLY by the anchor week ("tuần kỳ này", set by
// "Điều chỉnh mốc tuần hiện tại" / the week select of the table above) plus its own unit filter.
// Default view: "Tổng cộng 6 BCVH" (combo bar + line).
export default function BcvhWeeklyTrendBlock({ anchorWeekId, anchorWeek }) {
  const indicator = useIndicator();
  const api = useIndicatorApi();
  const [trendState, setTrendState] = useState({ status: 'idle', weeks: [], error: null });
  const [unit, setUnit] = useState(WEEKLY_TREND_TOTAL_KEY);

  const fetchTrend = useMemo(() => createWeeklyTrendFetcher(api, setTrendState), []);
  useEffect(() => {
    if (anchorWeekId) fetchTrend(anchorWeekId);
  }, [anchorWeekId, fetchTrend]);

  const chartData = useMemo(() => buildWeeklyTrendChartData(trendState.weeks), [trendState.weeks]);
  // National rank of the anchor week: only meaningful for the TOTAL view (Huế as a whole), like the
  // Operation Dashboard "VỊ THỨ TOÀN QUỐC" header.
  const anchorRank = unit === WEEKLY_TREND_TOTAL_KEY ? chartData[chartData.length - 1]?.national_rank : null;
  const anchorRankText = formatNationalRank(anchorRank);
  const anchorRange = anchorWeek ? formatWeekDateRange(anchorWeek.display_start_date, anchorWeek.display_end_date) : '';

  return (
    <section className="bcvh-weekly-trend-card w-full rounded-2xl border border-slate-300 bg-white p-3 sm:p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-main)]">
              Diễn biến chất lượng theo tuần
              {anchorWeek ? ` (đến ${anchorWeek.label}${anchorRange ? `: ${anchorRange}` : ''})` : ''}
            </h2>
            {anchorRankText ? (
              <p className="mt-0.5 text-xs font-black text-rose-600">
                {anchorWeek?.label || 'Tuần mốc'} • VỊ THỨ TOÀN QUỐC: {anchorRankText}
              </p>
            ) : null}
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              Sản lượng đo kiểm (cột) và {indicator.id === 'f13' ? 'Tỷ lệ đạt KPI 2026' : `Tỷ lệ đạt ${indicator.moduleLabel}`} (đường) theo tuần (Thứ Năm → Thứ Tư). Lăn chuột để phóng to, kéo để di chuyển, nhấp đúp để đặt lại.
            </p>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
          <span>Xem theo đơn vị</span>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs hover:border-blue-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value={WEEKLY_TREND_TOTAL_KEY}>{TREND_NAMES[WEEKLY_TREND_TOTAL_KEY]}</option>
            <option value={ALL_UNITS}>Tất cả 6 BCVH</option>
            {CANONICAL_BCVH_CODES.map((code) => (
              <option key={code} value={code}>{TREND_NAMES[code] || code}</option>
            ))}
          </select>
        </label>
      </div>

      {trendState.status === 'error' ? (
        <ErrorState title="Không thể tải biểu đồ theo tuần" description={trendState.error} />
      ) : null}

      {trendState.status === 'loading' || trendState.status === 'idle' ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-500">
          <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Đang tải biểu đồ theo tuần...
        </div>
      ) : null}

      {trendState.status === 'success' ? (
        <>
          <BcvhWeeklyComboTrendChart
            data={chartData}
            unit={unit}
            unitNames={TREND_NAMES}
            unitColors={TREND_COLORS}
            height={340}
          />

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 font-semibold">
                <span className="h-2.5 w-3.5 rounded-xs bg-[#2563eb] shadow-2xs" />
                Sản lượng (bưu gửi), trục trái
              </span>
              <span className="inline-flex items-center gap-2 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full shadow-2xs" style={{ backgroundColor: indicatorTheme(indicator).line }} />
                {indicator.id === 'f13' ? 'Tỷ lệ đạt KPI 2026' : `Tỷ lệ đạt ${indicator.moduleLabel}`} (%), trục phải
              </span>
              <span className="inline-flex items-center gap-2 font-semibold">
                <span className="h-2 w-5 border-t-2 border-dashed border-[#dc2626]" />
                Mục tiêu {indicatorTargetRate(indicator)}%
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Activity size={13} className="text-slate-400" />
                Tuần thiếu dữ liệu giữ nguyên khoảng trống
              </span>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
