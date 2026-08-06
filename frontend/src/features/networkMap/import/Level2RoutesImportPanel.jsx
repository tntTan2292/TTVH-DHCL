import { useRef, useState } from 'react';
import networkMapClient from '../../../api/NetworkMapClient';

const CLASSIFICATION_LABEL = { added: 'Tuyến mới', changed: 'Thay đổi', unchanged: 'Không đổi', error: 'Lỗi' };
const CLASSIFICATION_COLOR = {
  added: 'text-green-700 bg-green-50', changed: 'text-blue-700 bg-blue-50', unchanged: 'text-gray-500 bg-gray-50', error: 'text-red-700 bg-red-50',
};

function routeKeyOf(route) {
  return route.route_id !== null ? `id:${route.route_id}` : `new:${route.route_name}`;
}

/**
 * Đường thư cấp 2 Import: preview groups by Route ID (blank = new route,
 * shown clearly), admin explicitly selects which routes to Confirm — never
 * a whole-network replace.
 */
export default function Level2RoutesImportPanel({ onConfirmed }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
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
      const response = await networkMapClient.previewLevel2Routes(file);
      setPreview(response.data);
      setSelectedKeys(new Set());
      setStatus('previewed');
    } catch (err) {
      setError(err?.message || 'Không thể đọc file.');
      setStatus('idle');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleRoute = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!preview || selectedKeys.size === 0) return;
    setStatus('confirming');
    setError(null);
    try {
      const response = await networkMapClient.confirmLevel2Routes(preview.session_token, [...selectedKeys]);
      setConfirmResult(response.data);
      setStatus('confirmed');
      setPreview(null);
      onConfirmed?.();
    } catch (err) {
      setError(err?.message || 'Confirm thất bại.');
      setStatus('previewed');
    }
  };

  const routes = preview?.routes || [];

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
          Đã Import: {confirmResult.routesAdded} tuyến mới, {confirmResult.routesUpdated} tuyến cập nhật, {confirmResult.routesSkipped} tuyến bỏ qua.
        </p>
      )}

      {preview && (
        <div className="border border-gray-200 rounded-lg p-2 mb-2">
          <p className="mb-2 text-gray-600">Chọn hành trình cần áp dụng — tuyến không chọn giữ nguyên.</p>
          <div className="max-h-72 overflow-auto mb-2">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b border-gray-200 text-gray-500">
                  <th className="py-1 pr-2" />
                  <th className="py-1 pr-2">Route ID</th>
                  <th className="py-1 pr-2">Tên ĐT</th>
                  <th className="py-1 pr-2">Phân loại</th>
                  <th className="py-1">Ghi chú lỗi</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route) => {
                  const key = routeKeyOf(route);
                  return (
                    <tr key={key} className="border-b border-gray-100">
                      <td className="py-1 pr-2">
                        <input
                          type="checkbox"
                          disabled={route.classification === 'error' || route.classification === 'unchanged'}
                          checked={selectedKeys.has(key)}
                          onChange={() => toggleRoute(key)}
                        />
                      </td>
                      <td className="py-1 pr-2">{route.route_id ?? '(mới)'}</td>
                      <td className="py-1 pr-2">{route.route_name}</td>
                      <td className={`py-1 pr-2 font-semibold ${CLASSIFICATION_COLOR[route.classification]}`}>{CLASSIFICATION_LABEL[route.classification]}</td>
                      <td className="py-1 text-red-600">{route.reason || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            disabled={selectedKeys.size === 0 || status === 'confirming'}
            onClick={handleConfirm}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg disabled:opacity-50"
          >
            {status === 'confirming' ? 'Đang ghi...' : `Xác nhận ${selectedKeys.size} hành trình đã chọn`}
          </button>
        </div>
      )}
    </div>
  );
}
