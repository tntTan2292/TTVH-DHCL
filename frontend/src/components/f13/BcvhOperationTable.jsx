import { useState, useEffect, useMemo, Fragment } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Maximize2, Minimize2, Flame, Eye, Award } from 'lucide-react';
import api from '../../api/client';

export default function BcvhOperationTable({ globalFilter }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });
  const [expandedRows, setExpandedRows] = useState({});

  const DEFAULT_BCVHs = ['Thuận Hóa', 'Thuận An', 'Hương Thủy', 'Phú Lộc', 'Hương Trà', 'A Lưới'];
  const TARGET_KPI = 95.0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = {
          fromDate: globalFilter.dateRange[0],
          toDate: globalFilter.dateRange[1],
        };
        // Fixed endpoint path
        const response = await api.get('/f13/ranking/bcvh', { params });
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

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const toggleRow = (ma_bcvh) => {
    setExpandedRows(prev => ({ ...prev, [ma_bcvh]: !prev[ma_bcvh] }));
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
    
    // Priority Order logic: Bring critical units to top if not strictly sorting by something else
    if (sortConfig.key === 'rank' && sortConfig.direction === 'asc') {
        sorted.sort((a, b) => {
            const aCrit = a.kpi_rate < 90 ? 1 : 0;
            const bCrit = b.kpi_rate < 90 ? 1 : 0;
            if (aCrit !== bCrit) return bCrit - aCrit; // critical first
            return 0;
        });
    }

    if (!showAll) {
      sorted = sorted.filter(item => DEFAULT_BCVHs.some(name => item.ten_bcvh.includes(name)));
    }
    return sorted;
  }, [data, sortConfig, showAll]);

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

  const summary = useMemo(() => {
    return {
      xanh: data.filter(d => d.kpi_rate >= 70).length,
      hong: data.filter(d => d.kpi_rate >= 60 && d.kpi_rate < 70).length,
      vang: data.filter(d => d.kpi_rate >= 50 && d.kpi_rate < 60).length,
      do: data.filter(d => d.kpi_rate < 50).length
    };
  }, [data]);

  const getBusinessStatus = (rate) => {
    if (rate >= 70) return { text: 'Xanh', color: 'text-green-600 bg-green-50', flag: 'XANH', icon: <Award size={12}/> };
    if (rate >= 60) return { text: 'Hồng', color: 'text-pink-500 bg-pink-50', flag: 'HỒNG', icon: <Eye size={12}/> };
    if (rate >= 50) return { text: 'Vàng', color: 'text-yellow-600 bg-yellow-50', flag: 'VÀNG', icon: <AlertCircle size={12}/> };
    return { text: 'Đỏ', color: 'text-red-600 bg-red-50 font-bold', flag: 'ĐỎ', icon: <Flame size={12}/> };
  };

  const getRecommendation = (rate) => {
    if (rate >= 95) return "Duy trì phong độ phát xuất sắc. Khuyến khích tuyên dương tuyến.";
    if (rate >= 90) return "Cần theo dõi sát dòng bưu gửi chậm để tránh tụt xuống mức rủi ro.";
    return "YÊU CẦU ĐIỀU PHỐI GẤP: Rà soát ngay bưu tá tuyến, tăng cường xe tải hoặc nhân lực ca chiều.";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 flex flex-col">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="font-bold text-gray-800 uppercase tracking-wide text-sm">
          Bảng Điều Hành BCVH (Operation Table)
        </h3>
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
        >
          {showAll ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {showAll ? 'CHỈ HIỂN THỊ TRỌNG ĐIỂM' : 'SHOW ALL'}
        </button>
      </div>

      <div className="overflow-x-auto relative w-full" style={{ maxHeight: '600px' }}>
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-gray-100 text-gray-600 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 sticky left-0 z-30 bg-gray-100 shadow-[1px_0_0_#e5e7eb] w-1/4" onClick={() => requestSort('ten_bcvh')}>
                Tên BCVH {sortConfig.key === 'ten_bcvh' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
              </th>
              <th className="px-4 py-3 text-center w-24">Status</th>
              <th className="px-4 py-3 cursor-pointer text-right hover:bg-gray-200" onClick={() => requestSort('total_bg')}>
                Tổng Bưu Gửi
              </th>
              <th className="px-4 py-3 cursor-pointer text-right hover:bg-gray-200" onClick={() => requestSort('failed_bg')}>
                Chậm chỉ tiêu
              </th>
              <th className="px-4 py-3 cursor-pointer text-right hover:bg-gray-200 min-w-[120px]" onClick={() => requestSort('kpi_rate')}>
                KPI 2026 (%) 
              </th>
              <th className="px-4 py-3 text-right text-gray-400 font-normal">+/- HQ</th>
              <th className="px-4 py-3 cursor-pointer text-center hover:bg-gray-200" onClick={() => requestSort('rank')}>
                Hạng
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, idx) => (
                <tr key={idx} className="border-b animate-pulse">
                  <td className="px-4 py-4 bg-white sticky left-0"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                  <td colSpan="6" className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                </tr>
              ))
            ) : (
              <>
                <tr className="bg-blue-50/80 font-bold border-b border-blue-100 sticky top-[45px] z-10 shadow-sm text-vnpost-blue-dark">
                  <td className="px-4 py-3 sticky left-0 z-20 bg-blue-50/95 shadow-[1px_0_0_#dbeafe]">TỔNG CỘNG</td>
                  <td className="px-4 py-3 text-center">-</td>
                  <td className="px-4 py-3 text-right">{totals.total_bg.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right text-red-600">{totals.failed_bg.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right">
                    {totals.kpi_rate.toFixed(2)}%
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div className="bg-vnpost-blue h-1.5 rounded-full" style={{ width: `${Math.min(totals.kpi_rate, 100)}%` }}></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">-</td>
                  <td className="px-4 py-3 text-center">-</td>
                </tr>

                {processedData.length > 0 ? processedData.map((row) => {
                  const status = getBusinessStatus(row.kpi_rate);
                  const isExpanded = expandedRows[row.ma_bcvh];
                  const gap = (TARGET_KPI - row.kpi_rate).toFixed(2);
                  
                  return (
                    <Fragment key={row.ma_bcvh}>
                      <tr 
                        onClick={() => toggleRow(row.ma_bcvh)}
                        className={`border-b hover:bg-gray-50 transition-colors cursor-pointer ${row.kpi_rate < 90 ? 'bg-red-50/30' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800 sticky left-0 z-0 bg-white shadow-[1px_0_0_#f3f4f6]">
                          <div className="flex items-center justify-between">
                            <span>{row.ten_bcvh}</span>
                            {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${status.color}`}>
                            {status.icon} {status.flag}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{row.total_bg.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{row.failed_bg.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right">
                          <div className={`font-bold ${status.color.split(' ')[0]}`}>{row.kpi_rate.toFixed(2)}%</div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div className={`${status.color.split(' ')[0].replace('text-', 'bg-')} h-1.5 rounded-full`} style={{ width: `${Math.min(row.kpi_rate, 100)}%` }}></div>
                          </div>
                          {gap > 0 && <div className="text-[9px] text-gray-500 mt-0.5 text-right">Thiếu {gap}%</div>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400 text-xs">-</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-700">#{row.rank}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50/80 border-b border-gray-100">
                          <td colSpan="7" className="px-4 py-3 text-sm">
                            <div className="flex flex-col gap-2 p-2 bg-white rounded border border-gray-100 shadow-inner">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <span className="block text-xs text-gray-500">Trạng thái</span>
                                  <span className={`font-semibold ${status.color.split(' ')[0]}`}>{status.text}</span>
                                </div>
                                <div>
                                  <span className="block text-xs text-gray-500">Mục tiêu KPI</span>
                                  <span className="font-semibold">{TARGET_KPI}%</span>
                                </div>
                                <div>
                                  <span className="block text-xs text-gray-500">Đạt / Tổng</span>
                                  <span className="font-semibold">{row.passed_bg} / {row.total_bg}</span>
                                </div>
                                <div>
                                  <span className="block text-xs text-gray-500">Xu hướng (Trend)</span>
                                  <span className="text-gray-400 italic text-xs">Loading...</span>
                                </div>
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-50">
                                <span className="block text-xs font-bold text-gray-700 mb-1">Khuyến nghị điều hành:</span>
                                <p className={`text-sm p-2 rounded ${row.kpi_rate < 50 ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-50 text-gray-700'}`}>
                                  {getRecommendation(row.kpi_rate)}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                }) : (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Không có dữ liệu.</td></tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-50 p-3 text-xs text-gray-600 flex justify-between items-center border-t border-gray-200 shadow-inner z-30">
        <div className="flex gap-4 font-medium">
          <span className="text-red-600 flex items-center gap-1"><Flame size={14}/> ĐỎ ({summary.do})</span>
          <span className="text-yellow-600 flex items-center gap-1"><AlertCircle size={14}/> VÀNG ({summary.vang})</span>
          <span className="text-pink-500 flex items-center gap-1"><Eye size={14}/> HỒNG ({summary.hong})</span>
          <span className="text-green-600 flex items-center gap-1"><Award size={14}/> XANH ({summary.xanh})</span>
        </div>
        <div>Hiển thị {processedData.length} đơn vị</div>
      </div>
    </div>
  );
}
