import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PageContainer, StatusBadge, StandardTable, LoadingState, ErrorState, EmptyState } from '../../components/shared/SharedComponents';
import f13DashboardClient from '../../api/F13DashboardClient';
import { buildBackToRouteRankingLink, mapViolationRows } from './routeViolationEvidenceData';

const COLUMNS = [
  { key: 'ma_bg', label: 'Số hiệu bưu gửi' },
  { key: 'status', label: 'Kết quả', render: (row) => row.status || 'N/A' },
  { key: 'pickupTime', label: 'Thời gian PTC', render: (row) => row.pickupTime || 'N/A' },
  { key: 'handoverTime', label: 'Thời gian nộp tiền', render: (row) => row.handoverTime || 'N/A' },
  { key: 'delayLabel', label: 'Độ trễ' },
];

export default function RouteViolationEvidencePage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const date = searchParams.get('date') || '';
  const bcvhId = searchParams.get('bcvh_id') || '';
  const bcvhName = searchParams.get('bcvh_name') || bcvhId;
  const routeId = searchParams.get('route_id') || '';
  const routeName = searchParams.get('route_name') || routeId;
  const returnTo = searchParams.get('return_to') || '';
  const backLink = buildBackToRouteRankingLink(returnTo);

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
        const result = await f13DashboardClient.getEvidenceList(date, bcvhId, routeId, 1, 1000);
        if (!mounted) return;
        setRows(mapViolationRows(Array.isArray(result?.data) ? result.data : []));
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
  }, [date, bcvhId, routeId]);

  const subtitle = `Tuyến ${routeName} · BCVH ${bcvhName} · Ngày ${date || 'N/A'}`;

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

        {rows.length === 0 ? (
          <EmptyState
            title="Không có bưu gửi vi phạm"
            description="Tuyến này không có bưu gửi không đạt trong ngày đã chọn."
          />
        ) : (
          <StandardTable columns={COLUMNS} rows={rows} />
        )}
      </div>
    </PageContainer>
  );
}
