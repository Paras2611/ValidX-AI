import { Router } from 'express';
import { DocumentsController, uploadMiddleware } from './documents.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post(
  '/applications/:applicationId/documents',
  uploadMiddleware.single('file'),
  DocumentsController.uploadDocument
);

router.get('/:id', DocumentsController.getDocumentDetails);
router.get('/:id/content', DocumentsController.getDocumentContent);

export default router;
