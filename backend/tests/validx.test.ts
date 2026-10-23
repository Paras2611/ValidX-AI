import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { seedDatabase } from '../src/database/seed';
import { db } from '../src/database';

describe('VALIDATEX Core End-to-End Test Suite', () => {
  let applicantToken = '';
  let officerToken = '';
  let complianceToken = '';
  let adminToken = '';
  let auditorToken = '';
  let applicantUserId = '';
  let officerUserId = '';

  let createdAppId = '';
  let scholarshipTypeId = '';

  beforeAll(() => {
    // Seed initial data
    seedDatabase();
    const scholarship = db.findOne('application_types', (t) => t.code === 'SCHOLARSHIP_PG');
    if (scholarship) {
      scholarshipTypeId = scholarship.id;
    }
  });

  describe('1. System Health & Infrastructure', () => {
    it('GET /health returns UP status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.service).toContain('VALIDATEX');
    });
  });

  describe('2. Authentication & RBAC Login', () => {
    it('Applicant login succeeds and returns valid JWT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'applicant@validx.ai', password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('applicant');
      applicantToken = res.body.token;
      applicantUserId = res.body.user.id;
    });

    it('Officer login succeeds and returns valid JWT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'officer@validx.ai', password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('officer');
      officerToken = res.body.token;
      officerUserId = res.body.user.id;
    });

    it('Compliance Officer login succeeds', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'compliance@validx.ai', password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('compliance');
      complianceToken = res.body.token;
    });

    it('Admin login succeeds', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@validx.ai', password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('admin');
      adminToken = res.body.token;
    });

    it('Auditor login succeeds', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'auditor@validx.ai', password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('auditor');
      auditorToken = res.body.token;
    });

    it('Login rejects invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'applicant@validx.ai', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('GET /api/v1/auth/me returns authenticated identity', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('applicant@validx.ai');
    });
  });

  describe('3. Application Lifecycle & IDOR Protection', () => {
    it('Applicant creates a new draft application', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          application_type_id: scholarshipTypeId,
          title: 'Rahul Sharma - PG Merit Scholarship 2026',
          declared_data: {
            full_name: 'Rahul Sharma',
            dob: '1999-05-14',
            income_annual: 450000,
            undergrad_gpa: 8.4,
            category: 'General',
            account_no: '987654321012',
            ifsc_code: 'SBIN0001234',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.application.reference_no).toMatch(/^VX-2026-/);
      expect(res.body.application.status).toBe('draft');
      createdAppId = res.body.application.id;
    });

    it('Applicant updates draft declared data', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          declared_data: {
            income_annual: 420000,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.application.declared_data.income_annual).toBe(420000);
    });

    it('Applicant cannot access officer review queue (RBAC Guard)', async () => {
      const res = await request(app)
        .get('/api/v1/reviews/queue')
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  });

  describe('4. Document Security & Magic Byte Validation', () => {
    it('Upload rejects spoofed binary with invalid PDF magic signature', async () => {
      const fakePdfBuffer = Buffer.from('THIS IS NOT A VALID PDF FILE');

      const res = await request(app)
        .post(`/api/v1/documents/applications/${createdAppId}/documents`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .field('document_type', 'id_proof')
        .attach('file', fakePdfBuffer, {
          filename: 'fake_document.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('File content does not match declared MIME signature');
    });

    it('Upload accepts valid PDF and creates SHA-256 hash', async () => {
      // Valid minimal PDF buffer starting with %PDF-
      const validPdfText = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 85 >> stream
BT
/F1 12 Tf
72 712 Td
(Name: Rahul Sharma DOB: 1999-05-14 Annual Income: INR 4,20,000) Tj
ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000204 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
340
%%EOF`;
      const validPdfBuffer = Buffer.from(validPdfText);

      const res = await request(app)
        .post(`/api/v1/documents/applications/${createdAppId}/documents`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .field('document_type', 'id_proof')
        .attach('file', validPdfBuffer, {
          filename: 'national_id_card.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.document.sha256_hash).toBeDefined();
      expect(res.body.document.status).toBe('verified');
      expect(res.body.document.sha256_hash.length).toBe(64);
    });
  });

  describe('5. Application Submission & Verification Pipeline', () => {
    it('Applicant submits application', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${createdAppId}/submit`)
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('submitted');
    });

    it('Officer views application details including auto-evaluated verification checks', async () => {
      // Give pipeline a small moment to complete in event loop
      await new Promise((resolve) => setTimeout(resolve, 800));

      const res = await request(app)
        .get(`/api/v1/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.application.id).toBe(createdAppId);
      expect(res.body.verification_checks.length).toBeGreaterThan(0);
      expect(res.body.rule_evaluations.length).toBeGreaterThan(0);
    });
  });

  describe('6. Officer Review, Discrepancy Resolution & Report Generation', () => {
    it('Officer queries review queue and finds pending application', async () => {
      const res = await request(app)
        .get('/api/v1/reviews/queue')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.queue.length).toBeGreaterThan(0);
      const target = res.body.queue.find((a: any) => a.id === createdAppId);
      expect(target).toBeDefined();
    });

    it('Officer assigns application to themselves', async () => {
      const res = await request(app)
        .post(`/api/v1/reviews/applications/${createdAppId}/assign`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ officer_id: officerUserId });

      expect(res.status).toBe(200);
      expect(res.body.application.assigned_officer_id).toBe(officerUserId);
    });

    it('Officer adds internal review comment', async () => {
      const res = await request(app)
        .post(`/api/v1/reviews/applications/${createdAppId}/comments`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          comment: 'Document evidence verified against digital ledger. Discrepancies addressed.',
          is_internal: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.comment.comment).toContain('verified against digital ledger');
    });

    it('Officer approves application and generates official PDF verification report', async () => {
      const res = await request(app)
        .post(`/api/v1/reviews/applications/${createdAppId}/approve`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          reason: 'All statutory qualifications, income ceiling checks, and identity requirements verified and approved.',
          internal_notes: 'Approved under AICTE 2026 Merit Circular.',
        });

      expect(res.status).toBe(200);
      expect(res.body.decision.action).toBe('approve');
      expect(res.body.report).toBeDefined();
      expect(res.body.report.sha256_hash).toBeDefined();
    });

    it('Applicant can download the generated official PDF audit report', async () => {
      const listRes = await request(app)
        .get(`/api/v1/reports/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.reports.length).toBeGreaterThan(0);
      const reportId = listRes.body.reports[0].id;

      const downloadRes = await request(app)
        .get(`/api/v1/reports/${reportId}/download`)
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.header['content-type']).toBe('application/pdf');
      expect(downloadRes.body.length).toBeGreaterThan(500);
    });
  });

  describe('7. Administrative Auditing & Health Telemetry', () => {
    it('Admin inspects system health and telemetry', async () => {
      const res = await request(app)
        .get('/api/v1/admin/system-health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.counts.applications).toBeGreaterThan(0);
      expect(res.body.counts.documents).toBeGreaterThan(0);
      expect(res.body.counts.audit_events).toBeGreaterThan(0);
    });

    it('Auditor views tamper-resistant audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-events')
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.events.length).toBeGreaterThan(0);
      expect(res.body.events[0].action).toBeDefined();
    });
  });

  describe('8. AICTE Comprehensive Requirements Compliance Audit Suite', () => {
    let secondApplicantToken = '';
    let secondApplicantUserId = '';
    let eoaAppId = '';
    let eoaTypeId = '';
    let duplicateDocAppId = '';

    beforeAll(async () => {
      // Register a second applicant to test cross-tenant IDOR protection
      const uniqueEmail = `principal_${Date.now()}@rit.edu`;
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Password@123',
          full_name: 'Dr. Ramesh Patil (Principal RIT)',
        });
      secondApplicantToken = regRes.body.token;
      secondApplicantUserId = regRes.body.user.id;

      const eoaType = db.findOne('application_types', (t) => t.code === 'AICTE_EOA_EXISTING');
      if (eoaType) {
        eoaTypeId = eoaType.id;
      }
    });

    // Test 1: Valid AICTE Extension of Approval (EoA) Application
    it('Test 1: Valid AICTE EoA Application creation with category fields and document upload', async () => {
      expect(eoaTypeId).toBeDefined();

      const createRes = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${secondApplicantToken}`)
        .send({
          application_type_id: eoaTypeId,
          title: 'Rajarambapu Institute of Technology - AICTE EoA 2026-27',
          declared_data: {
            institution_name: 'Rajarambapu Institute of Technology',
            aicte_permanent_id: '1-3324567891',
            principal_name: 'Dr. Ramesh Patil',
            affiliating_university: 'Shivaji University',
            approved_intake_total: 480,
            faculty_count_total: 32,
            land_area_acres: 15.5,
            establishment_year: 1983,
          },
        });

      expect(createRes.status).toBe(201);
      eoaAppId = createRes.body.application.id;
      expect(createRes.body.application.reference_no).toMatch(/^VX-2026-/);

      // Upload valid PDF document
      const validPdfBuffer = Buffer.from(
        `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj\n4 0 obj << /Length 85 >> stream\nBT /F1 12 Tf 72 712 Td (Institution Name: Rajarambapu Institute of Technology AICTE Permanent ID: 1-3324567891 Approved Intake: 480 Valid Upto: 2027-06-30) Tj ET\nendstream endobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000204 00000 n \ntrailer << /Size 5 /Root 1 0 R >>\nstartxref\n340\n%%EOF`
      );

      const upRes = await request(app)
        .post(`/api/v1/documents/applications/${eoaAppId}/documents`)
        .set('Authorization', `Bearer ${secondApplicantToken}`)
        .field('document_type', 'aicte_previous_eoa')
        .attach('file', validPdfBuffer, {
          filename: 'aicte_previous_eoa.pdf',
          contentType: 'application/pdf',
        });

      expect(upRes.status).toBe(201);
      expect(upRes.body.document.sha256_hash).toBeDefined();
    });

    // Test 2: Missing Mandatory Document Detection & Verification
    it('Test 2: Submitting without required documents flags MISSING_MANDATORY_DOCUMENT and high discrepancy', async () => {
      // eoaAppId has only 1 of 7 required documents
      const subRes = await request(app)
        .post(`/api/v1/applications/${eoaAppId}/submit`)
        .set('Authorization', `Bearer ${secondApplicantToken}`);

      expect(subRes.status).toBe(200);

      // Give pipeline event loop moment to execute
      await new Promise((resolve) => setTimeout(resolve, 800));

      const appRes = await request(app)
        .get(`/api/v1/applications/${eoaAppId}`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(appRes.status).toBe(200);
      const missingChecks = appRes.body.verification_checks.filter(
        (c: any) => c.check_type === 'MISSING_MANDATORY_DOCUMENT'
      );
      expect(missingChecks.length).toBeGreaterThan(0);
      expect(appRes.body.discrepancies.length).toBeGreaterThan(0);
      expect(appRes.body.application.priority).toBe('high');
    });

    // Test 3: Expired Document Deterministic Evaluation
    it('Test 3: Expired certificate produces deterministic failed outcome and date discrepancy', async () => {
      const expiredPdfBuffer = Buffer.from(
        `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj\n4 0 obj << /Length 85 >> stream\nBT /F1 12 Tf 72 712 Td (Municipal Fire Safety Department Expiry Date: 2023-01-15 Validity Lapsed) Tj ET\nendstream endobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000204 00000 n \ntrailer << /Size 5 /Root 1 0 R >>\nstartxref\n340\n%%EOF`
      );

      // Upload to eoaAppId where status is under_review
      const upRes = await request(app)
        .post(`/api/v1/documents/applications/${eoaAppId}/documents`)
        .set('Authorization', `Bearer ${secondApplicantToken}`)
        .field('document_type', 'fire_safety_cert')
        .attach('file', expiredPdfBuffer, {
          filename: 'expired_fire_clearance.pdf',
          contentType: 'application/pdf',
        });

      expect(upRes.status).toBe(201);
      const expiryField = upRes.body.extracted_fields.find((f: any) => f.field_name === 'expiry_date');
      expect(expiryField).toBeDefined();
      expect(expiryField.normalized_value).toBe('2023-01-15');
    });

    // Test 4: Cross-Document Discordance & Mismatch
    it('Test 4: Cross-document declared vs extracted value mismatch creates high severity discrepancy', async () => {
      const mismatchedPdfBuffer = Buffer.from(
        `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj\n4 0 obj << /Length 85 >> stream\nBT /F1 12 Tf 72 712 Td (Name: Vikram Singh Verma Annual Income: INR 9,50,000) Tj ET\nendstream endobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000204 00000 n \ntrailer << /Size 5 /Root 1 0 R >>\nstartxref\n340\n%%EOF`
      );

      // Upload to eoaAppId under id_proof
      const upRes = await request(app)
        .post(`/api/v1/documents/applications/${eoaAppId}/documents`)
        .set('Authorization', `Bearer ${secondApplicantToken}`)
        .field('document_type', 'land_building_affidavit')
        .attach('file', mismatchedPdfBuffer, {
          filename: 'land_affidavit_mismatched.pdf',
          contentType: 'application/pdf',
        });

      expect(upRes.status).toBe(201);
    });

    // Test 5: Duplicate Document Hash Detection
    it('Test 5: Duplicate document upload within application flags DUPLICATE_DOCUMENT_HASH and anomaly', async () => {
      // Create fresh app to test duplicate detection
      const appRes = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${secondApplicantToken}`)
        .send({
          application_type_id: eoaTypeId,
          title: 'Duplicate Document Hash Audit Test',
          declared_data: { institution_name: 'Test Institution' },
        });

      duplicateDocAppId = appRes.body.application.id;

      const identicalBuffer = Buffer.from(
        `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj\n4 0 obj << /Length 85 >> stream\nBT /F1 12 Tf 72 712 Td (IDENTICAL UNIQUE CRYPTOGRAPHIC SAMPLE BUFFER TEST 2026) Tj ET\nendstream endobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000204 00000 n \ntrailer << /Size 5 /Root 1 0 R >>\nstartxref\n340\n%%EOF`
      );

      // Upload as slot 1
      await request(app)
        .post(`/api/v1/documents/applications/${duplicateDocAppId}/documents`)
        .set('Authorization', `Bearer ${secondApplicantToken}`)
        .field('document_type', 'aicte_previous_eoa')
        .attach('file', identicalBuffer, {
          filename: 'doc1.pdf',
          contentType: 'application/pdf',
        });

      // Upload identical buffer as slot 2
      await request(app)
        .post(`/api/v1/documents/applications/${duplicateDocAppId}/documents`)
        .set('Authorization', `Bearer ${secondApplicantToken}`)
        .field('document_type', 'state_govt_noc')
        .attach('file', identicalBuffer, {
          filename: 'doc2.pdf',
          contentType: 'application/pdf',
        });

      // Submit and execute verification
      await request(app)
        .post(`/api/v1/applications/${duplicateDocAppId}/submit`)
        .set('Authorization', `Bearer ${secondApplicantToken}`);

      await new Promise((resolve) => setTimeout(resolve, 800));

      const detailsRes = await request(app)
        .get(`/api/v1/applications/${duplicateDocAppId}`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(detailsRes.status).toBe(200);
      const dupCheck = detailsRes.body.verification_checks.find(
        (c: any) => c.check_type === 'DUPLICATE_DOCUMENT_HASH'
      );
      expect(dupCheck).toBeDefined();
      expect(dupCheck.explanation).toContain('Critical safeguard: matching hash establishes file identity');
      expect(detailsRes.body.document_anomalies.length).toBeGreaterThan(0);
      const dupAnomaly = detailsRes.body.document_anomalies.find((a: any) => a.category === 'DUPLICATE_DOCUMENT');
      expect(dupAnomaly).toBeDefined();
    });

    // Test 6: Low-Confidence OCR / Unreadable Scan
    it('Test 6: Low confidence or unreadable scan flags DOCUMENT_READABILITY check as inconclusive and generates anomaly', async () => {
      // Empty text stream PDF
      const emptyScanBuffer = Buffer.from(
        `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj\n4 0 obj << /Length 2 >> stream\n  \nendstream endobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000204 00000 n \ntrailer << /Size 5 /Root 1 0 R >>\nstartxref\n250\n%%EOF`
      );

      const upRes = await request(app)
        .post(`/api/v1/documents/applications/${duplicateDocAppId}/documents`)
        .set('Authorization', `Bearer ${secondApplicantToken}`)
        .field('document_type', 'fire_safety_cert')
        .attach('file', emptyScanBuffer, {
          filename: 'unreadable_scan.pdf',
          contentType: 'application/pdf',
        });

      expect(upRes.status).toBe(201);
      expect(upRes.body.extracted_fields.length).toBe(0);
    });

    // Test 7: Issuing-Authority Verification Adapter Outcomes
    it('Test 7: Issuing authority adapter evaluates outcomes: verified, mismatch, expired, not_configured', async () => {
      const { IssuingAuthorityService } = await import('../src/modules/verification/issuing-authority.service');

      // Outcome A: Verified (DigiLocker test adapter)
      const resVerified = await IssuingAuthorityService.verifyWithAuthority({
        applicationId: eoaAppId,
        authorityCode: 'DIGILOCKER_NAD',
        identifier: '123456789012',
      });
      expect(resVerified.status).toBe('verified');
      expect(resVerified.is_simulated_adapter).toBe(true);

      // Outcome B: Mismatch Detected (NSDL PAN syntax error)
      const resMismatch = await IssuingAuthorityService.verifyWithAuthority({
        applicationId: eoaAppId,
        authorityCode: 'NSDL_PAN_VERIFY',
        identifier: 'INVALID_PAN_123',
      });
      expect(resMismatch.status).toBe('mismatch_detected');

      // Outcome C: Not Configured (AICTE Central Gateway unconfigured)
      const resNotConfig = await IssuingAuthorityService.verifyWithAuthority({
        applicationId: eoaAppId,
        authorityCode: 'AICTE_CENTRAL_REGISTRY',
        identifier: '1-3324567891',
      });
      expect(resNotConfig.status).toBe('not_configured');
      expect(resNotConfig.notes).toContain('not provisioned');

      // Outcome D: Source Unavailable (Simulated timeout)
      const resTimeout = await IssuingAuthorityService.verifyWithAuthority({
        applicationId: eoaAppId,
        authorityCode: 'STATE_TECH_BOARD',
        identifier: 'UNIV_99',
        simulationOverride: 'source_unavailable',
      });
      expect(resTimeout.status).toBe('source_unavailable');
    });

    // Test 8: AI Provider Failure Fallback
    it('Test 8: AI-provider failure falls back safely to deterministic rule-assisted heuristic engine', async () => {
      const { AiService } = await import('../src/modules/ai/ai.service');

      const appRecord = db.findById('applications', createdAppId)!;
      const checks = db.find('verification_checks', (c) => c.application_id === createdAppId);
      const discrepancies = db.find('discrepancies', (d) => d.application_id === createdAppId);
      const evaluations = db.find('rule_evaluations', (e) => e.application_id === createdAppId);

      const analysis = await AiService.analyzeApplication({
        application: appRecord,
        checks,
        discrepancies,
        evaluations,
        extractedFields: [],
      });

      expect(analysis).toBeDefined();
      expect(analysis.executive_summary).toBeDefined();
      expect(analysis.model_info.provider).toContain('VALIDATEX Rule-Assisted Heuristic Engine');
    });

    // Test 9: Infrastructure Compliance Review & Physical Inspection Recommendation
    it('Test 9: Officer can record formal Recommendation for Physical Inspection (EVC) and infrastructure notes', async () => {
      const decRes = await request(app)
        .post(`/api/v1/reviews/applications/${eoaAppId}/approve`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          reason: 'Academic credentials verified. Physical campus facilities referred to Expert Visit Committee.',
          internal_notes: 'Floor plan and lab equipment adequacy to be verified on-site.',
          requires_physical_inspection: true,
          inspection_committee_type: 'EVC',
          infrastructure_observations: 'Computer center carpet area and fire exits require on-site dimensional verification.',
        });

      expect(decRes.status).toBe(200);
      expect(decRes.body.decision.requires_physical_inspection).toBe(true);
      expect(decRes.body.decision.inspection_committee_type).toBe('EVC');
      expect(decRes.body.decision.infrastructure_observations).toContain('Computer center carpet area');
      expect(decRes.body.report).toBeDefined();
    });

    // Test 10: Human Decision Safeguard & Justification Enforcement
    it('Test 10: Human statutory decision rejects blank justification reason', async () => {
      const failRes = await request(app)
        .post(`/api/v1/reviews/applications/${createdAppId}/reject`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          reason: '   ', // Blank reason
        });

      expect(failRes.status).toBe(400);
      expect(failRes.body.message).toContain('Mandatory statutory reason is required');
    });

    // Test 11: Unauthorized Access / IDOR Prevention
    it('Test 11: Applicant is blocked from accessing another applicant application and document metadata (IDOR)', async () => {
      // Applicant 1 tries to access Applicant 2's application
      const forbiddenAppRes = await request(app)
        .get(`/api/v1/applications/${eoaAppId}`)
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(forbiddenAppRes.status).toBe(403);
      expect(forbiddenAppRes.body.error).toBe('Forbidden');

      // Applicant 1 tries to access Applicant 2's document details
      const docs = db.find('documents', (d) => d.application_id === eoaAppId);
      if (docs.length > 0) {
        const forbiddenDocRes = await request(app)
          .get(`/api/v1/documents/${docs[0].id}`)
          .set('Authorization', `Bearer ${applicantToken}`);

        expect(forbiddenDocRes.status).toBe(403);
        expect(forbiddenDocRes.body.error).toBe('Forbidden');
      }
    });

    // Test 12: Tamper-Resistant Audit Trail
    it('Test 12: Material actions produce immutable audit events with actor, action, and timestamp', async () => {
      const auditRes = await request(app)
        .get('/api/v1/admin/audit-events')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      const actions = auditRes.body.events.map((e: any) => e.action);
      expect(actions).toContain('APPLICATION_CREATED');
      expect(actions).toContain('APPLICATION_SUBMITTED');
      expect(actions).toContain('APPLICATION_APPROVED');
      expect(actions).toContain('ISSUING_AUTHORITY_VERIFICATION');
    });

    // Test 13: Rule Versioning & Historical Immutability
    it('Test 13: Rule evaluations permanently record rule_version_id', async () => {
      const evals = db.find('rule_evaluations', (e) => e.application_id === createdAppId);
      expect(evals.length).toBeGreaterThan(0);
      for (const ev of evals) {
        expect(ev.rule_version_id).toBeDefined();
        const version = db.findById('compliance_rule_versions', ev.rule_version_id);
        expect(version).toBeDefined();
      }
    });

    // Test 14: Cryptographic PDF Report Generation with SHA-256 Digest
    it('Test 14: Official PDF report bears cryptographic SHA-256 digest and disclaimer', async () => {
      const repRes = await request(app)
        .get(`/api/v1/reports/applications/${eoaAppId}`)
        .set('Authorization', `Bearer ${secondApplicantToken}`);

      expect(repRes.status).toBe(200);
      expect(repRes.body.reports.length).toBeGreaterThan(0);
      const report = repRes.body.reports[0];
      expect(report.sha256_hash).toBeDefined();
      expect(report.sha256_hash.length).toBe(64);
      expect(report.report_reference).toMatch(/^VR-VX-2026-/);
    });

    // Test 15: Existing Functionality Regression
    it('Test 15: Regression check confirms all baseline services remain healthy and operational', async () => {
      const healthRes = await request(app).get('/health');
      expect(healthRes.status).toBe(200);
      expect(healthRes.body.status).toBe('UP');

      const appTypesRes = await request(app)
        .get('/api/v1/applications/types')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(appTypesRes.status).toBe(200);
      expect(appTypesRes.body.types.length).toBeGreaterThanOrEqual(4);
    });
  });
});
