import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAppStore } from '../../store/store';
import { clsx } from 'clsx';

const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <div
        className={clsx(
          "flex flex-col flex-1 transition-all duration-300 ease-in-out relative",
          sidebarOpen ? "ml-64" : "ml-20"
        )}
      >
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
