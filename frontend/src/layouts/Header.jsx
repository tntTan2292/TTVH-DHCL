import React from 'react';
import { User, Bell } from 'lucide-react';

const Header = () => {
  return (
    <header className="h-16 bg-white border-b border-[var(--color-surface-200)] flex items-center justify-between px-6 shrink-0">
      <div className="flex-1" />
      
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full hover:bg-[var(--color-surface-100)] text-[var(--color-text-muted)] transition-colors" aria-label="Notifications">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2 border-l border-[var(--color-surface-200)] pl-4">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-100)] flex items-center justify-center text-[var(--color-primary-700)]">
            <User className="w-5 h-5" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-[var(--color-text-main)]">Administrator</p>
            <p className="text-xs text-[var(--color-text-muted)]">TTVH Huế</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
