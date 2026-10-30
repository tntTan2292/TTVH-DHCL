import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Calendar,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  CheckSquare,
  Square,
  ArrowLeft,
  Trash2,
} from 'lucide-react';
import opsJournalAdapter from './api/opsJournalApi.js';
import { validateSpotsForAssign, getVietnamToday } from './opsJournalHelpers.js';
import OpsJournalSpotCard from './components/OpsJournalSpotCard.jsx';

export default function OpsJournalComposerPage({
  initialDate = getVietnamToday(),
  onNavigateToCandidates,
  onDirtyStateChange,
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [loading, setLoading] = useState(true);
  const [dayData, setDayData] = useState(null);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [selectedSpotIdsForAssign, setSelectedSpotIdsForAssign] = useState(new Set());
  const [dirtySpotIds, setDirtySpotIds] = useState(new Set());
  const [alert, setAlert] = useState(null);

  // Loading states for actions (savingActionsSpotIds per-spot ID set)
  const [savingActionsSpotIds, setSavingActionsSpotIds] = useState(new Set());
  const [reopeningSpotId, setReopeningSpotId] = useState(null);
  const [markingDoneActionId, setMarkingDoneActionId] = useState(null);
  const [assigningBatch, setAssigningBatch] = useState(false);
  const [savingClosingSpotId, setSavingClosingSpotId] = useState(null);
  const [closingDay, setClosingDay] = useState(false);

  // Sync dirty state to parent for tab navigation guard (M1)
  useEffect(() => {
    onDirtyStateChange?.(dirtySpotIds.size > 0);
  }, [dirtySpotIds, onDirtyStateChange]);

  // Fetch day and assignable users
  const loadRequestRef = useRef(0);
  const loadDayData = useCallback(async (date) => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setAlert(null);
    setDirtySpotIds(new Set()); // M1: Reset dirtySpotIds mỗi lần tải để nút Chốt không kẹt "chưa lưu"
    // never keep the previous day's spots on screen while another day loads or fails to load ("Chốt" would post its ids)
    setDayData(null);
    setSelectedSpotIdsForAssign(new Set());

    try {
      const [dayRes, usersRes] = await Promise.all([
        opsJournalAdapter.getDay(date),
        opsJournalAdapter.getAssignableUsers(),
      ]);
      if (requestId !== loadRequestRef.current) return; // an older answer: a newer load is running

      if (dayRes.success) {
        setDayData(dayRes.data);

        // Pre-select all draft spots for assignment by default
        const draftIds = new Set(
          (dayRes.data?.spots || [])
            .filter((s) => s.status === 'DRAFT')
            .map((s) => s.id)
        );
        setSelectedSpotIdsForAssign(draftIds);
      } else {
        setAlert({
          type: 'error',
          message: dayRes.error?.message || `Không thể tải nhật ký ngày ${date}.`,
        });
      }

      if (usersRes.success) {
        setAssignableUsers(usersRes.data || []);
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Lỗi khi tải dữ liệu nhật ký điều hành.',
      });
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDayData(selectedDate);
  }, [selectedDate, loadDayData]);

  // Load all users (all=1)
  const handleToggleLoadAllUsers = async () => {
    if (!showAllUsers && allUsers.length === 0) {
      try {
        const res = await opsJournalAdapter.getAssignableUsers({ all: 1 });
        if (res.success) {
          setAllUsers(res.data || []);
        }
      } catch {
        // Fallback to assignableUsers
      }
    }
    setShowAllUsers((prev) => !prev);
  };

  const spots = useMemo(() => dayData?.spots || [], [dayData?.spots]);
  const draftSpots = useMemo(() => spots.filter((s) => s.status === 'DRAFT'), [spots]);
  const finalizedSpots = useMemo(() => spots.filter((s) => s.status === 'FINALIZED'), [spots]);
  const closedSpots = useMemo(() => spots.filter((s) => s.status === 'CLOSED'), [spots]);

  // Toggle select spot for assignment
  const handleToggleSelectForAssign = (spotId) => {
    setSelectedSpotIdsForAssign((prev) => {
      const next = new Set(prev);
      if (next.has(spotId)) {
        next.delete(spotId);
      } else {
        next.add(spotId);
      }
      return next;
    });
  };

  // Select all or deselect all draft spots
  const handleToggleSelectAllDraft = () => {
    if (selectedSpotIdsForAssign.size === draftSpots.length) {
      setSelectedSpotIdsForAssign(new Set());
    } else {
      setSelectedSpotIdsForAssign(new Set(draftSpots.map((s) => s.id)));
    }
  };

  // Track dirty unsaved edits per spot
  const handleDirtyChange = useCallback((spotId, isDirty) => {
    setDirtySpotIds((prev) => {
      const next = new Set(prev);
      if (isDirty) next.add(spotId);
      else next.delete(spotId);
      return next;
    });
  }, []);

  // Save 6-rõ actions for a spot (PUT /spots/:id/actions) - savingActionsSpotIds per spot
  const handleSaveActions = async (spotId, actions) => {
    setSavingActionsSpotIds((prev) => new Set([...prev, spotId]));
    setAlert(null);

    try {
      const res = await opsJournalAdapter.saveActions(spotId, { actions });
      if (res.success) {
        setDayData(res.data);
        setDirtySpotIds((prev) => {
          const next = new Set(prev);
          next.delete(spotId);
          return next;
        });
        setAlert({
          type: 'success',
          message: 'Đã lưu thành công kế hoạch 6-rõ.',
        });
        return true;
      } else {
        setAlert({
          type: 'error',
          message: res.error?.message || 'Không thể lưu danh sách 6-rõ.',
        });
        return false;
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Lỗi khi gửi yêu cầu lưu 6-rõ.',
      });
      return false;
    } finally {
      setSavingActionsSpotIds((prev) => {
        const next = new Set(prev);
        next.delete(spotId);
        return next;
      });
    }
  };

  // Batch Assign (Chốt và giao việc)
  const handleBatchAssign = async () => {
    const targetIds = Array.from(selectedSpotIdsForAssign);
    if (targetIds.length === 0) {
      setAlert({
        type: 'error',
        message: 'Vui lòng chọn ít nhất một điểm đen để chốt và giao việc.',
      });
      return;
    }

    // Item 3: Chặn chốt khi có thẻ dirty (hỏi lưu trước)
    const dirtyTargets = targetIds.filter((id) => dirtySpotIds.has(id));
    if (dirtyTargets.length > 0) {
      setAlert({
        type: 'error',
        message: 'Có điểm đen đang có chỉnh sửa 6-rõ chưa lưu. Vui lòng bấm "Lưu 6 rõ" trước khi chốt và giao việc.',
      });
      return;
    }

    // Client-side completeness validation
    const completenessCheck = validateSpotsForAssign(spots, targetIds);
    if (!completenessCheck.valid) {
      setAlert({
        type: 'error',
        message: completenessCheck.message,
      });
      return;
    }

    setAssigningBatch(true);
    setAlert(null);

    try {
      const res = await opsJournalAdapter.assignWork(selectedDate, { spotIds: targetIds });
      if (res.success) {
        setDayData(res.data);
        setSelectedSpotIdsForAssign(new Set());
        setAlert({
          type: 'success',
          message: `Đã chốt và giao việc thành công cho ${targetIds.length} điểm đen ngày ${selectedDate}.`,
        });
      } else {
        // Displays error.message from 400/409 (e.g. SPOT_INCOMPLETE)
        setAlert({
          type: 'error',
          message: res.error?.message || 'Không thể chốt và giao việc.',
        });
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Lỗi khi gửi yêu cầu chốt và giao việc.',
      });
    } finally {
      setAssigningBatch(false);
    }
  };

  // Reopen a spot (POST /spots/:id/reopen)
  const handleReopenSpot = async (spotId, reason) => {
    setReopeningSpotId(spotId);
    setAlert(null);

    try {
      const res = await opsJournalAdapter.reopenSpot(spotId, { reason });
      if (res.success) {
        setDayData(res.data);
        setSelectedSpotIdsForAssign((prev) => new Set([...prev, spotId]));
        setAlert({
          type: 'success',
          message: 'Đã mở lại điểm đen thành công về trạng thái Bản nháp.',
        });
        return true;
      } else {
        setAlert({
          type: 'error',
          message: res.error?.message || 'Không thể mở lại điểm đen.',
        });
        return false;
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Lỗi khi gửi yêu cầu mở lại điểm đen.',
      });
      return false;
    } finally {
      setReopeningSpotId(null);
    }
  };

  // Take a draft spot out of the day's list (DELETE /spots/:id)
  const handleRemoveSpot = async (spotId) => {
    setAlert(null);
    try {
      const res = await opsJournalAdapter.removeSpot(spotId);
      if (res.success) {
        setDayData(res.data);
        setSelectedSpotIdsForAssign((prev) => {
          const next = new Set(prev);
          next.delete(spotId);
          return next;
        });
        setAlert({ type: 'success', message: 'Đã xóa điểm đen khỏi danh sách.' });
        return true;
      }
      setAlert({ type: 'error', message: res.error?.message || 'Không thể xóa điểm đen.' });
      return false;
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Lỗi khi xóa điểm đen.' });
      return false;
    }
  };

  // Take every ticked draft spot out of the day's list at once (the bar next to "Chốt và giao việc")
  const [removingBatch, setRemovingBatch] = useState(false);
  const handleRemoveSelected = async () => {
    const targets = draftSpots.filter((s) => selectedSpotIdsForAssign.has(s.id) && !s.protected);
    const keptCount = draftSpots.filter((s) => selectedSpotIdsForAssign.has(s.id) && s.protected).length;
    if (targets.length === 0) {
      setAlert({ type: 'error', message: 'Các điểm đã tick đã có báo cáo của người được giao nên không xóa được.' });
      return;
    }
    if (!globalThis.confirm?.(`Xóa ${targets.length} điểm đen đã tick khỏi danh sách hôm nay?`)) return;
    setRemovingBatch(true);
    setAlert(null);
    let removed = 0;
    let failure = '';
    try {
      for (const spot of targets) {
        const res = await opsJournalAdapter.removeSpot(spot.id);
        if (!res.success) {
          failure = res.error?.message || 'Không thể xóa điểm đen.';
          break;
        }
        removed += 1;
        setDayData(res.data);
      }
    } catch (err) {
      failure = err.message || 'Lỗi khi xóa điểm đen.';
    } finally {
      setSelectedSpotIdsForAssign(new Set());
      setRemovingBatch(false);
    }
    if (failure) {
      setAlert({ type: 'error', message: `Đã xóa ${removed}/${targets.length} điểm. ${failure}` });
    } else {
      setAlert({ type: 'success', message: `Đã xóa ${removed} điểm đen khỏi danh sách.${keptCount ? ` ${keptCount} điểm đã có báo cáo được giữ lại.` : ''}` });
    }
  };

  // M1: Hỏi xác nhận khi tải lại, chuyển ngày, hoặc chuyển màn hình nếu có thẻ dirty
  const handleReload = () => {
    if (dirtySpotIds.size > 0) {
      const ok = globalThis.confirm?.(
        'Bạn có chỉnh sửa 6-rõ chưa lưu. Tải lại sẽ làm mất các thay đổi này. Bạn có chắc chắn muốn tiếp tục?'
      );
      if (!ok) return;
    }
    loadDayData(selectedDate);
  };

  const handleDateChange = (newDate) => {
    if (dirtySpotIds.size > 0) {
      const ok = globalThis.confirm?.(
        'Bạn có chỉnh sửa 6-rõ chưa lưu. Chuyển ngày sẽ làm mất các thay đổi này. Bạn có chắc chắn muốn tiếp tục?'
      );
      if (!ok) return;
    }
    setSelectedDate(newDate);
  };

  const handleBackToCandidates = () => {
    if (dirtySpotIds.size > 0) {
      const ok = globalThis.confirm?.(
        'Bạn có chỉnh sửa 6-rõ chưa lưu. Rời khỏi màn hình sẽ làm mất các thay đổi này. Bạn có chắc chắn muốn tiếp tục?'
      );
      if (!ok) return;
    }
    onNavigateToCandidates?.();
  };

  // Mark action done (POST /actions/:id/done)
  const handleMarkActionDone = async (actionId) => {
    setMarkingDoneActionId(actionId);
    setAlert(null);

    try {
      const res = await opsJournalAdapter.markActionDone(actionId);
      if (res.success) {
        // Update local state to reflect DONE status
        setDayData((prev) => {
          if (!prev) return prev;
          const nextSpots = prev.spots.map((spot) => {
            const hasAction = spot.actions?.some((a) => a.id === actionId);
            if (!hasAction) return spot;
            return {
              ...spot,
              actions: spot.actions.map((act) =>
                act.id === actionId ? { ...act, status: 'DONE' } : act
              ),
            };
          });
          return { ...prev, spots: nextSpots };
        });

        setAlert({
          type: 'success',
          message: 'Đã xác nhận hoàn thành công việc thành công.',
        });
      } else {
        setAlert({
          type: 'error',
          message: res.error?.message || 'Không thể xác nhận hoàn thành.',
        });
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Lỗi khi xác nhận hoàn thành.',
      });
    } finally {
      setMarkingDoneActionId(null);
    }
  };

  // Save closing end-of-day result (PUT /spots/:id/closing)
  const handleSaveClosing = async (spotId, closingData) => {
    setSavingClosingSpotId(spotId);
    setAlert(null);

    try {
      const res = await opsJournalAdapter.saveClosing(spotId, closingData);
      if (res.success) {
        setDayData(res.data);
        setAlert({
          type: 'success',
          message: 'Đã lưu kết quả cuối ngày thành công.',
        });
      } else {
        setAlert({
          type: 'error',
          message: res.error?.message || 'Không thể lưu kết quả cuối ngày.',
        });
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Lỗi khi gửi yêu cầu lưu kết quả cuối ngày.',
      });
    } finally {
      setSavingClosingSpotId(null);
    }
  };

  // Close Day (POST /days/:date/close) - reports DAY_NOT_READY if drafts remain
  const handleCloseDay = async () => {
    if (dayData?.status === 'CLOSED') return;
    const ok = globalThis.confirm?.(
      `Bạn có chắc chắn muốn Đóng ngày nhật ký ${selectedDate}? Sau khi đóng, toàn bộ điểm đen sẽ ở trạng thái hoàn tất và không thể mở lại.`
    );
    if (!ok) return;

    setClosingDay(true);
    setAlert(null);

    try {
      const res = await opsJournalAdapter.closeDay(selectedDate);
      if (res.success) {
        setDayData(res.data);
        setAlert({
          type: 'success',
          message: `Đã đóng nhật ký ngày ${selectedDate} thành công.`,
        });
      } else {
        setAlert({
          type: 'error',
          message: res.error?.message || `Không thể đóng nhật ký ngày ${selectedDate}.`,
        });
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Lỗi khi gửi yêu cầu đóng ngày.',
      });
    } finally {
      setClosingDay(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Title & Status */}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Nhật ký điều hành (PL06)
              </h1>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                Bước 2: Soạn nhật ký & Giao việc
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
                    ? 'Đã đóng ngày'
                    : dayData.status === 'ASSIGNED'
                    ? 'Đã chốt & giao việc'
                    : 'Bản nháp (DRAFT)'}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Chi tiết các dòng hành động 6 rõ (Ai / Làm gì / Ở đâu / Khi nào / Bằng cách nào / Kết quả gì) và phân công nhân sự.
            </p>
          </div>

          {/* Date Picker & Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Input */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 shadow-2xs">
              <Calendar size={15} className="text-slate-500" />
              <label htmlFor="composer-date-input" className="text-xs font-semibold text-slate-700">Ngày:</label>
              <input
                id="composer-date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Refresh button */}
            <button
              type="button"
              onClick={handleReload}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Tải lại nhật ký"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Close Day Button (Giám đốc TTVH) */}
            {dayData?.status !== 'CLOSED' && (
              <button
                type="button"
                onClick={handleCloseDay}
                disabled={closingDay || loading || spots.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                title="Đóng ngày (yêu cầu tất cả các điểm đen đã hoàn tất chốt giao việc)"
              >
                <Lock size={14} />
                <span>{closingDay ? 'Đang đóng...' : 'Đóng ngày'}</span>
              </button>
            )}

            {/* Back to Step 1 Button */}
            {onNavigateToCandidates && (
              <button
                type="button"
                onClick={handleBackToCandidates}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Chọn lại điểm đen</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alert banner */}
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
          <button
            type="button"
            onClick={() => setAlert(null)}
            className="font-extrabold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Batch Assign Bar (when there are draft spots) */}
      {draftSpots.length > 0 && dayData?.status !== 'CLOSED' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSelectAllDraft}
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer"
            >
              {selectedSpotIdsForAssign.size === draftSpots.length ? (
                <CheckSquare size={17} className="text-blue-600" />
              ) : (
                <Square size={17} className="text-slate-400" />
              )}
              <span>
                {selectedSpotIdsForAssign.size === draftSpots.length
                  ? 'Bỏ chọn tất cả'
                  : 'Chọn tất cả điểm nháp'}
              </span>
            </button>

            <span className="text-slate-300">|</span>

            <span className="text-xs font-semibold text-slate-700">
              Đã chọn: <strong className="text-blue-700">{selectedSpotIdsForAssign.size}</strong>/{draftSpots.length} điểm nháp
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRemoveSelected}
              disabled={selectedSpotIdsForAssign.size === 0 || removingBatch || assigningBatch}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold shadow-sm transition-all ${
                selectedSpotIdsForAssign.size === 0 || removingBatch || assigningBatch
                  ? 'border-slate-200 bg-white text-slate-400 cursor-not-allowed'
                  : 'border-rose-300 bg-white text-rose-600 hover:bg-rose-50 cursor-pointer'
              }`}
              title="Xóa các điểm nháp đã tick khỏi danh sách điều hành hôm nay"
            >
              <Trash2 size={14} />
              <span>{removingBatch ? 'Đang xóa...' : `Xóa khỏi danh sách (${selectedSpotIdsForAssign.size} điểm)`}</span>
            </button>
            <button
              type="button"
              onClick={handleBatchAssign}
              disabled={selectedSpotIdsForAssign.size === 0 || assigningBatch}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-all ${
                selectedSpotIdsForAssign.size === 0 || assigningBatch
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-98 cursor-pointer'
              }`}
            >
              <Send size={14} />
              <span>
                {assigningBatch
                  ? 'Đang chốt & giao việc...'
                  : `Chốt và giao việc (${selectedSpotIdsForAssign.size} điểm)`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Summary Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
        <span className="font-bold text-slate-800">Tổng quan ngày:</span>
        <span className="rounded-lg bg-white border border-slate-200 px-2.5 py-1">
          Tổng số: <strong>{spots.length}</strong> điểm đen
        </span>
        <span className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-amber-800 font-semibold">
          Bản nháp: <strong>{draftSpots.length}</strong>
        </span>
        <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-emerald-800 font-semibold">
          Đã chốt: <strong>{finalizedSpots.length}</strong>
        </span>
        {closedSpots.length > 0 && (
          <span className="rounded-lg bg-slate-100 border border-slate-300 px-2.5 py-1 text-slate-700 font-semibold">
            Đã đóng: <strong>{closedSpots.length}</strong>
          </span>
        )}
      </div>

      {/* Spots List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-[var(--color-vnpost-orange)]" />
            <span className="text-xs font-semibold">Đang tải danh sách điểm đen...</span>
          </div>
        </div>
      ) : spots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Calendar className="h-10 w-10 text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800">Chưa có điểm đen nào cho ngày {selectedDate}</h3>
          <p className="mt-1 max-w-md text-xs text-slate-500">
            Vui lòng chuyển sang bước Chọn điểm đen để lựa chọn điểm đen từ dữ liệu hệ thống hoặc thêm thủ công.
          </p>
          {onNavigateToCandidates && (
            <button
              type="button"
              onClick={onNavigateToCandidates}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-vnpost-orange)] to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-105 cursor-pointer"
            >
              <span>Đi đến Chọn điểm đen →</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {spots.map((spot) => (
            <OpsJournalSpotCard
              key={spot.id}
              spot={spot}
              selectedForAssign={selectedSpotIdsForAssign.has(spot.id)}
              onToggleSelectForAssign={handleToggleSelectForAssign}
              onSaveActions={handleSaveActions}
              savingActionsSpotId={savingActionsSpotIds.has(spot.id) ? spot.id : null}
              onDirtyChange={handleDirtyChange}
              onReopenSpot={handleReopenSpot}
              onRemoveSpot={handleRemoveSpot}
              reopeningSpotId={reopeningSpotId}
              onMarkActionDone={handleMarkActionDone}
              markingDoneActionId={markingDoneActionId}
              assignableUsers={assignableUsers}
              allUsers={allUsers}
              onLoadAllUsers={handleToggleLoadAllUsers}
              showAllUsers={showAllUsers}
              isDayClosed={dayData?.status === 'CLOSED'}
              onSaveClosing={handleSaveClosing}
              savingClosingSpotId={savingClosingSpotId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
