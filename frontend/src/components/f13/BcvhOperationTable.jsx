import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info, Maximize2, Minimize2 } from 'lucide-react';
import api from '../../api/client';

export default function BcvhOperationTable({ globalFilter }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });

  // 06 BCVH trọng điểm mặc định
  const DEFAULT_BCVHs = ['Thuận Hóa', 'Thuận An', 'Hương Thủy', 'Phú Lộc', 'Hương Trà', 'A Lưới'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = {
          fromDate: globalFilter.dateRange[0],
          toDate: globalFilter.dateRange[1],
        };
        const response = await api.get('/f13/dashboard/bcvh-ranking', { params });
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch BCVH ranking", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [globalFilter]);

  // Handler for sorting
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort and filter data
  const processedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    if (!showAll) {
      sortableItems = sortableItems.filter(item => 
        DEFAULT_BCVHs.some(name => item.ten_bcvh.includes(name))
      );
    }
    
    return sortableItems;
  }, [data, sortConfig, showAll]);

  // Calculate totals
  const totals = useMemo(() => {
    if (data.length === 0) return { total_bg: 0, passed_bg: 0, failed_bg: 0, kpi_rate: 0 };
    const t = data.reduce((acc, curr) => {
      acc.total_bg += curr.total_bg;
      acc.passed_bg += curr.passed_bg;
      acc.failed_bg += curr.failed_bg;
      return acc;
    }, { total_bg: 0, passed_bg: 0, failed_bg: 0 });
    t.kpi_rate = t.total_bg > 0 ? (t.passed_bg / t.total_bg) * 100 : 0;
    return t;
  }, [data]);

  const getStatusColor = (rate) => {
    if (rate >= 95) return 'text-green-600 bg-green-50';
    if (rate >= 90) return 'text-orange-500 bg-orange-50';
    return 'text-red-600 bg-red-50 font-semibold';
  };

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return <span className="w-4 inline-block" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="inline" /> : <ChevronDown size={14} className="inline" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 flex flex-col">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="font-bold text-gray-800 uppercase tracking-wide text-sm flex items-center gap-2">
          Bảng Điều Hành BCVH (Operation Table)
        </h3>
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-600 shadow-sm"
        >
          {showAll ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {showAll ? 'CHỈ HIỂN THỊ TRỌNG ĐIỂM' : 'SHOW ALL'}
        </button>
      </div>

      <div className="overflow-x-auto relative w-full" style={{ maxHeight: '500px' }}>
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-gray-100 text-gray-600 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 sticky left-0 z-30 bg-gray-100 shadow-[1px_0_0_#e5e7eb]" onClick={() => requestSort('ten_bcvh')}>
                Tên BCVH {renderSortIcon('ten_bcvh')}
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 text-right" onClick={() => requestSort('total_bg')}>
                Sản lượng {renderSortIcon('total_bg')}
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 text-right" onClick={() => requestSort('passed_bg')}>
                Đạt {renderSortIcon('passed_bg')}
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 text-right" onClick={() => requestSort('failed_bg')}>
                Không đạt {renderSortIcon('failed_bg')}
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 text-right" onClick={() => requestSort('kpi_rate')}>
                KPI (%) {renderSortIcon('kpi_rate')}
              </th>
              <th className="px-4 py-3 text-right text-gray-400 font-normal">
                +/- Hôm qua
              </th>
              <th className="px-4 py-3 text-right text-gray-400 font-normal">
                +/- Cùng kỳ
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 text-center" onClick={() => requestSort('rank')}>
                Xếp hạng {renderSortIcon('rank')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Skeleton Loader
              [...Array(6)].map((_, idx) => (
                <tr key={idx} className="border-b animate-pulse">
                  <td className="px-4 py-4 bg-white sticky left-0 shadow-[1px_0_0_#f3f4f6]">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div></td>
                </tr>
              ))
            ) : (
              <>
                {/* Dòng TỔNG CỘNG - Sticky Total Row */}
                <tr className="bg-blue-50/80 font-bold border-b border-blue-100 sticky top-[45px] z-10 shadow-sm text-vnpost-blue-dark">
                  <td className="px-4 py-3 sticky left-0 z-20 bg-blue-50/95 shadow-[1px_0_0_#dbeafe]">
                    TỔNG CỘNG (MẠNG LƯỚI)
                  </td>
                  <td className="px-4 py-3 text-right">{totals.total_bg.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right text-green-700">{totals.passed_bg.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right text-red-600">{totals.failed_bg.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right">{totals.kpi_rate.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-gray-400">-</td>
                  <td className="px-4 py-3 text-right text-gray-400">-</td>
                  <td className="px-4 py-3 text-center">-</td>
                </tr>
                
                {/* Dữ liệu BCVH */}
                {processedData.length > 0 ? processedData.map((row) => (
                  <tr key={row.ma_bcvh} className={`border-b hover:bg-gray-50 transition-colors group cursor-pointer ${row.kpi_rate < 90 ? 'bg-red-50/30 hover:bg-red-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-700 sticky left-0 z-0 bg-white group-hover:bg-gray-50 shadow-[1px_0_0_#f3f4f6]">
                      {row.ten_bcvh}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.total_bg.toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3 text-right text-green-600">{row.passed_bg.toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3 text-right text-red-600">{row.failed_bg.toLocaleString('vi-VN')}</td>
                    <td className={`px-4 py-3 text-right rounded ${getStatusColor(row.kpi_rate)}`}>
                      {row.kpi_rate.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {/* Gap: Frontend xử lý hoặc Backend chưa có, tạm để trống */}
                      -
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      -
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">
                      #{row.rank}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      Không có dữ liệu trong khoảng thời gian này.
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-50 p-2 px-4 text-xs text-gray-500 flex justify-between border-t border-gray-100">
        <span>Hiển thị {processedData.length} Bưu cục. Click vào dòng để xem chi tiết xuống Tuyến phát (Tính năng Drill Down).</span>
        <span>Ngưỡng cảnh báo: <strong className="text-red-500">&lt;90%</strong> | <strong className="text-orange-500">90-94.9%</strong> | <strong className="text-green-500">&gt;=95%</strong></span>
      </div>
    </div>
  );
}
