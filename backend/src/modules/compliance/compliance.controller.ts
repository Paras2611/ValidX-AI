import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AuditService } from '../audit/audit.service';
import { ComplianceService } from './compliance.service';
import { ComplianceRule, ComplianceRuleVersion } from '../../types';

export class ComplianceController {
  public static async listRules(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rules = db.find('compliance_rules');
      const enriched = rules.map((r) => {
        const activeVersion = r.active_version_id
          ? db.findById('compliance_rule_versions', r.active_version_id)
          : null;
        const allVersions = db.find('compliance_rule_versions', (v) => v.rule_id === r.id);
        return {
          ...r,
          active_version: activeVersion,
          versions_count: allVersions.length,
        };
      });

      res.json({ rules: enriched });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  public static async createRule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { rule_code, name, description, jurisdiction, severity, remediation, conditions } = req.body;

      if (!rule_code || !name || !conditions || !Array.isArray(conditions)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'rule_code, name, and an array of conditions are required',
        });
        return;
      }

      const existing = db.findOne('compliance_rules', (r) => r.rule_code === rule_code);
      if (existing) {
        res.status(409).json({ error: 'Conflict', message: `Rule code '${rule_code}' already exists` });
        return;
      }

      const rule = ComplianceService.createRule({
        ruleCode: rule_code,
        name,
        description: description || '',
        jurisdiction: jurisdiction || 'National Statutory Standard',
        severity: severity || 'error',
        remediation: remediation || 'Provide compliant documentation.',
        conditions,
        userId: user.id,
      });

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'COMPLIANCE_RULE_CREATED',
        resourceType: 'COMPLIANCE_RULE',
        resourceId: rule.id,
        outcome: 'success',
        ipAddress: req.ip,
        metadata: { rule_code },
      });

      res.status(201).json({ message: 'Compliance rule and approved v1 created successfully', rule });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  public static async createNewVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { conditions } = req.body;

      const rule = db.findById('compliance_rules', id);
      if (!rule) {
        res.status(404).json({ error: 'Not Found', message: 'Rule not found' });
        return;
      }

      const existingVersions = db.find('compliance_rule_versions', (v) => v.rule_id === id);
      const nextVersionNum = existingVersions.length + 1;

      const newVersion: ComplianceRuleVersion = {
        id: uuidv4(),
        rule_id: id,
        version_number: nextVersionNum,
        conditions: conditions || [],
        created_by: user.id,
        status: 'draft',
        created_at: new Date().toISOString(),
      };

      const inserted = db.insert('compliance_rule_versions', newVersion);

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'COMPLIANCE_RULE_DRAFT_VERSION_CREATED',
        resourceType: 'COMPLIANCE_RULE_VERSION',
        resourceId: inserted.id,
        outcome: 'success',
        ipAddress: req.ip,
        metadata: { version_number: nextVersionNum },
      });

      res.status(201).json({ message: `Draft version v${nextVersionNum} created`, version: inserted });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  public static async approveVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { versionId } = req.params;

      const version = db.findById('compliance_rule_versions', versionId);
      if (!version) {
        res.status(404).json({ error: 'Not Found', message: 'Rule version not found' });
        return;
      }

      const updatedVersion = db.update('compliance_rule_versions', versionId, {
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      });

      // Update parent rule to point to this active version
      db.update('compliance_rules', version.rule_id, {
        active_version_id: versionId,
      });

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'COMPLIANCE_RULE_VERSION_APPROVED',
        resourceType: 'COMPLIANCE_RULE_VERSION',
        resourceId: versionId,
        outcome: 'success',
        ipAddress: req.ip,
      });

      res.json({ message: 'Rule version approved and set as active', version: updatedVersion });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  public static async evaluateApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { applicationId } = req.params;
      const evaluations = await ComplianceService.evaluateRules(applicationId);
      res.json({ message: 'Rules evaluated successfully', evaluations });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
}
