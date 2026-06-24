import { useState, useEffect } from 'react';
import axios from 'axios';
import GlobalFilter from '../components/f13/GlobalFilter';
import KpiCards from '../components/KpiCards';
import TrendChart from '../components/f13/TrendChart';
import TopListCard from '../components/f13/TopListCard';

// Default date range: today-7 to today-1
const getPastDateString = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
};

export default function F13Dashboard() {
    const [filters, setFilters] = useState({
        fromDate: getPastDateString(7),
        toDate: getPastDateString(1),
        ma_bcvh: 'all'
    });

    const [kpiData, setKpiData] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [topLowest, setTopLowest] = useState([]);
    const [topImpact, setTopImpact] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = {
                    fromDate: filters.fromDate,
                    toDate: filters.toDate,
                    ma_bcvh: filters.ma_bcvh
                };

                const [kpiRes, trendRes, topRes] = await Promise.all([
                    axios.get('http://localhost:5050/api/f13/dashboard/kpi', { params }),
                    axios.get('http://localhost:5050/api/f13/dashboard/trend', { params }),
                    axios.get('http://localhost:5050/api/f13/dashboard/top', { params })
                ]);

                if (kpiRes.data.success) setKpiData(kpiRes.data.data);
                if (trendRes.data.success) setTrendData(trendRes.data.data);
                if (topRes.data.success) {
                    setTopLowest(topRes.data.data.top3Lowest);
                    setTopImpact(topRes.data.data.top3Impact);
                }
            } catch (error) {
                console.error("Error fetching dashboard data", error);
            }
            setLoading(false);
        };

        fetchData();
    }, [filters]);

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-vnpost-blue-dark">F1.3 Dashboard</h1>
                    <p className="text-gray-500 mt-1">Chất lượng phát liên tỉnh PTC/Nộp tiền ≤14 giờ</p>
                </div>
            </div>

            <GlobalFilter filters={filters} onChange={setFilters} />

            {loading && <div className="text-center py-4 text-vnpost-blue">Đang tải dữ liệu...</div>}

            {!loading && (
                <>
                    <KpiCards data={kpiData} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-3">
                            <TrendChart data={trendData} />
                        </div>
                        <div className="lg:col-span-1">
                            <TopListCard title="Top 3 BCVH Thấp Nhất" data={topLowest} type="lowest" />
                        </div>
                        <div className="lg:col-span-2">
                            <TopListCard title="Top 3 BCVH Kéo Giảm KPI Toàn Mạng" data={topImpact} type="impact" />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
