import { processOverviewData } from './bcvhOverviewData.js';

export function createOverviewFetcher(apiClient, setOverviewState) {
  let currentRequestSeq = 0;

  return async function fetchOverview(toDate, retrySeq) {
    // 1. Không gọi API nếu chưa có toDate
    if (!toDate) return;

    const seq = ++currentRequestSeq;
    
    // Set loading state
    setOverviewState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const response = await apiClient.get('/f13/ranking/bcvh/overview', {
        params: { anchor_date: toDate }
      });

      // 2. Chống race condition: response của request cũ không ghi đè request mới
      if (seq !== currentRequestSeq) return;

      if (!response?.data?.success) {
        throw new Error(response?.data?.error?.message || 'Không thể tải dữ liệu tổng quan BCVH.');
      }

      const rawData = response.data.data || {};
      // 3. Đọc đúng meta từ rawData.meta theo cấu trúc backend
      const rawMeta = rawData.meta || {};
      const processed = processOverviewData(rawData, rawMeta);

      setOverviewState({
        status: 'success',
        data: response.data,
        processed,
        error: null,
      });
    } catch (error) {
      if (seq !== currentRequestSeq) return;

      setOverviewState({
        status: 'error',
        data: null,
        processed: null,
        error: error?.response?.data?.error?.message || error?.message || 'Không thể tải dữ liệu tổng quan BCVH.',
      });
    }
  };
}
