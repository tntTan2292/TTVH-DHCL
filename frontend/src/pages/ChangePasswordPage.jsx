import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [serverProblems, setServerProblems] = useState([]);
  const [success, setSuccess] = useState(false);

  const mustChange = Boolean(user?.must_change_password);

  // Client-side rule indicators
  const hasMinLength = newPassword.length >= 8;
  const hasUpperAndLower = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isDifferentFromUsername = !user?.username || (newPassword.toLowerCase() !== user.username.toLowerCase());
  const isDifferentFromCurrent = !currentPassword || (newPassword !== currentPassword);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setServerProblems([]);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Vui lòng điền đầy đủ tất cả các trường mật khẩu.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu mới và xác nhận mật khẩu không khớp.');
      return;
    }

    if (!hasMinLength || !hasUpperAndLower || !hasSpecial) {
      setErrorMessage('Mật khẩu mới chưa đáp ứng đầy đủ các quy tắc an toàn.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1000);
    } catch (err) {
      setLoading(false);
      if (err?.problems && Array.isArray(err.problems)) {
        setServerProblems(err.problems);
      }
      if (err?.code === 'WRONG_CURRENT_PASSWORD') {
        setErrorMessage('Mật khẩu hiện tại không đúng.');
      } else if (err?.code === 'WEAK_PASSWORD') {
        setErrorMessage(err.message || 'Mật khẩu mới không đáp ứng chính sách bảo mật.');
      } else {
        setErrorMessage(err?.message || 'Có lỗi xảy ra khi đổi mật khẩu.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-glass-canvas flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans">
      {/* Header bar with Logout / Back */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-lg text-slate-800">TTVH</span>
          <span className="text-slate-400 font-bold">-</span>
          <span className="font-extrabold text-lg text-[var(--color-vnpost-orange)]">DHCL</span>
          <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold ml-2 hidden sm:inline">
            Bưu điện TP Huế
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!mustChange ? (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white/80 hover:bg-white text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Quay lại</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white/80 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
          {/* Title and Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-vnpost-blue)] to-blue-700 text-white shadow-md mb-3">
              <ShieldCheck size={26} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {mustChange ? 'Đổi mật khẩu lần đầu' : 'Đổi mật khẩu'}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              {mustChange
                ? 'Đây là lần đăng nhập đầu tiên. Bạn bắt buộc phải đổi mật khẩu khởi tạo để kích hoạt tài khoản và tiếp tục.'
                : 'Cập nhật mật khẩu định kỳ để nâng cao bảo mật tài khoản.'}
            </p>
          </div>

          {/* Success Message */}
          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-center text-sm font-bold text-emerald-800 shadow-2xs">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-600" />
              Đổi mật khẩu thành công! Đang chuyển hướng...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Alert */}
              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-800 shadow-2xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">{errorMessage}</p>
                    {serverProblems.length > 0 ? (
                      <ul className="list-disc pl-4 space-y-0.5 text-red-700">
                        {serverProblems.map((prob, idx) => (
                          <li key={idx}>{prob}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Current Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu hiện tại
                </label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[var(--color-vnpost-blue)] focus:ring-2 focus:ring-[var(--color-vnpost-blue)]/20 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showCurrent ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu mới
                </label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[var(--color-vnpost-blue)] focus:ring-2 focus:ring-[var(--color-vnpost-blue)]/20 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[var(--color-vnpost-blue)] focus:ring-2 focus:ring-[var(--color-vnpost-blue)]/20 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Policy Rules Checklist */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-1.5 text-xs">
                <p className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                  Quy chuẩn mật khẩu an toàn:
                </p>
                <div className="space-y-1">
                  <div className={`flex items-center gap-2 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <CheckCircle2 size={13} className={hasMinLength ? 'text-emerald-600' : 'text-slate-300'} />
                    <span>Tối thiểu 8 ký tự</span>
                  </div>
                  <div className={`flex items-center gap-2 ${hasUpperAndLower ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <CheckCircle2 size={13} className={hasUpperAndLower ? 'text-emerald-600' : 'text-slate-300'} />
                    <span>Có ít nhất 1 chữ in hoa (A-Z) và 1 chữ in thường (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${hasSpecial ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <CheckCircle2 size={13} className={hasSpecial ? 'text-emerald-600' : 'text-slate-300'} />
                    <span>Có ít nhất 1 ký tự đặc biệt (ví dụ: !@#$%^&*...)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${isDifferentFromUsername && isDifferentFromCurrent && newPassword ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <CheckCircle2 size={13} className={isDifferentFromUsername && isDifferentFromCurrent && newPassword ? 'text-emerald-600' : 'text-slate-300'} />
                    <span>Khác tên đăng nhập và khác mật khẩu hiện tại</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--color-vnpost-blue)] to-blue-700 hover:brightness-110 active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Xác nhận đổi mật khẩu</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] font-medium text-slate-500">
        © 2026 Bưu điện tỉnh Thừa Thiên Huế — Hệ thống Điều hành Chất lượng (QIS)
      </div>
    </div>
  );
}
