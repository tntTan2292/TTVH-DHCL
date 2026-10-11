import React from 'react';
import { AlertTriangle, RefreshCw, FileQuestion } from 'lucide-react';

export const LoadingLayout = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
      <div className="w-9 h-9 border-3 border-[var(--color-primary-100)] border-t-[var(--color-vnpost-blue)] rounded-full animate-spin"></div>
      <p className="text-sm font-medium text-[var(--color-text-muted)] animate-pulse">Đang tải dữ liệu...</p>
    </div>
  );
};

export const ErrorLayout = ({ error, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 text-center bg-white rounded-2xl border border-rose-200/80 shadow-md max-w-lg mx-auto my-auto">
      <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-1 border border-rose-100 shadow-2xs">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-[var(--color-text-main)]">Đã xảy ra lỗi</h3>
      <p className="text-sm text-[var(--color-text-muted)] max-w-md leading-relaxed">
        {error?.message || "Không thể tải dữ liệu từ máy chủ. Vui lòng kiểm tra lại kết nối mạng."}
      </p>
      {onRetry && (
        <button 
          type="button"
          onClick={onRetry}
          className="mt-3 px-4 py-2 bg-white border border-slate-200/90 rounded-xl shadow-xs text-sm font-semibold text-slate-800 hover:text-[var(--color-vnpost-blue)] hover:bg-white hover:border-blue-300 flex items-center transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-vnpost-blue)] active:scale-95"
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
    <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm max-w-lg mx-auto my-auto">
      <div className="w-14 h-14 bg-slate-100/80 rounded-2xl flex items-center justify-center text-slate-500 mb-1 border border-slate-200/60 shadow-2xs">
        <FileQuestion className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-[var(--color-text-main)]">{message}</h3>
      <p className="text-sm text-[var(--color-text-muted)] max-w-md leading-relaxed">{subMessage}</p>
    </div>
  );
};
