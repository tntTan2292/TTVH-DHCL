import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumb from './Breadcrumb';

const F13Layout = () => {
  return (
    <div className="flex h-screen bg-[var(--color-surface-50)] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            <Breadcrumb />
            <div className="flex-1">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default F13Layout;
