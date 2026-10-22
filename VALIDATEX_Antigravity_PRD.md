# VALIDATEX --- Antigravity Project Creation PRD

**Product:** VALIDATEX\
**Full name:** AI-Powered Application & Document Verification System\
**Problem Statement ID:** SIH26261\
**Organization / Theme:** AICTE / Smart Automation\
**Category:** Software\
**Institution / Course:** Rajarambapu Institute of Technology / MCA\
**Academic year:** 2026--2027\
**Tagline:** Validate Smarter. Verify Faster. Trust Better.

------------------------------------------------------------------------

## 1. Master instruction for Antigravity

Act as a senior product manager, UX designer, full-stack engineer,
database architect, AI/ML engineer, security engineer, and QA engineer.
Inspect the existing repository before changing anything. Build
VALIDATEX as a complete, runnable, secure, responsive web
application---not just a landing page, static dashboard, prototype, or
set of mock screens.

Start by reporting: 1. Existing repository structure and framework. 2.
Reusable code and current functionality. 3. Missing features and
dependency risks. 4. Proposed architecture, database schema, and
implementation plan. 5. Any integrations that require credentials or
external authorization.

Then implement the system in small, testable phases. Preserve useful
existing code. If the repository belongs to another product, do not
overwrite it silently; propose a separate branch or application
directory. Do not claim a feature is functional unless it is implemented
and tested. Clearly label any mock adapter or incomplete integration.

**Primary objective:** deliver a working MVP through one complete
end-to-end workflow before expanding to advanced features.

## 2. Problem and product vision

Institutions and authorized departments often need to process
applications and supporting documents. Manual checking is repetitive,
inconsistent, difficult to audit, and can make it harder to identify
missing or conflicting evidence.

VALIDATEX centralizes application submission, document processing, data
comparison, configurable compliance checks, AI-assisted explanations,
human review, and report generation.

### Product objectives

-   Digitize application submission and review.
-   Extract text and relevant fields from documents using OCR.
-   Compare applicant-declared values with document evidence.
-   Detect missing, expired, unreadable, duplicate, or inconsistent
    documents.
-   Evaluate configurable eligibility and compliance rules.
-   Explain findings with evidence-linked AI assistance.
-   Support correction requests, resubmission, and authorized final
    decisions.
-   Generate downloadable PDF reports.
-   Maintain audit history and protect sensitive information.

### Explicit non-goals for the MVP

-   Do not claim direct government registry access unless an authorized
    integration is configured and tested.
-   Do not claim that a document is genuine based only on OCR, metadata,
    a QR code, or a matching hash.
-   Do not make final approval, rejection, fraud, or benefit-denial
    decisions automatically using AI or a risk score.
-   Do not hardcode unverified laws or regulatory requirements.
-   Do not require paid external AI services for basic deterministic
    validation to work.

## 3. User roles and permissions

Implement backend-enforced role-based access control (RBAC). Hiding UI
elements is not sufficient authorization.

### Applicant

-   Create, save, edit, submit, withdraw where allowed, and track own
    applications.
-   Upload and replace permitted documents.
-   View processing progress, correction requests, own notifications,
    and released reports.
-   Resubmit corrected applications.
-   Never view another applicant's data or confidential reviewer notes.

### Verification Officer

-   View assigned or authorized review queues.
-   Inspect application fields, document previews, extracted fields,
    checks, and discrepancies.
-   Correct OCR errors, resolve issues with a reason, request
    corrections, add internal notes, escalate, and record a decision
    when authorized.

### Compliance Officer

-   Create and edit draft compliance rules.
-   Review rule versions, exceptions, evidence, and evaluations.
-   Approve or publish rule versions only when granted the relevant
    permission.

### Administrator

-   Manage users, roles, organizations, application types, document
    types, settings, providers, and system health.
-   Manage rules only within the configured approval policy.
-   Access audit records according to permission.

### Auditor

-   Read-only access to authorized historical applications, decisions,
    reports, and audit events.

### Organization Manager

-   View permitted aggregate metrics, processing volumes, turnaround
    times, and reviewer workload without gaining unauthorized access to
    private documents.

Enforce object-level and organization-level authorization on every API
request. Prevent IDOR attacks by checking ownership and permissions
server-side.

## 4. Required MVP capabilities

1.  Secure authentication and logout.
2.  Role-specific navigation and dashboards.
3.  Application creation, drafts, submission, and status timeline.
4.  Configurable application types and required fields/documents.
5.  Multi-file upload for PDF, JPG/JPEG, and PNG.
6.  File signature, MIME, extension, and size validation.
7.  Private file storage and SHA-256 hashing.
8.  Background processing with status, retries, and failure reasons.
9.  PDF text extraction and OCR for scanned PDFs/images.
10. Configurable document classification and structured field
    extraction.
11. Confidence scores and manual confirmation for uncertain fields.
12. Cross-document and application-field comparison.
13. Missing-document and expiry checks.
14. Versioned, configurable compliance rules.
15. AI-assisted explanations with validated structured output.
16. Transparent review-priority labels and reasons.
17. Reviewer queue and three-panel review workspace.
18. Correction request and resubmission workflow.
19. Human-authorized approval/rejection with mandatory reasons where
    required.
20. In-app notifications.
21. Secure PDF verification reports.
22. Search, filters, pagination, and useful empty/loading/error states.
23. Audit trail for security-sensitive and material actions.
24. Automated tests, setup instructions, and deployment documentation.

Advanced capabilities such as trusted registry verification, digital
signature verification, multilingual OCR, QR/barcode validation, bulk
processing, and fraud-pattern models are later-phase integrations. Use a
clearly labelled "Not configured" or "Inconclusive" state when a real
provider is unavailable.

## 5. End-to-end application workflow

1.  User authenticates and is routed to the role-appropriate dashboard.
2.  Applicant creates an application using a guided, configurable form.
3.  Applicant saves a draft or submits required fields and documents.
4.  Backend validates files, stores them privately, calculates SHA-256
    hashes, records metadata, and queues processing.
5.  Worker extracts PDF text or performs OCR, classifies documents,
    extracts fields, and records confidence, page references, and
    errors.
6.  Validation engine normalizes relevant values and compares
    application data with extracted evidence.
7.  Deterministic checks evaluate required documents, dates, required
    fields, and active compliance rules.
8.  Optional AI service explains discrepancies, summarizes evidence, and
    suggests corrective actions.
9.  System creates a transparent review-priority category and records
    its reasons.
10. Reviewer inspects the source documents and results, confirms or
    corrects extracted fields, resolves discrepancies, or requests
    corrections.
11. Applicant receives a safe notification and may replace documents or
    update permitted fields.
12. Changed evidence is versioned and affected checks are rerun.
13. Authorized reviewer records approval or rejection with a reason
    where required.
14. System notifies the applicant, generates a report, and records the
    decision and audit events.

Processing and AI failure must not erase completed deterministic
results. Use bounded retries and an explicit partial-processing state.

## 6. Application statuses and state transitions

Support these states: - Draft - Submitted - Processing - Processing
failed - Under review - Action required - Resubmitted - Approved -
Rejected - Withdrawn - Archived

Validate all state transitions in the backend. Example transitions:

-   Draft → Submitted
-   Submitted → Processing
-   Processing → Under review
-   Processing → Processing failed
-   Under review → Action required
-   Action required → Resubmitted
-   Resubmitted → Processing
-   Under review → Approved
-   Under review → Rejected
-   Eligible terminal states → Archived, according to policy

Reject invalid transitions. Require reasons for correction requests,
rejection, and overrides. Applicants must see understandable status
explanations but not internal notes.

## 7. Document processing and verification

### Upload security

-   Allow PDF, JPG/JPEG, and PNG initially.
-   Make maximum file size configurable.
-   Validate extension, declared MIME type, and file signature.
-   Generate unique storage keys; never use user-provided paths as
    storage paths.
-   Store documents outside public static directories in private
    storage.
-   Calculate SHA-256 and detect duplicates only within authorized
    scopes.
-   Add antivirus scanning through an adapter when configured.
-   Apply rate limits and safe error messages.
-   Preserve document versions after replacement.

### OCR and extraction

-   Extract embedded text from digital PDFs.
-   OCR scanned PDFs and images using a real library or provider
    adapter.
-   Preserve page number and text coordinates when supported.
-   Store each extracted field with value, normalized value, confidence,
    method, page, and review status.
-   Use low-confidence/manual-review states rather than treating
    uncertain OCR as truth.
-   Keep original files immutable and store extracted data separately.
-   Make processing jobs idempotent, retryable, and observable.

### Supported initial fields

Extract only fields relevant to the application type, such as name,
address, document number, issue date, expiry date, issuing authority,
organization name, registration number, and configured numeric values.

### Verification outcome vocabulary

Use structured outcomes such as: - Verified by identified trusted
source - Check passed - Check failed - Inconclusive - Manual review
required - Not configured

Every check must store its method, timestamp, source/reference,
evidence, and explanation. A hash establishes file identity relative to
a comparison file, not authenticity. Metadata anomalies are review
signals, not proof of forgery. A QR code is not proof of authenticity
unless its issuer/content is validated by a trusted source.

## 8. Cross-validation and discrepancy management

Compare declared and extracted fields after safe, configurable
normalization, including whitespace and date-format normalization. Do
not automatically treat spelling, transliteration, or formatting
variations as fraud.

For every discrepancy, store: - Field name - Declared value and observed
value - Document reference and page, where available - Comparison
method - Confidence, if meaningful - Severity - Explanation and
evidence - Status - Resolution reason, reviewer, and timestamp

Examples include name/date mismatches, missing mandatory documents,
expired certificates, inconsistent organization names, unreadable
required fields, missing declarations, and conflicting dates.

Reviewers must be able to resolve, dismiss as a legitimate variation,
escalate, or request additional evidence, with a recorded reason.

## 9. Compliance rule engine

Build a configurable, versioned rule engine; do not hardcode assumptions
about every jurisdiction.

Each rule should include: - Rule ID/code, name, description -
Jurisdiction and applicable organization/application type -
Policy/regulatory source reference and version/effective date - Required
input fields - Declarative evaluation definition - Severity and
remediation guidance - Enabled/draft/approved state - Version history
and approver

Initial deterministic rule types: - Required field present - Required
document present - Document expiry/date comparison - Values agree across
fields/documents - Required declaration present - Numeric threshold or
configured eligibility condition

Use deterministic code for objective calculations. AI may explain a rule
outcome but must not replace the rule engine. Every evaluation records
pass/fail/inconclusive, rule version, evidence, explanation, timestamp,
and missing inputs. Only approved rule versions may become active. Never
present unverified requirements as official regulations.

## 10. AI integration requirements

Create a provider-independent backend adapter for a configurable hosted
model API or local model. Keep all credentials server-side.

Allowed AI tasks: - Suggest document classification. - Explain
discrepancies. - Summarize extracted evidence. - Identify potentially
missing evidence. - Explain compliance-rule outcomes. - Recommend
corrective actions. - Draft a reviewer-facing summary.

Requirements: - Require structured JSON matching a defined schema. -
Validate every model response before persistence/use. - Reference
available evidence and document/page identifiers. - Distinguish observed
facts, interpretations, assumptions, and missing information. - Never
fabricate an external verification result or legal requirement. - Treat
document contents as untrusted data; defend against prompt injection. -
Never allow document text or AI output to override permissions, workflow
rules, or backend policy. - Minimize sensitive data sent to providers. -
Handle timeout, malformed output, rate limits, and provider
unavailability. - Keep deterministic validation operational without
AI. - Store provider/model identifier, timestamp, processing status, and
necessary evidence references while minimizing retained sensitive prompt
content.

AI outputs are advisory and separate from final human decisions.

## 11. Transparent priority assessment

Use configurable rule-based categories: - **Low:** no outstanding issues
found by configured checks. - **Medium:** minor discrepancies or
incomplete evidence need review. - **High:** significant
inconsistencies, failed mandatory checks, or authenticity concerns need
review. - **Inconclusive:** evidence is insufficient or a required
verification service is unavailable.

Display the exact reasons behind each category. Do not implement an
opaque fraud score. A priority category must never automatically reject
an application or determine a consequential outcome.

## 12. UI/UX and page requirements

Create a professional institutional SaaS interface with clear
information hierarchy, accessible controls, restrained styling,
responsive layouts, and consistent reusable components.

### Design system

-   Neutral/white surfaces with deep navy/blue primary accents.
-   Restrained teal/green for successful checks, amber for warnings, and
    red for errors.
-   Consistent typography, spacing, tables, cards, status labels, and
    dialogs.
-   Accessible labels, keyboard navigation, visible focus states, and
    suitable contrast.
-   Responsive desktop, tablet, and mobile layouts.
-   Loading, empty, error, success, and partial-processing states.
-   Confirmation for consequential actions.
-   Avoid excessive gradients, decorative animation, and crowded
    dashboards.

### Public pages

-   Landing page
-   Product features and workflow
-   Supported checks and limitations
-   Privacy/security information
-   Login, optional registration, password recovery

### Applicant pages

-   Dashboard and application counts by status
-   Create/edit application and save draft
-   Document upload with progress and validation errors
-   Processing status and application timeline
-   Application details
-   Correction/resubmission
-   Released reports
-   Notifications and account settings

### Officer pages

-   Review dashboard and filterable queue
-   Review workspace
-   Document viewer
-   Discrepancy resolution
-   Review history and reports

### Three-panel review workspace

**Panel A --- Application:** declared fields, status, timeline,
applicant responses.\
**Panel B --- Evidence:** PDF/image preview, page navigation, extracted
text, field highlights when supported, permission-controlled download.\
**Panel C --- Results:** classification, extracted values/confidence,
comparisons, authenticity outcomes, rule results, AI explanations, and
outstanding issues.

### Compliance pages

-   Rule library and editor
-   Draft/approved rule versions
-   Evaluation results
-   Exceptions and escalations

### Administration/audit pages

-   Users, roles, organizations
-   Application/document type configuration
-   AI/storage/processing settings
-   Audit logs
-   System health and feature flags
-   Authorized read-only audit views

Dashboard metrics must come from database queries. Clearly label
synthetic demo data; never disguise hardcoded statistics as live data.

## 13. Recommended technical architecture

Use this stack unless the existing repository provides a sound, working
reason to preserve another compatible stack.

### Frontend

-   React + TypeScript + Vite
-   Tailwind CSS and accessible reusable components
-   React Router
-   TanStack Query or equivalent
-   React Hook Form + Zod
-   A maintained charting library for analytics

### Backend

-   Node.js + Express + TypeScript
-   Versioned REST API under `/api/v1`
-   Server-side validation and consistent error responses
-   OpenAPI documentation
-   Request correlation IDs
-   Pagination, filtering, sorting, and rate limiting

### Database

-   PostgreSQL
-   UUID primary keys where suitable
-   Foreign keys, indexes, constraints, transactions, and migrations
-   JSON fields only where they support flexible evidence/configuration,
    not as a substitute for core relational structure

### Storage and jobs

-   Private S3-compatible object storage in production, with a private
    local development adapter.
-   Store file metadata and storage keys in PostgreSQL, not document
    binaries.
-   Use short-lived signed links or authenticated streaming with
    authorization checks.
-   Use a background queue/worker for OCR, extraction, hashing,
    verification, compliance evaluation, and report generation.
-   Track attempts, status, timeout, and failure reason; use bounded
    retries and idempotent jobs.

A Python FastAPI processing service is optional if it materially
improves OCR/ML integration. Avoid duplicating business logic across
services.

### Suggested repository structure

``` text
validatex/
  frontend/
    src/
      app/
      components/
      features/
        auth/
        applications/
        documents/
        verification/
        reviews/
        compliance/
        reports/
        admin/
      lib/
      routes/
      styles/
  backend/
    src/
      config/
      middleware/
      modules/
        auth/
        users/
        organizations/
        applications/
        documents/
        processing/
        verification/
        compliance/
        reviews/
        reports/
        notifications/
        audit/
        admin/
      workers/
      adapters/
      utils/
    migrations/
    tests/
  processing-service/        # optional OCR/ML service
  docs/
  scripts/
  .env.example
  README.md
```

Adapt this structure to the repository after inspection rather than
creating unnecessary duplication.

## 14. Initial data model

Create migrations and relationships for at least these entities:

-   `users`
-   `organizations`
-   `roles`, `permissions`, and role assignments
-   `sessions` or refresh-token records as appropriate
-   `application_types` and field/document requirements
-   `applications`
-   `application_versions`
-   `documents`
-   `document_versions`
-   `extracted_fields`
-   `processing_jobs`
-   `verification_checks`
-   `discrepancies`
-   `compliance_rules`
-   `compliance_rule_versions`
-   `rule_evaluations`
-   `review_assignments`
-   `review_comments`
-   `review_decisions`
-   `reports`
-   `notifications`
-   `audit_events`
-   organization/system configuration

Core application fields include ID, unique application reference,
applicant ID, organization ID where applicable, application type, title,
status, assigned reviewer, submission timestamp, and created/updated
timestamps.

Document records include application ID, document type, original
filename, private storage key, MIME type, size, SHA-256, status,
uploader, and timestamps.

Extracted fields include document ID, field name, extracted/normalized
value, confidence, page, extraction method, reviewer-confirmed state,
and timestamp.

Audit events include actor, action, resource type/ID, timestamp,
outcome, correlation ID, and minimal relevant metadata. Do not
indiscriminately copy sensitive values into logs.

## 15. API requirements

Implement, document, and test REST endpoints similar to these. Adjust
naming to the final architecture but preserve the capabilities.

### Authentication

-   `POST /api/v1/auth/register`
-   `POST /api/v1/auth/login`
-   `POST /api/v1/auth/logout`
-   `POST /api/v1/auth/refresh`
-   `POST /api/v1/auth/forgot-password`
-   `GET /api/v1/auth/me`

### Applications

-   `POST /api/v1/applications`
-   `GET /api/v1/applications`
-   `GET /api/v1/applications/:id`
-   `PATCH /api/v1/applications/:id`
-   `POST /api/v1/applications/:id/submit`
-   `POST /api/v1/applications/:id/withdraw`
-   `GET /api/v1/applications/:id/timeline`

### Documents

-   `POST /api/v1/applications/:id/documents`
-   `GET /api/v1/applications/:id/documents`
-   `GET /api/v1/documents/:id`
-   `GET /api/v1/documents/:id/content`
-   `POST /api/v1/documents/:id/reprocess`
-   `POST /api/v1/documents/:id/replace`

### Verification and compliance

-   `POST /api/v1/applications/:id/verify`
-   `GET /api/v1/applications/:id/verification-results`
-   `GET /api/v1/applications/:id/discrepancies`
-   `PATCH /api/v1/discrepancies/:id`
-   `GET /api/v1/applications/:id/compliance-results`
-   `GET /api/v1/compliance-rules`
-   `POST /api/v1/compliance-rules`
-   `PATCH /api/v1/compliance-rules/:id`
-   `POST /api/v1/compliance-rules/:id/versions`
-   `POST /api/v1/compliance-rules/:id/approve`
-   `POST /api/v1/applications/:id/evaluate-rules`

### Reviews

-   `GET /api/v1/reviews/queue`
-   `POST /api/v1/applications/:id/assign`
-   `POST /api/v1/applications/:id/request-corrections`
-   `POST /api/v1/applications/:id/approve`
-   `POST /api/v1/applications/:id/reject`
-   `POST /api/v1/applications/:id/comments`

### Reports and administration

-   `POST /api/v1/applications/:id/reports`
-   `GET /api/v1/applications/:id/reports`
-   `GET /api/v1/reports/:id/download`
-   `GET /api/v1/admin/users`
-   `GET /api/v1/admin/audit-events`
-   `GET /api/v1/admin/system-health`

Every endpoint must enforce authentication, role permissions, and
resource-level access. Document request/response schemas and error
formats.

## 16. Reports and notifications

Generate a downloadable PDF report containing: - VALIDATEX branding and
unique report ID - Application reference and category -
Submission/review/report timestamps - Document inventory and processing
status - Extracted-field summary - Cross-validation and compliance
outcomes - Authenticity check outcomes and limitations - Outstanding
issues and evidence references - Human reviewer decision and
explanation - Relevant rule versions - Clear distinction between
automated checks, AI-assisted observations, human-reviewed findings, and
checks not performed

Never claim government certification or official authenticity unless an
authorized, real verification process establishes it.

Implement in-app notifications for submission, processing
completion/failure, missing or invalid documents, correction requests,
resubmission, assignment, decision, and report availability. Email is
optional and requires a configured provider. Do not include sensitive
document contents in notification messages.

## 17. Security and privacy requirements

-   Strong password hashing and secure session management.
-   CSRF protection when required by the chosen authentication model.
-   Rate limiting and server-side validation.
-   Protection against SQL injection, XSS, unsafe rendering, and
    arbitrary file access.
-   Private storage, encryption in transit, and appropriate encryption
    at rest.
-   Least-privilege RBAC and organization-level isolation.
-   Secrets in environment/secret management only; never in frontend
    bundles or source control.
-   Secure errors that do not leak stack traces or secrets.
-   Audit logging, retention/deletion policy, backup and recovery
    procedures.
-   Dependency and security tests.
-   Prompt-injection defenses for uploaded documents.
-   Controlled access to document preview and download.
-   Synthetic data only for development and demonstration.

Provide `.env.example` with placeholder values only. Do not commit API
keys, production credentials, or real identity documents.

## 18. Testing and acceptance criteria

The MVP is not complete until these end-to-end scenarios pass.

### A. Successful submission

Applicant logs in, creates a draft, enters required fields, uploads
supported documents, submits, and sees status. Processing results are
persisted and shown according to role permissions.

### B. Missing document

A configured application requires three documents but receives two. The
system records the missing requirement, requests correction, accepts the
missing file, and reruns affected checks.

### C. Field mismatch

Application and extracted document values differ. A discrepancy with
evidence is persisted, a reviewer inspects the source,
resolves/escalates it, and the action is audited.

### D. Expired document

A configured deterministic rule evaluates an extracted expiry date
against the configured reference date and records the outcome and
evidence.

### E. AI unavailable

AI times out or returns invalid JSON. Failure is recorded, deterministic
results remain available, and bounded retry/partial-processing behavior
works.

### F. Approval

An authorized reviewer reviews evidence, resolves or explains
outstanding issues, approves the application, and the system records the
decision, notifies the applicant, and generates a report.

### G. Unauthorized access

An applicant attempts to access another applicant's application or
document. The backend denies access without leaking sensitive content
and records the event where appropriate.

### Additional tests

-   Unit tests for normalizers, validation, and compliance rules.
-   API/database integration tests.
-   Authentication, role, and tenant isolation tests.
-   Upload security and file-type tests.
-   OCR/extraction tests using synthetic fixtures.
-   AI schema and provider-failure tests.
-   State-transition, report, notification, and audit tests.
-   Responsive UI and accessibility checks.
-   Retry, timeout, and recovery tests.

Include fixtures for valid documents, missing documents, expired
certificates, mismatched fields, unreadable scans, unsupported files,
duplicate uploads, AI timeout, unavailable external verification,
unauthorized access, and invalid rule configuration.

Do not fabricate test outcomes. Report which tests ran, passed, failed,
or remain untested.

## 19. Performance, reliability, and accessibility

Initial proposed target: ordinary dashboard APIs should respond under
500 ms at the 95th percentile under a documented test load, excluding
heavy document processing. Treat this as a target until benchmarked.

-   Use background jobs for long-running tasks and display progress.
-   Make jobs retryable, idempotent, and observable.
-   Use pagination and indexes for large lists.
-   Keep error messages useful without revealing internals.
-   Support database backup and recovery.
-   Provide keyboard navigation, semantic labels, visible focus, and
    adequate contrast.
-   Document the environment and load conditions for performance
    results.

## 20. Implementation phases

### Phase 1 --- Foundation

Inspect repository, establish architecture, migrations, authentication,
RBAC, shared UI, and navigation.

### Phase 2 --- Application lifecycle

Build application types, forms, drafts, submission, document upload,
private storage, and status timeline.

### Phase 3 --- Processing pipeline

Implement background jobs, PDF text extraction, OCR, classification,
field extraction, confidence, and processing errors.

### Phase 4 --- Deterministic verification

Implement normalization, field comparisons, missing/expiry checks,
configurable versioned rules, and discrepancy management.

### Phase 5 --- AI assistance

Implement provider adapter, validated structured outputs,
evidence-linked explanations, summaries, and failure fallback.

### Phase 6 --- Human review and reporting

Build queue, three-panel workspace, correction/resubmission, decisions,
notifications, PDF reports, and audit trail.

### Phase 7 --- Hardening and deployment

Run automated tests, security/accessibility/performance checks,
configure deployment, document setup, and prepare a complete demo
walkthrough.

After each phase: 1. Run relevant tests. 2. Fix regressions before
moving forward. 3. Summarize files/modules changed. 4. Report actual
test outcomes. 5. List known limitations and next steps.

## 21. Required deliverables

-   Complete frontend and backend source.
-   Database schema and migrations.
-   OCR/document processing pipeline or clearly labelled adapter.
-   Configurable compliance engine and rule versioning.
-   AI provider adapter with structured output validation.
-   Authentication, roles, and permissions.
-   Synthetic demo data and sample documents.
-   Automated tests and test report.
-   `.env.example` containing placeholders only.
-   README with prerequisites, installation, migrations, run commands,
    and troubleshooting.
-   API/OpenAPI documentation.
-   Architecture diagram, database relationship diagram, and workflow
    diagram.
-   Deployment instructions.
-   Security/privacy notes.
-   Known limitations and future scope.
-   End-to-end demo script.

## 22. Definition of done

The MVP is ready for demonstration only when: - Users can authenticate
and receive role-appropriate access. - Applicants can create, save,
submit, track, correct, and resubmit applications. - Supported files are
validated and stored privately. - OCR/extraction runs through a real
pipeline or explicitly labelled development adapter. - Deterministic
checks and rule evaluations persist evidence-based results. - Compliance
rules are configurable and versioned. - AI findings are
schema-validated, evidence-linked, and clearly advisory. - Reviewers can
resolve discrepancies and record authorized decisions. - Reports are
generated and downloaded securely. - Audit events are recorded and
protected from ordinary-user modification. - Unauthorized access is
blocked. - Critical automated tests run and results are reported
honestly. - Setup/deployment documentation and limitations are complete.

## 23. Final execution instruction to Antigravity

Begin by inspecting the repository and producing a concise
implementation plan. Then implement the database, authentication,
application submission, and secure document upload first. Build and test
one end-to-end vertical slice before expanding. Continue phase by phase
until the working MVP is complete. Do not stop after producing a plan,
PRD, mockups, or frontend screens. Do not fabricate data, external
verification results, completed tests, or production readiness. Clearly
label every mock integration and document the steps required to replace
it with a real provider.
