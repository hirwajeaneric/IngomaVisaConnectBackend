import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { RequestHandler } from 'express';

const router = Router();

// Upload document for an application
router.post('/:applicationId', ...(DocumentController.uploadDocument as RequestHandler[]));

// Get all documents for an application
router.get('/:applicationId', ...(DocumentController.getApplicationDocuments as RequestHandler[]));

// Verify document (admin/officer only)
router.put('/:documentId/verify', ...(DocumentController.verifyDocument as RequestHandler[]));

export default router;
