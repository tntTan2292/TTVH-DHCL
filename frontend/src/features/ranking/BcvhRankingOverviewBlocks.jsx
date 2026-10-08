import { useState } from 'react';
import { Route, BarChart3, Clock, ChevronDown } from 'lucide-react';
import BcvhMonthlyComboTrendChart from './BcvhMonthlyComboTrendChart';
import { CANONICAL_BCVH_CODES } from '../dashboard/components/dashboardFilterOptions.js';
import {
  BCVH_COLORS,
  CANONICAL_NAMES,
  formatOverviewNumber,
  formatOverviewRate,
} from './bcvhOverviewData';
import { formatNationalRank } from './bcvhWeeklyComparisonData';

const ALL_UNITS = 'all';
const MONTHLY_TREND_TOTAL_KEY = 'total';
const MONTHLY_TREND_NAMES = { ...CANONICAL_NAMES, [MONTHLY_TREND_TOTAL_KEY]: 'Tổng cộng 6 BCVH' };
const MONTHLY_TREND_COLORS = { ...BCVH_COLORS, [MONTHLY_TREND_TOTAL_KEY]: '#0f172a' };
// Shared Heatmap SSOT with Operation Dashboard: the same absolute band classification
// (green >=70 / pink 60-70 / yellow 50-60 / red <50 / unavailable) and its colors, so the
// monthly heatmap below never re-declares the >=70/>=60/>=50 thresholds locally.
import {
  getApprovedWeekdayBand,
  HEATMAP_BAND_TONE_CLASS,
  HEATMAP_BAND_DOT_CLASS,
} from '../dashboard/components/operatingPatternTabsData';
import { buildMonthlyHeatmapLegend, indicatorLabel, resolveIndicator } from '../indicator/indicatorConfig.js';

// Legend copy for the monthly heatmap below. Colors reuse the shared HEATMAP_BAND_DOT_CLASS
// tones; the wording here is this table's own legend text, not the SSOT's threshold logic.
// F1.3 keeps this fixed copy; any other indicator derives it from its own thresholds.
const MONTHLY_HEATMAP_LEGEND = [
  { tone: 'band-green', label: 'Xanh', description: 'Tỷ lệ từ 70% trở lên' },
  { tone: 'band-pink', label: 'Hồng', description: 'Từ 60% đến dưới 70%' },
  { tone: 'band-yellow', label: 'Vàng', description: 'Từ 50% đến dưới 60%' },
  { tone: 'band-red', label: 'Đỏ', description: 'Dưới 50%' },
  { tone: 'unavailable', label: 'Xám', description: 'Chưa có dữ liệu' },
];

// 2. Monthly Trend Block (Khối 1)
export function BcvhMonthlyTrendBlock({ data }) {
  const [unit, setUnit] = useState(MONTHLY_TREND_TOTAL_KEY);
  if (!data) return null;
  const { months, monthlyChartData, monthlyTableRows, nameMap, meta } = data;
  const currentMonthRankText = formatNationalRank(monthlyChartData?.[monthlyChartData.length - 1]?.national_rank);
  const anchorDate = meta?.anchor_date || null;
  const unitNames = { ...MONTHLY_TREND_NAMES, ...nameMap };

  return (
    <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-surface-200)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[var(--color-primary-600)]" />
            <h2 className="text-base font-bold text-[var(--color-text-main)]">
              Xu hướng chất lượng theo tháng (T01 đến tháng hiện tại)
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Sản lượng đo kiểm (cột) và Tỷ lệ đạt KPI 2026 (đường) theo tháng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {anchorDate ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 border border-amber-200/60">
              <Clock className="h-3.5 w-3.5" />
              <span>Tháng hiện tại lũy kế đến {anchorDate}</span>
            </div>
          ) : null}
          {unit === MONTHLY_TREND_TOTAL_KEY && currentMonthRankText ? (
            <div className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 border border-rose-200/70">
              VỊ THỨ TOÀN QUỐC: {currentMonthRankText}
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span>Xem theo đơn vị:</span>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs hover:border-blue-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
              aria-label="Xem theo đơn vị"
            >
              <option value={MONTHLY_TREND_TOTAL_KEY}>{MONTHLY_TREND_NAMES[MONTHLY_TREND_TOTAL_KEY]}</option>
              <option value={ALL_UNITS}>Tất cả 6 BCVH</option>
              {CANONICAL_BCVH_CODES.map((code) => (
                <option key={code} value={code}>{unitNames[code] || code}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mb-4">
        <BcvhMonthlyComboTrendChart
          chartData={monthlyChartData}
          unit={unit}
          unitNames={unitNames}
          unitColors={MONTHLY_TREND_COLORS}
          anchorDate={anchorDate}
          height={320}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 font-semibold">
              <span className="h-2.5 w-3.5 rounded-xs bg-[#2563eb] shadow-2xs" />
              Sản lượng (bưu gửi), trục trái
            </span>
            <span className="inline-flex items-center gap-2 font-semibold">
              <span className="h-2.5 w-3.5 rounded-xs bg-[#38bdf8] border border-[#0284c7] shadow-2xs" />
              Cột tháng lũy kế
            </span>
            <span className="inline-flex items-center gap-2 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-[#059669] shadow-2xs" />
              Tỷ lệ đạt KPI 2026 (%), trục phải
            </span>
            <span className="inline-flex items-center gap-2 font-semibold">
              <span className="h-2 w-5 border-t-2 border-dashed border-[#dc2626]" />
              Mục tiêu 90%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {indicatorLabel('Chấm trên đường tỷ lệ tô màu theo dải KPI F1.3')}
          </div>
        </div>
      </div>

      {/* Heatmap 6 BCVH x tháng: thu gọn mặc định (PO 2026-10-07), mở khi cần soát ma trận / độ đầy đủ dữ liệu */}
      <details className="group border-t border-gray-100 pt-3 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] hover:bg-gray-50">
          <span>Xem ma trận 6 BCVH × tháng (heatmap)</span>
          <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200 group-open:rotate-180" />
        </summary>
      <div className="mt-3 overflow-x-auto">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Chi tiết số liệu theo tháng
          </h3>
          <div className="flex flex-wrap gap-3 text-[10px] font-medium text-gray-500">
            {(resolveIndicator().id === 'f13' ? MONTHLY_HEATMAP_LEGEND : buildMonthlyHeatmapLegend()).map((entry) => (
              <span key={entry.tone} className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${HEATMAP_BAND_DOT_CLASS[entry.tone] || HEATMAP_BAND_DOT_CLASS.unavailable}`}></div>
                {entry.label}: {entry.description}
              </span>
            ))}
          </div>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-[var(--color-text-muted)]">
              <th className="sticky left-0 bg-gray-50/90 px-3 py-2.5 font-semibold">Đơn vị BCVH</th>
              {months.map((m) => {
                const label = m.endsWith('-01') ? 'T1' : `T${parseInt(m.slice(5), 10)}`;
                const isCurrent = data.latestMonth === m;
                return (
                  <th key={m} className={`px-3 py-2.5 text-center font-semibold ${isCurrent ? 'border-l border-r border-blue-200 bg-blue-50/30' : ''}`}>
                    <div>{label}</div>
                    {isCurrent ? (
                      <div className="text-[10px] font-bold text-blue-700">Lũy kế</div>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {monthlyTableRows.map((row) => (
              <tr key={row.ma_bcvh} className="hover:bg-gray-50/50 transition-colors">
                <td className="sticky left-0 bg-white/95 px-3 py-2.5 font-bold text-[var(--color-text-main)] shadow-[1px_0_0_0_#f3f4f6] backdrop-blur-sm z-10">
                  {row.ten_bcvh}
                </td>
                {row.months.map((m) => {
                  const hasPartialCoverage =
                    m.days_with_data > 0 &&
                    m.days_in_period > 0 &&
                    m.days_with_data < m.days_in_period;
                  const isCurrent = data.latestMonth === m.month;

                  // Same Heatmap SSOT as Operation Dashboard's weekday tab: getApprovedWeekdayBand()
                  // classifies the rate (green >=70 / pink 60-70 / yellow 50-60 / red <50 /
                  // unavailable for null), and HEATMAP_BAND_TONE_CLASS supplies the exact same
                  // border/background/text classes — no threshold is re-declared here.
                  const band = getApprovedWeekdayBand(m.rate);
                  const bandClass = HEATMAP_BAND_TONE_CLASS[band.tone] || HEATMAP_BAND_TONE_CLASS.unavailable;

                  return (
                    <td
                      key={m.month}
                      className={`border px-3 py-2.5 text-center align-top ${bandClass} ${isCurrent ? 'ring-1 ring-inset ring-blue-400' : ''}`}
                    >
                      <div className="font-extrabold">
                        {m.rate !== null ? formatOverviewRate(m.rate) : '—'}
                      </div>
                      <div className="text-[10px] font-medium opacity-75">
                        {m.volume ? `${formatOverviewNumber(m.volume)} BG` : ''}
                      </div>
                      {hasPartialCoverage && m.rate !== null ? (
                        <div className="mt-0.5 inline-block rounded bg-white/60 px-1 py-0.2 text-[9px] font-semibold text-gray-700 shadow-xs">
                          {m.days_with_data}/{m.days_in_period} ngày
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Huế toàn quốc: hạng từng tháng trong bảng 34 tỉnh (tháng hiện tại = lũy kế) */}
            <tr className="bg-rose-50/60">
              <td className="sticky left-0 bg-rose-50/95 px-3 py-2.5 text-[11px] font-black uppercase text-rose-700 shadow-[1px_0_0_0_#f3f4f6] backdrop-blur-sm z-10">
                Vị thứ toàn quốc
              </td>
              {months.map((month, index) => (
                <td key={month} className="px-3 py-2.5 text-center text-sm font-black text-rose-700 tabular-nums">
                  {formatNationalRank(monthlyChartData?.[index]?.national_rank) || '—'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      </details>
    </div>
  );
}

// 3. Operational Route Capacity Block (Khối 4)
export function BcvhRouteCapacityBlock({ data }) {
  if (!data) return null;
  const { routeRows, routeTotalRow, meta } = data;
  const periodBasis = meta?.route_period ? `${meta.route_period.from_date} – ${meta.route_period.to_date} (MTD)` : 'MTD';

  return (
    <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-surface-200)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Route className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-[var(--color-text-main)]">
              Năng lực và chất lượng tuyến
            </h2>
          </div>
          <p className="mt-0.5 text-xs font-black text-rose-600">
            VỊ THỨ TOÀN QUỐC (MTD): {formatNationalRank(meta?.national_rank?.mtd) || '—'}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Kỳ: {periodBasis} · Phân loại tuyến phát theo chất lượng thực hiện.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200/60">
          Tuyến có phát sinh trong kỳ
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-[var(--color-text-muted)]">
              <th className="px-3 py-2.5 font-semibold">Đơn vị BCVH</th>
              <th className="px-3 py-2.5 text-right font-bold text-gray-800">
                Tuyến có phát sinh trong kỳ
              </th>
              <th className="px-3 py-2.5 text-right font-semibold text-emerald-600">Tốt (≥70%)</th>
              <th className="px-3 py-2.5 text-right font-semibold text-pink-600">Khá (≥60%)</th>
              <th className="px-3 py-2.5 text-right font-semibold text-amber-600">Trung bình (≥50%)</th>
              <th className="px-3 py-2.5 text-right font-semibold text-rose-600">Kém (&lt;50%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {routeRows.map((row) => {
              const total = row.participating_route_count || 0;
              const pct = (val) => total > 0 ? (val / total) * 100 : 0;

              return (
                <tr key={row.ma_bcvh} className="hover:bg-emerald-50/30 transition-colors">
                  <td className="px-3 py-3 w-48">
                    <div className="font-bold text-[var(--color-text-main)] mb-1.5">
                      {row.ten_bcvh}
                    </div>
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      {total > 0 ? (
                        <>
                          <div style={{ width: `${pct(row.green)}%` }} className="bg-emerald-500" title="Tốt" />
                          <div style={{ width: `${pct(row.pink)}%` }} className="bg-pink-500" title="Khá" />
                          <div style={{ width: `${pct(row.yellow)}%` }} className="bg-amber-500" title="Trung bình" />
                          <div style={{ width: `${pct(row.red)}%` }} className="bg-rose-500" title="Kém" />
                        </>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-extrabold text-gray-900 align-top pt-3.5">
                    {formatOverviewNumber(row.participating_route_count)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-emerald-600 align-top pt-3.5">
                    {formatOverviewNumber(row.green)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-pink-600 align-top pt-3.5">
                    {formatOverviewNumber(row.pink)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-amber-600 align-top pt-3.5">
                    {formatOverviewNumber(row.yellow)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-rose-600 align-top pt-3.5">
                    {formatOverviewNumber(row.red)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--color-primary-300)] bg-emerald-50/60 font-bold text-gray-900 shadow-inner">
              <td className="px-3 py-4 text-sm font-bold text-emerald-900">
                <div className="mb-1.5">{routeTotalRow.ten_bcvh}</div>
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
                  {routeTotalRow.participating_route_count > 0 ? (
                    <>
                      <div style={{ width: `${(routeTotalRow.green / routeTotalRow.participating_route_count) * 100}%` }} className="bg-emerald-600" />
                      <div style={{ width: `${(routeTotalRow.pink / routeTotalRow.participating_route_count) * 100}%` }} className="bg-pink-600" />
                      <div style={{ width: `${(routeTotalRow.yellow / routeTotalRow.participating_route_count) * 100}%` }} className="bg-amber-600" />
                      <div style={{ width: `${(routeTotalRow.red / routeTotalRow.participating_route_count) * 100}%` }} className="bg-rose-600" />
                    </>
                  ) : null}
                </div>
              </td>
              <td className="px-3 py-4 text-right text-sm font-black text-emerald-800 align-top">
                {formatOverviewNumber(routeTotalRow.participating_route_count)}
              </td>
              <td className="px-3 py-4 text-right font-bold text-emerald-700 align-top">
                {formatOverviewNumber(routeTotalRow.green)}
              </td>
              <td className="px-3 py-4 text-right font-bold text-pink-700 align-top">
                {formatOverviewNumber(routeTotalRow.pink)}
              </td>
              <td className="px-3 py-4 text-right font-bold text-amber-700 align-top">
                {formatOverviewNumber(routeTotalRow.yellow)}
              </td>
              <td className="px-3 py-4 text-right font-bold text-rose-700 align-top">
                {formatOverviewNumber(routeTotalRow.red)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
