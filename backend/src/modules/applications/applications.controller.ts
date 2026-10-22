import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { OcrService } from '../processing/ocr.service';
import { VerificationService } from '../verification/verification.service';
import { ComplianceService } from '../compliance/compliance.service';
import { AiService } from '../ai/ai.service';
import { Application, ExtractedField } from '../../types';

export class ApplicationsController {
  /**
   * Get all application types with field/document requirements
   */
  public static async getApplicationTypes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const types = db.find('application_types');
      res.json({ types });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Create a new draft application
   */
  public static async createApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { application_type_id, title, declared_data } = req.body;

      if (!application_type_id) {
        res.status(400).json({ error: 'Bad Request', message: 'application_type_id is required' });
        return;
      }

      const appType = db.findById('application_types', application_type_id);
      if (!appType) {
        res.status(404).json({ error: 'Not Found', message: 'Application type does not exist' });
        return;
      }

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const referenceNo = `VX-2026-${randomSuffix}`;

      const newApp: Application = {
        id: uuidv4(),
        reference_no: referenceNo,
        applicant_id: user.id,
        organization_id: user.organization_id,
        application_type_id,
        title: title || `${appType.name} - ${referenceNo}`,
        status: 'draft',
        priority: 'low',
        declared_data: declared_data || {},
        metadata: {
          step: 1,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const inserted = db.insert('applications', newApp);

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'APPLICATION_CREATED',
        resourceType: 'APPLICATION',
        resourceId: inserted.id,
        outcome: 'success',
        ipAddress: req.ip,
      });

      res.status(201).json({
        message: 'Draft application initiated successfully',
        application: inserted,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * List applications with strict RBAC and IDOR prevention
   */
  public static async listApplications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { status, priority, search, page = '1', limit = '20' } = req.query as Record<string, string>;

      let apps = db.find('applications');

      // Object-Level IDOR Prevention: Applicants only see their own applications
      if (user.role === 'applicant') {
        apps = apps.filter((a) => a.applicant_id === user.id);
      } else if (user.role === 'officer' && req.query.assigned_to_me === 'true') {
        apps = apps.filter((a) => a.assigned_officer_id === user.id);
      }

      if (status) {
        apps = apps.filter((a) => a.status === status);
      }
      if (priority) {
        apps = apps.filter((a) => a.priority === priority);
      }
      if (search) {
        const q = search.toLowerCase();
        apps = apps.filter(
          (a) =>
            a.reference_no.toLowerCase().includes(q) ||
            a.title.toLowerCase().includes(q) ||
            JSON.stringify(a.declared_data).toLowerCase().includes(q)
        );
      }

      apps.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const offset = (pageNum - 1) * limitNum;
      const paginated = apps.slice(offset, offset + limitNum);

      // Attach lightweight summaries
      const enriched = paginated.map((app) => {
        const appType = db.findById('application_types', app.application_type_id);
        const docs = db.find('documents', (d) => d.application_id === app.id);
        const applicant = db.findById('users', app.applicant_id);
        return {
          ...app,
          application_type_name: appType?.name || 'General',
          application_type_code: appType?.code,
          documents_count: docs.length,
          applicant_name: applicant?.full_name || 'Applicant',
          applicant_email: applicant?.email,
        };
      });

      res.json({
        total: apps.length,
        page: pageNum,
        totalPages: Math.ceil(apps.length / limitNum),
        applications: enriched,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Get single application details with complete dossier
   */
  public static async getApplicationById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      const app = db.findById('applications', id);
      if (!app) {
        res.status(404).json({ error: 'Not Found', message: 'Application not found' });
        return;
      }

      // IDOR Protection: applicant cannot view another applicant's record
      if (user.role === 'applicant' && app.applicant_id !== user.id) {
        AuditService.log({
          actorId: user.id,
          actorRole: user.role,
          action: 'UNAUTHORIZED_APPLICATION_ACCESS',
          resourceType: 'APPLICATION',
          resourceId: id,
          outcome: 'denied',
          ipAddress: req.ip,
        });
        res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to view this application' });
        return;
      }

      const appType = db.findById('application_types', app.application_type_id);
      const applicant = db.findById('users', app.applicant_id);
      const assignedOfficer = app.assigned_officer_id ? db.findById('users', app.assigned_officer_id) : null;
      const documents = db.find('documents', (d) => d.application_id === app.id);

      const allExtractedFields = db.find('extracted_fields', (f) =>
        documents.some((d) => d.id === f.document_id)
      );

      const checks = db.find('verification_checks', (c) => c.application_id === app.id);
      const discrepancies = db.find('discrepancies', (d) => d.application_id === app.id);
      const ruleEvaluations = db.find('rule_evaluations', (re) => re.application_id === app.id);
      const decisions = db.find('review_decisions', (rd) => rd.application_id === app.id);

      // Comments: filter internal notes if applicant
      let comments = db.find('review_comments', (rc) => rc.application_id === app.id);
      if (user.role === 'applicant') {
        comments = comments.filter((c) => !c.is_internal);
      }

      const reports = db.find('reports', (r) => r.application_id === app.id);

      res.json({
        application: {
          ...app,
          application_type: appType,
          applicant: applicant
            ? { id: applicant.id, full_name: applicant.full_name, email: applicant.email }
            : null,
          assigned_officer: assignedOfficer
            ? { id: assignedOfficer.id, full_name: assignedOfficer.full_name }
            : null,
        },
        documents,
        extracted_fields: allExtractedFields,
        verification_checks: checks,
        discrepancies,
        rule_evaluations: ruleEvaluations,
        decisions,
        comments,
        reports,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Update application draft declared data
   */
  public static async updateDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { declared_data, title } = req.body;

      const app = db.findById('applications', id);
      if (!app) {
        res.status(404).json({ error: 'Not Found', message: 'Application not found' });
        return;
      }

      if (user.role === 'applicant' && app.applicant_id !== user.id) {
        res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        return;
      }

      // Can only edit draft or action_required
      if (!['draft', 'action_required'].includes(app.status)) {
        res.status(400).json({
          error: 'Bad Request',
          message: `Cannot edit application when status is '${app.status}'. Editable statuses: draft, action_required`,
        });
        return;
      }

      const updated = db.update('applications', id, {
        declared_data: { ...app.declared_data, ...declared_data },
        title: title || app.title,
      });

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'APPLICATION_DRAFT_UPDATED',
        resourceType: 'APPLICATION',
        resourceId: id,
        outcome: 'success',
        ipAddress: req.ip,
      });

      res.json({ message: 'Draft updated successfully', application: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Submit application & trigger verification pipeline
   */
  public static async submitApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      const app = db.findById('applications', id);
      if (!app) {
        res.status(404).json({ error: 'Not Found', message: 'Application not found' });
        return;
      }

      if (user.role === 'applicant' && app.applicant_id !== user.id) {
        res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        return;
      }

      if (!['draft', 'action_required'].includes(app.status)) {
        res.status(400).json({
          error: 'Bad Request',
          message: `Application cannot be submitted from status '${app.status}'`,
        });
        return;
      }

      const nextStatus = app.status === 'action_required' ? 'resubmitted' : 'submitted';

      db.update('applications', id, {
        status: nextStatus,
        submitted_at: new Date().toISOString(),
      });

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: nextStatus === 'resubmitted' ? 'APPLICATION_RESUBMITTED' : 'APPLICATION_SUBMITTED',
        resourceType: 'APPLICATION',
        resourceId: id,
        outcome: 'success',
        ipAddress: req.ip,
      });

      NotificationService.create({
        userId: user.id,
        title: 'Application Submitted',
        message: `Your application (${app.reference_no}) has been submitted and is currently being verified by the automated engine.`,
        type: 'info',
        metadata: { applicationId: id },
      });

      // Execute Verification Pipeline asynchronously
      setImmediate(async () => {
        try {
          await ApplicationsController.executeVerificationPipeline(id);
        } catch (pipelineErr) {
          console.error(`Verification pipeline error on application ${id}:`, pipelineErr);
        }
      });

      res.json({
        message: 'Application submitted successfully. Automated verification pipeline triggered.',
        status: nextStatus,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Withdraw application
   */
  public static async withdrawApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      const app = db.findById('applications', id);
      if (!app) {
        res.status(404).json({ error: 'Not Found', message: 'Application not found' });
        return;
      }

      if (user.role === 'applicant' && app.applicant_id !== user.id) {
        res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        return;
      }

      if (['approved', 'rejected', 'archived', 'withdrawn'].includes(app.status)) {
        res.status(400).json({
          error: 'Bad Request',
          message: `Cannot withdraw application in finalized state '${app.status}'`,
        });
        return;
      }

      db.update('applications', id, { status: 'withdrawn' });

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'APPLICATION_WITHDRAWN',
        resourceType: 'APPLICATION',
        resourceId: id,
        outcome: 'success',
        ipAddress: req.ip,
      });

      res.json({ message: 'Application successfully withdrawn' });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Complete End-to-End Verification Pipeline Execution
   */
  public static async executeVerificationPipeline(applicationId: string): Promise<void> {
    db.update('applications', applicationId, { status: 'processing' });

    try {
      const documents = db.find('documents', (d) => d.application_id === applicationId);

      // Step 1: Run OCR/Text Extraction on any documents lacking extracted fields
      for (const doc of documents) {
        const existingFields = db.find('extracted_fields', (f) => f.document_id === doc.id);
        if (existingFields.length === 0) {
          try {
            const processRes = await OcrService.processDocument(doc.storage_key, doc.mime_type);
            db.update('documents', doc.id, {
              status: 'verified',
              page_count: processRes.pageCount,
            });

            for (const ef of processRes.fields) {
              const fieldRecord: ExtractedField = {
                id: uuidv4(),
                document_id: doc.id,
                field_name: ef.fieldName,
                raw_value: ef.rawValue,
                normalized_value: ef.normalizedValue,
                confidence: ef.confidence,
                extraction_method: ef.extractionMethod,
                page_number: ef.pageNumber,
                is_confirmed: false,
                created_at: new Date().toISOString(),
              };
              db.insert('extracted_fields', fieldRecord);
            }
          } catch (docErr) {
            console.error(`Error processing document ${doc.id}:`, docErr);
            db.update('documents', doc.id, { status: 'failed' });
          }
        }
      }

      // Step 2: Deterministic Verification & Cross-Validation
      const verification = await VerificationService.runVerification(applicationId);

      // Step 3: Statutory Compliance Rules Evaluation
      const evaluations = await ComplianceService.evaluateRules(applicationId);

      // Step 4: AI-Assisted Advisory Explanation & Priority Synthesis
      const app = db.findById('applications', applicationId)!;
      const extractedFields = db.find('extracted_fields', (f) =>
        documents.some((d) => d.id === f.document_id)
      );

      const aiAnalysis = await AiService.analyzeApplication({
        application: app,
        checks: verification.checks,
        discrepancies: verification.discrepancies,
        evaluations,
        extractedFields,
      });

      // Update application with final verification metadata and set to 'under_review'
      db.update('applications', applicationId, {
        status: 'under_review',
        priority: verification.priority,
        priority_reason: verification.priorityReason,
        metadata: {
          ...app.metadata,
          ai_analysis: aiAnalysis,
          verified_at: new Date().toISOString(),
        },
      });

      AuditService.log({
        action: 'VERIFICATION_PIPELINE_COMPLETED',
        resourceType: 'APPLICATION',
        resourceId: applicationId,
        outcome: 'success',
        metadata: {
          priority: verification.priority,
          checks_count: verification.checks.length,
          discrepancies_count: verification.discrepancies.length,
          evaluations_count: evaluations.length,
        },
      });

      NotificationService.create({
        userId: app.applicant_id,
        title: 'Verification Complete - Under Review',
        message: `Automated audit completed for application ${app.reference_no}. Verification priority: ${verification.priority.toUpperCase()}. Review officer assigned.`,
        type: verification.priority === 'high' ? 'warning' : 'info',
        metadata: { applicationId },
      });
    } catch (err: any) {
      console.error(`Verification pipeline fatal error on ${applicationId}:`, err);
      db.update('applications', applicationId, {
        status: 'processing_failed',
        priority: 'inconclusive',
        priority_reason: `Processing pipeline encountered error: ${err.message}`,
      });
      AuditService.log({
        action: 'VERIFICATION_PIPELINE_FAILED',
        resourceType: 'APPLICATION',
        resourceId: applicationId,
        outcome: 'failure',
        metadata: { error: err.message },
      });
    }
  }
}
