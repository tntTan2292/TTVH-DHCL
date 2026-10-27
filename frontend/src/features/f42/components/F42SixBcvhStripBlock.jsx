import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle, AlertTriangle, Layers } from 'lucide-react';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { useIndicatorApi } from '../../indicator/useIndicatorApi.js';
import { indicatorTargetRate, indicatorTheme } from '../../indicator/indicatorConfig.js';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_TONE_CLASS,
} from '../../../components/f13/f13HeatmapBandCatalog.js';
import {
  CANONICAL_BCVH_UNITS,
  formatDateVN,
  formatRate,
  formatVolume,
} from '../../dashboard/components/bcvhOperationTableData.js';

export default function F42SixBcvhStripBlock({ anchorDate = null }) {
  const indicator = useIndicator();
  const api = useIndicatorApi();
  const theme = indicatorTheme(indicator);
  const targetRate = indicatorTargetRate(indicator);
  const cardRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  const [sortBy, setSortBy] = useState('rate'); // 'rate' | 'volume'
  const [sortDirection, setSortDirection] = useState('desc'); // 'desc' | 'asc'

  useEffect(() => {
    let active = true;
    const fetchOverview = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = anchorDate ? { anchor_date: anchorDate } : {};
        const response = await api.get('/f13/ranking/bcvh/overview', { params });
        if (!active) return;
        if (response.data && response.data.success) {
          setOverviewData(response.data.data);
        } else {
          throw new Error(response.data?.error?.message || 'Không thể tải dữ liệu 6 BCVH.');
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Lỗi khi tải dữ liệu 6 BCVH.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchOverview();
    return () => {
      active = false;
    };
  }, [api, anchorDate]);

  const effectiveDate = overviewData?.meta?.anchor_date || anchorDate;
  const formattedDate = formatDateVN(effectiveDate);

  // Extract the 6 canonical BCVH records for the effective anchor date
  const units = useMemo(() => {
    if (!overviewData || !overviewData.daily) return [];
    const dailyRows = overviewData.daily.filter((row) => row.date === effectiveDate);

    const items = CANONICAL_BCVH_UNITS.map((canonical) => {
      const found = dailyRows.find((row) => String(row.ma_bcvh) === canonical.ma_bcvh);
      const volume = found ? Number(found.volume || 0) : 0;
      const passed = found ? Number(found.passed || 0) : 0;
      const failed = found ? Number(found.failed || 0) : 0;
      const rate = found && found.rate !== null && found.rate !== undefined
        ? Number(found.rate)
        : (volume > 0 ? Number(((passed / volume) * 100).toFixed(2)) : null);

      return {
        ma_bcvh: canonical.ma_bcvh,
        ten_bcvh: canonical.ten_bcvh,
        volume,
        passed,
        failed,
        rate,
      };
    });

    const sign = sortDirection === 'asc' ? 1 : -1;
    return items.sort((a, b) => {
      if (sortBy === 'rate') {
        if (a.rate === null && b.rate === null) return 0;
        if (a.rate === null) return 1;
        if (b.rate === null) return -1;
        if (a.rate !== b.rate) return (a.rate - b.rate) * sign;
        return (b.volume - a.volume);
      }
      if (a.volume !== b.volume) return (a.volume - b.volume) * sign;
      const ra = a.rate ?? -1;
      const rb = b.rate ?? -1;
      return (rb - ra);
    });
  }, [overviewData, effectiveDate, sortBy, sortDirection]);

  const handleSortToggle = (field) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-center gap-2.5 text-slate-500 py-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
          <span className="text-xs font-semibold">Đang tải dải số liệu 6 BCVH hôm nay...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-800 shadow-2xs">
        <span className="font-semibold">Không thể tải số liệu 6 BCVH hôm nay: </span>
        {error}
      </div>
    );
  }

  const blockTitle = `6 BCVH hôm nay – Ngày ${formattedDate}`;

  return (
    <div
      ref={cardRef}
      className="w-full rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all duration-200"
    >
      {/* Header */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${theme.chip}`}>
              <Layers size={12} />
              6 BCVH hôm nay
            </span>
            <span className="text-xs font-medium text-slate-500">
              Ngày <span className="font-semibold text-slate-700">{formattedDate}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Mục tiêu: <span className="font-bold text-slate-800">{targetRate} %</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Tổng quan tỷ lệ đạt và sản lượng phát giao của 6 Bưu cục Vận hành theo ngày được chọn.
          </p>
        </div>

        {/* Controls */}
        <div data-no-capture="true" className="flex items-center gap-2 self-end sm:self-center">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleSortToggle('rate')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                sortBy === 'rate'
                  ? `${theme.button} shadow-2xs`
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Nhấn để đảo chiều sắp xếp theo Tỷ lệ đạt"
            >
              <span>Tỷ lệ</span>
              {sortBy === 'rate' && (
                sortDirection === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleSortToggle('volume')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                sortBy === 'volume'
                  ? `${theme.button} shadow-2xs`
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Nhấn để đảo chiều sắp xếp theo Sản lượng"
            >
              <span>Sản lượng</span>
              {sortBy === 'volume' && (
                sortDirection === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />
              )}
            </button>
          </div>

          <BlockCaptureButton
            targetRef={cardRef}
            blockTitle={blockTitle}
            dateOrPeriod={formattedDate}
            indicatorOverride={indicator.moduleLabel}
          />
        </div>
      </div>

      {/* 6 BCVH Strip Grid */}
      <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {units.map((unit, index) => {
          const rate = unit.rate;
          const band = classifyF13HeatmapRate(rate, indicator.heatmapBands);
          const toneClass = F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable;
          const isMet = rate !== null && rate >= targetRate;

          return (
            <div
              key={unit.ma_bcvh}
              className="relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 hover:bg-white hover:shadow-xs hover:border-slate-300 transition-all duration-150"
            >
              {/* Order badge & unit name */}
              <div className="flex items-start justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-700 leading-tight">
                  {unit.ten_bcvh.replace('BCVH ', '')}
                </span>
                <span className="shrink-0 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1 rounded">
                  #{index + 1}
                </span>
              </div>

              {/* Rate badge */}
              <div className="mt-2.5 flex items-center justify-between">
                <span
                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md border text-base font-extrabold tabular-nums ${toneClass}`}
                  title={`${band.label}: ${formatRate(rate)}`}
                >
                  {formatRate(rate)}
                </span>

                {/* Target indicator icon */}
                {rate !== null ? (
                  isMet ? (
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/70" title={`Đạt mục tiêu ≥ ${targetRate}%`}>
                      <CheckCircle size={10} className="mr-0.5" />
                      Đạt
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/70" title={`Dưới mục tiêu < ${targetRate}%`}>
                      <AlertTriangle size={10} className="mr-0.5" />
                      Chưa đạt
                    </span>
                  )
                ) : null}
              </div>

              {/* Volume & detail stats */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Sản lượng:</span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {formatVolume(unit.volume)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
