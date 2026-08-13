import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { Search, Bell, LogOut, User, Menu, Moon, Sun } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../../api/api';
import { getInitials } from '../../utils/helpers';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { dark, toggle: toggleDark } = useDarkMode();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationApi.list({ isRead: false, pageSize: 1 }),
    refetchInterval: 30000,
    enabled: !!user,
  });

  const unreadCount = notifData?.data?.unreadCount || 0;

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tasks?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b border-surface-200 bg-white px-4 lg:px-6">
      {/* Mobile menu button */}
      <button onClick={onMenuClick} className="btn-ghost lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex-1 lg:max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, projects..."
            className="input-field h-9 pl-9 pr-3 text-sm"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        {/* Dark mode toggle */}
        <button onClick={toggleDark} className="btn-ghost p-2" title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications */}
        <button onClick={() => navigate('/notifications')} className="btn-ghost relative p-2">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="btn-ghost flex items-center gap-2 rounded-full p-1"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {getInitials(user?.name)}
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 origin-top-right animate-fade-in rounded-xl border border-surface-200 bg-white p-1.5 shadow-lg">
              <div className="border-b border-surface-100 px-3 py-2">
                <p className="text-sm font-medium text-surface-900">{user?.name}</p>
                <p className="text-xs text-surface-500">{user?.email}</p>
                <span className="mt-1 inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                  {user?.role}
                </span>
              </div>
              <div className="mt-1">
                <button
                  onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-700 hover:bg-surface-100"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
