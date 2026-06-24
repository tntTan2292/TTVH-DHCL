import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Target, Activity, Settings, Database, Info, FileSpreadsheet, Menu, ChevronLeft, ChevronRight, BarChart2, PieChart } from 'lucide-react';

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const menuGroups = [
    {
      title: 'Dashboard Tổng quan',
      items: [
        { name: 'Dashboard Home', path: '/', icon: <LayoutDashboard size={20} /> },
      ]
    },
    {
      title: 'ĐHCL F1.3 (BCVH & Tuyến)',
      items: [
        { name: 'Dashboard F1.3', path: '/f13/dashboard', icon: <Target size={20} /> },
        { name: 'Xếp hạng BCVH', path: '/f13/bcvh-ranking', icon: <BarChart2 size={20} /> },
        { name: 'Xếp hạng Tuyến', path: '/f13/route-ranking', icon: <BarChart2 size={20} /> },
        { name: 'Phân tích RCA', path: '/f13/rca', icon: <PieChart size={20} /> },
        { name: 'Phân tích Pareto', path: '/f13/pareto', icon: <PieChart size={20} /> },
      ]
    },
    {
      title: 'ĐHCL F1.1 (Phát thành công)',
      items: [
        { name: 'F1.1 Quality', path: '/f11', icon: <Activity size={20} /> },
      ]
    },
    {
      title: 'ĐHCL F1.2 (Đúng T/G)',
      items: [
        { name: 'F1.2 Quality', path: '/f12', icon: <Activity size={20} /> },
      ]
    },
    {
      title: 'ĐHCL F4.1 (Truyền TT)',
      items: [
        { name: 'F4.1 Quality', path: '/f41', icon: <Activity size={20} /> },
      ]
    },
    {
      title: 'Quản trị Hệ thống',
      items: [
        { name: 'Data Import Center', path: '/import', icon: <FileSpreadsheet size={20} /> },
        { name: 'KPI Configuration', path: '/kpi-config', icon: <Settings size={20} /> },
        { name: 'System Information', path: '/system-info', icon: <Info size={20} /> },
      ]
    }
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}
      <aside className={`fixed md:relative inset-y-0 left-0 ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64 bg-gradient-to-b from-vnpost-blue-dark to-[#002a54] text-white flex flex-col shadow-2xl z-50 transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className={`p-6 border-b border-white/10 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-4 relative`}>
          <div className="flex items-center gap-4 overflow-hidden">
            {!isCollapsed && (
              <div>
                <h1 className="font-extrabold text-sm tracking-tight text-white uppercase">
                  Portal <span className="text-vnpost-orange">TTVH-DHCL</span>
                </h1>
                <p className="text-[10px] font-bold text-blue-300 opacity-60 uppercase tracking-widest mt-0.5">
                  Bưu điện TP Huế
                </p>
              </div>
            )}
            {isCollapsed && (
              <h1 className="font-extrabold text-lg text-vnpost-orange">DHCL</h1>
            )}
          </div>
          <button 
            onClick={onToggleCollapse}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-vnpost-orange text-[#003E7E] rounded-full items-center justify-center shadow-lg hover:scale-110 transition-transform z-50"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto overflow-x-hidden">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              {!isCollapsed && (
                <p className="text-[10px] font-bold text-blue-300/50 uppercase tracking-[0.2em] px-4 mb-2">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => 
                    `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-3 rounded-xl transition-all duration-200 group relative ${isActive ? 'bg-gradient-to-r from-vnpost-orange to-orange-400 text-white font-bold shadow-lg shadow-orange-500/20' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`
                  }
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  {!isCollapsed && <span className="ml-3 whitespace-nowrap text-sm">{item.name}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
