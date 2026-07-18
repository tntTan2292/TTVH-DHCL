import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Database, FileSpreadsheet, Info, LayoutDashboard, Menu, PieChart, Target, Activity, Settings, BarChart2, Search, CalendarDays, Filter, X, LoaderCircle, AlertTriangle } from 'lucide-react';
import Topbar from '../Topbar';
import { ErrorState, LoadingState } from './SharedComponents';

const navGroups = [
  { name: 'Dashboard Home', path: '/', icon: <LayoutDashboard size={20} /> },
  {
    title: 'F1.3 Quality Management',
    icon: <Target size={20} />,
    subItems: [
      { name: 'Operation Dashboard', path: '/f13/dashboard', icon: <Target size={18} /> },
      { name: 'BCVH Ranking', path: '/f13/ranking/bcvh', icon: <BarChart2 size={18} /> },
      { name: 'Tuyến Ranking', path: '/f13/ranking/route', icon: <BarChart2 size={18} /> },
      { name: 'Pareto / RCA', path: '/f13/pareto', icon: <PieChart size={18} /> },
      { name: 'Evidence', path: '/f13/evidence', icon: <Database size={18} /> },
      { name: 'Message Center', path: '/f13/message', icon: <Info size={18} /> },
    ],
  },
  { name: 'F1.1 Quality Management', path: '/f11', icon: <Activity size={20} /> },
  { name: 'F1.2 Quality Management', path: '/f12', icon: <Activity size={20} /> },
  { name: 'F4.1 Quality Management', path: '/f41', icon: <Activity size={20} /> },
  {
    title: 'System Administration',
    icon: <Settings size={20} />,
    subItems: [
      { name: 'Data Import Center', path: '/import', icon: <FileSpreadsheet size={18} /> },
      { name: 'KPI Configuration', path: '/kpi-config', icon: <Settings size={18} /> },
      { name: 'System Information', path: '/system-info', icon: <Info size={18} /> },
    ],
  },
];

export function SidebarNavigation({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({
    'F1.3 Quality Management': true,
    'System Administration': false,
  });

  const toggleGroup = (groupTitle) => {
    setExpandedGroups((prev) => ({ ...prev, [groupTitle]: !prev[groupTitle] }));
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] transform flex-col bg-gradient-to-b from-vnpost-blue-dark to-[#002a54] text-white shadow-2xl transition-all duration-300 ease-in-out md:relative ${isCollapsed ? 'md:w-20' : 'md:w-[280px]'} ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className={`relative flex min-h-[80px] items-center gap-4 border-b border-white/10 p-6 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            {!isCollapsed ? (
              <div className="flex flex-col">
                <h1 className="text-xl font-black tracking-wide text-white drop-shadow-md">
                  TTVH-<span className="text-vnpost-orange">DHCL</span>
                </h1>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-blue-200 drop-shadow-sm">
                  Bưu điện TP Huế
                </p>
              </div>
            ) : (
              <h1 className="text-xl font-extrabold text-vnpost-orange drop-shadow-md">DHCL</h1>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-vnpost-orange text-[#003E7E] shadow-lg transition-transform hover:scale-110 md:flex"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6">
          <ul className="space-y-1">
            {navGroups.map((item, idx) => {
              if (!item.subItems) {
                return (
                  <li key={idx}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `relative flex items-center py-3 transition-all duration-200 group ${isCollapsed ? 'mx-2 justify-center px-0' : 'px-6'} ${isActive ? 'border-l-4 border-white bg-gradient-to-r from-vnpost-orange/90 to-orange-500/90 font-bold text-white' : 'border-l-4 border-transparent text-blue-100 hover:bg-white/5 hover:text-white'}`
                      }
                    >
                      <div className="flex-shrink-0 opacity-80 group-hover:opacity-100">{item.icon}</div>
                      {!isCollapsed && <span className="ml-4 whitespace-nowrap text-[15px]">{item.name}</span>}
                    </NavLink>
                  </li>
                );
              }

              const isExpanded = expandedGroups[item.title];
              const isGroupActive = item.subItems.some((sub) => location.pathname === sub.path);

              return (
                <li key={idx} className="pt-2">
                  {!isCollapsed ? (
                    <button
                      onClick={() => toggleGroup(item.title)}
                      className={`relative flex w-full items-center justify-between px-6 py-3 transition-all duration-200 ${isGroupActive ? 'font-bold text-white' : 'text-blue-200 hover:text-white'}`}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 opacity-80 group-hover:opacity-100">{item.icon}</div>
                        <span className="ml-4 whitespace-nowrap text-[15px] font-bold uppercase tracking-wide">{item.title}</span>
                      </div>
                      <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    <div className="group relative flex items-center justify-center py-3 text-blue-200">
                      <div className="flex-shrink-0 opacity-80 group-hover:opacity-100">{item.icon}</div>
                    </div>
                  )}

                  {!isCollapsed && isExpanded && (
                    <ul className="mt-1 space-y-1 bg-black/10 py-2">
                      {item.subItems.map((sub) => (
                        <li key={sub.path}>
                          <NavLink
                            to={sub.path}
                            className={({ isActive }) =>
                              `relative flex items-center py-2.5 pl-14 pr-6 transition-all duration-200 ${isActive ? 'border-l-4 border-vnpost-orange bg-white/5 font-bold text-white' : 'border-l-4 border-transparent text-blue-200/80 hover:bg-white/5 hover:text-white'}`
                            }
                          >
                            <div className="flex-shrink-0 scale-90 opacity-70">{sub.icon}</div>
                            <span className="ml-3 whitespace-nowrap text-[14px]">{sub.name}</span>
                          </NavLink>
                        </li>
                      ))}
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

export function Breadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  if (pathnames.length === 0) return null;

  return (
    <nav className="mb-4 flex items-center text-sm text-[var(--color-text-muted)]" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link to="/" className="transition-colors hover:text-[var(--color-primary-600)]">
            Home
          </Link>
        </li>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const title = value.charAt(0).toUpperCase() + value.slice(1);

          return (
            <li key={to} className="flex items-center">
              <ChevronRight className="mx-1 h-4 w-4" />
              {isLast ? (
                <span className="font-semibold text-[var(--color-text-main)]" aria-current="page">
                  {title}
                </span>
              ) : (
                <Link to={to} className="transition-colors hover:text-[var(--color-primary-600)]">
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

export function GlobalFilterBar({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  kpiValue,
  onKpiChange,
  showKpiFilter = true,
  bcvhValue,
  onBcvhChange,
  bcvhDisabled = false,
  bcvhOptions = [{ value: 'all', label: 'Tất cả BCVH' }],
  searchValue,
  onSearchChange,
  actions,
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-surface-200)] bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-surface-200)] px-3 py-2">
          <CalendarDays size={16} className="text-[var(--color-text-muted)]" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange?.(e.target.value)}
            className="border-none bg-transparent text-sm focus:ring-0"
            aria-label="Từ ngày"
          />
        </div>
        <span className="text-[var(--color-text-muted)]">-</span>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-surface-200)] px-3 py-2">
          <CalendarDays size={16} className="text-[var(--color-text-muted)]" />
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange?.(e.target.value)}
            className="border-none bg-transparent text-sm focus:ring-0"
            aria-label="Đến ngày"
          />
        </div>
        {showKpiFilter ? (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-surface-200)] px-3 py-2">
            <Filter size={16} className="text-[var(--color-text-muted)]" />
            <select
              value={kpiValue}
              onChange={(e) => onKpiChange?.(e.target.value)}
              className="border-none bg-transparent text-sm focus:ring-0"
              aria-label="Bộ lọc KPI"
            >
              <option value="all">Tất cả KPI</option>
              <option value="pass">Đạt</option>
              <option value="fail">Không đạt</option>
            </select>
          </div>
        ) : null}
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-surface-200)] px-3 py-2">
          <Filter size={16} className="text-[var(--color-text-muted)]" />
          <select
            value={bcvhValue}
            onChange={(e) => onBcvhChange?.(e.target.value)}
            disabled={bcvhDisabled}
            className="border-none bg-transparent text-sm focus:ring-0"
            aria-label="Bộ lọc BCVH"
          >
            {bcvhOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[var(--color-surface-200)] px-3 py-2">
          <Search size={16} className="text-[var(--color-text-muted)]" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full border-none bg-transparent text-sm focus:ring-0"
            aria-label="Tìm kiếm"
          />
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-surface-200)] bg-white px-5 py-4 shadow-lg">
        <LoaderCircle className="h-5 w-5 animate-spin text-[var(--color-primary-600)]" />
        <span className="text-sm font-medium text-[var(--color-text-main)]">{label}</span>
      </div>
    </div>
  );
}

export function GlobalErrorOverlay({ title = 'Đã xảy ra lỗi', description }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <h3 className="text-lg font-semibold text-[var(--color-text-main)]">{title}</h3>
        </div>
        {description ? <p className="mt-3 text-sm text-[var(--color-text-muted)]">{description}</p> : null}
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
    <div className="flex h-screen overflow-hidden bg-vnpost-bg font-sans">
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
            {title ? <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{title}</h1> : null}
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
