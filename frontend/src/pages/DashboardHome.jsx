import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import ExecutiveDateBar from '../features/home/components/ExecutiveDateBar.jsx';
import ExecutiveIndicatorCard from '../features/home/components/ExecutiveIndicatorCard.jsx';
import NationalRankingBlock from '../features/home/components/NationalRankingBlock.jsx';
import ActionUnitsBlock from '../features/home/components/ActionUnitsBlock.jsx';
import MonthlyRankProgressionBlock from '../features/home/components/MonthlyRankProgressionBlock.jsx';

/**
 * DashboardHome — Trang chủ điều hành chất lượng (HOME-BI-01)
 *
 * Built to be shown on a TV, on one screen without scrolling:
 *   1. one-line control bar (Ngày / Tuần / Tháng filter with back and forward buttons, each indicator's loaded period);
 *   2. four indicator cards (rate, national rank, gap to target, change, own 30-day line);
 *   3. left: 34-province ranking (default "Huế & lân cận"); right: monthly rank + units to act on.
 * Data: GET /api/home/executive and GET /api/home/national-ranking.
 * Each indicator is its own measure: nothing is compared or summed across indicators.
 */
export default function DashboardHome() {
  const [selectedIndicator, setSelectedIndicator] = useState('f11');
  // One filter for the whole page (HOME-BI-02): the period and how many periods back from the latest (0, -1, -2 ...).
  const [period, setPeriod] = useState('day');
  const [offset, setOffset] = useState(0);

  const [executiveData, setExecutiveData] = useState(null);
  const [rankingData, setRankingData] = useState(null);

  const [loadingExecutive, setLoadingExecutive] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [errorExecutive, setErrorExecutive] = useState(null);
  const [errorRanking, setErrorRanking] = useState(null);

  const execRequestSeqRef = useRef(0);
  const rankRequestSeqRef = useRef(0);

  const fetchExecutive = useCallback(() => {
    const seq = ++execRequestSeqRef.current;
    setLoadingExecutive(true);
    setErrorExecutive(null);

    api.get('/home/executive', { params: { period, offset } })
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
  }, [period, offset]);

  const fetchNationalRanking = useCallback(() => {
    const seq = ++rankRequestSeqRef.current;
    setLoadingRanking(true);
    setErrorRanking(null);

    api.get('/home/national-ranking', { params: { indicator: selectedIndicator, period, offset } })
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
  }, [selectedIndicator, period, offset]);

  useEffect(() => {
    fetchExecutive();
  }, [fetchExecutive]);

  useEffect(() => {
    fetchNationalRanking();
  }, [fetchNationalRanking]);

  const indicators = executiveData?.indicators || [];
  const activeIndicatorData = indicators.find((ind) => ind.id === selectedIndicator) || indicators[0] || null;

  return (
    <div className="mx-auto max-w-[1920px] space-y-3 p-3 sm:p-4 xl:p-5">
      <ExecutiveDateBar
        period={period}
        onPeriodChange={(next) => {
          setPeriod(next);
          setOffset(0);
        }}
        offset={offset}
        onOffsetChange={setOffset}
        periodInfo={executiveData?.period_info || null}
        onRefresh={() => {
          fetchExecutive();
          fetchNationalRanking();
        }}
        loading={loadingExecutive || loadingRanking}
        indicators={indicators}
      />

      {errorExecutive && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2">
          <div className="text-xs">
            <span className="font-bold text-red-800">Không thể tải dữ liệu điều hành chất lượng: </span>
            <span className="text-red-600">{errorExecutive}</span>
          </div>
          <button
            type="button"
            onClick={fetchExecutive}
            className="shrink-0 cursor-pointer rounded-lg bg-red-700 px-3 py-1 text-xs font-semibold text-white hover:bg-red-800"
          >
            Thử lại
          </button>
        </div>
      )}

      {errorRanking && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
          <div className="text-xs">
            <span className="font-bold text-amber-800">Không thể tải bảng xếp hạng toàn quốc: </span>
            <span className="text-amber-700">{errorRanking}</span>
          </div>
          <button
            type="button"
            onClick={fetchNationalRanking}
            className="shrink-0 cursor-pointer rounded-lg bg-amber-700 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-800"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Four indicator cards: rate, national rank, gap to target, change, own 30-day line */}
      <section aria-label="Thẻ chỉ tiêu điều hành" aria-busy={loadingExecutive} className={loadingExecutive ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {loadingExecutive && !indicators.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-60 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-4">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="h-24 rounded-xl bg-slate-100" />
                  <div className="h-24 rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      {/* 34-province ranking (default "Huế & lân cận") beside the monthly rank and the units to act on */}
      <div className={`grid grid-cols-1 items-stretch gap-3 xl:grid-cols-12 transition-opacity ${loadingExecutive || loadingRanking ? "opacity-60" : ""}`}>
        <div className="xl:col-span-7">
          <NationalRankingBlock
            selectedIndicator={selectedIndicator}
            onSelectIndicator={setSelectedIndicator}
            period={period}
            rankingData={rankingData}
            loading={loadingRanking}
          />
        </div>
        <div className="flex flex-col gap-3 xl:col-span-5">
          <MonthlyRankProgressionBlock
            indicatorData={activeIndicatorData}
            selectedIndicator={selectedIndicator}
          />
          <ActionUnitsBlock
            indicatorData={activeIndicatorData}
            selectedIndicator={selectedIndicator}
          />
        </div>
      </div>
    </div>
  );
}
