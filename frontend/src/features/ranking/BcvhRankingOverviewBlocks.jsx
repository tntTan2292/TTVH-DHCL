import { ChevronDown, Calendar, Route, BarChart3, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import BcvhMultiSeriesTrendChart from './BcvhMultiSeriesTrendChart';
import {
  DASH,
  BCVH_COLORS,
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
              <th className="px-3 py-2.5 text-right font-semibold">Sản lượng MTD</th>
              <th className="px-3 py-2.5 text-right font-semibold">Đạt MTD</th>
              <th className="px-3 py-2.5 text-right font-semibold">Không đạt MTD</th>
              <th className="px-3 py-2.5 text-right font-bold text-gray-800 w-32">Tỷ lệ MTD</th>
              <th className="px-3 py-2.5 text-right font-semibold">So cùng kỳ tháng trước</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mtdRows.map((row) => {
              const rateDelta = row.prev_rate !== null && row.rate !== null ? row.rate - row.prev_rate : null;
              const volumeDelta = row.prev_volume !== null && row.volume !== null ? row.volume - row.prev_volume : null;
              const color = BCVH_COLORS[row.ma_bcvh] || '#cbd5e1';

              let rankBadge = <span className="text-gray-500 font-semibold">{row.rank ? `#${row.rank}` : DASH}</span>;
              if (row.rank === 1) rankBadge = <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800 border border-yellow-300 shadow-xs">#1</span>;
              else if (row.rank === 2) rankBadge = <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 border border-slate-300 shadow-xs">#2</span>;
              else if (row.rank === 3) rankBadge = <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800 border border-orange-300 shadow-xs">#3</span>;

              return (
                <tr key={row.ma_bcvh} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-3 py-3">
                    {rankBadge}
                  </td>
                  <td className="px-3 py-3 font-bold text-[var(--color-text-main)]">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-1 rounded-full" style={{ backgroundColor: color }} />
                      {row.ten_bcvh}
                    </div>
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
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-col gap-1 items-end w-full">
                      <span className="text-sm font-extrabold text-[var(--color-text-main)]">
                        {formatOverviewRate(row.rate)}
                      </span>
                      {row.rate !== null && (
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, row.rate))}%`, backgroundColor: color }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-xs">
                    {rateDelta !== null ? (
                      <div className={`font-semibold flex items-center justify-end gap-1 ${rateDelta > 0 ? 'text-emerald-600' : rateDelta < 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                        {rateDelta > 0 ? <ArrowUp className="h-3.5 w-3.5" /> : rateDelta < 0 ? <ArrowDown className="h-3.5 w-3.5" /> : null}
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
            <tr className="border-t-2 border-[var(--color-primary-300)] bg-blue-50/50 font-bold text-gray-900 shadow-inner">
              <td className="px-3 py-3">{DASH}</td>
              <td className="px-3 py-3 text-sm font-bold text-[var(--color-primary-800)]">{mtdTotalRow.ten_bcvh}</td>
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
                  <div className={`flex items-center justify-end gap-1 ${mtdTotalRow.rate - mtdTotalRow.prev_rate > 0 ? 'text-emerald-700' : mtdTotalRow.rate - mtdTotalRow.prev_rate < 0 ? 'text-rose-700' : 'text-gray-600'}`}>
                    {mtdTotalRow.rate - mtdTotalRow.prev_rate > 0 ? <ArrowUp className="h-4 w-4" /> : mtdTotalRow.rate - mtdTotalRow.prev_rate < 0 ? <ArrowDown className="h-4 w-4" /> : null}
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Chi tiết số liệu theo tháng
          </h3>
          <div className="flex gap-3 text-[10px] font-medium text-gray-500">
            <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-sm bg-gray-200"></div> Tỷ lệ tháng</span>
            <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-sm bg-gray-200"></div> Sản lượng</span>
            <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-sm bg-amber-100 border border-amber-200"></div> Độ phủ (nếu thiếu)</span>
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

                  let bgColor = 'bg-slate-50';
                  if (m.rate !== null) {
                    if (m.rate >= 70) bgColor = 'bg-emerald-50/60';
                    else if (m.rate >= 60) bgColor = 'bg-fuchsia-50/60';
                    else if (m.rate >= 50) bgColor = 'bg-amber-50/60';
                    else bgColor = 'bg-rose-50/60';
                  }

                  return (
                    <td key={m.month} className={`px-3 py-2.5 text-center ${bgColor} ${isCurrent ? 'border-l border-r border-blue-100' : ''}`}>
                      <div className={`font-extrabold ${m.rate === null ? 'text-gray-400' : 'text-[var(--color-text-main)]'}`}>
                        {m.rate !== null ? formatOverviewRate(m.rate) : '—'}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium">
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

// 4. Daily Trend Block (Khối 2, Collapsed details default, UI toggle only)
export function BcvhDailyTrendBlock({ data }) {
  if (!data) return null;
  const { dailyChartData, nameMap, meta } = data;
  const anchorDate = meta?.anchor_date || null;
  const periodLabel = meta?.month_period
    ? `Ngày 01 đến ${anchorDate || meta.month_period.to_date}`
    : 'Tháng hiện tại';

  return (
    <details open className="group rounded-2xl border border-[var(--color-surface-200)] bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden">
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
                Dữ liệu đến N-1
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
