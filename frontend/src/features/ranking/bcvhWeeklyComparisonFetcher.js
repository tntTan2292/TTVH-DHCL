// Separate fetch flow from bcvhOverviewFetcher.js on purpose (PO instruction: "không gộp vào
// endpoint /overview; tạo luồng riêng cho so sánh tuần"). Two independent requests: the weeks
// list loads once, the comparison reloads whenever either selected week changes.

export function createWeeksListFetcher(apiClient, setWeeksState) {
  let currentRequestSeq = 0;

  return async function fetchWeeksList() {
    const seq = ++currentRequestSeq;
    setWeeksState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const response = await apiClient.get('/f13/ranking/bcvh/weeks');
      if (seq !== currentRequestSeq) return;

      if (!response?.data?.success) {
        throw new Error(response?.data?.error?.message || 'Không thể tải danh sách tuần.');
      }

      setWeeksState({
        status: 'success',
        weeks: response.data.data?.weeks || [],
        error: null,
      });
    } catch (error) {
      if (seq !== currentRequestSeq) return;
      setWeeksState({
        status: 'error',
        weeks: [],
        error: error?.response?.data?.error?.message || error?.message || 'Không thể tải danh sách tuần.',
      });
    }
  };
}

export function createWeeklyComparisonFetcher(apiClient, setComparisonState) {
  let currentRequestSeq = 0;

  return async function fetchWeeklyComparison(weekId, compareWeekId) {
    if (!weekId || !compareWeekId) return;

    const seq = ++currentRequestSeq;
    setComparisonState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const response = await apiClient.get('/f13/ranking/bcvh/weekly-comparison', {
        params: { week: weekId, compare_week: compareWeekId },
      });
      if (seq !== currentRequestSeq) return;

      if (!response?.data?.success) {
        throw new Error(response?.data?.error?.message || 'Không thể so sánh hai tuần đã chọn.');
      }

      setComparisonState({
        status: 'success',
        data: response.data.data,
        error: null,
      });
    } catch (error) {
      if (seq !== currentRequestSeq) return;
      setComparisonState({
        status: 'error',
        data: null,
        error: error?.response?.data?.error?.message || error?.message || 'Không thể so sánh hai tuần đã chọn.',
      });
    }
  };
}

// Monthly comparison (PO 2026-10-05): same two-request pattern as weeks, separate endpoints.
export function createMonthsListFetcher(apiClient, setMonthsState) {
  let currentRequestSeq = 0;

  return async function fetchMonthsList() {
    const seq = ++currentRequestSeq;
    setMonthsState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const response = await apiClient.get('/f13/ranking/bcvh/months');
      if (seq !== currentRequestSeq) return;

      if (!response?.data?.success) {
        throw new Error(response?.data?.error?.message || 'Không thể tải danh sách tháng.');
      }

      setMonthsState({
        status: 'success',
        months: response.data.data?.months || [],
        error: null,
      });
    } catch (error) {
      if (seq !== currentRequestSeq) return;
      setMonthsState({
        status: 'error',
        months: [],
        error: error?.response?.data?.error?.message || error?.message || 'Không thể tải danh sách tháng.',
      });
    }
  };
}

export function createMonthlyComparisonFetcher(apiClient, setComparisonState) {
  let currentRequestSeq = 0;

  return async function fetchMonthlyComparison(monthId, compareMonthId, samePeriod = false) {
    if (!monthId || !compareMonthId) return;

    const seq = ++currentRequestSeq;
    setComparisonState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const response = await apiClient.get('/f13/ranking/bcvh/monthly-comparison', {
        params: {
          month: monthId,
          compare_month: compareMonthId,
          ...(samePeriod ? { same_period: 1 } : {}),
        },
      });
      if (seq !== currentRequestSeq) return;

      if (!response?.data?.success) {
        throw new Error(response?.data?.error?.message || 'Không thể so sánh hai tháng đã chọn.');
      }

      setComparisonState({
        status: 'success',
        data: response.data.data,
        error: null,
      });
    } catch (error) {
      if (seq !== currentRequestSeq) return;
      setComparisonState({
        status: 'error',
        data: null,
        error: error?.response?.data?.error?.message || error?.message || 'Không thể so sánh hai tháng đã chọn.',
      });
    }
  };
}
