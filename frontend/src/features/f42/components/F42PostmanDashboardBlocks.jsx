import { useEffect, useState, useMemo } from 'react';
import { useIndicatorApi } from '../../indicator/useIndicatorApi.js';
import { formatPeriodHeader } from './f42PostmanTableHelpers.js';
import { generateRecentWeeks, generateRecentMonths } from '../../../components/common/periodFilterHelpers.js';
import F42PostmanAttentionBlock from './F42PostmanAttentionBlock.jsx';
import F42PostmanTableBlock from './F42PostmanTableBlock.jsx';
import F42PostmanTrendModal from './F42PostmanTrendModal.jsx';

export default function F42PostmanDashboardBlocks({
  anchorDate = null,
  maBcvh = 'all',
}) {
  const api = useIndicatorApi();

  const [period, setPeriod] = useState('day'); // 'day' | 'week' | 'month'
  const [selectedDay, setSelectedDay] = useState(anchorDate || '');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [selectedPostman, setSelectedPostman] = useState(null);

  useEffect(() => {
    if (anchorDate) {
      setSelectedDay(anchorDate);
    }
  }, [anchorDate]);

  const weekOptions = useMemo(() => generateRecentWeeks(anchorDate, 12), [anchorDate]);
  const monthOptions = useMemo(() => generateRecentMonths(anchorDate, 12), [anchorDate]);

  const activeAnchor = useMemo(() => {
    if (period === 'day') return selectedDay || anchorDate;
    if (period === 'week') return selectedWeek || weekOptions[0]?.value || anchorDate;
    if (period === 'month') return selectedMonth || monthOptions[0]?.value || anchorDate;
    return anchorDate;
  }, [period, selectedDay, selectedWeek, selectedMonth, weekOptions, monthOptions, anchorDate]);

  useEffect(() => {
    let active = true;

    const fetchPostmanData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          period,
          ...(activeAnchor ? { anchor_date: activeAnchor } : {}),
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
  }, [api, period, activeAnchor, maBcvh]);

  const periodLabel = useMemo(() => {
    return formatPeriodHeader(period, {
      anchorDate: activeAnchor,
      fromDate: tableData?.meta?.from_date,
      toDate: tableData?.meta?.to_date,
    });
  }, [period, activeAnchor, tableData?.meta?.from_date, tableData?.meta?.to_date]);

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

  const handleSelectPostman = (postman, unit) => {
    setSelectedPostman({
      ma_buu_ta: postman.ma_buu_ta,
      ten_buu_ta: postman.ten_buu_ta,
      ma_bcvh: unit?.ma_bcvh || postman.ma_bcvh,
      ten_bcvh: unit?.ten_bcvh || postman.ten_bcvh,
    });
  };

  return (
    <div className="space-y-3.5">
      {/* 1. Bưu tá cần chú ý (derived from table payload, no extra API call) */}
      <F42PostmanAttentionBlock
        units={units}
        periodLabel={periodLabel}
        maBcvh={maBcvh}
        onSelectPostman={handleSelectPostman}
      />

      {/* 2. Bưu tá theo BCVH */}
      <F42PostmanTableBlock
        units={units}
        totalRow={totalRow}
        period={period}
        onPeriodChange={setPeriod}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        selectedWeek={selectedWeek}
        onSelectWeek={setSelectedWeek}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        weekOptions={weekOptions}
        monthOptions={monthOptions}
        periodLabel={periodLabel}
        loading={loading}
        hasData={hasData}
        onSelectPostman={handleSelectPostman}
      />

      {/* 3. Modal xu hướng một bưu tá (Phase D) */}
      {selectedPostman && (
        <F42PostmanTrendModal
          isOpen={Boolean(selectedPostman)}
          onClose={() => setSelectedPostman(null)}
          postman={selectedPostman}
          anchorDate={activeAnchor}
          maBcvhScope={maBcvh}
        />
      )}
    </div>
  );
}
