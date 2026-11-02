import { useMemo, useRef, useState } from 'react';
import { Table, AlertCircle } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme, indicatorTargetRate } from '../../indicator/indicatorConfig.js';
import {
  HEADER_VOLUME,
  HEADER_COMPARE_N1,
  HEADER_COMPARE_N7,
  NOTE_N_DAY,
  rateHeader,
  formatVolume,
  formatRate,
  formatRateDelta,
  formatVolumeDelta,
  sortDaySummaryRows,
  classifyRateTone,
  classifyDeltaTone,
} from '../f13v2Helpers.js';

function DeltaBadge({ rateDelta, volumeDelta }) {
  if (rateDelta === null && volumeDelta === null) {
    return <span className="text-slate-400 font-medium">—</span>;
  }
  const tone = classifyDeltaTone(rateDelta);
  const toneClasses = {
    success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    danger: 'text-rose-700 bg-rose-50 border-rose-200',
    neutral: 'text-slate-600 bg-slate-50 border-slate-200',
  }[tone];

  return (
    <div className="inline-flex flex-col items-center">
      {rateDelta !== null ? (
        <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold border ${toneClasses}`}>
          {formatRateDelta(rateDelta)}
        </span>
      ) : null}
      {volumeDelta !== null ? (
        <span className="text-[10px] text-slate-500 font-medium mt-0.5" title="Chênh lệch sản lượng">
          {formatVolumeDelta(volumeDelta)}
        </span>
      ) : null}
    </div>
  );
}

function RateBadge({ rate, target = 90 }) {
  const tone = classifyRateTone(rate, target);
  const toneClasses = {
    success: 'text-emerald-800 bg-emerald-100/80 border-emerald-300 font-black',
    warning: 'text-amber-800 bg-amber-100/80 border-amber-300 font-bold',
    danger: 'text-rose-800 bg-rose-100/80 border-rose-300 font-black',
    neutral: 'text-slate-700 bg-slate-100 border-slate-200 font-medium',
  }[tone];

  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs border ${toneClasses}`}>
      {formatRate(rate)}
    </span>
  );
}

export default function F13V2DaySummaryTable({
  data,
  loading = false,
  error = null,
  fromDate,
  toDate,
}) {
  const cardRef = useRef(null);
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const targetRate = indicatorTargetRate(indicator);

  const [sort, setSort] = useState({ field: 'rank', direction: 'asc' });

  const rows = useMemo(() => data?.rows || [], [data?.rows]);
  const meta = data?.meta || {};
  const totalRow = meta?.total_row || null;

  const hasRank = rows.length > 0 && rows[0].rank !== undefined && rows[0].rank !== null;

  const handleSort = (field) => {
    setSort((current) => {
      if (current.field === field) {
        return { field, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'asc' };
    });
  };

  const sortedRows = useMemo(() => {
    return sortDaySummaryRows(rows, sort.field, sort.direction);
  }, [rows, sort.field, sort.direction]);

  const periodLabel = fromDate === toDate ? `Ngày ${toDate}` : `${fromDate} đến ${toDate}`;

  return (
    <section
      ref={cardRef}
      className="w-full rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm transition-[box-shadow,border-color] duration-150"
    >
      {/* Block Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 shadow-2xs">
            <Table className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Bảng BCVH theo ngày
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                ({periodLabel})
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Tổng hợp sản lượng, tỷ lệ đạt KPI 2026, tiền trễ và so sánh đối ứng N-1 / N-7 theo bưu cục vận hành.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2" data-no-capture="true">
          <BlockCaptureButton
            targetRef={cardRef}
            blockTitle="Bảng BCVH theo ngày"
            dateOrPeriod={periodLabel}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>Đang tải bảng BCVH theo ngày...</span>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 text-xs text-red-800">
          <div className="flex items-center gap-2 font-bold text-sm text-red-900">
            <AlertCircle className="h-4 w-4" />
            Không thể tải dữ liệu bảng BCVH theo ngày
          </div>
          <p className="mt-1">{error}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
          Không có dữ liệu BCVH cho mốc thời gian đã chọn.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs">
          <table className="w-full border-collapse text-left text-xs">
            {/* Header Tier 1: Group categories */}
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th colSpan={hasRank ? 3 : 2} className="px-3 py-2 text-center border-r border-slate-200">
                  Đơn vị
                </th>
                <th colSpan={4} className="px-3 py-2 text-center border-r border-slate-200 bg-blue-50/60 text-blue-900">
                  Kỳ báo cáo ({periodLabel})
                </th>
                <th colSpan={2} className="px-3 py-2 text-center border-r border-slate-200 bg-amber-50/60 text-amber-900">
                  Tiền trễ
                </th>
                <th colSpan={2} className="px-3 py-2 text-center border-r border-slate-200 bg-emerald-50/40 text-emerald-900">
                  {HEADER_COMPARE_N1}
                </th>
                <th colSpan={2} className="px-3 py-2 text-center bg-sky-50/40 text-sky-900">
                  {HEADER_COMPARE_N7}
                </th>
              </tr>

              {/* Header Tier 2: Column Titles */}
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase text-slate-700">
                {hasRank && (
                  <SortableTh
                    field="rank"
                    sort={sort}
                    onSort={handleSort}
                    activeClassName={theme.sortActive}
                    className="w-12 px-2 py-2 text-center border-r border-slate-200"
                  >
                    Vị thứ
                  </SortableTh>
                )}
                <SortableTh
                  field="ma_bcvh"
                  sort={sort}
                  onSort={handleSort}
                  activeClassName={theme.sortActive}
                  className="w-20 px-2.5 py-2 text-center border-r border-slate-200"
                >
                  Mã BCVH
                </SortableTh>
                <SortableTh
                  field="ten_bcvh"
                  sort={sort}
                  onSort={handleSort}
                  activeClassName={theme.sortActive}
                  className="min-w-[130px] px-3 py-2 text-left border-r border-slate-200"
                >
                  Tên bưu cục
                </SortableTh>

                {/* Kỳ báo cáo columns */}
                <SortableTh
                  field="volume"
                  sort={sort}
                  onSort={handleSort}
                  activeClassName={theme.sortActive}
                  className="px-2.5 py-2 text-right bg-blue-50/30"
                >
                  {HEADER_VOLUME}
                </SortableTh>
                <SortableTh
                  field="passed"
                  sort={sort}
                  onSort={handleSort}
                  activeClassName={theme.sortActive}
                  className="px-2.5 py-2 text-right bg-blue-50/30 text-emerald-700"
                >
                  Đạt
                </SortableTh>
                <SortableTh
                  field="failed"
                  sort={sort}
                  onSort={handleSort}
                  activeClassName={theme.sortActive}
                  className="px-2.5 py-2 text-right bg-blue-50/30 text-rose-700"
                >
                  Không đạt
                </SortableTh>
                <SortableTh
                  field="rate"
                  sort={sort}
                  onSort={handleSort}
                  activeClassName={theme.sortActive}
                  className="px-3 py-2 text-center border-r border-slate-200 bg-blue-50/30"
                >
                  {rateHeader(indicator)}
                </SortableTh>

                {/* Tiền trễ */}
                <SortableTh
                  field="late_cash.count"
                  sort={sort}
                  onSort={handleSort}
                  activeClassName={theme.sortActive}
                  className="px-2.5 py-2 text-right bg-amber-50/30"
                >
                  Số BG
                </SortableTh>
                <SortableTh
                  field="late_cash.rate"
                  sort={sort}
                  onSort={handleSort}
                  activeClassName={theme.sortActive}
                  className="px-2.5 py-2 text-center border-r border-slate-200 bg-amber-50/30"
                >
                  Tỷ lệ
                </SortableTh>

                {/* So sánh N-1 */}
                <SortableTh
                  field="compare.n1.rate"
                  sort={sort}
                  onSort={handleSort}
                  activeClassName={theme.sortActive}
                  className="px-2.5 py-2 text-center bg-emerald-50/20"
                >
                  Tỷ lệ
                </SortableTh>
                <SortableTh
                  field="compare.n1.rate_delta"
                  sort={sort}
                  onSort={handleSort}
                  activeClassName={theme.sortActive}
                  className="px-2.5 py-2 text-center border-r border-slate-200 bg-emerald-50/20"
                >
                  Chênh lệch
                </SortableTh>

                {/* So sánh N-7 */}
                <SortableTh
                  field="compare.n7.rate"
                  sort={sort}
                  onSort={handleSort}
                  activeClassName={theme.sortActive}
                  className="px-2.5 py-2 text-center bg-sky-50/20"
                >
                  Tỷ lệ
                </SortableTh>
                <SortableTh
                  field="compare.n7.rate_delta"
                  sort={sort}
                  onSort={handleSort}
                  activeClassName={theme.sortActive}
                  className="px-2.5 py-2 text-center bg-sky-50/20"
                >
                  Chênh lệch
                </SortableTh>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {sortedRows.map((row) => (
                <tr key={row.ma_bcvh} className="hover:bg-blue-50/30 transition-colors duration-100">
                  {hasRank && (
                    <td className="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-100">
                      {row.rank ?? '—'}
                    </td>
                  )}
                  <td className="px-2.5 py-2 text-center font-mono font-semibold text-slate-600 border-r border-slate-100">
                    {row.ma_bcvh}
                  </td>
                  <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-100">
                    {row.ten_bcvh}
                  </td>

                  <td className="px-2.5 py-2 text-right font-medium text-slate-800">
                    {formatVolume(row.volume)}
                  </td>
                  <td className="px-2.5 py-2 text-right font-medium text-emerald-700">
                    {formatVolume(row.passed)}
                  </td>
                  <td className="px-2.5 py-2 text-right font-medium text-rose-700">
                    {formatVolume(row.failed)}
                  </td>
                  <td className="px-3 py-2 text-center border-r border-slate-100">
                    <RateBadge rate={row.rate} target={targetRate} />
                  </td>

                  <td className="px-2.5 py-2 text-right font-medium text-slate-700">
                    {formatVolume(row.late_cash?.count)}
                  </td>
                  <td className="px-2.5 py-2 text-center font-medium text-slate-700 border-r border-slate-100">
                    {formatRate(row.late_cash?.rate)}
                  </td>

                  <td className="px-2.5 py-2 text-center font-medium text-slate-700">
                    {formatRate(row.compare?.n1?.rate)}
                  </td>
                  <td className="px-2.5 py-2 text-center border-r border-slate-100">
                    <DeltaBadge
                      rateDelta={row.compare?.n1?.rate_delta}
                      volumeDelta={row.compare?.n1?.volume_delta}
                    />
                  </td>

                  <td className="px-2.5 py-2 text-center font-medium text-slate-700">
                    {formatRate(row.compare?.n7?.rate)}
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    <DeltaBadge
                      rateDelta={row.compare?.n7?.rate_delta}
                      volumeDelta={row.compare?.n7?.volume_delta}
                    />
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Total Row */}
            {totalRow && (
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                <tr>
                  <td
                    colSpan={hasRank ? 3 : 2}
                    className="px-3 py-2.5 text-center uppercase tracking-wider text-xs border-r border-slate-200"
                  >
                    {totalRow.ten_bcvh || 'TỔNG CỘNG'}
                  </td>
                  <td className="px-2.5 py-2.5 text-right font-black">
                    {formatVolume(totalRow.volume)}
                  </td>
                  <td className="px-2.5 py-2.5 text-right font-black text-emerald-800">
                    {formatVolume(totalRow.passed)}
                  </td>
                  <td className="px-2.5 py-2.5 text-right font-black text-rose-800">
                    {formatVolume(totalRow.failed)}
                  </td>
                  <td className="px-3 py-2.5 text-center border-r border-slate-200">
                    <RateBadge rate={totalRow.rate} target={targetRate} />
                  </td>

                  <td className="px-2.5 py-2.5 text-right font-bold text-slate-800">
                    {formatVolume(totalRow.late_cash?.count)}
                  </td>
                  <td className="px-2.5 py-2.5 text-center font-bold text-slate-800 border-r border-slate-200">
                    {formatRate(totalRow.late_cash?.rate)}
                  </td>

                  <td className="px-2.5 py-2.5 text-center font-bold text-slate-800">
                    {formatRate(totalRow.compare?.n1?.rate)}
                  </td>
                  <td className="px-2.5 py-2.5 text-center border-r border-slate-200">
                    <DeltaBadge
                      rateDelta={totalRow.compare?.n1?.rate_delta}
                      volumeDelta={totalRow.compare?.n1?.volume_delta}
                    />
                  </td>

                  <td className="px-2.5 py-2.5 text-center font-bold text-slate-800">
                    {formatRate(totalRow.compare?.n7?.rate)}
                  </td>
                  <td className="px-2.5 py-2.5 text-center">
                    <DeltaBadge
                      rateDelta={totalRow.compare?.n7?.rate_delta}
                      volumeDelta={totalRow.compare?.n7?.volume_delta}
                    />
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Note footer */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
        <span>{NOTE_N_DAY}</span>
        {meta?.compare ? (
          <span>
            Khoảng so sánh: N-1 ({meta.compare.n1?.from_date} đến {meta.compare.n1?.to_date}) · N-7 ({meta.compare.n7?.from_date} đến {meta.compare.n7?.to_date})
          </span>
        ) : null}
      </div>
    </section>
  );
}
