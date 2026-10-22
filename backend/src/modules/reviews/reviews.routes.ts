import { Router } from 'express';
import { ReviewsController } from './reviews.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Verification Queue & Officer Actions (Restricted to officer, admin, auditor)
router.get('/queue', requireRole('officer', 'admin', 'auditor'), ReviewsController.getReviewQueue);
router.post('/applications/:applicationId/assign', requireRole('officer', 'admin'), ReviewsController.assignApplication);
router.post('/applications/:applicationId/comments', requireRole('officer', 'admin', 'auditor'), ReviewsController.addComment);
router.patch('/discrepancies/:id', requireRole('officer', 'admin'), ReviewsController.resolveDiscrepancy);
router.patch('/extracted-fields/:id/confirm', requireRole('officer', 'admin'), ReviewsController.confirmExtractedField);

// Authorized Final Decisions (Officer & Admin only)
router.post('/applications/:applicationId/request-corrections', requireRole('officer', 'admin'), ReviewsController.requestCorrections);
router.post('/applications/:applicationId/approve', requireRole('officer', 'admin'), ReviewsController.approveApplication);
router.post('/applications/:applicationId/reject', requireRole('officer', 'admin'), ReviewsController.rejectApplication);

export default router;
