import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', NotificationsController.getMyNotifications);
router.patch('/:id/read', NotificationsController.markRead);
router.post('/read-all', NotificationsController.markAllRead);

export default router;
