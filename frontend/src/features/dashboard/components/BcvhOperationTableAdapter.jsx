import React from 'react';
import LegacyBcvhOperationTable from '../../../components/f13/BcvhOperationTable';

/**
 * Adapter cho BcvhOperationTable.
 * Tuân thủ chiến lược WRAP + ADAPT.
 * Không sửa đổi source code Legacy.
 * Chuyển đổi data interface D7 (from_date, to_date, ma_bcvh, interval) thành globalFilter (dateRange).
 */
export default function BcvhOperationTableAdapter({ fromDate, toDate, interval, maBcvh }) {
  // Legacy component cần globalFilter.dateRange là array [startDate, endDate]
  const legacyGlobalFilter = {
    dateRange: [fromDate, toDate],
    interval: interval,
    maBcvh: maBcvh
  };

  return (
    <div className="bcvh-operation-table-adapter-wrapper w-full">
      {/* 
        Bọc Legacy Component lại. 
        Mọi logic fetch data nội bộ vẫn giữ nguyên 100% không refactor.
      */}
      <LegacyBcvhOperationTable globalFilter={legacyGlobalFilter} />
    </div>
  );
}
