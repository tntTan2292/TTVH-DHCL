import React, { useState } from 'react';
import { RotateCcw, X, AlertCircle } from 'lucide-react';

export default function ReopenSpotModal({ isOpen, onClose, spot, onConfirmReopen, loading = false }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !spot) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do mở lại điểm đen.');
      return;
    }
    setError('');
    onConfirmReopen(spot.id, reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-amber-700">
            <RotateCcw className="h-5 w-5" />
            <h3 className="text-base font-bold text-slate-900">Mở lại điểm đen (Reopen)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-3">
          <p className="text-xs text-slate-600">
            Điểm đen: <strong className="text-slate-900">{spot.title}</strong>
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Lưu ý: Mở lại điểm đen sẽ chuyển trạng thái về <strong>Bản nháp (DRAFT)</strong> để chỉnh sửa các dòng 6-rõ. Các báo cáo đã nộp sẽ được lưu giữ trong nhật ký lịch sử.
          </p>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2 text-xs font-semibold text-rose-700 border border-rose-200">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lý do mở lại <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="Nhập lý do cần điều chỉnh hoặc phân công lại..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Đang mở lại...' : 'Xác nhận mở lại'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

