import React, { useState, useEffect, useMemo } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import CollapsedFlyout from './CollapsedFlyout';
import { Target, Activity, Settings, Database, Info, FileSpreadsheet, ChevronLeft, ChevronRight, BarChart2, ChevronDown, MapPin, Users, Pin, Search, Package } from 'lucide-react';

function normalizeNavText(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function getModuleIndicatorDot(title = '') {
  if (title.includes('F1.1')) {
    return <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0 animate-pulse" title="Phân hệ F1.1 – Nội tỉnh (Xanh lá)" />;
  }
  if (title.includes('F1.2')) {
    return <span className="inline-block h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)] shrink-0 animate-pulse" title="Phân hệ F1.2 – Thu gom (Xanh ngọc)" />;
  }
  if (title.includes('F1.3')) {
    return <span className="inline-block h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] shrink-0 animate-pulse" title="Phân hệ F1.3 – Phát liên tỉnh (Xanh dương)" />;
  }
  if (title.includes('F4.1')) {
    return <span className="inline-block h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] shrink-0 animate-pulse" title="Phân hệ F4.1 – Bưu cục (Cam)" />;
  }
  return null;
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const location = useLocation();
  const [pinnedGroups, setPinnedGroups] = useState({
    'Quản lý chất lượng': true,
    'F1.1 – Chất lượng toàn trình nội tỉnh': true,
    'F1.2 – Thu gom liên tỉnh': true,
    'F1.3 – Chất lượng phát liên tỉnh': true,
    'F4.1 – Chất lượng phát thành công bưu cục': true,
    'Quản lý mạng lưới': false,
    'Quản trị hệ thống': false,
  });
  const [hoveredGroups, setHoveredGroups] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const togglePinGroup = (groupTitle) => {
    setPinnedGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }));
    setHoveredGroups((prev) => ({
      ...prev,
      [groupTitle]: false,
    }));
  };

  const handleGroupMouseEnter = (groupTitle) => {
    setHoveredGroups((prev) => ({
      ...prev,
      [groupTitle]: true,
    }));
  };

  const handleGroupMouseLeave = (groupTitle) => {
    setHoveredGroups((prev) => ({
      ...prev,
      [groupTitle]: false,
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
        {
          name: 'Chỉ số rà soát Hàng tồn',
          title: 'Chỉ số rà soát Hàng tồn',
          path: '/hangton',
          icon: <Package size={18} />,
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

  useEffect(() => {
    menuItems.forEach((group) => {
      if (!group.subItems) return;
      const hasActiveChild = group.subItems.some((sub) => {
        if (sub.subItems) {
          return sub.subItems.some((nested) => location.pathname === nested.path);
        }
        return location.pathname === sub.path;
      });

      if (hasActiveChild) {
        setPinnedGroups((prev) => {
          const next = { ...prev, [group.title]: true };
          group.subItems.forEach((sub) => {
            if (sub.subItems && sub.subItems.some((nested) => location.pathname === nested.path)) {
              next[sub.title || sub.name] = true;
            }
          });
          return next;
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const filteredMenuItems = useMemo(() => {
    const q = normalizeNavText(searchQuery.trim());
    if (!q) return menuItems;

    return menuItems
      .map((group) => {
        if (!group.subItems) {
          return normalizeNavText(group.name || group.title).includes(q) ? group : null;
        }

        const filteredSubs = group.subItems
          .map((sub) => {
            if (!sub.subItems) {
              return normalizeNavText(sub.name || sub.title).includes(q) ? sub : null;
            }
            const filteredNested = sub.subItems.filter((nested) =>
              normalizeNavText(nested.name || nested.title).includes(q)
            );
            if (filteredNested.length > 0 || normalizeNavText(sub.name || sub.title).includes(q)) {
              return {
                ...sub,
                subItems: filteredNested.length > 0 ? filteredNested : sub.subItems,
              };
            }
            return null;
          })
          .filter(Boolean);

        if (filteredSubs.length > 0 || normalizeNavText(group.title).includes(q)) {
          return {
            ...group,
            subItems: filteredSubs.length > 0 ? filteredSubs : group.subItems,
          };
        }
        return null;
      })
      .filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const isSearching = Boolean(searchQuery.trim());

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

        {/* Quick Search Bar (when expanded) */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1 border-b border-white/5">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-3 text-blue-200/50 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhanh menu..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-blue-200/50 border border-white/10 focus:border-[var(--color-vnpost-orange)]/60 focus:outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-blue-200/60 hover:text-white text-xs font-bold cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden sidebar-scrollbar">
          {filteredMenuItems.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-blue-200/60">
              <p>Không tìm thấy menu phù hợp</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-[11px] text-[var(--color-vnpost-orange)] hover:underline font-semibold cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}

          <ul className="space-y-1">
            {filteredMenuItems.map((item, idx) => {
              // Flat item
              if (!item.subItems) {
                return (
                  <li key={item.path || idx}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => 
                        `relative flex items-center py-2.5 mx-3 rounded-xl transition-all duration-200 group ${isCollapsed ? 'justify-center px-0' : 'px-4'} ${
                          isActive 
                            ? 'bg-gradient-to-r from-white/20 via-white/15 to-white/5 text-white font-bold backdrop-blur-md border border-white/25 shadow-[0_0_15px_rgba(245,130,32,0.2)] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1.5 before:rounded-r-md before:bg-gradient-to-b before:from-amber-400 before:to-[var(--color-vnpost-orange)] before:shadow-[0_0_8px_rgba(245,130,32,0.7)]' 
                            : 'text-blue-100/90 hover:bg-gradient-to-r hover:from-white/12 hover:to-white/5 hover:text-white border border-transparent'
                        }`
                      }
                      title={isCollapsed ? item.name : undefined}
                    >
                      <div className="flex-shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-transform">{item.icon}</div>
                      {!isCollapsed && <span className="ml-3 whitespace-nowrap text-sm font-semibold">{item.name}</span>}
                    </NavLink>
                  </li>
                );
              }

              // Tree item
              const isPinned = Boolean(pinnedGroups[item.title]);
              const isHovered = Boolean(hoveredGroups[item.title]);
              const isExpanded = isSearching ? true : (isPinned || isHovered);
              const isGroupActive = item.subItems.some((sub) => {
                if (sub.subItems) {
                  return sub.subItems.some((nested) => location.pathname === nested.path);
                }
                return location.pathname === sub.path;
              });

              return (
                <li
                  key={item.title || idx}
                  className="pt-1.5"
                  onMouseEnter={() => handleGroupMouseEnter(item.title)}
                  onMouseLeave={() => handleGroupMouseLeave(item.title)}
                >
                  {!isCollapsed ? (
                    <div className="relative mx-3">
                      <div
                        onClick={() => togglePinGroup(item.title)}
                        className={`flex items-center justify-between px-3 py-2 transition-all duration-200 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer select-none group ${
                          isGroupActive ? 'text-white' : 'text-blue-200/80 hover:text-white'
                        } ${isHovered && !isPinned ? 'bg-white/5' : ''}`}
                      >
                        <div className="flex items-center">
                          <div className="flex-shrink-0 opacity-80 group-hover:opacity-100">{item.icon}</div>
                          <span className="ml-2.5 whitespace-nowrap text-xs font-bold uppercase tracking-wide">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinGroup(item.title);
                            }}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              isPinned ? 'text-amber-400 hover:text-amber-300' : 'text-white/30 hover:text-white/80'
                            }`}
                            title={isPinned ? 'Đang ghim mở (bấm để thu gọn)' : 'Rê chuột để xem nhanh (bấm để ghim mở)'}
                          >
                            <Pin size={12} className={`transition-transform duration-200 ${isPinned ? 'rotate-45 fill-amber-400' : ''}`} />
                          </button>
                          <ChevronDown size={14} className={`transition-transform duration-300 text-white/60 ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Collapsed Icon with Floating Flyout */
                    <CollapsedFlyout>
                      <div
                        className={`flex items-center justify-center py-2.5 mx-2 rounded-xl text-blue-200/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer ${
                          isGroupActive ? 'bg-white/10 text-white' : ''
                        }`}
                      >
                        <div className="flex-shrink-0 opacity-80 group-hover/collapsed:opacity-100 group-hover/collapsed:scale-110 transition-transform">
                          {item.icon}
                        </div>
                      </div>

                      {/* Floating Glass Flyout Popover */}
                      <div className="px-3 py-1.5 border-b border-white/10 mb-1.5 flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">{item.title}</span>
                        </div>
                        <ul className="space-y-1 max-h-[360px] overflow-y-auto sidebar-scrollbar pr-1">
                          {item.subItems.map((sub) => {
                            if (!sub.subItems) {
                              return (
                                <li key={sub.path || sub.name}>
                                  <NavLink
                                    to={sub.path}
                                    className={({ isActive }) =>
                                      `flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg text-xs transition-all ${
                                        isActive
                                          ? 'bg-gradient-to-r from-white/20 to-white/10 text-white font-bold border border-white/20'
                                          : 'text-blue-200/80 hover:text-white hover:bg-white/10'
                                      }`
                                    }
                                  >
                                    <div className="shrink-0 opacity-70 scale-90">{sub.icon}</div>
                                    <span className="truncate">{sub.name}</span>
                                  </NavLink>
                                </li>
                              );
                            }

                            return (
                              <li key={sub.title || sub.name} className="pt-1 border-t border-white/5 first:border-t-0 first:pt-0">
                                <div className="flex items-center gap-2 px-2 py-1 text-[11px] font-semibold text-blue-100/90">
                                  {getModuleIndicatorDot(sub.title || sub.name)}
                                  <span className="truncate">{sub.name || sub.title}</span>
                                </div>
                                <ul className="pl-4 space-y-0.5 mt-0.5 border-l border-white/10 ml-2">
                                  {sub.subItems.map((nested) => (
                                    <li key={nested.path}>
                                      <NavLink
                                        to={nested.path}
                                        className={({ isActive }) =>
                                          `flex items-center gap-2 py-1 px-2 rounded-md text-[11px] transition-all ${
                                            isActive
                                              ? 'bg-white/20 text-white font-bold'
                                              : 'text-blue-200/70 hover:text-white hover:bg-white/10'
                                          }`
                                        }
                                      >
                                        <div className="shrink-0 opacity-70 scale-75">{nested.icon}</div>
                                        <span className="truncate">{nested.name}</span>
                                      </NavLink>
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            );
                          })}
                        </ul>
                    </CollapsedFlyout>
                  )}

                  {/* Sub items */}
                  {!isCollapsed && (
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                        isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="overflow-hidden">
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
                                          ? 'bg-gradient-to-r from-white/20 via-white/12 to-white/5 text-white font-bold backdrop-blur-xs border border-white/20 shadow-[0_0_12px_rgba(245,130,32,0.18)] before:absolute before:left-4 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-gradient-to-b before:from-amber-400 before:to-[var(--color-vnpost-orange)] before:shadow-[0_0_6px_rgba(245,130,32,0.6)]' 
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
                            const subKey = sub.title || sub.name;
                            const isSubPinned = Boolean(pinnedGroups[subKey]);
                            const isSubHovered = Boolean(hoveredGroups[subKey]);
                            const isSubExpanded = isSearching ? true : (isSubPinned || isSubHovered);
                            const isSubActive = sub.subItems.some((nested) => location.pathname === nested.path);

                            return (
                              <li
                                key={subKey}
                                className="pt-0.5"
                                onMouseEnter={() => handleGroupMouseEnter(subKey)}
                                onMouseLeave={() => handleGroupMouseLeave(subKey)}
                              >
                                <div
                                  onClick={() => togglePinGroup(subKey)}
                                  className={`relative flex w-full items-start justify-between gap-1 py-2 pl-4 pr-2 mx-1 rounded-lg transition-all duration-200 text-xs cursor-pointer select-none ${
                                    isSubActive ? 'font-bold text-white' : 'text-blue-200/80 hover:text-white hover:bg-white/5'
                                  } ${isSubHovered && !isSubPinned ? 'bg-white/5' : ''}`}
                                >
                                  <div className="flex min-w-0 flex-1 items-start gap-2">
                                    <div className="flex-shrink-0 scale-90 opacity-70">{sub.icon}</div>
                                    {getModuleIndicatorDot(sub.title || sub.name)}
                                    <span className="break-words text-left text-xs font-semibold leading-snug">{sub.name || sub.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePinGroup(subKey);
                                      }}
                                      className={`shrink-0 p-1.5 -my-1 rounded-md transition-colors cursor-pointer hover:bg-white/10 ${
                                        isSubPinned ? 'text-amber-400 hover:text-amber-300' : 'text-white/30 hover:text-white/80'
                                      }`}
                                      title={isSubPinned ? 'Đang ghim mở (bấm để thu gọn)' : 'Rê chuột để xem nhanh (bấm để ghim mở)'}
                                    >
                                      <Pin size={13} className={`transition-transform duration-200 ${isSubPinned ? 'rotate-45 fill-amber-400' : ''}`} />
                                    </button>
                                    <ChevronDown size={12} className={`transition-transform duration-300 text-white/50 ${isSubExpanded ? 'rotate-180 text-white' : ''}`} />
                                  </div>
                                </div>

                                <div
                                  className={`grid transition-[grid-template-rows,opacity] duration-250 ease-in-out ${
                                    isSubExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                                  }`}
                                >
                                  <div className="overflow-hidden">
                                    <ul className="mt-1 space-y-0.5 bg-black/20 py-1.5 rounded-lg mx-1.5 border-l-2 border-white/10 pl-2">
                                      {sub.subItems.map((nested) => (
                                        <li key={nested.path}>
                                          <NavLink
                                            to={nested.path}
                                            className={({ isActive }) =>
                                              `relative flex items-center py-1.5 pl-6 pr-3 rounded-md transition-all duration-200 text-xs ${
                                                isActive 
                                                  ? 'bg-gradient-to-r from-white/20 via-white/12 to-white/5 text-white font-bold backdrop-blur-xs border border-white/15 shadow-[0_0_10px_rgba(245,130,32,0.15)] before:absolute before:left-2 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-gradient-to-b before:from-amber-400 before:to-[var(--color-vnpost-orange)] before:shadow-[0_0_5px_rgba(245,130,32,0.5)]' 
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
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
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

