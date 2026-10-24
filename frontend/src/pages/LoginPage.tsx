import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAssignedRoute } from '../lib/roleNavigation';
import { ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect directly to assigned role portal
  useEffect(() => {
    if (user) {
      navigate(getAssignedRoute(user.role), { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(getAssignedRoute(loggedInUser?.role), { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 shadow-md p-8">
        <div className="text-center mb-8">
          <div className="w-24 h-14 rounded-xl bg-white flex items-center justify-center mx-auto shadow-xs p-1 border border-slate-200 overflow-hidden">
            <img src="/ValidateXLogo.svg" alt="VALIDATEX Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-4">Sign in to VALIDATEX</h2>
          <p className="text-xs text-slate-500 mt-1">Institutional verification portal</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. applicant@validx.ai"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {submitting ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Seed Credentials Picker */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
            Demo Credentials (Password: Password@123)
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickFill('applicant@validx.ai')}
              className="px-2 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 text-left"
            >
              <span className="font-bold block">Applicant</span>
              <span className="text-[10px] text-slate-400">applicant@validx.ai</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('officer@validx.ai')}
              className="px-2 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 text-left"
            >
              <span className="font-bold block">Verification Officer</span>
              <span className="text-[10px] text-slate-400">officer@validx.ai</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('compliance@validx.ai')}
              className="px-2 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 text-left"
            >
              <span className="font-bold block">Compliance Officer</span>
              <span className="text-[10px] text-slate-400">compliance@validx.ai</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin@validx.ai')}
              className="px-2 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 text-left"
            >
              <span className="font-bold block">Administrator</span>
              <span className="text-[10px] text-slate-400">admin@validx.ai</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
            Register as Applicant
          </Link>
        </p>
      </div>
    </div>
  );
};
