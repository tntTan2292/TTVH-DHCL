import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, Activity, Settings, Database, Info, FileSpreadsheet, Menu, ChevronLeft, ChevronRight, BarChart2, PieChart, ChevronDown } from 'lucide-react';

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({
    'F1.3 Quality Management': true,
    'System Administration': false
  });

  const toggleGroup = (groupTitle) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  const menuItems = [
    { name: 'Dashboard Home', path: '/', icon: <LayoutDashboard size={20} /> },
    {
      title: 'F1.3 Quality Management',
      icon: <Target size={20} />,
      subItems: [
        { name: 'Dashboard', path: '/f13/dashboard', icon: <Target size={18} /> },
        { name: 'BCVH Ranking', path: '/f13/bcvh-ranking', icon: <BarChart2 size={18} /> },
        { name: 'Tuyến Ranking', path: '/f13/route-ranking', icon: <BarChart2 size={18} /> },
        { name: 'RCA', path: '/f13/rca', icon: <PieChart size={18} /> },
        { name: 'Pareto', path: '/f13/pareto', icon: <PieChart size={18} /> },
      ]
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
      <aside className={`fixed md:relative inset-y-0 left-0 ${isCollapsed ? 'md:w-20' : 'md:w-[280px]'} w-[280px] bg-gradient-to-b from-vnpost-blue-dark to-[#002a54] text-white flex flex-col shadow-2xl z-50 transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* Brand Header */}
        <div className={`p-6 border-b border-white/10 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-4 relative min-h-[80px]`}>
          <div className="flex items-center gap-3 overflow-hidden">
            {!isCollapsed && (
              <div className="flex flex-col">
                <h1 className="font-black text-xl tracking-wide text-white drop-shadow-md">
                  TTVH-<span className="text-vnpost-orange">DHCL</span>
                </h1>
                <p className="text-xs font-semibold text-blue-200 uppercase tracking-[0.15em] mt-1 drop-shadow-sm">
                  Bưu điện TP Huế
                </p>
              </div>
            )}
            {isCollapsed && (
              <h1 className="font-extrabold text-xl text-vnpost-orange drop-shadow-md">DHCL</h1>
            )}
          </div>
          <button 
            onClick={onToggleCollapse}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-vnpost-orange text-[#003E7E] rounded-full items-center justify-center shadow-lg hover:scale-110 transition-transform z-50"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1">
            {menuItems.map((item, idx) => {
              // Flat item
              if (!item.subItems) {
                return (
                  <li key={idx}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => 
                        `flex items-center ${isCollapsed ? 'justify-center px-0 mx-2' : 'px-6'} py-3 transition-all duration-200 group relative ${isActive ? 'bg-gradient-to-r from-vnpost-orange/90 to-orange-500/90 text-white font-bold border-l-4 border-white' : 'text-blue-100 hover:bg-white/5 hover:text-white border-l-4 border-transparent'}`
                      }
                    >
                      <div className="flex-shrink-0 opacity-80 group-hover:opacity-100">{item.icon}</div>
                      {!isCollapsed && <span className="ml-4 whitespace-nowrap text-[15px]">{item.name}</span>}
                    </NavLink>
                  </li>
                );
              }

              // Tree item
              const isExpanded = expandedGroups[item.title];
              // Check if any subitem is active
              const isGroupActive = item.subItems.some(sub => location.pathname === sub.path);

              return (
                <li key={idx} className="pt-2">
                  {!isCollapsed ? (
                    <button
                      onClick={() => toggleGroup(item.title)}
                      className={`w-full flex items-center justify-between px-6 py-3 transition-all duration-200 group relative ${isGroupActive ? 'text-white font-bold' : 'text-blue-200 hover:text-white'}`}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 opacity-80 group-hover:opacity-100">{item.icon}</div>
                        <span className="ml-4 whitespace-nowrap text-[15px] uppercase tracking-wide font-bold">{item.title}</span>
                      </div>
                      <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    <div className="flex items-center justify-center py-3 text-blue-200 group relative">
                       <div className="flex-shrink-0 opacity-80 group-hover:opacity-100">{item.icon}</div>
                    </div>
                  )}

                  {/* Sub items */}
                  {(!isCollapsed && isExpanded) && (
                    <ul className="mt-1 space-y-1 bg-black/10 py-2">
                      {item.subItems.map(sub => (
                        <li key={sub.path}>
                          <NavLink
                            to={sub.path}
                            className={({ isActive }) => 
                              `flex items-center pl-14 pr-6 py-2.5 transition-all duration-200 relative ${isActive ? 'text-white font-bold bg-white/5 border-l-4 border-vnpost-orange' : 'text-blue-200/80 hover:text-white hover:bg-white/5 border-l-4 border-transparent'}`
                            }
                          >
                            <div className="flex-shrink-0 opacity-70 scale-90">{sub.icon}</div>
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
