import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Search, CalendarDays, Filter, LoaderCircle, AlertTriangle, Pin } from 'lucide-react';
import Topbar from '../Topbar';
import WelcomeToast from '../welcome/WelcomeToast.jsx';
import CollapsedFlyout from '../CollapsedFlyout';
import { useAuth } from '../../auth/AuthContext';
import { getNavigationForRole, getMyTasksNavItem } from '../../navigation/appNavigation.jsx';
import opsJournalAdapter from '../../features/ops-journal/api/opsJournalApi.js';
import { buildPreservedPath } from '../../navigation/urlPreservation';
import { createSearchCommitController } from './searchCommitController.js';

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
  if (title.includes('F4.2')) {
    return <span className="inline-block h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] shrink-0 animate-pulse" title="Phân hệ F4.2 – Phát giao bưu tá (Xanh da trời)" />;
  }
  if (title.includes('Hàng tồn') || title.includes('hàng tồn')) {
    return <span className="inline-block h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.85)] shrink-0 animate-pulse" title="Chỉ số rà soát Hàng tồn (Đỏ)" />;
  }
  return null;
}

export function SidebarNavigation({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const location = useLocation();
  const { user } = useAuth();
  const [pinnedGroups, setPinnedGroups] = useState({
    'Quản lý chất lượng': true,
    'QUẢN LÝ CHẤT LƯỢNG': true,
    'F1.1 – Chất lượng toàn trình nội tỉnh': true,
    'F1.2 – Thu gom liên tỉnh': true,
    'F1.3 – Chất lượng phát liên tỉnh': true,
    'F4.1 – Chất lượng phát thành công bưu cục': true,
    'F4.2 – Chất lượng phát giao bưu tá': true,
    'Chỉ số rà soát Hàng tồn': true,
    'Quản lý mạng lưới': false,
    'QUẢN LÝ MẠNG LƯỚI': false,
    'Quản trị hệ thống': false,
    'QUẢN TRỊ HỆ THỐNG': false,
  });
  const [hoveredGroups, setHoveredGroups] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  // Memoized: the effect below depends on navGroups; a fresh array on every render re-ran it forever
  // (setPinnedGroups -> render -> new navGroups -> effect ...), which blanked every module page.
  // OPS-JOURNAL-01: "Nhiệm vụ của tôi" appears only when the server says this user has tasks (non-empty my-tasks). Nothing else
  // is shown or counted, and the flag is reset whenever the signed-in user changes.
  const [hasMyTasks, setHasMyTasks] = useState(false);
  const userId = user?.id ?? user?.username ?? null;
  useEffect(() => {
    setHasMyTasks(false);
    if (!userId) return undefined;
    let current = true;
    opsJournalAdapter.getMyTasks()
      .then((res) => { if (current) setHasMyTasks(Boolean(res?.success && Array.isArray(res.data?.tasks) && res.data.tasks.length > 0)); })
      .catch(() => { if (current) setHasMyTasks(false); });
    return () => { current = false; };
  }, [userId]);
  const navGroups = useMemo(() => {
    const base = getNavigationForRole(user?.role, user?.access);
    if (!hasMyTasks || !Array.isArray(base)) return base;
    const homeIndex = base.findIndex((item) => item.path === '/');
    return [...base.slice(0, homeIndex + 1), getMyTasksNavItem(), ...base.slice(homeIndex + 1)];
  }, [user?.role, user?.access, hasMyTasks]);

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

  useEffect(() => {
    if (!navGroups) return;
    navGroups.forEach((group) => {
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
          // Nothing new to pin: keep the same state object so React does not re-render.
          const unchanged = Object.keys(next).every((key) => prev[key] === next[key]);
          return unchanged ? prev : next;
        });
      }
    });
  }, [location.pathname, navGroups]);

  const filteredNavGroups = useMemo(() => {
    const q = normalizeNavText(searchQuery.trim());
    if (!q) return navGroups;

    return navGroups
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
  }, [navGroups, searchQuery]);

  const isSearching = Boolean(searchQuery.trim());

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs transition-opacity md:hidden" 
          onClick={onClose} 
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] transform flex-col glass-sidebar text-white shadow-2xl transition-all duration-300 ease-in-out md:relative ${isCollapsed ? 'md:w-20' : 'md:w-[280px]'} ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className={`relative flex min-h-[72px] items-center gap-3 border-b border-white/10 px-5 py-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <Link to="/" className="flex items-center gap-3 overflow-hidden group">
            {!isCollapsed ? (
              <div className="flex flex-col">
                <p className="mb-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-[var(--color-vnpost-orange)]">
                  Bưu điện thành phố Huế
                </p>
                <h1 className="text-base font-black leading-tight tracking-wide text-white drop-shadow-sm">
                  Trung Tâm Vận hành
                </h1>
                <p className="mt-0.5 text-[11px] font-semibold leading-snug text-blue-200/90 drop-shadow-xs">
                  Hệ thống Điều hành chất lượng
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/20 text-[var(--color-vnpost-orange)] font-black text-sm shadow-inner">
                TT
              </div>
            )}
          </Link>
          <button
            onClick={onToggleCollapse}
            className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-r from-vnpost-orange to-amber-500 text-[#003E7E] shadow-md border border-white/30 transition-transform hover:scale-110 active:scale-95 md:flex cursor-pointer"
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

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 sidebar-scrollbar">
          {filteredNavGroups.length === 0 && (
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
            {filteredNavGroups.map((item, idx) => {
              // Flat item
              if (!item.subItems) {
                return (
                  <li key={item.path || idx}>
                    <NavLink
                      to={buildPreservedPath(item.path, location.search)}
                      end={item.path === '/'}
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

              // Group item
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
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-300 text-white/60 ${isExpanded ? 'rotate-180 text-white' : ''}`}
                          />
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
                                    to={buildPreservedPath(sub.path, location.search)}
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
                                        to={buildPreservedPath(nested.path, location.search)}
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
                                    to={buildPreservedPath(sub.path, location.search)}
                                    className={({ isActive }) =>
                                      `relative flex items-center py-2 pl-10 pr-4 mx-1.5 rounded-lg transition-all duration-200 text-xs font-medium ${
                                        isActive
                                          ? 'bg-gradient-to-r from-white/20 via-white/12 to-white/5 text-white font-bold backdrop-blur-xs border border-white/20 shadow-[0_0_12px_rgba(245,130,32,0.18)] before:absolute before:left-4 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-gradient-to-b before:from-amber-400 before:to-[var(--color-vnpost-orange)] before:shadow-[0_0_6px_rgba(245,130,32,0.6)]'
                                          : 'text-blue-200/80 hover:bg-white/10 hover:text-white'
                                      }`
                                    }
                                  >
                                    <div className="flex-shrink-0 scale-90 opacity-70">{sub.icon}</div>
                                    <span className="ml-2.5 whitespace-nowrap text-xs">{sub.name}</span>
                                  </NavLink>
                                </li>
                              );
                            }

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
                                            to={buildPreservedPath(nested.path, location.search)}
                                            className={({ isActive }) =>
                                              `relative flex items-center py-1.5 pl-6 pr-3 rounded-md transition-all duration-200 text-xs ${
                                                isActive
                                                  ? 'bg-gradient-to-r from-white/20 via-white/12 to-white/5 text-white font-bold backdrop-blur-xs border border-white/15 shadow-[0_0_10px_rgba(245,130,32,0.15)] before:absolute before:left-2 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-gradient-to-b before:from-amber-400 before:to-[var(--color-vnpost-orange)] before:shadow-[0_0_5px_rgba(245,130,32,0.5)]'
                                                  : 'text-blue-200/70 hover:bg-white/10 hover:text-white'
                                              }`
                                            }
                                          >
                                            <div className="flex-shrink-0 scale-75 opacity-70">{nested.icon}</div>
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

        {/* Sidebar footer */}
        {!isCollapsed && (
          <div className="border-t border-white/10 px-5 py-3 text-center text-[11px] font-medium tracking-wide text-blue-200/70">
            Design by TNT
          </div>
        )}
      </aside>
    </>
  );
}

// Display names for URL segments (the path stays as is; only the label shown to the user is Vietnamese).
const BREADCRUMB_LABELS = {
  f11: 'F1.1 – Chất lượng toàn trình nội tỉnh',
  f12: 'F1.2 – Thu gom liên tỉnh',
  f13: 'F1.3 – Chất lượng phát liên tỉnh',
  f41: 'F4.1 – Chất lượng phát thành công bưu cục',
  f42: 'F4.2 – Chất lượng phát giao bưu tá',
  hangton: 'Chỉ số rà soát Hàng tồn',
  dashboard: 'Bảng điều hành',
  ranking: 'Phân tích',
  bcvh: 'BCVH',
  route: 'Tuyến phát',
  evidence: 'Dữ liệu minh chứng',
  shipment: 'Chi tiết bưu gửi',
  users: 'Quản lý người dùng',
  'change-password': 'Đổi mật khẩu',
  import: 'Trung tâm nạp dữ liệu',
  'kpi-config': 'Cấu hình chỉ tiêu',
  'system-info': 'Thông tin hệ thống',
  'network-map': 'Quản lý mạng lưới',
  'service-points': 'Mạng điểm phục vụ',
  'level2-routes': 'Mạng đường thư cấp 2',
  'delivery-routes': 'Sơ đồ tuyến phát',
  integrated: 'Bản đồ tích hợp',
  'postman-catalog': 'Rà soát danh mục bưu tá',
};

export function Breadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  if (pathnames.length === 0) return null;

  return (
    <nav className="mb-4 flex items-center text-xs md:text-sm text-slate-500 select-none" aria-label="Breadcrumb">
      <ol className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 shadow-xs">
        <li className="inline-flex items-center">
          <Link to="/" className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-[var(--color-vnpost-blue)] transition-colors rounded-lg p-1 hover:bg-white/80">
            Trang chủ
          </Link>
        </li>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const title = BREADCRUMB_LABELS[value] || value.charAt(0).toUpperCase() + value.slice(1);

          return (
            <li key={to} className="inline-flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {isLast ? (
                <span className="font-semibold text-slate-900 px-1 py-0.5" aria-current="page">
                  {title}
                </span>
              ) : (
                <Link to={to} className="font-medium text-slate-600 hover:text-[var(--color-vnpost-blue)] transition-colors px-1 py-0.5 rounded-md hover:bg-white/80">
                  {title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Composition-safe, debounced search input (DEFECT A remediation, 2026-08-11)
function GlobalFilterBarSearchInput({ searchValue, onSearchChange }) {
  const [localValue, setLocalValue] = useState(searchValue ?? '');
  const controllerRef = useRef(null);
  const composingRef = useRef(false);

  if (!controllerRef.current) {
    controllerRef.current = createSearchCommitController({ onCommit: (value) => onSearchChange?.(value) });
  }

  useEffect(() => () => controllerRef.current?.dispose(), []);

  useEffect(() => {
    if (composingRef.current) return;
    setLocalValue(searchValue ?? '');
  }, [searchValue]);

  const handleChange = (e) => {
    const value = e.target.value;
    setLocalValue(value);
    controllerRef.current.handleChange(value);
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
    controllerRef.current.handleCompositionStart();
  };

  const handleCompositionEnd = (e) => {
    composingRef.current = false;
    const value = e.target.value;
    setLocalValue(value);
    controllerRef.current.handleCompositionEnd(value);
  };

  return (
    <input
      value={localValue}
      onChange={handleChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      placeholder="Tìm kiếm..."
      className="w-full border-none bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 placeholder:text-slate-400"
      aria-label="Tìm kiếm"
    />
  );
}

export function GlobalFilterBar({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  kpiValue,
  onKpiChange,
  showKpiFilter = false,
  bcvhValue,
  onBcvhChange,
  bcvhDisabled = false,
  bcvhOptions = [{ value: 'all', label: 'Tất cả BCVH' }],
  searchValue,
  onSearchChange,
  actions,
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur-md hover:shadow-md transition-[box-shadow,border-color] duration-200 motion-reduce:transition-none xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-2xs backdrop-blur-xs transition-[border-color,box-shadow] duration-150 hover:border-blue-400 focus-within:border-[var(--color-vnpost-blue)] focus-within:ring-2 focus-within:ring-[var(--color-vnpost-blue)]/20">
          <CalendarDays size={16} className="text-slate-400 shrink-0" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange?.(e.target.value)}
            className="border-none bg-transparent text-sm font-semibold text-slate-800 focus:outline-none focus:ring-0 cursor-pointer"
            aria-label="Từ ngày"
          />
        </div>
        <span className="text-slate-400 font-semibold select-none">-</span>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-2xs backdrop-blur-xs transition-[border-color,box-shadow] duration-150 hover:border-blue-400 focus-within:border-[var(--color-vnpost-blue)] focus-within:ring-2 focus-within:ring-[var(--color-vnpost-blue)]/20">
          <CalendarDays size={16} className="text-slate-400 shrink-0" />
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange?.(e.target.value)}
            className="border-none bg-transparent text-sm font-semibold text-slate-800 focus:outline-none focus:ring-0 cursor-pointer"
            aria-label="Đến ngày"
          />
        </div>
        {showKpiFilter ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-2xs backdrop-blur-xs transition-[border-color,box-shadow] duration-150 hover:border-blue-400 focus-within:border-[var(--color-vnpost-blue)] focus-within:ring-2 focus-within:ring-[var(--color-vnpost-blue)]/20">
            <Filter size={16} className="text-slate-400 shrink-0" />
            <select
              value={kpiValue}
              onChange={(e) => onKpiChange?.(e.target.value)}
              className="border-none bg-transparent text-sm font-semibold text-slate-800 focus:outline-none focus:ring-0 cursor-pointer"
              aria-label="Bộ lọc KPI"
            >
              <option value="all">Tất cả KPI</option>
              <option value="pass">Đạt</option>
              <option value="fail">Không đạt</option>
            </select>
          </div>
        ) : null}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-2xs backdrop-blur-xs transition-[border-color,box-shadow] duration-150 hover:border-blue-400 focus-within:border-[var(--color-vnpost-blue)] focus-within:ring-2 focus-within:ring-[var(--color-vnpost-blue)]/20">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <select
            value={bcvhValue}
            onChange={(e) => onBcvhChange?.(e.target.value)}
            disabled={bcvhDisabled}
            className="border-none bg-transparent text-sm font-semibold text-slate-800 focus:outline-none focus:ring-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Bộ lọc BCVH"
          >
            {bcvhOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-2xs backdrop-blur-xs transition-[border-color,box-shadow] duration-150 hover:border-blue-400 focus-within:border-[var(--color-vnpost-blue)] focus-within:ring-2 focus-within:ring-[var(--color-vnpost-blue)]/20">
          <Search size={16} className="text-slate-400 shrink-0" />
          <GlobalFilterBarSearchInput searchValue={searchValue} onSearchChange={onSearchChange} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
      </div>
    </div>
  );
}

export function PageToolbar({ children }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function GlobalLoadingOverlay({ label = 'Đang tải...' }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/25 backdrop-blur-md">
      <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-6 py-4 shadow-2xl backdrop-blur-xl">
        <LoaderCircle className="h-5 w-5 animate-spin text-[var(--color-vnpost-blue)]" />
        <span className="text-sm font-semibold text-slate-800">{label}</span>
      </div>
    </div>
  );
}

export function GlobalErrorOverlay({ title = 'Đã xảy ra lỗi', description }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/25 backdrop-blur-md">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-red-200 bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        {description ? <p className="mt-3 text-sm text-slate-600">{description}</p> : null}
      </div>
    </div>
  );
}

export function SharedLayout({
  children,
  showBreadcrumb = true,
  globalFilters,
  toolbar,
  loadingOverlay,
  errorOverlay,
  title,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-glass-canvas font-sans">
      <SidebarNavigation
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
      />

      <div className="flex w-full min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-6 p-4 md:p-6">
            {showBreadcrumb ? <Breadcrumb /> : null}
            {title ? <h1 className="text-2xl font-bold text-slate-900">{title}</h1> : null}
            {toolbar ? <PageToolbar>{toolbar}</PageToolbar> : null}
            {globalFilters ? <div>{globalFilters}</div> : null}
            <div className="min-h-0 flex-1">{children}</div>
          </div>
        </main>
      </div>

      {loadingOverlay}
      {errorOverlay}
      <WelcomeToast />
    </div>
  );
}
