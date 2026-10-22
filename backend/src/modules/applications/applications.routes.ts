import { Router } from 'express';
import { ApplicationsController } from './applications.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/types', ApplicationsController.getApplicationTypes);
router.post('/', ApplicationsController.createApplication);
router.get('/', ApplicationsController.listApplications);
router.get('/:id', ApplicationsController.getApplicationById);
router.patch('/:id', ApplicationsController.updateDraft);
router.post('/:id/submit', ApplicationsController.submitApplication);
router.post('/:id/withdraw', ApplicationsController.withdrawApplication);

export default router;
