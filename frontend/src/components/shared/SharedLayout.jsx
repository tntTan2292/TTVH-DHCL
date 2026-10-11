import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Search, CalendarDays, Filter, LoaderCircle, AlertTriangle } from 'lucide-react';
import Topbar from '../Topbar';
import { useAuth } from '../../auth/AuthContext';
import { getNavigationForRole } from '../../navigation/appNavigation.jsx';
import { buildPreservedPath } from '../../navigation/urlPreservation';
import { createSearchCommitController } from './searchCommitController.js';

export function SidebarNavigation({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const location = useLocation();
  const { user } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState({
    'Quản lý chất lượng': true,
    'QUẢN LÝ CHẤT LƯỢNG': true,
    'F1.1 – Chất lượng toàn trình nội tỉnh': true,
    'F1.3 – Chất lượng phát liên tỉnh': true,
    'F4.1 – Chất lượng phát thành công bưu cục': true,
    'Quản lý mạng lưới': false,
    'QUẢN LÝ MẠNG LƯỚI': false,
    'Quản trị hệ thống': false,
    'QUẢN TRỊ HỆ THỐNG': false,
  });
  const navGroups = getNavigationForRole(user?.role);

  const toggleGroup = (groupTitle) => {
    setExpandedGroups((prev) => ({ ...prev, [groupTitle]: !prev[groupTitle] }));
  };

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

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
          <ul className="space-y-1">
            {navGroups.map((item, idx) => {
              if (!item.subItems) {
                return (
                  <li key={item.path || idx}>
                    <NavLink
                      to={buildPreservedPath(item.path, location.search)}
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
                      className={`relative flex w-full items-center justify-between px-5 py-2.5 transition-all duration-200 text-xs font-bold uppercase tracking-wider ${
                        isGroupActive ? 'text-white' : 'text-blue-200/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 opacity-80 group-hover:opacity-100">{item.icon}</div>
                        <span className="ml-3 whitespace-nowrap text-xs font-bold uppercase tracking-wide">{item.title}</span>
                      </div>
                      <ChevronDown size={14} className={`transition-transform duration-200 text-white/60 ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                    </button>
                  ) : (
                    <div className="group relative flex items-center justify-center py-3 text-blue-200">
                      <div className="flex-shrink-0 opacity-80 group-hover:opacity-100">{item.icon}</div>
                    </div>
                  )}

                  {!isCollapsed && isExpanded && (
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
                                      ? 'bg-white/15 text-white font-bold backdrop-blur-xs border border-white/15 shadow-2xs before:absolute before:left-5 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-vnpost-orange'
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

                        const isSubExpanded = expandedGroups[sub.title || sub.name];
                        const isSubActive = sub.subItems.some((nested) => location.pathname === nested.path);

                        return (
                          <li key={sub.title || sub.name} className="pt-0.5">
                            <button
                              onClick={() => toggleGroup(sub.title || sub.name)}
                              className={`relative flex w-full items-center justify-between py-2 pl-8 pr-4 mx-1.5 rounded-lg transition-all duration-200 text-xs ${
                                isSubActive ? 'font-bold text-white' : 'text-blue-200/80 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <div className="flex min-w-0 items-center">
                                <div className="flex-shrink-0 scale-90 opacity-70">{sub.icon}</div>
                                <span className="ml-2.5 text-left text-xs font-semibold leading-snug">{sub.name || sub.title}</span>
                              </div>
                              <ChevronDown size={12} className={`transition-transform duration-200 text-white/50 ${isSubExpanded ? 'rotate-180 text-white' : ''}`} />
                            </button>

                            {isSubExpanded && (
                              <ul className="mt-1 space-y-0.5 bg-black/20 py-1.5 rounded-lg mx-1.5 border-l-2 border-white/10 pl-2">
                                {sub.subItems.map((nested) => (
                                  <li key={nested.path}>
                                    <NavLink
                                      to={buildPreservedPath(nested.path, location.search)}
                                      className={({ isActive }) =>
                                        `relative flex items-center py-1.5 pl-6 pr-3 rounded-md transition-all duration-200 text-xs ${
                                          isActive
                                            ? 'bg-white/15 text-white font-bold backdrop-blur-xs border border-white/15 shadow-2xs before:absolute before:left-2 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-vnpost-orange'
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
  dashboard: 'Bảng điều hành',
  ranking: 'Phân tích',
  bcvh: 'BCVH',
  route: 'Tuyến phát',
  evidence: 'Dữ liệu minh chứng',
  shipment: 'Chi tiết bưu gửi',
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
    <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur-md hover:shadow-md transition-all duration-150 motion-reduce:transition-none xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 shadow-2xs backdrop-blur-xs transition-all duration-150 hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/30">
          <CalendarDays size={16} className="text-slate-400 shrink-0" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange?.(e.target.value)}
            className="border-none bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0"
            aria-label="Từ ngày"
          />
        </div>
        <span className="text-slate-400 font-semibold">-</span>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 shadow-2xs backdrop-blur-xs transition-all duration-150 hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/30">
          <CalendarDays size={16} className="text-slate-400 shrink-0" />
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange?.(e.target.value)}
            className="border-none bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0"
            aria-label="Đến ngày"
          />
        </div>
        {showKpiFilter ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 shadow-2xs backdrop-blur-xs transition-all duration-150 hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/30">
            <Filter size={16} className="text-slate-400 shrink-0" />
            <select
              value={kpiValue}
              onChange={(e) => onKpiChange?.(e.target.value)}
              className="border-none bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 cursor-pointer"
              aria-label="Bộ lọc KPI"
            >
              <option value="all">Tất cả KPI</option>
              <option value="pass">Đạt</option>
              <option value="fail">Không đạt</option>
            </select>
          </div>
        ) : null}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 shadow-2xs backdrop-blur-xs transition-all duration-150 hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/30">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <select
            value={bcvhValue}
            onChange={(e) => onBcvhChange?.(e.target.value)}
            disabled={bcvhDisabled}
            className="border-none bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Bộ lọc BCVH"
          >
            {bcvhOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 shadow-2xs backdrop-blur-xs transition-all duration-150 hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/30">
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
    </div>
  );
}
