import { Component, useEffect, useRef, useState } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../../api/client';
import {
  CardContainer,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '../../../components/shared/SharedComponents';
import { mapUnifiedActionCenter, UNAVAILABLE_TEXT } from './unifiedActionCenterData';

const priorityTone = {
  P1: 'danger',
  P2: 'warning',
  P3: 'info',
};

function formatNumber(value) {
  if (value === UNAVAILABLE_TEXT || value === null || value === undefined) return UNAVAILABLE_TEXT;
  const number = Number(value);
  if (!Number.isFinite(number)) return UNAVAILABLE_TEXT;
  return number.toLocaleString('vi-VN');
}

function formatPercent(value) {
  if (value === UNAVAILABLE_TEXT || value === null || value === undefined) return UNAVAILABLE_TEXT;
  const number = Number(value);
  if (!Number.isFinite(number)) return UNAVAILABLE_TEXT;
  return `${number.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
}

function SourceState({ label, state }) {
  const tone = state === 'success'
    ? 'success'
    : state === 'error'
      ? 'danger'
      : state === 'empty'
        ? 'neutral'
        : 'info';
  const text = state === 'success'
    ? 'Đã tải'
    : state === 'error'
      ? 'Lỗi'
      : state === 'empty'
        ? 'Chưa có dữ liệu'
        : 'Đang tải';

  return <StatusBadge tone={tone} label={`${label}: ${text}`} />;
}

class ActionCenterBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('[UnifiedActionCenter] render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <CardContainer
          title="Trung tâm hành động"
          subtitle="Hợp nhất khuyến nghị, bối cảnh KPI và điểm theo dõi điều hành."
        >
          <ErrorState
            title="Không thể hiển thị Trung tâm hành động"
            description="Dữ liệu nguồn không đúng định dạng hiển thị. Các phần Dashboard khác vẫn có thể sử dụng."
          />
        </CardContainer>
      );
    }

    return this.props.children;
  }
}

function UnifiedActionCenterContent({
  fromDate,
  toDate,
  maBcvh = 'all',
  bcvhLabel,
  kpiData,
  kpiLoading,
  kpiError,
}) {
  const [recommendationState, setRecommendationState] = useState({
    loading: true,
    error: null,
    data: [],
  });
  const requestSeqRef = useRef(0);

  const loadActionSources = () => {
    if (!fromDate || !toDate) return undefined;

    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    const controller = new AbortController();

    setRecommendationState({ loading: true, error: null, data: [] });

    api.get('/f13/recommendations', {
      params: { fromDate, toDate },
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted || requestSeqRef.current !== requestSeq) return;
        if (!response?.data?.success) throw new Error('Không thể tải khuyến nghị');
        setRecommendationState({
          loading: false,
          error: null,
          data: response.data?.data || [],
        });
      })
      .catch((error) => {
        if (controller.signal.aborted || requestSeqRef.current !== requestSeq) return;
        setRecommendationState({
          loading: false,
          error: error?.message || 'Không thể tải khuyến nghị',
          data: [],
        });
      });

    return () => {
      controller.abort();
    };
  };

  useEffect(() => loadActionSources(), [fromDate, toDate]);

  const loading = recommendationState.loading;
  const errors = {
    recommendations: recommendationState.error,
    kpi_context: kpiError,
  };
  const model = mapUnifiedActionCenter({
    recommendations: recommendationState.data,
    kpiData,
    fromDate,
    toDate,
    maBcvh,
    bcvhLabel,
    errors,
  });

  if (loading && !recommendationState.data.length) {
    return (
      <CardContainer
        title="Trung tâm hành động"
        subtitle="Hợp nhất khuyến nghị, bối cảnh KPI và điểm theo dõi điều hành."
      >
        <LoadingState label="Đang tải trung tâm hành động..." className="min-h-[180px]" />
      </CardContainer>
    );
  }

  const hasOnlyErrors = recommendationState.error && kpiError;
  if (hasOnlyErrors) {
    return (
      <CardContainer
        title="Trung tâm hành động"
        subtitle="Hợp nhất khuyến nghị, bối cảnh KPI và điểm theo dõi điều hành."
      >
        <ErrorState
          title="Không thể tải Trung tâm hành động"
          description="Các nguồn khuyến nghị và bối cảnh KPI đều chưa tải được."
          action={(
            <button
              type="button"
              onClick={loadActionSources}
              className="rounded-lg bg-[var(--color-primary-600)] px-3 py-2 text-sm font-semibold text-white"
            >
              Thử lại
            </button>
          )}
        />
      </CardContainer>
    );
  }

  return (
    <CardContainer
      title="Trung tâm hành động"
      subtitle="Mỗi vấn đề điều hành chỉ hiển thị một lần, theo dữ liệu hiện có."
      action={<StatusBadge label={model.meta.bcvh_label} tone="info" />}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <SourceState label="Khuyến nghị" state={model.states.recommendations} />
          <SourceState label="KPI" state={kpiLoading ? 'loading' : model.states.kpi_context} />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg bg-[var(--color-surface-50)] p-3">
            <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">Kỳ dữ liệu</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{model.meta.source_period_label}</p>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-50)] p-3">
            <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">Sản lượng</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{formatNumber(model.kpi_context.total_volume)}</p>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-50)] p-3">
            <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">Tỷ lệ đạt</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{formatPercent(model.kpi_context.pass_rate)}</p>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-50)] p-3">
            <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">Xếp hạng toàn quốc</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{model.kpi_context.national_rank}</p>
          </div>
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-950">
          <div className="mb-1 font-semibold">Bản tin nhanh</div>
          <p>
            Phạm vi {model.meta.source_period_label}: sản lượng {formatNumber(model.kpi_context.total_volume)},
            tỷ lệ đạt {formatPercent(model.kpi_context.pass_rate)}, tỷ lệ chưa đạt {formatPercent(model.kpi_context.failed_rate)}.
          </p>
          <p className="text-xs text-blue-800">
            Nội dung này chỉ phản ánh dữ liệu KPI hiện có; nguyên nhân, phụ trách, trạng thái và thời hạn chưa có nguồn xác thực.
          </p>
        </div>

        {recommendationState.error || kpiError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-semibold">Dữ liệu một phần</div>
            {recommendationState.error ? <p>Không thể tải khuyến nghị: {recommendationState.error}</p> : null}
            {kpiError ? <p>Không thể tải bối cảnh KPI: {kpiError}</p> : null}
          </div>
        ) : null}

        {model.items.length > 0 ? (
          <div className="space-y-3">
            {model.items.map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--color-surface-200)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge label={item.priority} tone={priorityTone[item.priority] || 'neutral'} />
                      <StatusBadge label={item.level} tone="neutral" />
                      <StatusBadge label={item.evidence.source_label} tone="info" />
                    </div>
                    <h4 className="text-base font-semibold text-[var(--color-text-main)]">{item.issue}</h4>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.unit.ten_bcvh}</p>
                  </div>
                  <Link
                    to={item.follow_up.href}
                    className="rounded-lg border border-[var(--color-surface-200)] px-3 py-2 text-sm font-semibold text-[var(--color-primary-700)] hover:bg-[var(--color-primary-50)]"
                  >
                    {item.follow_up.label}
                  </Link>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">Bằng chứng</p>
                    <p className="mt-1 text-sm text-[var(--color-text-main)]">{item.evidence.primary}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{item.evidence.impact}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">Hành động đề xuất</p>
                    <p className="mt-1 text-sm text-[var(--color-text-main)]">{item.recommended_action}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-[var(--color-text-muted)]">Nguyên nhân: </span>{item.confirmed_cause}</div>
                    <div><span className="text-[var(--color-text-muted)]">Phụ trách: </span>{item.owner}</div>
                    <div><span className="text-[var(--color-text-muted)]">Trạng thái: </span>{item.status}</div>
                    <div><span className="text-[var(--color-text-muted)]">Độ tin cậy: </span>{item.confidence}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Chưa có khuyến nghị điều hành trong phạm vi đang chọn"
            description="Các trường chưa có nguồn xác thực sẽ không được tự suy diễn."
            className="py-8"
          />
        )}

        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <ClipboardList size={14} />
          <span>Không tự suy diễn owner, nguyên nhân, trạng thái, deadline hoặc confidence.</span>
          <button
            type="button"
            onClick={loadActionSources}
            className="ml-auto inline-flex items-center gap-1 rounded border border-[var(--color-surface-200)] px-2 py-1 font-semibold hover:bg-[var(--color-surface-50)]"
          >
            <RefreshCw size={12} />
            Tải lại
          </button>
        </div>
      </div>
    </CardContainer>
  );
}

export default function UnifiedActionCenter(props) {
  return (
    <ActionCenterBoundary>
      <UnifiedActionCenterContent {...props} />
    </ActionCenterBoundary>
  );
}
