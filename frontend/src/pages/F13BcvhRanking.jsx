import { useState, useEffect } from 'react';
import axios from 'axios';
import GlobalFilter from '../components/f13/GlobalFilter';
import BcvhTable from '../components/BcvhTable';
import LegendColor from '../components/f13/LegendColor';

const getPastDateString = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
};

export default function F13BcvhRanking() {
    const [filters, setFilters] = useState({
        fromDate: getPastDateString(7),
        toDate: getPastDateString(1),
        ma_bcvh: 'all'
    });

    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRanking = async () => {
            setLoading(true);
            try {
                const params = {
                    fromDate: filters.fromDate,
                    toDate: filters.toDate,
                    ma_bcvh: filters.ma_bcvh
                };
                const res = await axios.get('http://localhost:5050/api/f13/bcvh-ranking', { params });
                if (res.data.success) {
                    setTableData(res.data.data);
                }
            } catch (error) {
                console.error("Error fetching bcvh ranking", error);
            }
            setLoading(false);
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

            <GlobalFilter filters={filters} onChange={setFilters} />

            {loading && <div className="text-center py-4 text-vnpost-blue">Đang tải dữ liệu...</div>}

            {!loading && (
                <>
                    <BcvhTable data={tableData} />
                    <LegendColor />
                </>
            )}
        </div>
    );
}
