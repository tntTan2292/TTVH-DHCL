import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import {
  PageContainer,
  SectionHeader,
  CardContainer,
  KPICard,
  LoadingState,
  ErrorState,
  StatusBadge,
} from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
import ExecutiveSummaryAdapter from './components/ExecutiveSummaryAdapter';
import ExecutiveDailyBriefAdapter from './components/ExecutiveDailyBriefAdapter';
import RuleRecommendationAdapter from './components/RuleRecommendationAdapter';
import QualityVolumeComboTrendlineAdapter from './components/QualityVolumeComboTrendlineAdapter';
import SamePeriodComparisonTrendlineAdapter from './components/SamePeriodComparisonTrendlineAdapter';
import QualityTimelineAdapter from './components/QualityTimelineAdapter';
import BcvhOperationTableAdapter from './components/BcvhOperationTableAdapter';
import MessageGenerationAdapter from './components/MessageGenerationAdapter';
import TopListAdapter from './components/TopListAdapter';
import {
  buildBcvhOptions,
  isCanonicalBcvhCode,
  validateBcvhUnits,
} from './components/dashboardFilterOptions';
import { mapDashboardKpiToCards } from './components/dashboardKpiCards';
import { normalizeComboTrendlineItems } from './components/comboTrendlineData';
import { buildTrendlineRequestParams } from './components/qualityTrendlineWindow';


export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [latestDate, setLatestDate] = useState(null);
  const [kpiState, setKpiState] = useState({ loading: true, error: null, cards: [] });
  const [trendState, setTrendState] = useState({ loading: true, error: null, data: [] });
  const [metadataState, setMetadataState] = useState({
    status: 'loading',
    bcvhOptions: [],
    error: null,
  });

  const loadDashboardMeta = () => {
    setMetadataState((prev) => ({ ...prev, status: 'loading', error: null }));
    api.get('/f13/dashboard/meta')
      .then((res) => {
        const data = res.data?.data || {};
        if (res.data?.success && data.max_date) {
          setLatestDate(data.max_date);
        }

        const validation = validateBcvhUnits(data.bcvh_units);
        if (!res.data?.success || !validation.ok) {
          setMetadataState({
            status: 'error',
            bcvhOptions: [],
            error: validation.error || 'Không thể tải metadata BCVH.',
          });
          return;
        }

        setMetadataState({
          status: 'success',
          bcvhOptions: buildBcvhOptions(data.bcvh_units),
          error: null,
        });
      })
      .catch((error) => {
        console.error('[DashboardPage] meta error:', error);
        setMetadataState({
          status: 'error',
          bcvhOptions: [],
          error: 'Không thể tải metadata BCVH. Vui lòng thử lại.',
        });
      });
  };

  useEffect(() => {
    loadDashboardMeta();
  }, []);

  const defaultDate = latestDate || '2026-07-15';
  const fromDate = searchParams.get('from_date') || defaultDate;
  const toDate = searchParams.get('to_date') || defaultDate;
  const interval = searchParams.get('interval') || 'daily';
  const maBcvh = searchParams.get('ma_bcvh') || 'all';
  const search = searchParams.get('search') || '';

  useEffect(() => {
    let cancelled = false;

    const loadKpi = async () => {
      try {
        setKpiState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await api.get('/f13/dashboard/kpi', {
          params: {
            from_date: fromDate,
            to_date: toDate,
            ma_bcvh: maBcvh,
          },
        });

        if (!cancelled && response?.data?.success) {
          setKpiState({
            loading: false,
            error: null,
            cards: mapDashboardKpiToCards(response.data?.data || {}),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setKpiState({
            loading: false,
            error: error?.message || 'Không thể tải KPI dashboard.',
            cards: mapDashboardKpiToCards({}),
          });
        }
      }
    };

    if (fromDate && toDate) {
      loadKpi();
    }

    return () => {
      cancelled = true;
    };
  }, [fromDate, maBcvh, toDate]);

  useEffect(() => {
    let cancelled = false;

    const loadTrend = async () => {
      try {
        setTrendState((prev) => ({ ...prev, loading: true, error: null }));
        const params = buildTrendlineRequestParams({
          reportingToDate: toDate,
          latestDate,
          maBcvh,
        });

        if (!params) {
          throw new Error('Không thể xác định cửa sổ 30 ngày cho biểu đồ.');
        }

        const response = await api.get('/f13/dashboard/daily-trend', { params });
        if (!cancelled && response?.data?.success) {
          setTrendState({
            loading: false,
            error: null,
            data: normalizeComboTrendlineItems(response.data?.data?.items || []),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setTrendState({
            loading: false,
            error: error?.message || 'Không thể tải dữ liệu xu hướng.',
            data: [],
          });
        }
      }
    };

    if (metadataState.status === 'success' && (toDate || latestDate)) {
      loadTrend();
    }

    return () => {
      cancelled = true;
    };
  }, [latestDate, maBcvh, metadataState.status, toDate]);

  useEffect(() => {
    if (!searchParams.has('kpi')) return;
    const params = new URLSearchParams(searchParams);
    params.delete('kpi');
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (metadataState.status !== 'success') return;
    if (isCanonicalBcvhCode(maBcvh)) return;
    const params = new URLSearchParams(searchParams);
    params.set('ma_bcvh', 'all');
    setSearchParams(params, { replace: true });
  }, [maBcvh, metadataState.status, searchParams, setSearchParams]);

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
          showKpiFilter={false}
          bcvhValue={maBcvh}
          onBcvhChange={(value) => updateParam('ma_bcvh', value)}
          bcvhOptions={metadataState.bcvhOptions}
          bcvhDisabled={metadataState.status !== 'success'}
          searchValue={search}
          onSearchChange={(value) => updateParam('search', value)}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={interval === 'daily' ? 'Daily' : interval === 'weekly' ? 'Weekly' : 'Monthly'} tone="info" />
              <StatusBadge label="Dashboard Shell" tone="success" />
            </div>
          }
        />
        {metadataState.status === 'error' ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <div className="font-semibold">Không thể tải danh sách BCVH.</div>
            <p className="mt-1">{metadataState.error}</p>
            <button
              type="button"
              onClick={loadDashboardMeta}
              className="mt-3 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
            >
              Thử lại
            </button>
          </div>
        ) : null}

        <SectionHeader title="Executive Header" subtitle="Khối đầu tiên của Dashboard, dùng widget placeholder có cấu trúc rõ ràng." />
        {kpiState.loading ? (
          <CardContainer title="KPI Dashboard" subtitle="Đang tải KPI runtime..." className="mb-2">
            <LoadingState label="Đang tải KPI dashboard..." className="min-h-[160px]" />
          </CardContainer>
        ) : null}
        {kpiState.error ? (
          <CardContainer title="KPI Dashboard" subtitle="Không thể tải KPI runtime." className="mb-2">
            <ErrorState title="Không thể tải KPI dashboard" description={kpiState.error} className="min-h-[160px]" />
          </CardContainer>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpiState.cards.map((card) => (
            <KPICard key={card.label} label={card.label} value={card.value} delta={card.delta} tone={card.tone} />
          ))}
        </div>

        <QualityVolumeComboTrendlineAdapter data={trendState.data} loading={trendState.loading} error={trendState.error} />
        <SamePeriodComparisonTrendlineAdapter data={trendState.data} loading={trendState.loading} error={trendState.error} toDate={toDate || latestDate || defaultDate} />

        <QualityTimelineAdapter fromDate={fromDate} toDate={toDate} interval={interval} maBcvh={maBcvh} />

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

        <SectionHeader title="Ranking Surface" subtitle="Bảng xếp hạng BCVH runtime-backed giữ nguyên ngữ cảnh canonical." />
        <BcvhOperationTableAdapter fromDate={fromDate} toDate={toDate} interval={interval} maBcvh={maBcvh} />

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
