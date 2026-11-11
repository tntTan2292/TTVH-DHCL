import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Layers,
  Clock,
  ShieldCheck,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  History,
  AlertCircle,
  HelpCircle,
  Truck,
} from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { fetchEvidenceParcel, postEvidenceAnalysis } from '../api/f13v2Api.js';
import {
  formatCauseLabel,
  formatPhatDetail,
  formatChoChuyenQuanReason,
  formatCauseStatusLabel,
  formatCauseBasisLabel,
  formatCauseStepLabel,
  formatCauseHintLabel,
  formatFlagLabel,
} from '../f13WhyHelpers.js';
import {
  ANALYST_CAUSES,
  isNoteMandatory,
  formatAnalystCause,
  formatVersusSystem,
  canWriteParcelAnalysis,
  formatJourneyLegHours,
  EVIDENCE_JOURNEY_LEGS,
  getMilestoneAt,
  formatEarlyHandoverText,
  fetchEvidenceCatalogCached,
  fetchLayoutCached,
  setCachedEvidenceCatalog,
  setCachedLayout,
  getCachedEvidenceAccess,
  buildWhyConclusion,
  resolveLotCounts,
  formatEvidenceTime,
  formatBatchArrivalRange,
} from '../f13EvidenceHelpers.js';
import F13V2JourneyParcelModal from './F13V2JourneyParcelModal.jsx';

export default function F13V2ParcelCard({
  parcelKey = null,
  onClose,
  catalog: propCatalog = null,
  layout: propLayout = null,
  onAnalysisSuccess,
  initialTab = 'journey',
}) {
  const modalRef = useRef(null);
  const [activeTab, setActiveTab] = useState(initialTab || 'journey'); // 'journey' | 'cause' | 'analysis'
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cached shared catalog & layout across all four callers
  const initialAccess = getCachedEvidenceAccess();
  const [catalog, setCatalog] = useState(() => propCatalog || initialAccess.catalog);
  const [layout, setLayout] = useState(() => propLayout || initialAccess.layout);

  useEffect(() => {
    if (propCatalog) {
      setCachedEvidenceCatalog(propCatalog);
      setCatalog(propCatalog);
    } else if (!catalog) {
      fetchEvidenceCatalogCached().then((res) => {
        if (res) setCatalog(res);
      }).catch(() => {});
    }
  }, [propCatalog, catalog]);

  useEffect(() => {
    if (propLayout) {
      setCachedLayout(propLayout);
      setLayout(propLayout);
    } else if (!layout) {
      fetchLayoutCached().then((res) => {
        if (res) setLayout(res);
      }).catch(() => {});
    }
  }, [propLayout, layout]);

  // Write Form state
  const [selectedCause, setSelectedCause] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [overrideParcelKey, setOverrideParcelKey] = useState(null);
  const [activeBatchModal, setActiveBatchModal] = useState(null);

  // Sync initial tab when parcelKey changes
  useEffect(() => {
    setOverrideParcelKey(null);
    setActiveBatchModal(null);
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, parcelKey]);

  // Extract ngay_do_kiem and ma_bg from effectiveParcelKey
  const effectiveParcelKey = overrideParcelKey || parcelKey;
  const ngay_do_kiem = effectiveParcelKey?.ngay_do_kiem || effectiveParcelKey?.date || null;
  const ma_bg = effectiveParcelKey?.ma_bg || null;
  const cardKey = ngay_do_kiem && ma_bg ? `${ngay_do_kiem}|${ma_bg}` : null;
  const defaultCause = catalog?.causes?.[0]?.code || 'KHONG_TRON_LO';

  // Fetch card data from GET /api/f13/v2/evidence/parcel
  const loadCardData = useCallback(async (isRefresh = false) => {
    if (!ngay_do_kiem || !ma_bg) {
      setCard(null);
      setError(null);
      return;
    }
    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      const res = await fetchEvidenceParcel({ ngay_do_kiem, ma_bg });
      setCard(res);
      const anl = res?.analysis;
      if (anl) {
        setSelectedCause(anl.cause || '');
        setNote(anl.note || '');
      } else {
        setSelectedCause(defaultCause);
        setNote('');
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể tải phiếu bưu gửi.');
    } finally {
      setLoading(false);
    }
  }, [ngay_do_kiem, ma_bg, defaultCause]);

  // U1-R3: One effect keyed on ngay_do_kiem|ma_bg
  useEffect(() => {
    loadCardData();
  }, [cardKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle escape key
  useEffect(() => {
    if (!parcelKey || activeBatchModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    globalThis.addEventListener?.('keydown', handleKeyDown);
    return () => globalThis.removeEventListener?.('keydown', handleKeyDown);
  }, [parcelKey, activeBatchModal, onClose]);

  if (!parcelKey) return null;

  const isPassed = card?.danh_gia === 'Đạt';
  const isFailed = card?.danh_gia === 'Không đạt';
  const postman = card?.postman || {};
  const diffPostman = postman.first?.ma && postman.first?.ma !== postman.shown?.ma;
  const journey = card?.journey || {};
  const milestones = journey.milestones || {};
  const legs = journey.legs || {};
  const tct = card?.tct || {};
  const sys = card?.system || {};
  const anl = card?.analysis || null;
  const historyEntries = card?.history?.entries || [];
  const whyBox = buildWhyConclusion(card?.evidence, card?.lot, sys);
  const lot = card?.lot || null;
  const lotCounts = resolveLotCounts(lot);

  const canWrite = canWriteParcelAnalysis(card, catalog, layout);
  const causesList = catalog?.causes && catalog.causes.length > 0 ? catalog.causes : ANALYST_CAUSES;
  const maxNote = catalog?.note_max || 1000;
  const isMandatory = isNoteMandatory(selectedCause, sys.line);

  const handleSubmitAnalysis = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedCause) {
      setFormError('Vui lòng chọn một nguyên nhân trong danh sách.');
      return;
    }

    if (isMandatory && !note.trim()) {
      setFormError(
        selectedCause === 'KHAC'
          ? 'Chọn "Khác" thì bắt buộc phải nhập ghi chú giải thích.'
          : 'Bưu gửi đã có kết luận hệ thống: Bắt buộc phải ghi lý do khi phân tích (PO Decision V3/V4).'
      );
      return;
    }

    if (note.length > maxNote) {
      setFormError(`Ghi chú tối đa ${maxNote} ký tự (hiện tại: ${note.length}).`);
      return;
    }

    setSubmitting(true);
    try {
      await postEvidenceAnalysis({
        ngay_do_kiem: card.ngay_do_kiem,
        ma_bg: card.ma_bg,
        cause: selectedCause,
        note: note.trim(),
      });
      setFormSuccess('Đã lưu kết luận phân tích thành công!');
      // Reload card data and notify parent
      loadCardData();
      onAnalysisSuccess?.();
      globalThis.setTimeout?.(() => setFormSuccess(''), 2500);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Gặp lỗi khi lưu phân tích.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fiveMilestonesList = [
    {
      key: 'tms',
      label: '1. Quét xuống TMS',
      time: getMilestoneAt(milestones.tms),
      source: milestones.tms?.source || 'F1.3',
    },
    {
      key: 'depart',
      label: '2. Đóng đi khỏi sàn KTC1',
      time: getMilestoneAt(milestones.depart),
      source: milestones.depart?.source || 'F1.1',
    },
    {
      key: 'arrive',
      label: '3. Đến BCVH phát',
      time: getMilestoneAt(milestones.arrive),
      source: milestones.arrive?.source || (milestones.arrive_source === 'BF' ? 'BatchFile' : (milestones.arrive_source || 'F4.1')),
    },
    {
      key: 'gbt',
      label: '4. Giao bưu tá phát',
      time: getMilestoneAt(milestones.gbt),
      source: milestones.gbt?.source || 'F4.2',
      note: (() => {
        const first = getMilestoneAt(milestones.gbt_first);
        const curr = getMilestoneAt(milestones.gbt);
        return first && first !== curr ? `Giao đầu: ${first}` : null;
      })(),
    },
    {
      key: 'ptc',
      label: '5. Phát thành công (PTC)',
      time: getMilestoneAt(milestones.ptc),
      source: milestones.ptc?.source || 'F1.3',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isPassed
                  ? 'bg-emerald-100 text-emerald-800'
                  : isFailed
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phiếu bưu gửi</span>
                <h3 className="text-base font-extrabold text-slate-900 font-mono">
                  {card?.ma_bg || ma_bg}
                </h3>
                {isPassed ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" />
                    Đạt
                  </span>
                ) : isFailed ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                    <AlertTriangle className="h-3 w-3" />
                    Không đạt
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    <HelpCircle className="h-3 w-3" />
                    Chưa đánh giá
                  </span>
                )}
                {journey.khong_tron_lo ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    Không trọn lô
                  </span>
                ) : null}
              </div>

              {card && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                  <span>Ngày đo: <strong className="text-slate-800">{card.ngay_do_kiem}</strong></span>
                  <span>•</span>
                  <span>BCVH: <strong className="text-slate-800">{card.ten_bcvh ? `${card.ten_bcvh} (${card.ma_bcvh})` : card.ma_bcvh}</strong></span>
                  <span>•</span>
                  <span>Tuyến: <strong className="text-slate-800">{card.ten_tuyen || card.ma_tuyen || '—'}</strong></span>
                  <span>•</span>
                  <span>
                    Bưu tá: <strong className="text-slate-800">{postman.shown?.ten || postman.shown?.ma || '—'}</strong>
                    {diffPostman ? (
                      <span className="text-slate-500 font-normal italic ml-1">
                        (Đầu: {postman.first.ten || postman.first.ma})
                      </span>
                    ) : null}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2" data-no-capture="true">
            <BlockCaptureButton
              targetRef={modalRef}
              blockTitle={`Phieu_buu_gui_${card?.ma_bg || ma_bg}`}
            />
            <button
              type="button"
              onClick={onClose}
              title="Đóng (Esc)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-5 pt-2.5 pb-2 border-b border-slate-100 bg-slate-50/40 text-xs font-bold" data-no-capture="true">
          <button
            type="button"
            onClick={() => setActiveTab('journey')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'journey'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Hành trình</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cause')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'cause'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Nguyên nhân</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'analysis'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Phân tích</span>
            {anl && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'analysis' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                Đã rà soát
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {loading && !card ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
              <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Đang tải thông tin phiếu bưu gửi...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-800 text-center font-medium">
              <AlertCircle className="h-5 w-5 mx-auto mb-1 text-rose-600" />
              {error}
            </div>
          ) : card ? (
            <>
              {/* TAB 1: HÀNH TRÌNH */}
              {activeTab === 'journey' && (
                <div className="space-y-4">
                  {/* Lot & TCT Measurement Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="text-[11px] text-slate-500">Mã lô (BF Phát)</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5 font-mono">
                        {journey.ma_lo || '—'}
                      </div>
                      {journey.khong_tron_lo ? (
                        <div className="text-[10px] font-bold text-amber-800 mt-0.5">Không trọn lô</div>
                      ) : null}
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="text-[11px] text-slate-500">Số giờ TCT ghi nhận</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {formatJourneyLegHours(tct.hours)}
                      </div>
                      {tct.hours_text && (
                        <div className="text-[10px] text-slate-400">Gốc: {tct.hours_text}</div>
                      )}
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="text-[11px] text-slate-500">Hạn định phát</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {formatJourneyLegHours(tct.limit_hours)}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="text-[11px] text-slate-500">Thời gian còn khi đến</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {formatJourneyLegHours(tct.remaining_at_arrival_hours)}
                      </div>
                    </div>
                  </div>

                  {/* 5 Milestones Table */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-blue-600" />
                        5 mốc thời gian hành trình & Nguồn gốc
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {fiveMilestonesList.map((mItem) => (
                        <div key={mItem.key} className="py-2.5 flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <div className="font-semibold text-slate-800">{mItem.label}</div>
                            {mItem.note && <div className="text-[10px] text-slate-400 mt-0.5">{mItem.note}</div>}
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className={`font-mono font-semibold ${mItem.time ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                              {mItem.time || 'Không có mốc'}
                            </span>
                            {mItem.time && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {mItem.source}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6 Leg Hours Table */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <Truck className="h-4 w-4 text-blue-600" />
                      Thời gian 6 chặng giữa các mốc
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                      {EVIDENCE_JOURNEY_LEGS.map((leg) => {
                        const val = legs[leg.key];
                        const isArriveGbt = leg.key === 'arrive_gbt';
                        const earlyMs = isArriveGbt ? (journey.gbt_before_arrive_ms ?? card?.gbt_before_arrive_ms) : null;
                        const hasEarly = isArriveGbt && earlyMs !== null && earlyMs !== undefined && Number(earlyMs) > 0;

                        if (hasEarly) {
                          return (
                            <div
                              key={leg.key}
                              className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/70"
                              title="Không tính vào thời gian chặng Đến–Giao"
                            >
                              <div className="text-[11px] text-rose-700 font-medium truncate">{leg.label}</div>
                              <div className="text-xs font-bold text-rose-700 mt-1">
                                {formatEarlyHandoverText(earlyMs)}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={leg.key} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60" title={leg.title}>
                            <div className="text-[11px] text-slate-500 font-medium truncate">{leg.label}</div>
                            <div className="text-sm font-extrabold text-slate-900 mt-1">
                              {formatJourneyLegHours(val)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: NGUYÊN NHÂN */}
              {activeTab === 'cause' && (
                <div className="space-y-4">
                  {/* F13-PARCEL-CARD-01 U4 (C6.1): "Vì sao kết luận" box */}
                  {whyBox && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                        <span className="font-bold text-slate-900 flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-blue-600" />
                          {whyBox.title}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-0.5">
                        {whyBox.lines.map((line) => (
                          <div
                            key={line.key}
                            className={
                              line.isMismatch
                                ? 'px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 font-semibold'
                                : line.highlight
                                ? 'px-3 py-2 rounded-lg border border-rose-200 bg-rose-50/80 text-rose-800 font-semibold'
                                : 'px-3 py-1.5 rounded-lg bg-white/80 border border-slate-100 text-slate-700'
                            }
                          >
                            {line.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* F13-PARCEL-CARD-01 U4 (C6.2 & C6.3): Lot batch table */}
                  {lot && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <span className="font-bold text-slate-900 flex items-center gap-2">
                          <Layers className="h-4 w-4 text-blue-600" />
                          <span>
                            Các đợt quét TMS của lô <strong className="font-mono text-blue-700">{lot.ma_lo}</strong>
                          </span>
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600">
                          Số BG: <strong>{lotCounts.volume.toLocaleString('vi-VN')}</strong> · Không đạt:{' '}
                          <strong className="text-rose-700">{lotCounts.failed.toLocaleString('vi-VN')}</strong>
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 bg-slate-50/70">
                              <th className="py-2 px-2.5">Đợt</th>
                              <th className="py-2 px-2.5">Quét TMS</th>
                              <th className="py-2 px-2.5 text-right">Số BG</th>
                              <th className="py-2 px-2.5 text-right">Không đạt</th>
                              <th className="py-2 px-2.5">Đến BCVH</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(lot.batches || []).map((batch, idx) => {
                              const { volume: batchVol, failed: batchFailed } = resolveLotCounts(batch);
                              const isOwn = Boolean(batch.is_own);
                              return (
                                <tr
                                  key={batch.tms || idx}
                                  className={
                                    isOwn
                                      ? 'bg-rose-50/60 font-semibold text-slate-900'
                                      : 'hover:bg-slate-50/70 text-slate-700'
                                  }
                                >
                                  <td className="py-2 px-2.5 whitespace-nowrap">
                                    <span>Đợt {idx + 1}</span>
                                    {isOwn && (
                                      <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                        ← bưu gửi này
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2.5 font-mono whitespace-nowrap">
                                    {formatEvidenceTime(batch.tms)}
                                  </td>
                                  <td className="py-2 px-2.5 text-right whitespace-nowrap" data-no-capture="true">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveBatchModal({
                                          lot,
                                          batch,
                                          batchIndex: idx + 1,
                                          expectedTotal: batchVol,
                                        })
                                      }
                                      className="inline-flex items-center justify-end px-2 py-0.5 rounded-md font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                                      title={`Xem danh sách ${batchVol.toLocaleString('vi-VN')} bưu gửi của đợt ${idx + 1}`}
                                    >
                                      {batchVol.toLocaleString('vi-VN')}
                                    </button>
                                  </td>
                                  <td
                                    className={`py-2 px-2.5 text-right whitespace-nowrap ${
                                      batchFailed > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'
                                    }`}
                                  >
                                    {batchFailed.toLocaleString('vi-VN')}
                                  </td>
                                  <td className="py-2 px-2.5 font-mono whitespace-nowrap">
                                    {formatBatchArrivalRange(batch)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                        <div>Lô trọn lúc {formatEvidenceTime(lot.complete_at)}</div>
                        {lot.scope_hidden ? (
                          <div className="text-amber-800 font-medium">
                            Chỉ tính bưu gửi của đơn vị bạn; lô còn bưu gửi của đơn vị khác.
                          </div>
                        ) : null}
                        {Number(lot.no_tms) > 0 ? (
                          <div className="text-slate-500">
                            {lot.no_tms} bưu gửi không có giờ quét TMS.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* System Conclusion */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                        Kết luận của Hệ thống
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                        Trạng thái: {formatCauseStatusLabel(sys.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <div className="text-[11px] text-slate-500 font-semibold">Nguyên nhân hệ thống:</div>
                        <div className="text-base font-extrabold text-slate-900 mt-0.5">
                          {sys.status === 'CHO_CHUYEN_QUAN'
                            ? 'Chờ Chuyên quản phân tích'
                            : formatCauseLabel(sys.code) || sys.label || 'Chưa xác định'}
                        </div>
                      </div>

                      {sys.detail && (
                        <div>
                          <div className="text-[11px] text-slate-500 font-semibold">Chi tiết phát:</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">{formatPhatDetail(sys.detail)}</div>
                        </div>
                      )}

                      {sys.reason && (
                        <div>
                          <div className="text-[11px] text-slate-500 font-semibold">Lý do Chờ Chuyên quản:</div>
                          <div className="text-sm font-bold text-amber-800 mt-0.5">{formatChoChuyenQuanReason(sys.reason)}</div>
                        </div>
                      )}

                      {sys.step && (
                        <div>
                          <div className="text-[11px] text-slate-500 font-semibold">Bước phân loại:</div>
                          <div className="text-xs font-semibold text-slate-700 mt-0.5">{formatCauseStepLabel(sys.step)}</div>
                        </div>
                      )}
                    </div>

                    {sys.basis && (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-[11px] text-slate-500 font-semibold">Căn cứ phân loại:</div>
                        <div className="text-xs text-slate-700 italic mt-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                          {formatCauseBasisLabel(sys.basis)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Flags & Hints */}
                  {((sys.flags && sys.flags.length > 0) || (sys.hints && sys.hints.length > 0)) && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                      <span className="font-bold text-slate-800 text-xs">
                        Cờ dữ liệu & Gợi ý nghiệp vụ
                      </span>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {sys.flags?.map((flag) => (
                          <span key={flag} className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            Cờ: {formatFlagLabel(flag)}
                          </span>
                        ))}
                        {sys.hints?.map((hint) => (
                          <span key={hint} className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                            Gợi ý: {formatCauseHintLabel(hint)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PHÂN TÍCH */}
              {activeTab === 'analysis' && (
                <div className="space-y-4">
                  {/* Current Analysis Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-bold text-slate-900 flex items-center gap-2">
                        <Tag className="h-4 w-4 text-emerald-600" />
                        Đánh giá hiện hành của Chuyên quản
                      </span>
                      {anl && (
                        <span className="text-[11px] text-slate-500">
                          {anl.at}
                        </span>
                      )}
                    </div>

                    {anl ? (
                      <div className="space-y-2.5 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="text-[11px] text-slate-500 font-semibold">Nguyên nhân xác định:</div>
                            <div className="text-base font-extrabold text-slate-900 mt-0.5">
                              {anl.label || formatAnalystCause(anl.cause)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-slate-500 font-semibold">Đối chiếu hệ thống:</div>
                            <div className="text-sm font-bold text-slate-800 mt-0.5">
                              {formatVersusSystem(anl.versus_system)}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] text-slate-500 font-semibold">Người phân tích:</div>
                          <div className="text-xs text-slate-800 mt-0.5">
                            <strong>{anl.by}</strong> {anl.position ? `(${anl.position})` : ''}
                          </div>
                        </div>

                        {anl.note && (
                          <div>
                            <div className="text-[11px] text-slate-500 font-semibold">Ghi chú giải thích:</div>
                            <div className="text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-0.5">
                              &quot;{anl.note}&quot;
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-slate-400 italic">
                        Chưa có kết luận phân tích nào cho bưu gửi này.
                      </div>
                    )}
                  </div>

                  {/* History of Analyses */}
                  {historyEntries.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <History className="h-4 w-4 text-slate-600" />
                        <span className="font-bold text-slate-800 text-xs">
                          Lịch sử các lần ghi nhận ({historyEntries.length} lần)
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {historyEntries.map((entry) => (
                          <div key={entry.id} className="py-2.5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">
                                {entry.cause_label || formatAnalystCause(entry.cause)}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {entry.created_at || entry.at}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              Bởi: <strong>{entry.analyst_name || entry.by}</strong>
                              {entry.current && (
                                <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Hiện hành
                                </span>
                              )}
                            </div>
                            {entry.note && (
                              <p className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded">
                                &quot;{entry.note}&quot;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Write Form (Only shown if canWrite === true) */}
                  {canWrite ? (
                    <form onSubmit={handleSubmitAnalysis} className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                        <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                          <Edit3 className="h-4 w-4 text-blue-600" />
                          {anl ? 'Chỉnh sửa kết luận phân tích' : 'Ghi nhận kết luận phân tích mới'}
                        </span>
                        <span className="text-[10px] text-slate-500 italic">
                          Quy định V3/V4: Ghi chú bắt buộc khi đã có KLHT hoặc chọn &quot;Khác&quot;
                        </span>
                      </div>

                      {formError && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                          <span>{formError}</span>
                        </div>
                      )}

                      {formSuccess && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{formSuccess}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Nguyên nhân xác định <span className="text-rose-500">*</span>:
                        </label>
                        <select
                          value={selectedCause}
                          onChange={(e) => setSelectedCause(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {causesList.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Ghi chú giải thích {isMandatory && <span className="text-rose-500">* (Bắt buộc)</span>}:
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {note.length} / {maxNote} ký tự
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          maxLength={maxNote}
                          placeholder={
                            selectedCause === 'KHAC'
                              ? 'Bắt buộc giải thích rõ lý do khi chọn "Khác"...'
                              : isMandatory
                              ? 'Bưu gửi đã có kết luận HT: Bắt buộc nêu rõ căn cứ giải thích...'
                              : 'Nhập ghi chú bổ sung (tùy chọn)...'
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {submitting ? 'Đang lưu...' : anl ? 'Cập nhật phân tích' : 'Lưu kết luận'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-500 text-center space-y-1">
                      {isPassed ? (
                        <p>Bưu gửi Đạt chỉ tiêu thời gian - không cần phân tích nguyên nhân.</p>
                      ) : !catalog?.can?.write ? (
                        <p>Tài khoản chỉ có quyền xem, không có quyền ghi phân tích.</p>
                      ) : (
                        <p>Bưu gửi thuộc đơn vị ngoài phạm vi phân quyền của tài khoản.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2" data-no-capture="true">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer text-xs"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* F13-PARCEL-CARD-01 U4 (C6.3): Batch parcel list popup in Hành trình view */}
      {activeBatchModal && (
        <F13V2JourneyParcelModal
          isOpen={Boolean(activeBatchModal)}
          lotBatch={activeBatchModal}
          catalog={catalog}
          layout={layout}
          onClose={() => setActiveBatchModal(null)}
          onSelectParcel={(item) => {
            setOverrideParcelKey(item);
            setActiveTab('journey');
            setActiveBatchModal(null);
          }}
          onAnalysisSuccess={() => {
            loadCardData(true);
            onAnalysisSuccess?.();
          }}
        />
      )}
    </div>
  );
}
