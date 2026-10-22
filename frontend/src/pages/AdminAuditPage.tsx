import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AuditEvent, User } from '../types';
import {
  Activity,
  Users,
  Shield,
  Database,
  Cpu,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
} from 'lucide-react';

export const AdminAuditPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'audit' | 'telemetry' | 'users'>('audit');

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [healthRes, usersRes, auditRes] = await Promise.all([
        api.admin.getSystemHealth(),
        api.admin.getUsers(),
        api.admin.getAuditEvents({ limit: 100 }),
      ]);
      setHealth(healthRes);
      setUsers(usersRes.users);
      setAuditEvents(auditRes.events);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const filteredEvents = auditEvents.filter((e) => {
    if (actionFilter && !e.action.includes(actionFilter)) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        e.action.toLowerCase().includes(q) ||
        e.resource_type.toLowerCase().includes(q) ||
        JSON.stringify(e.metadata).toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-indigo-600" /> Administration & Audit Governance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            System telemetry, user directory, and tamper-resistant cryptographic audit logging
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'audit'
                ? 'bg-white shadow-xs text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Trail ({auditEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'telemetry'
                ? 'bg-white shadow-xs text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            System Telemetry
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'users'
                ? 'bg-white shadow-xs text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            User Accounts ({users.length})
          </button>
        </div>
      </div>

      {/* TAB 1: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="mt-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Filter Action:</span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="">All Actions</option>
                <option value="APPLICATION">Application Events</option>
                <option value="DOCUMENT">Document Ingestion Events</option>
                <option value="VERIFICATION">Verification Engine Events</option>
                <option value="DISCREPANCY">Discrepancy Actions</option>
                <option value="COMPLIANCE">Compliance Rule Events</option>
                <option value="LOGIN">Authentication Events</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">Loading audit events...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">No audit events found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Resource</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Outcome</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-50/70 font-mono text-[11px]">
                        <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(evt.timestamp).toLocaleString('en-GB')}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{evt.action}</td>
                        <td className="py-2.5 px-4">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                            {evt.resource_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 font-sans">
                          {evt.actor_role ? (
                            <span className="capitalize font-semibold text-indigo-700">
                              {evt.actor_role}
                            </span>
                          ) : (
                            <span className="text-slate-400">System</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold text-[10px] uppercase ${
                              evt.outcome === 'success'
                                ? 'bg-emerald-50 text-emerald-700'
                                : evt.outcome === 'denied'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {evt.outcome}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">
                          {JSON.stringify(evt.metadata || {})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM TELEMETRY */}
      {activeTab === 'telemetry' && health && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                System Status
              </span>
              <p className="text-xl font-extrabold text-emerald-600 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> {health.status}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Memory RSS
              </span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                {health.system.memory_rss_mb} MB
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Node Uptime
              </span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                {Math.round(health.system.uptime_seconds)}s
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Platform Runtime
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {health.system.os_platform} ({health.system.node_version})
              </p>
            </div>
          </div>

          {/* Counts & Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" /> Database Relational Records
              </h3>
              <div className="space-y-3 text-xs">
                {Object.entries(health.counts).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-600 capitalize">{k.replace(/_/g, ' ')}:</span>
                    <span className="font-bold text-slate-900 font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" /> Pipeline Priority Distribution
              </h3>
              <div className="space-y-3 text-xs">
                {Object.entries(health.breakdowns.priority).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-600 capitalize">{k} Priority:</span>
                    <span className="font-bold text-slate-900 font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USER ACCOUNTS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.full_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(u.created_at || '').toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
