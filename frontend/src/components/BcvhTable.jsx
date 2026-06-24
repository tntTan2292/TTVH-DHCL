import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function BcvhTable({ refreshTrigger, dateRange }) {
    const [ranking, setRanking] = useState([]);

    useEffect(() => {
        async function fetchRanking() {
            try {
                const res = await api.get('/kpi/bcvh-ranking', {
                    params: dateRange
                });
                if (res.data.success) setRanking(res.data.data);
            } catch (err) {
                console.error("Failed to fetch BCVH ranking", err);
            }
        }
        fetchRanking();
    }, [refreshTrigger, dateRange]);

    const getBadgeColor = (rate) => {
        if (rate >= 70) return 'bg-green-100 text-green-800';
        if (rate >= 60) return 'bg-pink-100 text-pink-800';
        if (rate >= 50) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800">Bảng xếp hạng BCVH</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">XH</th>
                            <th className="px-6 py-4">Tên BCVH</th>
                            <th className="px-6 py-4 text-right">Tổng BG</th>
                            <th className="px-6 py-4 text-right">Đạt</th>
                            <th className="px-6 py-4 text-right">Không đạt</th>
                            <th className="px-6 py-4 text-right">KPI (%)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {ranking.map((item) => (
                            <tr key={item.ma_bcvh} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium">{item.rank}</td>
                                <td className="px-6 py-4">{item.ten_bcvh}</td>
                                <td className="px-6 py-4 text-right">{item.total_bg.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right text-blue-600">{item.passed_bg.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right text-red-500">{item.failed_bg.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`px-3 py-1 rounded-full font-semibold ${getBadgeColor(item.kpi_rate)}`}>
                                        {item.kpi_rate}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {ranking.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    Không có dữ liệu trong khoảng thời gian này.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
