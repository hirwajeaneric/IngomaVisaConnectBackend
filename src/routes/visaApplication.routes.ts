import { Router } from 'express';
import { VisaApplicationController } from '../controllers/visaApplication.controller';
import { RequestHandler } from 'express';

const router = Router();

// Create new application
router.post('/', ...(VisaApplicationController.createApplication as RequestHandler[]));

// Get user's applications
router.get('/', ...(VisaApplicationController.getUserApplications as RequestHandler[]));

// Get all applications
router.get('/all', ...(VisaApplicationController.getAllApplications as RequestHandler[]));

// Get specific application
router.get('/:applicationId', ...(VisaApplicationController.getApplicationById as RequestHandler[]));

// Submit application
router.post('/:applicationId/submit', ...(VisaApplicationController.submitApplication as RequestHandler[]));

// Update application status (admin/officer only)
router.put('/:applicationId/status', ...(VisaApplicationController.updateApplicationStatus as RequestHandler[]));

export default router;
