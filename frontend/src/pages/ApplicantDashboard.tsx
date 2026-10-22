import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Application } from '../types';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import {
  FileText,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Download,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const ApplicantDashboard: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await api.applications.list();
      setApplications(res.applications);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const totalCount = applications.length;
  const underReviewCount = applications.filter((a) => ['submitted', 'processing', 'under_review'].includes(a.status)).length;
  const actionRequiredCount = applications.filter((a) => a.status === 'action_required').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Applicant Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track submission dossiers, upload required evidence, and view verification reports
          </p>
        </div>
        <Link
          to="/applicant/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Start New Application
        </Link>
      </div>

      {/* Action Required Banner if any application needs resubmission */}
      {actionRequiredCount > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-900">
              Immediate Action Required on {actionRequiredCount} Application(s)
            </h4>
            <p className="text-xs text-rose-700 mt-0.5">
              The verification officer has requested document or field corrections. Please inspect the
              flagged items and resubmit.
            </p>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Submissions
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{totalCount}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Under Verification
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">{underReviewCount}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Action Required
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1">{actionRequiredCount}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Approved & Sealed
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">{approvedCount}</p>
        </div>
      </div>

      {/* Applications List */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Your Applications</h2>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
            Loading your applications...
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No applications created yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Initiate an application for institutional scholarships, program approval, or vendor KYC.
            </p>
            <Link
              to="/applicant/new"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition"
            >
              <Plus className="w-4 h-4" /> Create Your First Application
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition p-5 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                        {app.reference_no}
                      </span>
                      <StatusBadge status={app.status} />
                      <PriorityBadge priority={app.priority} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-2">{app.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {app.application_type_name} &bull; Created on {new Date(app.created_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <Link
                      to={`/applicant/dossier/${app.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
                    >
                      <span>Open Dossier</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Priority / Explanation note */}
                {app.priority_reason && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="truncate pr-4">
                      <strong className="text-slate-700 font-semibold">Audit Status:</strong> {app.priority_reason}
                    </span>
                    <span className="shrink-0 text-slate-400 text-[11px]">
                      {app.documents_count || 0} document(s) uploaded
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
