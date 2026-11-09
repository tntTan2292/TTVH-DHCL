import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Copy,
  Check,
  CheckCircle,
  XCircle,
  Clock,
  History,
  FileCode,
  Tag,
  AlertTriangle,
  Send,
} from 'lucide-react';
import {
  formatSystemConclusion,
  formatChosenCause,
  formatProposalStatus,
  proposalStatusBadgeClass,
  decisionBadgeClass,
  formatStillRatio,
  formatDateSpan,
  validateDecisionInput,
  formatDecisionTime,
  formatBcvhName,
} from '../f13RuleProposalHelpers.js';
import F13V2ParcelCard from './F13V2ParcelCard.jsx';

export default function F13V2RuleProposalDetailPanel({
  proposal = null,
  detail = null,
  loading = false,
  error = null,
  onClose,
  onSubmitDecision,
  decisionSubmitting = false,
  decisionError = null,
  canDecide = true,
  catalog = null,
  layout = null,
  onAnalysisSuccess,
}) {
  const currentItem = detail || proposal;

  const [copied, setCopied] = useState(false);
  const [decisionType, setDecisionType] = useState(() => (currentItem?.status === 'APPROVED' ? 'APPLIED' : 'APPROVE'));
  const [note, setNote] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [clientValidationError, setClientValidationError] = useState('');
  const [selectedCardParcel, setSelectedCardParcel] = useState(null);

  // After a decision is recorded the detail comes back with a new current decision: clear the form and pick the next sensible action.
  const currentDecisionId = detail?.decision?.id ?? null;
  useEffect(() => {
    setNote('');
    setTicketId('');
    setClientValidationError('');
    setDecisionType(currentItem?.status === 'APPROVED' ? 'APPLIED' : 'APPROVE');
  }, [currentDecisionId, currentItem?.status]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyReadyText = useCallback(() => {
    const text = detail?.ready_text;
    if (!text) return;
    if (globalThis.navigator?.clipboard?.writeText) {
      globalThis.navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        globalThis.setTimeout(() => setCopied(false), 2500);
      });
    }
  }, [detail]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setClientValidationError('');

    const validation = validateDecisionInput({
      decision: decisionType,
      note,
      ticketId,
      currentStatus: currentItem?.status,
    });

    if (!validation.valid) {
      setClientValidationError(validation.error);
      return;
    }

    if (onSubmitDecision) {
      onSubmitDecision({
        decision: decisionType,
        note: note.trim(),
        ticket_id: decisionType === 'APPLIED' ? ticketId.trim() : undefined,
      });
    }
  };

  if (!currentItem) return null;

  const sysText = formatSystemConclusion(currentItem.system);
  const chosenText = formatChosenCause(currentItem.chosen);
  const stillRatioText = formatStillRatio(currentItem.still_system_conclusion, currentItem.parcels);
  const samples = detail?.samples || [];
  const history = detail?.history || [];
  const readyText = detail?.ready_text;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${proposalStatusBadgeClass(
                  currentItem.status
                )}`}
              >
                {formatProposalStatus(currentItem.status)}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 truncate">Chi tiết đề xuất quy tắc</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Proposal Summary Card */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Nội dung chuyển đổi
            </div>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <div className="flex-1 min-w-[200px] p-2.5 bg-white rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Kết luận hệ thống:</div>
                <div className="font-semibold text-gray-900">{sysText}</div>
              </div>
              <div className="text-gray-400 font-bold px-1">→</div>
              <div className="flex-1 min-w-[200px] p-2.5 bg-blue-50/70 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-700 mb-1">Đề xuất Chuyên quản:</div>
                <div className="font-semibold text-blue-950">{chosenText}</div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-200/60 text-xs">
              <div className="p-2 bg-white rounded border border-gray-100">
                <span className="text-gray-500 block">Số bưu gửi:</span>
                <span className="font-bold text-gray-900 text-sm">
                  {Number(currentItem.parcels || 0).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-gray-100">
                <span className="text-gray-500 block">Số BCVH liên quan:</span>
                <span className="font-bold text-gray-900 text-sm">
                  {Number(currentItem.bcvh || 0).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-gray-100">
                <span className="text-gray-500 block">Số người phân tích:</span>
                <span className="font-bold text-gray-900 text-sm">
                  {Number(currentItem.analysts || 0).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-gray-100">
                <span className="text-gray-500 block">Thời gian phát sinh:</span>
                <span className="font-bold text-gray-900 text-xs">
                  {formatDateSpan(currentItem.first_date, currentItem.last_date)}
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-600 bg-white/80 p-2 rounded border border-gray-200 flex items-center justify-between">
              <span>Độ tin cậy hiện tại:</span>
              <span className="font-semibold text-blue-700">{stillRatioText}</span>
            </div>
          </div>

          {/* Ready Text Block (P4: for CTO rule ticket creation) */}
          {readyText && (
            <div className="bg-blue-50/40 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wider">
                  <FileCode className="w-4 h-4 text-blue-600" />
                  <span>Nội dung chuyển thành quy tắc</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyReadyText}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
                </button>
              </div>
              <pre className="p-3 bg-white rounded-lg border border-blue-100 text-xs font-mono text-gray-800 whitespace-pre-wrap overflow-x-auto max-h-48 leading-relaxed">
                {readyText}
              </pre>
            </div>
          )}

          {/* PO Decision Form (Admin only) */}
          {canDecide && (
            <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <Tag className="w-4 h-4 text-gray-700" />
                <h3 className="font-bold text-gray-900 text-sm">Quyết định duyệt</h3>
              </div>

              {(clientValidationError || decisionError) && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{clientValidationError || decisionError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Decision Action Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Hành động quyết định:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDecisionType('APPROVE')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                        decisionType === 'APPROVE'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-gray-50 hover:bg-blue-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Duyệt đề xuất</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisionType('REJECT')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                        decisionType === 'REJECT'
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-gray-50 hover:bg-red-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Không duyệt</span>
                    </button>

                    <button
                      type="button"
                      disabled={currentItem.status !== 'APPROVED'}
                      onClick={() => setDecisionType('APPLIED')}
                      title={
                        currentItem.status !== 'APPROVED'
                          ? 'Chỉ khả dụng khi đề xuất đã được duyệt'
                          : 'Đánh dấu đã chuyển thành quy tắc và triển khai'
                      }
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                        decisionType === 'APPLIED'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : currentItem.status === 'APPROVED'
                          ? 'bg-gray-50 hover:bg-emerald-50 text-gray-700 border-gray-200'
                          : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã áp dụng</span>
                    </button>
                  </div>
                </div>

                {/* Ticket ID input when APPLIED */}
                {decisionType === 'APPLIED' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Mã phiếu quy tắc (ticket id) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={ticketId}
                      onChange={(e) => setTicketId(e.target.value)}
                      placeholder="Ví dụ: F13-WHY-DATA-03"
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                )}

                {/* Note textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Ghi chú quyết định {decisionType !== 'APPLIED' && <span className="text-red-500">* (bắt buộc)</span>}
                    </label>
                    <span className="text-[11px] text-gray-400">{note.length}/1000</span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={
                      decisionType === 'APPROVE'
                        ? 'Lý do đồng ý duyệt đề xuất chuyển thành quy tắc...'
                        : decisionType === 'REJECT'
                        ? 'Lý do không chấp thuận đề xuất...'
                        : 'Ghi chú về việc triển khai quy tắc (tùy chọn)...'
                    }
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={decisionSubmitting}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow transition-colors ${
                      decisionType === 'APPROVE'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : decisionType === 'REJECT'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    } ${decisionSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{decisionSubmitting ? 'Đang lưu...' : 'Ghi nhận quyết định'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sample Parcels Table */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <h3 className="font-bold text-gray-900 text-sm">
                  Danh sách mẫu bưu gửi ({samples.length} mẫu)
                </h3>
              </div>
              <span className="text-[11px] text-gray-400">Tối đa 20 mẫu gần nhất</span>
            </div>

            {loading && samples.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">Đang tải mẫu...</div>
            ) : samples.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">Không có mẫu nào.</div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 text-[11px] uppercase font-semibold text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="py-2 px-3">Ngày</th>
                      <th className="py-2 px-3">Mã bưu gửi</th>
                      <th className="py-2 px-2 text-center">BCVH</th>
                      <th className="py-2 px-3">Người phân tích</th>
                      <th className="py-2 px-2 text-center">Giữ KL HT</th>
                      <th className="py-2 px-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {samples.map((sample, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono text-gray-700 whitespace-nowrap">
                          {sample.ngay_do_kiem}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedCardParcel({ ngay_do_kiem: sample.ngay_do_kiem, ma_bg: sample.ma_bg, ma_bcvh: sample.ma_bcvh })}
                            className="font-mono font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                            title="Xem phiếu bưu gửi"
                          >
                            {sample.ma_bg}
                          </button>
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-gray-600">
                          {formatBcvhName(sample.ma_bcvh)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="text-gray-800 font-medium">{sample.by || 'Chuyên quản'}</div>
                          <div className="text-[10px] text-gray-400">{formatDecisionTime(sample.at)}</div>
                        </td>
                        <td className="py-2 px-2 text-center">
                          {sample.still_system_conclusion ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Đúng
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                              Đã đổi
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-700 max-w-[200px] truncate" title={sample.note || ''}>
                          {sample.note || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Decision History */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-600" />
              <h3 className="font-bold text-gray-900 text-sm">Lịch sử quyết định</h3>
            </div>

            {history.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-400">
                Chưa có quyết định nào cho đề xuất này.
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((h, idx) => (
                  <div
                    key={h.id || idx}
                    className="p-3 bg-gray-50/70 border border-gray-200 rounded-lg text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${decisionBadgeClass(
                            h.decision
                          )}`}
                        >
                          {h.decision === 'APPROVE'
                            ? 'Đã duyệt'
                            : h.decision === 'REJECT'
                            ? 'Không duyệt'
                            : 'Đã áp dụng'}
                        </span>
                        {h.ticket_id && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10px]">
                            Phiếu: {h.ticket_id}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400 text-[11px]">{formatDecisionTime(h.at)}</span>
                    </div>

                    <div className="text-gray-800 font-medium">
                      Bởi: <span className="font-semibold text-gray-900">{h.by || 'PO'}</span>
                    </div>

                    {h.note && (
                      <div className="p-2 bg-white rounded border border-gray-200 text-gray-700 italic">
                        "{h.note}"
                      </div>
                    )}

                    {h.snapshot && (
                      <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200/60 flex flex-wrap gap-x-3">
                        <span>Bưu gửi tại thời điểm: <b>{h.snapshot.parcels}</b></span>
                        <span>BCVH: <b>{h.snapshot.bcvh}</b></span>
                        <span>Người PT: <b>{h.snapshot.analysts}</b></span>
                        <span>
                          {formatStillRatio(h.snapshot.still_system_conclusion, h.snapshot.parcels)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* F13-PARCEL-CARD-01: Shared parcel card */}
      {selectedCardParcel && (
        <F13V2ParcelCard
          parcelKey={selectedCardParcel}
          catalog={catalog}
          layout={layout}
          onClose={() => setSelectedCardParcel(null)}
          onAnalysisSuccess={() => {
            onAnalysisSuccess?.();
          }}
        />
      )}
    </div>
  );
}
