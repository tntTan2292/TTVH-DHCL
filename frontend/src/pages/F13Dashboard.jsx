import { useState, useEffect } from 'react';
import api from '../api/client';
import GlobalFilter from '../components/f13/GlobalFilter';
import ExecutiveSummary from '../components/f13/ExecutiveSummary';
import ExecutiveDailyBrief from '../components/f13/ExecutiveDailyBrief';

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
    // Filter Lock: fromDate = N-7, toDate = N-1
    const [filters, setFilters] = useState({
        fromDate: getDateString(7),
        toDate: getDateString(1),
        ma_bcvh: 'all'
    });

    const [kpiData, setKpiData]     = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [topLowest, setTopLowest] = useState([]);
    const [topImpact, setTopImpact] = useState([]);
    const [bcvhList, setBcvhList]   = useState([]);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState(null);

    // Load BCVH list once on mount for GlobalFilter dropdown
    useEffect(() => {
        api.get('/f13/bcvh-list')
           .then(res => { if (res.data.success) setBcvhList(res.data.data); })
           .catch(err => console.error('[F13Dashboard] bcvh-list error:', err));
    }, []);

    // TD § 3.2: Thay đổi filter trigger fetch lại data
    useEffect(() => {
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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-vnpost-blue-dark">F1.3 Dashboard</h1>
                    <p className="text-gray-500 mt-1">Chất lượng phát liên tỉnh PTC/Nộp tiền ≤14 giờ</p>
                </div>
            </div>

            {/* TD § 3.1: GlobalFilter — TimeFilter + BcvhFilter */}
            <GlobalFilter filters={filters} onChange={setFilters} bcvhList={bcvhList} />

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
            {!loading && !error && (
                <>
                    {/* Module 1: Executive Summary */}
                    <ExecutiveSummary data={kpiData} />

                    {/* Module 2: Executive Daily Brief */}
                    <ExecutiveDailyBrief kpiData={kpiData} />
                </>
            )}
        </div>
    );
}

