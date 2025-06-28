import { Router } from 'express';
import { RequestForDocumentController } from '../controllers/requestForDocument.controller';
import { RequestHandler } from 'express';

const router = Router();

// Create a new document request (officer only)
router.post('/:applicationId', ...(RequestForDocumentController.createRequestForDocument as RequestHandler[]));

// Get all document requests for an application
router.get('/application/:applicationId', ...(RequestForDocumentController.getApplicationDocumentRequests as RequestHandler[]));

// Get a specific document request by ID
router.get('/:requestId', ...(RequestForDocumentController.getRequestForDocumentById as RequestHandler[]));

// Update a document request (officer only)
router.put('/:requestId', ...(RequestForDocumentController.updateRequestForDocument as RequestHandler[]));

// Cancel a document request (officer only)
router.delete('/:requestId', ...(RequestForDocumentController.cancelRequestForDocument as RequestHandler[]));

// Submit a document for a request (applicant only)
router.post('/:requestId/submit', ...(RequestForDocumentController.submitDocumentForRequest as RequestHandler[]));

export default router;
