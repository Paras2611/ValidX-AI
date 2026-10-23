import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Notification } from '../types';
import {
  Bell,
  LogOut,
  UserCheck,
  FileText,
  ListFilter,
  Sliders,
  Activity,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, switchRole } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.notifications.list();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      fetchNotifications();
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      fetchNotifications();
    } catch {
      // ignore
    }
  };

  if (!user) {
    return (
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-9 w-14 rounded-lg overflow-hidden bg-white flex items-center justify-center shadow-xs p-0.5 border border-slate-200">
              <img src="/ValidateXLogo.svg" alt="VALIDATEX Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition">VALIDATEX</span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                SIH26261 AICTE
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-lg transition shadow-sm"
            >
              Register Applicant
            </Link>
          </div>
        </div>
      </header>
    );
  }

  const roleColors: Record<string, string> = {
    applicant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    officer: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    compliance: 'bg-purple-50 text-purple-700 border-purple-200',
    admin: 'bg-rose-50 text-rose-700 border-rose-200',
    auditor: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Logo & Platform Tag */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-12 rounded-md overflow-hidden bg-white flex items-center justify-center shadow-xs p-0.5 border border-slate-200">
                <img src="/ValidateXLogo.svg" alt="VALIDATEX Logo" className="h-full w-full object-contain" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition">VALIDATEX</span>
                <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  AICTE / Smart Auto
                </span>
              </div>
            </Link>

            {/* Navigation links based on role */}
            <nav className="flex items-center gap-1 sm:gap-2">
              {user.role === 'applicant' && (
                <>
                  <Link
                    to="/applicant"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      location.pathname === '/applicant'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    My Applications
                  </Link>
                  <Link
                    to="/applicant/new"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      location.pathname === '/applicant/new'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    + New Submission
                  </Link>
                </>
              )}

              {(user.role === 'officer' || user.role === 'admin' || user.role === 'auditor') && (
                <Link
                  to="/officer/queue"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    location.pathname.startsWith('/officer')
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Verification Queue
                </Link>
              )}

              {(user.role === 'compliance' || user.role === 'admin') && (
                <Link
                  to="/compliance"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    location.pathname.startsWith('/compliance')
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Compliance Rules
                </Link>
              )}

              {(user.role === 'admin' || user.role === 'auditor') && (
                <Link
                  to="/admin"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  System & Audit
                </Link>
              )}
            </nav>
          </div>

          {/* Right Controls: Quick Role Switcher + Notifications + Profile */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Switcher */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 px-1.5">Switch Persona:</span>
              {(['applicant', 'officer', 'compliance', 'admin', 'auditor'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={`px-2 py-0.5 rounded text-xs font-semibold capitalize transition ${
                    user.role === r
                      ? 'bg-white shadow-xs text-slate-900 border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={`Switch to ${r}`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Role Badge */}
            <span
              className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-md border ${
                roleColors[user.role] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {user.role}
            </span>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Drawer */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">Notifications</h4>
                      <p className="text-xs text-slate-500">{unreadCount} unread message(s)</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 mt-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">No notifications yet.</p>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div
                          key={n.id}
                          className={`py-2.5 px-2 rounded-lg transition ${
                            !n.is_read ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900">{n.title}</span>
                            {!n.is_read && (
                              <button
                                onClick={() => handleMarkAsRead(n.id)}
                                className="text-slate-400 hover:text-indigo-600"
                                title="Mark read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
