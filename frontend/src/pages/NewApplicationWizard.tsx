import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ApplicationType, DocumentRequirement } from '../types';
import {
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  FileCheck2,
  AlertCircle,
  FileText,
  Lock,
} from 'lucide-react';

export const NewApplicationWizard: React.FC = () => {
  const navigate = useNavigate();
  const [types, setTypes] = useState<ApplicationType[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [step, setStep] = useState<number>(1);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [applicationId, setApplicationId] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { filename: string; size: number; sha256: string }>>({});
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statutoryAgreed, setStatutoryAgreed] = useState(false);

  useEffect(() => {
    async function fetchTypes() {
      try {
        const res = await api.applications.getTypes();
        setTypes(res.types);
        if (res.types.length > 0) {
          setSelectedTypeId(res.types[0].id);
        }
      } catch (err) {
        console.error('Failed to load application types:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTypes();
  }, []);

  const selectedType = types.find((t) => t.id === selectedTypeId);

  // Quick preset data for demo ease
  const handleApplyPreset = () => {
    if (selectedType?.code === 'SCHOLARSHIP_PG') {
      setFormData({
        full_name: 'Rahul Sharma',
        dob: '1999-05-14',
        income_annual: '450000',
        undergrad_gpa: '8.4',
        category: 'General',
        account_no: '987654321012',
        ifsc_code: 'SBIN0001234',
      });
    } else if (selectedType?.code === 'INSTITUTION_ACCREDITATION') {
      setFormData({
        institution_name: 'Rajarambapu Institute of Technology',
        aicte_code: 'AICTE-RIT-1983',
        principal_name: 'Dr. Suresh Patil',
        total_faculty_count: '142',
        establishment_year: '1983',
      });
    } else {
      setFormData({
        company_name: 'Apex Infotech Solutions Pvt Ltd',
        tax_id_pan: 'AAACA1234F',
        gstin: '27AAACA1234F1Z5',
        registered_address: '402 Cyber Tech Park, Sector 5, Navi Mumbai',
      });
    }
  };

  const handleStep1Next = async () => {
    if (!selectedTypeId) return;
    setLoading(true);
    try {
      // Create draft application
      const res = await api.applications.create({
        application_type_id: selectedTypeId,
        title: `${selectedType?.name} - Draft`,
        declared_data: formData,
      });
      setApplicationId(res.application.id);
      setStep(2);
    } catch (err: any) {
      alert(err.message || 'Failed to initiate draft');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Next = async () => {
    // Validate required fields
    if (selectedType) {
      for (const reqField of selectedType.required_fields) {
        if (reqField.required && (!formData[reqField.name] || String(formData[reqField.name]).trim() === '')) {
          alert(`Please fill mandatory field: ${reqField.label}`);
          return;
        }
      }
    }

    try {
      await api.applications.updateDraft(applicationId, {
        declared_data: formData,
      });
      setStep(3);
    } catch (err: any) {
      alert(err.message || 'Failed to save form data');
    }
  };

  const handleFileUpload = async (docType: string, file: File) => {
    setUploadingDocType(docType);
    setUploadError(null);
    try {
      const res = await api.documents.upload(applicationId, docType, file);
      setUploadedDocs((prev) => ({
        ...prev,
        [docType]: {
          filename: res.document.original_filename,
          size: res.document.file_size,
          sha256: res.document.sha256_hash,
        },
      }));
    } catch (err: any) {
      setUploadError(err.message || `Failed to upload ${docType}`);
    } finally {
      setUploadingDocType(null);
    }
  };

  const handleFinalSubmit = async () => {
    if (!statutoryAgreed) {
      alert('You must accept the statutory truthfulness declaration before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.applications.submit(applicationId);
      navigate(`/applicant/dossier/${applicationId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && types.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-500 text-sm">
        Loading application schemas...
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
      {/* Wizard Step Bar */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">New Application Submission</h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete the guided steps to submit verified parameters and supporting documentation
        </p>

        <div className="flex items-center justify-between mt-6 max-w-2xl">
          {[
            { num: 1, label: 'Select Scheme' },
            { num: 2, label: 'Declared Data' },
            { num: 3, label: 'Document Vault' },
            { num: 4, label: 'Review & Submit' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  step === s.num
                    ? 'bg-slate-900 text-white'
                    : step > s.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === s.num ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Select Scheme */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900 mb-1">1. Choose Application Scheme</h2>
          <p className="text-xs text-slate-500 mb-6">
            Select the statutory verification category matching your submission requirements.
          </p>

          <div className="grid grid-cols-1 gap-4">
            {types.map((t) => (
              <label
                key={t.id}
                onClick={() => setSelectedTypeId(t.id)}
                className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition ${
                  selectedTypeId === t.id
                    ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="appType"
                  checked={selectedTypeId === t.id}
                  onChange={() => setSelectedTypeId(t.id)}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{t.name}</span>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.description}</p>
                  <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500">
                    <span>{t.required_fields.length} declared field(s)</span>
                    <span>&bull;</span>
                    <span>{t.required_document_types.length} required document(s)</span>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleStep1Next}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition shadow-sm"
            >
              Continue to Step 2 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Declared Data */}
      {step === 2 && selectedType && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">2. Declared Information</h2>
              <p className="text-xs text-slate-500 mt-0.5">{selectedType.name}</p>
            </div>
            <button
              type="button"
              onClick={handleApplyPreset}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 transition"
            >
              Fill Sample Data
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStep2Next();
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {selectedType.required_fields.map((f) => (
              <div key={f.name} className={f.type === 'string' && f.name.includes('address') ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {f.label} {f.required && <span className="text-rose-500">*</span>}
                </label>
                {f.type === 'select' ? (
                  <select
                    required={f.required}
                    value={formData[f.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="">Select an option</option>
                    {f.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                    required={f.required}
                    value={formData[f.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                )}
                {f.description && <p className="text-[10px] text-slate-400 mt-0.5">{f.description}</p>}
              </div>
            ))}

            <div className="sm:col-span-2 mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition shadow-sm"
              >
                Save & Continue to Documents <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: Document Vault Upload */}
      {step === 3 && selectedType && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="pb-4 border-b border-slate-100 mb-6">
            <h2 className="text-lg font-bold text-slate-900">3. Supporting Evidence Vault</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload clear PDF, JPG, or PNG files. All documents are cryptographically hashed (SHA-256)
              and stored in an isolated private vault.
            </p>
          </div>

          {uploadError && (
            <div className="mb-6 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="space-y-4">
            {selectedType.required_document_types.map((docReq) => {
              const uploaded = uploadedDocs[docReq.type];
              const isUploading = uploadingDocType === docReq.type;

              return (
                <div
                  key={docReq.type}
                  className={`p-5 rounded-xl border transition ${
                    uploaded ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{docReq.label}</span>
                        {docReq.required && (
                          <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                            Mandatory
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{docReq.description}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Max: {docReq.max_size_mb} MB &bull; Supported: PDF, PNG, JPG
                      </p>
                    </div>

                    <div className="shrink-0">
                      {uploaded ? (
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-semibold text-emerald-700 block flex items-center gap-1 justify-end">
                              <Check className="w-3.5 h-3.5" /> Uploaded & Sealed
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 block">
                              SHA: {uploaded.sha256.slice(0, 12)}...
                            </span>
                          </div>
                          <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700">
                            Replace
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileUpload(docReq.type, f);
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition shadow-xs">
                          <UploadCloud className="w-4 h-4" />
                          <span>{isUploading ? 'Extracting & Hashing...' : 'Select File'}</span>
                          <input
                            type="file"
                            disabled={isUploading}
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload(docReq.type, f);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition shadow-sm"
            >
              Review Dossier <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Submit */}
      {step === 4 && selectedType && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="pb-4 border-b border-slate-100 mb-6">
            <h2 className="text-lg font-bold text-slate-900">4. Review Dossier & Final Submission</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify your declared parameters and uploaded documents before submission.
            </p>
          </div>

          {/* Declared Parameters Summary */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Declared Parameters
            </h3>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              {Object.entries(formData).map(([k, v]) => (
                <div key={k}>
                  <span className="text-slate-500 font-medium block capitalize">
                    {k.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-slate-900 font-semibold">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Document Inventory Summary */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Uploaded Documents ({Object.keys(uploadedDocs).length} of {selectedType.required_document_types.length})
            </h3>
            <div className="space-y-2">
              {selectedType.required_document_types.map((reqDoc) => {
                const uploaded = uploadedDocs[reqDoc.type];
                return (
                  <div
                    key={reqDoc.type}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 text-xs"
                  >
                    <span className="font-medium text-slate-800">{reqDoc.label}</span>
                    {uploaded ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Uploaded ({uploaded.filename})
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Missing
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Statutory Declaration Checkbox */}
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={statutoryAgreed}
                onChange={(e) => setStatutoryAgreed(e.target.checked)}
                className="mt-0.5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                I hereby declare under statutory oath that all provided statements and document evidence
                are genuine and unaltered. I understand that submitting fraudulent or tampered documents
                constitutes a legal offence under applicable regulations and will trigger immediate
                investigation and audit logging.
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              type="button"
              disabled={isSubmitting || !statutoryAgreed}
              onClick={handleFinalSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition shadow-sm disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>{isSubmitting ? 'Submitting & Triggering Pipeline...' : 'Submit Application'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
