export function mapDashboardKpiToCards(kpiData = {}) {
  const totalBg = Number(kpiData.total_bg || 0);
  const passedRate = kpiData.passed_rate === null || kpiData.passed_rate === undefined
    ? null
    : Number(kpiData.passed_rate);
  const failedRate = kpiData.failed_rate === null || kpiData.failed_rate === undefined
    ? null
    : Number(kpiData.failed_rate);
  const passedCount = totalBg && passedRate !== null ? Math.round((totalBg * passedRate) / 100) : 0;
  const failedCount = totalBg && failedRate !== null ? Math.round((totalBg * failedRate) / 100) : 0;

  return [
    {
      label: 'KPI',
      value: passedRate === null ? '--' : `${passedRate.toFixed(2)}%`,
      delta: totalBg ? `Tổng bưu gửi: ${totalBg.toLocaleString('vi-VN')}` : 'Không có dữ liệu',
      tone: 'primary',
    },
    {
      label: 'Đạt',
      value: totalBg ? passedCount.toLocaleString('vi-VN') : '--',
      delta: passedRate === null ? 'Không có dữ liệu' : `${passedRate.toFixed(2)}%`,
      tone: 'success',
    },
    {
      label: 'Không đạt',
      value: totalBg ? failedCount.toLocaleString('vi-VN') : '--',
      delta: failedRate === null ? 'Không có dữ liệu' : `${failedRate.toFixed(2)}%`,
      tone: 'danger',
    },
    {
      label: 'Tỷ lệ Không đạt',
      value: failedRate === null ? '--' : `${failedRate.toFixed(2)}%`,
      delta: 'Theo contract runtime',
      tone: 'warning',
    },
  ];
}
