import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageContainer, CardContainer } from '../../components/common/Containers';
import { LoadingLayout, ErrorLayout, EmptyLayout } from '../../components/common/StateLayouts';
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Target, Package, CheckCircle2, XCircle, FileText } from 'lucide-react';
import BcvhOperationTableAdapter from './components/BcvhOperationTableAdapter';
import QualityTimelineAdapter from './components/QualityTimelineAdapter';
import ExecutiveSummaryAdapter from './components/ExecutiveSummaryAdapter';
import ExecutiveDailyBriefAdapter from './components/ExecutiveDailyBriefAdapter';
import RuleRecommendationAdapter from './components/RuleRecommendationAdapter';
import MessageGenerationAdapter from './components/MessageGenerationAdapter';
import TopListAdapter from './components/TopListAdapter';
// All BCVHs for filter dropdown (BĐTP Huế)
const BCVH_OPTIONS = [
  { value: 'all',      label: 'Tất cả BCVH' },
  { value: 'BC_HUE01', label: 'BCVH TP Huế' },
  { value: 'BC_HUE02', label: 'BCVH Hương Thủy' },
  { value: 'BC_HUE03', label: 'BCVH Phú Lộc' },
  { value: 'BC_HUE04', label: 'BCVH Hương Trà' },
  { value: 'BC_HUE05', label: 'BCVH Phong Điền' },
  { value: 'BC_HUE06', label: 'BCVH Quảng Điền' },
  { value: 'BC_HUE07', label: 'BCVH Phú Vang' },
  { value: 'BC_HUE08', label: 'BCVH A Lưới' },
  { value: 'BC_HUE09', label: 'BCVH Nam Đông' },
  { value: 'BC_HUE10', label: 'BCVH Bình Điền' },
  { value: 'BC_HUE11', label: 'BCVH Thuận An' },
  { value: 'BC_HUE12', label: 'BCVH Tứ Hạ' },
];





// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL State — D7.0 Engineering Guideline
  const fromDate = searchParams.get('from_date') || '2026-06-16';
  const toDate   = searchParams.get('to_date')   || '2026-06-23';
  const interval = searchParams.get('interval')  || 'daily';

  const maBcvh = searchParams.get('ma_bcvh') || 'all';

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => { prev.set(name, value); return prev; });
  };

  const handleBcvhDrillDown = (bc) => {
    const params = new URLSearchParams();
    params.set('from_date', fromDate);
    params.set('to_date',   toDate);
    params.set('interval',  interval);
    params.set('bcvh_id',   bc.id);
    params.set('bcvh_name', bc.name);
    navigate(`/f13/ranking/bcvh?${params.toString()}`);
  };

  const handleGoToBcvhRanking = () => {
    navigate(`/f13/ranking/bcvh?from_date=${fromDate}&to_date=${toDate}&interval=${interval}`);
  };



  return (
    <PageContainer
      title="Executive Dashboard"
      action={
        <div className="flex items-center flex-wrap gap-2 bg-white p-2 rounded-lg border border-[var(--color-surface-200)] shadow-sm">
          {/* Date range */}
          <input
            type="date" name="from_date" value={fromDate}
            onChange={handleFilterChange}
            className="text-sm border-none focus:ring-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Từ ngày"
          />
          <span className="text-[var(--color-text-muted)]">-</span>
          <input
            type="date" name="to_date" value={toDate}
            onChange={handleFilterChange}
            className="text-sm border-none focus:ring-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Đến ngày"
          />
          {/* Interval */}
          <select
            name="interval" value={interval}
            onChange={handleFilterChange}
            className="text-sm border-l border-[var(--color-surface-200)] pl-3 ml-1 focus:ring-0 cursor-pointer bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Khung thời gian"
          >
            <option value="daily">Daily View</option>
            <option value="weekly">Weekly View</option>
            <option value="monthly">Monthly View</option>
          </select>
          {/* BCVH Filter — P0 bổ sung */}
          <select
            name="ma_bcvh" value={maBcvh}
            onChange={handleFilterChange}
            className="text-sm border-l border-[var(--color-surface-200)] pl-3 ml-1 focus:ring-0 cursor-pointer bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Chọn BCVH"
          >
            {BCVH_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      }
    >
        <div className="space-y-5">

          {/* P1: Restored Executive Summary (KPIs) */}
          <ExecutiveSummaryAdapter fromDate={fromDate} toDate={toDate} maBcvh={maBcvh} />

          {/* P1: Restored Executive Daily Brief */}
          <ExecutiveDailyBriefAdapter fromDate={fromDate} toDate={toDate} maBcvh={maBcvh} />

          {/* P1: Restored Rule Recommendation */}
          <RuleRecommendationAdapter fromDate={fromDate} toDate={toDate} interval={interval} maBcvh={maBcvh} />

          {/* BCVH Operation Table (P0 — Wrap & Adapt Legacy BcvhOperationTable) */}
          <BcvhOperationTableAdapter 
            fromDate={fromDate}
            toDate={toDate}
            interval={interval}
            maBcvh={maBcvh}
          />

          <div className="w-full">
            {/* P1: Restored Top/Bottom List Card */}
            <TopListAdapter fromDate={fromDate} toDate={toDate} interval={interval} />
          </div>

          {/* Quality Timeline & Patterns (P0.2 — Wrap & Adapt Legacy QualityTimelinePanel) */}
          <QualityTimelineAdapter 
            fromDate={fromDate}
            toDate={toDate}
            interval={interval}
            maBcvh={maBcvh}
          />

          {/* P1: Restored Message Generation */}
          <MessageGenerationAdapter fromDate={fromDate} toDate={toDate} />

        </div>
    </PageContainer>
  );
}
