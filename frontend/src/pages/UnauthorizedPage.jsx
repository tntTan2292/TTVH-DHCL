import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-glass-canvas px-4 font-sans">
            <div className="w-full max-w-lg glass-card p-8 md:p-10 text-center shadow-2xl">
                <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-2xs">
                    <ShieldAlert className="h-8 w-8" />
                </div>
                <div className="inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider text-rose-700 bg-rose-100/70 border border-rose-200/60 mb-3">
                    403
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Không có quyền truy cập</h1>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
                    Tài khoản hiện tại chưa được cấp quyền cho khu vực này.
                </p>
                <div className="mt-8">
                    <Link
                        to="/login"
                        className="btn-glass btn-glass-primary px-6 py-3 rounded-xl shadow-md inline-flex items-center gap-2 text-sm font-bold"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Quay lại Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
