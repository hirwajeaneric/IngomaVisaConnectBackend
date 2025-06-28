import { Router } from 'express';
import { InterviewController } from '../controllers/interview.controller';
import { RequestHandler } from 'express';

const router = Router();

// Create a new interview (officer only)
router.post('/:applicationId', ...(InterviewController.createInterview as RequestHandler[]));

// Get a specific interview by ID
router.get('/:interviewId', ...(InterviewController.getInterviewById as RequestHandler[]));

// Get all interviews for an application
router.get('/application/:applicationId', ...(InterviewController.getApplicationInterviews as RequestHandler[]));

// Get all interviews scheduled by an officer
router.get('/officer/all', ...(InterviewController.getOfficerInterviews as RequestHandler[]));

// Get all interviews for the current applicant
router.get('/applicant/all', ...(InterviewController.getApplicantInterviews as RequestHandler[]));

// Reschedule an interview (officer only)
router.put('/:interviewId/reschedule', ...(InterviewController.rescheduleInterview as RequestHandler[]));

// Cancel an interview (officer only)
router.delete('/:interviewId', ...(InterviewController.cancelInterview as RequestHandler[]));

// Confirm an interview (applicant only)
router.post('/:interviewId/confirm', ...(InterviewController.confirmInterview as RequestHandler[]));

// Mark an interview as completed (officer only)
router.put('/:interviewId/complete', ...(InterviewController.markInterviewCompleted as RequestHandler[]));

export default router;
