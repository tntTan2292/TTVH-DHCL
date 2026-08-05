import { useCallback } from 'react';
import NetworkFoundationPage from './NetworkFoundationPage';
import networkMapClient from '../../api/NetworkMapClient';

export default function ServicePointsPage() {
  const fetchSummary = useCallback(async () => {
    const response = await networkMapClient.getServicePoints();
    return (response?.data || []).length;
  }, []);

  return (
    <NetworkFoundationPage
      title="Mạng điểm phục vụ"
      description="Danh mục điểm phục vụ theo mã điểm."
      fetchSummary={fetchSummary}
    />
  );
}
