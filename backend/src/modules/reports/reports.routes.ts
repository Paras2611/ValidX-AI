import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/applications/:applicationId/generate', ReportsController.generateReport);
router.get('/applications/:applicationId', ReportsController.listReports);
router.get('/:id/download', ReportsController.downloadReport);

export default router;
