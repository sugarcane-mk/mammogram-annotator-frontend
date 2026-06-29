import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '../../store/store';
import { 
  LayoutDashboard, 
  Users, 
  Image as ImageIcon, 
  Menu,
  Stethoscope,
  Shield
} from 'lucide-react';
import { clsx } from 'clsx';

const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useAppStore();

  const authRole = useAppStore((state) => state.authRole);

  const dashboardPath = authRole === 'admin' ? '/admin' : authRole === 'hospital' ? '/hospital' : '/dashboard';

  const navItems = [
    { name: 'Dashboard', path: dashboardPath, icon: LayoutDashboard },
    { name: 'Patients', path: '/patients', icon: Users },
    { name: 'Gallery', path: '/gallery', icon: ImageIcon },
    ...(authRole === 'admin' ? [{ name: 'Users', path: '/users', icon: Shield }] : []),
  ];

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out",
        sidebarOpen ? "w-64" : "w-20"
      )}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        <div className={clsx("flex items-center overflow-hidden transition-all", !sidebarOpen && "w-0 opacity-0")}>
          <Stethoscope className="w-6 h-6 text-blue-500 mr-2 flex-shrink-0" />
          <span className="font-semibold text-lg whitespace-nowrap text-slate-100">MammoAnnotate</span>
        </div>
        <button 
          onClick={toggleSidebar} 
          className="p-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 focus:outline-none"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                "flex items-center px-3 py-3 rounded-md transition-colors group",
                isActive 
                  ? "bg-blue-600/10 text-blue-500" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              )
            }
            title={!sidebarOpen ? item.name : undefined}
          >
            <item.icon className={clsx("w-5 h-5 flex-shrink-0", sidebarOpen && "mr-3")} />
            <span
              className={clsx(
                "transition-all whitespace-nowrap overflow-hidden",
                !sidebarOpen && "w-0 opacity-0"
              )}
            >
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>
      
      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className={clsx("text-xs text-slate-500 overflow-hidden whitespace-nowrap transition-all", !sidebarOpen && "w-0 opacity-0")}>
          v1.0.0
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
