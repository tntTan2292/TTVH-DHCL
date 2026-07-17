import React from 'react';
import LegacyExecutiveSummary from '../../../components/f13/ExecutiveSummary';
import { CardContainer, ErrorState, LoadingState } from '../../../components/shared/SharedComponents';

function mapSharedKpiToSummary(kpiData = {}) {
  const totalBg = Number(kpiData.total_bg || 0);
  const passedRate = Number(kpiData.passed_rate || 0);
  const failedRate = Number(kpiData.failed_rate || 0);

  return {
    today: passedRate,
    dod: 0,
    swc: 0,
    tong_buu_gui: totalBg,
    tong_buu_gui_dod: 0,
    tong_buu_gui_swc: 0,
    buu_gui_dat: Math.round((totalBg * passedRate) / 100),
    buu_gui_dat_dod: 0,
    buu_gui_dat_swc: 0,
    buu_gui_khong_dat: Math.round((totalBg * failedRate) / 100),
    buu_gui_khong_dat_dod: 0,
    buu_gui_khong_dat_swc: 0,
    f13_303_rate: 0,
    luy_ke_tuan: passedRate,
    luy_ke_thang: passedRate,
  };
}

export default function ExecutiveSummaryAdapter({ kpiData, loading, error }) {
  if (loading) {
    return (
      <CardContainer title="Executive Summary">
        <LoadingState label="Đang tải Executive Summary..." className="min-h-[160px]" />
      </CardContainer>
    );
  }

  if (error) {
    return (
      <CardContainer title="Executive Summary">
        <ErrorState title="Không thể tải Executive Summary" description={error} className="min-h-[160px]" />
      </CardContainer>
    );
  }

  return <LegacyExecutiveSummary data={mapSharedKpiToSummary(kpiData)} />;
}
