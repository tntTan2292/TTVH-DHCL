import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Sparkles } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_TONE_CLASS,
} from '../../../components/f13/f13HeatmapBandCatalog.js';
import { formatNumber, formatRate } from '../../dashboard/components/comboTrendlineData.js';
import { DASH, formatDateVN } from '../../dashboard/components/bcvhOperationTableData.js';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorEndpoint, indicatorTargetRate, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { useIndicatorApi } from '../../indicator/useIndicatorApi.js';

// "Toàn BĐTP" table of the F1.2 Dashboard (PO 2026-10-12): the whole city's figure of the selected DAY with its
// comparison against the previous day and the same weekday of the previous week ("cùng kỳ tuần trước"), in the
// layout of the operations table's "Điều hành ngày" group. No period switch, no unit or office rows: the
// accepting offices are in the operations table above, the accepting units in the Analysis module.

function RateBadge({ rate, bands, targetRate }) {
  if (rate === null || rate === undefined || rate === '' || !Number.isFinite(Number(rate))) {
    return <span className="text-slate-400 font-medium">{DASH}</span>;
  }
  const num = Number(rate);
  const band = classifyF13HeatmapRate(num, bands);
  const toneClass = F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable;
  const isTargetMet = num >= targetRate;
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 min-w-[72px] px-2.5 py-1 rounded-md border text-base font-bold tabular-nums ${toneClass}`}
      title={`${band.label}: ${formatRate(num)}${isTargetMet ? ` (Đạt mục tiêu ≥ ${targetRate}%)` : ''}`}
    >
      <span>{formatRate(num)}</span>
      {isTargetMet ? <Sparkles size={12} className="text-emerald-700 shrink-0" aria-label="Đạt mục tiêu" /> : null}
    </span>
  );
}

// +1,2 / -3,4 / 0,0 with an arrow; the delta comes from the API (points of rate).
function DeltaBadge({ value }) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return <span className="text-slate-400 font-medium">{DASH}</span>;
  }
  const num = Number(value);
  const tone = num > 0 ? 'text-emerald-700' : num < 0 ? 'text-red-600' : 'text-slate-500';
  const arrow = num > 0 ? '↑' : num < 0 ? '↓' : '→';
  const text = `${num > 0 ? '+' : ''}${num.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  return <span className={`font-bold tabular-nums ${tone}`}>{arrow} {text}</span>;
}

function comparisonOf(block) {
  if (!block || block.available === false) return { rate: null, delta: null, date: null };
  return {
    rate: block.pass_rate?.previous ?? null,
    delta: block.pass_rate?.delta ?? null,
    date: block.previous_date || null,
  };
}

export default function F12OfficeTableBlock({ anchorDate = null }) {
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const targetRate = indicatorTargetRate(indicator);
  const api = useIndicatorApi();
  const cardRef = useRef(null);
  const requestSeqRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchData = useCallback(() => {
    if (!anchorDate) return;
    // A slower, older response must never overwrite the answer of the day chosen last.
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    api.get(indicatorEndpoint('kpi', indicator), { params: { from_date: anchorDate, to_date: anchorDate, _ts: Date.now() } })
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        if (!res.data?.success) {
          throw new Error(res.data?.error?.message || 'Không thể tải số liệu toàn BĐTP.');
        }
        setData(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        setError(err.response?.data?.error?.message || err.message || 'Lỗi kết nối khi tải số liệu toàn BĐTP.');
        setLoading(false);
      });
  }, [api, indicator, anchorDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const volume = data?.total_bg ?? null;
  const rate = data && Number(data.total_bg) > 0 ? data.passed_rate : null;
  const previousDay = comparisonOf(data?.comparisons?.d1);
  const sameWeekday = comparisonOf(data?.comparisons?.d7);
  const nationalRank = data?.national_rank?.available ? data.national_rank : null;
  const dayLabel = anchorDate ? formatDateVN(anchorDate) : DASH;
  const hasData = volume !== null && Number(volume) > 0;

  return (
    <section
      ref={cardRef}
      className="w-full rounded-2xl border border-slate-200/90 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4 bg-slate-50 rounded-t-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-3 w-1.5 rounded-full ${theme.accentBar}`} />
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              SỐ LIỆU TOÀN BĐTP — {indicator.moduleLabel}
            </h3>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${theme.chip}`}>
              Mục tiêu {targetRate}%
            </span>
          </div>
          <p className="text-xs font-bold text-slate-700">
            Ngày {dayLabel}
            {nationalRank ? ` • VỊ THỨ TOÀN QUỐC: ${nationalRank.rank}/${nationalRank.total || 34}` : ''}
          </p>
        </div>
        <div data-no-capture="true" className="flex items-center gap-2">
          <BlockCaptureButton
            targetRef={cardRef}
            blockTitle="Số liệu toàn BĐTP"
            dateOrPeriod={anchorDate || ''}
          />
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-500">
            Đang tải số liệu toàn BĐTP...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <div className="font-bold">Không thể tải số liệu toàn BĐTP</div>
            <p className="mt-1 text-xs">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="mt-3 rounded-lg bg-red-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-red-800"
            >
              Thử lại
            </button>
          </div>
        ) : !hasData ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            <div className="text-sm font-bold text-slate-700">Chưa có số liệu toàn BĐTP</div>
            <p className="mt-1 text-xs">Không có dữ liệu cho ngày {dayLabel}. Vui lòng chọn ngày khác có dữ liệu.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[720px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="bg-slate-100/90 text-slate-800 font-black uppercase tracking-wider text-center py-2.5 px-3 border-r border-slate-300 text-sm">
                    Đơn vị
                  </th>
                  <th
                    colSpan={4}
                    className={`${theme.header2Bg} ${theme.header2Text} font-black uppercase tracking-wider text-center py-2.5 px-2 text-sm md:text-base`}
                  >
                    <div>ĐIỀU HÀNH NGÀY</div>
                    <div className="text-xs font-black text-rose-600 tracking-wide mt-0.5">NGÀY {dayLabel}</div>
                  </th>
                </tr>
                <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-800 text-sm sm:text-base font-extrabold">
                  <th className="py-2 px-3 text-center border-r border-slate-300">Phạm vi</th>
                  <th className="py-2 px-2 text-center border-r border-slate-200 leading-snug">Sản lượng đo kiểm</th>
                  <th className="py-2 px-2 text-center border-r border-slate-200 leading-snug">{`Tỷ lệ đạt ${indicator.moduleLabel}`}</th>
                  <th className="py-2 px-2 text-center border-r border-slate-200 leading-snug">
                    <span className="block">Tăng/Giảm so với</span>
                    <span className="block">ngày trước{previousDay.date ? ` (${formatDateVN(previousDay.date)})` : ''}</span>
                  </th>
                  <th className="py-2 px-2 text-center leading-snug">
                    <span className="block">Tăng/giảm so với</span>
                    <span className="block">cùng kỳ (tuần trước){sameWeekday.date ? ` (${formatDateVN(sameWeekday.date)})` : ''}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className={`${theme.soft} text-slate-950 font-black`}>
                  <td className="py-3 px-3 text-left font-black text-slate-900 border-r border-slate-300 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <Award size={16} className="text-rose-500" />
                      TOÀN BĐTP
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-black tabular-nums border-r border-slate-200 text-lg">
                    {formatNumber(volume)}
                  </td>
                  <td className="py-3 px-2 text-center border-r border-slate-200">
                    <RateBadge rate={rate} bands={indicator.heatmapBands} targetRate={targetRate} />
                  </td>
                  <td className="py-3 px-3 text-center border-r border-slate-200 text-base">
                    <DeltaBadge value={previousDay.delta} />
                  </td>
                  <td className="py-3 px-3 text-center text-base">
                    <DeltaBadge value={sameWeekday.delta} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
