import React from 'react';
import LegacyExecutiveDailyBrief from '../../../components/f13/ExecutiveDailyBrief';
import { CardContainer, ErrorState, LoadingState } from '../../../components/shared/SharedComponents';

function mapSharedKpiToDailyBrief(kpiData = {}) {
  const totalBg = Number(kpiData.total_bg || 0);
  const passedRate = Number(kpiData.passed_rate || 0);
  const failedRate = Number(kpiData.failed_rate || 0);

  return {
    today: passedRate,
    dod: 0,
    total_bg: totalBg,
    buu_gui_dat: Math.round((totalBg * passedRate) / 100),
    buu_gui_khong_dat: Math.round((totalBg * failedRate) / 100),
    rank: 0,
    rankDod: 0,
  };
}

export default function ExecutiveDailyBriefAdapter({ kpiData, loading, error }) {
  if (loading) {
    return (
      <CardContainer title="Executive Daily Brief">
        <LoadingState label="Đang tải Daily Brief..." className="min-h-[160px]" />
      </CardContainer>
    );
  }

  if (error) {
    return (
      <CardContainer title="Executive Daily Brief">
        <ErrorState title="Không thể tải Daily Brief" description={error} className="min-h-[160px]" />
      </CardContainer>
    );
  }

  return <LegacyExecutiveDailyBrief kpiData={mapSharedKpiToDailyBrief(kpiData)} />;
}
