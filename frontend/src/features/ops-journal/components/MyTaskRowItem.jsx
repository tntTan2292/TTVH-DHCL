import React, { useState } from 'react';
import { Clock, Send, PlayCircle, CheckCircle2, AlertCircle, Paperclip, X } from 'lucide-react';
import { isRowLocked, validateReportInput, formatFileSize, ATTACHMENT_ACCEPT, ATTACHMENT_MAX_BYTES } from '../opsJournalHelpers.js';
import opsJournalAdapter from '../api/opsJournalApi.js';
import AttachmentList from './AttachmentList.jsx';

export default function MyTaskRowItem({
  row,
  onReport,
  onChanged,
  reporting = false,
  hideReportForm = false, // the spot has ONE shared report form (SpotReportForm); the row only shows its content and status
}) {
  const [causeText, setCauseText] = useState(row.reportCause || '');
  const [reportText, setReportText] = useState(row.reportText || '');
  const [localError, setLocalError] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const handlePick = (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    const tooBig = picked.find((f) => f.size > ATTACHMENT_MAX_BYTES);
    if (tooBig) {
      setLocalError(`Tệp "${tooBig.name}" quá lớn (tối đa 15 MB).`);
      return;
    }
    setLocalError('');
    setPendingFiles((prev) => [...prev, ...picked].slice(0, 10));
  };

  const locked = isRowLocked(row.status);
  const isReported = row.status === 'REPORTED';
  const isInProgress = row.status === 'IN_PROGRESS';

  const handleActionClick = async (targetStatus) => {
    setLocalError('');

    const validation = validateReportInput({
      status: targetStatus,
      reportText: reportText.trim(),
    });

    if (!validation.valid) {
      setLocalError(validation.message);
      return;
    }

    // evidence first, so the notification of the report can say how many files came with it
    if (pendingFiles.length) {
      setUploading(true);
      try {
        for (const file of pendingFiles) {
          const res = await opsJournalAdapter.uploadAttachment(row.id, file);
          if (!res.success) {
            setLocalError(`Không đính kèm được "${file.name}": ${res.error?.message || 'lỗi không xác định'}. Báo cáo chưa được gửi.`);
            return;
          }
        }
        setPendingFiles([]);
      } finally {
        setUploading(false);
      }
    }

    onReport(row.id, {
      status: targetStatus,
      causeText: causeText.trim(),
      reportText: reportText.trim(),
    });
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        locked
          ? 'border-emerald-200 bg-emerald-50/20'
          : isReported
          ? 'border-blue-200 bg-blue-50/15'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Row Header: Action details */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">{row.what}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {row.whoText && (
              <span>
                <strong className="text-slate-700">Người thực hiện:</strong> {row.whoText}
              </span>
            )}
            {row.where && (
              <span>
                <strong className="text-slate-700">Ở đâu:</strong> {row.where}
              </span>
            )}
            {row.due && (
              <span>
                <strong className="text-slate-700">Thời hạn:</strong> {row.due}
              </span>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0 self-start">
          {locked ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
              <CheckCircle2 size={13} />
              Đã hoàn thành (DONE)
            </span>
          ) : isReported ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 border border-blue-300">
              <CheckCircle2 size={13} />
              Đã gửi báo cáo
            </span>
          ) : isInProgress ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-300">
              <Clock size={13} />
              Đang xử lý
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-300">
              Đã giao việc
            </span>
          )}
        </div>
      </div>

      {/* Row Methods and Expected Result */}
      {(row.how || row.expectedResult) && (
        <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2 bg-slate-50/70 rounded-lg p-2.5">
          {row.how && (
            <div>
              <span className="font-bold text-slate-700">Bằng cách nào: </span>
              <span>{row.how}</span>
            </div>
          )}
          {row.expectedResult && (
            <div>
              <span className="font-bold text-slate-700">Kết quả gì: </span>
              <span>{row.expectedResult}</span>
            </div>
          )}
        </div>
      )}

      {/* Shared reports banner if present */}
      {row.reportedAt && !hideReportForm && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-blue-50/80 px-3 py-1.5 text-[11px] text-blue-800 border border-blue-200">
          <span>
            Báo cáo cập nhật lúc:{' '}
            <strong>{new Date(row.reportedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</strong>
          </span>
          {row.whoText && <span className="italic">Nhóm thực hiện: {row.whoText}</span>}
        </div>
      )}

      {/* Evidence already attached to this row (shared with the other people on the row) */}
      {!hideReportForm && <AttachmentList
        attachments={row.attachments || []}
        canRemove={() => !locked}
        onRemoved={() => onChanged && onChanged()}
      />}

      {hideReportForm ? null : (<>
      {/* Validation Error Banner */}
      {localError && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs font-bold text-rose-800">
          <AlertCircle size={14} className="shrink-0 text-rose-600" />
          <span>{localError}</span>
        </div>
      )}

      {/* Form Fields */}
      <div className="mt-3 space-y-3">
        {/* Nguyên nhân */}
        <div>
          <label htmlFor={`cause_${row.id}`} className="block text-xs font-bold text-slate-700 mb-1">
            Nguyên nhân phát sinh
          </label>
          <input
            id={`cause_${row.id}`}
            type="text"
            placeholder="Nêu nguyên nhân bưu gửi trễ, lỗi quy trình, thời tiết..."
            value={causeText}
            onChange={(e) => setCauseText(e.target.value)}
            disabled={locked}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-600"
          />
        </div>

        {/* Nội dung báo cáo */}
        <div>
          <label htmlFor={`report_${row.id}`} className="block text-xs font-bold text-slate-700 mb-1">
            Nội dung báo cáo kết quả xử lý <span className="text-slate-400 font-normal">(bắt buộc khi gửi báo cáo)</span>
          </label>
          <textarea
            id={`report_${row.id}`}
            rows={2}
            placeholder="Ghi rõ hành động đã thực hiện, kết quả khắc phục cụ thể..."
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            disabled={locked}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-600"
          />
        </div>

        {/* Evidence files: Excel data, scanned minutes ... sent together with the report */}
        {!locked && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                id={`files_${row.id}`}
                type="file"
                multiple
                accept={ATTACHMENT_ACCEPT}
                onChange={handlePick}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Paperclip size={13} />
                <span>Đính kèm file minh chứng</span>
              </button>
              <span className="text-[11px] text-slate-400">Excel, PDF/ảnh scan biên bản, Word (tối đa 15 MB/tệp)</span>
            </div>
            {pendingFiles.length > 0 && (
              <ul className="mt-2 space-y-1" data-testid="pending-files">
                {pendingFiles.map((file, index) => (
                  <li key={`${file.name}_${index}`} className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/60 px-2 py-1 text-[11px]">
                    <Paperclip size={12} className="shrink-0 text-blue-600" />
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{file.name}</span>
                    <span className="shrink-0 text-slate-500">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
                      className="shrink-0 rounded p-0.5 text-rose-500 hover:bg-rose-50 cursor-pointer"
                      aria-label={`Bỏ tệp ${file.name}`}
                    >
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!locked && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {/* Nút Đang xử lý */}
            <button
              type="button"
              onClick={() => handleActionClick('IN_PROGRESS')}
              disabled={reporting || uploading}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50 ${
                isInProgress
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              title="Cập nhật trạng thái đang xử lý"
            >
              <PlayCircle size={14} className={isInProgress ? 'text-amber-600' : 'text-slate-500'} />
              <span>Đang xử lý</span>
            </button>

            {/* Nút Gửi báo cáo */}
            <button
              type="button"
              onClick={() => handleActionClick('REPORTED')}
              disabled={reporting || uploading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              title="Gửi báo cáo kết quả hoàn thành dòng công việc"
            >
              <Send size={13} />
              <span>{uploading ? 'Đang tải tệp...' : (reporting ? 'Đang gửi...' : 'Gửi báo cáo')}</span>
            </button>
          </div>
        )}
      </div>
      </>)}
    </div>
  );
}
