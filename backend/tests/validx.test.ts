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
});
