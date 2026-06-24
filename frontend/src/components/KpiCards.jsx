import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function KpiCards({ refreshTrigger, dateRange }) {
    const [data, setData] = useState({ total_bg: 0, passed_bg: 0, failed_bg: 0, kpi_rate: 0 });

    useEffect(() => {
        async function fetchSummary() {
            try {
                const res = await api.get('/kpi/summary', {
                    params: dateRange
                });
                if (res.data.success) setData(res.data.data);
            } catch (err) {
                console.error("Failed to fetch KPI summary", err);
            }
        }
        fetchSummary();
    }, [refreshTrigger, dateRange]);

    const getKpiColor = (rate) => {
        if (rate >= 70) return 'text-green-500';
        if (rate >= 60) return 'text-pink-500';
        if (rate >= 50) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-500">Tổng sản lượng</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{data.total_bg.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-500">Đạt chuẩn</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{data.passed_bg.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-500">Không đạt</p>
                <p className="text-3xl font-bold text-red-500 mt-2">{data.failed_bg.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-500">Tỷ lệ KPI</p>
                <p className={`text-3xl font-bold mt-2 ${getKpiColor(data.kpi_rate)}`}>
                    {data.kpi_rate}%
                </p>
            </div>
        </div>
    );
}
