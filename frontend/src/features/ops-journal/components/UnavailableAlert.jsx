import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { getIndicatorChipStyle } from '../opsJournalHelpers.js';

export default function UnavailableAlert({ unavailable = [] }) {
  if (!Array.isArray(unavailable) || unavailable.length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900 shadow-xs"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-amber-900">
            Cảnh báo đồng bộ dữ liệu ({unavailable.length} chỉ tiêu chưa sẵn sàng đầy đủ)
          </h4>
          <p className="mt-0.5 text-xs text-amber-800">
            Các điểm đen dưới đây được tổng hợp từ nguồn dữ liệu gần nhất; vui lòng lưu ý khi rà soát và giao việc:
          </p>
          <ul className="mt-2 space-y-1.5 text-xs">
            {unavailable.map((item, idx) => {
              const chip = getIndicatorChipStyle(item.indicator);
              return (
                <li key={idx} className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold border ${chip.badgeClass}`}>
                    {item.indicator}
                  </span>
                  <span className="text-amber-900">{item.message}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

