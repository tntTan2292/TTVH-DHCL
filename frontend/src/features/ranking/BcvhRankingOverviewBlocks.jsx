import { ChevronDown, Calendar, Route, BarChart3, Clock } from 'lucide-react';
import BcvhMultiSeriesTrendChart from './BcvhMultiSeriesTrendChart';
import {
  DASH,
  formatOverviewNumber,
  formatOverviewRate,
} from './bcvhOverviewData';

function formatSignedDeltaStr(val, unit = '') {
  if (val === null || val === undefined || val === '') return DASH;
  const num = Number(val);
  if (!Number.isFinite(num)) return DASH;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ''}`;
}

function formatSignedVolumeStr(val) {
  if (val === null || val === undefined || val === '') return DASH;
  const num = Number(val);
  if (!Number.isFinite(num)) return DASH;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toLocaleString('vi-VN')}`;
}

// 1. MTD Summary Block (Khối 3)
export function BcvhMtdSummaryBlock({ data }) {
  if (!data) return null;
  const { mtdRows, mtdTotalRow, meta } = data;
  const periodLabel = meta?.month_period ? `${meta.month_period.from_date} đến ${meta.month_period.to_date}` : '';

  return (
    <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-surface-200)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[var(--color-text-main)]">Chất lượng tổng quan MTD</h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              Lũy kế tháng hiện tại
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Kỳ lũy kế: {periodLabel || 'Tháng hiện tại'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-[var(--color-text-muted)]">
              <th className="px-3 py-2.5 font-semibold">Hạng MTD</th>
              <th className="px-3 py-2.5 font-semibold">Đơn vị BCVH</th>
              <th className="px-3 py-2.5 text-right font-semibold">Sản lượng</th>
              <th className="px-3 py-2.5 text-right font-semibold">Đạt KPI</th>
              <th className="px-3 py-2.5 text-right font-semibold">Không đạt</th>
              <th className="px-3 py-2.5 text-right font-bold text-gray-800">Tỷ lệ MTD</th>
              <th className="px-3 py-2.5 text-right font-semibold">So cùng kỳ tháng trước</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mtdRows.map((row) => {
              const rateDelta = row.prev_rate !== null && row.rate !== null ? row.rate - row.prev_rate : null;
              const volumeDelta = row.prev_volume !== null && row.volume !== null ? row.volume - row.prev_volume : null;

              return (
                <tr key={row.ma_bcvh} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-3 py-3 font-semibold text-gray-700">
                    {row.rank ? `#${row.rank}` : DASH}
                  </td>
                  <td className="px-3 py-3 font-bold text-[var(--color-text-main)]">
                    {row.ten_bcvh}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-gray-600">
                    {formatOverviewNumber(row.volume)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-emerald-600">
                    {formatOverviewNumber(row.passed)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-rose-500">
                    {formatOverviewNumber(row.failed)}
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-extrabold text-[var(--color-primary-600)]">
                    {formatOverviewRate(row.rate)}
                  </td>
                  <td className="px-3 py-3 text-right text-xs">
                    {rateDelta !== null ? (
                      <div className="font-semibold text-gray-700">
                        {formatSignedDeltaStr(rateDelta, ' điểm %')}
                        <span className="ml-1 font-normal text-gray-400">
                          ({formatSignedVolumeStr(volumeDelta)} BG)
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">{DASH}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50/90 font-bold text-gray-900">
              <td className="px-3 py-3">{DASH}</td>
              <td className="px-3 py-3 text-sm font-bold text-gray-900">{mtdTotalRow.ten_bcvh}</td>
              <td className="px-3 py-3 text-right font-semibold text-gray-800">
                {formatOverviewNumber(mtdTotalRow.volume)}
              </td>
              <td className="px-3 py-3 text-right font-semibold text-emerald-700">
                {formatOverviewNumber(mtdTotalRow.passed)}
              </td>
              <td className="px-3 py-3 text-right font-semibold text-rose-600">
                {formatOverviewNumber(mtdTotalRow.failed)}
              </td>
              <td className="px-3 py-3 text-right text-sm font-black text-[var(--color-primary-700)]">
                {formatOverviewRate(mtdTotalRow.rate)}
              </td>
              <td className="px-3 py-3 text-right text-xs font-semibold text-gray-700">
                {mtdTotalRow.prev_rate !== null && mtdTotalRow.rate !== null ? (
                  <div>
                    {formatSignedDeltaStr(mtdTotalRow.rate - mtdTotalRow.prev_rate, ' điểm %')}
                    <span className="ml-1 font-normal text-gray-500">
                      ({formatSignedVolumeStr(mtdTotalRow.volume - mtdTotalRow.prev_volume)} BG)
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400">{DASH}</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// 2. Monthly Trend Block (Khối 1)
export function BcvhMonthlyTrendBlock({ data }) {
  if (!data) return null;
  const { months, monthlyChartData, monthlyTableRows, nameMap, meta } = data;
  const anchorDate = meta?.anchor_date || null;

  return (
    <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-surface-200)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[var(--color-primary-600)]" />
            <h2 className="text-base font-bold text-[var(--color-text-main)]">
              Xu hướng chất lượng theo tháng (T01 đến tháng hiện tại)
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            So sánh xu hướng 6 BCVH chuẩn. Trục Y co theo dữ liệu thực tế.
          </p>
        </div>
        {anchorDate ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 border border-amber-200/60">
            <Clock className="h-3.5 w-3.5" />
            <span>Tháng hiện tại lũy kế đến {anchorDate}</span>
          </div>
        ) : null}
      </div>

      <div className="mb-6">
        <BcvhMultiSeriesTrendChart
          data={monthlyChartData}
          nameMap={nameMap}
          connectNulls={true}
          isMonthly={true}
          anchorDate={anchorDate}
          height={300}
        />
      </div>

      {/* Monthly Data Table */}
      <div className="overflow-x-auto border-t border-gray-100 pt-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Chi tiết số liệu theo tháng
        </h3>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-[var(--color-text-muted)]">
              <th className="sticky left-0 bg-gray-50/90 px-3 py-2.5 font-semibold">Đơn vị BCVH</th>
              {months.map((m) => {
                const label = m.endsWith('-01') ? 'T1' : `T${parseInt(m.slice(5), 10)}`;
                const isCurrent = data.latestMonth === m;
                return (
                  <th key={m} className="px-3 py-2.5 text-center font-semibold">
                    <div>{label}</div>
                    {isCurrent ? (
                      <div className="text-[10px] font-normal text-amber-700">Lũy kế</div>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {monthlyTableRows.map((row) => (
              <tr key={row.ma_bcvh} className="hover:bg-gray-50/50 transition-colors">
                <td className="sticky left-0 bg-white px-3 py-2.5 font-bold text-[var(--color-text-main)] shadow-xs">
                  {row.ten_bcvh}
                </td>
                {row.months.map((m) => {
                  const hasPartialCoverage =
                    m.days_with_data > 0 &&
                    m.days_in_period > 0 &&
                    m.days_with_data < m.days_in_period;

                  return (
                    <td key={m.month} className="px-3 py-2.5 text-center">
                      <div className="font-bold text-[var(--color-text-main)]">
                        {formatOverviewRate(m.rate)}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {m.volume ? `${formatOverviewNumber(m.volume)} BG` : ''}
                      </div>
                      {hasPartialCoverage && m.rate !== null ? (
                        <div className="mt-0.5 inline-block rounded bg-amber-50 px-1 py-0.2 text-[9px] font-semibold text-amber-700 border border-amber-200/50">
                          {m.days_with_data}/{m.days_in_period} ngày
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
            {routeRows.map((row) => (
              <tr key={row.ma_bcvh} className="hover:bg-emerald-50/30 transition-colors">
                <td className="px-3 py-3 font-bold text-[var(--color-text-main)]">
                  {row.ten_bcvh}
                </td>
                <td className="px-3 py-3 text-right font-extrabold text-gray-900">
                  {formatOverviewNumber(row.participating_route_count)}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-emerald-600">
                  {formatOverviewNumber(row.green)}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-pink-600">
                  {formatOverviewNumber(row.pink)}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-amber-600">
                  {formatOverviewNumber(row.yellow)}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-rose-600">
                  {formatOverviewNumber(row.red)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50/90 font-bold text-gray-900">
              <td className="px-3 py-3 text-sm font-bold text-gray-900">{routeTotalRow.ten_bcvh}</td>
              <td className="px-3 py-3 text-right text-sm font-black text-emerald-800">
                {formatOverviewNumber(routeTotalRow.participating_route_count)}
              </td>
              <td className="px-3 py-3 text-right font-bold text-emerald-700">
                {formatOverviewNumber(routeTotalRow.green)}
              </td>
              <td className="px-3 py-3 text-right font-bold text-pink-700">
                {formatOverviewNumber(routeTotalRow.pink)}
              </td>
              <td className="px-3 py-3 text-right font-bold text-amber-700">
                {formatOverviewNumber(routeTotalRow.yellow)}
              </td>
              <td className="px-3 py-3 text-right font-bold text-rose-700">
                {formatOverviewNumber(routeTotalRow.red)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// 4. Daily Trend Block (Khối 2, Collapsed details default, UI toggle only)
export function BcvhDailyTrendBlock({ data }) {
  if (!data) return null;
  const { dailyChartData, nameMap, meta } = data;
  const anchorDate = meta?.anchor_date || null;
  const periodLabel = meta?.month_period
    ? `Ngày 01 đến ${anchorDate || meta.month_period.to_date}`
    : 'Tháng hiện tại';

  return (
    <details className="group rounded-2xl border border-[var(--color-surface-200)] bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer items-center justify-between p-5 transition-colors hover:bg-gray-50/80">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--color-text-main)]">
                Diễn biến theo ngày ({periodLabel})
              </h2>
              <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                Mặc định thu gọn
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              Biểu đồ chi tiết theo từng ngày trong tháng hiện tại. Nhấp để xem/thu gọn.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <span className="hidden sm:inline">Chi tiết ngày</span>
          <ChevronDown className="h-5 w-5 transition-transform duration-200 group-open:rotate-180 text-gray-400" />
        </div>
      </summary>

      <div className="border-t border-gray-100 p-5">
        <BcvhMultiSeriesTrendChart
          data={dailyChartData}
          nameMap={nameMap}
          connectNulls={false}
          isMonthly={false}
          anchorDate={anchorDate}
          height={280}
        />
      </div>
    </details>
  );
}
