import { useState, useEffect } from 'react';
import api from '../api/client';
import GlobalFilter from '../components/f13/GlobalFilter';
import ExecutiveSummary from '../components/f13/ExecutiveSummary';
import ExecutiveDailyBrief from '../components/f13/ExecutiveDailyBrief';
import RuleRecommendationPanel from '../components/f13/RuleRecommendationPanel';
import QualityTimelinePanel from '../components/f13/QualityTimelinePanel';
import MessageGenerationPanel from '../components/f13/MessageGenerationPanel';
import BcvhOperationTable from '../components/f13/BcvhOperationTable';

/**
 * F13Dashboard — TD § 3.1 Page: F13Dashboard
 *
 * Filter Lock (business_rules.md § 3):
 *   Mặc định: fromDate = Today - 7 | toDate = Today - 1
 *   Lý do: dữ liệu mới nhất luôn là N-1 (không có dữ liệu hôm nay trong hệ thống)
 *
 * State Flow (TD § 3.2):
 *   Thay đổi filter → trigger fetch lại tất cả 3 API cùng lúc.
 */

// Filter Lock — business_rules.md § 3: mặc định N-7 đến N-1
const getDateString = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
};

export default function F13Dashboard() {
    const [filters, setFilters] = useState(null);
    const [maxDate, setMaxDate] = useState(null);

    const [kpiData, setKpiData]     = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [topLowest, setTopLowest] = useState([]);
    const [topImpact, setTopImpact] = useState([]);
    const [bcvhList, setBcvhList]   = useState([]);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState(null);

    // Load BCVH list and Meta Data (max_date) once on mount
    useEffect(() => {
        api.get('/f13/bcvh-list')
           .then(res => { if (res.data.success) setBcvhList(res.data.data); })
           .catch(err => console.error('[F13Dashboard] bcvh-list error:', err));
           
        api.get('/f13/dashboard/meta')
           .then(res => {
               if (res.data.success && res.data.data.max_date) {
                   setMaxDate(res.data.data.max_date);
                   setFilters({
                       fromDate: res.data.data.max_date,
                       toDate: res.data.data.max_date,
                       ma_bcvh: 'all'
                   });
               }
           })
           .catch(err => console.error('[F13Dashboard] meta error:', err));
    }, []);

    // TD § 3.2: Thay đổi filter trigger fetch lại data
    useEffect(() => {
        if (!filters) return;
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    fromDate: filters.fromDate,
                    toDate  : filters.toDate,
                    ma_bcvh : filters.ma_bcvh
                };

                // Fetch 3 API cùng lúc
                const [kpiRes, trendRes, topRes] = await Promise.all([
                    api.get('/f13/dashboard/kpi',   { params }),
                    api.get('/f13/dashboard/trend', { params }),
                    api.get('/f13/dashboard/top',   { params })
                ]);

                if (kpiRes.data.success)   setKpiData(kpiRes.data.data);
                if (trendRes.data.success) setTrendData(trendRes.data.data);
                if (topRes.data.success) {
                    setTopLowest(topRes.data.data.top3Lowest);
                    setTopImpact(topRes.data.data.top3Impact);
                }
            } catch (err) {
                console.error('[F13Dashboard] fetchData error:', err);
                setError('Không thể tải dữ liệu. Vui lòng kiểm tra kết nối hoặc thử lại.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters]);

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-vnpost-blue-dark">F1.3 Dashboard</h1>
                    <p className="text-gray-500 mt-1">Chất lượng phát liên tỉnh PTC/Nộp tiền ≤14 giờ</p>
                </div>
                {maxDate && (
                    <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg inline-flex items-center">
                        <span className="text-sm font-semibold text-vnpost-blue">
                            Dữ liệu cập nhật đến: {new Date(maxDate).toLocaleDateString('vi-VN')}
                        </span>
                    </div>
                )}
            </div>

            {/* TD § 3.1: GlobalFilter — TimeFilter + BcvhFilter */}
            {filters && <GlobalFilter filters={filters} onChange={setFilters} bcvhList={bcvhList} maxDate={maxDate} />}

            {/* Loading State */}
            {loading && (
                <div className="text-center py-8 text-vnpost-blue">
                    <div className="inline-block w-6 h-6 border-2 border-vnpost-blue border-t-transparent rounded-full animate-spin mr-2" />
                    Đang tải dữ liệu...
                </div>
            )}

            {/* Error State */}
            {!loading && error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-6">
                    {error}
                </div>
            )}

            {/* TD § 3.1: KpiCards + TrendChart + TopListCard */}
            {!loading && !error && filters && (
                kpiData && kpiData.tong_buu_gui === 0 ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 text-center mt-6">
                        <div className="w-16 h-16 bg-orange-100 text-vnpost-orange rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-orange-800 mb-2">Ngày được chọn chưa có dữ liệu</h3>
                        <p className="text-orange-600 text-sm">Vui lòng chọn ngày khác nằm trong khoảng dữ liệu đã được import (Đến {maxDate ? new Date(maxDate).toLocaleDateString('vi-VN') : ''}).</p>
                    </div>
                ) : (
                    <>
                        {/* Module 1: Executive Summary */}
                        <ExecutiveSummary data={kpiData} />

                        {/* Module 2: Executive Daily Brief */}
                        <ExecutiveDailyBrief kpiData={kpiData} />

                        {/* Module 2.5: Rule Recommendation Panel */}
                        <RuleRecommendationPanel globalFilter={{ dateRange: [filters.fromDate, filters.toDate] }} />

                        {/* Module 3: BCVH Operation Table */}
                        <BcvhOperationTable globalFilter={{ dateRange: [filters.fromDate, filters.toDate] }} />

                        {/* Module 4: Quality Timeline */}
                        <QualityTimelinePanel globalFilter={{ dateRange: [filters.fromDate, filters.toDate], ma_bcvh: filters.ma_bcvh }} />

                        {/* Module 5: Message Generation */}
                        <MessageGenerationPanel globalFilter={{ dateRange: [filters.fromDate, filters.toDate] }} />
                    </>
                )
            )}
        </div>
    );
}

