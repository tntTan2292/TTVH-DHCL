import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ShieldCheck, LoaderCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const fromLocation = location.state?.from;
    const from = fromLocation
        ? `${fromLocation.pathname || '/'}${fromLocation.search || ''}${fromLocation.hash || ''}`
        : '/f13/dashboard';

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await login(username, password);
            if (res?.data?.user?.must_change_password) {
                navigate('/change-password', { replace: true });
            } else {
                navigate(from, { replace: true });
            }
        } catch (err) {
            setError(err?.message || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center bg-glass-canvas p-4 sm:p-6 overflow-hidden">
            {/* Ambient decorative glass refraction orbs */}
            <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-blue-300/25 blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />
            <div className="absolute top-2/3 left-1/3 w-64 h-64 rounded-full bg-indigo-200/25 blur-2xl pointer-events-none" />

            {/* Main Showcase Glass Card */}
            <div className="relative w-full max-w-md glass-card p-8 sm:p-10 shadow-2xl border border-white/80">
                {/* Header & Brand Emblem */}
                <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-vnpost-blue)] to-[#003E7E] flex items-center justify-center text-white shadow-lg shadow-blue-900/15 ring-4 ring-white/80 mb-4 transition-transform hover:scale-105">
                        <ShieldCheck className="w-7 h-7 text-white" />
                    </div>
                    
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                        <span>Đăng nhập</span>
                        <span className="text-[var(--color-vnpost-blue)]">hệ thống</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                        Bưu điện thành phố Huế · Trung Tâm Vận hành
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        Hệ thống Điều hành chất lượng
                    </p>
                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50/80 border border-blue-200/60 text-[11px] font-semibold text-blue-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-vnpost-blue)] animate-pulse" />
                        <span>Dùng tài khoản runtime để vào hệ thống</span>
                    </div>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                    {/* Username Field */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                            Tên đăng nhập (Username)
                        </label>
                        <div className="relative flex items-center">
                            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                                <User className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Nhập tên đăng nhập..."
                                autoComplete="username"
                                className="w-full input-glass pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                            Mật khẩu (Password)
                        </label>
                        <div className="relative flex items-center">
                            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                                <Lock className="h-4 w-4" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Nhập mật khẩu..."
                                autoComplete="current-password"
                                className="w-full input-glass pl-10 pr-10 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-md transition-colors"
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-red-200/80 bg-red-50/90 p-3 text-xs text-red-700 backdrop-blur-xs animate-shake">
                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="font-medium leading-relaxed">{error}</span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-glass btn-glass-primary py-3 px-4 text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <LoaderCircle className="h-4 w-4 animate-spin text-white" />
                                <span>Đang đăng nhập...</span>
                            </>
                        ) : (
                            <span>Đăng nhập hệ thống</span>
                        )}
                    </button>
                </form>

                {/* Footer note */}
                <div className="mt-8 pt-5 border-t border-slate-100/80 text-center">
                    <p className="text-[11px] text-slate-600 font-medium">
                        Design by TNT
                    </p>
                </div>
            </div>
        </div>
    );
}
