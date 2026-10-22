import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { PriorityBadge, StatusBadge, OutcomeBadge } from '../components/Badges';
import {
  ShieldCheck,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ExternalLink,
  UploadCloud,
  FileCheck2,
} from 'lucide-react';

export const ApplicantDossierPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resubmitting, setResubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>('');

  const fetchDossier = async () => {
    if (!id) return;
    try {
      const res = await api.applications.getById(id);
      setData(res);
    } catch (err) {
      console.error('Failed to load application dossier:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossier();
    const interval = setInterval(fetchDossier, 6000);
    return () => clearInterval(interval);
  }, [id]);

  const handleUploadReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedDocType || !id) return;
    try {
      await api.documents.upload(id, selectedDocType, selectedFile);
      setSelectedFile(null);
      setSelectedDocType('');
      fetchDossier();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    }
  };

  const handleResubmit = async () => {
    if (!id) return;
    setResubmitting(true);
    try {
      await api.applications.submit(id);
      fetchDossier();
    } catch (err: any) {
      alert(err.message || 'Resubmission failed');
    } finally {
      setResubmitting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-500 text-sm">
        Loading application dossier...
      </div>
    );
  }

  const { application, documents, verification_checks, discrepancies, reports, decisions } = data;
  const latestReport = reports && reports.length > 0 ? reports[reports.length - 1] : null;
  const isActionRequired = application.status === 'action_required';

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/applicant"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Applications
        </Link>
      </div>

      {/* Header Dossier Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                {application.reference_no}
              </span>
              <StatusBadge status={application.status} />
              <PriorityBadge priority={application.priority} />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2.5">
              {application.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheme: <strong className="text-slate-700">{application.application_type?.name}</strong> &bull; Submitted on{' '}
              {application.submitted_at ? new Date(application.submitted_at).toLocaleString('en-GB') : 'Draft'}
            </p>
          </div>

          {/* Download Official Report Button */}
          {latestReport && (
            <a
              href={api.reports.getDownloadUrl(latestReport.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm shrink-0"
            >
              <Download className="w-4 h-4" /> Download Official Verification Report
            </a>
          )}
        </div>
      </div>

      {/* Action Required Correction Box */}
      {isActionRequired && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-base font-bold text-rose-900">
                Review Officer Requested Corrections
              </h3>
              {decisions && decisions.length > 0 && (
                <p className="text-xs text-rose-800 mt-1 font-medium bg-white/70 p-3 rounded-lg border border-rose-100">
                  <strong>Officer Directive:</strong> {decisions[decisions.length - 1].reason}
                </p>
              )}

              {/* Upload corrected document */}
              <form onSubmit={handleUploadReplacement} className="mt-4 flex flex-wrap items-center gap-3">
                <select
                  required
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 text-xs bg-white text-slate-800"
                >
                  <option value="">Select document to replace/upload</option>
                  {application.application_type?.required_document_types?.map((d: any) => (
                    <option key={d.type} value={d.type}>
                      {d.label}
                    </option>
                  ))}
                </select>

                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-600"
                />

                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  Upload Correction
                </button>
              </form>

              <div className="mt-4 pt-3 border-t border-rose-200/60 flex justify-end">
                <button
                  onClick={handleResubmit}
                  disabled={resubmitting}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {resubmitting ? 'Resubmitting...' : 'Resubmit Corrected Application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Parameters & Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Declared Parameters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
            Declared Parameters
          </h3>
          <div className="space-y-3 text-xs">
            {Object.entries(application.declared_data || {}).map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 capitalize">{k.replace(/_/g, ' ')}:</span>
                <span className="text-slate-900 font-semibold">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Document Vault Inventory */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Document Vault Evidence</span>
            <span className="text-[11px] font-normal text-slate-400">
              {documents?.length || 0} file(s)
            </span>
          </h3>

          <div className="space-y-3">
            {documents?.map((doc: any) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900">{doc.original_filename}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    SHA-256: {doc.sha256_hash.slice(0, 20)}... &bull; {(doc.file_size / 1024).toFixed(1)} KB
                  </p>
                </div>

                <a
                  href={api.documents.getContentUrl(doc.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-medium text-slate-700 flex items-center gap-1"
                >
                  <span>Preview</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verification Checks Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mt-8">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
          Automated Verification Check Log
        </h3>

        {verification_checks?.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            Verification checks pending automated worker evaluation.
          </p>
        ) : (
          <div className="space-y-2.5">
            {verification_checks?.map((chk: any) => (
              <div
                key={chk.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{chk.check_type}</span>
                    <OutcomeBadge outcome={chk.outcome} />
                  </div>
                  <p className="text-slate-600 mt-1">{chk.explanation}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                  {new Date(chk.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
