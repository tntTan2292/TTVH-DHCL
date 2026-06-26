import { useState, useEffect } from 'react';
import api from '../api/client';
import GlobalFilter from '../components/f13/GlobalFilter';
import BcvhTable from '../components/BcvhTable';
import LegendColor from '../components/f13/LegendColor';

// Filter Lock — business_rules.md § 3: mặc định N-7 đến N-1
const getDateString = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
};

export default function F13BcvhRanking() {
    // Filter Lock: fromDate = N-7, toDate = N-1 (business_rules.md § 3)
    const [filters, setFilters] = useState({
        fromDate: getDateString(7),
        toDate  : getDateString(1),
        ma_bcvh : 'all'
    });

    const [tableData, setTableData] = useState([]);
    const [bcvhList, setBcvhList]   = useState([]);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState(null);

    // Load BCVH list once on mount for GlobalFilter dropdown
    useEffect(() => {
        api.get('/f13/bcvh-list')
           .then(res => { if (res.data.success) setBcvhList(res.data.data); })
           .catch(err => console.error('[F13BcvhRanking] bcvh-list error:', err));
    }, []);

    useEffect(() => {
        const fetchRanking = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    fromDate: filters.fromDate,
                    toDate  : filters.toDate,
                    ma_bcvh : filters.ma_bcvh
                };
                const res = await api.get('/f13/bcvh-ranking', { params });
                if (res.data.success) setTableData(res.data.data);
            } catch (err) {
                console.error('[F13BcvhRanking] fetchRanking error:', err);
                setError('Không thể tải dữ liệu. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };

        fetchRanking();
    }, [filters]);

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-vnpost-blue-dark">F1.3 BCVH Ranking</h1>
                    <p className="text-gray-500 mt-1">Xếp hạng chất lượng F1.3 theo Bưu cục Văn hóa</p>
                </div>
            </div>

            <GlobalFilter filters={filters} onChange={setFilters} bcvhList={bcvhList} />

            {loading && (
                <div className="text-center py-8 text-vnpost-blue">
                    <div className="inline-block w-6 h-6 border-2 border-vnpost-blue border-t-transparent rounded-full animate-spin mr-2" />
                    Đang tải dữ liệu...
                </div>
            )}

            {!loading && error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-6">{error}</div>
            )}

            {!loading && !error && (
                <>
                    <BcvhTable data={tableData} />
                    <LegendColor />
                </>
            )}
        </div>
    );
}
