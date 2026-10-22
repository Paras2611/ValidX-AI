import { Response } from 'express';
import os from 'os';
import { db } from '../../database';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AuditService } from '../audit/audit.service';

export class AdminController {
  public static async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const users = db.find('users');
      const sanitized = users.map((u) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        organization_id: u.organization_id,
        created_at: u.created_at,
      }));
      res.json({ users: sanitized });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  public static async getAuditEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resource_type, resource_id, actor_id, page = '1', limit = '50' } = req.query as Record<string, string>;
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 50;
      const offset = (pageNum - 1) * limitNum;

      const results = AuditService.getEvents({
        resourceType: resource_type,
        resourceId: resource_id,
        actorId: actor_id,
        limit: limitNum,
        offset,
      });

      res.json({
        total: results.total,
        page: pageNum,
        totalPages: Math.ceil(results.total / limitNum),
        events: results.events,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  public static async getSystemHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const totalUsers = db.count('users');
      const totalApplications = db.count('applications');
      const totalDocuments = db.count('documents');
      const totalChecks = db.count('verification_checks');
      const totalDiscrepancies = db.count('discrepancies');
      const totalAuditEvents = db.count('audit_events');
      const totalReports = db.count('reports');

      const applicationsByStatus = {
        draft: db.count('applications', (a) => a.status === 'draft'),
        submitted: db.count('applications', (a) => a.status === 'submitted'),
        processing: db.count('applications', (a) => a.status === 'processing'),
        under_review: db.count('applications', (a) => a.status === 'under_review'),
        action_required: db.count('applications', (a) => a.status === 'action_required'),
        approved: db.count('applications', (a) => a.status === 'approved'),
        rejected: db.count('applications', (a) => a.status === 'rejected'),
        withdrawn: db.count('applications', (a) => a.status === 'withdrawn'),
      };

      const applicationsByPriority = {
        high: db.count('applications', (a) => a.priority === 'high'),
        medium: db.count('applications', (a) => a.priority === 'medium'),
        low: db.count('applications', (a) => a.priority === 'low'),
        inconclusive: db.count('applications', (a) => a.priority === 'inconclusive'),
      };

      res.json({
        status: 'HEALTHY',
        timestamp: new Date().toISOString(),
        system: {
          uptime_seconds: process.uptime(),
          memory_rss_mb: (process.memoryUsage().rss / (1024 * 1024)).toFixed(1),
          heap_used_mb: (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(1),
          os_platform: os.platform(),
          node_version: process.version,
        },
        counts: {
          users: totalUsers,
          applications: totalApplications,
          documents: totalDocuments,
          verification_checks: totalChecks,
          discrepancies: totalDiscrepancies,
          audit_events: totalAuditEvents,
          reports: totalReports,
        },
        breakdowns: {
          status: applicationsByStatus,
          priority: applicationsByPriority,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
}
