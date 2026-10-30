import React from 'react';
import { Menu, UserCircle, Bell, ChevronDown, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_VIEWER } from '../auth/roles';
import NotificationBell from '../features/ops-journal/components/NotificationBell.jsx';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const tierLabel = user?.tier
    ? (user.tier === 'ADMIN' ? 'Quản trị viên' : user.tier === 'LEADER' ? 'Lãnh đạo' : 'Chuyên viên')
    : (user?.role === ROLE_VIEWER ? 'Viewer F1.3' : (user?.role || 'Admin'));

  return (
    <header className="glass-header h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 transition-all">
      {/* Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-xl transition-all border border-transparent hover:border-slate-200/80 active:scale-95 cursor-pointer"
          aria-label="Mở menu điều hướng"
        >
          <Menu size={22} />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs md:text-sm font-medium text-slate-600">
          <span className="font-semibold text-slate-800">Hệ thống</span>
          <span className="hidden lg:inline text-slate-600">Điều hành Chất lượng</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-vnpost-blue)] animate-pulse" />
          <span className="font-bold text-[var(--color-vnpost-blue)]">VNPost Huế</span>
        </div>
      </div>

      {/* Right Controls: Notifications & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Nhật ký điều hành: new task / report / accepted (hidden until the module ever notified this user) */}
        <NotificationBell />

        {/* User Info & Profile */}
        <div className="flex items-center gap-2.5 px-2 py-1 rounded-xl">
          <div className="text-right hidden sm:block">
            <p className="text-xs md:text-sm font-bold text-slate-800 leading-tight">
              {user?.display_name || user?.username || 'Người dùng'}
            </p>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span className="inline-block px-1.5 py-0.2 rounded-md bg-blue-50 text-[10px] font-bold uppercase tracking-wider text-blue-700 border border-blue-200/60">
                {tierLabel}
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-vnpost-blue)] to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white/80 overflow-hidden">
              <UserCircle size={24} />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
          </div>
        </div>

        {/* Change Password Button */}
        <button
          onClick={() => navigate('/change-password')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/70 hover:bg-slate-100 hover:border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs backdrop-blur-xs transition-all active:scale-95 cursor-pointer"
          title="Đổi mật khẩu"
        >
          <span className="hidden sm:inline">Đổi mật khẩu</span>
        </button>

        {/* Quick Logout Button */}
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/70 hover:bg-red-50 hover:border-red-200 hover:text-red-700 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs backdrop-blur-xs transition-all active:scale-95 cursor-pointer"
          title="Đăng xuất khỏi hệ thống"
        >
          <LogOut size={14} />
          <span className="hidden md:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
