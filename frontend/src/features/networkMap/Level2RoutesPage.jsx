import { useCallback } from 'react';
import NetworkFoundationPage from './NetworkFoundationPage';
import networkMapClient from '../../api/NetworkMapClient';

export default function Level2RoutesPage() {
  const fetchSummary = useCallback(async () => {
    const response = await networkMapClient.getLevel2Routes();
    return (response?.data || []).length;
  }, []);

  return (
    <NetworkFoundationPage
      title="Mạng đường thư cấp 2"
      description="Hành trình đường thư cấp 2 và các lượt dừng."
      fetchSummary={fetchSummary}
    />
  );
}
