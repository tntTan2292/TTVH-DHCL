import React, { useState } from 'react';
import { Clock, Send, PlayCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { isRowLocked, validateReportInput } from '../opsJournalHelpers.js';

export default function MyTaskRowItem({
  row,
  onReport,
  reporting = false,
}) {
  const [causeText, setCauseText] = useState(row.reportCause || '');
  const [reportText, setReportText] = useState(row.reportText || '');
  const [localError, setLocalError] = useState('');

  const locked = isRowLocked(row.status);
  const isReported = row.status === 'REPORTED';
  const isInProgress = row.status === 'IN_PROGRESS';

  const handleActionClick = (targetStatus) => {
    setLocalError('');

    const validation = validateReportInput({
      status: targetStatus,
      reportText: reportText.trim(),
    });

    if (!validation.valid) {
      setLocalError(validation.message);
      return;
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
      {row.reportedAt && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-blue-50/80 px-3 py-1.5 text-[11px] text-blue-800 border border-blue-200">
          <span>
            Báo cáo cập nhật lúc:{' '}
            <strong>{new Date(row.reportedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</strong>
          </span>
          {row.whoText && <span className="italic">Nhóm thực hiện: {row.whoText}</span>}
        </div>
      )}

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

        {/* Action Buttons */}
        {!locked && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {/* Nút Đang xử lý */}
            <button
              type="button"
              onClick={() => handleActionClick('IN_PROGRESS')}
              disabled={reporting}
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
              disabled={reporting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              title="Gửi báo cáo kết quả hoàn thành dòng công việc"
            >
              <Send size={13} />
              <span>{reporting ? 'Đang gửi...' : 'Gửi báo cáo'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
