import { useCallback } from 'react';
import NetworkFoundationPage from './NetworkFoundationPage';
import networkMapClient from '../../api/NetworkMapClient';

export default function DeliveryRoutesPage() {
  // Foundation screen only queries meta (available dates/BCVH), never the
  // full points endpoint — that requires Ngày + BCVH + Bưu tá (Phase 2/3).
  const fetchSummary = useCallback(async () => {
    const response = await networkMapClient.getDeliveryRoutesMeta();
    return response?.data?.dates?.length || 0;
  }, []);

  return (
    <NetworkFoundationPage
      title="Sơ đồ tuyến phát"
      description="Chỉ truy vấn dữ liệu sau khi chọn Ngày, BCVH và Bưu tá."
      fetchSummary={fetchSummary}
    />
  );
}
