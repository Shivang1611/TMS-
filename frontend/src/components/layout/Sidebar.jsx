import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users,
  BarChart3,
  Building2,
  ScrollText,
  Bell,
  ChevronLeft,
  CheckCircle2,
  FileText
} from 'lucide-react';

// Removed static navItems to define dynamically inside the component
const adminItems = [
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/audit-log', icon: ScrollText, label: 'Audit Log' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const isAdmin = ['Founder', 'Admin'].includes(user?.role);
  const isManager = ['Founder', 'Admin', 'Manager', 'Team Lead'].includes(user?.role);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/my-tasks', icon: CheckCircle2, label: 'My Tasks' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    ...(isManager ? [
      { to: '/tasks', icon: CheckSquare, label: 'Assign Task' },
      { to: '/org-structure', icon: Building2, label: 'Org Structure' },
    ] : []),
    { to: '/notes', icon: FileText, label: 'Notes' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } flex flex-col border-r border-surface-200 bg-white transition-all duration-300`}
    >
      {/* Header / Logo */}
      <div className={`flex h-16 relative items-center border-b border-surface-200 ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
        {collapsed ? (
          <div className="flex shrink-0 h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <Building2 className="h-4 w-4 text-white" />
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="flex shrink-0 h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-surface-900 truncate">TMS</span>
          </div>
        )}
        
        <button
          onClick={onToggle}
          className={`btn-ghost hidden lg:flex items-center justify-center bg-white border border-surface-200 shadow-sm rounded-full absolute top-1/2 -translate-y-1/2 ${collapsed ? '-right-3 w-6 h-6 p-0.5 z-10' : 'relative right-0 p-1.5'}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={`transition-transform ${collapsed ? 'h-3.5 w-3.5 rotate-180' : 'h-4 w-4'}`} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* Admin section */}
        {isAdmin && !collapsed && (
          <div className="pt-4">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-surface-400">
              Administration
            </p>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                  }`
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
        {isAdmin && collapsed && (
          <div className="pt-4">
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom section */}
      {!collapsed && (
        <div className="border-t border-surface-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {user?.name?.[0] || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-surface-900">{user?.name}</p>
              <p className="truncate text-xs text-surface-500">{user?.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
