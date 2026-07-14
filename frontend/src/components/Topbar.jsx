import { Menu, UserCircle, Bell, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();

  return (
    <header className="glass-header h-14 flex items-center justify-between px-4 md:px-6 shadow-sm bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="hidden sm:block text-xs md:text-sm text-gray-500 font-medium">
          Hệ thống <span className="hidden lg:inline">Điều hành Chất lượng</span>{' '}
          <span className="mx-1 md:mx-2 text-vnpost-blue font-bold">•</span> VNPost Huế
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <button className="text-gray-400 hover:text-vnpost-blue transition-colors p-2 rounded-full hover:bg-blue-50 relative">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="relative flex items-center gap-2">
          <button className="flex items-center gap-2 border-l border-gray-100 pl-3 md:pl-4 group">
            <div className="text-right hidden sm:block">
              <p className="text-xs md:text-sm font-bold text-gray-700 leading-tight group-hover:text-vnpost-blue transition-colors">
                {user?.display_name || 'Quản trị viên'}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-tighter font-semibold">
                {user?.role || 'Admin'}
              </p>
            </div>
            <div className="relative">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-vnpost-blue to-blue-700 flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-sm overflow-hidden">
                <UserCircle size={24} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <ChevronDown size={14} className="text-gray-400 transition-transform" />
          </button>

          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
