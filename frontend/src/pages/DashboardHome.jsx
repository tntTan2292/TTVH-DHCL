import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart2, CheckCircle2, Clock, CalendarCheck,
    TrendingUp, TrendingDown, UploadCloud, ArrowRight
} from 'lucide-react';
import api from '../api/client';

/**
 * DashboardHome — Trang tổng quan hệ thống
 *
 * Dữ liệu consume từ API đã APPROVE:
 *   - GET /api/import/f13/status  → lastImport, successCount, recentLogs
 *   - GET /api/f13/dashboard/kpi  → today KPI, DoD (F13_001, measurement.md § 1)
 *
 * Không có Business Logic. Chỉ hiển thị dữ liệu từ API.
 */

// business_rules.md § 3: Default filter
const getDateString = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
};

export default function DashboardHome() {
    const navigate = useNavigate();

    const [importStatus, setImportStatus] = useState(null);
    const [kpiToday, setKpiToday]         = useState(null);
    const [loading, setLoading]           = useState(true);

    useEffect(() => {
        const toDate   = getDateString(1); // N-1 per business_rules.md § 3
        const fromDate = getDateString(7);

        Promise.all([
            api.get('/import/f13/status'),
            api.get('/f13/dashboard/kpi', { params: { fromDate, toDate } })
        ])
        .then(([statusRes, kpiRes]) => {
            if (statusRes.data.success)  setImportStatus(statusRes.data.data);
            if (kpiRes.data.success)     setKpiToday(kpiRes.data.data);
        })
        .catch(err => console.error('[DashboardHome] fetch error:', err))
        .finally(() => setLoading(false));
    }, []);

    // Format helpers — business_rules.md § 5
    const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('vi-VN') : '—';
    const fmtPct  = (val) => val != null ? `${val}%` : '—';
    const fmtDelta= (val) => val != null ? `${val > 0 ? '+' : ''}${val}%` : '—';

    const dodPositive = (kpiToday?.dod ?? 0) >= 0;

    const quickLinks = [
        { label: 'F1.3 Dashboard',      path: '/f13/dashboard',      color: 'bg-vnpost-blue',   description: 'KPI chất lượng phát liên tỉnh' },
        { label: 'Xếp hạng BCVH',       path: '/f13/ranking/bcvh',   color: 'bg-green-600',     description: 'So sánh hiệu quả theo bưu cục' },
        { label: 'Data Import Center',   path: '/import',             color: 'bg-vnpost-orange', description: 'Nạp & quản lý dữ liệu Excel' },
    ];

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-vnpost-blue-dark">Dashboard Tổng Quan</h1>
                <p className="text-gray-500 mt-1">Hệ thống điều hành chất lượng TTVH-DHCL · VNPost Huế</p>
            </div>

            {loading && (
                <div className="flex items-center gap-3 text-vnpost-blue py-8">
                    <div className="w-5 h-5 border-2 border-vnpost-blue border-t-transparent rounded-full animate-spin" />
                    Đang tải tổng quan...
                </div>
            )}

            {!loading && (
                <>
                    {/* KPI Snapshot Row — F13_001 today */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

                        {/* F1.3 Today */}
                        <div
                            className="bg-gradient-to-br from-vnpost-blue to-blue-700 rounded-2xl p-6 text-white shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => navigate('/f13/dashboard')}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-blue-100 text-xs font-semibold uppercase tracking-wide">KPI F1.3 Hôm qua</p>
                                <BarChart2 size={20} className="text-blue-200" />
                            </div>
                            <p className="text-4xl font-black mb-1">{fmtPct(kpiToday?.today)}</p>
                            <div className={`flex items-center gap-1.5 text-xs font-semibold mt-2 ${dodPositive ? 'text-green-200' : 'text-red-200'}`}>
                                {dodPositive
                                    ? <TrendingUp size={14} />
                                    : <TrendingDown size={14} />}
                                DoD {fmtDelta(kpiToday?.dod)} so hôm kia
                            </div>
                        </div>

                        {/* Import Success Count */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Lần Import Thành Công</p>
                                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center">
                                    <CheckCircle2 size={18} className="text-green-600" />
                                </div>
                            </div>
                            <p className="text-4xl font-black text-gray-800">{importStatus?.successCount ?? '—'}</p>
                            <p className="text-xs text-gray-400 mt-2">Tổng số file đã nạp thành công</p>
                        </div>

                        {/* Last Import */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Import Gần Nhất</p>
                                <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center">
                                    <CalendarCheck size={18} className="text-vnpost-orange" />
                                </div>
                            </div>
                            <p className="text-sm font-bold text-gray-800 mt-2">
                                {importStatus?.lastImport ? fmtDate(importStatus.lastImport) : 'Chưa có dữ liệu'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Thời gian đồng bộ gần nhất</p>
                        </div>
                    </div>

                    {/* Recent import log — last 5 */}
                    {importStatus?.recentLogs?.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Clock size={16} className="text-gray-400" />
                                    Nhật ký Import gần đây
                                </h2>
                                <button
                                    onClick={() => navigate('/import')}
                                    className="text-xs font-semibold text-vnpost-blue hover:underline flex items-center gap-1"
                                >
                                    Xem tất cả <ArrowRight size={12} />
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-3 text-left font-semibold">Thời gian</th>
                                            <th className="px-6 py-3 text-left font-semibold">Tên File</th>
                                            <th className="px-6 py-3 text-right font-semibold">Bưu gửi</th>
                                            <th className="px-6 py-3 text-center font-semibold">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importStatus.recentLogs.slice(0, 5).map((log) => (
                                            <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3 text-gray-500 text-xs">{fmtDate(log.ngay_import)}</td>
                                                <td className="px-6 py-3 font-medium text-gray-800">{log.ten_file}</td>
                                                <td className="px-6 py-3 text-right font-bold text-gray-700">
                                                    {(log.so_luong_bg ?? 0).toLocaleString('vi-VN')}
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    {log.trang_thai === 'SUCCESS'
                                                        ? <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 font-bold">Thành công</span>
                                                        : <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800 font-bold">Lỗi</span>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Quick Links */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {quickLinks.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-0.5 text-left group"
                            >
                                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                                    <ArrowRight size={18} className="text-white group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <p className="font-bold text-gray-800 mb-1">{item.label}</p>
                                <p className="text-xs text-gray-500">{item.description}</p>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

