import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/users', requireRole('admin'), AdminController.getUsers);
router.get('/audit-events', requireRole('admin', 'auditor'), AdminController.getAuditEvents);
router.get('/system-health', requireRole('admin', 'auditor'), AdminController.getSystemHealth);

export default router;
