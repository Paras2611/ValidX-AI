import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Cpu,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Award,
  Zap,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();

  const handleDemoLogin = async (role: UserRole) => {
    await switchRole(role);
    if (role === 'applicant') navigate('/applicant');
    else if (role === 'officer') navigate('/officer/queue');
    else if (role === 'compliance') navigate('/compliance');
    else navigate('/admin');
  };

  return (
    <div className="flex-1 bg-slate-50">
      {/* Top Banner */}
      <div className="bg-slate-900 text-slate-300 py-2.5 px-4 text-xs font-medium text-center border-b border-slate-800">
        <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-400">
          <Award className="w-3.5 h-3.5" /> SIH26261 Smart Automation Challenge
        </span>
        <span className="mx-2 text-slate-600">|</span>
        <span>AICTE Institutional Application & Document Verification System</span>
        <span className="mx-2 text-slate-600">|</span>
        <span className="text-emerald-400 font-semibold">Production Ready MVP</span>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-28 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="mb-6 flex justify-center">
              <div className="p-1.5 bg-white rounded-2xl shadow-lg shadow-indigo-100 border border-slate-200/90 inline-flex items-center justify-center">
                <img src="/ValidateXLogo.svg" alt="VALIDATEX Logo" className="h-16 sm:h-20 w-auto object-contain rounded-xl" />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6">
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Validate Smarter. Verify Faster. Trust Better.</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              AI-Powered Institutional <br />
              <span className="text-indigo-600">Document Verification</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed">
              VALIDATEX centralizes multi-format document ingestion, real OCR extraction,
              deterministic cross-validation, versioned statutory compliance checks, and advisory
              AI explanations into a secure three-panel review workspace.
            </p>

            {/* Quick 1-Click Interactive Demo Selector */}
            <div className="mt-10 p-6 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 text-center">
                Instant 1-Click Demonstration Personas (Select Any Role)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <button
                  onClick={() => handleDemoLogin('applicant')}
                  className="flex flex-col items-center p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition group text-left"
                >
                  <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">
                    Applicant
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Rahul Sharma</span>
                  <span className="mt-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Submit & Track
                  </span>
                </button>

                <button
                  onClick={() => handleDemoLogin('officer')}
                  className="flex flex-col items-center p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-md transition group text-left"
                >
                  <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                    Verification Officer
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Priya Nair</span>
                  <span className="mt-2 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    3-Panel Review
                  </span>
                </button>

                <button
                  onClick={() => handleDemoLogin('compliance')}
                  className="flex flex-col items-center p-3 rounded-xl bg-white border border-slate-200 hover:border-purple-500 hover:shadow-md transition group text-left"
                >
                  <span className="text-xs font-bold text-slate-900 group-hover:text-purple-600">
                    Compliance Officer
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Dr. Vikram Sen</span>
                  <span className="mt-2 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    Rules Governance
                  </span>
                </button>

                <button
                  onClick={() => handleDemoLogin('admin')}
                  className="flex flex-col items-center p-3 rounded-xl bg-white border border-slate-200 hover:border-rose-500 hover:shadow-md transition group text-left"
                >
                  <span className="text-xs font-bold text-slate-900 group-hover:text-rose-600">
                    Administrator
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">System Admin</span>
                  <span className="mt-2 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Health & Users
                  </span>
                </button>

                <button
                  onClick={() => handleDemoLogin('auditor')}
                  className="flex flex-col items-center p-3 rounded-xl bg-white border border-slate-200 hover:border-amber-500 hover:shadow-md transition group text-left col-span-2 sm:col-span-1"
                >
                  <span className="text-xs font-bold text-slate-900 group-hover:text-amber-600">
                    Quality Auditor
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Ananya Gupta</span>
                  <span className="mt-2 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Audit Trail
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-4">
              <Link
                to="/register"
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition shadow-sm flex items-center gap-2"
              >
                Create Applicant Account <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Verification Capabilities Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Engineered for Accuracy, Speed & Trust
          </h2>
          <p className="mt-3 text-slate-600 text-base">
            Every layer addresses institutional fraud prevention without black-box opacity or
            unverified AI hallucinations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-5">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Digital Extraction & OCR Pipeline
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Extracts structured text from digital PDFs and images via Tesseract OCR. Preserves page
              references and confidence scores for audit inspection.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Deterministic Cross-Validation
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Compares declared values against extracted evidence after safe normalization. Flags
              name discordance, numeric deltas, missing documents, and certificate expiration.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-5">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Versioned Statutory Compliance
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Configurable compliance rules evaluated deterministically. Enforces mandatory
              document presence, income ceiling checks, and academic merit requirements.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-5">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Three-Panel Review Workspace
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Equips verification officers with synchronized application data (Panel A), original
              evidence inspection (Panel B), and AI advisory findings with decision recording (Panel C).
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-5">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Private Vault & Cryptographic Seals
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Documents stored in private vaults outside public roots. Magic byte signature
              validation prevents file spoofing, while SHA-256 digests guarantee tamper detection.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-5">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Official PDF Audit Reports
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Generates cryptographic verification dossiers containing check logs, discrepancy
              resolutions, officer justifications, and SHA-256 seal for institutional record keeping.
            </p>
          </div>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left sm:flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 justify-center sm:justify-start">
              <div className="h-8 w-12 rounded-md overflow-hidden bg-white p-0.5 border border-slate-700 flex items-center justify-center">
                <img src="/ValidateXLogo.svg" alt="VALIDATEX Logo" className="h-full w-full object-contain" />
              </div>
              <span className="font-extrabold text-white text-base">VALIDATEX</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              AI-Powered Application & Document Verification System (SIH26261 / AICTE)
            </p>
          </div>
          <div className="mt-4 sm:mt-0 text-xs text-slate-500">
            &copy; 2026 VALIDATEX. Built to institutional compliance and security standards.
          </div>
        </div>
      </footer>
    </div>
  );
};
