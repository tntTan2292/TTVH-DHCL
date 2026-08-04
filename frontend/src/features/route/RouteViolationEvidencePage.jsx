import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PageContainer, StatusBadge, StandardTable, LoadingState, ErrorState, EmptyState } from '../../components/shared/SharedComponents';
import f13DashboardClient from '../../api/F13DashboardClient';
import { buildBackToRouteRankingLink, mapViolationRows, buildViolationGroupTabs } from './routeViolationEvidenceData';

const COLUMNS = [
  { key: 'ma_bg', label: 'Số hiệu bưu gửi' },
  { key: 'violationReason', label: 'Lý do vi phạm', render: (row) => row.violationReason || 'N/A' },
  { key: 'pickupTime', label: 'Thời gian PTC', render: (row) => row.pickupTime || 'N/A' },
  { key: 'handoverTime', label: 'Thời gian nộp tiền', render: (row) => row.handoverTime || 'N/A' },
  { key: 'delayLabel', label: 'Độ trễ' },
];

const DEFAULT_REASON_TAB = 'delayed_cash';

export default function RouteViolationEvidencePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [violationSummary, setViolationSummary] = useState({});

  const date = searchParams.get('date') || '';
  const bcvhId = searchParams.get('bcvh_id') || '';
  const bcvhName = searchParams.get('bcvh_name') || bcvhId;
  const routeId = searchParams.get('route_id') || '';
  const routeName = searchParams.get('route_name') || routeId;
  const returnTo = searchParams.get('return_to') || '';
  const backLink = buildBackToRouteRankingLink(returnTo);
  const activeReason = searchParams.get('reason') || DEFAULT_REASON_TAB;

  const setActiveReason = (slug) => {
    const params = new URLSearchParams(searchParams);
    if (slug === DEFAULT_REASON_TAB) {
      params.delete('reason');
    } else {
      params.set('reason', slug);
    }
    setSearchParams(params);
  };

  useEffect(() => {
    let mounted = true;
    const fetchViolations = async () => {
      if (!date || !bcvhId || !routeId) {
        setStatus('error');
        setError({ message: 'Thiếu ngày, BCVH hoặc tuyến để tải danh sách bưu gửi vi phạm.' });
        return;
      }
      try {
        setStatus('loading');
        setError(null);
        const reasonFilter = activeReason === 'all' ? undefined : activeReason;
        const result = await f13DashboardClient.getEvidenceList(date, bcvhId, routeId, 1, 1000, reasonFilter);
        if (!mounted) return;
        setRows(mapViolationRows(Array.isArray(result?.data) ? result.data : []));
        setViolationSummary(result?.meta?.violation_summary || {});
        setStatus('success');
      } catch (e) {
        if (!mounted) return;
        setError({ message: e.message || 'Không thể tải danh sách bưu gửi vi phạm.' });
        setStatus('error');
      }
    };
    fetchViolations();
    return () => {
      mounted = false;
    };
  }, [date, bcvhId, routeId, activeReason]);

  const subtitle = `Tuyến ${routeName} · BCVH ${bcvhName} · Ngày ${date || 'N/A'}`;
  const tabs = buildViolationGroupTabs(violationSummary);

  if (status === 'loading') {
    return (
      <PageContainer title="Bưu gửi vi phạm theo tuyến" subtitle={subtitle}>
        <LoadingState label="Đang tải danh sách bưu gửi vi phạm..." />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer title="Bưu gửi vi phạm theo tuyến" subtitle={subtitle}>
        <ErrorState description={error?.message} />
        <Link to={backLink} className="mt-4 inline-block text-sm font-semibold text-[var(--color-primary-700)] hover:underline">
          ← Quay lại Tuyến Ranking
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Bưu gửi vi phạm theo tuyến"
      subtitle={subtitle}
      action={<StatusBadge label={`${rows.length} bưu gửi`} tone="danger" />}
    >
      <div className="space-y-4">
        <Link to={backLink} className="inline-block text-sm font-semibold text-[var(--color-primary-700)] hover:underline">
          ← Quay lại Tuyến Ranking
        </Link>

        <div className="inline-flex flex-wrap overflow-hidden rounded-md border border-[var(--color-surface-200)] bg-white">
          {tabs.map((tab) => {
            const isActive = activeReason === tab.slug;
            return (
              <button
                key={tab.slug}
                type="button"
                onClick={() => setActiveReason(tab.slug)}
                aria-pressed={isActive}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? tab.highlight
                      ? 'bg-red-600 text-white'
                      : 'bg-[var(--color-primary-600)] text-white'
                    : tab.highlight
                      ? 'text-red-700 hover:bg-red-50'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-50)]'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="Không có bưu gửi vi phạm"
            description="Không có bưu gửi nào thuộc nhóm đang chọn trong ngày đã chọn."
          />
        ) : (
          <StandardTable columns={COLUMNS} rows={rows} />
        )}
      </div>
    </PageContainer>
  );
}
