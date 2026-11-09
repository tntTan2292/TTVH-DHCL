import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Database, FileSpreadsheet, ArrowLeft, AlertCircle, Info } from 'lucide-react';
import api from '../../api/client.js';
import { useIndicator } from '../indicator/IndicatorContext.js';
import { indicatorTheme } from '../indicator/indicatorConfig.js';
import {
  fetchLayout,
  resolvePeriod,
  fetchWhySummary,
  fetchDashboardMeta,
  fetchEvidenceCatalog,
  fetchEvidenceList,
  downloadEvidenceExport,
} from './api/f13v2Api.js';
import { buildWhyUnitOptions, resolveEffectiveBcvh } from './f13WhyHelpers.js';
import { buildEvidenceExportFilename } from './f13EvidenceHelpers.js';
import F13V2EvidenceFilterBar from './components/F13V2EvidenceFilterBar.jsx';
import F13V2EvidenceSummaryCard from './components/F13V2EvidenceSummaryCard.jsx';
import F13V2EvidenceTable from './components/F13V2EvidenceTable.jsx';
import F13V2ParcelCard from './components/F13V2ParcelCard.jsx';

export default function F13V2EvidencePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const indicator = useIndicator();
  indicatorTheme(indicator);

  // Layout & Catalog State
  const [layout, setLayout] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [metaUnits, setMetaUnits] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [months, setMonths] = useState([]);

  // Data States
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [evidenceData, setEvidenceData] = useState({ items: [], meta: null });
  const [listLoading, setListLoading] = useState(false);
  const [pageError, setPageError] = useState('');

  // F13-PARCEL-CARD-01: One parcel card replacing detail and analysis modals
  const [selectedCardParcel, setSelectedCardParcel] = useState(null);
  const [cardInitialTab, setCardInitialTab] = useState('journey');

  // Export State (B1-R3)
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // Extract all query params preserving full context from /why
  const fromParam = searchParams.get('from') || '';
  const toParam = searchParams.get('to') || '';
  const weekParam = searchParams.get('week') || '';
  const monthParam = searchParams.get('month') || '';
  const bcvhParam = searchParams.get('bcvh') || 'all';
  const routeParam = searchParams.get('route') || '';
  const routeScopeParam = searchParams.get('route_scope') || '';
  const postmanParam = searchParams.get('postman') || '';
  const verdictParam = searchParams.get('verdict') || '';
  const causeParam = searchParams.get('cause') || '';
  const reasonParam = searchParams.get('reason') || '';
  const remainingParam = searchParams.get('remaining') || '';
  const aSourceParam = searchParams.get('a_source') || '';
  const hintParam = searchParams.get('hint') || '';
  const analysedParam = searchParams.get('analysed') || '';
  const analystCauseParam = searchParams.get('analyst_cause') || '';
  const searchNeedle = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'priority';
  const viewParam = searchParams.get('view') || '';
  const isJourneyView = viewParam === 'journey';
  const pageParam = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const pageSizeParam = Number(searchParams.get('page_size') || '20') || 20;

  // Determine active period mode
  const periodMode = useMemo(() => {
    if (monthParam) return 'month';
    if (weekParam) return 'week';
    return 'day';
  }, [monthParam, weekParam]);

  // Load Layout, Catalog, Meta, Weeks and Months once on mount (does not depend on searchParams)
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchLayout().catch(() => null),
      fetchEvidenceCatalog().catch(() => null),
      fetchDashboardMeta().catch(() => null),
      api.get('/f13/ranking/bcvh/weeks').catch(() => null),
      api.get('/f13/ranking/bcvh/months').catch(() => null),
    ])
      .then(([layoutRes, catalogRes, metaRes, weeksRes, monthsRes]) => {
        if (cancelled) return;
        if (layoutRes) setLayout(layoutRes);
        if (catalogRes) setCatalog(catalogRes);

        const bcvhUnits = metaRes?.bcvh_units;
        if (Array.isArray(bcvhUnits)) {
          setMetaUnits(bcvhUnits);
        }

        const rawWeeks = weeksRes?.data?.data?.weeks || [];
        const sortedWeeks = [...rawWeeks].sort((a, b) => (b.week_start || '').localeCompare(a.week_start || ''));
        setWeeks(sortedWeeks);

        const rawMonths = monthsRes?.data?.data?.months || [];
        const sortedMonths = [...rawMonths].sort((a, b) => (b.month_id || '').localeCompare(a.month_id || ''));
        setMonths(sortedMonths);
      })
      .catch((err) => {
        if (!cancelled) setPageError(err?.message || 'Không thể tải cấu hình minh chứng');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Default Anchor Resolution: if URL has no date/week/month, resolve latest day anchor (U1-R5, U1-R7)
  useEffect(() => {
    if (fromParam || toParam || weekParam || monthParam) return;
    let active = true;

    resolvePeriod({ kind: 'latest' })
      .then((res) => {
        if (!active) return;
        if (res?.day) {
          setSearchParams(
            (prev) => {
              const next = new globalThis.URLSearchParams(prev);
              if (!next.get('from')) next.set('from', res.day);
              if (!next.get('to')) next.set('to', res.day);
              return next;
            },
            { replace: true }
          );
        } else {
          setPageError('Chưa có dữ liệu kỳ để hiển thị minh chứng.');
        }
      })
      .catch((err) => {
        if (active) {
          setPageError(err?.response?.data?.error?.message || err?.message || 'Không thể xác định kỳ dữ liệu mới nhất.');
        }
      });

    return () => {
      active = false;
    };
  }, [fromParam, toParam, weekParam, monthParam, setSearchParams]);

  // Compute unit options with S1-PO1 guarantee
  const unitOptions = useMemo(() => {
    return buildWhyUnitOptions({ layout, metaUnits });
  }, [layout, metaUnits]);

  // Scoped unit resolution: guaranteed to always be one of unitOptions
  const effectiveBcvh = useMemo(() => {
    return resolveEffectiveBcvh({ currentParam: bcvhParam, unitOptions, layout });
  }, [bcvhParam, unitOptions, layout]);

  // Sync effective BCVH to searchParams if needed
  useEffect(() => {
    if (effectiveBcvh && effectiveBcvh !== bcvhParam && unitOptions.length > 0) {
      setSearchParams(
        (prev) => {
          const next = new globalThis.URLSearchParams(prev);
          if (effectiveBcvh === 'all') next.delete('bcvh');
          else next.set('bcvh', effectiveBcvh);
          return next;
        },
        { replace: true }
      );
    }
  }, [effectiveBcvh, bcvhParam, unitOptions, setSearchParams]);

  // Combined Active Filter Parameters (all preserved)
  const activeFilters = useMemo(() => {
    const filters = {};
    if (fromParam) filters.from = fromParam;
    if (toParam) filters.to = toParam;
    if (weekParam) filters.week = weekParam;
    if (monthParam) filters.month = monthParam;
    if (effectiveBcvh && effectiveBcvh !== 'all') filters.bcvh = effectiveBcvh;
    if (routeParam) filters.route = routeParam;
    if (routeScopeParam) filters.route_scope = routeScopeParam;
    if (postmanParam) filters.postman = postmanParam;
    if (verdictParam) filters.verdict = verdictParam;
    if (causeParam) filters.cause = causeParam;
    if (reasonParam) filters.reason = reasonParam;
    if (remainingParam) filters.remaining = remainingParam;
    if (aSourceParam) filters.a_source = aSourceParam;
    if (hintParam) filters.hint = hintParam;
    if (analysedParam) filters.analysed = analysedParam;
    if (analystCauseParam) filters.analyst_cause = analystCauseParam;
    if (searchNeedle) filters.search = searchNeedle;
    if (sortParam) filters.sort = sortParam;
    if (isJourneyView) filters.view = 'journey';
    return filters;
  }, [
    fromParam,
    toParam,
    weekParam,
    monthParam,
    effectiveBcvh,
    routeParam,
    routeScopeParam,
    postmanParam,
    verdictParam,
    causeParam,
    reasonParam,
    remainingParam,
    aSourceParam,
    hintParam,
    analysedParam,
    analystCauseParam,
    searchNeedle,
    sortParam,
    isJourneyView,
  ]);

  // Fetch Summary data directly from /api/f13/v2/why/summary (Requirement 3)
  const loadSummaryData = useCallback(() => {
    if (!layout || (!fromParam && !toParam && !weekParam && !monthParam)) return;
    setSummaryLoading(true);

    fetchWhySummary(activeFilters)
      .then((res) => {
        setSummary(res);
      })
      .catch(() => {
        // Ignored in client error log
      })
      .finally(() => {
        setSummaryLoading(false);
      });
  }, [layout, activeFilters, fromParam, toParam, weekParam, monthParam]);

  // Fetch Evidence List (J10: 20 / 50 / 100 items/page, default 20)
  const loadListData = useCallback(() => {
    if (!layout || (!fromParam && !toParam && !weekParam && !monthParam)) return;
    setListLoading(true);
    setPageError('');

    fetchEvidenceList({
      ...activeFilters,
      page: pageParam,
      page_size: pageSizeParam,
    })
      .then((res) => {
        setEvidenceData({
          items: res?.items || [],
          meta: res?.meta || null,
        });
      })
      .catch((err) => {
        setPageError(err?.response?.data?.error?.message || err?.message || 'Không thể tải danh sách minh chứng');
      })
      .finally(() => {
        setListLoading(false);
      });
  }, [layout, activeFilters, pageParam, pageSizeParam, fromParam, toParam, weekParam, monthParam]);

  // Trigger loads when filters or page change
  useEffect(() => {
    loadSummaryData();
  }, [loadSummaryData]);

  useEffect(() => {
    loadListData();
  }, [loadListData]);

  // Filter Update Handlers
  const handlePeriodModeChange = async (mode) => {
    if (mode === periodMode) return;

    if (mode === 'day') {
      const res = await resolvePeriod({ kind: 'latest' }).catch(() => null);
      const day = res?.day || '';
      setSearchParams(
        (prev) => {
          const next = new globalThis.URLSearchParams(prev);
          next.delete('week');
          next.delete('month');
          next.delete('page');
          if (day) {
            next.set('from', day);
            next.set('to', day);
          } else {
            next.delete('from');
            next.delete('to');
          }
          return next;
        },
        { replace: true }
      );
    } else if (mode === 'week') {
      const res = await resolvePeriod({ kind: 'latest' }).catch(() => null);
      const weekId = res?.week?.week_id || weeks[0]?.week_id || '';
      setSearchParams(
        (prev) => {
          const next = new globalThis.URLSearchParams(prev);
          next.delete('from');
          next.delete('to');
          next.delete('month');
          next.delete('page');
          if (weekId) next.set('week', weekId);
          else next.delete('week');
          return next;
        },
        { replace: true }
      );
    } else if (mode === 'month') {
      const res = await resolvePeriod({ kind: 'latest' }).catch(() => null);
      const monthId = res?.month?.month_id || months[0]?.month_id || '';
      setSearchParams(
        (prev) => {
          const next = new globalThis.URLSearchParams(prev);
          next.delete('from');
          next.delete('to');
          next.delete('week');
          next.delete('page');
          if (monthId) next.set('month', monthId);
          else next.delete('month');
          return next;
        },
        { replace: true }
      );
    }
  };

  const updateParam = (key, value) => {
    setSearchParams(
      (prev) => {
        const next = new globalThis.URLSearchParams(prev);
        next.delete('page'); // reset to page 1 on filter changes
        if (value && value !== 'all') next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );
  };

  const handlePageChange = (newPage) => {
    setSearchParams(
      (prev) => {
        const next = new globalThis.URLSearchParams(prev);
        next.set('page', String(newPage));
        return next;
      },
      { replace: true }
    );
  };

  const handleResetFilters = () => {
    setSearchParams(
      () => {
        const next = new globalThis.URLSearchParams();
        if (fromParam) next.set('from', fromParam);
        if (toParam) next.set('to', toParam);
        if (weekParam) next.set('week', weekParam);
        if (monthParam) next.set('month', monthParam);
        if (effectiveBcvh && effectiveBcvh !== 'all') next.set('bcvh', effectiveBcvh);
        return next;
      },
      { replace: true }
    );
  };

  // Excel Export Handler (B1-R3: shows waiting state and server limits)
  const handleExport = async () => {
    setExporting(true);
    setExportError('');

    try {
      const response = await downloadEvidenceExport(activeFilters);
      const blob = new globalThis.Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = globalThis.URL.createObjectURL(blob);
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = buildEvidenceExportFilename(
        activeFilters.from || activeFilters.week || activeFilters.month,
        activeFilters.to
      );
      globalThis.document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);
    } catch (err) {
      let message = 'Gặp sự cố khi xuất dữ liệu Excel.';
      if (err?.response?.data instanceof globalThis.Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json?.error?.message) message = json.error.message;
        } catch {}
      } else if (err?.response?.data?.error?.message) {
        message = err.response.data.error.message;
      }
      setExportError(message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Dữ liệu minh chứng F1.3 & Phân tích Chuyên quản
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Minh chứng nguồn gốc từng bưu gửi và ghi nhận phân tích độc lập của Chuyên quản
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Navigate back to /why or Export Excel */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/f13/v2/why?${searchParams.toString()}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Phân tích nguyên nhân</span>
          </button>

          <button
            type="button"
            disabled={exporting || listLoading}
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {exporting ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang xuất Excel...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Xuất Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Export Waiting Notice & Limits (B1-R3) */}
      {exporting && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              Hệ thống đang chuẩn bị tệp Excel phân tích (quá trình có thể mất từ 10 đến 50 giây với khoảng thời gian dài). Giới hạn tối đa: <strong>31 ngày</strong> và <strong>150.000 dòng</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Export Error Alert */}
      {exportError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{exportError}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportError('')}
            className="text-xs text-rose-600 hover:text-rose-800 font-bold ml-2 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Page Error Alert */}
      {pageError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {/* Tier 1 Filter Bar */}
      <F13V2EvidenceFilterBar
        periodMode={periodMode}
        onPeriodModeChange={handlePeriodModeChange}
        fromDate={fromParam}
        toDate={toParam}
        onFromDateChange={(val) => updateParam('from', val)}
        onToDateChange={(val) => updateParam('to', val)}
        weekId={weekParam}
        onWeekChange={(val) => updateParam('week', val)}
        availableWeeks={weeks}
        monthId={monthParam}
        onMonthChange={(val) => updateParam('month', val)}
        availableMonths={months}
        bcvh={effectiveBcvh}
        onBcvhChange={(val) => updateParam('bcvh', val)}
        unitOptions={unitOptions}
        verdict={verdictParam}
        onVerdictChange={(val) => updateParam('verdict', val)}
        systemCause={causeParam}
        onSystemCauseChange={(val) => updateParam('cause', val)}
        analysed={analysedParam}
        onAnalysedChange={(val) => updateParam('analysed', val)}
        analystCause={analystCauseParam}
        onAnalystCauseChange={(val) => updateParam('analyst_cause', val)}
        route={routeParam}
        onRouteChange={(val) => updateParam('route', val)}
        postman={postmanParam}
        onPostmanChange={(val) => updateParam('postman', val)}
        search={searchNeedle}
        onSearchChange={(val) => updateParam('search', val)}
        sort={sortParam}
        onSortChange={(val) => updateParam('sort', val)}
        reason={reasonParam}
        onReasonChange={(val) => updateParam('reason', val)}
        remaining={remainingParam}
        onRemainingChange={(val) => updateParam('remaining', val)}
        aSource={aSourceParam}
        onASourceChange={(val) => updateParam('a_source', val)}
        hint={hintParam}
        onHintChange={(val) => updateParam('hint', val)}
        onResetFilters={handleResetFilters}
        onRefresh={() => {
          loadSummaryData();
          loadListData();
        }}
        loading={listLoading || summaryLoading}
      />

      {/* Tier 2: Summary Card (KPI + Analysed Ratio) */}
      <F13V2EvidenceSummaryCard
        summary={summary}
        loading={summaryLoading}
        onFilterCause={(c) => updateParam('cause', c)}
        onFilterAnalysed={(a) => updateParam('analysed', a)}
        onFilterAnalystCause={(ac) => updateParam('analyst_cause', ac)}
      />
      {/* U1-R1 (PO 2026-11-07): the summary keeps the official figures of the period and unit; say so when a list-only filter is set. */}
      {analysedParam || analystCauseParam || searchNeedle ? (
        <p className="-mt-2 text-xs italic text-slate-500">
          Tổng quan không áp dụng bộ lọc phân tích / tìm kiếm: số trên là số chính thức của kỳ và đơn vị; danh sách bên dưới đã lọc.
        </p>
      ) : null}

      {/* Tier 3: Evidence Table (J10: 20 / 50 / 100 rows/page, default 20, C2: Nguyên nhân | Hành trình views) */}
      <F13V2EvidenceTable
        items={evidenceData.items}
        meta={evidenceData.meta}
        catalog={catalog}
        loading={listLoading}
        page={pageParam}
        pageSize={pageSizeParam}
        view={isJourneyView ? 'journey' : 'cause'}
        onViewChange={(v) => {
          setSearchParams((prev) => {
            const next = new globalThis.URLSearchParams(prev);
            if (v === 'journey') next.set('view', 'journey');
            else next.delete('view');
            next.set('page', '1');
            return next;
          }, { replace: true });
        }}
        onPageChange={handlePageChange}
        onPageSizeChange={(newSize) => {
          setSearchParams((prev) => {
            const next = new globalThis.URLSearchParams(prev);
            next.set('page_size', String(newSize));
            next.set('page', '1');
            return next;
          }, { replace: true });
        }}
        onOpenCard={(item, tab) => {
          setSelectedCardParcel(item);
          setCardInitialTab(tab || 'journey');
        }}
        onOpenDetail={(item) => {
          setSelectedCardParcel(item);
          setCardInitialTab('journey');
        }}
        onOpenAnalysis={(item) => {
          setSelectedCardParcel(item);
          setCardInitialTab('analysis');
        }}
      />

      {/* F13-PARCEL-CARD-01: One parcel card replaces Detail and Analysis modals */}
      {selectedCardParcel && (
        <F13V2ParcelCard
          parcelKey={selectedCardParcel}
          catalog={catalog}
          layout={layout}
          initialTab={cardInitialTab}
          onClose={() => setSelectedCardParcel(null)}
          onAnalysisSuccess={() => {
            loadSummaryData();
            loadListData();
          }}
        />
      )}
    </div>
  );
}
