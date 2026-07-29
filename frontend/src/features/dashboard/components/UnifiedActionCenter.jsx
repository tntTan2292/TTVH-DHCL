import { Component, useEffect, useRef, useState } from 'react';
import { ClipboardList, RefreshCw, Target } from 'lucide-react';
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
          className="rounded-2xl border border-slate-200/90 bg-white shadow-sm"
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

function PriorityBadge({ priority }) {
  if (priority === 'P1') {
    return (
      <span className="inline-flex items-center rounded-md bg-red-600 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow-2xs">
        P1 · Khẩn cấp
      </span>
    );
  }
  if (priority === 'P2') {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-2xs">
        P2 · Cao
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white shadow-2xs">
      {priority || 'P3'} · Theo dõi
    </span>
  );
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
        className="rounded-2xl border border-slate-200/90 bg-white shadow-sm"
      >
        <LoadingState label="Đang tải trung tâm hành động..." className="py-12" />
      </CardContainer>
    );
  }

  const hasOnlyErrors = recommendationState.error && kpiError;
  if (hasOnlyErrors) {
    return (
      <CardContainer
        title="Trung tâm hành động"
        subtitle="Hợp nhất khuyến nghị, bối cảnh KPI và điểm theo dõi điều hành."
        className="rounded-2xl border border-slate-200/90 bg-white shadow-sm"
      >
        <ErrorState
          title="Không thể tải Trung tâm hành động"
          description="Các nguồn khuyến nghị và bối cảnh KPI đều chưa tải được."
          action={(
            <button
              type="button"
              onClick={loadActionSources}
              className="rounded-lg bg-[#003E7E] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-900 transition-all duration-150"
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
      className="rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all duration-150 motion-reduce:transition-none"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <SourceState label="Khuyến nghị" state={model.states.recommendations} />
          <SourceState label="KPI" state={kpiLoading ? 'loading' : model.states.kpi_context} />
        </div>

        <div className="grid gap-2.5 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Kỳ dữ liệu</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{model.meta.source_period_label}</p>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Sản lượng</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">{formatNumber(model.kpi_context.total_volume)}</p>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tỷ lệ đạt</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-emerald-700">{formatPercent(model.kpi_context.pass_rate)}</p>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Xếp hạng toàn quốc</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{model.kpi_context.national_rank}</p>
          </div>
        </div>

        <div className="rounded-xl border border-blue-200/90 bg-gradient-to-r from-blue-50/90 via-indigo-50/30 to-blue-50/50 p-3.5 shadow-2xs text-slate-900 transition-all duration-150 motion-reduce:transition-none">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#003E7E]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#003E7E] text-white">
              <Target size={12} />
            </span>
            Bản tin nhanh điều hành
          </div>
          <p className="text-xs font-semibold leading-snug text-slate-900 md:text-sm">
            Phạm vi {model.meta.source_period_label}: sản lượng {formatNumber(model.kpi_context.total_volume)},
            tỷ lệ đạt {formatPercent(model.kpi_context.pass_rate)}, tỷ lệ chưa đạt {formatPercent(model.kpi_context.failed_rate)}.
          </p>
          <p className="mt-1 text-xs font-medium text-slate-600">
            Nội dung này chỉ phản ánh dữ liệu KPI hiện có; nguyên nhân, phụ trách, trạng thái và thời hạn chưa có nguồn xác thực.
          </p>
        </div>

        {recommendationState.error || kpiError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-sm text-amber-900 shadow-2xs">
            <div className="font-bold">Dữ liệu một phần</div>
            {recommendationState.error ? <p className="mt-1 text-xs">Không thể tải khuyến nghị: {recommendationState.error}</p> : null}
            {kpiError ? <p className="mt-1 text-xs">Không thể tải bối cảnh KPI: {kpiError}</p> : null}
          </div>
        ) : null}

        {model.items.length > 0 ? (
          <div className="space-y-3">
            {model.items.slice(0, 3).map((item) => {
              const borderAccentClass = item.priority === 'P1'
                ? 'border-l-4 border-l-red-600'
                : item.priority === 'P2'
                  ? 'border-l-4 border-l-amber-500'
                  : 'border-l-4 border-l-blue-600';

              return (
                <div key={item.id} className={`rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-md transition-all duration-150 motion-reduce:transition-none ${borderAccentClass}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <PriorityBadge priority={item.priority} />
                        <StatusBadge label={`Trạng thái: ${item.status}`} tone="info" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{item.recommended_action}</h4>
                      <p className="mt-1 text-xs font-medium text-slate-500">{item.unit.ten_bcvh}</p>
                    </div>
                    <Link
                      to={item.follow_up.href}
                      className="inline-flex items-center rounded-lg bg-[#003E7E] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-900 focus-visible:ring-2 focus-visible:ring-blue-600 transition-all duration-150"
                    >
                      {item.follow_up.label}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Chưa có khuyến nghị điều hành trong phạm vi đang chọn"
            description="Các trường chưa có nguồn xác thực sẽ không được tự suy diễn."
            className="py-8"
          />
        )}

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <ClipboardList size={14} className="shrink-0" />
          <span>Không tự suy diễn owner, nguyên nhân, trạng thái, deadline hoặc confidence.</span>
          <button
            type="button"
            onClick={loadActionSources}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-blue-400 transition-all duration-150"
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
