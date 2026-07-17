import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import {
  PageContainer,
  SectionHeader,
  CardContainer,
  KPICard,
  StatusBadge,
} from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
import ExecutiveSummaryAdapter from './components/ExecutiveSummaryAdapter';
import ExecutiveDailyBriefAdapter from './components/ExecutiveDailyBriefAdapter';
import RuleRecommendationAdapter from './components/RuleRecommendationAdapter';
import QualityVolumeComboTrendlineAdapter from './components/QualityVolumeComboTrendlineAdapter';
import MessageGenerationAdapter from './components/MessageGenerationAdapter';
import TopListAdapter from './components/TopListAdapter';

const BCVH_OPTIONS = [
  { value: 'all', label: 'Tất cả BCVH' },
  { value: 'BC_HUE01', label: 'BCVH TP Huế' },
  { value: 'BC_HUE02', label: 'BCVH Hương Thủy' },
  { value: 'BC_HUE03', label: 'BCVH Phú Lộc' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [latestDate, setLatestDate] = useState(null);

  useEffect(() => {
    api.get('/f13/dashboard/meta')
      .then((res) => {
        if (res.data.success && res.data.data.max_date) {
          setLatestDate(res.data.data.max_date);
        }
      })
      .catch((error) => {
        console.error('[DashboardPage] meta error:', error);
      });
  }, []);

  const defaultDate = latestDate || '2026-07-15';
  const fromDate = searchParams.get('from_date') || defaultDate;
  const toDate = searchParams.get('to_date') || defaultDate;
  const interval = searchParams.get('interval') || 'daily';
  const kpi = searchParams.get('kpi') || 'all';
  const maBcvh = searchParams.get('ma_bcvh') || 'all';
  const search = searchParams.get('search') || '';

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value === undefined || value === null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params);
  };

  return (
    <PageContainer
      title="Executive Dashboard"
      subtitle="Dashboard Shell của QIS V2. Phần logic nghiệp vụ sẽ tiếp tục được bổ sung ở ticket sau."
      action={
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-surface-200)] bg-white p-2 shadow-sm">
          <button
            onClick={() => navigate('/f13/ranking/bcvh')}
            className="rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-700)]"
          >
            Mở BCVH Ranking
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <GlobalFilterBar
          fromDate={fromDate}
          toDate={toDate}
          maxDate={latestDate || defaultDate}
          onFromDateChange={(value) => updateParam('from_date', value)}
          onToDateChange={(value) => updateParam('to_date', value)}
          kpiValue={kpi}
          onKpiChange={(value) => updateParam('kpi', value)}
          bcvhValue={maBcvh}
          onBcvhChange={(value) => updateParam('ma_bcvh', value)}
          searchValue={search}
          onSearchChange={(value) => updateParam('search', value)}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={interval === 'daily' ? 'Daily' : interval === 'weekly' ? 'Weekly' : 'Monthly'} tone="info" />
              <StatusBadge label="Dashboard Shell" tone="success" />
            </div>
          }
        />

        <SectionHeader title="Executive Header" subtitle="Khối đầu tiên của Dashboard, dùng widget placeholder có cấu trúc rõ ràng." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard label="KPI" value="--" delta="Placeholder" tone="primary" />
          <KPICard label="Đạt" value="--" delta="Placeholder" tone="success" />
          <KPICard label="Không đạt" value="--" delta="Placeholder" tone="danger" />
          <KPICard label="Xếp hạng" value="--" delta="Placeholder" tone="warning" />
        </div>

        <QualityVolumeComboTrendlineAdapter reportingToDate={toDate} latestDate={latestDate} maBcvh={maBcvh} />

        <div className="grid gap-5 xl:grid-cols-2">
          <div className="min-h-[240px]">
            <ExecutiveSummaryAdapter fromDate={fromDate} toDate={toDate} maBcvh={maBcvh} />
          </div>
          <div className="min-h-[240px]">
            <RuleRecommendationAdapter fromDate={fromDate} toDate={toDate} interval={interval} maBcvh={maBcvh} />
          </div>
        </div>

        <SectionHeader title="Daily Brief & Message" subtitle="Hai khu vực này hiển thị tối thiểu để giữ đúng shell." />
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="min-h-[240px]">
            <ExecutiveDailyBriefAdapter fromDate={fromDate} toDate={toDate} maBcvh={maBcvh} />
          </div>
          <div className="min-h-[240px]">
            <MessageGenerationAdapter fromDate={fromDate} toDate={toDate} />
          </div>
        </div>

        <SectionHeader title="Navigation Integration Table" subtitle="Bảng tích hợp điều hướng xác nhận shell đã sẵn sàng." />
        <TopListAdapter fromDate={fromDate} toDate={toDate} interval={interval} />

        <SectionHeader title="Widget Placeholder Summary" subtitle="Các vị trí widget còn lại đang ở mức nền, không hardcode business." />
        <div className="grid gap-5 xl:grid-cols-3">
          <CardContainer title="Widget Placeholder 1">
            <p className="text-sm text-[var(--color-text-muted)]">Executive first view.</p>
          </CardContainer>
          <CardContainer title="Widget Placeholder 2">
            <p className="text-sm text-[var(--color-text-muted)]">Recommendation surface.</p>
          </CardContainer>
          <CardContainer title="Widget Placeholder 3">
            <p className="text-sm text-[var(--color-text-muted)]">Message / integration surface.</p>
          </CardContainer>
        </div>
      </div>
    </PageContainer>
  );
}
