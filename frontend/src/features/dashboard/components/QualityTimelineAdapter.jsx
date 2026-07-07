import React from 'react';
import LegacyQualityTimelinePanel from '../../../components/f13/QualityTimelinePanel';

/**
 * Adapter cho QualityTimelinePanel.
 * Tuân thủ chiến lược WRAP + ADAPT.
 * Chuyển đổi data interface D7 thành globalFilter.
 */
export default function QualityTimelineAdapter({ fromDate, toDate, interval, maBcvh }) {
  const legacyGlobalFilter = {
    dateRange: [fromDate, toDate],
    interval: interval,
    ma_bcvh: maBcvh // Chú ý: Legacy dùng ma_bcvh
  };

  return (
    <div className="quality-timeline-adapter-wrapper w-full mt-6" data-testid="quality-timeline-adapter">
      <LegacyQualityTimelinePanel globalFilter={legacyGlobalFilter} />
    </div>
  );
}
