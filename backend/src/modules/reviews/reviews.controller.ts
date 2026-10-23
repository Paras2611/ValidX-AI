import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { ReportService } from '../reports/report.service';
import { ReviewDecision, ReviewComment } from '../../types';

export class ReviewsController {
  /**
   * Get Reviewer Queue with priority assessment and metrics
   */
  public static async getReviewQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { priority, status, assigned_to_me } = req.query as Record<string, string>;

      let apps = db.find('applications', (a) =>
        ['under_review', 'resubmitted', 'processing', 'action_required'].includes(a.status)
      );

      if (assigned_to_me === 'true') {
        apps = apps.filter((a) => a.assigned_officer_id === user.id);
      }
      if (priority) {
        apps = apps.filter((a) => a.priority === priority);
      }
      if (status) {
        apps = apps.filter((a) => a.status === status);
      }

      // Priority ordering: high -> medium -> inconclusive -> low
      const priorityWeights: Record<string, number> = {
        high: 4,
        medium: 3,
        inconclusive: 2,
        low: 1,
      };

      apps.sort((a, b) => {
        const weightDiff = (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
        if (weightDiff !== 0) return weightDiff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      const queueItems = apps.map((app) => {
        const appType = db.findById('application_types', app.application_type_id);
        const applicant = db.findById('users', app.applicant_id);
        const assigned = app.assigned_officer_id ? db.findById('users', app.assigned_officer_id) : null;
        const discrepancies = db.find('discrepancies', (d) => d.application_id === app.id && d.status === 'open');

        return {
          ...app,
          application_type_name: appType?.name || 'General Application',
          applicant_name: applicant?.full_name || 'Applicant',
          applicant_email: applicant?.email,
          assigned_officer_name: assigned?.full_name || null,
          open_discrepancies_count: discrepancies.length,
        };
      });

      // Quick summary metrics
      const metrics = {
        total_in_queue: apps.length,
        high_priority: apps.filter((a) => a.priority === 'high').length,
        medium_priority: apps.filter((a) => a.priority === 'medium').length,
        action_required: apps.filter((a) => a.status === 'action_required').length,
      };

      res.json({ metrics, queue: queueItems });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Assign application to an officer
   */
  public static async assignApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { applicationId } = req.params;
      const { officer_id } = req.body;

      const targetOfficerId = officer_id || user.id;
      const officer = db.findById('users', targetOfficerId);
      if (!officer || !['officer', 'admin'].includes(officer.role)) {
        res.status(400).json({ error: 'Bad Request', message: 'Target user is not a valid verification officer' });
        return;
      }

      const updated = db.update('applications', applicationId, {
        assigned_officer_id: targetOfficerId,
      });

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'APPLICATION_ASSIGNED',
        resourceType: 'APPLICATION',
        resourceId: applicationId,
        outcome: 'success',
        ipAddress: req.ip,
        metadata: { assigned_to: targetOfficerId },
      });

      res.json({ message: 'Application assigned successfully', application: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Add comment to application
   */
  public static async addComment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { applicationId } = req.params;
      const { comment, is_internal = false } = req.body;

      if (!comment || !comment.trim()) {
        res.status(400).json({ error: 'Bad Request', message: 'Comment text is required' });
        return;
      }

      const newComment: ReviewComment = {
        id: uuidv4(),
        application_id: applicationId,
        reviewer_id: user.id,
        reviewer_name: user.full_name,
        comment: comment.trim(),
        is_internal: Boolean(is_internal),
        created_at: new Date().toISOString(),
      };

      const inserted = db.insert('review_comments', newComment);

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'COMMENT_ADDED',
        resourceType: 'APPLICATION',
        resourceId: applicationId,
        outcome: 'success',
        ipAddress: req.ip,
        metadata: { is_internal: Boolean(is_internal) },
      });

      res.status(201).json({ message: 'Comment added', comment: inserted });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Resolve, escalate, or dismiss a discrepancy with a mandatory reason
   */
  public static async resolveDiscrepancy(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { status, resolution_reason } = req.body;

      if (!status || !resolution_reason || !resolution_reason.trim()) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Status (resolved | escalated | dismissed) and a mandatory resolution_reason are required',
        });
        return;
      }

      const discrepancy = db.findById('discrepancies', id);
      if (!discrepancy) {
        res.status(404).json({ error: 'Not Found', message: 'Discrepancy not found' });
        return;
      }

      const updated = db.update('discrepancies', id, {
        status,
        resolution_reason: resolution_reason.trim(),
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      });

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'DISCREPANCY_RESOLVED',
        resourceType: 'DISCREPANCY',
        resourceId: id,
        outcome: 'success',
        ipAddress: req.ip,
        metadata: { status, resolution_reason },
      });

      res.json({ message: `Discrepancy marked as '${status}'`, discrepancy: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Confirm or correct OCR-extracted field value
   */
  public static async confirmExtractedField(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { corrected_value } = req.body;

      const field = db.findById('extracted_fields', id);
      if (!field) {
        res.status(404).json({ error: 'Not Found', message: 'Extracted field not found' });
        return;
      }

      const updates: any = {
        is_confirmed: true,
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
      };

      if (corrected_value !== undefined && corrected_value.trim()) {
        updates.raw_value = corrected_value.trim();
        updates.normalized_value = corrected_value.trim().toUpperCase();
      }

      const updated = db.update('extracted_fields', id, updates);

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'EXTRACTED_FIELD_CONFIRMED',
        resourceType: 'EXTRACTED_FIELD',
        resourceId: id,
        outcome: 'success',
        ipAddress: req.ip,
      });

      res.json({ message: 'Field confirmed', field: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Request Corrections from Applicant
   */
  public static async requestCorrections(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { applicationId } = req.params;
      const { reason, instructions } = req.body;

      if (!reason || !reason.trim()) {
        res.status(400).json({ error: 'Bad Request', message: 'A mandatory reason is required to request corrections' });
        return;
      }

      const app = db.findById('applications', applicationId);
      if (!app) {
        res.status(404).json({ error: 'Not Found', message: 'Application not found' });
        return;
      }

      db.update('applications', applicationId, {
        status: 'action_required',
      });

      // Record Review Decision
      const decision: ReviewDecision = {
        id: uuidv4(),
        application_id: applicationId,
        reviewer_id: user.id,
        action: 'request_corrections',
        reason: reason.trim(),
        internal_notes: instructions || '',
        created_at: new Date().toISOString(),
      };
      db.insert('review_decisions', decision);

      // Notify Applicant
      NotificationService.create({
        userId: app.applicant_id,
        title: 'Action Required: Corrections Requested',
        message: `Corrections requested on your application (${app.reference_no}): ${reason.trim()}`,
        type: 'action_required',
        metadata: { applicationId },
      });

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'APPLICATION_CORRECTIONS_REQUESTED',
        resourceType: 'APPLICATION',
        resourceId: applicationId,
        outcome: 'success',
        ipAddress: req.ip,
        metadata: { reason },
      });

      res.json({ message: 'Corrections requested. Applicant notified.', decision });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Approve Application
   */
  public static async approveApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { applicationId } = req.params;
      const {
        reason,
        internal_notes,
        requires_physical_inspection = false,
        inspection_committee_type = 'NONE',
        infrastructure_observations,
      } = req.body;

      if (!reason || !reason.trim()) {
        res.status(400).json({ error: 'Bad Request', message: 'Mandatory justification reason is required for approval' });
        return;
      }

      const app = db.findById('applications', applicationId);
      if (!app) {
        res.status(404).json({ error: 'Not Found', message: 'Application not found' });
        return;
      }

      // Update state
      db.update('applications', applicationId, {
        status: 'approved',
      });

      const decision: ReviewDecision = {
        id: uuidv4(),
        application_id: applicationId,
        reviewer_id: user.id,
        action: 'approve',
        reason: reason.trim(),
        internal_notes: internal_notes || '',
        requires_physical_inspection: Boolean(requires_physical_inspection),
        inspection_committee_type,
        infrastructure_observations: infrastructure_observations || '',
        created_at: new Date().toISOString(),
      };
      db.insert('review_decisions', decision);

      // Generate official PDF Verification Report
      let report;
      try {
        report = await ReportService.generateReport(applicationId, user.id);
      } catch (repErr) {
        console.error('Failed to generate PDF report upon approval:', repErr);
      }

      NotificationService.create({
        userId: app.applicant_id,
        title: 'Application Approved!',
        message: `Congratulations! Your application (${app.reference_no}) has been officially verified and approved. An official digital verification report has been generated.`,
        type: 'success',
        metadata: { applicationId, reportId: report?.id },
      });

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'APPLICATION_APPROVED',
        resourceType: 'APPLICATION',
        resourceId: applicationId,
        outcome: 'success',
        ipAddress: req.ip,
        metadata: {
          reason,
          reportId: report?.id,
          requires_physical_inspection: Boolean(requires_physical_inspection),
          inspection_committee_type,
        },
      });

      res.json({
        message: 'Application approved successfully. Digital verification report generated.',
        decision,
        report,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Reject Application
   */
  public static async rejectApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { applicationId } = req.params;
      const {
        reason,
        internal_notes,
        requires_physical_inspection = false,
        inspection_committee_type = 'NONE',
        infrastructure_observations,
      } = req.body;

      if (!reason || !reason.trim()) {
        res.status(400).json({ error: 'Bad Request', message: 'Mandatory statutory reason is required for rejection' });
        return;
      }

      const app = db.findById('applications', applicationId);
      if (!app) {
        res.status(404).json({ error: 'Not Found', message: 'Application not found' });
        return;
      }

      db.update('applications', applicationId, {
        status: 'rejected',
      });

      const decision: ReviewDecision = {
        id: uuidv4(),
        application_id: applicationId,
        reviewer_id: user.id,
        action: 'reject',
        reason: reason.trim(),
        internal_notes: internal_notes || '',
        requires_physical_inspection: Boolean(requires_physical_inspection),
        inspection_committee_type,
        infrastructure_observations: infrastructure_observations || '',
        created_at: new Date().toISOString(),
      };
      db.insert('review_decisions', decision);

      NotificationService.create({
        userId: app.applicant_id,
        title: 'Application Determination: Rejected',
        message: `Application (${app.reference_no}) was reviewed and rejected. Reason: ${reason.trim()}`,
        type: 'warning',
        metadata: { applicationId },
      });

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'APPLICATION_REJECTED',
        resourceType: 'APPLICATION',
        resourceId: applicationId,
        outcome: 'success',
        ipAddress: req.ip,
        metadata: { reason },
      });

      res.json({ message: 'Application rejected', decision });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
}
