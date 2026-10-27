import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, TrendingUp, X } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_TONE_CLASS,
} from '../../../components/f13/f13HeatmapBandCatalog.js';
import { formatRate, formatVolume } from '../../dashboard/components/bcvhOperationTableData.js';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTargetRate, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { useIndicatorApi } from '../../indicator/useIndicatorApi.js';
import {
  computePostmanTrendDateRange,
  normalizePostmanTrendDays,
} from './f42PostmanTableHelpers.js';

const RANGE_CHOICES = [7, 14, 30, 60, 90];

function PostmanTrendTooltip({ active, payload, label, targetRate = 90, heatmapBands }) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload || {};
  const hasData = point.data_available && point.rate !== null && point.rate !== undefined;
  const band = hasData ? classifyF13HeatmapRate(point.rate, heatmapBands) : null;
  const toneClass = band ? F13_HEATMAP_TONE_CLASS[band.tone] : '';

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-xs text-xs">
      <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center justify-between gap-3">
        <span>{point.date ? `Ngày ${point.date}` : label}</span>
        {hasData ? (
          <span className={`px-1.5 py-0.5 rounded border text-[11px] font-bold tabular-nums ${toneClass}`}>
            {point.rate?.toFixed(2)} %
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded border text-[11px] font-medium bg-slate-100 text-slate-500 border-slate-200">
            Không phát sinh
          </span>
        )}
      </div>

      {hasData ? (
        <div className="mt-2 space-y-1 font-medium">
          <div className="flex items-center justify-between gap-4 text-slate-600">
            <span>Mục tiêu:</span>
            <span className="font-bold text-rose-600 tabular-nums">{targetRate} %</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-600">
            <span>Sản lượng:</span>
            <span className="font-bold text-slate-900 tabular-nums">{formatVolume(point.volume)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-600">
            <span>Đạt:</span>
            <span className="font-bold text-emerald-700 tabular-nums">{formatVolume(point.passed)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-600">
            <span>Không đạt:</span>
            <span className="font-bold text-rose-700 tabular-nums">
              {formatVolume(point.failed)}
              {point.blank > 0 && (
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  (gồm {point.blank} chưa ĐG)
                </span>
              )}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-slate-500">
          Không phát sinh sản lượng phát giao trong ngày này.
        </div>
      )}
    </div>
  );
}

export default function F42PostmanTrendModal({
  isOpen,
  onClose,
  postman,
  anchorDate = null,
  maBcvhScope = 'all',
}) {
  const api = useIndicatorApi();
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const targetRate = indicatorTargetRate(indicator) || 90;

  const [daysRange, setDaysRange] = useState(30);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState(null);
  const [emptyNotice, setEmptyNotice] = useState(null);

  const cardRef = useRef(null);

  // Compute date range based on anchorDate and chosen daysRange
  const { fromDate, toDate } = useMemo(() => {
    return computePostmanTrendDateRange(anchorDate, daysRange);
  }, [anchorDate, daysRange]);

  // Fetch trend data
  useEffect(() => {
    if (!isOpen || !postman?.ma_buu_ta) return undefined;

    let active = true;

    const fetchTrend = async () => {
      try {
        setLoading(true);
        setEmptyNotice(null);

        const params = {
          ma_buu_ta: postman.ma_buu_ta,
          from_date: fromDate,
          to_date: toDate,
          ...(maBcvhScope && maBcvhScope !== 'all' ? { ma_bcvh: maBcvhScope } : {}),
        };

        const response = await api.get('/f42/dashboard/postman-trend', { params });
        if (!active) return;

        if (response.data && response.data.success) {
          const payload = response.data.data;
          setTrendData(payload);

          if (!payload?.meta?.has_data || !payload?.days || payload.days.length === 0) {
            setEmptyNotice(
              `Bưu tá ${postman.ten_buu_ta} (${postman.ma_buu_ta}) không có dữ liệu phát sinh trong ${daysRange} ngày đã chọn.`
            );
          }
        } else {
          // Empty or soft scope restriction: display friendly notice, never a red error
          setEmptyNotice(
            response.data?.error?.message ||
              `Không có dữ liệu phát sinh của bưu tá ${postman.ten_buu_ta} trong kỳ này.`
          );
        }
      } catch (err) {
        if (!active) return;
        // Check for 403 / scope restrictions: friendly notice
        if (err.response?.status === 403) {
          setEmptyNotice('Bưu tá này không thuộc BCVH được phân quyền quản lý của tài khoản bạn.');
        } else {
          setEmptyNotice(
            `Không có dữ liệu phát sinh hoặc bưu tá ${postman.ten_buu_ta} chưa có lượt giao trong kỳ.`
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchTrend();

    return () => {
      active = false;
    };
  }, [api, isOpen, postman?.ma_buu_ta, postman?.ten_buu_ta, fromDate, toDate, maBcvhScope, daysRange]);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const chartDays = useMemo(() => {
    return normalizePostmanTrendDays(trendData?.days || []);
  }, [trendData?.days]);

  const totalRow = trendData?.total_row || null;
  const officeName =
    trendData?.offices?.[0]?.ten_bcvh ||
    postman?.ten_bcvh ||
    (postman?.ma_bcvh ? `BCVH ${postman.ma_bcvh}` : 'BCVH');

  const totalBand = totalRow
    ? classifyF13HeatmapRate(totalRow.rate, indicator.heatmapBands)
    : null;
  const totalToneClass = totalBand
    ? F13_HEATMAP_TONE_CLASS[totalBand.tone]
    : F13_HEATMAP_TONE_CLASS.unavailable;

  const datePeriodLabel = `Kỳ ${fromDate} → ${toDate} (${daysRange} ngày)`;
  const blockTitle = `Xu hướng bưu tá ${postman?.ten_buu_ta || ''} (${postman?.ma_buu_ta || ''})`;

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={blockTitle}
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white border border-slate-200/90 shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-start gap-2.5">
            <span className={`h-5 w-1.5 shrink-0 rounded-full ${theme.accentBar || 'bg-sky-500'} mt-0.5`} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {postman?.ten_buu_ta || 'Bưu tá'}
                </h3>
                <span className={`font-mono text-xs px-2 py-0.5 rounded font-semibold ${theme.chip || 'bg-sky-50 text-sky-800 border-sky-200'}`}>
                  {postman?.ma_buu_ta}
                </span>
                <span className="text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                  {officeName}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chất lượng phát giao theo ngày · Mục tiêu {targetRate} % · {datePeriodLabel}
              </p>
            </div>
          </div>

          {/* Header Controls: Range Switcher + Capture + Close */}
          <div data-no-capture="true" className="flex items-center gap-2 self-end sm:self-center">
            {/* Days range buttons */}
            <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-semibold">
              {RANGE_CHOICES.map((choice) => {
                const active = daysRange === choice;
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setDaysRange(choice)}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      active
                        ? `${theme.button || 'bg-sky-600 text-white'} shadow-xs font-bold`
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {choice}N
                  </button>
                );
              })}
            </div>

            {/* Block Camera Capture */}
            <BlockCaptureButton
              targetRef={cardRef}
              blockTitle={blockTitle}
              dateOrPeriod={datePeriodLabel}
              indicatorOverride="F4.2"
            />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Summary metrics of total_row */}
          {totalRow && !emptyNotice && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
                <span className="text-[11px] font-semibold text-slate-500">Tổng sản lượng</span>
                <div className="mt-1 text-lg font-black text-slate-900 tabular-nums">
                  {formatVolume(totalRow.volume)}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-2.5">
                <span className="text-[11px] font-semibold text-emerald-800">Số bưu gửi đạt</span>
                <div className="mt-1 text-lg font-black text-emerald-700 tabular-nums">
                  {formatVolume(totalRow.passed)}
                </div>
              </div>

              <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-2.5">
                <span className="text-[11px] font-semibold text-rose-800">Không đạt</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-rose-700 tabular-nums">
                    {formatVolume(totalRow.failed)}
                  </span>
                  {totalRow.blank > 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      (gồm {totalRow.blank} chưa ĐG)
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-sky-200/80 bg-sky-50/40 p-2.5">
                <span className="text-[11px] font-semibold text-sky-900">Tỷ lệ toàn kỳ</span>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded border text-sm font-black tabular-nums ${totalToneClass}`}>
                    {formatRate(totalRow.rate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Chart Section */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <TrendingUp size={14} className="text-sky-600" />
                <span>Diễn biến tỷ lệ đạt theo ngày</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#0284C7]" />
                  Tỷ lệ đạt
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-3 border-t-2 border-dashed border-rose-500" />
                  Mục tiêu {targetRate} %
                </span>
              </div>
            </div>

            {loading ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-slate-400">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent mb-2" />
                <span className="text-xs font-semibold">Đang tải dữ liệu xu hướng bưu tá...</span>
              </div>
            ) : emptyNotice ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-center text-slate-500 bg-slate-50/50 rounded-lg p-6">
                <Info size={32} className="text-sky-500 mb-2" />
                <p className="text-sm font-semibold text-slate-700">{emptyNotice}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Hãy thử chọn số ngày xem lớn hơn (ví dụ 60N hoặc 90N) để xem lịch sử dài hơn.
                </p>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartDays} margin={{ top: 12, right: 18, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      minTickGap={16}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      tickFormatter={(val) => `${val}%`}
                      width={45}
                    />
                    <Tooltip
                      content={
                        <PostmanTrendTooltip
                          targetRate={targetRate}
                          heatmapBands={indicator.heatmapBands}
                        />
                      }
                    />
                    <ReferenceLine
                      y={targetRate}
                      stroke="#EF4444"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `${targetRate}%`,
                        position: 'insideTopRight',
                        fill: '#EF4444',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      name="Tỷ lệ đạt"
                      stroke="#0284C7"
                      strokeWidth={2.5}
                      dot={{ r: 3, strokeWidth: 1.5, fill: '#FFFFFF', stroke: '#0284C7' }}
                      activeDot={{ r: 5, fill: '#0284C7' }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Note on data gaps */}
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>* Ngày không phát sinh sản lượng phát giao để khoảng trống ngắt quãng, không nối và không gán bằng 0 %.</span>
              <span>Đơn vị tính: %</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
