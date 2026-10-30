import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar,
  Save,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Lock,
} from 'lucide-react';
import opsJournalAdapter from './api/opsJournalApi.js';
import {
  validateSpotsSelection,
  getCounterBadgeStyle,
  canSaveSpots,
  getIndicatorChipStyle,
  normalizeIndicator,
  getVietnamToday,
} from './opsJournalHelpers.js';
import UnavailableAlert from './components/UnavailableAlert.jsx';
import CandidateTable from './components/CandidateTable.jsx';
import ManualSpotModal from './components/ManualSpotModal.jsx';

const DEFAULT_JOURNAL_DATE = getVietnamToday();

export default function OpsJournalCandidatesPage({
  initialDate = DEFAULT_JOURNAL_DATE,
  onNavigateToComposer,
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [unavailable, setUnavailable] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [manualSpots, setManualSpots] = useState([]);
  // spots of the day the server keeps whatever is sent (finalized, closed, reopened or holding a report): shown locked, always counted, never sent
  const [lockedSpots, setLockedSpots] = useState([]);
  const [loadedDate, setLoadedDate] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [alert, setAlert] = useState(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [indicatorFilter, setIndicatorFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const activeRequestIdRef = useRef(0);
  const selectedDateRef = useRef(initialDate);
  selectedDateRef.current = selectedDate;

  const clearData = useCallback(() => {
    setCandidates([]);
    setSelectedIds(new Set());
    setManualSpots([]);
    setLockedSpots([]);
    setDayData(null);
    setUnavailable([]);
    setLoadedDate(null);
  }, []);

  // Fetch candidates and current day status
  const loadDataForDate = useCallback(async (date) => {
    const requestId = ++activeRequestIdRef.current;
    // nothing of the previous day may stay selectable while the new one loads (candidate ids carry no date)
    clearData();
    setLoading(true);
    setAlert(null);

    try {
      const [candRes, dayRes] = await Promise.all([
        opsJournalAdapter.getCandidates(date),
        opsJournalAdapter.getDay(date),
      ]);

      // Ignore stale responses if date changed
      if (requestId !== activeRequestIdRef.current) return;

      if (!candRes.success) {
        clearData();
        setAlert({
          type: 'error',
          message: candRes.error?.message || 'Không thể tải danh sách ứng viên điểm đen.',
        });
        return;
      }

      if (!dayRes.success) {
        clearData();
        setAlert({
          type: 'error',
          message: dayRes.error?.message || `Không thể tải thông tin nhật ký ngày ${date}.`,
        });
        return;
      }

      const items = candRes.data?.items ? [...candRes.data.items] : [];
      const daySpots = dayRes.data?.spots || [];
      setDayData(dayRes.data);
      setUnavailable(candRes.data?.unavailable || []);

      const savedCandidateIds = new Set();
      const savedManual = [];
      const locked = [];
      daySpots.forEach((spot) => {
        const isSpotLocked =
          spot.status !== 'DRAFT' || spot.protected === true || Boolean(spot.reopenReason);
        const matched =
          spot.source === 'MANUAL'
            ? null
            : items.find((c) => c.scopeKey === spot.scopeKey && c.indicator === spot.indicator && c.scopeType === (spot.scopeType || c.scopeType)) || null;
        if (isSpotLocked) {
          locked.push({
            id: spot.id,
            source: spot.source,
            title: spot.title,
            indicator: spot.indicator,
            candidateId: matched ? matched.candidateId : null,
          });
        }
        if (spot.source === 'MANUAL') {
          savedManual.push({
            indicator: spot.indicator,
            officeCode: spot.officeCode,
            title: spot.title,
            headline: spot.headline,
            isLocked: isSpotLocked,
          });
        } else if (matched && !isSpotLocked) {
          // a draft spot still in today's suggestions: ticked again (a draft that dropped out is simply not kept)
          savedCandidateIds.add(matched.candidateId);
        }
      });

      setCandidates(items);
      setLockedSpots(locked);
      setManualSpots(savedManual);
      // nothing is ticked unless it was saved: the manager searches / ticks the BCVH they want (PO 2026-10-30)
      setSelectedIds(savedCandidateIds);
      setLoadedDate(date);
    } catch (err) {
      if (requestId !== activeRequestIdRef.current) return;
      clearData();
      setAlert({
        type: 'error',
        message: err.message || 'Lỗi mạng khi tải dữ liệu nhật ký điều hành.',
      });
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [clearData]);

  useEffect(() => {
    loadDataForDate(selectedDate);
  }, [selectedDate, loadDataForDate]);

  // Locked spots are always counted (the server counts them too); only the other ticks are sent
  const lockedCandidateIds = useMemo(
    () => new Set(lockedSpots.map((spot) => spot.candidateId).filter(Boolean)),
    [lockedSpots]
  );
  const unlockedManual = useMemo(() => manualSpots.filter((spot) => !spot.isLocked), [manualSpots]);
  const displayedSelectedIds = useMemo(
    () => new Set([...selectedIds, ...lockedCandidateIds]),
    [selectedIds, lockedCandidateIds]
  );
  const orphanLockedSpots = lockedSpots.filter((spot) => spot.source !== 'MANUAL' && !spot.candidateId);
  const totalCount = lockedSpots.length + selectedIds.size + unlockedManual.length;
  const validation = validateSpotsSelection({
    candidateIds: [...Array.from(selectedIds), ...lockedSpots.map((spot) => `locked:${spot.id}`)],
    manual: unlockedManual,
  });
  const counterStyle = getCounterBadgeStyle(totalCount);
  const dayReady = Boolean(dayData) && loadedDate === selectedDate && !loading;
  const saveDisabled = !canSaveSpots(totalCount) || saving || !dayReady || dayData?.status === 'CLOSED';

  // Toggle candidate selection
  const handleToggleCandidate = (candidateId) => {
    if (dayData?.status === 'CLOSED') return;
    if (lockedCandidateIds.has(candidateId)) return; // locked, cannot unselect
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  // Select/Unselect all visible
  const handleSelectAllVisible = (checkAll) => {
    if (dayData?.status === 'CLOSED') return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredCandidates.forEach((cand) => {
        if (lockedCandidateIds.has(cand.candidateId)) return;
        if (checkAll) {
          next.add(cand.candidateId);
        } else {
          next.delete(cand.candidateId);
        }
      });
      return next;
    });
  };

  // Add manual spot
  const handleAddManualSpot = (newSpot) => {
    setManualSpots((prev) => [...prev, newSpot]);
    setAlert(null);
  };

  // Remove manual spot (I10: locked manual spots cannot be removed)
  const handleRemoveManualSpot = (index) => {
    if (dayData?.status === 'CLOSED') return;
    if (manualSpots[index]?.isLocked) return;
    setManualSpots((prev) => prev.filter((_, idx) => idx !== index));
    setAlert(null);
  };

  // Save selected spots
  const handleSave = async () => {
    // Client-side guard (at least 1)
    if (!validation.valid) {
      setAlert({
        type: 'error',
        message: validation.message,
      });
      return;
    }

    setSaving(true);
    setAlert(null);

    const saveDate = selectedDate;
    const payload = {
      candidateIds: Array.from(selectedIds),
      manual: unlockedManual.map(({ isLocked: _isLocked, ...spot }) => spot),
    };

    try {
      const res = await opsJournalAdapter.saveSpots(saveDate, payload);
      if (saveDate !== selectedDateRef.current) return; // the date changed while saving: this answer is not for the page any more
      if (res.success) {
        setDayData(res.data);
        setAlert({
          type: 'success',
          message: `Đã lưu thành công danh sách ${res.data?.spots?.length || totalCount} điểm đen cho ngày ${saveDate}.`,
        });
      } else {
        // Show error.message when 400/409
        setAlert({
          type: 'error',
          message: res.error?.message || 'Không thể lưu danh sách điểm đen.',
        });
      }
    } catch (err) {
      if (saveDate !== selectedDateRef.current) return;
      setAlert({
        type: 'error',
        message: err.message || 'Lỗi khi gửi yêu cầu lưu điểm đen.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter candidates by indicator & search query
  const filteredCandidates = useMemo(() => {
    return candidates.filter((cand) => {
      if (indicatorFilter !== 'ALL') {
        const normFilter = normalizeIndicator(indicatorFilter);
        const normCand = normalizeIndicator(cand.indicator);
        if (normFilter !== normCand) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (cand.title || '').toLowerCase().includes(q);
        const matchOffice = (cand.officeName || '').toLowerCase().includes(q) || (cand.officeCode || '').includes(q);
        const matchHeadline = (cand.headline || '').toLowerCase().includes(q);
        if (!matchTitle && !matchOffice && !matchHeadline) return false;
      }
      return true;
    });
  }, [candidates, indicatorFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Control Header Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Title & Description */}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Nhật ký điều hành (PL06)
                </h1>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                  Bước 1: Chọn điểm đen
                </span>
                {dayData?.status && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border ${
                      dayData.status === 'CLOSED'
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : dayData.status === 'ASSIGNED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {dayData.status === 'CLOSED' && <Lock size={12} />}
                    {dayData.status === 'CLOSED'
                      ? 'Đã đóng'
                      : dayData.status === 'ASSIGNED'
                      ? 'Đã chốt & giao việc'
                      : 'Bản nháp (DRAFT)'}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Chọn các điểm đen cần giao việc hôm nay (số lượng do Giám đốc quyết định) để phân công xử lý theo nguyên tắc 6 rõ (Ai / Làm gì / Ở đâu / Khi nào / Bằng cách nào / Kết quả).
              </p>
            </div>

            {/* Date Picker & Counter & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Input */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 shadow-2xs">
                <Calendar size={15} className="text-slate-500" />
                <label htmlFor="journal-date-input" className="text-xs font-semibold text-slate-700">Ngày:</label>
                <input
                  id="journal-date-input"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={saving}
                  className="text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                />
              </div>

              {/* Counter Badge */}
              <div
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-2xs transition-colors ${counterStyle.badgeClass}`}
                title="Chọn ít nhất 1 điểm đen"
              >
                <span>{counterStyle.label}</span>
              </div>

              {/* Refresh button */}
              <button
                type="button"
                onClick={() => loadDataForDate(selectedDate)}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                title="Tải lại dữ liệu"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>

              {/* Manual Spot Button */}
              <button
                type="button"
                onClick={() => setIsManualModalOpen(true)}
                disabled={dayData?.status === 'CLOSED'}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <PlusCircle size={15} className="text-[var(--color-vnpost-orange)]" />
                <span>+ Thêm thủ công</span>
              </button>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saveDisabled}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-all ${
                  saveDisabled
                    ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                    : 'bg-gradient-to-r from-[var(--color-vnpost-orange)] to-amber-500 hover:brightness-105 active:scale-98 cursor-pointer'
                }`}
              >
                <Save size={15} />
                <span>{saving ? 'Đang lưu...' : 'Lưu danh sách điểm đen'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Unavailable Warnings Banner */}
        <UnavailableAlert unavailable={unavailable} />

        {/* Status / Alert Message */}
        {alert && (
          <div
            role="alert"
            className={`flex items-center gap-3 rounded-xl border p-4 text-xs font-bold shadow-xs transition-all ${
              alert.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}
          >
            {alert.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            )}
            <div className="flex-1">{alert.message}</div>
            {alert.type === 'success' && onNavigateToComposer && (
              <button
                type="button"
                onClick={() => onNavigateToComposer(selectedDate)}
                className="rounded-lg bg-emerald-700 px-3 py-1 text-white text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                Chuyển sang Soạn nhật ký →
              </button>
            )}
            <button
              type="button"
              onClick={() => setAlert(null)}
              className="font-extrabold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Indicator Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1 text-xs font-bold text-slate-500">
              <Filter size={13} />
              Lọc:
            </span>
            {['ALL', 'F1.1', 'F1.2', 'F1.3', 'F4.1', 'HANGTON'].map((key) => {
              const isSelected = indicatorFilter === key;
              const chip = key !== 'ALL' ? getIndicatorChipStyle(key) : null;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIndicatorFilter(key)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? key === 'ALL'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : `${chip?.badgeClass} ring-2 ring-blue-500 ring-offset-1 font-extrabold shadow-2xs`
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {key === 'ALL' ? 'Tất cả' : chip?.shortLabel}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo bưu cục, mã, nội dung..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {orphanLockedSpots.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700" data-testid="locked-orphans">
            <span className="font-bold">Điểm đã chốt không còn trong gợi ý hôm nay (vẫn được tính vào số đã chọn): </span>
            {orphanLockedSpots.map((spot) => spot.title).join('; ')}
          </div>
        )}

        {/* Candidate Table */}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <RefreshCw className="h-6 w-6 animate-spin text-[var(--color-vnpost-orange)]" />
              <span className="text-xs font-semibold">Đang tổng hợp các điểm đen chất lượng...</span>
            </div>
          </div>
        ) : (
          <CandidateTable
            candidates={filteredCandidates}
            selectedIds={displayedSelectedIds}
            lockedCandidateIds={lockedCandidateIds}
            onToggleCandidate={handleToggleCandidate}
            onSelectAllVisible={handleSelectAllVisible}
            manualSpots={manualSpots}
            onRemoveManualSpot={handleRemoveManualSpot}
          />
        )}

        {/* Bottom Helper Bar */}
        <div className="flex flex-col gap-2 rounded-xl bg-slate-100/80 p-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Quy tắc chọn điểm đen:</span>
            <span>Chọn ít nhất 1 điểm, giao bao nhiêu tùy Giám đốc (gồm ứng viên hệ thống và điểm thêm thủ công).</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500 font-medium">
            <span>Tổng ứng viên: {candidates.length}</span>
            <span>•</span>
            <span className={validation.valid ? 'font-bold text-emerald-700' : 'font-bold text-amber-700'}>
              Đã chọn: {totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Manual Spot Modal */}
      <ManualSpotModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onAddSpot={handleAddManualSpot}
      />
    </div>
  );
}
