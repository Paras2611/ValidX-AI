import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ComplianceRule } from '../types';
import {
  Scale,
  Plus,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  ChevronRight,
  Code2,
} from 'lucide-react';

export const CompliancePage: React.FC = () => {
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Rule form state
  const [ruleCode, setRuleCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [jurisdiction, setJurisdiction] = useState('AICTE / National Framework');
  const [severity, setSeverity] = useState<'error' | 'warning' | 'info'>('error');
  const [remediation, setRemediation] = useState('');
  const [condField, setCondField] = useState('declared_data.income_annual');
  const [condOperator, setCondOperator] = useState<any>('less_than');
  const [condValue, setCondValue] = useState('800000');
  const [submitting, setSubmitting] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.compliance.listRules();
      setRules(res.rules);
    } catch (err) {
      console.error('Failed to load compliance rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleCode || !name) return;
    setSubmitting(true);
    try {
      await api.compliance.createRule({
        rule_code: ruleCode,
        name,
        description,
        jurisdiction,
        severity,
        remediation,
        conditions: [
          {
            field: condField,
            operator: condOperator,
            value: condValue ? Number(condValue) || condValue : undefined,
          },
        ],
      });
      setShowCreateModal(false);
      setRuleCode('');
      setName('');
      setDescription('');
      setRemediation('');
      fetchRules();
    } catch (err: any) {
      alert(err.message || 'Failed to create rule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-indigo-600" /> Statutory Compliance Rule Engine
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configurable, versioned declarative policy checks with immutable audit evaluations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Compliance Rule
        </button>
      </div>

      {/* Rules Grid */}
      <div className="mt-8">
        <h2 className="text-base font-bold text-slate-900 mb-4">
          Active Statutory Rules ({rules.length})
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200">
            Loading compliance rules...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {rule.rule_code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        rule.severity === 'error'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : rule.severity === 'warning'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Active (v{rule.active_version?.version_number || 1} Approved)
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-2.5">{rule.name}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{rule.description}</p>

                {/* Declarative Conditions Preview */}
                <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 font-mono text-[11px] text-slate-700">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-sans font-bold mb-1">
                    <Code2 className="w-3.5 h-3.5" /> Declarative Evaluation Logic
                  </div>
                  {rule.active_version?.conditions?.map((c, idx) => (
                    <div key={idx} className="text-slate-800">
                      IF <strong>{c.field}</strong> {c.operator.toUpperCase()}{' '}
                      <strong>{c.value !== undefined ? String(c.value) : c.target_field || ''}</strong>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Jurisdiction: <strong>{rule.jurisdiction}</strong></span>
                  <span className="truncate max-w-[200px]" title={rule.remediation}>
                    Remediation: {rule.remediation}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Create Rule */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Create New Statutory Compliance Rule</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Define rule metadata and declarative condition criteria.
            </p>

            <form onSubmit={handleCreateRule} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CR-DOC-06"
                    value={ruleCode}
                    onChange={(e) => setRuleCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e: any) => setSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  >
                    <option value="error">Error (Blocks Approval)</option>
                    <option value="warning">Warning (Requires Review)</option>
                    <option value="info">Info</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maximum Applicant Age Limit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain statutory or policy basis..."
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              {/* Declarative condition builder */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase block">
                  Evaluation Condition
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Target Field</label>
                    <select
                      value={condField}
                      onChange={(e) => setCondField(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs"
                    >
                      <option value="declared_data.income_annual">declared_data.income_annual</option>
                      <option value="declared_data.undergrad_gpa">declared_data.undergrad_gpa</option>
                      <option value="documents.missing_count">documents.missing_count</option>
                      <option value="extracted.expiry_date">extracted.expiry_date</option>
                      <option value="extracted.name">extracted.name</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block">Operator</label>
                    <select
                      value={condOperator}
                      onChange={(e) => setCondOperator(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs"
                    >
                      <option value="less_than">less_than (&lt;)</option>
                      <option value="greater_than">greater_than (&gt;)</option>
                      <option value="equals">equals (==)</option>
                      <option value="is_not_expired">is_not_expired</option>
                      <option value="matches_declared">matches_declared</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block">Threshold Value</label>
                    <input
                      type="text"
                      value={condValue}
                      onChange={(e) => setCondValue(e.target.value)}
                      placeholder="e.g. 800000"
                      className="w-full p-1.5 border border-slate-300 rounded text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remediation Instructions for Applicant
                </label>
                <input
                  type="text"
                  required
                  value={remediation}
                  onChange={(e) => setRemediation(e.target.value)}
                  placeholder="e.g. Please provide non-creamy layer certificate or valid income renewal."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
                >
                  {submitting ? 'Creating...' : 'Create & Approve Rule v1'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
