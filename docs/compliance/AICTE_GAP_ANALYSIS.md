# AICTE Compliance Gap Analysis — VALIDATEX

**Audit Reference:** GAP-AICTE-SIH26261-2026  
**Audited System:** VALIDATEX — AI-Powered Application & Document Verification System  
**Date:** October 2026  
**Scope:** Full-stack architecture, backend APIs, data pipelines, security controls, and regulatory alignment.

---

## 1. Executive Summary

While VALIDATEX possesses a strong foundation in modern web engineering—featuring a 3-panel review workspace, deterministic date and income comparison, cryptographic PDF audit reports, and SHA-256 vault storage—our compliance audit identified **four major functional gaps** and **two security/regulatory risks** relative to the complete AICTE problem specification:

1. **Gap 1: Absence of Issuing Authority Verification Subsystem (Section 3.E)**
   - *Issue:* The system validates documents locally (via OCR and regex), but lacks a structured Issuing Authority Adapter framework to model connections to original issuing bodies (DigiLocker, State Technical Boards, Revenue Departments, AICTE Portal, Fire Safety Departments, NSDL).
   - *Risk:* Lack of transparency regarding whether a document was validated against an official external registry vs. purely checked internally.

2. **Gap 2: Incomplete AICTE Statutory Application Categories & Record Types (Section 3.A & 3.B)**
   - *Issue:* Seed data primarily focused on a postgraduate student scholarship (`SCHOLARSHIP_PG`) and generic vendor KYC (`VENDOR_KYC`), with only a rudimentary institutional accreditation template. Specific AICTE Approval Process Handbook (APH) categories—such as **Extension of Approval (EoA)**, **Increase in Intake / Additional Course**, and **Establishment of New Technical Institution**—were missing tailored checklists (e.g., Affidavits, NBA Accreditation, State Govt NOC, Affiliating University NOC, Land Title Undertakings).
   - *Risk:* Demonstrations fail to reflect authentic AICTE institutional workflows.

3. **Gap 3: Incomplete Anomaly & Cross-Document Forgery Detection (Section 3.D)**
   - *Issue:* Although SHA-256 hashing is performed on every uploaded file, duplicate document detection across applications or within scope was not actively executed in `VerificationService`. Furthermore, irregular date sequences (e.g., future issue dates, expiry preceding issue date) and mismatched institutional codes were not systematically flagged as anomalies.
   - *Risk:* Recycled certificates or incongruent dates bypass automated detection.

4. **Gap 4: Infrastructure Compliance Review & Physical Inspection Workflow (Section 3.G)**
   - *Issue:* Reviewers had no formalized mechanism to record observations on physical infrastructure (laboratories, built-up area, fire clearance) or recommend an on-site **Expert Visit Committee (EVC) Physical Inspection**.
   - *Risk:* Regulatory compliance cannot be certified purely by software; the system failed to provide a clear escalation path for physical verification.

5. **Security Defect 1: Insecure Direct Object Reference (IDOR) on Document Metadata Endpoint (Section 4)**
   - *Issue:* In `backend/src/modules/documents/documents.controller.ts`, the endpoint `GET /api/v1/documents/:id` lacked applicant ownership verification. An applicant could query document metadata and extracted OCR fields belonging to another applicant.
   - *Risk:* Information disclosure across institutional applicants.

6. **Regulatory Safeguard Gap: Explicit Status and AI Output Boundaries (Section 3.E & 3.F)**
   - *Issue:* The PRD and UI lacked standardized outcome states (`Verified`, `Mismatch Detected`, `Expired`, `Source Unavailable`, `Not Configured`, `Manual Review Required`) for external authorities.
   - *Risk:* Ambiguity over whether an item is verified by an authority or merely parsed locally.

---

## 2. Detailed Gap Prioritization Matrix

| Gap ID | Category | Severity | Description | Regulatory / Security Impact | Remediation Feasibility | Priority |
|---|---|---|---|---|---|---|
| **GAP-SEC-01** | Security / Auth | **Critical** | IDOR vulnerability on `GET /documents/:id` | Unauthorized access to extracted fields and document metadata across applicants | Immediate (Add ownership check against `application.applicant_id`) | **P0 (Immediate Fix)** |
| **GAP-REG-01** | External Verification | **High** | Missing Issuing Authority Verification service and adapters | Inability to evaluate documents against trusted issuing authorities or report realistic status (`Not Configured`, `Verified`, `Source Unavailable`) | High (Implement `IssuingAuthorityService` with transparent adapters) | **P1 (Core Feature)** |
| **GAP-REG-02** | Workflow & Types | **High** | Absence of dedicated AICTE Extension of Approval (EoA) and Program Expansion categories | Mismatch with primary AICTE statutory mandate (SIH26261) | High (Seed full AICTE APH categories, document types, and field schemas) | **P1 (Core Feature)** |
| **GAP-REG-03** | Anomaly Detection | **High** | Missing duplicate document detection and date sequence anomaly checks | Recycled certificates or illogical date orders not flagged during processing | High (Add duplicate hash audit and date sequence validators in `VerificationService`) | **P1 (Core Feature)** |
| **GAP-REG-04** | Compliance Rules | **Medium** | Lack of seeded AICTE APH statutory rules (Faculty-Student Ratio, Land Area, NBA Currency) | Generic rules instead of technical education regulatory criteria | High (Seed APH 2026–27 compliant versioned rules with clause citations) | **P2 (Required Deliverable)** |
| **GAP-REG-05** | Infrastructure Review | **Medium** | Missing reviewer disposition for "Recommendation for Physical Inspection (EVC)" | Incomplete audit trail for campus readiness and physical inspections | High (Add EVC inspection recommendation in review decision schema and UI) | **P2 (Required Deliverable)** |

---

## 3. Root Cause Analysis

1. **Development Phasing:** Early phases concentrated on building the end-to-end framework (file upload magic bytes, OCR parsing, 3-panel workspace, report generation), deferring external registry adapters.
2. **External Access Constraints:** Direct production access to official government gateways (DigiLocker, AICTE portal backend, State Directorate) requires statutory accreditation, credentials, and network whitelisting not accessible in a development sandbox.
3. **Checklist Granularity:** The initial database seed used a generic postgraduate scholarship as the primary demonstration vehicle rather than the AICTE Extension of Approval (EoA) workflow.

---

## 4. Conclusion & Audit Recommendation

The identified gaps are highly actionable and can be remediated directly in the existing TypeScript architecture without breaking any existing working functionality. All 22 existing automated tests must remain passing while expanding the test suite to cover all 15 audit scenarios.
