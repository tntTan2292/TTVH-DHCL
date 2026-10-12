import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Target, Activity, Settings, Database, Info, FileSpreadsheet, ChevronLeft, ChevronRight, BarChart2, ChevronDown, MapPin, Users } from 'lucide-react';

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({
    'Quản lý chất lượng': true,
    'F1.1 – Chất lượng toàn trình nội tỉnh': true,
    'F1.2 – Thu gom liên tỉnh': true,
    'F1.3 – Chất lượng phát liên tỉnh': true,
    'Quản lý mạng lưới': false,
    'Quản trị hệ thống': false,
  });

  const toggleGroup = (groupTitle) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }));
  };

  const menuItems = [
    {
      title: 'Quản lý chất lượng',
      icon: <Activity size={20} />,
      subItems: [
        {
          title: 'F1.1 – Chất lượng toàn trình nội tỉnh',
          name: 'F1.1 – Chất lượng toàn trình nội tỉnh',
          icon: <Activity size={18} />,
          subItems: [
            { name: 'Bảng điều hành', path: '/f11/dashboard', icon: <Target size={18} /> },
            { name: 'Phân tích BCVH', path: '/f11/ranking/bcvh', icon: <BarChart2 size={18} /> },
          ],
        },
        {
          title: 'F1.2 – Thu gom liên tỉnh',
          name: 'F1.2 – Thu gom liên tỉnh',
          icon: <Activity size={18} />,
          subItems: [
            { name: 'Bảng điều hành', path: '/f12/dashboard', icon: <Target size={18} /> },
            { name: 'Phân tích đơn vị chấp nhận', path: '/f12/ranking/bcvh', icon: <BarChart2 size={18} /> },
          ],
        },
        {
          title: 'F1.3 – Chất lượng phát liên tỉnh',
          name: 'F1.3 – Chất lượng phát liên tỉnh',
          icon: <Target size={18} />,
          subItems: [
            { name: 'Bảng điều hành', path: '/f13/dashboard', icon: <Target size={18} /> },
            { name: 'Phân tích BCVH', path: '/f13/ranking/bcvh', icon: <BarChart2 size={18} /> },
            { name: 'Phân tích tuyến phát', path: '/f13/ranking/route', icon: <BarChart2 size={18} /> },
            { name: 'Dữ liệu minh chứng', path: '/f13/evidence', icon: <Database size={18} /> },
          ],
        },
        {
          title: 'F4.1 – Chất lượng phát thành công bưu cục',
          name: 'F4.1 – Chất lượng phát thành công bưu cục',
          icon: <Activity size={18} />,
          subItems: [
            { name: 'Bảng điều hành', path: '/f41/dashboard', icon: <Target size={18} /> },
            { name: 'Phân tích BCVH', path: '/f41/ranking/bcvh', icon: <BarChart2 size={18} /> },
          ],
        },
      ],
    },
    {
      title: 'Quản lý mạng lưới',
      icon: <MapPin size={20} />,
      subItems: [
        { name: 'Mạng điểm phục vụ', path: '/network-map/service-points', icon: <MapPin size={18} /> },
        { name: 'Mạng đường thư cấp 2', path: '/network-map/level2-routes', icon: <MapPin size={18} /> },
        { name: 'Sơ đồ tuyến phát', path: '/network-map/delivery-routes', icon: <MapPin size={18} /> },
        { name: 'Bản đồ tích hợp', path: '/network-map/integrated', icon: <MapPin size={18} /> },
        { name: 'Rà soát danh mục bưu tá', path: '/network-map/postman-catalog', icon: <Users size={18} /> },
      ],
    },
    {
      title: 'Quản trị hệ thống',
      icon: <Settings size={20} />,
      roles: ['admin'],
      subItems: [
        { name: 'Trung tâm nạp dữ liệu', path: '/import', icon: <FileSpreadsheet size={18} /> },
        { name: 'Cấu hình chỉ tiêu', path: '/kpi-config', icon: <Settings size={18} /> },
        { name: 'Thông tin hệ thống', path: '/system-info', icon: <Info size={18} /> },
      ],
    },
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}
      <aside className={`fixed md:relative inset-y-0 left-0 ${isCollapsed ? 'md:w-20' : 'md:w-[280px]'} w-[280px] glass-sidebar text-white flex flex-col shadow-2xl z-50 transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* Brand Header */}
        <div className={`p-5 border-b border-white/10 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-3 relative min-h-[72px]`}>
          <Link to="/" className="flex items-center gap-3 overflow-hidden group">
            {!isCollapsed && (
              <div className="flex flex-col">
                <h1 className="font-black text-xl tracking-wide text-white drop-shadow-sm flex items-center gap-1.5">
                  <span>TTVH</span>
                  <span className="text-white/40">-</span>
                  <span className="text-[var(--color-vnpost-orange)] font-extrabold group-hover:brightness-110 transition-all">DHCL</span>
                </h1>
                <p className="text-[11px] font-semibold text-blue-200/90 uppercase tracking-[0.16em] mt-0.5 drop-shadow-xs">
                  Bưu điện TP Huế
                </p>
              </div>
            )}
            {isCollapsed && (
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/20 text-[var(--color-vnpost-orange)] font-black text-sm shadow-inner">
                DHCL
              </div>
            )}
          </Link>
          <button 
            onClick={onToggleCollapse}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-r from-vnpost-orange to-amber-500 text-[#003E7E] rounded-full items-center justify-center shadow-md border border-white/30 hover:scale-110 active:scale-95 transition-transform z-50 cursor-pointer"
            aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1">
            {menuItems.map((item, idx) => {
              // Flat item
              if (!item.subItems) {
                return (
                  <li key={item.path || idx}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => 
                        `relative flex items-center py-2.5 mx-3 rounded-xl transition-all duration-200 group ${isCollapsed ? 'justify-center px-0' : 'px-4'} ${
                          isActive 
                            ? 'bg-white/15 text-white font-bold backdrop-blur-md border border-white/20 shadow-xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-vnpost-orange' 
                            : 'text-blue-100/90 hover:bg-white/10 hover:text-white border border-transparent'
                        }`
                      }
                    >
                      <div className="flex-shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-transform">{item.icon}</div>
                      {!isCollapsed && <span className="ml-3 whitespace-nowrap text-sm font-semibold">{item.name}</span>}
                    </NavLink>
                  </li>
                );
              }

              // Tree item
              const isExpanded = expandedGroups[item.title];
              const isGroupActive = item.subItems.some((sub) => {
                if (sub.subItems) {
                  return sub.subItems.some((nested) => location.pathname === nested.path);
                }
                return location.pathname === sub.path;
              });

              return (
                <li key={item.title || idx} className="pt-2">
                  {!isCollapsed ? (
                    <button
                      onClick={() => toggleGroup(item.title)}
                      className={`w-full flex items-center justify-between px-5 py-2.5 transition-all duration-200 group text-xs uppercase tracking-wider font-bold ${
                        isGroupActive ? 'text-white' : 'text-blue-200/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 opacity-80 group-hover:opacity-100">{item.icon}</div>
                        <span className="ml-3 whitespace-nowrap text-xs uppercase tracking-wide font-bold">{item.title}</span>
                      </div>
                      <ChevronDown size={14} className={`transition-transform duration-200 text-white/60 ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                    </button>
                  ) : (
                    <div className="flex items-center justify-center py-3 text-blue-200 group relative">
                      <div className="flex-shrink-0 opacity-80 group-hover:opacity-100">{item.icon}</div>
                    </div>
                  )}

                  {/* Sub items */}
                  {(!isCollapsed && isExpanded) && (
                    <ul className="mt-1 space-y-1 bg-black/15 py-2 rounded-xl mx-2 border border-white/5">
                      {item.subItems.map((sub) => {
                        if (!sub.subItems) {
                          return (
                            <li key={sub.path || sub.name}>
                              <NavLink
                                to={sub.path}
                                className={({ isActive }) =>
                                  `relative flex items-center py-2 pl-10 pr-4 mx-1.5 rounded-lg transition-all duration-200 text-xs font-medium ${
                                    isActive 
                                      ? 'bg-white/15 text-white font-bold backdrop-blur-xs border border-white/15 shadow-2xs before:absolute before:left-5 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-vnpost-orange' 
                                      : 'text-blue-200/80 hover:text-white hover:bg-white/10'
                                  }`
                                }
                              >
                                <div className="flex-shrink-0 opacity-70 scale-90">{sub.icon}</div>
                                <span className="ml-2.5 whitespace-nowrap text-xs">{sub.name}</span>
                              </NavLink>
                            </li>
                          );
                        }

                        // Nested sub items (e.g. F1.3)
                        const isSubExpanded = expandedGroups[sub.title || sub.name];
                        const isSubActive = sub.subItems.some((nested) => location.pathname === nested.path);

                        return (
                          <li key={sub.title || sub.name} className="pt-0.5">
                            <button
                              onClick={() => toggleGroup(sub.title || sub.name)}
                              className={`w-full flex items-center justify-between py-2 pl-8 pr-4 mx-1.5 rounded-lg transition-all duration-200 text-xs ${
                                isSubActive ? 'font-bold text-white' : 'text-blue-200/80 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className="flex-shrink-0 opacity-70 scale-90">{sub.icon}</div>
                                <span className="ml-2.5 whitespace-nowrap text-xs font-semibold">{sub.name || sub.title}</span>
                              </div>
                              <ChevronDown size={12} className={`transition-transform duration-200 text-white/50 ${isSubExpanded ? 'rotate-180 text-white' : ''}`} />
                            </button>

                            {isSubExpanded && (
                              <ul className="mt-1 space-y-0.5 bg-black/20 py-1.5 rounded-lg mx-1.5 border-l-2 border-white/10 pl-2">
                                {sub.subItems.map((nested) => (
                                  <li key={nested.path}>
                                    <NavLink
                                      to={nested.path}
                                      className={({ isActive }) =>
                                        `relative flex items-center py-1.5 pl-6 pr-3 rounded-md transition-all duration-200 text-xs ${
                                          isActive 
                                            ? 'bg-white/15 text-white font-bold backdrop-blur-xs border border-white/15 shadow-2xs before:absolute before:left-2 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-vnpost-orange' 
                                            : 'text-blue-200/70 hover:text-white hover:bg-white/10'
                                        }`
                                      }
                                    >
                                      <div className="flex-shrink-0 opacity-70 scale-75">{nested.icon}</div>
                                      <span className="ml-2 whitespace-nowrap text-[12px]">{nested.name}</span>
                                    </NavLink>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
