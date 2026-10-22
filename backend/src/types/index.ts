export type UserRole = 'applicant' | 'officer' | 'compliance' | 'admin' | 'auditor';

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'processing'
  | 'processing_failed'
  | 'under_review'
  | 'action_required'
  | 'resubmitted'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'archived';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'inconclusive';

export type CheckOutcome =
  | 'passed'
  | 'failed'
  | 'inconclusive'
  | 'manual_review'
  | 'not_configured';

export type DiscrepancySeverity = 'low' | 'medium' | 'high';
export type DiscrepancyStatus = 'open' | 'resolved' | 'escalated' | 'dismissed';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FieldRequirement {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  options?: string[];
  description?: string;
}

export interface DocumentRequirement {
  type: string;
  label: string;
  description: string;
  required: boolean;
  allowed_mime_types: string[];
  max_size_mb: number;
}

export interface ApplicationType {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  required_fields: FieldRequirement[];
  required_document_types: DocumentRequirement[];
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  reference_no: string;
  applicant_id: string;
  organization_id?: string;
  application_type_id: string;
  title: string;
  status: ApplicationStatus;
  priority: PriorityLevel;
  priority_reason?: string;
  assigned_officer_id?: string;
  declared_data: Record<string, any>;
  metadata: Record<string, any>;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  application_id: string;
  document_type: string;
  original_filename: string;
  storage_key: string;
  mime_type: string;
  file_size: number;
  sha256_hash: string;
  status: 'uploaded' | 'processing' | 'verified' | 'failed';
  page_count: number;
  uploader_id: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractedField {
  id: string;
  document_id: string;
  field_name: string;
  raw_value: string;
  normalized_value: string;
  confidence: number;
  extraction_method: 'pdf_text' | 'ocr' | 'ai' | 'manual';
  page_number: number;
  is_confirmed: boolean;
  confirmed_by?: string;
  confirmed_at?: string;
  created_at: string;
}

export interface VerificationCheck {
  id: string;
  application_id: string;
  document_id?: string;
  check_type: string;
  outcome: CheckOutcome;
  method: string;
  evidence: Record<string, any>;
  explanation: string;
  timestamp: string;
}

export interface Discrepancy {
  id: string;
  application_id: string;
  field_name: string;
  declared_value: string;
  observed_value: string;
  document_id?: string;
  page_number?: number;
  comparison_method: string;
  severity: DiscrepancySeverity;
  status: DiscrepancyStatus;
  explanation: string;
  resolution_reason?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface ComplianceRule {
  id: string;
  rule_code: string;
  name: string;
  description: string;
  jurisdiction: string;
  application_type_id?: string;
  severity: 'warning' | 'error' | 'info';
  remediation: string;
  is_active: boolean;
  active_version_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'date_before' | 'date_after' | 'is_not_expired' | 'exists' | 'matches_declared';
  value?: any;
  target_field?: string;
}

export interface ComplianceRuleVersion {
  id: string;
  rule_id: string;
  version_number: number;
  conditions: RuleCondition[];
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  status: 'draft' | 'approved' | 'deprecated';
  created_at: string;
}

export interface RuleEvaluation {
  id: string;
  application_id: string;
  rule_id: string;
  rule_version_id: string;
  outcome: CheckOutcome;
  evidence: Record<string, any>;
  explanation: string;
  missing_inputs: string[];
  evaluated_at: string;
}

export interface ReviewDecision {
  id: string;
  application_id: string;
  reviewer_id: string;
  action: 'approve' | 'reject' | 'request_corrections';
  reason: string;
  internal_notes?: string;
  created_at: string;
}

export interface ReviewComment {
  id: string;
  application_id: string;
  reviewer_id: string;
  reviewer_name?: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  application_id: string;
  report_reference: string;
  file_path: string;
  sha256_hash: string;
  summary: Record<string, any>;
  generated_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'action_required';
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  actor_id?: string;
  actor_role?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  outcome: 'success' | 'failure' | 'denied';
  ip_address?: string;
  correlation_id?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}
