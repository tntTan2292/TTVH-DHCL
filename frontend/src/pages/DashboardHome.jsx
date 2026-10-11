import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart2, CheckCircle2, Clock, CalendarCheck,
    TrendingUp, TrendingDown, ArrowRight
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { getDashboardQuickLinks } from '../navigation/appNavigation.jsx';

/**
 * DashboardHome — Trang tổng quan hệ thống (UI-GLASS-THEME-02)
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
    const { user } = useAuth();

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

    const quickLinks = getDashboardQuickLinks(user?.role);

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-vnpost-blue-dark)]">Tổng quan điều hành</h1>
                <p className="text-slate-500 mt-1 text-sm font-medium">Bưu điện thành phố Huế · Trung Tâm Vận hành · Hệ thống Điều hành chất lượng</p>
            </div>

            {loading && (
                <div className="flex items-center gap-3 text-[var(--color-vnpost-blue)] py-8 font-semibold">
                    <div className="w-5 h-5 border-2 border-[var(--color-vnpost-blue)] border-t-transparent rounded-full animate-spin" />
                    Đang tải tổng quan...
                </div>
            )}

            {!loading && (
                <>
                    {/* KPI Snapshot Row — F13_001 today */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                        {/* F1.3 Today */}
                        <div
                            className="bg-gradient-to-br from-[var(--color-vnpost-blue)] via-blue-700 to-blue-800 rounded-2xl p-6 text-white shadow-md hover:shadow-lg transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 cursor-pointer border border-white/20 select-none"
                            onClick={() => navigate('/f13/dashboard')}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">KPI F1.3 Hôm qua</p>
                                <BarChart2 size={20} className="text-blue-200" />
                            </div>
                            <p className="text-4xl font-black mb-1 tracking-tight">{fmtPct(kpiToday?.today)}</p>
                            <div className={`flex items-center gap-1.5 text-xs font-semibold mt-2 ${dodPositive ? 'text-emerald-200' : 'text-rose-200'}`}>
                                {dodPositive
                                    ? <TrendingUp size={14} />
                                    : <TrendingDown size={14} />}
                                DoD {fmtDelta(kpiToday?.dod)} so hôm kia
                            </div>
                        </div>

                        {/* Import Success Count */}
                        <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md hover:-translate-y-0.5 transition-[color,background-color,border-color,box-shadow,transform] duration-200">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Lần Import Thành Công</p>
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                    <CheckCircle2 size={18} className="text-emerald-600" />
                                </div>
                            </div>
                            <p className="text-4xl font-black text-slate-900 tracking-tight">{importStatus?.successCount ?? '—'}</p>
                            <p className="text-xs text-slate-400 mt-2 font-medium">Tổng số file đã nạp thành công</p>
                        </div>

                        {/* Last Import */}
                        <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md hover:-translate-y-0.5 transition-[color,background-color,border-color,box-shadow,transform] duration-200">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Import Gần Nhất</p>
                                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                                    <CalendarCheck size={18} className="text-[var(--color-vnpost-orange)]" />
                                </div>
                            </div>
                            <p className="text-sm font-bold text-slate-900 mt-2">
                                {importStatus?.lastImport ? fmtDate(importStatus.lastImport) : 'Chưa có dữ liệu'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1 font-medium">Thời gian đồng bộ gần nhất</p>
                        </div>
                    </div>

                    {/* Recent import log — last 5 */}
                    {importStatus?.recentLogs?.length > 0 && (
                        <div className="bg-white/95 backdrop-blur-xs rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm md:text-base">
                                    <Clock size={16} className="text-slate-400" />
                                    Nhật ký Import gần đây
                                </h2>
                                <button
                                    onClick={() => navigate('/import')}
                                    className="text-xs font-bold text-[var(--color-vnpost-blue)] hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    Xem tất cả <ArrowRight size={12} />
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/90 border-b border-slate-200/80 font-bold tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3 text-left">Thời gian</th>
                                            <th className="px-6 py-3 text-left">Tên File</th>
                                            <th className="px-6 py-3 text-right">Bưu gửi</th>
                                            <th className="px-6 py-3 text-center">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {importStatus.recentLogs.slice(0, 5).map((log) => (
                                            <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                                                <td className="px-6 py-3 text-slate-500 text-xs">{fmtDate(log.ngay_import)}</td>
                                                <td className="px-6 py-3 font-semibold text-slate-800">{log.ten_file}</td>
                                                <td className="px-6 py-3 text-right font-bold text-slate-700">
                                                    {(log.so_luong_bg ?? 0).toLocaleString('vi-VN')}
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    {log.trang_thai === 'SUCCESS'
                                                        ? <span className="px-2.5 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/80">Thành công</span>
                                                        : <span className="px-2.5 py-0.5 rounded-full text-xs bg-rose-50 text-rose-700 font-bold border border-rose-200/80">Lỗi</span>
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
                                className="bg-white/90 backdrop-blur-xs rounded-2xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md hover:border-blue-200/80 transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 text-left group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-vnpost-blue)]"
                            >
                                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-4 shadow-2xs`}>
                                    <ArrowRight size={18} className="text-white group-hover:translate-x-1 transition-transform" />
                                </div>
                                <p className="font-bold text-slate-900 mb-1 tracking-tight">{item.label}</p>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.description}</p>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
