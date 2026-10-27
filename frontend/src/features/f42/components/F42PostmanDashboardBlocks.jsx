import { useEffect, useState, useMemo } from 'react';
import { useIndicatorApi } from '../../indicator/useIndicatorApi.js';
import { formatPeriodHeader } from './f42PostmanTableHelpers.js';
import F42PostmanAttentionBlock from './F42PostmanAttentionBlock.jsx';
import F42PostmanTableBlock from './F42PostmanTableBlock.jsx';

export default function F42PostmanDashboardBlocks({
  anchorDate = null,
  maBcvh = 'all',
}) {
  const api = useIndicatorApi();

  const [period, setPeriod] = useState('day'); // 'day' | 'week' | 'month'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableData, setTableData] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchPostmanData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          period,
          ...(anchorDate ? { anchor_date: anchorDate } : {}),
          ...(maBcvh && maBcvh !== 'all' ? { ma_bcvh: maBcvh } : {}),
        };

        const response = await api.get('/f42/dashboard/postman-table', { params });
        if (!active) return;

        if (response.data && response.data.success) {
          setTableData(response.data.data);
        } else {
          throw new Error(response.data?.error?.message || 'Không thể tải dữ liệu bưu tá.');
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Lỗi khi tải dữ liệu bưu tá.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchPostmanData();

    return () => {
      active = false;
    };
  }, [api, period, anchorDate, maBcvh]);

  const periodLabel = useMemo(() => {
    return formatPeriodHeader(period, {
      anchorDate,
      fromDate: tableData?.meta?.from_date,
      toDate: tableData?.meta?.to_date,
    });
  }, [period, anchorDate, tableData?.meta?.from_date, tableData?.meta?.to_date]);

  const units = tableData?.units || [];
  const totalRow = tableData?.total_row || null;
  const hasData = tableData?.meta?.has_data !== false;

  if (error) {
    return (
      <div className="w-full rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-800 shadow-2xs">
        <span className="font-semibold">Lỗi tải dữ liệu bưu tá: </span>
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* 1. Bưu tá cần chú ý (derived from table payload, no extra API call) */}
      <F42PostmanAttentionBlock
        units={units}
        periodLabel={periodLabel}
        maBcvh={maBcvh}
      />

      {/* 2. Bưu tá theo BCVH */}
      <F42PostmanTableBlock
        units={units}
        totalRow={totalRow}
        period={period}
        onPeriodChange={setPeriod}
        periodLabel={periodLabel}
        loading={loading}
        hasData={hasData}
      />
    </div>
  );
}
