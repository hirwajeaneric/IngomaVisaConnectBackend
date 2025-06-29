import express from 'express';
import { InterviewController } from '../controllers/interview.controller';
import { RequestHandler } from 'express';

const router = express.Router();

// Create a new interview
router.post('/create', ...(InterviewController.createInterview as RequestHandler[]));

// Get a specific interview by ID
router.get('/:interviewId', ...(InterviewController.getInterviewById as RequestHandler[]));

// Get all interviews for an application
router.get('/application/:applicationId', ...(InterviewController.getApplicationInterviews as RequestHandler[]));

// Get all interviews for an officer
router.get('/officer/all', ...(InterviewController.getOfficerInterviews as RequestHandler[]));

// Get all interviews for the current applicant
router.get('/applicant/all', ...(InterviewController.getApplicantInterviews as RequestHandler[]));

// Reschedule an interview
router.put('/:interviewId/reschedule', ...(InterviewController.rescheduleInterview as RequestHandler[]));

// Cancel an interview
router.delete('/:interviewId', ...(InterviewController.cancelInterview as RequestHandler[]));

// Confirm an interview
router.post('/:interviewId/confirm', ...(InterviewController.confirmInterview as RequestHandler[]));

// Mark an interview as completed
router.put('/:interviewId/complete', ...(InterviewController.markInterviewCompleted as RequestHandler[]));

// Get officers for assignment
router.get('/officers/assignment', ...(InterviewController.getOfficersForAssignment as RequestHandler[]));

// Get applications for interview scheduling
router.get('/applications/scheduling', ...(InterviewController.getApplicationsForInterviewScheduling as RequestHandler[]));

export default router;
