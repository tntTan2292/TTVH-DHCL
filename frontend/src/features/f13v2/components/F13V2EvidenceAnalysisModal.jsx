import { useState, useEffect, useRef } from 'react';
import { X, Edit3, History, AlertCircle, CheckCircle2, ShieldAlert, Clock, User } from 'lucide-react';
import { fetchEvidenceHistory, postEvidenceAnalysis } from '../api/f13v2Api.js';
import { ANALYST_CAUSES, isNoteMandatory, formatAnalystCause } from '../f13EvidenceHelpers.js';
import { formatCauseLabel, formatPhatDetail } from '../f13WhyHelpers.js';

export default function F13V2EvidenceAnalysisModal({
  item = null,
  catalog = null,
  onClose,
  onSuccess,
}) {
  const modalRef = useRef(null);

  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'history'
  const [selectedCause, setSelectedCause] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // History state
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyError, setHistoryError] = useState('');

  // Initialize form with existing analysis if present
  useEffect(() => {
    if (!item) return;
    const anl = item.analysis;
    if (anl) {
      setSelectedCause(anl.cause || '');
      setNote(anl.note || '');
    } else {
      setSelectedCause(catalog?.causes?.[0]?.code || 'KHONG_TRON_LO');
      setNote('');
    }
    setErrorMessage('');
    setSuccessMessage('');
  }, [item, catalog]);

  // Load history when tab is clicked
  useEffect(() => {
    if (!item || activeTab !== 'history') return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError('');

    fetchEvidenceHistory({ ngay_do_kiem: item.ngay_do_kiem, ma_bg: item.ma_bg })
      .then((res) => {
        if (!cancelled) {
          setHistoryEntries(res?.entries || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setHistoryError(err?.response?.data?.error?.message || err?.message || 'Không thể tải lịch sử phân tích');
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [item, activeTab]);

  // Escape key listener
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const sys = item.system || {};
  const isPhatKhongChiTiet = sys.line === 'PHAT_KHONG_CHI_TIET' || sys.code === 'PHAT_CHUA_RO';
  const isMandatory = isNoteMandatory(selectedCause, sys.line);
  const causesList = catalog?.causes && catalog.causes.length > 0 ? catalog.causes : ANALYST_CAUSES;
  const maxNote = catalog?.note_max || 1000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedCause) {
      setErrorMessage('Vui lòng chọn một nguyên nhân trong danh sách.');
      return;
    }

    if (isMandatory && !note.trim()) {
      setErrorMessage(
        selectedCause === 'KHAC'
          ? 'Chọn "Khác" thì bắt buộc phải nhập ghi chú giải thích.'
          : 'Bưu gửi đã có kết luận hệ thống: Bắt buộc phải ghi lý do khi phân tích (PO Decision V3/V4).'
      );
      return;
    }

    if (note.length > maxNote) {
      setErrorMessage(`Ghi chú tối đa ${maxNote} ký tự (hiện tại: ${note.length}).`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await postEvidenceAnalysis({
        ngay_do_kiem: item.ngay_do_kiem,
        ma_bg: item.ma_bg,
        cause: selectedCause,
        note: note.trim(),
      });
      setSuccessMessage('Đã lưu kết luận phân tích thành công!');
      globalThis.setTimeout(() => {
        onSuccess?.(res);
        onClose?.();
      }, 700);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Gặp lỗi khi lưu phân tích.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ghi nhận Phân tích của Chuyên quản
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {item.ma_bg} • Ngày đo: {item.ngay_do_kiem} • {item.ma_bcvh}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs (Form vs History) */}
        <div className="flex items-center gap-1 px-4 sm:px-5 pt-3 border-b border-slate-100 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'form'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Biểu mẫu phân tích</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Lịch sử ghi nhận</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto text-xs space-y-4">
          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Context Notice: System Conclusion */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[11px] text-slate-500 font-medium">
                  Kết luận hiện thời của Hệ thống:
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {sys.status === 'CHO_CHUYEN_QUAN'
                    ? 'Chờ Chuyên quản phân tích'
                    : formatCauseLabel(sys.code) || sys.label || 'Chưa xác định'}
                  {sys.detail && ` (${formatPhatDetail(sys.detail)})`}
                </div>
                {sys.basis && (
                  <div className="text-[11px] text-slate-600 italic">
                    Căn cứ: {sys.basis}
                  </div>
                )}
              </div>

              {/* B1-R2 Special Warning for PHAT_KHONG_CHI_TIET */}
              {isPhatKhongChiTiet && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong>Lưu ý nghiệp vụ (B1-R2):</strong> Hệ thống ghi nhận &quot;Phát không có chi tiết&quot;. Mọi nguyên nhân Chuyên quản chọn đều được tính là khác hệ thống và bắt buộc phải ghi rõ căn cứ vào ô ghi chú.
                  </div>
                </div>
              )}

              {/* Cause Selection */}
              <div>
                <label htmlFor="cause-select" className="block text-xs font-bold text-slate-800 mb-1.5">
                  Nguyên nhân do Chuyên quản kết luận <span className="text-rose-500">*</span>:
                </label>
                <select
                  id="cause-select"
                  value={selectedCause}
                  onChange={(e) => setSelectedCause(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  {causesList.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Note Textarea with live character counter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="note-textarea" className="text-xs font-bold text-slate-800">
                    Ghi chú chi tiết {isMandatory ? <span className="text-rose-600 font-bold">(Bắt buộc theo V3/V4)</span> : <span className="text-slate-400 font-normal">(Tùy chọn)</span>}:
                  </label>
                  <span className={`text-[11px] font-mono ${note.length > maxNote ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                    {note.length} / {maxNote}
                  </span>
                </div>
                <textarea
                  id="note-textarea"
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    isMandatory
                      ? 'Nhập lý do cụ thể hoặc căn cứ xác định nguyên nhân tại bưu cục...'
                      : 'Nhập ghi chú thêm nếu cần...'
                  }
                  className={`w-full rounded-xl border p-3 text-xs text-slate-800 outline-none transition-colors ${
                    isMandatory && !note.trim()
                      ? 'border-amber-300 bg-amber-50/20 focus:border-amber-500'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
              </div>

              {/* Alert Messages */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="text-xs font-medium">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs font-medium">{successMessage}</span>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu kết luận</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* History Tab */
            <div className="space-y-3">
              <div className="text-[11px] text-slate-500">
                Lịch sử ghi nhận được lưu trữ bất biến (Append-only). Mỗi lần chỉnh sửa được ghi lại thành một bản ghi mới độc lập.
              </div>

              {historyLoading ? (
                <div className="py-8 text-center text-slate-500">
                  <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Đang tải lịch sử...</span>
                </div>
              ) : historyError ? (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                  {historyError}
                </div>
              ) : historyEntries.length === 0 ? (
                <div className="py-8 text-center text-slate-400 italic">
                  Chưa có lượt phân tích nào trước đây cho bưu gửi này.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historyEntries.map((hItem) => (
                    <div
                      key={hItem.id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        hItem.current
                          ? 'border-blue-300 bg-blue-50/30'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {hItem.label || formatAnalystCause(hItem.cause)}
                          </span>
                          {hItem.current && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              Hiện hành
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" />
                          {hItem.at}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        <span>Người ghi:</span>
                        <strong className="text-slate-800">{hItem.by}</strong>
                        {hItem.position && <span>({hItem.position})</span>}
                      </div>

                      {hItem.note && (
                        <div className="p-2 rounded-lg bg-white border border-slate-100 text-slate-700 italic">
                          &quot;{hItem.note}&quot;
                        </div>
                      )}

                      {hItem.system_at_that_time && (
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          Hệ thống tại thời điểm đó: {hItem.system_at_that_time.line || hItem.system_at_that_time.code || 'Chưa có kết luận'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
