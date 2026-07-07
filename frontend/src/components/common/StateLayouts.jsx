import React from 'react';
import { AlertTriangle, RefreshCw, FileQuestion } from 'lucide-react';

export const LoadingLayout = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <div className="w-8 h-8 border-4 border-[var(--color-primary-100)] border-t-[var(--color-primary-600)] rounded-full animate-spin"></div>
      <p className="text-[var(--color-text-muted)] animate-pulse">Đang tải dữ liệu...</p>
    </div>
  );
};

export const ErrorLayout = ({ error, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 text-center bg-white rounded-lg border border-red-100">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-[var(--color-text-main)]">Đã xảy ra lỗi</h3>
      <p className="text-[var(--color-text-muted)] max-w-md">
        {error?.message || "Không thể tải dữ liệu từ máy chủ. Vui lòng kiểm tra lại kết nối mạng."}
      </p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-white border border-[var(--color-surface-200)] rounded-md shadow-sm text-sm font-medium text-[var(--color-text-main)] hover:bg-[var(--color-surface-50)] flex items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-500)]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Thử lại
        </button>
      )}
    </div>
  );
};

export const EmptyLayout = ({ message = "Không có dữ liệu", subMessage = "Không tìm thấy bản ghi nào phù hợp với bộ lọc hiện tại." }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 text-center bg-white rounded-lg border border-[var(--color-surface-200)]">
      <div className="w-16 h-16 bg-[var(--color-surface-100)] rounded-full flex items-center justify-center text-[var(--color-text-muted)] mb-2">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-medium text-[var(--color-text-main)]">{message}</h3>
      <p className="text-[var(--color-text-muted)] max-w-md">{subMessage}</p>
    </div>
  );
};
