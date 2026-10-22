import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { PriorityLevel } from '../types';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Filter,
  Search,
  ChevronRight,
  UserCheck,
  FileCheck2,
} from 'lucide-react';

export const OfficerQueuePage: React.FC = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [assignedToMe, setAssignedToMe] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.reviews.getQueue({
        priority: priorityFilter || undefined,
        status: statusFilter || undefined,
        assigned_to_me: assignedToMe,
      });
      setQueue(res.queue);
      setMetrics(res.metrics);
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [priorityFilter, statusFilter, assignedToMe]);

  const filtered = queue.filter((item) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.reference_no?.toLowerCase().includes(q) ||
      item.title?.toLowerCase().includes(q) ||
      item.applicant_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Verification Officer Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Prioritized review pipeline with deterministic cross-validation signals and AI advisory summaries
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total In Queue
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {metrics.total_in_queue}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> High Priority
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1">
              {metrics.high_priority}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Medium Priority
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">
              {metrics.medium_priority}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              Action Required
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600 mt-1">
              {metrics.action_required}
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="mt-8 bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Priority filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
            >
              <option value="">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
              <option value="inconclusive">Inconclusive</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
            >
              <option value="">All Active Statuses</option>
              <option value="under_review">Under Review</option>
              <option value="action_required">Action Required</option>
              <option value="resubmitted">Resubmitted</option>
            </select>
          </div>

          {/* Assigned to me toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={assignedToMe}
              onChange={(e) => setAssignedToMe(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Assigned to me only</span>
          </label>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search reference, applicant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>
      </div>

      {/* Queue Table */}
      <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading review queue...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No applications match the current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ref / Title</th>
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Priority & Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Issues</th>
                  <th className="py-3 px-4">Assigned Officer</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-indigo-700 block">
                        {app.reference_no}
                      </span>
                      <span className="font-semibold text-slate-900 block truncate max-w-xs">
                        {app.title}
                      </span>
                      <span className="text-[11px] text-slate-400">{app.application_type_name}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-900 block">{app.applicant_name}</span>
                      <span className="text-[11px] text-slate-400">{app.applicant_email}</span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <PriorityBadge priority={app.priority} />
                      {app.priority_reason && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                          {app.priority_reason}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={app.status} />
                    </td>

                    <td className="py-3.5 px-4">
                      {app.open_discrepancies_count > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {app.open_discrepancies_count} Open
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">Clean</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {app.assigned_officer_name ? (
                        <span className="font-medium text-slate-900">{app.assigned_officer_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/officer/review/${app.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
                      >
                        <span>Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
