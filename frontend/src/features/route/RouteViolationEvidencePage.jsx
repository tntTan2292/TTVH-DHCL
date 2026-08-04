import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PageContainer, StatusBadge, StandardTable, LoadingState, ErrorState, EmptyState } from '../../components/shared/SharedComponents';
import f13DashboardClient from '../../api/F13DashboardClient';
import { buildBackToRouteRankingLink, mapViolationRows, buildViolationGroupTabs } from './routeViolationEvidenceData';
import { ArrowLeft, AlertTriangle, ShieldCheck, Info, FileText, CheckCircle2, Clock } from 'lucide-react';

const COLUMNS = [
  {
    key: 'ma_bg',
    label: 'Số hiệu bưu gửi',
    render: (row) => (
      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
        {row.ma_bg}
      </span>
    )
  },
  {
    key: 'violationReason',
    label: 'Lý do vi phạm',
    render: (row) => {
      const reason = row.violationReason || 'N/A';
      const isDelayedCash = reason === 'Chậm nộp tiền';
      return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
          isDelayedCash
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {isDelayedCash && <AlertTriangle size={12} className="text-amber-600" />}
          {reason}
        </span>
      );
    }
  },
  {
    key: 'pickupTime',
    label: 'Thời gian PTC',
    render: (row) => (
      <span className="font-mono text-xs text-slate-600">
        {row.pickupTime || <span className="text-slate-400 font-sans italic">Chưa có dữ liệu</span>}
      </span>
    )
  },
  {
    key: 'handoverTime',
    label: 'Thời gian nộp tiền',
    render: (row) => (
      <span className="font-mono text-xs text-slate-600">
        {row.handoverTime || <span className="text-slate-400 font-sans italic">Chưa có dữ liệu</span>}
      </span>
    )
  },
  {
    key: 'delayLabel',
    label: 'Độ trễ',
    render: (row) => (
      <span className={`font-mono text-xs font-bold ${
        row.delayHours !== null && row.delayHours !== undefined && row.delayHours > 3
          ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100'
          : 'text-slate-600'
      }`}>
        {row.delayLabel}
      </span>
    )
  },
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

  const subtitle = `Tuyến ${routeName} (${routeId}) · BCVH ${bcvhName} · Ngày phân tích ${date || 'N/A'}`;
  const tabs = buildViolationGroupTabs(violationSummary);

  if (status === 'loading') {
    return (
      <PageContainer title="Chi tiết Bưu gửi vi phạm theo tuyến" subtitle={subtitle}>
        <LoadingState label="Đang tải danh sách bưu gửi vi phạm..." />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer title="Chi tiết Bưu gửi vi phạm theo tuyến" subtitle={subtitle}>
        <ErrorState description={error?.message} />
        <Link to={backLink} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary-700)] hover:underline">
          <ArrowLeft size={16} /> Quay lại Tuyến Ranking
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Chi tiết Bưu gửi vi phạm theo tuyến"
      subtitle={subtitle}
      action={
        <div className="flex items-center gap-2">
          <StatusBadge label={`Tổng không đạt: ${violationSummary.total_failed || 0}`} tone="danger" />
          <StatusBadge label="Phân quyền Admin" tone="info" />
        </div>
      }
    >
      <div className="space-y-5">
        {/* Navigation & Context bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              to={backLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={15} />
              <span>Quay lại Tuyến Ranking</span>
            </Link>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="text-xs text-slate-600 hidden md:block">
              Đang xem chi tiết đối soát tuyến <strong className="text-slate-900">{routeName}</strong> thuộc <strong className="text-slate-900">{bcvhName}</strong>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
            Phân tích ngày: <strong>{date}</strong>
          </div>
        </div>

        {/* Tab Selection Filter for Violation Groups */}
        <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((tab) => {
              const isActive = activeReason === tab.slug;
              return (
                <button
                  key={tab.slug}
                  type="button"
                  onClick={() => setActiveReason(tab.slug)}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all ${
                    isActive
                      ? tab.highlight
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-[var(--color-primary-600)] text-white shadow-xs'
                      : tab.highlight
                        ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100/80'
                        : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.highlight && <AlertTriangle size={14} className={isActive ? 'text-white' : 'text-amber-600'} />}
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.highlight
                        ? 'bg-amber-200/80 text-amber-950'
                        : 'bg-slate-200 text-slate-800'
                  }`}>
                    {tab.count.toLocaleString('vi-VN')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Violation Table / Empty State */}
        {rows.length === 0 ? (
          <EmptyState
            title="Không có bưu gửi vi phạm"
            description="Không có bưu gửi nào thuộc nhóm nguyên nhân đang chọn trong ngày được phân tích."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Danh sách bưu gửi đối soát ({rows.length} bưu gửi)</span>
              <span className="text-slate-500 italic">*Mã bưu gửi bảo mật dành cho Quản trị viên (Admin)</span>
            </div>
            <StandardTable columns={COLUMNS} rows={rows} />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
