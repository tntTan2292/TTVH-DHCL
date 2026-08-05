/**
 * Shared loading / empty / error / warning banner for the 3 Quản lý mạng
 * lưới map screens — never render a silently-empty or hung map.
 */
export default function MapStateBanner({ status, errorMessage, emptyMessage, warningMessage }) {
  if (status === 'loading') {
    return (
      <div className="px-4 py-3 rounded-lg bg-blue-50 text-blue-700 text-sm border border-blue-200">
        Đang tải dữ liệu bản đồ...
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
        {errorMessage || 'Không thể tải dữ liệu bản đồ.'}
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className="px-4 py-3 rounded-lg bg-gray-50 text-gray-600 text-sm border border-gray-200">
        {emptyMessage || 'Không có dữ liệu để hiển thị.'}
      </div>
    );
  }

  if (warningMessage) {
    return (
      <div className="px-4 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs border border-amber-200">
        {warningMessage}
      </div>
    );
  }

  return null;
}
