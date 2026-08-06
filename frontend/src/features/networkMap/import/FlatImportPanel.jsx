import { useRef, useState } from 'react';

const CLASSIFICATION_LABEL = {
  added: 'Thêm mới', changed: 'Thay đổi', unchanged: 'Không đổi', duplicate: 'Trùng', error: 'Lỗi',
};
const CLASSIFICATION_COLOR = {
  added: 'text-green-700 bg-green-50', changed: 'text-blue-700 bg-blue-50', unchanged: 'text-gray-500 bg-gray-50',
  duplicate: 'text-amber-700 bg-amber-50', error: 'text-red-700 bg-red-50',
};

/**
 * Shared Import UI for the two "flat row" modules (Mạng điểm phục vụ,
 * Sơ đồ tuyến phát): file picker -> Preview classification table -> Confirm.
 * ĐTC2 has its own panel (per-route selection instead of per-row).
 */
export default function FlatImportPanel({ onPreview, onConfirm, rowKeyField, rowLabel }) {
  const fileInputRef = useRef(null);
  const [previewData, setPreviewData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [confirmResult, setConfirmResult] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('previewing');
    setError(null);
    setConfirmResult(null);
    try {
      const response = await onPreview(file);
      setPreviewData(response.data);
      setStatus('previewed');
    } catch (err) {
      setError(err?.message || 'Không thể đọc file.');
      setStatus('idle');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    setStatus('confirming');
    setError(null);
    try {
      const response = await onConfirm(previewData.session_token);
      setConfirmResult(response.data);
      setStatus('confirmed');
      setPreviewData(null);
    } catch (err) {
      setError(err?.message || 'Confirm thất bại.');
      setStatus('previewed');
    }
  };

  const rows = previewData?.rows || [];

  return (
    <div className="text-xs">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={status === 'previewing' || status === 'confirming'}
          className="px-3 py-1.5 bg-vnpost-blue text-white rounded-lg disabled:opacity-50"
        >
          Chọn file Excel để Import
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
        {status === 'previewing' && <span className="text-gray-500">Đang đọc file...</span>}
      </div>

      {error && <p className="text-red-600 mb-2">{error}</p>}
      {confirmResult && (
        <p className="text-green-700 mb-2">
          Đã Import: thêm {confirmResult.inserted}, sửa {confirmResult.updated}, bỏ qua {confirmResult.skipped}.
        </p>
      )}

      {previewData && (
        <div className="border border-gray-200 rounded-lg p-2 mb-2">
          <div className="flex gap-3 mb-2 font-semibold">
            {Object.entries(previewData.summary).map(([key, count]) => (
              <span key={key} className={`px-2 py-0.5 rounded ${CLASSIFICATION_COLOR[key]}`}>
                {CLASSIFICATION_LABEL[key]}: {count}
              </span>
            ))}
          </div>

          {previewData.hasBlockingError && (
            <p className="text-red-700 font-semibold mb-2">
              File có dòng lỗi — không thể Confirm cho đến khi sửa toàn bộ lỗi.
            </p>
          )}

          {rows.length > 0 && (
            <div className="max-h-64 overflow-auto mb-2">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-gray-500">
                    <th className="py-1 pr-2">Dòng</th>
                    <th className="py-1 pr-2">{rowLabel}</th>
                    <th className="py-1 pr-2">Phân loại</th>
                    <th className="py-1">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.rowNumber}-${r[rowKeyField] ?? r.key}`} className="border-b border-gray-100">
                      <td className="py-1 pr-2">{r.rowNumber}</td>
                      <td className="py-1 pr-2">{r[rowKeyField] ?? r.key ?? '—'}</td>
                      <td className={`py-1 pr-2 font-semibold ${CLASSIFICATION_COLOR[r.classification]}`}>{CLASSIFICATION_LABEL[r.classification]}</td>
                      <td className="py-1">{r.reason || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {typeof previewData.rowCount === 'number' && rows.length === 0 && (
            <p className="text-gray-500 mb-2">{previewData.rowCount} dòng hợp lệ (chi tiết từng dòng không hiển thị cho file lớn).</p>
          )}

          <button
            type="button"
            disabled={previewData.hasBlockingError || status === 'confirming'}
            onClick={handleConfirm}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg disabled:opacity-50"
          >
            {status === 'confirming' ? 'Đang ghi...' : 'Xác nhận Import'}
          </button>
        </div>
      )}
    </div>
  );
}
