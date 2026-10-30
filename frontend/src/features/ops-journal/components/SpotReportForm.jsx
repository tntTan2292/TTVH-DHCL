import React, { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Paperclip, PlayCircle, Send, X, Users } from 'lucide-react';
import opsJournalAdapter from '../api/opsJournalApi.js';
import { ATTACHMENT_ACCEPT, ATTACHMENT_MAX_BYTES, formatFileSize, validateReportInput } from '../opsJournalHelpers.js';
import AttachmentList from './AttachmentList.jsx';
import { useAuth } from '../../../auth/AuthContext.jsx';

/**
 * ONE report for the whole spot (PO 2026-10-30): the Giám đốc BCVH and the Chuyên quản agree on the content and one of them reports to
 * the leader. The report lands on every row of the spot; the evidence files travel with it. Rows already accepted are left alone.
 */
export default function SpotReportForm({ task, onReport, onChanged, reporting = false }) {
  const { user } = useAuth();
  const rows = useMemo(() => task.myRows || [], [task.myRows]);
  const openRows = rows.filter((r) => r.status !== 'DONE');
  const allDone = rows.length > 0 && openRows.length === 0;
  // the report on screen is the latest one on any row (the teammate's report too: it is shared)
  const latest = useMemo(() => [...rows].filter((r) => r.reportedAt).sort((a, b) => b.reportedAt - a.reportedAt)[0] || null, [rows]);
  const files = useMemo(() => {
    const seen = new Set();
    return rows.flatMap((r) => r.attachments || []).filter((f) => (seen.has(f.id) ? false : seen.add(f.id)));
  }, [rows]);

  const [causeText, setCauseText] = useState(latest?.reportCause || '');
  const [reportText, setReportText] = useState(latest?.reportText || '');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState('');
  const fileInput = useRef(null);

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

  const send = async (status) => {
    setLocalError('');
    const check = validateReportInput({ status, reportText: reportText.trim() });
    if (!check.valid) {
      setLocalError(check.message);
      return;
    }
    // files first (they hang on the first open row of the spot), so the notification can say how many came with the report
    if (pendingFiles.length && openRows[0]) {
      setUploading(true);
      try {
        for (const file of pendingFiles) {
          const res = await opsJournalAdapter.uploadAttachment(openRows[0].id, file);
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
    onReport(task.spotId, { status, causeText: causeText.trim(), reportText: reportText.trim() });
  };

  if (allDone) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs font-bold text-emerald-800">
        <CheckCircle2 size={15} />
        Mọi dòng của điểm đen này đã được Giám đốc TTVH xác nhận hoàn thành.
        {files.length > 0 && <div className="ml-auto w-72 font-normal"><AttachmentList attachments={files} compact /></div>}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-blue-200 bg-blue-50/30 p-4" data-testid="spot-report-form">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Báo cáo chung cho điểm đen</h4>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <Users size={12} />Giám đốc BCVH và Chuyên quản thống nhất nội dung, chỉ cần một người báo cáo cho lãnh đạo
        </span>
      </div>

      {latest && (
        <div className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-[11px] text-blue-900">
          <strong>{latest.reportedByName || 'Một người trong nhóm'}</strong> đã {latest.status === 'IN_PROGRESS' ? 'cập nhật tiến độ' : 'báo cáo'} lúc{' '}
          <strong>{new Date(latest.reportedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</strong>. Bạn có thể gửi lại để bổ sung hoặc sửa.
        </div>
      )}

      {localError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-800">
          <AlertCircle size={14} className="shrink-0 text-rose-600" />
          <span>{localError}</span>
        </div>
      )}

      <div>
        <label htmlFor={`spot_cause_${task.spotId}`} className="mb-1 block text-xs font-bold text-slate-700">Nguyên nhân phát sinh</label>
        <input
          id={`spot_cause_${task.spotId}`}
          type="text"
          placeholder="Nêu nguyên nhân bưu gửi trễ, lỗi quy trình, thời tiết..."
          value={causeText}
          onChange={(e) => setCauseText(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor={`spot_report_${task.spotId}`} className="mb-1 block text-xs font-bold text-slate-700">
          Nội dung báo cáo kết quả xử lý <span className="font-normal text-slate-400">(bắt buộc khi gửi báo cáo)</span>
        </label>
        <textarea
          id={`spot_report_${task.spotId}`}
          rows={3}
          placeholder="Ghi rõ hành động đã thực hiện, kết quả khắc phục cụ thể..."
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <AttachmentList attachments={files} canRemove={(file) => file.uploadedBy === user?.id} onRemoved={() => onChanged && onChanged()} />

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInput} type="file" multiple accept={ATTACHMENT_ACCEPT} onChange={handlePick} className="hidden" />
          <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
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
                <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== index))} className="shrink-0 rounded p-0.5 text-rose-500 hover:bg-rose-50 cursor-pointer" aria-label={`Bỏ tệp ${file.name}`}>
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <button type="button" onClick={() => send('IN_PROGRESS')} disabled={reporting || uploading} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer disabled:opacity-50" title="Cập nhật trạng thái đang xử lý cho cả điểm đen">
          <PlayCircle size={14} className="text-slate-500" />
          <span>Đang xử lý</span>
        </button>
        <button type="button" onClick={() => send('REPORTED')} disabled={reporting || uploading} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 cursor-pointer disabled:opacity-50" title="Gửi báo cáo cho lãnh đạo về cả điểm đen">
          <Send size={13} />
          <span>{uploading ? 'Đang tải tệp...' : (reporting ? 'Đang gửi...' : 'Gửi báo cáo')}</span>
        </button>
      </div>
    </div>
  );
}
