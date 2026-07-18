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
      label: 'Tỷ lệ đạt',
      value: passedRate === null ? '--' : `${passedRate.toFixed(2)}%`,
      delta: totalBg ? `Tổng bưu gửi: ${totalBg.toLocaleString('vi-VN')}` : 'Không có dữ liệu',
      tone: 'primary',
    },
    {
      label: 'Đạt',
      value: totalBg ? passedCount.toLocaleString('vi-VN') : '--',
      delta: passedRate === null ? 'Không có dữ liệu' : `${passedRate.toFixed(2)}% tổng bưu gửi`,
      tone: 'success',
    },
    {
      label: 'Không đạt',
      value: totalBg ? failedCount.toLocaleString('vi-VN') : '--',
      delta: failedRate === null ? 'Không có dữ liệu' : `${failedRate.toFixed(2)}% tổng bưu gửi`,
      tone: 'danger',
    },
    {
      label: 'Tỷ lệ không đạt',
      value: failedRate === null ? '--' : `${failedRate.toFixed(2)}%`,
      delta: 'Theo dữ liệu đã lọc',
      tone: 'danger',
    },
  ];
}
