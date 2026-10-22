import { Response } from 'express';
import fs from 'fs';
import { db } from '../../database';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { ReportService } from './report.service';
import { AuditService } from '../audit/audit.service';

export class ReportsController {
  public static async generateReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { applicationId } = req.params;

      const app = db.findById('applications', applicationId);
      if (!app) {
        res.status(404).json({ error: 'Not Found', message: 'Application not found' });
        return;
      }

      // Check permission: applicant only if approved, officer/admin/auditor anytime
      if (user.role === 'applicant' && app.applicant_id !== user.id) {
        res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        return;
      }

      const report = await ReportService.generateReport(applicationId, user.id);

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'REPORT_GENERATED',
        resourceType: 'REPORT',
        resourceId: report.id,
        outcome: 'success',
        ipAddress: req.ip,
        metadata: { report_reference: report.report_reference, sha256: report.sha256_hash },
      });

      res.status(201).json({ message: 'Audit report generated successfully', report });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  public static async listReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { applicationId } = req.params;

      const app = db.findById('applications', applicationId);
      if (!app) {
        res.status(404).json({ error: 'Not Found', message: 'Application not found' });
        return;
      }

      if (user.role === 'applicant' && app.applicant_id !== user.id) {
        res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        return;
      }

      const reports = db.find('reports', (r) => r.application_id === applicationId);
      res.json({ reports });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  public static async downloadReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      const report = db.findById('reports', id);
      if (!report) {
        res.status(404).json({ error: 'Not Found', message: 'Report record not found' });
        return;
      }

      const app = db.findById('applications', report.application_id);
      if (!app) {
        res.status(404).json({ error: 'Not Found', message: 'Application not found' });
        return;
      }

      // IDOR check
      if (user.role === 'applicant' && app.applicant_id !== user.id) {
        res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        return;
      }

      if (!fs.existsSync(report.file_path)) {
        res.status(404).json({ error: 'Not Found', message: 'Report file missing from reports repository' });
        return;
      }

      const fileBuffer = fs.readFileSync(report.file_path);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${report.report_reference}.pdf"`);
      res.setHeader('Content-Length', fileBuffer.length);
      res.send(fileBuffer);
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
}
