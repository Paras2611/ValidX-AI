import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { PriorityBadge, StatusBadge, OutcomeBadge } from '../components/Badges';
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ExternalLink,
  ArrowLeft,
  MessageSquare,
  UserCheck,
  Download,
  AlertCircle,
  Check,
  Send,
  Eye,
  FileCheck,
} from 'lucide-react';

export const ThreePanelReviewWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active document selected in Panel B
  const [selectedDocId, setSelectedDocId] = useState<string>('');

  // Modals state
  const [showResolveModal, setShowResolveModal] = useState<any>(null);
  const [resolveStatus, setResolveStatus] = useState<string>('resolved');
  const [resolveReason, setResolveReason] = useState<string>('');

  const [showConfirmFieldModal, setShowConfirmFieldModal] = useState<any>(null);
  const [correctedValue, setCorrectedValue] = useState<string>('');

  const [showDecisionModal, setShowDecisionModal] = useState<'approve' | 'reject' | 'request_corrections' | null>(null);
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [decisionNotes, setDecisionNotes] = useState<string>('');
  const [requiresInspection, setRequiresInspection] = useState<boolean>(false);
  const [inspectionCommittee, setInspectionCommittee] = useState<string>('EVC');
  const [infraObservations, setInfraObservations] = useState<string>('');
  const [submittingDecision, setSubmittingDecision] = useState<boolean>(false);

  const [newComment, setNewComment] = useState<string>('');
  const [isInternalComment, setIsInternalComment] = useState<boolean>(true);
  const [mobileActivePanel, setMobileActivePanel] = useState<'A' | 'B' | 'C'>('B');

  const fetchApplicationData = async () => {
    if (!id) return;
    try {
      const res = await api.applications.getById(id);
      setData(res);
      if (res.documents.length > 0 && !selectedDocId) {
        setSelectedDocId(res.documents[0].id);
      }
    } catch (err) {
      console.error('Failed to load application in workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationData();
  }, [id]);

  const handleAssignToMe = async () => {
    if (!id) return;
    try {
      await api.reviews.assign(id);
      fetchApplicationData();
    } catch (err: any) {
      alert(err.message || 'Assignment failed');
    }
  };

  const handleResolveDiscrepancySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResolveModal || !resolveReason.trim()) {
      alert('Mandatory resolution reason is required');
      return;
    }
    try {
      await api.reviews.resolveDiscrepancy(showResolveModal.id, resolveStatus, resolveReason);
      setShowResolveModal(null);
      setResolveReason('');
      fetchApplicationData();
    } catch (err: any) {
      alert(err.message || 'Failed to update discrepancy');
    }
  };

  const handleConfirmFieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConfirmFieldModal) return;
    try {
      await api.reviews.confirmField(showConfirmFieldModal.id, correctedValue || undefined);
      setShowConfirmFieldModal(null);
      setCorrectedValue('');
      fetchApplicationData();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm field');
    }
  };

  const handleRecordDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDecisionModal || !id || !decisionReason.trim()) {
      alert('Decision reason is mandatory');
      return;
    }
    setSubmittingDecision(true);
    try {
      if (showDecisionModal === 'approve') {
        await api.reviews.approve(id, decisionReason, decisionNotes, {
          requires_physical_inspection: requiresInspection,
          inspection_committee_type: inspectionCommittee,
          infrastructure_observations: infraObservations,
        });
      } else if (showDecisionModal === 'reject') {
        await api.reviews.reject(id, decisionReason, decisionNotes, {
          requires_physical_inspection: requiresInspection,
          inspection_committee_type: inspectionCommittee,
          infrastructure_observations: infraObservations,
        });
      } else if (showDecisionModal === 'request_corrections') {
        await api.reviews.requestCorrections(id, decisionReason, decisionNotes);
      }
      setShowDecisionModal(null);
      setDecisionReason('');
      setDecisionNotes('');
      setRequiresInspection(false);
      setInfraObservations('');
      fetchApplicationData();
    } catch (err: any) {
      alert(err.message || 'Failed to record decision');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !id) return;
    try {
      await api.reviews.addComment(id, newComment, isInternalComment);
      setNewComment('');
      fetchApplicationData();
    } catch (err: any) {
      alert(err.message || 'Failed to add comment');
    }
  };

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-500 text-sm">
        Initializing Three-Panel Review Workspace...
      </div>
    );
  }

  const {
    application,
    documents,
    extracted_fields,
    verification_checks,
    issuing_authority_checks = [],
    document_anomalies = [],
    discrepancies,
    rule_evaluations,
    comments,
    reports,
  } = data;

  const selectedDocument = documents.find((d: any) => d.id === selectedDocId) || documents[0];
  const selectedDocFields = extracted_fields.filter(
    (f: any) => f.document_id === selectedDocument?.id
  );
  const aiAnalysis = application.metadata?.ai_analysis;
  const latestReport = reports && reports.length > 0 ? reports[reports.length - 1] : null;

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-h-screen">
      {/* Workspace Top Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-16 z-40">
        <div className="flex items-center gap-3">
          <Link
            to="/officer/queue"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            title="Back to Review Queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {application.reference_no}
              </span>
              <StatusBadge status={application.status} />
              <PriorityBadge priority={application.priority} />
            </div>
            <h1 className="text-sm font-bold text-slate-900 mt-0.5">{application.title}</h1>
          </div>
        </div>

        {/* Top Actions: Officer Assignment, Decision Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {!application.assigned_officer_id ? (
            <button
              onClick={handleAssignToMe}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" /> Assign To Me
            </button>
          ) : (
            <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-50 rounded border border-slate-200">
              Assigned: {application.assigned_officer?.full_name || 'Officer'}
            </span>
          )}

          {latestReport && (
            <a
              href={api.reports.getDownloadUrl(latestReport.id)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Verified Report
            </a>
          )}

          {/* Consequential Decision Triggers */}
          <button
            onClick={() => {
              setShowDecisionModal('request_corrections');
              setDecisionReason('');
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
          >
            Request Corrections
          </button>
          <button
            onClick={() => {
              setShowDecisionModal('reject');
              setDecisionReason('');
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
          >
            Reject Application
          </button>
          <button
            onClick={() => {
              setShowDecisionModal('approve');
              setDecisionReason(
                'All mandatory documents verified, identity concordance validated, and statutory income/gpa compliance criteria met.'
              );
            }}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve Application
          </button>
        </div>
      </div>

      {/* Mobile Panel Selector Bar (<lg screens) */}
      <div className="lg:hidden bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-1 text-xs shrink-0">
        <button
          onClick={() => setMobileActivePanel('A')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition ${
            mobileActivePanel === 'A'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          A: Parameters
        </button>
        <button
          onClick={() => setMobileActivePanel('B')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition ${
            mobileActivePanel === 'B'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          B: Document ({documents?.length || 0})
        </button>
        <button
          onClick={() => setMobileActivePanel('C')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition flex items-center justify-center gap-1 ${
            mobileActivePanel === 'C'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span>C: Audit & AI</span>
          {discrepancies?.filter((d: any) => d.status === 'open').length > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-bold">
              {discrepancies.filter((d: any) => d.status === 'open').length}
            </span>
          )}
        </button>
      </div>

      {/* The PRD Section 12 Three-Panel Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* PANEL A: Application Parameters, Declared Data & Notes (Col 1 to 3) */}
        <div className={`lg:col-span-3 bg-white border-r border-slate-200 p-5 overflow-y-auto max-h-[calc(100vh-160px)] lg:max-h-[calc(100vh-130px)] ${
          mobileActivePanel === 'A' ? 'block' : 'hidden lg:block'
        }`}>
          <div className="pb-3 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Panel A
            </span>
            <h2 className="text-sm font-bold text-slate-900">Application Parameters</h2>
          </div>

          {/* Applicant Identity */}
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Applicant Profile
            </span>
            <p className="text-xs font-bold text-slate-900 mt-1">
              {application.applicant?.full_name}
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              {application.applicant?.email}
            </p>
            <span className="inline-block mt-2 text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">
              {application.application_type?.category}
            </span>
          </div>

          {/* Declared Parameters Table */}
          <div className="mt-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Declared Values
            </h3>
            <div className="space-y-2 text-xs divide-y divide-slate-100">
              {Object.entries(application.declared_data || {}).map(([key, value]) => (
                <div key={key} className="pt-2">
                  <span className="text-[11px] text-slate-500 capitalize block">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-xs font-semibold text-slate-900 block mt-0.5">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviewer Comments & Notes */}
          <div className="mt-8 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Reviewer Notes</span>
              <span className="text-[10px] font-normal text-slate-400">{comments?.length || 0}</span>
            </h3>

            <div className="space-y-2.5 max-h-48 overflow-y-auto mb-3">
              {comments?.map((c: any) => (
                <div key={c.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-700">{c.reviewer_name || 'Officer'}</span>
                    {c.is_internal && (
                      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                        Internal
                      </span>
                    )}
                  </div>
                  <p className="text-slate-800 text-xs leading-relaxed">{c.comment}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="mt-2 space-y-2">
              <textarea
                rows={2}
                placeholder="Add audit note..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternalComment}
                    onChange={(e) => setIsInternalComment(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Internal note only</span>
                </label>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  Post Note
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* PANEL B: Evidence & Document Inspector (Col 4 to 8) */}
        <div className={`lg:col-span-5 bg-slate-50 border-r border-slate-200 flex-col max-h-[calc(100vh-160px)] lg:max-h-[calc(100vh-130px)] overflow-hidden ${
          mobileActivePanel === 'B' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Document Tabs */}
          <div className="bg-white border-b border-slate-200 p-2.5 flex items-center gap-1 overflow-x-auto">
            {documents?.map((doc: any) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedDocument?.id === doc.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate max-w-[130px]">{doc.original_filename}</span>
              </button>
            ))}
          </div>

          {/* Embedded Document Preview / Viewer */}
          <div className="flex-1 bg-slate-200/80 p-3 overflow-hidden flex flex-col">
            {selectedDocument ? (
              <div className="flex-1 bg-white rounded-xl border border-slate-300 shadow-inner overflow-hidden flex flex-col">
                <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{selectedDocument.original_filename}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      SHA: {selectedDocument.sha256_hash.slice(0, 16)}...
                    </span>
                  </div>
                  <a
                    href={api.documents.getContentUrl(selectedDocument.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Raw Stream</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex-1 relative overflow-auto p-4 flex items-center justify-center bg-slate-50">
                  {selectedDocument.mime_type.startsWith('image/') ? (
                    <img
                      src={api.documents.getContentUrl(selectedDocument.id)}
                      alt={selectedDocument.original_filename}
                      className="max-w-full max-h-full object-contain rounded-lg border border-slate-200 shadow-sm"
                    />
                  ) : (
                    <iframe
                      src={api.documents.getContentUrl(selectedDocument.id)}
                      title={selectedDocument.original_filename}
                      className="w-full h-full min-h-[350px] border-none"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                No documents uploaded for inspection
              </div>
            )}
          </div>

          {/* Bottom Extracted Fields Tray for Selected Document */}
          <div className="bg-white border-t border-slate-200 p-4 max-h-56 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                OCR Extracted Fields ({selectedDocFields.length})
              </span>
              <span className="text-[10px] text-slate-400">Click field to confirm/correct</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {selectedDocFields.map((f: any) => (
                <div
                  key={f.id}
                  onClick={() => {
                    setShowConfirmFieldModal(f);
                    setCorrectedValue(f.raw_value);
                  }}
                  className={`p-2 rounded-lg border cursor-pointer hover:border-indigo-400 transition text-xs ${
                    f.is_confirmed
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 capitalize text-[11px]">
                      {f.field_name.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 rounded ${
                        f.confidence > 0.8
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {Math.round(f.confidence * 100)}%
                    </span>
                  </div>
                  <span className="text-slate-900 font-bold block mt-1 truncate">
                    {f.raw_value}
                  </span>
                  {f.is_confirmed && (
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Officer Confirmed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PANEL C: Audit Outcomes, Discrepancies & AI Advisor (Col 9 to 12) */}
        <div className={`lg:col-span-4 bg-white p-5 overflow-y-auto max-h-[calc(100vh-160px)] lg:max-h-[calc(100vh-130px)] space-y-6 ${
          mobileActivePanel === 'C' ? 'block' : 'hidden lg:block'
        }`}>
          <div className="pb-3 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Panel C
            </span>
            <h2 className="text-sm font-bold text-slate-900">Audit & AI Determinations</h2>
          </div>

          {/* AI Advisory Card */}
          {aiAnalysis && (
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-xs text-indigo-900">
                  AI Advisory Verification Summary
                </span>
                <span className="ml-auto text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono">
                  Schema-Validated
                </span>
              </div>
              <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                {aiAnalysis.executive_summary}
              </p>
              <div className="mt-3 pt-2.5 border-t border-indigo-200/60 text-[11px] text-indigo-900">
                <strong>Recommended Determination:</strong>{' '}
                <span className="uppercase font-bold text-indigo-700">
                  {aiAnalysis.recommended_decision.replace(/_/g, ' ')}
                </span>
                <p className="text-[11px] text-indigo-800 mt-0.5">
                  {aiAnalysis.decision_rationale}
                </p>
              </div>
            </div>
          )}

          {/* Flagged Discrepancies Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Flagged Discrepancies</span>
              </h3>
              <span className="text-xs font-bold text-rose-600">
                {discrepancies?.filter((d: any) => d.status === 'open').length} Open
              </span>
            </div>

            {discrepancies?.length === 0 ? (
              <p className="text-xs text-emerald-700 font-medium bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Zero field discrepancies detected during cross-validation.
              </p>
            ) : (
              <div className="space-y-3">
                {discrepancies?.map((disc: any) => (
                  <div
                    key={disc.id}
                    className={`p-3 rounded-xl border text-xs transition ${
                      disc.status === 'open'
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-slate-50 border-slate-200 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 capitalize">
                        {disc.field_name.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          disc.status === 'open'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {disc.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-2 bg-white p-2 rounded-lg border border-slate-200/80 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Declared:</span>
                        <span className="font-semibold text-slate-900">{disc.declared_value}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Observed Evidence:</span>
                        <span className="font-semibold text-rose-700">{disc.observed_value}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-tight mb-2">
                      {disc.explanation}
                    </p>

                    {disc.status === 'open' ? (
                      <button
                        onClick={() => {
                          setShowResolveModal(disc);
                          setResolveReason('');
                        }}
                        className="w-full py-1.5 rounded-lg bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 font-semibold text-xs transition text-center"
                      >
                        Resolve Discrepancy
                      </button>
                    ) : (
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                        <strong>Resolution:</strong> {disc.resolution_reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Original Issuing Authorities Verification (Section 3.E) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Issuing Authority Verification</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                {issuing_authority_checks.length} Registered
              </span>
            </div>

            {issuing_authority_checks.length === 0 ? (
              <p className="text-xs text-slate-500 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                No external issuing authority checks registered for this application.
              </p>
            ) : (
              <div className="space-y-2">
                {issuing_authority_checks.map((ac: any) => (
                  <div
                    key={ac.id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-[11px]">{ac.authority_name}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          ac.status === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ac.status === 'not_configured'
                            ? 'bg-slate-100 text-slate-700'
                            : ac.status === 'source_unavailable'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {ac.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Method: <span className="font-mono">{ac.verification_method}</span> &bull; Identifier:{' '}
                      <span className="font-mono text-slate-700">{ac.input_identifier}</span>
                    </div>
                    {ac.notes && (
                      <p className="text-[10px] text-slate-600 mt-1 italic">{ac.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anomaly & Forgery Detection (Section 3.D) */}
          {document_anomalies.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Potential Anomalies Flagged ({document_anomalies.length})</span>
              </h3>
              <div className="space-y-2">
                {document_anomalies.map((an: any) => (
                  <div key={an.id} className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-900 text-[11px]">{an.category.replace(/_/g, ' ')}</span>
                      <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-semibold">
                        {(an.confidence * 100).toFixed(0)}% Conf.
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-snug">{an.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statutory Compliance Rules Outcomes */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Statutory Compliance Rules
            </h3>
            <div className="space-y-2">
              {rule_evaluations?.map((ev: any) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-lg border border-slate-200 text-xs flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <OutcomeBadge outcome={ev.outcome} />
                    </div>
                    <p className="text-slate-700 mt-1 leading-snug">{ev.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Resolve Discrepancy */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Resolve Flagged Discrepancy</h3>
            <p className="text-xs text-slate-500 mt-1">
              Field: <strong>{showResolveModal.field_name}</strong> &bull; Declared:{' '}
              {showResolveModal.declared_value} vs Observed: {showResolveModal.observed_value}
            </p>

            <form onSubmit={handleResolveDiscrepancySubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Status
                </label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                >
                  <option value="resolved">Resolved (Approved as genuine)</option>
                  <option value="dismissed">Dismissed (Minor transliteration/format variance)</option>
                  <option value="escalated">Escalated (Referred to Special Inquiry)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Resolution Reason / Statutory Justification
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolveReason}
                  onChange={(e) => setResolveReason(e.target.value)}
                  placeholder="State the audit basis for resolving this discrepancy..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirm / Correct Field */}
      {showConfirmFieldModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Confirm OCR Extracted Field</h3>
            <p className="text-xs text-slate-500 mt-1">
              Field: <strong>{showConfirmFieldModal.field_name}</strong> (Confidence:{' '}
              {Math.round(showConfirmFieldModal.confidence * 100)}%)
            </p>

            <form onSubmit={handleConfirmFieldSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Extracted Raw Value (Edit to correct OCR scan)
                </label>
                <input
                  type="text"
                  required
                  value={correctedValue}
                  onChange={(e) => setCorrectedValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfirmFieldModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Confirm Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Final Decision (Approve / Reject / Corrections) */}
      {showDecisionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              {showDecisionModal === 'approve' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              )}
              {showDecisionModal === 'reject' && <XCircle className="w-5 h-5 text-rose-600" />}
              {showDecisionModal === 'request_corrections' && (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <h3 className="text-base font-bold text-slate-900 capitalize">
                {showDecisionModal.replace(/_/g, ' ')} Application
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Application Ref: <strong>{application.reference_no}</strong> &bull; Applicant:{' '}
              {application.applicant?.full_name}
            </p>

            <form onSubmit={handleRecordDecision} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Statutory Reason / Official Justification
                </label>
                <textarea
                  required
                  rows={3}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Record formal statutory rationale..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Confidential Audit Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Notes for compliance & quality auditors..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* AICTE Infrastructure & Physical Inspection Controls (Section 3.G) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={requiresInspection}
                    onChange={(e) => setRequiresInspection(e.target.checked)}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                  <span>Recommend On-Site Physical Inspection (EVC Committee Visit)</span>
                </label>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Mandatory safeguard: Computer-vision and document scans alone do not certify physical campus readiness. Flag potential gaps for authorized on-site physical inspection.
                </p>

                {requiresInspection && (
                  <div className="pt-2 space-y-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Inspection Committee Type
                      </label>
                      <select
                        value={inspectionCommittee}
                        onChange={(e) => setInspectionCommittee(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                      >
                        <option value="EVC">Expert Visit Committee (EVC - Comprehensive Inspection)</option>
                        <option value="SAC">Standing Appeal Committee (SAC - Special Redressal)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Infrastructure Observations / Physical Gaps Noted
                      </label>
                      <input
                        type="text"
                        value={infraObservations}
                        onChange={(e) => setInfraObservations(e.target.value)}
                        placeholder="e.g. Laboratory equipment verification & fire escape width check required"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecision}
                  className={`px-5 py-2 rounded-lg text-white text-xs font-bold transition shadow-xs ${
                    showDecisionModal === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : showDecisionModal === 'reject'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-500 hover:bg-amber-600'
                  }`}
                >
                  {submittingDecision ? 'Recording Determination...' : 'Commit Final Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
