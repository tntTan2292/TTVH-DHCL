import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import ExecutiveDateBar from '../features/home/components/ExecutiveDateBar.jsx';
import ExecutiveIndicatorCard from '../features/home/components/ExecutiveIndicatorCard.jsx';
import NationalRankingBlock from '../features/home/components/NationalRankingBlock.jsx';
import IndicatorTrendsGrid from '../features/home/components/IndicatorTrendsGrid.jsx';
import LowestUnitsBlock from '../features/home/components/LowestUnitsBlock.jsx';
import MonthlyRankProgressionBlock from '../features/home/components/MonthlyRankProgressionBlock.jsx';

/**
 * DashboardHome — Trang chủ điều hành chất lượng (HOME-BI-01)
 *
 * Dành riêng cho lãnh đạo Bưu điện tỉnh:
 * - Điều nhìn thấy đầu tiên: Tỷ lệ chất lượng và Vị thứ toàn quốc của 04 chỉ tiêu F1.1, F1.2, F1.3, F4.1.
 * - Tiêu thụ trực tiếp dữ liệu từ các API:
 *     GET /api/home/executive?anchor_date=
 *     GET /api/home/national-ranking?indicator=&period=&anchor_date=
 * - Tuân thủ nghiêm ngặt chuẩn khối báo cáo (report_block_ui_standard.md).
 * - Mỗi chỉ tiêu có thước đo và ngưỡng độc lập, không so sánh hay cộng gộp chéo.
 */
export default function DashboardHome() {
  const [anchorDate, setAnchorDate] = useState(null);
  const [selectedIndicator, setSelectedIndicator] = useState('f11');
  const [rankingPeriod, setRankingPeriod] = useState('day');

  const [executiveData, setExecutiveData] = useState(null);
  const [rankingData, setRankingData] = useState(null);

  const [loadingExecutive, setLoadingExecutive] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [errorExecutive, setErrorExecutive] = useState(null);
  const [errorRanking, setErrorRanking] = useState(null);

  const execRequestSeqRef = useRef(0);
  const rankRequestSeqRef = useRef(0);

  // 1. Fetch Executive data (4 indicators KPI, trends, lowest units, monthly rank)
  const fetchExecutive = useCallback(() => {
    const seq = ++execRequestSeqRef.current;
    setLoadingExecutive(true);
    setErrorExecutive(null);

    const params = {};
    if (anchorDate) params.anchor_date = anchorDate;

    api.get('/home/executive', { params })
      .then((res) => {
        if (seq !== execRequestSeqRef.current) return;
        if (res.data?.success) {
          setExecutiveData(res.data.data);
        } else {
          setErrorExecutive(res.data?.error?.message || 'Không thể tải dữ liệu điều hành.');
        }
      })
      .catch((err) => {
        if (seq !== execRequestSeqRef.current) return;
        setErrorExecutive(err.response?.data?.error?.message || err.message || 'Lỗi khi kết nối máy chủ.');
      })
      .finally(() => {
        if (seq === execRequestSeqRef.current) setLoadingExecutive(false);
      });
  }, [anchorDate]);

  // 2. Fetch National Ranking data for the selected indicator & period
  const fetchNationalRanking = useCallback(() => {
    const seq = ++rankRequestSeqRef.current;
    setLoadingRanking(true);
    setErrorRanking(null);

    const params = {
      indicator: selectedIndicator,
      period: rankingPeriod,
    };
    if (anchorDate) params.anchor_date = anchorDate;

    api.get('/home/national-ranking', { params })
      .then((res) => {
        if (seq !== rankRequestSeqRef.current) return;
        if (res.data?.success) {
          setRankingData(res.data.data);
        } else {
          setErrorRanking(res.data?.error?.message || 'Không thể tải bảng xếp hạng toàn quốc.');
        }
      })
      .catch((err) => {
        if (seq !== rankRequestSeqRef.current) return;
        setErrorRanking(err.response?.data?.error?.message || err.message || 'Lỗi khi tải xếp hạng toàn quốc.');
      })
      .finally(() => {
        if (seq === rankRequestSeqRef.current) setLoadingRanking(false);
      });
  }, [anchorDate, selectedIndicator, rankingPeriod]);

  // Trigger fetches
  useEffect(() => {
    fetchExecutive();
  }, [fetchExecutive]);

  useEffect(() => {
    fetchNationalRanking();
  }, [fetchNationalRanking]);

  const indicators = executiveData?.indicators || [];
  const activeIndicatorData = indicators.find((ind) => ind.id === selectedIndicator) || indicators[0] || null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1560px] mx-auto space-y-6">
      {/* Top Control Bar: Date & freshness */}
      <ExecutiveDateBar
        anchorDate={anchorDate}
        onAnchorDateChange={setAnchorDate}
        onRefresh={() => {
          fetchExecutive();
          fetchNationalRanking();
        }}
        loading={loadingExecutive || loadingRanking}
        indicators={indicators}
      />

      {/* Global Error Banner if executive endpoint fails */}
      {errorExecutive && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
          <div className="text-sm font-bold text-red-800">Không thể tải dữ liệu điều hành chất lượng</div>
          <p className="mt-1 text-xs text-red-600">{errorExecutive}</p>
          <button
            type="button"
            onClick={fetchExecutive}
            className="mt-3 rounded-lg bg-red-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-red-800 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {errorRanking && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
          <div className="text-sm font-bold text-amber-800">Không thể tải dữ liệu xếp hạng toàn quốc</div>
          <p className="mt-1 text-xs text-amber-600">{errorRanking}</p>
          <button
            type="button"
            onClick={fetchNationalRanking}
            className="mt-3 rounded-lg bg-amber-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-800 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* SECTION 1: 04 Executive Pillar Cards (F1.1, F1.2, F1.3, F4.1) */}
      <section aria-label="Thẻ chỉ tiêu điều hành">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Chỉ số chất lượng & Vị thứ toàn quốc hiện tại (Bấm thẻ để xem chi tiết bên dưới)
          </h2>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            * Thẻ hiển thị tỷ lệ theo báo cáo chi tiết; Vị thứ theo báo cáo toàn quốc TCT
          </span>
        </div>

        {loadingExecutive && !indicators.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-white border border-slate-200/80 p-5 animate-pulse flex flex-col justify-between">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 bg-slate-100 rounded-xl" />
                  <div className="h-16 bg-slate-100 rounded-xl" />
                </div>
                <div className="h-3 w-32 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {indicators.map((ind) => (
              <ExecutiveIndicatorCard
                key={ind.id}
                data={ind}
                isSelected={selectedIndicator === ind.id}
                onSelect={() => setSelectedIndicator(ind.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: Mandatory 34-Province National Ranking Table */}
      <NationalRankingBlock
        selectedIndicator={selectedIndicator}
        onSelectIndicator={setSelectedIndicator}
        period={rankingPeriod}
        onPeriodChange={setRankingPeriod}
        rankingData={rankingData}
        loading={loadingRanking}
      />

      {/* SECTION 3: Monthly Rank Progression Strip (T1 -> current month) */}
      <MonthlyRankProgressionBlock
        indicatorData={activeIndicatorData}
        selectedIndicator={selectedIndicator}
      />

      {/* SECTION 4: Units to act on (Top 5 Lowest Units for the selected indicator) */}
      <LowestUnitsBlock
        indicatorData={activeIndicatorData}
        selectedIndicator={selectedIndicator}
      />

      {/* SECTION 5: Trend per Indicator (4 independent charts with own target lines) */}
      <IndicatorTrendsGrid
        indicators={indicators}
      />
    </div>
  );
}
