import { useState, useEffect, useMemo, Fragment } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, AlertCircle, Maximize2, Minimize2, Flame, Eye, Award } from 'lucide-react';
import api from '../../api/client';
import { DASHBOARD_SEMANTIC_COLORS, DASHBOARD_STATUS } from '../../features/dashboard/components/dashboardSemantics';

export default function BcvhOperationTable({ globalFilter }) {
  const [data, setData] = useState([]);
  const [totalRow, setTotalRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'kpi_2026', direction: 'desc' });
  const [expandedRows, setExpandedRows] = useState({});

  const DEFAULT_BCVHS = ['Thuận Hóa', 'Thuận An', 'Hương Thủy', 'Phú Lộc', 'Hương Trà', 'A Lưới'];
  const TARGET_KPI = 95.0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = {
          fromDate: globalFilter.dateRange[0],
          toDate: globalFilter.dateRange[1],
        };
        const response = await api.get('/f13/ranking/bcvh', { params });

        if (response.data.success) {
          const mappedData = response.data.data.map((item) => ({
            ...item,
            kpi_rate: item.kpi_2026 ?? 0,
          }));

          setData(mappedData);
          setTotalRow(response.data.meta?.total_row || null);
        }
      } catch (error) {
        console.error('Failed to fetch BCVH ranking', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [globalFilter]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const toggleRow = (ma_bcvh) => {
    setExpandedRows((prev) => ({ ...prev, [ma_bcvh]: !prev[ma_bcvh] }));
  };

  const processedData = useMemo(() => {
    let sorted = [...data];

    if (sortConfig.key) {
      sorted.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    if (sortConfig.key === 'kpi_2026' && sortConfig.direction === 'desc') {
      sorted.sort((a, b) => {
        const aCrit = a.kpi_2026 < 90 ? 1 : 0;
        const bCrit = b.kpi_2026 < 90 ? 1 : 0;
        if (aCrit !== bCrit) return bCrit - aCrit;
        return 0;
      });
    }

    if (!showAll) {
      sorted = sorted.filter((item) => DEFAULT_BCVHS.some((name) => item.ten_bcvh.includes(name)));
    }

    return sorted;
  }, [data, sortConfig, showAll]);

  const totals = useMemo(() => {
    if (totalRow) {
      return {
        ten_bcvh: totalRow.ten_bcvh || 'TỔNG CỘNG',
        sl_bg_ptc: totalRow.sl_bg_ptc || 0,
        sl_ptc_nop_tien: totalRow.sl_ptc_nop_tien || 0,
        dat_kpi_2026: totalRow.dat_kpi_2026 || 0,
        khong_dat_kpi_2026: totalRow.khong_dat_kpi_2026 || 0,
        kpi_2026: totalRow.kpi_2026 || 0,
        kpi_2026_dod: totalRow.kpi_2026_dod || 0,
        kpi_2026_swc: totalRow.kpi_2026_swc || 0,
      };
    }

    return {
      ten_bcvh: 'TỔNG CỘNG',
      sl_bg_ptc: 0,
      sl_ptc_nop_tien: 0,
      dat_kpi_2026: 0,
      khong_dat_kpi_2026: 0,
      kpi_2026: 0,
      kpi_2026_dod: 0,
      kpi_2026_swc: 0,
    };
  }, [totalRow]);

  const summary = useMemo(() => ({
    good: data.filter((d) => d.kpi_2026 >= 70).length,
    attention: data.filter((d) => d.kpi_2026 >= 60 && d.kpi_2026 < 70).length,
    warning: data.filter((d) => d.kpi_2026 >= 50 && d.kpi_2026 < 60).length,
    highRisk: data.filter((d) => d.kpi_2026 < 50).length,
  }), [data]);

  const getBusinessStatus = (rate) => {
    if (rate >= 70) return { text: DASHBOARD_STATUS.good, color: 'text-green-700 bg-green-50', flag: DASHBOARD_STATUS.good, icon: <Award size={12} /> };
    if (rate >= 60) return { text: DASHBOARD_STATUS.attention, color: 'text-amber-700 bg-amber-50', flag: DASHBOARD_STATUS.attention, icon: <Eye size={12} /> };
    if (rate >= 50) return { text: DASHBOARD_STATUS.warning, color: 'text-amber-800 bg-amber-100', flag: DASHBOARD_STATUS.warning, icon: <AlertCircle size={12} /> };
    return { text: DASHBOARD_STATUS.highRisk, color: 'text-red-700 bg-red-50 font-bold', flag: DASHBOARD_STATUS.highRisk, icon: <Flame size={12} /> };
  };

  const getRecommendation = (rate) => {
    if (rate >= 95) return 'Duy trì phong độ phát xuất sắc. Khuyến khích tuyên dương tuyến.';
    if (rate >= 90) return 'Cần theo dõi sát dòng bưu gửi chậm để tránh tụt xuống mức rủi ro.';
    return 'YÊU CẦU ĐIỀU PHỐI GẤP: Rà soát ngay bưu tá tuyến, tăng cường xe tải hoặc nhân lực ca chiều.';
  };

  const renderTrend = (value) => {
    const positive = value >= 0;
    const Icon = positive ? TrendingUp : TrendingDown;

    return (
      <span className={`inline-flex items-center gap-1 ${positive ? 'text-green-700' : 'text-red-700'}`}>
        <Icon size={12} />
        {positive ? 'Tăng' : 'Giảm'} {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="mb-6 flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
          Bảng điều hành BCVH
        </h3>
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors hover:bg-gray-50"
        >
          {showAll ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {showAll ? 'Chỉ hiển thị BCVH trọng điểm' : 'Hiển thị tất cả'}
        </button>
      </div>

      <div className="relative w-full overflow-x-auto" style={{ maxHeight: '600px' }}>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-20 bg-gray-100 text-xs uppercase text-gray-600 shadow-sm">
            <tr>
              <th className="sticky left-0 z-30 w-1/4 cursor-pointer bg-gray-100 px-4 py-3 shadow-[1px_0_0_#e5e7eb] hover:bg-gray-200" onClick={() => requestSort('ten_bcvh')}>
                Tên BCVH {sortConfig.key === 'ten_bcvh' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
              </th>
              <th className="w-32 px-4 py-3 text-center">Trạng thái</th>
              <th className="cursor-pointer px-4 py-3 text-right hover:bg-gray-200" onClick={() => requestSort('sl_bg_ptc')}>
                SL PTC/NT/CH
              </th>
              <th className="cursor-pointer px-4 py-3 text-right hover:bg-gray-200" onClick={() => requestSort('sl_ptc_nop_tien')}>
                SL PTC/Nộp tiền
              </th>
              <th className="cursor-pointer px-4 py-3 text-right hover:bg-gray-200" onClick={() => requestSort('dat_kpi_2026')}>
                Đạt KPI 2026
              </th>
              <th className="cursor-pointer px-4 py-3 text-right hover:bg-gray-200" onClick={() => requestSort('khong_dat_kpi_2026')}>
                Không đạt KPI 2026
              </th>
              <th className="min-w-[120px] cursor-pointer px-4 py-3 text-right hover:bg-gray-200" onClick={() => requestSort('kpi_2026')}>
                KPI 2026 (%)
              </th>
              <th className="px-4 py-3 text-right font-normal text-gray-500">So với HQ</th>
              <th className="px-4 py-3 text-right font-normal text-gray-500">So với CK</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, idx) => (
                <tr key={idx} className="animate-pulse border-b">
                  <td className="sticky left-0 bg-white px-4 py-4"><div className="h-4 w-24 rounded bg-gray-200"></div></td>
                  <td colSpan="8" className="px-4 py-4"><div className="h-4 w-full rounded bg-gray-200"></div></td>
                </tr>
              ))
            ) : (
              <>
                <tr className="sticky top-[45px] z-10 border-b border-blue-100 bg-blue-50/80 font-bold text-vnpost-blue-dark shadow-sm">
                  <td className="sticky left-0 z-20 bg-blue-50/95 px-4 py-3 shadow-[1px_0_0_#dbeafe]">{totals.ten_bcvh}</td>
                  <td className="px-4 py-3 text-center">-</td>
                  <td className="px-4 py-3 text-right">{totals.sl_bg_ptc.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right">{totals.sl_ptc_nop_tien.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right text-green-700">{totals.dat_kpi_2026.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right text-red-600">{totals.khong_dat_kpi_2026.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right">
                    {totals.kpi_2026.toFixed(1)}%
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div className="h-1.5 rounded-full bg-vnpost-blue" style={{ width: `${Math.min(totals.kpi_2026, 100)}%` }}></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{renderTrend(totals.kpi_2026_dod)}</td>
                  <td className="px-4 py-3 text-right">{renderTrend(totals.kpi_2026_swc)}</td>
                </tr>

                {processedData.length > 0 ? processedData.map((row) => {
                  const status = getBusinessStatus(row.kpi_2026);
                  const isExpanded = expandedRows[row.ma_bcvh];
                  const gap = (TARGET_KPI - row.kpi_2026).toFixed(2);
                  const barColor = status.color.split(' ')[0].replace('text-', 'bg-');

                  return (
                    <Fragment key={row.ma_bcvh}>
                      <tr
                        onClick={() => toggleRow(row.ma_bcvh)}
                        className={`cursor-pointer border-b transition-colors hover:bg-gray-50 ${row.kpi_2026 < 90 ? 'bg-red-50/30' : ''}`}
                      >
                        <td className="sticky left-0 z-0 bg-white px-4 py-3 font-medium text-gray-800 shadow-[1px_0_0_#f3f4f6]">
                          <div className="flex items-center justify-between">
                            <span>{row.ten_bcvh}</span>
                            {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${status.color}`}>
                            {status.icon} {status.flag}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{row.sl_bg_ptc.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right">{row.sl_ptc_nop_tien.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right text-green-700">{row.dat_kpi_2026.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{row.khong_dat_kpi_2026.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right">
                          <div className={`font-bold ${status.color.split(' ')[0]}`}>{row.kpi_2026.toFixed(1)}%</div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                            <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${Math.min(row.kpi_2026, 100)}%` }}></div>
                          </div>
                          {gap > 0 && <div className="mt-0.5 text-right text-[9px] text-gray-500">Thiếu {gap}%</div>}
                        </td>
                        <td className="px-4 py-3 text-right text-xs">{renderTrend(row.kpi_2026_dod)}</td>
                        <td className="px-4 py-3 text-right text-xs">{renderTrend(row.kpi_2026_swc)}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-gray-100 bg-gray-50/80">
                          <td colSpan="9" className="px-4 py-3 text-sm">
                            <div className="flex flex-col gap-2 rounded border border-gray-100 bg-white p-2 shadow-inner">
                              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                <div>
                                  <span className="block text-xs text-gray-500">Trạng thái</span>
                                  <span className={`font-semibold ${status.color.split(' ')[0]}`}>{status.text}</span>
                                </div>
                                <div>
                                  <span className="block text-xs text-gray-500">Mục tiêu KPI</span>
                                  <span className="font-semibold">{TARGET_KPI}%</span>
                                </div>
                                <div>
                                  <span className="block text-xs text-gray-500">Đạt KPI 2026 / SL PTC</span>
                                  <span className="font-semibold">{row.dat_kpi_2026} / {row.sl_bg_ptc}</span>
                                </div>
                                <div>
                                  <span className="block text-xs text-gray-500">Xu hướng</span>
                                  <div className="flex flex-col gap-1">
                                    <span>{renderTrend(row.kpi_2026_dod)} HQ</span>
                                    <span>{renderTrend(row.kpi_2026_swc)} CK</span>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 border-t border-gray-50 pt-2">
                                <span className="mb-1 block text-xs font-bold text-gray-700">Hướng dẫn điều hành theo dòng dữ liệu:</span>
                                <p className={`rounded p-2 text-sm ${row.kpi_2026 < 50 ? 'border border-red-100 bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
                                  {getRecommendation(row.kpi_2026)}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                }) : (
                  <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-500">Không có dữ liệu.</td></tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
      <div className="z-30 flex items-center justify-between border-t border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 shadow-inner">
        <div className="flex flex-wrap gap-4 font-medium">
          <span className="flex items-center gap-1 text-red-700"><Flame size={14} /> {DASHBOARD_STATUS.highRisk} ({summary.highRisk})</span>
          <span className="flex items-center gap-1 text-amber-800"><AlertCircle size={14} /> {DASHBOARD_STATUS.warning} ({summary.warning})</span>
          <span className="flex items-center gap-1 text-amber-700"><Eye size={14} /> {DASHBOARD_STATUS.attention} ({summary.attention})</span>
          <span className="flex items-center gap-1 text-green-700"><Award size={14} /> {DASHBOARD_STATUS.good} ({summary.good})</span>
        </div>
        <div style={{ color: DASHBOARD_SEMANTIC_COLORS.neutral }}>Hiển thị {processedData.length} đơn vị</div>
      </div>
    </div>
  );
}
