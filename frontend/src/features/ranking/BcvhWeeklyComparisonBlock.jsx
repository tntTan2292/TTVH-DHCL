import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, ArrowUp, ArrowDown, Info } from 'lucide-react';
import api from '../../api/client';
import { ErrorState } from '../../components/shared/SharedComponents';
import { DASH, BCVH_COLORS, formatOverviewNumber, formatOverviewRate } from './bcvhOverviewData';
import { formatDisplayDate } from '../dashboard/components/operatingPatternTabsData';
import { createWeeksListFetcher, createWeeklyComparisonFetcher } from './bcvhWeeklyComparisonFetcher';
import { buildWeekOptions, formatSignedRateDelta, formatSignedVolumeDelta } from './bcvhWeeklyComparisonData';

function WeekSelect({ label, value, options, onChange, disabled }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--color-text-muted)]">
      {label}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs transition-all duration-150 hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600">
        <CalendarRange size={16} className="shrink-0 text-slate-400" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || !options.length}
          className="cursor-pointer border-none bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!options.length ? <option value="">Chưa có tuần nào</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </label>
  );
}

function WeekNote({ week }) {
  if (!week) return null;
  const hasGapBadge = week.days_with_data > 0 && week.days_in_period > 0 && week.days_with_data < week.days_in_period;
  if (!week.is_in_progress && !hasGapBadge) return null;
  return (
    <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 border border-amber-200/60">
      <Info className="h-3 w-3" />
      {week.is_in_progress
        ? `Dữ liệu đến ngày ${formatDisplayDate(week.data_through_note)}`
        : `${week.days_with_data}/${week.days_in_period} ngày có dữ liệu`}
    </div>
  );
}

function RateDeltaCell({ value }) {
  const formatted = formatSignedRateDelta(value);
  if (formatted === null) return <span className="text-gray-400">{DASH}</span>;
  const tone = value > 0 ? 'text-emerald-600' : value < 0 ? 'text-rose-600' : 'text-gray-500';
  return (
    <div className={`flex items-center justify-end gap-1 font-semibold ${tone}`}>
      {value > 0 ? <ArrowUp className="h-3.5 w-3.5" /> : value < 0 ? <ArrowDown className="h-3.5 w-3.5" /> : null}
      {formatted}
    </div>
  );
}

export default function BcvhWeeklyComparisonBlock() {
  const [weeksState, setWeeksState] = useState({ status: 'loading', weeks: [], error: null });
  const [selection, setSelection] = useState({ current: '', compare: '' });
  const [comparisonState, setComparisonState] = useState({ status: 'idle', data: null, error: null });

  const fetchWeeksRef = useRef(null);
  if (!fetchWeeksRef.current) fetchWeeksRef.current = createWeeksListFetcher(api, setWeeksState);
  useEffect(() => {
    fetchWeeksRef.current();
  }, []);

  const weekOptions = useMemo(() => buildWeekOptions(weeksState.weeks), [weeksState.weeks]);

  // Default selection once the list loads: current = tuần mới nhất, so sánh = tuần liền trước.
  // Người dùng có thể đổi sang bất kỳ 2 tuần nào khác sau đó (PO: "cho phép chọn bất kỳ hai tuần").
  useEffect(() => {
    if (weeksState.status !== 'success' || !weeksState.weeks.length) return;
    setSelection((prev) => {
      if (prev.current && prev.compare) return prev;
      const sorted = weeksState.weeks;
      const latest = sorted[sorted.length - 1];
      const previous = sorted.length > 1 ? sorted[sorted.length - 2] : latest;
      return {
        current: prev.current || latest.week_id,
        compare: prev.compare || previous.week_id,
      };
    });
  }, [weeksState.status, weeksState.weeks]);

  const fetchComparisonRef = useRef(null);
  if (!fetchComparisonRef.current) fetchComparisonRef.current = createWeeklyComparisonFetcher(api, setComparisonState);
  useEffect(() => {
    fetchComparisonRef.current(selection.current, selection.compare);
  }, [selection]);

  const currentWeek = weekOptions.find((o) => o.value === selection.current)?.week || null;
  const compareWeek = weekOptions.find((o) => o.value === selection.compare)?.week || null;

  const rows = comparisonState.data?.rows || [];
  const totalRow = comparisonState.data?.total_row || null;

  return (
    <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-surface-200)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-[var(--color-text-main)]">
              So sánh chất lượng theo tuần
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Tuần tính từ Thứ Năm đến Thứ Tư. So sánh 6 BCVH đang hiển thị giữa hai tuần bất kỳ.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <div>
            <WeekSelect
              label="Tuần kỳ này"
              value={selection.current}
              options={weekOptions}
              disabled={weeksState.status !== 'success'}
              onChange={(value) => setSelection((prev) => ({ ...prev, current: value }))}
            />
            <WeekNote week={currentWeek} />
          </div>
          <div>
            <WeekSelect
              label="Tuần so sánh"
              value={selection.compare}
              options={weekOptions}
              disabled={weeksState.status !== 'success'}
              onChange={(value) => setSelection((prev) => ({ ...prev, compare: value }))}
            />
            <WeekNote week={compareWeek} />
          </div>
        </div>
      </div>

      {weeksState.status === 'error' ? (
        <ErrorState title="Không thể tải danh sách tuần" description={weeksState.error} />
      ) : null}

      {weeksState.status === 'success' && !weeksState.weeks.length ? (
        <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
          Chưa có tuần nào có dữ liệu.
        </p>
      ) : null}

      {comparisonState.status === 'error' ? (
        <ErrorState title="Không thể so sánh hai tuần đã chọn" description={comparisonState.error} />
      ) : null}

      {comparisonState.status === 'loading' ? (
        <div className="flex h-24 items-center justify-center text-sm text-[var(--color-text-muted)]">
          <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary-600)] border-t-transparent" />
          Đang tải so sánh tuần...
        </div>
      ) : null}

      {comparisonState.status === 'success' && comparisonState.data ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-[var(--color-text-muted)]">
                <th rowSpan={2} className="px-3 py-2.5 align-bottom font-semibold">Đơn vị BCVH</th>
                <th colSpan={3} className="border-l border-gray-100 px-3 py-1.5 text-center font-semibold">
                  {currentWeek?.label || 'Tuần kỳ này'}
                </th>
                <th colSpan={3} className="border-l border-gray-100 px-3 py-1.5 text-center font-semibold">
                  {compareWeek?.label || 'Tuần so sánh'}
                </th>
                <th rowSpan={2} className="border-l border-gray-100 px-3 py-2.5 text-right align-bottom font-bold text-gray-800">
                  Chênh lệch
                </th>
              </tr>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-[var(--color-text-muted)]">
                <th className="border-l border-gray-100 px-3 py-2 text-right font-semibold">Sản lượng</th>
                <th className="px-3 py-2 text-right font-semibold">Đạt</th>
                <th className="px-3 py-2 text-right font-bold text-gray-800">Tỷ lệ</th>
                <th className="border-l border-gray-100 px-3 py-2 text-right font-semibold">Sản lượng</th>
                <th className="px-3 py-2 text-right font-semibold">Đạt</th>
                <th className="px-3 py-2 text-right font-bold text-gray-800">Tỷ lệ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const color = BCVH_COLORS[row.ma_bcvh] || '#cbd5e1';
                return (
                  <tr key={row.ma_bcvh} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-3 py-3 font-bold text-[var(--color-text-main)]">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-1 rounded-full" style={{ backgroundColor: color }} />
                        {row.ten_bcvh}
                      </div>
                    </td>
                    <td className="border-l border-gray-100 px-3 py-3 text-right font-medium text-gray-600">
                      {formatOverviewNumber(row.current.volume)}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-emerald-600">
                      {formatOverviewNumber(row.current.passed)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-extrabold text-[var(--color-text-main)]">
                      {formatOverviewRate(row.current.rate)}
                    </td>
                    <td className="border-l border-gray-100 px-3 py-3 text-right font-medium text-gray-600">
                      {formatOverviewNumber(row.compare.volume)}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-emerald-600">
                      {formatOverviewNumber(row.compare.passed)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-extrabold text-[var(--color-text-main)]">
                      {formatOverviewRate(row.compare.rate)}
                    </td>
                    <td className="border-l border-gray-100 px-3 py-3 text-right">
                      <RateDeltaCell value={row.rate_delta} />
                      <div className="mt-0.5 text-[10px] font-normal text-gray-400">
                        {formatSignedVolumeDelta(row.volume_delta)} BG
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {totalRow ? (
              <tfoot>
                <tr className="border-t-2 border-[var(--color-primary-300)] bg-indigo-50/50 font-bold text-gray-900 shadow-inner">
                  <td className="px-3 py-3 text-sm font-bold text-[var(--color-primary-800)]">{totalRow.ten_bcvh}</td>
                  <td className="border-l border-gray-100 px-3 py-3 text-right font-semibold text-gray-800">
                    {formatOverviewNumber(totalRow.current.volume)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-emerald-700">
                    {formatOverviewNumber(totalRow.current.passed)}
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-black text-[var(--color-primary-700)]">
                    {formatOverviewRate(totalRow.current.rate)}
                  </td>
                  <td className="border-l border-gray-100 px-3 py-3 text-right font-semibold text-gray-800">
                    {formatOverviewNumber(totalRow.compare.volume)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-emerald-700">
                    {formatOverviewNumber(totalRow.compare.passed)}
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-black text-[var(--color-primary-700)]">
                    {formatOverviewRate(totalRow.compare.rate)}
                  </td>
                  <td className="border-l border-gray-100 px-3 py-3 text-right">
                    <RateDeltaCell value={totalRow.rate_delta} />
                    <div className="mt-0.5 text-[10px] font-normal text-gray-500">
                      {formatSignedVolumeDelta(totalRow.volume_delta)} BG
                    </div>
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      ) : null}
    </div>
  );
}
