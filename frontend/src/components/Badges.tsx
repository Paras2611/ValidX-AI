import React from 'react';
import { PriorityLevel, ApplicationStatus, CheckOutcome } from '../types';
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, XCircle, HelpCircle } from 'lucide-react';

export const PriorityBadge: React.FC<{ priority: PriorityLevel; showIcon?: boolean }> = ({
  priority,
  showIcon = true,
}) => {
  const styles: Record<PriorityLevel, { bg: string; text: string; border: string; icon: any }> = {
    high: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: ShieldAlert,
    },
    medium: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: AlertTriangle,
    },
    low: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: CheckCircle,
    },
    inconclusive: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: HelpCircle,
    },
  };

  const current = styles[priority] || styles.low;
  const Icon = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.bg} ${current.text} ${current.border}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span className="uppercase tracking-wider">{priority} PRIORITY</span>
    </span>
  );
};

export const StatusBadge: React.FC<{ status: ApplicationStatus }> = ({ status }) => {
  const config: Record<ApplicationStatus, { label: string; bg: string; text: string; dot: string }> = {
    draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
    submitted: { label: 'Submitted', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    processing: { label: 'Processing Pipeline', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500 animate-pulse' },
    processing_failed: { label: 'Processing Failed', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
    under_review: { label: 'Under Review', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    action_required: { label: 'Action Required', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500 animate-bounce' },
    resubmitted: { label: 'Resubmitted', bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
    approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    rejected: { label: 'Rejected', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
    withdrawn: { label: 'Withdrawn', bg: 'bg-zinc-100', text: 'text-zinc-600', dot: 'bg-zinc-400' },
    archived: { label: 'Archived', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  };

  const current = config[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${current.bg} ${current.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
};

export const OutcomeBadge: React.FC<{ outcome: CheckOutcome }> = ({ outcome }) => {
  switch (outcome) {
    case 'passed':
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          <CheckCircle className="w-3 h-3 text-emerald-600" /> PASS
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-xs bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
          <XCircle className="w-3 h-3 text-rose-600" /> FAIL
        </span>
      );
    case 'inconclusive':
    case 'manual_review':
      return (
        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" /> MANUAL REVIEW
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-slate-600 font-medium text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          NOT CONFIGURED
        </span>
      );
  }
};
