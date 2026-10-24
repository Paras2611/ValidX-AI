import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Notification, UserRole } from '../types';
import { getAssignedRoute } from '../lib/roleNavigation';
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
  Menu,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  User,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, switchRole } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowNotifications(false);
  }, [location.pathname]);

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

  const handleMobileSwitchRole = (role: UserRole) => {
    switchRole(role);
    setMobileMenuOpen(false);
  };

  const roleColors: Record<string, string> = {
    applicant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    officer: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    compliance: 'bg-purple-50 text-purple-700 border-purple-200',
    admin: 'bg-rose-50 text-rose-700 border-rose-200',
    auditor: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  // ----------------------------------------------------
  // Unauthenticated Navbar
  // ----------------------------------------------------
  if (!user) {
    return (
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-0 sm:h-16 flex items-center justify-between">
          {/* Logo & Brand with mobile 'Log in' button underneath */}
          <div className="flex flex-col items-start justify-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-8 sm:h-9 w-12 sm:w-14 rounded-lg overflow-hidden bg-white flex items-center justify-center shadow-xs p-0.5 border border-slate-200">
                <img src="/ValidateXLogo.svg" alt="VALIDATEX Logo" className="h-full w-full object-contain" />
              </div>
              <div className="flex items-center">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition">
                  VALIDATEX
                </span>
                <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                  SIH26261 AICTE
                </span>
              </div>
            </Link>

            {/* Log in button at the bottom of the logo ONLY in mobile view */}
            <div className="sm:hidden mt-1 ml-0.5">
              <Link
                to="/login"
                id="mobile-logo-login-btn"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 shadow-2xs transition"
              >
                Log in &rarr;
              </Link>
            </div>
          </div>

          {/* Desktop Links (hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-3">
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

          {/* Mobile Hamburger on the right side */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              aria-label="Toggle navigation menu"
              id="unauth-hamburger-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-slate-800" /> : <Menu className="w-6 h-6 text-slate-800" />}
            </button>
          </div>
        </div>

        {/* Mobile Hamburger Drawer for unauthenticated visitor */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200 bg-white/98 backdrop-blur-md px-4 pt-3 pb-6 shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col gap-2 pt-1">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-sm font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
              >
                Log in to Portal
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm"
              >
                Register New Applicant
              </Link>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Fast Interactive Demo
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleMobileSwitchRole('applicant')}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-800 text-left hover:bg-emerald-50 hover:border-emerald-300"
                >
                  Applicant Demo
                </button>
                <button
                  onClick={() => handleMobileSwitchRole('officer')}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-800 text-left hover:bg-indigo-50 hover:border-indigo-300"
                >
                  Officer Demo
                </button>
                <button
                  onClick={() => handleMobileSwitchRole('compliance')}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-800 text-left hover:bg-purple-50 hover:border-purple-300"
                >
                  Compliance Demo
                </button>
                <button
                  onClick={() => handleMobileSwitchRole('admin')}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-800 text-left hover:bg-rose-50 hover:border-rose-300"
                >
                  Admin Demo
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    );
  }

  // ----------------------------------------------------
  // Authenticated Navbar
  // ----------------------------------------------------
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-2.5 md:py-0 md:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Platform Tag with mobile Login/Switch trigger */}
          <div className="flex flex-col items-start justify-center">
            <Link to={getAssignedRoute(user.role)} className="flex items-center gap-2 group">
              <div className="h-8 w-12 rounded-md overflow-hidden bg-white flex items-center justify-center shadow-xs p-0.5 border border-slate-200">
                <img src="/ValidateXLogo.svg" alt="VALIDATEX Logo" className="h-full w-full object-contain" />
              </div>
              <div className="flex items-center">
                <span className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-indigo-600 transition">
                  VALIDATEX
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  AICTE / Smart Auto
                </span>
              </div>
            </Link>

            {/* Log in button at the bottom of the logo ONLY in mobile view */}
            <div className="md:hidden mt-0.5 ml-0.5">
              <Link
                to="/login"
                id="mobile-auth-login-btn"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 shadow-2xs transition"
              >
                Log in / Switch &rarr;
              </Link>
            </div>
          </div>

          {/* Desktop Navigation Links (hidden on mobile, moved into hamburger) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
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

          {/* Desktop Right Controls */}
          <div className="hidden md:flex items-center gap-3">
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

          {/* Mobile Right Controls: Notification Bell + Hamburger on the far right */}
          <div className="md:hidden flex items-center gap-1.5">
            {/* Mobile Notification Trigger */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (mobileMenuOpen) setMobileMenuOpen(false);
                }}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                title="Notifications"
                id="mobile-notif-btn"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Mobile Notification Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-3.5 z-50">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <h4 className="font-bold text-slate-900 text-xs">Notifications</h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 mt-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No notifications.</p>
                    ) : (
                      notifications.slice(0, 6).map((n) => (
                        <div key={n.id} className="py-2 text-xs">
                          <p className="font-semibold text-slate-800 text-[11px]">{n.title}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger on the right side */}
            <button
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                if (showNotifications) setShowNotifications(false);
              }}
              className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              aria-label="Toggle navigation menu"
              id="auth-hamburger-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-slate-900" /> : <Menu className="w-6 h-6 text-slate-900" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Hamburger Drawer with ALL Nav Bar Options on the Right */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-md px-4 pt-3 pb-6 shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-150">
          {/* Active User Card */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {user.full_name?.charAt(0) || user.role?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user.full_name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border shrink-0 ${
                roleColors[user.role] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {user.role}
            </span>
          </div>

          {/* ALL Primary Navigation Links based on role */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">
              Navigation Menu
            </p>

            {user.role === 'applicant' && (
              <>
                <Link
                  to="/applicant"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    location.pathname === '/applicant'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    My Applications
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
                <Link
                  to="/applicant/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    location.pathname === '/applicant/new'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-emerald-500" />
                    + New Submission
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </>
            )}

            {(user.role === 'officer' || user.role === 'admin' || user.role === 'auditor') && (
              <Link
                to="/officer/queue"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  location.pathname.startsWith('/officer')
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <ListFilter className="w-4 h-4 text-indigo-500" />
                  Verification Queue
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            )}

            {(user.role === 'compliance' || user.role === 'admin') && (
              <Link
                to="/compliance"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  location.pathname.startsWith('/compliance')
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-500" />
                  Compliance Rules
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            )}

            {(user.role === 'admin' || user.role === 'auditor') && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-500" />
                  System & Audit
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            )}
          </div>

          {/* Quick Demo Persona Switcher (accessible inside hamburger on mobile) */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">
              Switch Persona Role
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {(['applicant', 'officer', 'compliance', 'admin', 'auditor'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => handleMobileSwitchRole(r)}
                  className={`p-2 rounded-lg text-xs font-semibold capitalize border text-left flex items-center justify-between transition ${
                    user.role === r
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{r}</span>
                  {user.role === r && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Logout Button */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out of VALIDATEX
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
