import { Router } from 'express';
import { ComplianceController } from './compliance.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/rules', ComplianceController.listRules);
router.post('/rules', requireRole('compliance', 'admin'), ComplianceController.createRule);
router.post('/rules/:id/versions', requireRole('compliance', 'admin'), ComplianceController.createNewVersion);
router.post('/rules/versions/:versionId/approve', requireRole('compliance', 'admin'), ComplianceController.approveVersion);
router.post('/applications/:applicationId/evaluate', requireRole('officer', 'compliance', 'admin'), ComplianceController.evaluateApplication);

export default router;
