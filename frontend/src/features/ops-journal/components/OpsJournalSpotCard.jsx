import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  Lock,
  Printer,
  Download,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { getIndicatorChipStyle, generatePl06FileName } from '../opsJournalHelpers.js';
import opsJournalAdapter from '../api/opsJournalApi.js';
import SpotMetricsSummary from './SpotMetricsSummary.jsx';
import SpotActionEditor from './SpotActionEditor.jsx';
import SpotActionReadOnlyTable from './SpotActionReadOnlyTable.jsx';
import ReopenSpotModal from './ReopenSpotModal.jsx';
import SpotClosingForm from './SpotClosingForm.jsx';
import Pl06PrintPreviewModal from './Pl06PrintPreviewModal.jsx';

export default function OpsJournalSpotCard({
  spot,
  selectedForAssign = false,
  onToggleSelectForAssign,
  onSaveActions,
  savingActionsSpotId = null,
  onDirtyChange,
  onReopenSpot,
  onRemoveSpot,
  reopeningSpotId = null,
  onMarkActionDone,
  onMarkSpotDone,
  markingSpotDone = false,
  markingDoneActionId = null,
  assignableUsers = [],
  allUsers = [],
  isDayClosed = false,
  onSaveClosing,
  savingClosingSpotId = null,
}) {
  const [actions, setActions] = useState(spot.actions || []);
  const [isDirty, setIsDirty] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null);
  const [cardAlert, setCardAlert] = useState(null);

  // Per-spot assignable users (Item 13)
  const [spotAssignableUsers, setSpotAssignableUsers] = useState(assignableUsers || []);
  const [spotAllUsers, setSpotAllUsers] = useState(allUsers || []);
  const [showAllUsersLocal, setShowAllUsersLocal] = useState(false);

  // Fetch assignable users filtered by spot.officeCode and spot.indicator
  React.useEffect(() => {
    let isMounted = true;
    opsJournalAdapter
      .getAssignableUsers({
        officeCode: spot.officeCode,
        indicator: spot.indicator,
      })
      .then((res) => {
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setSpotAssignableUsers(res.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [spot.officeCode, spot.indicator]);

  const handleToggleLoadAllUsersLocal = async () => {
    if (spotAllUsers.length === 0) {
      const res = await opsJournalAdapter.getAssignableUsers({ all: 1 });
      if (res?.success && Array.isArray(res.data)) {
        setSpotAllUsers(res.data);
      }
    }
    setShowAllUsersLocal((prev) => !prev);
  };

  // Sync actions if spot changes externally, but DO NOT overwrite if card is currently dirty (Item 3)
  React.useEffect(() => {
    if (!isDirty) {
      setActions(spot.actions || []);
    }
  }, [spot.actions, isDirty]);

  const handleActionsChange = (nextActions) => {
    setActions(nextActions);
    setIsDirty(true);
    onDirtyChange?.(spot.id, true);
  };

  const handleSaveActionsLocal = async (spotId, currentActions) => {
    const success = await onSaveActions(spotId, currentActions);
    if (success) {
      setIsDirty(false);
      onDirtyChange?.(spot.id, false);
    }
    return success;
  };

  const chip = getIndicatorChipStyle(spot.indicator);
  const isDraft = spot.status === 'DRAFT';
  const isFinalized = spot.status === 'FINALIZED';
  const isClosed = spot.status === 'CLOSED' || isDayClosed;
  const isPair = spot.scopeType === 'PAIR';

  const handleConfirmReopen = async (spotId, reason) => {
    const ok = await onReopenSpot(spotId, reason);
    if (ok) {
      setIsReopenModalOpen(false);
    }
  };

  const handleExport = async (spotId, format) => {
    if (isDraft) {
      setCardAlert({
        type: 'error',
        message: 'Chỉ có thể xuất file khi điểm đen đã được chốt và giao việc.',
      });
      return;
    }

    setExportingFormat(format);
    setCardAlert(null);

    try {
      const res = await opsJournalAdapter.exportSpot(spotId, format);
      if (res.success && res.data) {
        // Trigger file download using filename from Content-Disposition or fallback (Item 9)
        const downloadName = res.filename || generatePl06FileName(spot, format);
        const blobUrl = globalThis.URL.createObjectURL(res.data);
        const link = globalThis.document.createElement('a');
        link.href = blobUrl;
        link.download = downloadName;
        globalThis.document.body.appendChild(link);
        link.click();
        globalThis.document.body.removeChild(link);
        globalThis.URL.revokeObjectURL(blobUrl);

        setCardAlert({
          type: 'success',
          message: `Đã tải xuống file ${format.toUpperCase()}: ${downloadName}`,
        });
      } else {
        setCardAlert({
          type: 'error',
          message: res.error?.message || `Không thể xuất file ${format.toUpperCase()}.`,
        });
      }
    } catch (err) {
      setCardAlert({
        type: 'error',
        message: err.message || `Lỗi khi xuất file ${format.toUpperCase()}.`,
      });
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isDraft
          ? isDirty
            ? 'border-amber-300 bg-white shadow-md ring-2 ring-amber-300/40'
            : 'border-slate-200 bg-white shadow-xs'
          : isFinalized
          ? 'border-emerald-200 bg-white shadow-xs'
          : 'border-slate-200 bg-slate-50/70 shadow-2xs opacity-95'
      }`}
    >
      {/* Spot Card Header */}
      <div className="border-b border-slate-100 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Indicator Chip, Title, Scope, Checkbox */}
          <div className="flex items-start gap-3">
            {isDraft && !isDayClosed && (
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  checked={selectedForAssign}
                  onChange={() => onToggleSelectForAssign(spot.id)}
                  aria-label={`Chọn điểm đen ${spot.title} để chốt và giao việc`}
                  className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {/* Indicator chip */}
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-bold border ${chip.badgeClass}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${chip.dotClass}`} />
                  {chip.label}
                </span>

                {/* Scope type badge */}
                {isPair ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-0.5 text-[10px] font-extrabold text-cyan-800 border border-cyan-200">
                    <Layers size={10} />
                    Cặp: {spot.scopeKey}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                    <MapPin size={10} />
                    Mã: {spot.officeCode || spot.scopeKey}
                  </span>
                )}

                {/* Source badge */}
                {spot.source === 'MANUAL' && (
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                    Thủ công
                  </span>
                )}

                {/* Dirty badge (Item 3) */}
                {isDirty && (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300">
                    ● Có thay đổi chưa lưu
                  </span>
                )}

                {/* Status Badge */}
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                    isDraft
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : isFinalized
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {isDraft && <Clock size={11} />}
                  {isFinalized && <CheckCircle2 size={11} />}
                  {isClosed && <Lock size={11} />}
                  <span>
                    {isDraft ? 'Bản nháp' : isFinalized ? 'Đã chốt & Giao việc' : 'Đã đóng ngày'}
                  </span>
                </span>
              </div>

              {/* Title & Headline */}
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                {spot.title}
              </h3>
              {spot.headline && (
                <p className="mt-1 text-xs text-slate-600 font-medium italic">
                  "{spot.headline}"
                </p>
              )}

              {/* Metrics pill summary */}
              <div className="mt-2.5">
                <SpotMetricsSummary metrics={spot.metrics} indicator={spot.indicator} />
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start pt-1">
            {/* Remove from the day's list: only a draft that was never finalized and holds no report */}
            {isDraft && !isClosed && !isDayClosed && !spot.protected && onRemoveSpot && (
              <button
                type="button"
                onClick={() => {
                  if (globalThis.confirm?.(`Xóa điểm đen "${spot.title}" khỏi danh sách hôm nay?`)) onRemoveSpot(spot.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 shadow-2xs transition-colors cursor-pointer"
                title="Xóa điểm đen này khỏi danh sách hôm nay"
              >
                <Trash2 size={13} />
                <span>Xóa khỏi danh sách</span>
              </button>
            )}

            {/* Accept every reported row of the spot at once (the team sends ONE report) */}
            {isFinalized && !isClosed && onMarkSpotDone && (spot.actions || []).some((a) => a.status === 'REPORTED') && (
              <button
                type="button"
                onClick={() => onMarkSpotDone(spot.id)}
                disabled={markingSpotDone}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                title="Xác nhận hoàn thành mọi dòng đã có báo cáo của điểm đen này"
              >
                <CheckCircle2 size={13} />
                <span>{markingSpotDone ? 'Đang xác nhận...' : `Xác nhận hoàn thành tất cả (${(spot.actions || []).filter((a) => a.status === 'REPORTED').length} dòng)`}</span>
              </button>
            )}

            {/* Reopen button for Finalized spots */}
            {isFinalized && !isClosed && (
              <button
                type="button"
                onClick={() => setIsReopenModalOpen(true)}
                disabled={reopeningSpotId === spot.id}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                title="Mở lại điểm đen về trạng thái Bản nháp để sửa đổi hành động 6 rõ"
              >
                <RotateCcw size={13} className={reopeningSpotId === spot.id ? 'animate-spin' : ''} />
                <span>Mở lại</span>
              </button>
            )}

            {/* Print & Export Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                disabled={isDraft}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-bold shadow-2xs transition-colors cursor-pointer ${
                  isDraft
                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                title={isDraft ? 'Chỉ bật khi điểm đen đã được chốt và giao việc' : 'Xem bản in theo mẫu PL06'}
              >
                <Printer size={12} />
                <span>Xem bản in</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport(spot.id, 'docx')}
                disabled={isDraft || exportingFormat === 'docx'}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-bold shadow-2xs transition-colors cursor-pointer ${
                  isDraft
                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                    : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
                title={isDraft ? 'Chỉ bật khi điểm đen đã được chốt và giao việc' : 'Tải file Word .docx'}
              >
                <Download size={12} />
                <span>{exportingFormat === 'docx' ? 'Đang tạo...' : 'Tải Word'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport(spot.id, 'pdf')}
                disabled={isDraft || exportingFormat === 'pdf'}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-bold shadow-2xs transition-colors cursor-pointer ${
                  isDraft
                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                    : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
                title={isDraft ? 'Chỉ bật khi điểm đen đã được chốt và giao việc' : 'Tải file PDF'}
              >
                <Download size={12} />
                <span>{exportingFormat === 'pdf' ? 'Đang tạo...' : 'Tải PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card Alert Banner */}
      {cardAlert && (
        <div
          role="alert"
          className={`mx-4 mt-3 flex items-center justify-between rounded-xl border p-2.5 text-xs font-bold ${
            cardAlert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {cardAlert.type === 'success' ? (
              <CheckCircle2 size={14} className="text-emerald-600" />
            ) : (
              <AlertCircle size={14} className="text-rose-600" />
            )}
            <span>{cardAlert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setCardAlert(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Spot Card Body: 6-rõ Table */}
      <div className="p-4 sm:p-5">
        {isDraft ? (
          <>
            {/* The system drafted the rows: press Chốt to get the Word / PDF; edit the file after downloading it */}
            <SpotActionReadOnlyTable
              spot={spot}
              actions={spot.actions || []}
              assignableUsers={spotAssignableUsers}
              isClosed
            />
            <details className="mt-3 text-xs" open={isDirty}>
              <summary className="cursor-pointer select-none font-semibold text-blue-700 hover:underline">
                Sửa các dòng ngay trong hệ thống (không bắt buộc - có thể tải Word về sửa)
              </summary>
              <div className="mt-3">
                <SpotActionEditor
                  spot={spot}
                  actions={actions}
                  onChangeActions={handleActionsChange}
                  assignableUsers={spotAssignableUsers}
                  allUsers={spotAllUsers}
                  onLoadAllUsers={handleToggleLoadAllUsersLocal}
                  showAllUsers={showAllUsersLocal}
                  onSaveActions={handleSaveActionsLocal}
                  saving={savingActionsSpotId === spot.id}
                />
              </div>
            </details>
          </>
        ) : (
          <SpotActionReadOnlyTable
            spot={spot}
            actions={spot.actions || []}
            assignableUsers={spotAssignableUsers}
            onMarkDone={onMarkActionDone}
            markingDoneActionId={markingDoneActionId}
            isClosed={isClosed}
          />
        )}

        {/* Sections 3-4 of the PL06 as the system drafted them: visible from the draft stage so the manager sees what will be printed */}
        {(() => {
          const c = spot.closing || spot.closingDraft;
          if (!c) return null;
          const mark = (on) => (on ? '☒' : '☐');
          return (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-700" data-testid="closing-preview">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Kết quả cuối ngày và bài học rút ra {spot.closing ? '(đã lưu)' : '(hệ thống soạn sẵn - có trong file Word)'}
              </p>
              <p>
                <span className="font-semibold">Sự cố đã giải quyết?</span> {mark(c.resolved === true)} Rồi &nbsp;{mark(c.resolved === false)} Chưa
                &nbsp;•&nbsp;<span className="font-semibold">Thời gian xử lý:</span> {c.handlingTimeText}
                &nbsp;•&nbsp;<span className="font-semibold">Đã phục hồi bình thường?</span> {mark(c.recovered === true)} Rồi &nbsp;{mark(c.recovered === false)} Chưa, đang theo dõi
              </p>
              <p className="mt-1.5"><span className="font-semibold">Bài học rút ra:</span> {c.lesson}</p>
              <p className="mt-1.5">
                <span className="font-semibold">Quy trình cần cập nhật?</span> {mark(!c.processUpdate)} Không &nbsp;{mark(Boolean(c.processUpdate))} Có{c.processUpdate ? `: ${c.processUpdate}` : ''}
                &nbsp;•&nbsp;<span className="font-semibold">Giờ hoàn thành:</span> {String(c.doneTime || '').replace(':', 'h')}
              </p>
            </div>
          );
        })()}

        {/* Phase B3: End-of-day closing form for Finalized or Closed spots */}
        {(isFinalized || isClosed) && (
          <details className="mt-3 pt-1 text-xs" open={Boolean(spot.closing)}>
            <summary className="cursor-pointer select-none font-semibold text-blue-700 hover:underline">
              Sửa kết quả cuối ngày và bài học trong hệ thống (không bắt buộc)
            </summary>
            <div className="mt-4">
              <SpotClosingForm
                spot={spot}
                closing={spot.closing}
                draft={spot.closingDraft}
                onSaveClosing={onSaveClosing}
                saving={savingClosingSpotId === spot.id}
                isClosed={isClosed}
              />
            </div>
          </details>
        )}
      </div>

      {/* Reopen Modal */}
      <ReopenSpotModal
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
        spot={spot}
        onConfirmReopen={handleConfirmReopen}
        loading={reopeningSpotId === spot.id}
      />

      {/* PL06 Print Preview Modal */}
      <Pl06PrintPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        spot={spot}
        onExport={handleExport}
        exportingFormat={exportingFormat}
      />
    </div>
  );
}
