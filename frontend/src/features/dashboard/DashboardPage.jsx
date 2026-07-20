import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import {
  PageContainer,
  StatusBadge,
} from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
import IntegratedTrendRiskWorkspace from './components/IntegratedTrendRiskWorkspace';
import BcvhOperationTableAdapter from './components/BcvhOperationTableAdapter';
import UnifiedActionCenter from './components/UnifiedActionCenter';
import UnifiedCommandSummary from './components/UnifiedCommandSummary';
import {
  buildBcvhOptions,
  isCanonicalBcvhCode,
  validateBcvhUnits,
} from './components/dashboardFilterOptions';
import { normalizeComboTrendlineItems } from './components/comboTrendlineData';
import { buildTrendlineRequestParams } from './components/qualityTrendlineWindow';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [latestDate, setLatestDate] = useState(null);
  const [kpiState, setKpiState] = useState({ loading: true, error: null, data: null });
  const [trendState, setTrendState] = useState({ loading: true, error: null, data: [] });
  const [metadataState, setMetadataState] = useState({
    status: 'loading',
    bcvhOptions: [],
    error: null,
  });
  const kpiRequestSeqRef = useRef(0);
  const kpiActiveKeyRef = useRef('');

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
    if (!fromDate || !toDate) return undefined;

    const requestKey = `${fromDate}|${toDate}|${maBcvh}`;
    const requestSeq = kpiRequestSeqRef.current + 1;
    kpiRequestSeqRef.current = requestSeq;
    kpiActiveKeyRef.current = requestKey;

    const controller = new AbortController();

    setKpiState({
      loading: true,
      error: null,
      data: null,
    });

    (async () => {
      try {
        const response = await api.get('/f13/dashboard/kpi', {
          params: {
            from_date: fromDate,
            to_date: toDate,
            ma_bcvh: maBcvh,
          },
          signal: controller.signal,
        });

        if (
          controller.signal.aborted ||
          kpiRequestSeqRef.current !== requestSeq ||
          kpiActiveKeyRef.current !== requestKey ||
          !response?.data?.success
        ) {
          return;
        }

        setKpiState({
          loading: false,
          error: null,
          data: response.data?.data || {},
        });
      } catch (error) {
        if (controller.signal.aborted || kpiRequestSeqRef.current !== requestSeq || kpiActiveKeyRef.current !== requestKey) {
          return;
        }

        setKpiState({
          loading: false,
          error: error?.message || 'Không thể tải KPI dashboard.',
          data: null,
        });
      }
    })();

    return () => {
      controller.abort();
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

  const selectedBcvhLabel = metadataState.bcvhOptions.find((option) => option.value === maBcvh)?.label
    || (maBcvh === 'all' ? 'Toàn mạng' : 'Theo BCVH');

  return (
    <PageContainer
      title="Dashboard điều hành chất lượng F1.3"
      subtitle="Theo dõi chất lượng phát theo kỳ đã chọn và phạm vi BCVH hiện hành."
      action={(
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-surface-200)] bg-white p-2 shadow-sm">
          <button
            onClick={() => navigate('/f13/ranking/bcvh')}
            className="rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-700)]"
          >
            Mở xếp hạng BCVH
          </button>
        </div>
      )}
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
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={interval === 'daily' ? 'Theo ngày' : interval === 'weekly' ? 'Theo tuần' : 'Theo tháng'} tone="info" />
              <StatusBadge label={maBcvh === 'all' ? 'Toàn mạng' : 'Theo BCVH'} tone="neutral" />
            </div>
          )}
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

        <UnifiedCommandSummary
          kpiData={kpiState.data}
          loading={kpiState.loading}
          error={kpiState.error}
          fromDate={fromDate}
          toDate={toDate}
          bcvhLabel={selectedBcvhLabel}
        />

        <IntegratedTrendRiskWorkspace
          data={trendState.data}
          loading={trendState.loading}
          error={trendState.error}
          fromDate={fromDate}
          toDate={toDate || latestDate || defaultDate}
          maBcvh={maBcvh}
          kpiData={kpiState.data}
        />

        <UnifiedActionCenter
          fromDate={fromDate}
          toDate={toDate}
          maBcvh={maBcvh}
          bcvhLabel={selectedBcvhLabel}
          kpiData={kpiState.data}
          kpiLoading={kpiState.loading}
          kpiError={kpiState.error}
        />

        <BcvhOperationTableAdapter fromDate={fromDate} toDate={toDate} interval={interval} maBcvh={maBcvh} />
      </div>
    </PageContainer>
  );
}
