import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, List, BarChart2, MessageSquare, Upload } from 'lucide-react';

const Sidebar = () => {
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Import', path: '/import', icon: Upload },
    { name: 'Ranking', path: '/ranking/bcvh', icon: List },
    { name: 'RCA Pareto', path: '/rca', icon: BarChart2 },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[var(--color-surface-200)] flex flex-col h-full">
      <div className="p-4 border-b border-[var(--color-surface-200)]">
        <h1 className="text-xl font-bold text-[var(--color-primary-600)]">TTVH QIS</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Quality Intelligence</p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                    : 'text-[var(--color-text-main)] hover:bg-[var(--color-surface-100)] hover:text-[var(--color-primary-600)]'
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
